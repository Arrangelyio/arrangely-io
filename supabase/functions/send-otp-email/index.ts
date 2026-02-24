import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    
    const bodyText = await req.text();
    const { email, otp, displayName } = JSON.parse(bodyText);
    
    if (!email || !otp) {
      console.error("Missing required fields:", {
        email: !!email,
        otp: !!otp
      });
      return new Response(JSON.stringify({
        error: "Email and OTP are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // ✅ Configure SMTP client with Mailgun
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: "smtp.mailgun.org",
      port: 587,
      username: "info@mg.arrangely.io",
      password: Deno.env.get("SMTP_MAILGUN_PASSWORD") || "",
    });
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0;">Arrangely</h1>
        </div>

        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">
            Welcome${displayName ? ` ${displayName}` : ''}! 🎵
          </h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
            Enter this verification code to complete your registration:
          </p>

          <div style="background: white; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">
              ${otp}
            </span>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This code expires in 10 minutes for security purposes.
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 Arrangely. Create beautiful song arrangements with ease.</p>
        </div>
      </div>
    `;
    
    await client.send({
      from: "Arrangely <info@arrangely.io>",
      to: email,
      subject: "Your Arrangely Verification Code",
      content: "text/html",
      html: htmlContent,
    });
    
    await client.close();
    
    
    return new Response(JSON.stringify({
      success: true,
      message: "OTP sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-otp-email function:", error);
    return new Response(JSON.stringify({
      error: "Failed to send OTP email",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
