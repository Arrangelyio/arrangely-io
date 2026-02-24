import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // ✅ Gunakan Service Role untuk keamanan penuh
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // ✅ Validasi Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) throw new Error("Invalid token");
    // ✅ Validasi token user
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData?.user) throw new Error("Invalid or expired user token");
    const user = userData.user;
    // ✅ Ambil body request
    const body = await req.json();
    const { event_id, ...updateData } = body;
    if (!event_id) throw new Error("Event ID is required");
    // ✅ Verifikasi event & kepemilikan
    const { data: event, error: eventError } = await supabaseService.from("events").select("id, organizer_id").eq("id", event_id).maybeSingle();
    if (eventError) {
      console.error("Event lookup error:", eventError);
      throw new Error("Failed to fetch event data");
    }
    if (!event) throw new Error("Event not found");
    if (event.organizer_id !== user.id) {
      throw new Error("Unauthorized: You are not the organizer of this event");
    }
    // ✅ Siapkan data update
    const eventUpdate = {
      title: updateData.title,
      description: updateData.description,
      location: updateData.location,
      address: updateData.address,
      google_maps_link: updateData.google_maps_link,
      date: updateData.date,
      start_time: updateData.start_time,
      end_time: updateData.end_time,
      max_capacity: updateData.max_capacity ? Number(updateData.max_capacity) : null,
      price: updateData.price ? Number(updateData.price) : 0,
      speaker_name: updateData.speaker_name,
      speaker_bio: updateData.speaker_bio,
      speaker_image_url: updateData.speaker_image_url,
      banner_image_url: updateData.banner_image_url,
      notes: updateData.notes,
      setlist_id: updateData.setlist_id === "none" ? null : updateData.setlist_id,
      organizer_email: updateData.organizer_email,
      organizer_phone: updateData.organizer_phone,
      organizer_name: updateData.organizer_name,
      organizer_icon: updateData.organizer_icon,
      enable_max_purchase: updateData.enable_max_purchase || false,
      max_purchase: updateData.max_purchase ? Number(updateData.max_purchase) : null,
      updated_at: new Date().toISOString()
    };
    // ✅ Jalankan update
    const { data: updatedEvent, error: updateError } = await supabaseService.from("events").update(eventUpdate).eq("id", event_id).select().single();
    if (updateError) {
      console.error("Event update error:", updateError);
      throw new Error(`Failed to update event: ${updateError.message}`);
    }
    // ✅ Sukses
    return new Response(JSON.stringify({
      success: true,
      event: updatedEvent
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Internal Server Error"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
