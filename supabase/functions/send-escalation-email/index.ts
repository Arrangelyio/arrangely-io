import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    if (!bodyText) {
      return new Response(JSON.stringify({ error: "Missing request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { conversationId, userEmail, userName, conversationTitle } = JSON.parse(bodyText);

    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = "mg.arrangely.io";

    if (!MAILGUN_API_KEY) {
      throw new Error("MAILGUN_API_KEY not configured");
    }

    const formData = new FormData();
    formData.append("from", "Arrangely Support <info@arrangely.io>");
    formData.append("to", "admin@arrangely.io");
    formData.append("subject", `🚨 Chat Escalation: ${conversationTitle}`);
    formData.append("html", `
      <h2>Chat Escalation Notification</h2>
      <p>User: ${userName} (${userEmail})</p>
      <p>Conversation ID: ${conversationId}</p>
      <a href="https://arrangely.io/admin/chat">View in Admin Dashboard</a>
    `);

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Email send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
