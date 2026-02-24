import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    
    
    
    const bodyText = await req.text();
    const { email } = JSON.parse(bodyText);
    
    if (!email) {
      console.error("Missing required field: email");
      return new Response(JSON.stringify({
        error: "Email is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists using RPC
    const { data: authUser, error } = await supabase.rpc("get_user_by_email", {
      target_email: email
    });

    if (error) {
      throw error;
    }

    // Generate secure 6-digit token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up any existing reset tokens for this email
    const { error: cleanupError } = await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", email)
      .eq("is_production", true);

    if (cleanupError) {
      console.error("Error cleaning up old reset tokens:", cleanupError);
      // Continue anyway - this is not critical
    }

    // Store the reset token in database
    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        email: email,
        token: resetToken,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        is_used: false,
        attempts: 0,
        is_production: true
      });

    if (tokenError) {
      console.error("Error storing reset token:", tokenError);
      throw new Error("Failed to create password reset token");
    }

    // Get user profile for personalization
    const { data: profileData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", authUser.id)
      .single();

    const displayName = profileData?.display_name || "User";

    // Configure SMTP client for Mailgun
    const client = new SmtpClient();
    
    await client.connectTLS({
      hostname: "smtp.mailgun.org",
      port: 587,
      username: "info@mg.arrangely.io",
      password: Deno.env.get("SMTP_MAILGUN_PASSWORD") || "",
    });

    const resetUrl = `${Deno.env.get("SUPABASE_URL")?.replace("//", "//app.")}/auth?mode=reset&token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin: 0;">Arrangely</h1>
        </div>

        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; text-align: center;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">
            Reset Your Password 🔐
          </h2>

          <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;">
            Hi ${displayName}! We received a request to reset your password. Use the code below or click the reset link.
          </p>

          <div style="background: white; border: 2px solid #6366f1; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px;">
              ${resetToken}
            </span>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This code expires in 15 minutes for security purposes.
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 Arrangely. Create beautiful song arrangements with ease.</p>
        </div>
      </div>
    `;

    await client.send({
      from: "info@arrangely.io",
      to: email,
      subject: "Reset Your Arrangely Password",
      content: htmlContent,
      html: htmlContent,
    });

    await client.close();

    

    return new Response(JSON.stringify({
      success: true,
      message: "If the email exists in our system, a password reset link has been sent."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-password-reset-email function:", error);
    return new Response(JSON.stringify({
      error: "Failed to send password reset email",
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
