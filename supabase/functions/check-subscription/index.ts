import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid user token");
    const user = userData.user;
    // Get all subscriptions (ordered: trialing > active > pending > expired)
    const { data: subscriptions, error: subscriptionError } = await supabaseService.from("subscriptions").select("*, subscription_plans ( name )").eq("user_id", user.id).in("status", [
      "active",
      "trialing",
      "trial_expired",
      "pending"
    ]).order("created_at", {
      ascending: false
    });
    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error("Subscription query error:", subscriptionError);
      throw new Error(`Failed to fetch subscription: ${subscriptionError.message}`);
    }
    // Prioritize trialing > active > pending > trial_expired
    const subscription = subscriptions?.find((s)=>s.status === "trialing") ?? subscriptions?.find((s)=>s.status === "active") ?? subscriptions?.find((s)=>s.status === "pending") ?? subscriptions?.find((s)=>s.status === "trial_expired");
    const { data: previousTrials } = await supabaseService.from("subscriptions").select("id, is_trial, trial_expired").eq("user_id", user.id).eq("is_trial", true);
    const now = new Date();
    const trialEnd = subscription?.trial_end ? new Date(subscription.trial_end) : null;
    const currentPeriodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
    let hasActiveSubscription = false;
    let isTrialing = false;
    if (subscription) {
      const isActive = [
        "active",
        "trialing"
      ].includes(subscription.status);
      isTrialing = subscription.is_trial && subscription.status === "trialing" && trialEnd && now < trialEnd;
      hasActiveSubscription = isActive && (!currentPeriodEnd || now < currentPeriodEnd);
    }
    // Expire trial if time is over
    if (subscription?.is_trial && trialEnd && now >= trialEnd && subscription.status === "trialing") {
      
      await supabaseService.from("subscriptions").update({
        status: "trial_expired",
        trial_expired: true
      }).eq("id", subscription.id);
      return new Response(JSON.stringify({
        hasActiveSubscription: false,
        isTrialing: false,
        trialExpired: true,
        hasUsedTrial: true,
        canStartTrial: false,
        subscription: {
          ...subscription,
          status: "trial_expired",
          trial_expired: true
        }
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    const hasUsedTrial = previousTrials && previousTrials.length > 0;
    const canStartTrial = !hasUsedTrial;
    const { data: successfulPayments } = await supabaseService.from("payments").select("id").eq("user_id", user.id).eq("status", "paid").limit(1);
    const hasSuccessfulPayment = successfulPayments && successfulPayments.length > 0;
    // Convert trialing to active if already paid
    if (hasSuccessfulPayment && subscription?.status === "trialing" && subscription.is_trial) {
      const { data: plan } = await supabaseService.from("subscription_plans").select("interval_type, interval_count").eq("id", subscription.plan_id).single();
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      if (plan) {
        if (plan.interval_type === "year") {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + plan.interval_count);
        } else {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + plan.interval_count);
        }
      }
      await supabaseService.from("subscriptions").update({
        status: "active",
        is_trial: false,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        trial_expired: false
      }).eq("id", subscription.id);
      subscription.status = "active";
      subscription.is_trial = false;
      subscription.current_period_start = currentPeriodStart.toISOString();
      subscription.current_period_end = currentPeriodEnd.toISOString();
      subscription.trial_expired = false;
    }
    // Convert pending to active if payment found
    if (hasSuccessfulPayment && subscription?.status === "pending") {
      const { data: paidPayment } = await supabaseService.from("payments").select("subscription_id").eq("user_id", user.id).eq("status", "paid").limit(1).single();
      if (paidPayment?.subscription_id) {
        const { data: plan } = await supabaseService.from("subscription_plans").select("interval_type, interval_count").eq("id", subscription.plan_id).single();
        const currentPeriodStart = new Date();
        const currentPeriodEnd = new Date(currentPeriodStart);
        if (plan) {
          if (plan.interval_type === "year") {
            currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + plan.interval_count);
          } else {
            currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + plan.interval_count);
          }
        }
        await supabaseService.from("subscriptions").update({
          status: "active",
          is_trial: false,
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          trial_expired: false
        }).eq("id", paidPayment.subscription_id);
        if (subscription.id === paidPayment.subscription_id) {
          subscription.status = "active";
          subscription.is_trial = false;
          subscription.current_period_start = currentPeriodStart.toISOString();
          subscription.current_period_end = currentPeriodEnd.toISOString();
          subscription.trial_expired = false;
        }
      }
    }
    return new Response(JSON.stringify({
      hasActiveSubscription,
      isTrialing,
      subscription,
      trialEnd: trialEnd?.toISOString(),
      nextBillingDate: currentPeriodEnd?.toISOString(),
      trialExpired: subscription?.trial_expired || false,
      hasUsedTrial,
      canStartTrial,
      hasSuccessfulPayment,
      autoPaymentEnabled: subscription?.auto_payment_enabled ?? true
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
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
