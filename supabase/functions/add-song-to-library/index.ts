import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    console.log("🚀 add-song-to-library called");

    // ===== AUTH =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn("❌ Missing Authorization header");

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: "Unauthorized" },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.warn("❌ Invalid token");

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: "Invalid token" },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("✅ Authenticated user:", user.id);

    // ===== BODY =====
    const body = await req.json();
    const { originalSongId } = body;

    if (!originalSongId) {
      console.warn("❌ Missing originalSongId");

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: "originalSongId is required" },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("📀 Adding originalSongId:", originalSongId);

    // ===== CALL ATOMIC FUNCTION =====
    const { data, error } = await supabase.rpc(
      "add_song_to_library_atomic",
      {
        p_user_id: user.id,
        p_original_song_id: originalSongId,
      }
    );

    if (error) {
      console.error("❌ RPC Error:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: { message: error.message },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("✅ RPC Result:", data);

    // Kalau function return success false
    if (!data?.success) {
      console.warn("⚠️ Business logic failed:", data?.error);

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // ===== SUCCESS =====
    return new Response(
      JSON.stringify({
        success: true,
        song_id: data.song_id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("🔥 Unexpected error:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: { message: err.message || "Internal server error" },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
