import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse multipart form data
    const formData = await req.formData();
    const videoFile = formData.get('video');
    const lessonId = formData.get('lessonId');
    const watermarkText = formData.get('watermarkText');
    const userId = formData.get('userId');
    if (!videoFile || !lessonId || !watermarkText || !userId || userId !== user.id) {
      return new Response(JSON.stringify({
        error: 'Missing or invalid parameters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const cloudflareApiToken = Deno.env.get('CLOUDFLARE_STREAM_API_TOKEN');
    const watermarkUid = Deno.env.get('CLOUDFLARE_WATERMARK_UID');
    if (!cloudflareAccountId || !cloudflareApiToken) {
      return new Response(JSON.stringify({
        error: 'Cloudflare credentials not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Step 1: Create TUS upload session with watermark and signed URLs
    const videoSize = videoFile.size;
    const tusCreateUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream`;
    const metadata = {
      name: `Lesson ${lessonId}`,
      requiresignedurls: 'false',
      ...watermarkUid && {
        watermark: watermarkUid
      }
    };
    const metadataString = Object.entries(metadata).map(([key, value])=>`${key} ${btoa(value)}`).join(',');
    const tusCreateResponse = await fetch(tusCreateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(videoSize),
        'Upload-Metadata': metadataString
      }
    });
    if (!tusCreateResponse.ok) {
      const errorText = await tusCreateResponse.text();
      console.error('TUS session creation failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to create upload session',
        details: errorText
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const uploadUrl = tusCreateResponse.headers.get('Location');
    if (!uploadUrl) {
      return new Response(JSON.stringify({
        error: 'No upload URL returned from Cloudflare'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Step 2: Upload video file using TUS protocol
    const videoArrayBuffer = await videoFile.arrayBuffer();
    const tusUploadResponse = await fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': '0',
        'Content-Type': 'application/offset+octet-stream'
      },
      body: videoArrayBuffer
    });
    if (!tusUploadResponse.ok) {
      const errorText = await tusUploadResponse.text();
      console.error('TUS upload failed:', errorText);
      return new Response(JSON.stringify({
        error: 'Failed to upload video',
        details: errorText
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Extract video UID from upload URL (remove query parameters)
    const videoUidWithQuery = uploadUrl.split('/').pop() || '';
    const videoUid = videoUidWithQuery.split('?')[0];
    // Step 3: Get video details
    const videoDetailsResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${videoUid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`
      }
    });
    let uploadResult = {
      result: {
        uid: videoUid
      }
    };
    if (videoDetailsResponse.ok) {
      uploadResult = await videoDetailsResponse.json();
      
    }
    
    // Step 4: Update video metadata (disable signed URLs)
    const updateSignedUrlResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/stream/${videoUid}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudflareApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requireSignedURLs: false
      })
    });
    if (!updateSignedUrlResponse.ok) {
      const errorText = await updateSignedUrlResponse.text();
      console.error('Failed to update signed URLs setting:', updateSignedUrlResponse);
    } else {
      
    }
    return new Response(JSON.stringify({
      success: true,
      videoId: uploadResult.result.uid,
      playbackUrl: uploadResult.result.playback?.hls,
      thumbnailUrl: uploadResult.result.thumbnail,
      status: uploadResult.result.status,
      message: 'Video uploaded to Cloudflare Stream with watermark and HLS'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error uploading to Cloudflare Stream:', error);
    return new Response(JSON.stringify({
      error: 'Video upload failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
