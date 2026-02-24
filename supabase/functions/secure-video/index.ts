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

    // Verify user authentication using bearer token from header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request parameters
    const { lessonId, contentId, videoPath, stream } = await req.json();

    if (!lessonId || !contentId || !videoPath) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    // Verify user enrollment using security definer function
    const { data: isEnrolled, error: enrollError } = await supabaseClient
      .rpc('verify_user_enrollment', {
        p_user_id: user.id,
        p_lesson_id: lessonId
      });

    if (enrollError || !isEnrolled) {
      console.error('Enrollment verification failed:', enrollError);
      
      // Log security incident
      await supabaseClient.from('security_incidents').insert({
        user_id: user.id,
        incident_type: 'unauthorized_video_access_attempt',
        description: 'User attempted to access video without enrollment',
        severity: 'medium',
        metadata: {
          lesson_id: lessonId,
          content_id: contentId,
          video_path: videoPath,
        },
      });

      return new Response(
        JSON.stringify({ error: 'Enrollment required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log content access
    await supabaseClient.from('content_access_logs').insert({
      user_id: user.id,
      lesson_id: lessonId,
      content_id: contentId,
      access_type: 'video_view',
      user_agent: req.headers.get('user-agent'),
      is_production: true,
    });

    // Create service role client for storage access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse bucket and path from videoPath if it's a full URL
    let bucketName = 'lesson-videos';
    let objectPath = videoPath as string;

    try {
      if (typeof videoPath === 'string' && /^https?:\/\//i.test(videoPath)) {
        const u = new URL(videoPath);
        const after = u.pathname.split('/storage/v1/object/')[1];
        if (after) {
          const segments = after.split('/').filter(Boolean);
          if (segments.length >= 3 && (segments[0] === 'public' || segments[0] === 'sign' || segments[0] === 'authenticated')) {
            bucketName = segments[1];
            objectPath = decodeURIComponent(segments.slice(2).join('/'));
          } else if (segments.length >= 2) {
            bucketName = segments[0];
            objectPath = decodeURIComponent(segments.slice(1).join('/'));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse storage URL, using defaults', e);
    }

    // If client requests streaming bytes, return the video directly (no shareable URL)
    if (stream) {
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from(bucketName)
        .download(objectPath);

      if (downloadError || !fileData) {
        console.error('Failed to download video:', downloadError);
        return new Response(
          JSON.stringify({
            error: 'Video file not found in storage',
            details: 'The video file does not exist at the specified path.',
            bucket: bucketName,
            path: objectPath
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const filename = objectPath.split('/').pop() ?? 'video.mp4';
      

      return new Response(fileData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'video/mp4',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': `inline; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Accept-Ranges': 'bytes'
        }
      });
    }

    // Otherwise, generate short-lived signed URL (60 seconds) for legacy clients
    const { data: signedUrlData, error: urlError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(objectPath, 60);

    if (urlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', urlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate access URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl,
        expiresIn: 60 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('Error in secure-video function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
