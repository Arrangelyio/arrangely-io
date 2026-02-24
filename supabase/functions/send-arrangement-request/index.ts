import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { title, artist, youtube_link, user_email } = await req.json();
    console.log("Sending arrangement request email for:", {
      title,
      artist
    });

    // Validate required fields
    if (!title || !artist) {
      throw new Error("Title and artist are required");
    }

    // Use Mailgun HTTP API instead of SMTP
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = "mg.arrangely.io";

    if (!MAILGUN_API_KEY) {
      throw new Error("MAILGUN_API_KEY not configured");
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Arrangement Request</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Song Title:</strong> ${title}</p>
          <p style="margin: 10px 0;"><strong>Artist:</strong> ${artist}</p>
          ${youtube_link ? `<p style="margin: 10px 0;"><strong>YouTube Link:</strong> <a href="${youtube_link}" target="_blank">${youtube_link}</a></p>` : ''}
          ${user_email ? `<p style="margin: 10px 0;"><strong>Requested by:</strong> ${user_email}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 14px;">This request was submitted through the Arrangely Browse page.</p>
      </div>
    `;

    const formData = new FormData();
    formData.append("from", "Arrangely <info@arrangely.io>");
    formData.append("to", "arrangely.io@gmail.com");
    formData.append("subject", `New Arrangement Request: ${title} by ${artist}`);
    formData.append("html", emailHtml);

    const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun API error:", errorText);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    
    return new Response(JSON.stringify({
      success: true,
      message: "Request sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-arrangement-request function:", error);
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
};

serve(handler);
