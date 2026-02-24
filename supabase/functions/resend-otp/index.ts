// deno run --allow-net --allow-env --allow-read
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyTurnstileToken } from "../_shared/turnstile-verify.ts";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // service role untuk bisa update
const supabase = createClient(supabaseUrl, supabaseKey);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { email, displayName, turnstileToken } = await req.json();
    // Verify Turnstile token first
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const turnstileResult = await verifyTurnstileToken(req, turnstileToken, clientIp);
    if (!turnstileResult.success) {
      console.error("Turnstile verification failed:", turnstileResult.error);
      return new Response(JSON.stringify({
        error: turnstileResult.error || "Captcha verification failed"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    if (!email) {
      return new Response(JSON.stringify({
        error: "Missing email"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // generate OTP baru
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // update record OTP
    const { error: updateError } = await supabase.from("otp_verifications").update({
      otp_code: otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0
    }).eq("email", email).eq("is_verified", false);
    if (updateError) {
      return new Response(JSON.stringify({
        error: "Failed to update OTP"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // kirim OTP baru via email (invoke fungsi email)
    const { error: emailError } = await supabase.functions.invoke("send-otp-email", {
      body: {
        email,
        otp,
        displayName
      }
    });
    if (emailError) {
      return new Response(JSON.stringify({
        error: "Failed to send OTP email"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "OTP sent"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
