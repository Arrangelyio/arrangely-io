// supabase/functions/trusted-arrangers/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate a daily seed for consistent randomization within a day
// Uses UTC date to ensure consistent behavior across timezones
function getDailySeed(): number {
  const today = new Date();
  // Use padded month (1-12) and day for better hash distribution
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1; // 1-indexed for better uniqueness
  const day = today.getUTCDate();
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Use djb2 hash algorithm for better distribution
  let hash = 5381;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) + hash) + char; // hash * 33 + char
    hash = hash >>> 0; // Convert to unsigned 32-bit integer
  }
  
  console.log(`[trusted-arrangers] Daily seed for ${dateString}: ${hash}`);
  return hash;
}

// Improved seeded random using mulberry32 algorithm
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded random generator
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  console.log(`[trusted-arrangers] Shuffled ${shuffled.length} creators with seed ${seed}`);
  return shuffled;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // Get source and minSongs parameters from query string
    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const minSongs = parseInt(url.searchParams.get("minSongs") || "5", 10);

    let finalArrangers = [];
    const dailySeed = getDailySeed();

    // --- 1. Arrangely Creator Group ---
    const { data: arrangelyMembers, error: membersError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("creator_type", "creator_arrangely")
      .eq("role", "creator");

    if (membersError) throw membersError;

    if (arrangelyMembers?.length > 0) {
      const memberIds = arrangelyMembers.map((m) => m.user_id);
      const { count: arrangelyCount, error: arrangelyError } = await supabase
        .from("songs")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true)
        .in("user_id", memberIds);

      if (arrangelyError) throw arrangelyError;

      if (arrangelyCount && arrangelyCount > 0) {
        finalArrangers.push({
          user_id: "arrangely_creator_group",
          name: "Arrangely Creator",
          arrangements: arrangelyCount,
          isTrusted: true,
          avatar: null
        });
      }
    }

    // --- 2. Professional Creators ---
    const selectFields = source === "lesson"
      ? "user_id, display_name, avatar_url, creator_slug, bio, introduction_video_url, introduction_title, introduction_description"
      : "user_id, display_name, avatar_url, creator_slug";

    let profilesQuery = supabase
      .from("profiles")
      .select(selectFields)
      .eq("role", "creator")
      .eq("creator_type", "creator_professional");

    if (source === "lesson") {
      profilesQuery = profilesQuery.not("introduction_video_url", "is", null);
    }

    const { data: profilesData, error: profilesError } = await profilesQuery;
    if (profilesError) throw profilesError;

    if (profilesData?.length > 0) {
      const professionalUserIds = profilesData.map((p) => p.user_id);

      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select("user_id")
        .eq("is_public", true)
        .in("user_id", professionalUserIds);

      if (songsError) throw songsError;

      const arrangementsCountMap = new Map();
      songsData?.forEach((song) => {
        arrangementsCountMap.set(song.user_id, (arrangementsCountMap.get(song.user_id) || 0) + 1);
      });

      profilesData.forEach((profile) => {
        const songCount = arrangementsCountMap.get(profile.user_id) || 0;
        
        // Only include creators with at least minSongs published
        if (songCount >= minSongs) {
          const arrangerData: any = {
            user_id: profile.user_id,
            name: profile.display_name || "Unknown Creator",
            avatar: profile.avatar_url,
            creator_slug: profile.creator_slug,
            isTrusted: true,
            arrangements: songCount
          };

          if (source === "lesson") {
            arrangerData.bio = profile.bio;
            arrangerData.introduction_video_url = profile.introduction_video_url;
            arrangerData.introduction_title = profile.introduction_title;
            arrangerData.introduction_description = profile.introduction_description;
          }

          finalArrangers.push(arrangerData);
        }
      });
    }

    // --- 3. Apply daily-seeded shuffle ---
    // Separate Arrangely (always first) from others
    const arrangelyCreator = finalArrangers.find((a) => a.user_id === "arrangely_creator_group");
    const otherCreators = finalArrangers.filter((a) => a.user_id !== "arrangely_creator_group");

    // Shuffle other creators with daily seed
    const shuffledCreators = seededShuffle(otherCreators, dailySeed);

    // Reconstruct: Arrangely first (if exists), then shuffled others
    finalArrangers = arrangelyCreator ? [arrangelyCreator, ...shuffledCreators] : shuffledCreators;

    if (source === "lesson") {
      finalArrangers = finalArrangers.filter((a) => a.user_id !== "arrangely_creator_group");
    }

    return new Response(JSON.stringify(finalArrangers), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in trusted-arrangers function:", error);
    return new Response(JSON.stringify({
      error: "Failed to load trusted arrangers"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
