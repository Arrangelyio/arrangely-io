import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

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

  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, 'start-free-trial', authHeader);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }
  try {
    const { planId } = await req.json();
    // Create Supabase client with service role key to bypass RLS
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "No authorization header provided"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 401
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({
        error: "Invalid user token or user not found"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 401
      });
    }
    const user = userData.user;
    // Check if user already has an active subscription or trial
    const { data: existingSubscription } = await supabaseService.from("subscriptions").select("*").eq("user_id", user.id).in("status", [
      "active",
      "trialing"
    ]).single();
    if (existingSubscription) {
      return new Response(JSON.stringify({
        error: "User already has an active subscription or trial",
        subscription: existingSubscription
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    // Calculate trial dates (7 days from now)
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    // Create new trial subscription
    const { data: newSubscription, error: subscriptionError } = await supabaseService.from("subscriptions").insert({
      user_id: user.id,
      status: "trialing",
      is_trial: true,
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: trialStart.toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      plan_id: planId
    }).select().single();
    if (subscriptionError) {
      throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
    }
    return new Response(JSON.stringify({
      success: true,
      subscription: newSubscription,
      trial_end: trialEnd.toISOString(),
      message: "7-day free trial started successfully!"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error starting trial:", error);
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
});
