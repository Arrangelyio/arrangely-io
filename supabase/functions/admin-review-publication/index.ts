import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReviewRequest {
  publicationId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  adminNotes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create service role client for bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or support_admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'admin' && profile.role !== 'support_admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { publicationId, action, rejectionReason, adminNotes } = await req.json() as ReviewRequest;

    if (!publicationId || !action) {
      return new Response(
        JSON.stringify({ error: 'publicationId and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason is required when rejecting' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the publication using the database function to avoid ambiguous column issues
    const { data: publicationData, error: pubError } = await supabaseAdmin
      .rpc('get_publication_for_review', { publication_id: publicationId });

    const publication = publicationData?.[0];

    if (pubError || !publication) {
      console.error('Publication error:', pubError);
      return new Response(
        JSON.stringify({ error: 'Publication not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (publication.status !== 'pending_review') {
      return new Response(
        JSON.stringify({ error: `Publication is already ${publication.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update publication status to active
      const { error: updatePubError } = await supabaseAdmin
        .from('creator_pro_publications')
        .update({
          status: 'active',
          published_at: now,
          updated_at: now,
          review_notes: adminNotes || null
        })
        .eq('id', publicationId);

      if (updatePubError) {
        console.error('Update publication error:', updatePubError);
        throw updatePubError;
      }

      // Update song to be public
      const { error: updateSongError } = await supabaseAdmin
        .from('songs')
        .update({ is_public: true })
        .eq('id', publication.song_id);

      if (updateSongError) {
        console.error('Update song error:', updateSongError);
        throw updateSongError;
      }

      

      // Send approval notification email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-publication-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            publicationId,
            songId: publication.song_id,
            userId: publication.user_id,
            status: 'active',
            songTitle: publication.song_title,
            songArtist: publication.song_artist,
            rejectedReason: null,
            validationResults: publication.validation_results
          })
        });
        
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Publication approved and song is now public',
          status: 'active'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'reject') {
      // Update publication status to rejected
      const { error: updatePubError } = await supabaseAdmin
        .from('creator_pro_publications')
        .update({
          status: 'rejected',
          rejected_reason: rejectionReason,
          updated_at: now,
          review_notes: adminNotes || null
        })
        .eq('id', publicationId);

      if (updatePubError) {
        console.error('Update publication error:', updatePubError);
        throw updatePubError;
      }

      

      // Send rejection notification email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-publication-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            publicationId,
            songId: publication.song_id,
            userId: publication.user_id,
            status: 'rejected',
            songTitle: publication.song_title,
            songArtist: publication.song_artist,
            rejectedReason: rejectionReason,
            validationResults: publication.validation_results
          })
        });
        
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Publication rejected',
          status: 'rejected'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Review error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
