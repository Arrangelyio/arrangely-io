import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function extractYouTubeVideoId(url: string): string | null {
  try {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { youtubeLink, title, artist, userId } = await req.json();

    if (!youtubeLink || !title) {
      return new Response(
        JSON.stringify({ error: "youtubeLink and title are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const videoId = extractYouTubeVideoId(youtubeLink);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube link" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // Query songs
    const { data: songs, error } = await supabase
      .from("songs")
      .select("id, title, artist, youtube_link, user_id, slug")
      .eq("is_public", true)
      .neq("user_id", userId)
      .ilike("title", title)
      .limit(5000);

    if (error) throw error;

    // Filter based on videoId match
    const duplicates = (songs ?? []).filter((song: any) => {
      if (!song.youtube_link) return false;
      const songVideoId = extractYouTubeVideoId(song.youtube_link);
      if (songVideoId !== videoId) return false;

      const titleMatch = song.title.toLowerCase().trim() === title.toLowerCase().trim();
      const artistMatch = !song.artist || !artist || 
        song.artist.toLowerCase().trim() === artist.toLowerCase().trim();

      return titleMatch && artistMatch;
    });

    if (duplicates.length === 0) {
      return new Response(
        JSON.stringify({ duplicate: null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    // Get the owner's creator_type from profiles
    const duplicateSong = duplicates[0];
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("creator_type")
      .eq("user_id", duplicateSong.user_id)
      .single();

    return new Response(
      JSON.stringify({
        duplicate: {
          id: duplicateSong.id,
          title: duplicateSong.title,
          artist: duplicateSong.artist,
          youtube_link: duplicateSong.youtube_link,
          user_id: duplicateSong.user_id,
          slug: duplicateSong.slug,
          ownerCreatorType: ownerProfile?.creator_type || null
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (err) {
    console.error("Error in check-duplicate-songs:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
