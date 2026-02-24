import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
async function fetchAllAuthUsers(supabase) {
  const { data, error } = await supabase.rpc("get_admin_users_with_emails"); // panggil function di Postgres
  if (error) {
    throw new Error(`Error fetching auth users: ${error.message}`);
  }
  return data ?? [];
}
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { filter } = body;
    if (!filter) {
      return new Response(JSON.stringify({
        error: "Missing required field: filter"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Init Supabase client pakai Service Role Key
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let recipients = [];
    let allAuthUsers = [];
    // Ambil semua user Auth kalau perlu
    if ([
      "creators",
      "unsubscribed",
      "all_users"
    ].includes(filter)) {
      allAuthUsers = await fetchAllAuthUsers(supabase);
    }
    switch(filter){
      case "creators":
        {
          const { data: creators, error } = await supabase.rpc("get_creators_with_emails");
          if (error) throw error;
          recipients = (creators ?? []).map((c)=>({
              id: c.user_id,
              email: c.email,
              display_name: c.display_name ?? c.email ?? "Unknown",
              role: c.role
            })).filter((r)=>!!r.email);
          break;
        }
      case "event_registered":
        {
          const { data: eventUsers, error } = await supabase.from("event_registrations").select("user_id, attendee_email, attendee_name").eq("status", "confirmed");
          if (error) throw error;
          const unique = new Map();
          (eventUsers ?? []).forEach((reg)=>{
            if (!unique.has(reg.user_id)) {
              unique.set(reg.user_id, {
                id: reg.user_id,
                email: reg.attendee_email ?? "",
                display_name: reg.attendee_name ?? reg.attendee_email ?? "Unknown"
              });
            }
          });
          recipients = Array.from(unique.values()).filter((r)=>!!r.email);
          break;
        }
      case "unsubscribed":
        {
          const { data, error } = await supabase.rpc("get_unsubscribed_user_ids");
          if (error) throw error;
          recipients = (data ?? []).map((u)=>({
              id: u.user_id,
              email: u.email ?? "",
              display_name: u.email ?? "Unknown"
            }));
          break;
        }
      case "all_users":
        {
          const { data: profiles, error } = await supabase.from("profiles").select("user_id, display_name, role");
          if (error) throw error;
          recipients = (allAuthUsers ?? []).map((u)=>{
            const p = (profiles ?? []).find((pr)=>pr.user_id === u.id);
            return {
              id: u.profile_id,
              email: u.email ?? "",
              display_name: p?.display_name ?? u.email ?? "Unknown",
              role: p?.role
            };
          }).filter((r)=>!!r.email);
          break;
        }
    }
    return new Response(JSON.stringify({
      recipients
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    console.error("Error in fetch-recipients:", err);
    return new Response(JSON.stringify({
      error: err.message ?? "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
