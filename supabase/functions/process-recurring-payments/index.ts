import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    
    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current timestamp
    const now = new Date().toISOString();

    // Find linked accounts that need to be charged
    const { data: accountsToCharge, error: accountsError } = await supabaseService
      .from("linked_payment_accounts")
      .select(`
        *,
        subscriptions!inner(
          id,
          plan_id,
          status,
          subscription_plans(price, name)
        )
      `)
      .eq("status", "linked")
      .lte("next_charge_at", now);

    if (accountsError) {
      throw new Error(`Error fetching accounts to charge: ${accountsError.message}`);
    }

    

    if (!accountsToCharge || accountsToCharge.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No accounts to charge at this time",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // Determine environment and get appropriate Midtrans keys
    const environment = "production"; // Always use production for cron jobs
    const midtransServerKey = Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY");
    
    if (!midtransServerKey) {
      throw new Error("Midtrans production server key not configured");
    }

    let successCount = 0;
    let failCount = 0;

    // Process each account
    for (const account of accountsToCharge) {
      try {
        
        
        const subscription = account.subscriptions[0];
        const plan = subscription.subscription_plans;
        const amount = plan.price;

        // Generate unique order ID for recurring payment
        const orderId = `recurring-${Date.now()}-${account.id.substring(0, 8)}`;

        // Create payment attempt record
        const { data: paymentAttempt, error: attemptError } = await supabaseService
          .from("recurring_payment_attempts")
          .insert({
            linked_account_id: account.id,
            user_id: account.user_id,
            subscription_id: subscription.id,
            amount: amount,
            status: "pending",
            midtrans_order_id: orderId,
            is_production: true
          })
          .select()
          .single();

        if (attemptError) {
          console.error(`Error creating payment attempt for account ${account.id}:`, attemptError);
          failCount++;
          continue;
        }

        // Create Midtrans charge request
        let chargeResponse;
        
        if (account.payment_method === "gopay") {
          // Charge GoPay account
          chargeResponse = await fetch("https://api.midtrans.com/v2/charge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${btoa(midtransServerKey + ":")}`
            },
            body: JSON.stringify({
              payment_type: "gopay",
              transaction_details: {
                order_id: orderId,
                gross_amount: amount
              },
              gopay: {
                account_id: account.account_id
              },
              customer_details: {
                email: account.user_id // Will be replaced with actual email from auth
              }
            })
          });
        } else if (account.payment_method === "credit_card") {
          // Charge saved credit card
          chargeResponse = await fetch("https://api.midtrans.com/v2/charge", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${btoa(midtransServerKey + ":")}`
            },
            body: JSON.stringify({
              payment_type: "credit_card",
              transaction_details: {
                order_id: orderId,
                gross_amount: amount
              },
              credit_card: {
                saved_token_id: account.account_id
              },
              customer_details: {
                email: account.user_id // Will be replaced with actual email from auth
              }
            })
          });
        }

        if (!chargeResponse || !chargeResponse.ok) {
          const errorText = await chargeResponse?.text() || "Unknown error";
          throw new Error(`Midtrans charge failed: ${errorText}`);
        }

        const chargeResult = await chargeResponse.json();
        

        // Update payment attempt with result
        const status = chargeResult.transaction_status === "settlement" || 
                      chargeResult.transaction_status === "capture" ? "success" : 
                      chargeResult.transaction_status === "pending" ? "pending" : "failed";

        await supabaseService
          .from("recurring_payment_attempts")
          .update({
            status: status,
            midtrans_transaction_id: chargeResult.transaction_id,
            completed_at: new Date().toISOString(),
            error_message: status === "failed" ? chargeResult.status_message : null
          })
          .eq("id", paymentAttempt.id);

        if (status === "success") {
          // Update linked account's last charge time and next charge time
          const nextChargeAt = new Date();
          nextChargeAt.setMonth(nextChargeAt.getMonth() + 1);

          await supabaseService
            .from("linked_payment_accounts")
            .update({
              last_charge_at: new Date().toISOString(),
              next_charge_at: nextChargeAt.toISOString()
            })
            .eq("id", account.id);

          // Update subscription period
          const currentPeriodEnd = new Date();
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

          await supabaseService
            .from("subscriptions")
            .update({
              current_period_start: new Date().toISOString(),
              current_period_end: currentPeriodEnd.toISOString()
            })
            .eq("id", subscription.id);

          successCount++;
          

        } else if (status === "failed") {
          // Mark account as revoked after failed payment
          await supabaseService
            .from("linked_payment_accounts")
            .update({ status: "revoked" })
            .eq("id", account.id);

          // Cancel subscription
          await supabaseService
            .from("subscriptions")
            .update({ status: "cancelled" })
            .eq("id", subscription.id);

          failCount++;
          
        }

      } catch (error: any) {
        console.error(`Error processing account ${account.id}:`, error);
        failCount++;

        // Update payment attempt with error
        await supabaseService
          .from("recurring_payment_attempts")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq("linked_account_id", account.id)
          .eq("status", "pending");
      }
    }

    

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Recurring payments processed",
      processed: accountsToCharge.length,
      success_count: successCount,
      fail_count: failCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Error in process-recurring-payments:", error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
};

serve(handler);