import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl, videoId } = await req.json();

    if (!youtubeUrl || !videoId) {
      return new Response(
        JSON.stringify({ error: "youtubeUrl and videoId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cache first
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: cached } = await adminClient
      .from("ai_generated_songs")
      .select("*")
      .eq("user_id", user.id)
      .eq("youtube_video_id", videoId)
      .maybeSingle();

    if (cached && cached.chords) {
      console.log(`Cache hit for video ${videoId}`);
      return new Response(
        JSON.stringify({
          cached: true,
          id: cached.id,
          chords: cached.chords,
          duration: cached.duration,
          beats_data: cached.beats_data,
          lyrics: cached.lyrics,
          title: cached.title,
          artist: cached.artist,
          bpm: cached.bpm,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get audio download URL via Cobalt API
    console.log(`Fetching audio for: ${youtubeUrl}`);
    
    const cobaltResponse = await fetch("https://api.cobalt.tools/", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: youtubeUrl,
        downloadMode: "audio",
        audioFormat: "mp3",
      }),
    });

    if (!cobaltResponse.ok) {
      const cobaltError = await cobaltResponse.text();
      console.error("Cobalt API error:", cobaltResponse.status, cobaltError);
      return new Response(
        JSON.stringify({ error: "Failed to extract audio from YouTube. Please try uploading an MP3 file instead." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cobaltData = await cobaltResponse.json();
    console.log("Cobalt response status:", cobaltData.status);

    if (cobaltData.status === "error") {
      return new Response(
        JSON.stringify({ error: cobaltData.error?.code || "Failed to extract audio" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioDownloadUrl = cobaltData.url;
    if (!audioDownloadUrl) {
      return new Response(
        JSON.stringify({ error: "No audio download URL received" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Download the audio
    console.log("Downloading audio from:", audioDownloadUrl);
    const audioResponse = await fetch(audioDownloadUrl);
    if (!audioResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download converted audio" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBytes = new Uint8Array(audioArrayBuffer);
    console.log(`Downloaded audio: ${audioBytes.length} bytes`);

    // Step 3: Forward audio to new-analyze-song edge function
    const formData = new FormData();
    const audioBlob = new Blob([audioBytes as unknown as BlobPart], { type: "audio/mpeg" });
    formData.append("file", audioBlob, `${videoId}.mp3`);

    const analyzeUrl = `${supabaseUrl}/functions/v1/new-analyze-song`;
    console.log("Forwarding to new-analyze-song...");

    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader || `Bearer ${supabaseAnonKey}`,
      },
      body: formData,
    });

    if (!analyzeResponse.ok) {
      const errText = await analyzeResponse.text();
      console.error("Analyze error:", analyzeResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Chord analysis failed: " + errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisResult = await analyzeResponse.json();
    console.log("Analysis complete, chords count:", analysisResult.chords?.length);

    // Step 4: Get YouTube video title via oEmbed
    let videoTitle = "";
    let videoArtist = "";
    try {
      const oembedResp = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`
      );
      if (oembedResp.ok) {
        const oembedData = await oembedResp.json();
        videoTitle = oembedData.title || "";
        videoArtist = oembedData.author_name || "";
      }
    } catch (e) {
      console.warn("oEmbed fetch failed:", e);
    }

    // Step 5: Save to ai_generated_songs
    const songRecord = {
      user_id: user.id,
      youtube_video_id: videoId,
      youtube_url: youtubeUrl,
      title: videoTitle,
      artist: videoArtist,
      duration: analysisResult.duration || null,
      bpm: analysisResult.beats_data?.bpm || null,
      time_signature: analysisResult.beats_data?.time_signature || "4/4",
      chords: analysisResult.chords || [],
      beats_data: analysisResult.beats_data || null,
      lyrics: analysisResult.lyrics || null,
      analysis_raw: analysisResult,
    };

    const { data: savedRecord, error: insertError } = await adminClient
      .from("ai_generated_songs")
      .insert(songRecord)
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      // Still return results even if save fails
    }

    return new Response(
      JSON.stringify({
        cached: false,
        id: savedRecord?.id || null,
        ...analysisResult,
        title: videoTitle,
        artist: videoArtist,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("convert-youtube-audio error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
