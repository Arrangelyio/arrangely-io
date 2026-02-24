import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    
    // Create service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get subscriptions that are expiring within 24 hours and have auto-payment enabled
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: expiringSubscriptions, error } = await supabaseService
      .from("subscriptions")
      .select(`
        *,
        subscription_plans(*),
        profiles!subscriptions_user_id_fkey(display_name)
      `)
      .eq("status", "active")
      .eq("auto_payment_enabled", true)
      .lte("current_period_end", tomorrow.toISOString())
      .lt("payment_failed_count", 3); // Don't retry if already failed 3 times

    if (error) {
      console.error("Error fetching expiring subscriptions:", error);
      throw error;
    }

    

    const results = [];
    
    for (const subscription of expiringSubscriptions || []) {
      try {
        const plan = subscription.subscription_plans;
        const profile = subscription.profiles;
        
        

        // Generate new order ID for renewal
        const orderId = `renewal-${plan.name.toLowerCase().replace(/\s+/g, '-')}-${subscription.user_id.substring(0, 8)}-${Date.now()}`;
        
        // Determine environment and get appropriate Midtrans keys
        const environment = Deno.env.get("ENVIRONMENT") || "development";
        const midtransServerKey = environment === "production" 
          ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY")
          : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");

        if (!midtransServerKey) {
          throw new Error(`Midtrans ${environment} server key not configured`);
        }

        // Get user email from auth.users (using service role)
        const { data: userData } = await supabaseService.auth.admin.getUserById(subscription.user_id);
        const userEmail = userData.user?.email;

        if (!userEmail) {
          console.error(`No email found for user ${subscription.user_id}`);
          continue;
        }

        const midtransData = {
          transaction_details: {
            order_id: orderId,
            gross_amount: plan.price,
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            email: userEmail,
            first_name: profile?.display_name || "User",
          },
          item_details: [
            {
              id: plan.id,
              price: plan.price,
              quantity: 1,
              name: `${plan.name} Subscription Renewal`,
            },
          ],
        };

        // Create Midtrans transaction
        const midtransApiUrl = environment === "production" 
          ? "https://app.midtrans.com/snap/v1/transactions"
          : "https://app.sandbox.midtrans.com/snap/v1/transactions";

        const midtransResponse = await fetch(midtransApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify(midtransData),
        });

        if (!midtransResponse.ok) {
          const errorText = await midtransResponse.text();
          console.error(`Midtrans error for user ${subscription.user_id}:`, errorText);
          
          // Update failed payment count
          await supabaseService
            .from("subscriptions")
            .update({
              payment_failed_count: (subscription.payment_failed_count || 0) + 1,
              last_retry_at: new Date().toISOString(),
              next_payment_attempt: subscription.payment_failed_count < 2 
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Retry in 24 hours
                : null,
            })
            .eq("id", subscription.id);

          // Create notification for failed payment
          await supabaseService
            .from("notifications")
            .insert({
              user_id: subscription.user_id,
              type: "payment_failed",
              title: "Payment Failed",
              message: `Your subscription renewal payment failed. We'll retry in 24 hours.`,
              metadata: { subscription_id: subscription.id, attempt: subscription.payment_failed_count + 1 }
            });

          results.push({
            user_id: subscription.user_id,
            status: "failed",
            error: errorText
          });
          continue;
        }

        // Store payment record
        await supabaseService.from("payments").insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          midtrans_order_id: orderId,
          amount: plan.price,
          status: "pending",
          payment_method: "auto_renewal",
        });

        // Update subscription with retry info
        await supabaseService
          .from("subscriptions")
          .update({
            retry_count: (subscription.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        // Create notification for auto-renewal attempt
        await supabaseService
          .from("notifications")
          .insert({
            user_id: subscription.user_id,
            type: "payment_reminder",
            title: "Auto-Renewal Processing",
            message: `Your subscription is being renewed automatically. You'll receive confirmation once payment is complete.`,
            metadata: { subscription_id: subscription.id, order_id: orderId }
          });

        results.push({
          user_id: subscription.user_id,
          status: "processing",
          order_id: orderId
        });

        
        
      } catch (error) {
        console.error(`Error processing renewal for user ${subscription.user_id}:`, error);
        results.push({
          user_id: subscription.user_id,
          status: "error",
          error: error.message
        });
      }
    }

    

    return new Response(
      JSON.stringify({
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in process-auto-renewals:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);