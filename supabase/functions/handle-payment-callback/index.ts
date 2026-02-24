import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, 'handle-payment-callback', authHeader);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }

  try {
    
    
    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get callback data from request body
    const callbackData = await req.json();
    

    const { order_id, transaction_status, payment_type, account_id, transaction_id } = callbackData;

    if (!order_id) {
      throw new Error("Missing order_id in callback data");
    }

    // Find the payment record
    const { data: payment, error: paymentError } = await supabaseService
      .from("payments")
      .select("*, subscriptions(*), lesson_id")
      .eq("midtrans_order_id", order_id)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found for order_id: ${order_id}`);
    }

    

    // Handle different transaction statuses
    if (transaction_status === "settlement" || transaction_status === "capture") {
      // Payment successful
      await supabaseService
        .from("payments")
        .update({
          status: "success",
          paid_at: new Date().toISOString(),
          midtrans_transaction_id: transaction_id
        })
        .eq("id", payment.id);

      // If this is a linking payment (GoPay or credit card with save_card)
      if (account_id && (payment_type === "gopay" || payment_type === "credit_card")) {
        const paymentMethod = payment_type === "gopay" ? "gopay" : "credit_card";
        
        // Store the linked account
        const { error: linkError } = await supabaseService
          .from("linked_payment_accounts")
          .insert({
            user_id: payment.user_id,
            payment_method: paymentMethod,
            account_id: account_id,
            status: "linked",
            account_details: {
              payment_type,
              transaction_id,
              linked_via_order: order_id
            },
            linked_at: new Date().toISOString(),
            // Set next charge for subscription renewals (30 days from now)
            next_charge_at: payment.subscription_id ? 
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            is_production: payment.is_production
          });

        if (linkError) {
          console.error("Error storing linked account:", linkError);
        } else {
          
        }
      }

      // Update subscription status if applicable
      if (payment.subscription_id) {
        const currentPeriodEnd = new Date();
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

        await supabaseService
          .from("subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: currentPeriodEnd.toISOString()
          })
          .eq("id", payment.subscription_id);
      }

      // Enroll user in lesson if this is a lesson payment
      if (payment.lesson_id) {
        
        
        // Check if enrollment already exists
        const { data: existingEnrollment } = await supabaseService
          .from("lesson_enrollments")
          .select("id")
          .eq("lesson_id", payment.lesson_id)
          .eq("user_id", payment.user_id)
          .single();

        if (!existingEnrollment) {
          const { error: enrollError } = await supabaseService
            .from("lesson_enrollments")
            .insert({
              lesson_id: payment.lesson_id,
              user_id: payment.user_id,
              is_production: payment.is_production
            });

          if (enrollError) {
            console.error("Error enrolling user in lesson:", enrollError);
          } else {
            
          }
        } else {
          
        }
      }

    } else if (transaction_status === "pending") {
      // Payment pending
      await supabaseService
        .from("payments")
        .update({ status: "pending" })
        .eq("id", payment.id);

    } else if (transaction_status === "deny" || transaction_status === "expire" || transaction_status === "cancel") {
      // Payment failed
      await supabaseService
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);

      // Update subscription status if applicable
      if (payment.subscription_id) {
        await supabaseService
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", payment.subscription_id);
      }
    }

    

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Callback processed successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("Error processing payment callback:", error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
};

serve(handler);