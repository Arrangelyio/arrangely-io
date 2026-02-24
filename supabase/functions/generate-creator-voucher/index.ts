import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const environment = Deno.env.get("ENVIRONMENT") || "development";
    const isProduction = environment === "production";

    // Get auth header and validate admin or the user themselves
    const authHeader = req.headers.get("Authorization");
    let targetUserId: string | null = null;
    
    const body = await req.json().catch(() => ({}));
    
    if (body.userId) {
      // Admin calling for specific user
      targetUserId = body.userId;
    } else if (authHeader) {
      // User calling for themselves
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseService.auth.getUser(token);
      targetUserId = userData?.user?.id || null;
    }

    if (!targetUserId) {
      throw new Error("No user ID provided");
    }

    // Get user's profile and subscription
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("display_name, creator_type")
      .eq("user_id", targetUserId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.creator_type !== "creator_pro") {
      throw new Error("User is not a creator_pro");
    }

    // Get active subscription to determine billing cycle
    const { data: subscription } = await supabaseService
      .from("subscriptions")
      .select("*, subscription_plans(*)")
      .eq("user_id", targetUserId)
      .eq("status", "active")
      .single();

    if (!subscription) {
      throw new Error("No active subscription found");
    }

    const intervalType = subscription.subscription_plans?.interval_type || "month";
    const displayName = profile.display_name || "USER";
    const nameParts = displayName.toUpperCase().replace(/[^A-Z\s]/g, "").split(/\s+/).filter(Boolean);

    if (nameParts.length === 0) {
      throw new Error("No valid name parts for voucher generation");
    }

    // Determine suffix and discount based on interval type
    const suffix = intervalType === "year" ? "25Y" : "25M";
    const discountType = intervalType === "year" ? "fixed" : "percentage";
    const discountValue = intervalType === "year" ? 25000 : 25;
    const billingCycle = intervalType === "year" ? "yearly" : "monthly";

    // Check if user already has a voucher for this billing cycle
    const { data: existingAssignment } = await supabaseService
      .from("discount_code_assignments")
      .select("id, discount_codes!inner(code, billing_cycle)")
      .eq("creator_id", targetUserId)
      .eq("discount_codes.billing_cycle", billingCycle)
      .eq("is_production", isProduction)
      .maybeSingle();

    if (existingAssignment) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Voucher already exists",
          code: existingAssignment.discount_codes?.code,
          alreadyExists: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique code
    let baseCode = nameParts[0];
    let code = `${baseCode}${suffix}`;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseService
        .from("discount_codes")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (!existing) {
        break;
      }

      attempts++;
      if (nameParts.length > 1 && attempts <= nameParts.length) {
        const additionalChars = nameParts.slice(1, attempts + 1)
          .map(part => part.substring(0, 3))
          .join("");
        baseCode = nameParts[0] + additionalChars;
      } else {
        baseCode = nameParts[0] + Math.floor(Math.random() * 999).toString().padStart(3, "0");
      }
      code = `${baseCode}${suffix}`;
    }

    // Create the discount code
    const { data: newCode, error: codeError } = await supabaseService
      .from("discount_codes")
      .insert({
        code,
        discount_type: discountType,
        discount_value: discountValue,
        billing_cycle: billingCycle,
        is_active: true,
        is_production: isProduction,
        max_uses: null,
        is_new_customer: false,
      })
      .select("id")
      .single();

    if (codeError) {
      console.error("Failed to create discount code:", codeError);
      throw new Error("Failed to create discount code");
    }

    // Assign the code to the creator
    const { error: assignError } = await supabaseService
      .from("discount_code_assignments")
      .insert({
        creator_id: targetUserId,
        discount_code_id: newCode.id,
        is_production: isProduction,
      });

    if (assignError) {
      console.error("Failed to assign discount code:", assignError);
      throw new Error("Failed to assign discount code");
    }

    console.log(`✅ Created voucher code ${code} for creator ${targetUserId} (${billingCycle})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Voucher created successfully",
        code,
        discountType,
        discountValue,
        billingCycle,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-creator-voucher:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
