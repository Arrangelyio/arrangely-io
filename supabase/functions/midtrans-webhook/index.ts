import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// ✅ Generate unique voucher codes for creator_pro (BOTH 25Y and 25M)
// 🔁 Helper: insert discount code dengan retry jika duplicate
async function insertDiscountCodeWithRetry(
  supabaseService: any,
  baseCode: string,
  suffix: string,
  payload: any,
  maxAttempts = 10
): Promise<{ id: string; code: string } | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code =
      attempt === 0
        ? `${baseCode}${suffix}`
        : `${baseCode}${suffix}${attempt + 1}`;

    const { data, error } = await supabaseService
      .from("discount_codes")
      .insert({
        ...payload,
        code,
      })
      .select("id")
      .single();

    if (!error && data) {
      return { id: data.id, code };
    }

    // 🔁 Duplicate key → retry
    if (error?.code === "23505") {
      console.warn(`⚠️ Discount code ${code} already exists, retrying...`);
      continue;
    }

    // ❌ Error lain → stop
    console.error("❌ Failed to insert discount code:", error);
    return null;
  }

  console.error("❌ Exhausted discount code generation attempts");
  return null;
}

// =====================================================
// 🎯 MAIN FUNCTION
// =====================================================
async function generateCreatorProVoucherCodes(
  supabaseService: any,
  userId: string,
  isProduction: boolean,
  currentPeriodEndISO: string
) {
  try {
    // 🔹 Ambil profile creator
    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select("display_name, creator_type")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Failed to get profile for voucher generation:", profileError);
      return;
    }

    // ⛔ Skip creator_professional
    if (profile.creator_type === "creator_professional") {
      console.log("User is creator_professional, skipping voucher generation");
      return;
    }

    // 🔹 Generate initials
    const displayName = profile.display_name || "USER";
    const nameParts = displayName
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    if (nameParts.length === 0) {
      console.error("No valid name parts for voucher generation");
      return;
    }

    let initials = nameParts.map((p) => p.charAt(0)).join("");

    if (initials.length < 2 && nameParts[0].length >= 2) {
      initials = nameParts[0].substring(0, 3);
    }

    // 🔹 Voucher definitions
    const voucherTypes = [
      {
        suffix: "25Y",
        discountType: "fixed",
        discountValue: 25000,
        billingCycle: "yearly",
      },
      {
        suffix: "25M",
        discountType: "percentage",
        discountValue: 25,
        billingCycle: "monthly",
      },
    ];

    const now = new Date().toISOString();

    for (const voucherType of voucherTypes) {
      const { suffix, discountType, discountValue, billingCycle } = voucherType;

      console.log("current period:", currentPeriodEndISO);
      const validUntil = currentPeriodEndISO;

      // 🔹 Cek assignment existing
      const { data: existingAssignment } = await supabaseService
        .from("discount_code_assignments")
        .select(
          "id, discount_code_id, discount_codes!inner(billing_cycle)"
        )
        .eq("creator_id", userId)
        .eq("discount_codes.billing_cycle", billingCycle)
        .eq("is_production", isProduction)
        .maybeSingle();

      // ✅ SUDAH ADA → UPDATE validity
      if (existingAssignment) {
        const { error: updateError } = await supabaseService
          .from("discount_codes")
          .update({
            valid_from: now,
            valid_until: validUntil,
          })
          .eq("id", existingAssignment.discount_code_id);

        if (updateError) {
          console.error(
            `Failed to update ${billingCycle} voucher validity`,
            updateError
          );
        } else {
          console.log(
            `🔄 Updated ${billingCycle} voucher validity for creator ${userId}`
          );
        }
        continue;
      }

      // ✅ BELUM ADA → CREATE BARU (ANTI DUPLICATE)
      const payload = {
        discount_type: discountType,
        discount_value: discountValue,
        billing_cycle: billingCycle,
        valid_from: now,
        valid_until: validUntil,
        is_active: true,
        is_production: isProduction,
        max_uses: null,
        is_new_customer: false,
      };

      const created = await insertDiscountCodeWithRetry(
        supabaseService,
        initials,
        suffix,
        payload
      );

      if (!created) {
        console.error(
          `❌ Failed to create unique ${billingCycle} voucher for user ${userId}`
        );
        continue;
      }

      const { error: assignError } = await supabaseService
        .from("discount_code_assignments")
        .insert({
          creator_id: userId,
          discount_code_id: created.id,
          is_production: isProduction,
        });

      if (assignError) {
        console.error(
          `Failed to assign ${billingCycle} voucher`,
          assignError
        );
      } else {
        console.log(
          `✅ Created ${billingCycle} voucher ${created.code} for creator ${userId}`
        );
      }
    }
  } catch (error) {
    console.error("❌ Error generating creator voucher codes:", error);
  }
}

