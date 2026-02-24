// supabase/functions/songs-list/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // -------------------------
    // Parse request body
    // -------------------------
    const requestBody = await req.json();

    const {
      currentPage = 1,
      songsPerPage = 10,
      creatorFilter,
      creatorTypeFilter,
      searchTerm,
      selectedCategory,
      themeFilter,
      chordGridFilter,
      sortBy = "recent",
      currentUserId,
    } = requestBody;

    const page = Math.max(1, Number(currentPage) || 1);
    const perPage = Math.min(100, Math.max(1, Number(songsPerPage) || 10));

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // -------------------------
    // Prepare filters
    // -------------------------
    let creatorTypes: string[] | null = null;

    if (creatorTypeFilter === "creator_pro") {
      creatorTypes = ["creator_arrangely", "creator_pro"];
    } else if (creatorTypeFilter === "creator_professional") {
      creatorTypes = ["creator_arrangely", "creator_professional"];
    } else if (creatorTypeFilter) {
      creatorTypes = [creatorTypeFilter];
    }

    let creatorIds: string[] | null = null;

    if (creatorFilter && creatorFilter !== "Arrangely Creator") {
      creatorIds = [creatorFilter];
    }

    // -------------------------
    // Call RPC
    // -------------------------
    const { data: songsData, error: songsError } = await supabase.rpc(
      "search_songs_rpc_v2",
      {
        p_search: searchTerm?.trim() || null,
        p_creator_types: creatorTypes,
        p_creator_ids: creatorIds,
        p_category:
          selectedCategory && selectedCategory !== "all"
            ? selectedCategory
            : null,
        p_theme:
          themeFilter && themeFilter !== "all" ? themeFilter : null,
        p_chord_grid:
          chordGridFilter && chordGridFilter !== "all"
            ? chordGridFilter
            : null,
        p_sort: sortBy,
        p_from: from,
        p_to: to,
      }
    );

    if (songsError) throw songsError;

    const total = songsData?.[0]?.total_count ?? 0;

    if (!songsData || songsData.length === 0) {
      return new Response(
        JSON.stringify({ songs: [], total }),
        { headers: corsHeaders }
      );
    }

    // Extract actual song rows
    const strippedSongsData = songsData.map((row) => row.song_row);

    // -------------------------
    // Fetch profiles
    // -------------------------
    const userIds = [...new Set(strippedSongsData.map((s) => s.user_id))];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, role, creator_type")
      .in("user_id", userIds);

    const profilesMap = new Map();
    profilesData?.forEach((p) => profilesMap.set(p.user_id, p));

    // -------------------------
    // Likes & follows
    // -------------------------
    let likesMap = new Map();
    let userLikedSongs = new Set();
    let userFollowedCreators = new Set();

    if (currentUserId) {
      const songIds = strippedSongsData.map((s) => s.id);

      const { data: likesData } = await supabase
        .from("song_likes")
        .select("song_id")
        .in("song_id", songIds);

      songIds.forEach((sid) => {
        const count =
          likesData?.filter((like) => like.song_id === sid).length || 0;
        likesMap.set(sid, count);
      });

      const { data: likedSongsData } = await supabase
        .from("song_likes")
        .select("song_id")
        .eq("user_id", currentUserId)
        .in("song_id", songIds);

      likedSongsData?.forEach((l) =>
        userLikedSongs.add(l.song_id)
      );

      const { data: followedCreatorsData } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .in("following_id", userIds);

      followedCreatorsData?.forEach((f) =>
        userFollowedCreators.add(f.following_id)
      );
    }

    // -------------------------
    // Transform songs
    // -------------------------
    const transformed = strippedSongsData.map((song) => {
      const profile = profilesMap.get(song.user_id);
      const creatorType = profile?.creator_type;

      let displayArranger =
        profile?.display_name || "Unknown Creator";
      let displayAvatar = profile?.avatar_url || null;

      if (creatorType === "creator") {
        displayArranger = "Arrangely Creator";
        displayAvatar = null;
      }

      return {
        id: song.id,
        title: song.title,
        artist: song.artist || "Unknown Artist",
        arranger: displayArranger,
        arrangerAvatar: displayAvatar,
        arrangerBio: `Creator with role: ${profile?.role || "user"}`,
        arrangerSocial: {},
        key: song.current_key,
        tempo: song.tempo || 120,
        theme: song.theme,
        tags: song.tags,
        difficulty: song.difficulty,
        likes: likesMap.get(song.id) || 0,
        views: song.views_count || 0,
        isLiked: userLikedSongs.has(song.id),
        isFavorited: song.is_favorite || false,
        isFollowed: userFollowedCreators.has(song.user_id),
        isPublic: song.is_public,
        isPremium: false,
        isTrusted:
          profile?.role === "creator" ||
          profile?.role === "admin",
        createdAt: song.created_at,
        youtubeLink: song.youtube_link || "",
        slug: song.slug,
        youtubeThumbnail: song.youtube_thumbnail || null,
        user_id: song.user_id,
      };
    });

    // -------------------------
    // Final Response
    // -------------------------
    return new Response(
      JSON.stringify({
        songs: transformed,
        total,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (e) {
    console.error("songs-list error:", e);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch songs",
        details: e?.message || String(e),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
