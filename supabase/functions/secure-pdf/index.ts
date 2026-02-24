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
    const { lessonId, contentId, pdfPath, stream } = await req.json();

    if (!lessonId || !contentId || !pdfPath) {
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
        incident_type: 'unauthorized_pdf_access_attempt',
        description: 'User attempted to access PDF without enrollment',
        severity: 'medium',
        metadata: {
          lesson_id: lessonId,
          content_id: contentId,
          pdf_path: pdfPath,
        },
      });

      return new Response(
        JSON.stringify({ error: 'Enrollment required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user details for watermark
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', user.id)
      .single();

    // Log content access
    await supabaseClient.from('content_access_logs').insert({
      user_id: user.id,
      lesson_id: lessonId,
      content_id: contentId,
      access_type: 'pdf_view',
      user_agent: req.headers.get('user-agent'),
      is_production: true,
    });

    // Create service role client for storage access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Determine bucket and object path
    let bucketName = 'lesson-pdfs';
    let objectPath = pdfPath as string;

    // If a full Supabase Storage URL was provided, parse it to extract bucket and path
    try {
      if (typeof pdfPath === 'string' && /^https?:\/\//i.test(pdfPath)) {
        const u = new URL(pdfPath);
        const after = u.pathname.split('/storage/v1/object/')[1];
        if (after) {
          const segments = after.split('/').filter(Boolean);
          // Handle formats like /object/public/<bucket>/<path> or /object/sign/<bucket>/<path>
          if (segments.length >= 3 && (segments[0] === 'public' || segments[0] === 'sign' || segments[0] === 'authenticated')) {
            bucketName = segments[1];
            objectPath = decodeURIComponent(segments.slice(2).join('/'));
          } else if (segments.length >= 2) {
            // Fallback: /object/<bucket>/<path>
            bucketName = segments[0];
            objectPath = decodeURIComponent(segments.slice(1).join('/'));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse storage URL, using defaults', e);
    }

    // Create watermark text
    const watermarkText = `${profile?.display_name || user.email} - ${new Date().toLocaleDateString()}`;

    // If client requests streaming bytes, return the PDF directly (no shareable URL)
    if (stream) {
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from(bucketName)
        .download(objectPath);

      if (downloadError || !fileData) {
        console.error('Failed to download PDF:', downloadError);
        return new Response(
          JSON.stringify({
            error: 'PDF file not found in storage',
            details: 'The PDF file does not exist at the specified path in the specified bucket.',
            bucket: bucketName,
            path: objectPath
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const filename = objectPath.split('/').pop() ?? 'document.pdf';
      

      return new Response(fileData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': `inline; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    // Otherwise, generate short-lived signed URL (30 seconds) for legacy clients
    const { data: signedUrlData, error: urlError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(objectPath, 30);

    if (urlError || !signedUrlData) {
      console.error('Failed to generate signed URL:', urlError);
      console.error('Requested path:', pdfPath, 'Resolved bucket:', bucketName, 'object:', objectPath);
      return new Response(
        JSON.stringify({ 
          error: 'PDF file not found in storage',
          details: 'The PDF file does not exist at the specified path in the specified bucket.',
          bucket: bucketName,
          path: objectPath
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    return new Response(
      JSON.stringify({ 
        signedUrl: signedUrlData.signedUrl,
        watermarkText,
        expiresIn: 30 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Disposition': 'inline'
        } 
      }
    );

  } catch (error) {
    console.error('Error in secure-pdf function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
