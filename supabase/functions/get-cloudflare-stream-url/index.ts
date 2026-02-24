import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const jwt = authHeader?.replace(/^Bearer\s+/i, '');
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lessonId, contentId, videoId } = await req.json();

    if (!lessonId || !contentId || !videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract clean Cloudflare Stream UID from various formats
    let cleanVideoId = videoId;
    
    // Remove query parameters if present
    if (cleanVideoId.includes('?')) {
      cleanVideoId = cleanVideoId.split('?')[0];
    }
    
    // Extract UID from URL if it's a full Cloudflare Stream URL
    if (cleanVideoId.includes('cloudflarestream.com/') || cleanVideoId.includes('videodelivery.net/')) {
      const parts = cleanVideoId.split('/');
      const uidIndex = parts.findIndex(p => p.length === 32 && /^[a-f0-9]{32}$/.test(p));
      if (uidIndex !== -1) {
        cleanVideoId = parts[uidIndex];
      }
    }
    
    // Validate it looks like a Cloudflare Stream UID (32 hex characters)
    if (!/^[a-f0-9]{32}$/.test(cleanVideoId)) {
      console.error(`Invalid video ID format: ${videoId} (cleaned: ${cleanVideoId})`);
      return new Response(
        JSON.stringify({ error: 'Invalid video ID format', videoId, cleanedId: cleanVideoId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    // Verify user enrollment using RPC
    const { data: isEnrolled, error: enrollmentError } = await supabaseClient.rpc(
      'verify_user_enrollment',
      {
        p_user_id: user.id,
        p_lesson_id: lessonId,
      }
    );

    if (enrollmentError) {
      console.error('Enrollment check error:', enrollmentError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify enrollment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isEnrolled) {
      // Log unauthorized access attempt
      await supabaseClient.from('security_incidents').insert({
        user_id: user.id,
        incident_type: 'unauthorized_video_access',
        description: `Attempted to access video without enrollment: ${videoId}`,
        severity: 'medium',
        metadata: {
          lesson_id: lessonId,
          content_id: contentId,
          video_id: videoId,
        },
      });

      return new Response(
        JSON.stringify({ error: 'Not enrolled in this lesson' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful access
    await supabaseClient.from('content_access_logs').insert({
      user_id: user.id,
      content_id: contentId,
      lesson_id: lessonId,
      access_type: 'video_view',
      metadata: {
        video_id: videoId,
      },
    });

    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');

    if (!cloudflareAccountId || !cloudflareApiToken) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create signed URL for Cloudflare Stream (expires in 1 hour)
    const expiresIn = 3600; // 1 hour
    const exp = Math.floor(Date.now() / 1000) + expiresIn;

    // Generate signed token for Cloudflare Stream
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${cleanVideoId}/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exp,
          downloadable: false,
          accessRules: [
            {
              type: 'ip.geoip.country',
              action: 'allow',
              country: ['*'], // Allow all countries, customize as needed
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to generate Cloudflare token:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate video token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await response.json();
    const cfToken = tokenData.result.token;

    // Build Stream player URL with signed token
    const signedUrl = `https://iframe.cloudflarestream.com/${cleanVideoId}?token=${cfToken}`;
    const hlsUrl = `https://videodelivery.net/${cleanVideoId}/manifest/video.m3u8?token=${cfToken}`;
    

    return new Response(
      JSON.stringify({
        signedUrl,
        hlsUrl,
        expiresIn,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating signed Stream URL:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate signed URL',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
