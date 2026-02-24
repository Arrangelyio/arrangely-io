import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, 'charge-recurring-gopay', authHeader);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }

  try {
    
    
    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Get authenticated user
    const token = authHeader?.replace("Bearer ", "") || "";
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { amount, subscription_id, description } = await req.json();
    
    if (!amount || !subscription_id) {
      throw new Error("Amount and subscription_id are required");
    }

    // Create service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "", 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", 
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Get linked GoPay account for this user
    const { data: linkedAccount, error: accountError } = await supabaseService
      .from("linked_payment_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("payment_method", "gopay")
      .eq("status", "active")
      .single();

    if (accountError || !linkedAccount) {
      console.error("No active GoPay account found:", accountError);
      throw new Error("No active GoPay account found. Please link your GoPay account first.");
    }

    

    // Generate unique order ID for charge
    const orderId = `gopay-charge-${Date.now()}-${user.id.substring(0, 6)}`;
    

    // Determine environment
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let environment = "staging";
    const hostname = new URL(origin).hostname;
    
    if (hostname === "arrangely.io") {
      environment = "production";
    } else if (hostname === "staging.arrangely.io") {
      environment = "staging";
    }

    const midtransServerKey = environment === "production" 
      ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY") 
      : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");

    if (!midtransServerKey) {
      throw new Error(`Midtrans ${environment} server key not configured`);
    }

    // Prepare charge data
    const chargeData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.display_name || "User"
      },
      item_details: [
        {
          id: "subscription",
          price: amount,
          quantity: 1,
          name: description || "Subscription Payment"
        }
      ]
    };

    // Call Midtrans Core API to charge the linked account
    const chargeUrl = environment === "production" 
      ? `https://api.midtrans.com/v2/pay/account/${linkedAccount.account_id}/charge`
      : `https://api.sandbox.midtrans.com/v2/pay/account/${linkedAccount.account_id}/charge`;
    
    
    
    const chargeResponse = await fetch(chargeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(midtransServerKey + ":")}`
      },
      body: JSON.stringify(chargeData)
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      console.error("Midtrans charge error:", errorText);
      
      // Store failed attempt
      await supabaseService.from("recurring_payment_attempts").insert({
        user_id: user.id,
        linked_account_id: linkedAccount.id,
        subscription_id: subscription_id,
        amount: amount,
        status: "failed",
        error_message: errorText,
        midtrans_order_id: orderId,
        is_production: environment === "production"
      });

      throw new Error(`Failed to charge GoPay account: ${errorText}`);
    }

    const chargeResult = await chargeResponse.json();
    

    // Store successful payment attempt
    const { error: attemptError } = await supabaseService.from("recurring_payment_attempts").insert({
      user_id: user.id,
      linked_account_id: linkedAccount.id,
      subscription_id: subscription_id,
      amount: amount,
      status: chargeResult.transaction_status || "pending",
      midtrans_order_id: orderId,
      midtrans_transaction_id: chargeResult.transaction_id,
      is_production: environment === "production"
    });

    if (attemptError) {
      console.error("Failed to store payment attempt:", attemptError);
    }

    // Also create payment record
    const { error: paymentError } = await supabaseService.from("payments").insert({
      user_id: user.id,
      subscription_id: subscription_id,
      midtrans_order_id: orderId,
      midtrans_transaction_id: chargeResult.transaction_id,
      amount: amount,
      status: chargeResult.transaction_status === "settlement" ? "paid" : "pending",
      payment_method: "gopay_recurring",
      currency: "IDR",
      is_production: environment === "production"
    });

    if (paymentError) {
      console.error("Failed to store payment record:", paymentError);
    }

    // Update last charge time for linked account
    await supabaseService
      .from("linked_payment_accounts")
      .update({
        last_charge_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", linkedAccount.id);

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      transaction_id: chargeResult.transaction_id,
      status: chargeResult.transaction_status,
      amount: amount,
      message: "GoPay recurring charge completed successfully"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error) {
    console.error("Error in charge-recurring-gopay:", error);
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