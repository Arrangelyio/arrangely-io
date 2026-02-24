import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // 🔐 Authorization (Sama)
    // ... (kode otorisasi user tetap sama) ...
    const authHeader = req.headers.get("authorization");
    let currentUserId = null;
    let userRole = null;
    let creatorType = null;
    let isInternal = false;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      if (user) {
        currentUserId = user.id;
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("role, creator_type, is_internal")
          .eq("user_id", user.id)
          .single();

        userRole = profile?.role;
        creatorType = profile?.creator_type;
        isInternal = profile?.is_internal || false;
      }
    }
    // 🚫 Restrict access (Sama)
    const canAccess =
      userRole === "admin" ||
      userRole === "support_admin" ||
      (userRole === "creator" && creatorType === "creator_arrangely") ||
      (userRole === "creator" && creatorType === "creator_pro" && isInternal);

    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Access denied." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    // 🧭 Fetch request_arrangements (Fetch Awal)
    let { data: requests, error: requestError } = await supabaseClient.from("request_arrangements").select("*").order("created_at", {
      ascending: true
    });
    if (requestError) throw requestError;
    // 🎯 Filter for creators (Filter di Javascript)
    if (userRole === "creator" && creatorType === "creator_arrangely") {
      requests = requests.filter((r) => !r.assigned_to || r.assigned_to === currentUserId);
    }
    // 🧩 Collect relevant user_ids (requester dan assigned_to)
    const userIdsToFetch = [
      ...new Set([
        ...requests.map((r) => r.user_id).filter(Boolean),
        ...requests.map((r) => r.assigned_to).filter(Boolean)
      ])
    ];
    // 👥 Fetch related profiles (Fetch Terpisah dengan Filter)
    let profiles = [];
    if (userIdsToFetch.length > 0) {
      const { data: profileData, error: profileError } = await supabaseClient.from("profiles").select("user_id, display_name").in("user_id", userIdsToFetch); // <-- Tambahkan filter .in()
      if (profileError) throw profileError;
      profiles = profileData || [];
    }
    // 🎵 Fetch assigned songs safely (Fetch Terpisah)
    const songIds = requests.map((r) => r.assigned_song_id).filter((id) => id && typeof id === "string"); // <-- Pastikan pakai assigned_song_id
    let songs = [];
    if (songIds.length > 0) {
      const { data: songData, error: songError } = await supabaseClient.from("songs").select("id, title, artist, slug").in("id", songIds);
      if (songError) throw songError;
      songs = songData || [];
    }
    // 📧 Combine all data (Penggabungan Manual di Javascript)
    const requestsWithDetails = await Promise.all((requests || []).map(async (req) => {
      // Get requester email
      let requesterEmail = "Unknown";
      try {
        const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(req.user_id);
        if (!userError && user?.email) {
          requesterEmail = user.email;
        } else if (userError) {
          console.error(`Error fetching email for user ${req.user_id}:`, userError.message);
        }
      } catch (e) {
        console.error(`Exception fetching email for user ${req.user_id}:`, e.message);
        requesterEmail = "Unknown/Error";
      }
      // Cari manual profile & song di array hasil fetch terpisah
      const requesterProfile = profiles.find((p) => p.user_id === req.user_id);
      const assignedProfile = profiles.find((p) => p.user_id === req.assigned_to); // <<< Pencarian manual
      const assignedSong = songs.find((s) => s.id === req.assigned_song_id);
      return {
        ...req,
        requester_name: requesterProfile?.display_name || null,
        assigned_creator_name: assignedProfile ? assignedProfile.display_name : null,
        requester_email: requesterEmail,
        assigned_song: assignedSong ? {
          id: assignedSong.id,
          title: assignedSong.title,
          artist: assignedSong.artist,
          slug: assignedSong.slug
        } : null
      };
    }));
    console.log("Returning", requestsWithDetails.length, "requests");
    return new Response(JSON.stringify({
      data: requestsWithDetails
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error fetching request arrangements:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
