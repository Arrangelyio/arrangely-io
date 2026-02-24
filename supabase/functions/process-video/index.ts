import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { FFmpeg } from 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10';
import { fetchFile, toBlobURL } from 'https://esm.sh/@ffmpeg/util@0.12.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessVideoRequest {
  videoPath: string; // Path in temporary storage
  lessonId: string;
  watermarkText: string;
  userId: string;
}

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
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoPath, lessonId, watermarkText, userId }: ProcessVideoRequest = await req.json();

    if (!videoPath || !lessonId || !watermarkText || !userId || userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    // Create service role client for storage access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download original video from temp storage
    const { data: videoFile, error: downloadError } = await supabaseAdmin
      .storage
      .from('lesson-videos')
      .download(videoPath);

    if (downloadError || !videoFile) {
      console.error('Failed to download video:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download video' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize FFmpeg
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    

    // Write input video to FFmpeg virtual filesystem
    const inputVideoData = new Uint8Array(await videoFile.arrayBuffer());
    await ffmpeg.writeFile('input.mp4', inputVideoData);

    // Create watermark text as overlay
    const watermarkFilter = `drawtext=text='${watermarkText}':fontcolor=white@0.3:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2`;

    // Process video: Add watermark + Generate HLS segments
    // HLS with 10-second segments
    
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vf', watermarkFilter,
      '-codec:v', 'libx264',
      '-codec:a', 'aac',
      '-hls_time', '10', // 10-second segments
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', 'segment_%03d.ts',
      '-start_number', '0',
      'playlist.m3u8'
    ]);

    

    // Read the generated files
    const playlistData = await ffmpeg.readFile('playlist.m3u8');
    const playlistText = new TextDecoder().decode(playlistData);
    
    // Parse playlist to find all segment files
    const segmentMatches = playlistText.matchAll(/segment_(\d+)\.ts/g);
    const segmentFiles: string[] = [];
    for (const match of segmentMatches) {
      segmentFiles.push(match[0]);
    }

    

    // Upload all segments and playlist to storage
    const outputPath = `${userId}/${lessonId}/processed`;
    
    // Upload playlist
    await supabaseAdmin.storage
      .from('lesson-videos')
      .upload(`${outputPath}/playlist.m3u8`, new Blob([playlistData]), {
        contentType: 'application/vnd.apple.mpegurl',
        upsert: true,
      });

    // Upload all segments
    for (const segmentFile of segmentFiles) {
      const segmentData = await ffmpeg.readFile(segmentFile);
      await supabaseAdmin.storage
        .from('lesson-videos')
        .upload(`${outputPath}/${segmentFile}`, new Blob([segmentData]), {
          contentType: 'video/mp2t',
          upsert: true,
        });
    }

    // Delete temporary original file
    await supabaseAdmin.storage
      .from('lesson-videos')
      .remove([videoPath]);

    

    return new Response(
      JSON.stringify({
        success: true,
        playlistPath: `${outputPath}/playlist.m3u8`,
        segments: segmentFiles.length,
        message: 'Video processed with watermark and HLS segmentation'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing video:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Video processing failed',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
