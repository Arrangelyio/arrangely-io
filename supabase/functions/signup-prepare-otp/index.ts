// deno run --allow-net --allow-env --allow-read
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyTurnstileToken } from "../_shared/turnstile-verify.ts";
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // penting: pakai service role
const supabase = createClient(supabaseUrl, supabaseKey);
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
    const { email, password, displayName, phoneNumber, country, city, bio, musicalRole, usageContext, experienceLevel, instruments, turnstileToken } = await req.json();
    // Verify Turnstile token first
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
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
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        status: 400
      });
    }
    const { data: existingProfile, error: profileCheckError } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (profileCheckError) {
      console.error("Error checking existing profile:", profileCheckError);
    }
    if (existingProfile) {
      return new Response(JSON.stringify({
        error: "Email already registered",
        message: "This email is already associated with an existing profile."
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // bersihkan OTP lama
    await supabase.from("otp_verifications").delete().eq("email", email);
    // simpan OTP baru
    const { error: otpError } = await supabase.from("otp_verifications").insert({
      email,
      otp_code: otp,
      user_data: {
        password,
        displayName,
        phoneNumber,
        country,
        city,
        bio,
        musicalRole,
        usageContext,
        experienceLevel,
        instruments
      },
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    if (otpError) {
      return new Response(JSON.stringify({
        error: otpError.message
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // kirim OTP email (invoke fungsi lain misalnya send-otp-email)
    await supabase.functions.invoke("send-otp-email", {
      body: {
        email,
        otp,
        displayName
      }
    });
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
      status: 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
