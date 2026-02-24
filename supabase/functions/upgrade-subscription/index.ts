import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, 'upgrade-subscription', authHeader);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }

  try {
    // Create Supabase client with service role key to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Invalid user token");
    }

    const user = userData.user;

    // Get request body
    const { newPlanId } = await req.json();
    if (!newPlanId) {
      throw new Error("No plan ID provided");
    }

    

    // Get current subscription
    const { data: currentSubscription, error: subError } = await supabaseService
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (subError || !currentSubscription) {
      throw new Error("No active subscription found");
    }

    // Get the new plan details
    const { data: newPlan, error: planError } = await supabaseService
      .from("subscription_plans")
      .select("*")
      .eq("id", newPlanId)
      .single();

    if (planError || !newPlan) {
      throw new Error("Invalid plan ID");
    }

    

    // Calculate new subscription period based on new plan
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    
    if (newPlan.interval_type === "year") {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + newPlan.interval_count);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + newPlan.interval_count);
    }

    console.log("New subscription period:", {
      start: currentPeriodStart.toISOString(),
      end: currentPeriodEnd.toISOString(),
      interval: newPlan.interval_type
    });

    // Update the current subscription with new plan and dates
    const { error: updateError } = await supabaseService
      .from("subscriptions")
      .update({
        plan_id: newPlanId,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", currentSubscription.id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      throw new Error(`Failed to upgrade subscription: ${updateError.message}`);
    }

    

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription upgraded successfully",
        newPlan: newPlan.name,
        newPeriodEnd: currentPeriodEnd.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in upgrade-subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});