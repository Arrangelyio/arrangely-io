import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

/* =========================
   DAILY SEEDED SHUFFLE
========================= */

function getDailySeed(): number {
  const today = new Date();
  const dateString = `${today.getUTCFullYear()}-${today.getUTCMonth() + 1}-${today.getUTCDate()}`;

  let hash = 5381;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) + hash) + dateString.charCodeAt(i);
    hash >>>= 0;
  }
  return hash;
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/* =========================
   EDGE FUNCTION
========================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[community-creators] Fetching community creators (RPC)");

    const url = new URL(req.url);
    const minSongs = parseInt(url.searchParams.get("minSongs") || "1", 10);
    const dailySeed = getDailySeed();

    let finalCreators: any[] = [];

    /* ---------------------------------
       1. ARRANGELY CREATOR (GROUP)
    --------------------------------- */
    const { data: arrangelyMembers, error: arrangelyMembersError } =
      await supabase
        .from("profiles")
        .select("user_id")
        .eq("creator_type", "creator_arrangely")
        .eq("role", "creator");

    if (arrangelyMembersError) throw arrangelyMembersError;

    if (arrangelyMembers && arrangelyMembers.length > 0) {
      const memberIds = arrangelyMembers.map((m) => m.user_id);

      const { count: arrangelySongCount, error: arrangelyCountError } =
        await supabase
          .from("songs")
          .select("*", { count: "exact", head: true })
          .eq("is_public", true)
          .in("user_id", memberIds);

      if (arrangelyCountError) throw arrangelyCountError;

      if (arrangelySongCount && arrangelySongCount >= minSongs) {
        finalCreators.push({
          user_id: "arrangely_creator_group",
          name: "Arrangely Creator",
          display_name: "Arrangely Creator",
          avatar: null,
          avatar_url: null,
          creator_slug: null,
          creator_type: "creator_arrangely",
          isTrusted: true,
          arrangements: arrangelySongCount,
        });
      }
    }

    /* ---------------------------------
       2. CREATOR PRO (RPC)
    --------------------------------- */
    const { data: proCreators, error: rpcError } = await supabase.rpc(
      "community_creators_rpc",
      { p_min_songs: minSongs }
    );

    if (rpcError) {
      console.error("[community-creators] RPC error:", rpcError);
      throw rpcError;
    }

    proCreators?.forEach((creator: any) => {
      finalCreators.push({
        user_id: creator.user_id,
        name: creator.display_name || "Unknown Creator",
        display_name: creator.display_name || "Unknown Creator",
        avatar: creator.avatar_url,
        avatar_url: creator.avatar_url,
        creator_slug: creator.creator_slug,
        creator_type: creator.creator_type,
        isTrusted: false,
        arrangements: creator.arrangements,
      });
    });

    /* ---------------------------------
       3. DAILY SHUFFLE
    --------------------------------- */
    const arrangelyGroup = finalCreators.find(
      (c) => c.user_id === "arrangely_creator_group"
    );
    const otherCreators = finalCreators.filter(
      (c) => c.user_id !== "arrangely_creator_group"
    );

    const shuffledOthers = seededShuffle(otherCreators, dailySeed);

    finalCreators = arrangelyGroup
      ? [arrangelyGroup, ...shuffledOthers]
      : shuffledOthers;

    console.log(
      `[community-creators] Returning ${finalCreators.length} creators`
    );

    return new Response(JSON.stringify(finalCreators), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("[community-creators] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to load community creators",
        details: error?.message || String(error),
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
