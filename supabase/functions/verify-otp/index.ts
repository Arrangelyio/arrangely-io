import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "../_shared/rate-limit.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
// 🔔 Helper untuk panggil edge function telegram-webhook
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
async function sendTelegramAlert(incident) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials not configured");
    return;
  }
  const message = `🚨 *SIGNUP ALERT* 🚨

*Status:* ${incident.status?.toUpperCase?.() || "UNKNOWN"}
*Email:* ${incident.email || "-"}
*Name:* ${incident.displayName || "-"}
*Phone:* ${incident.phoneNumber || "-"}
*Country/City:* ${incident.country || "-"} / ${incident.city || "-"}
*User ID:* ${incident.userId || "-"}
*IP Address:* \`${incident.ip_address || "Unknown"}\`
*Time:* ${new Date().toISOString()}`;
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    }
  );
  if (!res.ok) {
    console.error("Failed to send Telegram alert:", await res.text());
  } else {
    
  }
}
const handler = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  // Rate limit
  const rateLimitResult = await checkRateLimit(req, "verify-otp");
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }
  try {
    
    const { email, otp } = await req.json();
    if (!email || !otp) {
      console.error("Missing required fields:", {
        email: !!email,
        otp: !!otp,
      });
      // ❌ Kirim telegram kalau input missing
      await sendTelegramAlert({
        status: "failed",
        reason: "Missing required fields",
        email,
      });
      return new Response(
        JSON.stringify({
          error: "Email and OTP are required",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    // Init Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    // Cari OTP
    
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("email", email)
      .eq("otp_code", otp)
      .eq("is_verified", false)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (otpError || !otpRecord) {
      console.error("Invalid or expired OTP:", otpError?.message);
      // Increment attempts
      await supabase
        .from("otp_verifications")
        .update({
          attempts: supabase.raw("attempts + 1"),
        })
        .eq("email", email)
        .eq("otp_code", otp);
      // ❌ Kirim telegram kalau OTP gagal
      await sendTelegramAlert({
        status: "failed",
        reason: "Invalid or expired OTP",
        email,
        otp,
      });
      return new Response(
        JSON.stringify({
          error: "Invalid or expired OTP code",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    await supabase
      .from("otp_verifications")
      .update({
        is_verified: true,
      })
      .eq("id", otpRecord.id);
    const userData = otpRecord.user_data;
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          display_name: userData.displayName,
          phone_number: userData.phoneNumber,
          country: userData.country,
          city: userData.city,
          bio: userData.bio,
          musical_role: userData.musicalRole,
          usage_context: userData.usageContext,
          experience_level: userData.experienceLevel,
          instruments: JSON.stringify(userData.instruments),
          creator_slug: userData.creator_slug,
        },
      });
    if (authError) {
      console.error("Error creating user:", authError.message);
      // ❌ Kirim telegram kalau gagal create user
      await sendTelegramAlert({
        status: "failed",
        reason: "Auth createUser failed",
        email,
        error: authError.message,
        displayName: userData?.displayName,
        phoneNumber: userData?.phoneNumber,
        country: userData?.country,
        city: userData?.city,
      });
      if (
        authError.message.includes("already been registered") ||
        authError.message.includes("already registered") ||
        authError.message.includes("User already registered")
      ) {
        return new Response(
          JSON.stringify({
            error: "Account Already Exists",
            details:
              "An account with this email already exists. Please try signing in instead, or use a different email address.",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
      return new Response(
        JSON.stringify({
          error: "Failed to create user account",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    // ✅ Kirim telegram kalau sukses
    await sendTelegramAlert({
      status: "success",
      email,
      userId: authData.user?.id,
      displayName: userData.displayName,
      phoneNumber: userData.phoneNumber,
      country: userData.country,
      city: userData.city,
      usageContext: userData.usageContext,
      instruments: userData.instruments,
    });
    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        is_onboarded: true,
        creator_slug: userData.creator_slug,
      })
      .eq("user_id", authData.user?.id);
    if (profileError)
      console.error(
        "Error updating profile onboarding status:",
        profileError.message
      );
    await supabase.from("otp_verifications").delete().eq("id", otpRecord.id);
    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created successfully",
        user: authData.user,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in verify-otp function:", error);
    // ❌ Kirim telegram kalau ada error besar
    await notifyTelegram({
      status: "failed",
      reason: "Internal error",
      error: error.message,
    });
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};
serve(handler);
