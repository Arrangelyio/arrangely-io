import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: adminRole } = await supabaseAdmin
      .from('user_admin_roles')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const summary = { self_add: 0, bulk_same_creator: 0, rapid_burst: 0, new_account_targeting: 0, skipped_duplicates: 0 };

    // Helper: check if alert already exists within 24h
    const alertExists = async (alertType: string, userId: string, creatorId: string) => {
      const { data } = await supabaseAdmin
        .from('library_fraud_alerts')
        .select('id')
        .eq('alert_type', alertType)
        .eq('user_id', userId)
        .eq('creator_id', creatorId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);
      return data && data.length > 0;
    };

    // 1. SELF-ADD DETECTION: user_library_actions where user added their own songs
    console.log('[detect-library-fraud] Checking self-adds...');
    const { data: selfAdds } = await supabaseAdmin.rpc('detect_self_adds_raw');
    
    // Fallback: manual query if RPC doesn't exist
    if (selfAdds === null) {
      // Query user_library_actions joined with songs to find self-adds
      const { data: actions } = await supabaseAdmin
        .from('user_library_actions')
        .select('user_id, song_id, created_at')
        .eq('action_type', 'add')
        .eq('is_production', true);

      if (actions && actions.length > 0) {
        // Get all song creators
        const songIds = [...new Set(actions.map(a => a.song_id))];
        const { data: songs } = await supabaseAdmin
          .from('songs')
          .select('id, user_id, title')
          .in('id', songIds);

        const songCreatorMap: Record<string, { creator_id: string; title: string }> = {};
        songs?.forEach(s => { songCreatorMap[s.id] = { creator_id: s.user_id, title: s.title }; });

        // Find self-adds
        const selfAddPairs: Record<string, { user_id: string; creator_id: string; songs: string[]; count: number }> = {};
        for (const action of actions) {
          const song = songCreatorMap[action.song_id];
          if (song && action.user_id === song.creator_id) {
            const key = `${action.user_id}`;
            if (!selfAddPairs[key]) {
              selfAddPairs[key] = { user_id: action.user_id, creator_id: song.creator_id, songs: [], count: 0 };
            }
            selfAddPairs[key].songs.push(song.title);
            selfAddPairs[key].count++;
          }
        }

        for (const pair of Object.values(selfAddPairs)) {
          if (await alertExists('self_add', pair.user_id, pair.creator_id)) {
            summary.skipped_duplicates++;
            continue;
          }
          await supabaseAdmin.from('library_fraud_alerts').insert({
            alert_type: 'self_add',
            user_id: pair.user_id,
            creator_id: pair.creator_id,
            song_count: pair.count,
            severity: pair.count >= 5 ? 'high' : 'medium',
            details: { song_titles: pair.songs.slice(0, 20) },
            is_production: true,
          });
          summary.self_add++;
        }
      }
    }

    // 2. BULK SAME CREATOR: user added 10+ songs from same creator within 30 days
    console.log('[detect-library-fraud] Checking bulk same creator...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentActions } = await supabaseAdmin
      .from('user_library_actions')
      .select('user_id, song_id, created_at')
      .eq('action_type', 'add')
      .eq('is_production', true)
      .gte('created_at', thirtyDaysAgo);

    if (recentActions && recentActions.length > 0) {
      const songIds = [...new Set(recentActions.map(a => a.song_id))];
      const { data: songs } = await supabaseAdmin
        .from('songs')
        .select('id, user_id, title')
        .in('id', songIds);

      const songCreatorMap: Record<string, { creator_id: string; title: string }> = {};
      songs?.forEach(s => { songCreatorMap[s.id] = { creator_id: s.user_id, title: s.title }; });

      // Group by user_id + creator_id
      const pairs: Record<string, { user_id: string; creator_id: string; songs: string[]; count: number; timestamps: string[] }> = {};
      for (const action of recentActions) {
        const song = songCreatorMap[action.song_id];
        if (!song) continue;
        // Skip self-adds (already handled above)
        if (action.user_id === song.creator_id) continue;
        const key = `${action.user_id}:${song.creator_id}`;
        if (!pairs[key]) {
          pairs[key] = { user_id: action.user_id, creator_id: song.creator_id, songs: [], count: 0, timestamps: [] };
        }
        pairs[key].songs.push(song.title);
        pairs[key].timestamps.push(action.created_at);
        pairs[key].count++;
      }

      for (const pair of Object.values(pairs)) {
        if (pair.count < 10) continue;
        if (await alertExists('bulk_same_creator', pair.user_id, pair.creator_id)) {
          summary.skipped_duplicates++;
          continue;
        }
        await supabaseAdmin.from('library_fraud_alerts').insert({
          alert_type: 'bulk_same_creator',
          user_id: pair.user_id,
          creator_id: pair.creator_id,
          song_count: pair.count,
          severity: pair.count >= 20 ? 'critical' : 'high',
          details: { song_titles: pair.songs.slice(0, 20), first_add: pair.timestamps[0], last_add: pair.timestamps[pair.timestamps.length - 1] },
          is_production: true,
        });
        summary.bulk_same_creator++;
      }

      // 3. RAPID BURST: 5+ adds within 5 minutes from same user
      console.log('[detect-library-fraud] Checking rapid bursts...');
      const userActions: Record<string, { timestamps: Date[]; songs: string[] }> = {};
      for (const action of recentActions) {
        if (!userActions[action.user_id]) {
          userActions[action.user_id] = { timestamps: [], songs: [] };
        }
        userActions[action.user_id].timestamps.push(new Date(action.created_at));
        const song = songCreatorMap[action.song_id];
        if (song) userActions[action.user_id].songs.push(song.title);
      }

      for (const [userId, data] of Object.entries(userActions)) {
        const sorted = data.timestamps.sort((a, b) => a.getTime() - b.getTime());
        for (let i = 0; i <= sorted.length - 5; i++) {
          const windowEnd = sorted[i + 4];
          const diffMinutes = (windowEnd.getTime() - sorted[i].getTime()) / 60000;
          if (diffMinutes <= 5) {
            // Find the creator for these songs (use first available)
            const creatorId = Object.values(songCreatorMap)[0]?.creator_id || userId;
            if (await alertExists('rapid_burst', userId, creatorId)) {
              summary.skipped_duplicates++;
              break;
            }
            await supabaseAdmin.from('library_fraud_alerts').insert({
              alert_type: 'rapid_burst',
              user_id: userId,
              creator_id: creatorId,
              song_count: 5,
              severity: 'high',
              details: { burst_start: sorted[i].toISOString(), burst_end: windowEnd.toISOString(), songs_in_burst: data.songs.slice(i, i + 5) },
              is_production: true,
            });
            summary.rapid_burst++;
            break;
          }
        }
      }
    }

    // 4. NEW ACCOUNT TARGETING: account < 7 days old, 5+ adds from one creator
    console.log('[detect-library-fraud] Checking new account targeting...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, created_at')
      .gte('created_at', sevenDaysAgo)
      .eq('is_production', true);

    if (newProfiles && newProfiles.length > 0) {
      const newUserIds = newProfiles.map(p => p.user_id);
      const { data: newUserActions } = await supabaseAdmin
        .from('user_library_actions')
        .select('user_id, song_id')
        .eq('action_type', 'add')
        .eq('is_production', true)
        .in('user_id', newUserIds);

      if (newUserActions && newUserActions.length > 0) {
        const songIds = [...new Set(newUserActions.map(a => a.song_id))];
        const { data: songs } = await supabaseAdmin
          .from('songs')
          .select('id, user_id, title')
          .in('id', songIds);

        const songCreatorMap: Record<string, { creator_id: string; title: string }> = {};
        songs?.forEach(s => { songCreatorMap[s.id] = { creator_id: s.user_id, title: s.title }; });

        const pairs: Record<string, { user_id: string; creator_id: string; count: number; songs: string[] }> = {};
        for (const action of newUserActions) {
          const song = songCreatorMap[action.song_id];
          if (!song) continue;
          const key = `${action.user_id}:${song.creator_id}`;
          if (!pairs[key]) pairs[key] = { user_id: action.user_id, creator_id: song.creator_id, count: 0, songs: [] };
          pairs[key].count++;
          pairs[key].songs.push(song.title);
        }

        for (const pair of Object.values(pairs)) {
          if (pair.count < 5) continue;
          if (await alertExists('new_account_targeting', pair.user_id, pair.creator_id)) {
            summary.skipped_duplicates++;
            continue;
          }
          await supabaseAdmin.from('library_fraud_alerts').insert({
            alert_type: 'new_account_targeting',
            user_id: pair.user_id,
            creator_id: pair.creator_id,
            song_count: pair.count,
            severity: 'critical',
            details: { song_titles: pair.songs.slice(0, 20), account_age_days: 7 },
            is_production: true,
          });
          summary.new_account_targeting++;
        }
      }
    }

    console.log('[detect-library-fraud] Detection complete:', summary);

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[detect-library-fraud] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
