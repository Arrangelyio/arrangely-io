import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, "create-midtrans-subscription", authHeader);
  if (!rateLimitResult.allowed) return createRateLimitResponse(rateLimitResult.retryAfter);
  try {
    
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const token = authHeader?.replace("Bearer ", "") || "";
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    const { plan_id, payment_method, saved_token_id, account_id } = await req.json();
    if (!plan_id || !payment_method) return new Response(JSON.stringify({
      error: "plan_id and payment_method are required"
    }), {
      headers: corsHeaders,
      status: 400
    });
    if (payment_method === "credit_card" && !saved_token_id) return new Response(JSON.stringify({
      error: "CARD_TOKEN_REQUIRED",
      message: "saved_token_id is required for credit card subscriptions"
    }), {
      headers: corsHeaders,
      status: 400
    });
    if (payment_method === "gopay" && !account_id) return new Response(JSON.stringify({
      error: "GOPAY_LINK_REQUIRED",
      message: "account_id is required for GoPay subscriptions (link account first)"
    }), {
      headers: corsHeaders,
      status: 400
    });
    // 🌍 Environment check
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let environment = "staging";
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === "arrangely.io") environment = "production";
      else if (hostname === "staging.arrangely.io") environment = "staging";
    } catch  {
      environment = "staging";
    }
    const midtransServerKey = environment === "production" ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY") : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
    if (!midtransServerKey) throw new Error(`Midtrans ${environment} server key not configured`);
    // ✅ GoPay account verification
    let gopayToken = "";
    if (payment_method === "gopay" && account_id) {
      
      const getPayAccountUrl = environment === "production" ? `https://api.midtrans.com/v2/pay/account/${account_id}` : `https://api.sandbox.midtrans.com/v2/pay/account/${account_id}`;
      const accountResponse = await fetch(getPayAccountUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${btoa(midtransServerKey + ":")}`
        }
      });
      const accountData = await accountResponse.json();
      
      if (accountData.account_status !== "ENABLED") {
        return new Response(JSON.stringify({
          error: "GOPAY_ACCOUNT_NOT_ENABLED",
          message: `GoPay account is ${accountData.account_status}. Please complete linking in your GoPay app.`
        }), {
          headers: corsHeaders,
          status: 400
        });
      }
      const gopayWallet = accountData.metadata?.payment_options?.find((opt)=>opt.name === "GOPAY_WALLET" && opt.active);
      if (!gopayWallet?.token) throw new Error("GoPay account enabled but no GOPAY_WALLET token found");
      gopayToken = gopayWallet.token;
    }
    // 🔗 DB client
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // 🧾 Subscription plan
    const { data: plan, error: planError } = await supabaseService.from("subscription_plans").select("*").eq("id", plan_id).single();
    if (planError || !plan) throw new Error("Invalid subscription plan");
    
    // 🗓 Midtrans schedule config
    const now = new Date();
    const startTime = new Date(Date.now() + 10 * 1000); // langsung sekarang
    let intervalValue = 1;
    let intervalUnit = "month";
    if (plan.interval_type === "year") {
      intervalValue = 12;
      intervalUnit = "month";
    } else if (plan.interval_type === "month") {
      intervalValue = 1;
      intervalUnit = "month";
    } else if (plan.interval_type === "week") {
      intervalValue = 1;
      intervalUnit = "week";
    } else if (plan.interval_type === "day") {
      intervalValue = 1;
      intervalUnit = "day";
    }
    // 🧮 Calculate current_period_end dynamically
    const currentPeriodEnd = new Date(startTime);
    switch(intervalUnit){
      case "day":
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + intervalValue);
        break;
      case "week":
        currentPeriodEnd.setDate(currentPeriodEnd.getDate() + intervalValue * 7);
        break;
      case "month":
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalValue);
        break;
      default:
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }
    const formatMidtransDate = (date)=>{
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const offsetMinutes = -date.getTimezoneOffset();
      const sign = offsetMinutes >= 0 ? "+" : "-";
      const abs = Math.abs(offsetMinutes);
      const offH = String(Math.floor(abs / 60)).padStart(2, "0");
      const offM = String(abs % 60).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${sign}${offH}${offM}`;
    };
    const subscriptionName = `sub_${user.id.substring(0, 8)}_${plan.name.replace(/[^a-zA-Z0-9\-_.~]/g, "_").substring(0, 20)}`;
    const subscriptionData = {
      name: subscriptionName,
      amount: plan.price.toString(),
      currency: "IDR",
      payment_type: payment_method,
      schedule: {
        interval: intervalValue,
        interval_unit: intervalUnit,
        max_interval: 0,
        start_time: formatMidtransDate(startTime)
      },
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.display_name || "User",
        phone: user.user_metadata?.phone || ""
      },
      metadata: {
        user_id: user.id,
        plan_id,
        environment
      }
    };
    if (payment_method === "credit_card") subscriptionData.token = saved_token_id;
    if (payment_method === "gopay") {
      subscriptionData.token = gopayToken;
      subscriptionData.gopay = {
        account_id
      };
    }
    
    const midtransApiUrl = environment === "production" ? "https://api.midtrans.com/v1/subscriptions" : "https://api.sandbox.midtrans.com/v1/subscriptions";
    const subscriptionResponse = await fetch(midtransApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(midtransServerKey + ":")}`
      },
      body: JSON.stringify(subscriptionData)
    });
    const resultText = await subscriptionResponse.text();
    
    if (!subscriptionResponse.ok) throw new Error(`Failed to create Midtrans subscription: ${resultText}`);
    const subscriptionResult = JSON.parse(resultText);
    // ✅ Save to DB
    const { data: subscription, error: subscriptionError } = await supabaseService.from("subscriptions").insert({
      user_id: user.id,
      plan_id,
      status: "pending",
      current_period_start: now.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      next_billing_date: startTime.toISOString(),
      midtrans_subscription_id: subscriptionResult.id
    }).select().single();
    if (subscriptionError) throw new Error(subscriptionError.message);
    return new Response(JSON.stringify({
      success: true,
      subscription_id: subscription.id,
      midtrans_subscription_id: subscriptionResult.id,
      status: subscriptionResult.status,
      next_billing_date: startTime.toISOString(),
      current_period_end: currentPeriodEnd.toISOString()
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error in create-midtrans-subscription:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
};
serve(handler);
