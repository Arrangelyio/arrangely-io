import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sortBy') || 'score'; // 'score', 'recent', 'views'

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get active publications with songs and creator info
    let query = supabase
      .from('creator_pro_publications')
      .select(`
        id,
        song_id,
        published_at,
        songs!inner (
          id,
          title,
          artist,
          youtube_thumbnail,
          views_count,
          user_id,
          current_key,
          created_at
        )
      `)
      .eq('status', 'active')
      .eq('is_production', true)
      .range(offset, offset + limit - 1);

    // Apply sorting
    if (sortBy === 'recent') {
      query = query.order('published_at', { ascending: false });
    } else if (sortBy === 'views') {
      // Note: This will sort by publication date; actual views sorting needs a join
      query = query.order('published_at', { ascending: false });
    } else {
      query = query.order('published_at', { ascending: false });
    }

    const { data: publications, error } = await query;

    if (error) {
      throw error;
    }

    if (!publications || publications.length === 0) {
      return new Response(
        JSON.stringify({ songs: [], total: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get creator profiles and scores
    const creatorIds = [...new Set(publications.map(p => (p.songs as any)?.user_id).filter(Boolean))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, creator_slug')
      .in('user_id', creatorIds);

    const { data: scores } = await supabase
      .from('creator_pro_scores')
      .select('user_id, total_score, status')
      .in('user_id', creatorIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const scoreMap = new Map(scores?.map(s => [s.user_id, s]) || []);

    // Build response with score-based ranking
    let songs = publications.map(pub => {
      const song = pub.songs as any;
      const profile = profileMap.get(song?.user_id);
      const score = scoreMap.get(song?.user_id);

      return {
        id: song?.id,
        title: song?.title,
        artist: song?.artist,
        youtube_thumbnail: song?.youtube_thumbnail,
        views_count: song?.views_count || 0,
        current_key: song?.current_key,
        published_at: pub.published_at,
        creator: {
          id: profile?.user_id,
          display_name: profile?.display_name || 'Creator Pro',
          avatar_url: profile?.avatar_url,
          slug: profile?.creator_slug,
          score: score?.total_score ? Number(score.total_score) : 80,
          status: score?.status || 'active'
        },
        score_tier: getScoreTier(score?.total_score ? Number(score.total_score) : 80)
      };
    });

    // Sort by score if requested
    if (sortBy === 'score') {
      songs = songs.sort((a, b) => b.creator.score - a.creator.score);
    }

    return new Response(
      JSON.stringify({ 
        songs,
        total: songs.length,
        hasMore: songs.length === limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching creator pro songs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getScoreTier(score: number): string {
  if (score >= 85) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'warning';
  return 'suspended';
}