// ✅ Handler khusus untuk recurring (subscription) notifications
async function handleSubscriptionNotification(req, notification) {
  
  const environment = Deno.env.get("ENVIRONMENT") || "development";
  const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: {
      persistSession: false
    }
  });
  try {
    const { subscription, transaction, event_name } = notification;
    if (!subscription?.id) {
      console.error("Invalid subscription notification");
      return new Response("Invalid subscription notification", {
        status: 400,
        headers: corsHeaders
      });
    }
    const { data: dbSubscription, error: subError } = await supabaseService.from("subscriptions").select("*").eq("midtrans_subscription_id", subscription.id).single();
    if (subError || !dbSubscription) {
      console.error("Subscription not found:", subscription.id);
      return new Response("Subscription not found", {
        status: 404,
        headers: corsHeaders
      });
    }
    // ✅ Main subscription event handling
    switch (event_name) {
      case "subscription.create":
        
        await supabaseService.from("subscriptions").update({
          midtrans_subscription_status: subscription.status,
          midtrans_subscription_token: subscription.token,
          status: "pending",
          next_billing_date: subscription.schedule?.next_execution_at,
          current_interval: subscription.schedule?.current_interval || 0,
          updated_at: new Date().toISOString()
        }).eq("id", dbSubscription.id);
        break;
      case "subscription.charge":
        
        if (subscription.payment_type === "gopay" && subscription.status === "inactive") {
          
          const enableUrl = `https://api.sandbox.midtrans.com/v1/subscriptions/${subscription.id}/enable`;
          const enableResp = await fetch(enableUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Basic ${btoa(Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY") + ":")}`
            }
          });
          
        }
        if (transaction) {
          const { data: existing } = await supabaseService.from("payments").select("id").eq("subscription_id", dbSubscription.id).eq("midtrans_transaction_id", transaction.transaction_id).maybeSingle();
          if (!existing) {
            const amount = parseInt(subscription.amount);
            await supabaseService.from("payments").insert({
              user_id: dbSubscription.user_id,
              subscription_id: dbSubscription.id,
              amount,
              currency: subscription.currency || "IDR",
              status: [
                "settlement",
                "capture"
              ].includes(transaction.transaction_status) ? "paid" : "pending",
              payment_method: subscription.payment_type,
              midtrans_transaction_id: transaction.transaction_id,
              midtrans_order_id: transaction.transaction_id,
              paid_at: [
                "settlement",
                "capture"
              ].includes(transaction.transaction_status) ? new Date().toISOString() : null,
              is_production: environment === "production"
            });
            
          } else {
            
          }
          await supabaseService.from("subscriptions").update({
            midtrans_subscription_status: subscription.status,
            status: [
              "settlement",
              "capture"
            ].includes(transaction.transaction_status) || subscription.status === "active" ? "active" : subscription.status,
            next_billing_date: subscription.schedule?.next_execution_at,
            current_interval: subscription.schedule?.current_interval || 0,
            last_payment_status: [
              "settlement",
              "capture"
            ].includes(transaction.transaction_status) ? "paid" : "failed",
            payment_failed_count: [
              "settlement",
              "capture"
            ].includes(transaction.transaction_status) ? 0 : (dbSubscription.payment_failed_count || 0) + 1,
            updated_at: new Date().toISOString()
          }).eq("id", dbSubscription.id);
        }
        break;
      case "subscription.updated":
        
        await supabaseService.from("subscriptions").update({
          midtrans_subscription_status: subscription.status,
          status: subscription.status === "active" ? "active" : subscription.status,
          next_billing_date: subscription.schedule?.next_execution_at,
          current_interval: subscription.schedule?.current_interval || 0,
          updated_at: new Date().toISOString()
        }).eq("id", dbSubscription.id);
        break;
      case "subscription.disabled":
      case "subscription.cancelled":
        
        await supabaseService.from("subscriptions").update({
          midtrans_subscription_status: subscription.status,
          status: "cancelled",
          auto_payment_enabled: false,
          updated_at: new Date().toISOString()
        }).eq("id", dbSubscription.id);
        break;
      case "subscription.enabled":
        
        await supabaseService.from("subscriptions").update({
          midtrans_subscription_status: subscription.status,
          status: "active",
          auto_payment_enabled: true,
          updated_at: new Date().toISOString()
        }).eq("id", dbSubscription.id);
        break;
      default:
        
    }
    return new Response("OK", {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Error processing subscription notification:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
}
// ✅ Handler utama (Snap + Recurring)
const handler = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const notification = await req.json();
    
    // 🔹 Tangani recurring subscription events dulu
    if (notification.event_name) {
      return await handleSubscriptionNotification(req, notification);
    }
    // 🔹 Jika bukan subscription, berarti ini Snap Payment biasa
    const environment = Deno.env.get("ENVIRONMENT") || "development";
    const serverKey = environment === "production" ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY") : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
    if (!serverKey) throw new Error(`Midtrans ${environment} server key not configured`);
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // ✅ Bedakan event vs subscription lewat order_id prefix
    const isEventOrder = notification.order_id?.startsWith("EVT-");
    // 🔍 Ambil payment sesuai jenisnya
    const { data: payment, error: paymentError } = isEventOrder ? await supabaseService.from("payments").select("*, discount_codes(*), lesson_id").eq("midtrans_order_id", notification.order_id).eq("payment_type", "event").maybeSingle() : await supabaseService.from("payments").select("*, subscriptions(*, subscription_plans(*)), discount_codes(*), lesson_id").eq("midtrans_order_id", notification.order_id).maybeSingle();
    if (paymentError || !payment) {
      console.error("Payment not found:", notification.order_id);
      throw new Error("Payment record not found");
    }
    // 🛑 Skip if payment already marked as paid/settlement
    if (payment && [
      "paid",
      "settlement",
      "capture"
    ].includes(payment.status) && notification.transaction_status === "pending") {
      
      return new Response("Already paid - ignoring pending update", {
        status: 200,
        headers: corsHeaders
      });
    }
    // Check if payment is expired and still pending - trigger cleanup
    if (notification.transaction_status === "expire") {
      
      try {
        await supabaseService.functions.invoke("expire-event-payments", {
          body: {}
        });
      } catch (error) {
        console.error("Error calling expire-event-payments:", error);
      }
    }
    const isEventPayment = payment.payment_type === "event";
    const isLessonPayment = payment.payment_type === "lesson";
    const isSequencerPayment = payment.payment_type === "sequencer";
    let paymentStatus = "pending";
    let subscriptionStatus = "pending";
    switch (notification.transaction_status) {
      case "capture":
      case "settlement":
        paymentStatus = "paid";
        subscriptionStatus = "active";
        break;
      case "pending":
        paymentStatus = "pending";
        subscriptionStatus = "pending";
        break;
      case "deny":
      case "cancel":
      case "expire":
      case "failure":
        paymentStatus = "failed";
        subscriptionStatus = "cancelled";
        if (payment.subscriptions) {
          await supabaseService.from("subscriptions").update({
            payment_failed_count: (payment.subscriptions.payment_failed_count || 0) + 1,
            last_payment_status: paymentStatus
          }).eq("id", payment.subscriptions.id);
        }
        break;
    }
    await supabaseService.from("payments").update({
      status: paymentStatus,
      midtrans_transaction_id: notification.transaction_id,
      payment_method: notification.payment_type,
      paid_at: paymentStatus === "paid" ? new Date().toISOString() : null
    }).eq("id", payment.id);
    // ✅ Handle event payment-specific logic (unchanged)
    if (isEventPayment && paymentStatus === "paid") {
      
      const { data: event, error: eventError } = await supabaseService.from("events").select("*").eq("id", payment.event_id).single();
      if (eventError || !event) {
        console.error("Event not found for payment:", payment.id);
        throw new Error("Event not found");
      }
      const tickets = payment.metadata?.tickets || [];
      if (tickets.length === 0) {
        console.error("No ticket metadata found in payment");
        throw new Error("No ticket metadata found");
      }
      const registerResponse = await supabaseService.functions.invoke("register-for-event", {
        body: {
          paymentId: payment.id,
          eventId: payment.event_id,
          userId: payment.user_id,
          tickets: tickets,
          amountPaid: payment.amount,
          eventDetails: {
            title: event.title,
            date: new Date(event.start_date).toLocaleDateString(),
            time: new Date(event.start_date).toLocaleTimeString(),
            location: event.location || "Online",
            notes: event.notes,
            slug: event.slug
          }
        }
      });
      if (registerResponse.error) {
        console.error("Error calling register-for-event:", registerResponse.error);
        throw new Error(`Failed to register for event: ${registerResponse.error.message}`);
      }
      
      if (payment.discount_code_id) {
        await supabaseService.rpc("increment_discount_code_usage", {
          p_discount_code_id: payment.discount_code_id
        });
      }
    } else if (isLessonPayment && paymentStatus === "paid") {
      
      const { data: existingEnrollment } = await supabaseService.from("lesson_enrollments").select("id").eq("lesson_id", payment.lesson_id).eq("user_id", payment.user_id).maybeSingle();
      if (!existingEnrollment) {
        const { error: enrollErr } = await supabaseService.from("lesson_enrollments").insert({
          lesson_id: payment.lesson_id,
          user_id: payment.user_id,
          is_production: environment === "production"
        });
        if (enrollErr) {
          console.error("❌ Failed to enroll user into lesson:", enrollErr);
          throw new Error("Failed to enroll lesson");
        }
        
      }
    } else if (isSequencerPayment && paymentStatus === "paid") {
      
      const { data: existingEnrollment } = await supabaseService.from("sequencer_enrollments").select("id").eq("sequencer_file_id", payment.sequencer_id).eq("user_id", payment.user_id).maybeSingle();
      if (!existingEnrollment) {
        const { error: enrollErr } = await supabaseService.from("sequencer_enrollments").insert({
          sequencer_file_id: payment.sequencer_id,
          user_id: payment.user_id,
          payment_id: payment.id,
          is_production: environment === "production"
        });
        if (enrollErr) {
          console.error("❌ Failed to enroll user into sequencer file:", enrollErr);
          throw new Error("Failed to enroll sequencer");
        }
        
      }
    }
    if (paymentStatus === "paid" && notification.saved_token_id && notification.payment_type === "credit_card" && payment) {
      
      await supabaseService.from("linked_payment_accounts").upsert({
        user_id: payment.user_id,
        account_id: notification.saved_token_id,
        payment_method: "credit_card",
        status: "linked",
        account_details: {
          masked_card: notification.masked_card || null,
          card_type: notification.card_type || null
        }
      }, {
        onConflict: "user_id,payment_method"
      });
    }
    if (paymentStatus === "paid" && payment?.subscriptions) {
      const subscription = payment.subscriptions;
      const plan = subscription.subscription_plans;
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(currentPeriodStart);
      if (plan.interval_type === "year") {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + plan.interval_count);
      } else {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + plan.interval_count);
      }
      await supabaseService.from("subscriptions").update({
        status: subscriptionStatus,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        midtrans_subscription_id: notification.transaction_id,
        last_payment_status: paymentStatus,
        payment_failed_count: 0,
        auto_payment_enabled: true
      }).eq("id", subscription.id);

      // ✅ Update profile to creator_pro if subscribing to Creator Pro plan
      if (plan.name === "Creator Pro") {
        
        const { error: profileError } = await supabaseService
          .from("profiles")
          .update({ 
            creator_type: "creator_pro",
            role: "creator",
            updated_at: new Date().toISOString()
          })
          .eq("user_id", payment.user_id)
          .neq("creator_type", "creator_professional");
        
        if (profileError) {
          console.error("Failed to update profile to creator_pro:", profileError);
        }

        // ✅ Auto-generate voucher codes for creator_pro (both 25Y and 25M)
        await generateCreatorProVoucherCodes(
          supabaseService,
          payment.user_id,
          environment === "production",
          currentPeriodEnd.toISOString()
        );

        // ✅ Create creator_benefit_configs record for creator_pro
        try {
          // Check if config already exists for this user
          const { data: existingConfig } = await supabaseService
            .from("creator_benefit_configs")
            .select("id")
            .eq("creator_id", payment.user_id)
            .eq("is_active", true)
            .maybeSingle();

          if (!existingConfig) {
            const { error: configError } = await supabaseService
              .from("creator_benefit_configs")
              .insert({
                creator_id: payment.user_id,
                benefit_per_library_add: 5000,
                benefit_per_song_publish: 0,
                benefit_lesson_percentage: 0,
                benefit_sequencer_percentage: 0,
                benefit_discount_code: 10,
                period_start_date: currentPeriodStart.toISOString(),
                period_end_date: currentPeriodEnd.toISOString(),
                is_active: true,
                is_production: environment === "production"
              });

            if (configError) {
              console.error("Failed to create creator_benefit_configs:", configError);
            } else {
              console.log("✅ Created creator_benefit_configs for user:", payment.user_id);
            }
          } else {
            // Update existing config with new period dates
            const { error: updateError } = await supabaseService
              .from("creator_benefit_configs")
              .update({
                period_start_date: currentPeriodStart.toISOString(),
                period_end_date: currentPeriodEnd.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", existingConfig.id);

            if (updateError) {
              console.error("Failed to update creator_benefit_configs:", updateError);
            } else {
              console.log("✅ Updated creator_benefit_configs period for user:", payment.user_id);
            }
          }
        } catch (configErr) {
          console.error("Error handling creator_benefit_configs:", configErr);
        }
      }
    }
    console.log("Payment processed:", {
      orderId: notification.order_id,
      status: paymentStatus,
      subscriptionStatus
    });
    return new Response("OK", {
      headers: corsHeaders,
      status: 200
    });
  } catch (error) {
    console.error("Error in midtrans-webhook:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
};
serve(handler);
