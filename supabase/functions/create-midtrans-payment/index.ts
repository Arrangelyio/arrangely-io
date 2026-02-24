import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  checkRateLimit,
  createRateLimitResponse,
} from "../_shared/rate-limit.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(
    req,
    "create-midtrans-payment",
    authHeader
  );
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
    const authHeader = req.headers.get("Authorization");
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    const now = new Date();
    
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    const {
      planId,
      discountId,
      discountCode,
      amount,
      description,
      item_details,
      isOneTimePayment,
      sequencerId,
      paymentMethod,
      lessonId,
      isLessonPayment,
      paymentChannel,
      enableRecurring,
      event_id,
      tickets,
      discount_code,
      selectedBank,
    } = await req.json();
    console.log("Request data:", {
      planId,
      discountCode,
      amount,
      description,
      isOneTimePayment,
      sequencerId,
      paymentMethod,
      lessonId,
      isLessonPayment,
      paymentChannel,
      enableRecurring,
      event_id,
      tickets: tickets?.length,
      discount_code,
    });
    // Create service client for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );
    // Handle lesson payments
    if (isLessonPayment && lessonId) {
      
      // Check for active lesson payments (exclude cancelled, expired, failed)
      const { data: activePayments, error: checkError } = await supabaseService
        .from("payments")
        .select(
          "id, midtrans_order_id, status, created_at, payment_method, va_number, payment_code, actions, expires_at"
        )
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .in("status", ["pending", "waiting"])
        .order("created_at", {
          ascending: false,
        })
        .limit(1);
      if (checkError) {
        console.error("Error checking active payments:", checkError);
      }
      // If there's an active payment, check if it's expired
      if (activePayments && activePayments.length > 0) {
        const activePayment = activePayments[0];
        // Check expiration based on expires_at field if available
        const expiresAt = activePayment.expires_at
          ? new Date(activePayment.expires_at)
          : null;
        const isExpired = expiresAt ? now > expiresAt : false;
        if (isExpired) {
          // Mark expired payment as expired
          await supabaseService
            .from("payments")
            .update({
              status: "expired",
            })
            .eq("id", activePayment.id);
        } else {
          
          return new Response(
            JSON.stringify({
              error: "ACTIVE_TRANSACTION_EXISTS",
              message:
                "You have an active transaction. Please complete or cancel it first.",
              orderId: activePayment.midtrans_order_id,
              existingPayment: {
                orderId: activePayment.midtrans_order_id,
                paymentMethod: activePayment.payment_method,
                vaNumber: activePayment.va_number,
                paymentCode: activePayment.payment_code,
                actions: activePayment.actions,
                createdAt: activePayment.created_at,
                expiresAt: activePayment.expires_at,
              },
            }),
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
              status: 409,
            }
          );
        }
      }
      // Get lesson details
      const { data: lesson, error: lessonError } = await supabaseService
        .from("lessons")
        .select("id, title, price, is_free, slug")
        .eq("id", lessonId)
        .single();
      if (lessonError || !lesson) {
        throw new Error(
          `Lesson not found: ${lessonError?.message || "Invalid lesson ID"}`
        );
      }
      if (lesson.is_free || !lesson.price) {
        throw new Error("This lesson is free, no payment required");
      }
      const finalAmount = lesson.price;
      const orderId = `lesson-${Date.now()}-${user.id.substring(0, 6)}`;
      const expiryMinutes = 60;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      const offsetMs = 7 * 60 * 60 * 1000; // +7 timezone
      const localTime = new Date(now.getTime() + offsetMs)
        .toISOString()
        .replace("T", " ")
        .replace("Z", "")
        .split(".")[0];
      const orderTime = `${localTime} +0700`;
      
      // Determine environment
      const origin =
        req.headers.get("origin") || req.headers.get("referer") || "";
      let environment = "staging";
      const hostname = new URL(origin).hostname;
      if (hostname === "arrangely.io") {
        environment = "production";
      } else if (hostname === "staging.arrangely.io") {
        environment = "staging";
      }
      const midtransServerKey =
        environment === "production"
          ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY")
          : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
      if (!midtransServerKey) {
        throw new Error(`Midtrans ${environment} server key not configured`);
      }
      // Use Snap for credit card, Core API for others
      if (paymentChannel === "credit_card") {
        // Credit card uses Snap API for secure payment page
        const snapData = {
          transaction_details: {
            order_id: orderId,
            gross_amount: finalAmount,
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            email: user.email,
            first_name: user.user_metadata?.display_name || "User",
          },
          item_details: [
            {
              id: lesson.id.substring(0, 20),
              price: finalAmount,
              quantity: 1,
              name:
                lesson.title.length > 50
                  ? lesson.title.substring(0, 47) + "..."
                  : lesson.title,
            },
          ],
          enabled_payments: ["credit_card"],
          callbacks: {
            finish: `${origin}/arrangely-music-lab/${lesson.slug}/payment/success?order_id=${orderId}`,
          },
        };
        console.log(
          "Midtrans Snap request:",
          JSON.stringify(snapData, null, 2)
        );
        const snapApiUrl =
          environment === "production"
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";
        const snapResponse = await fetch(snapApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify(snapData),
        });
        if (!snapResponse.ok) {
          const errorText = await snapResponse.text();
          console.error("Midtrans Snap error:", errorText);
          throw new Error(`Failed to create payment: ${errorText}`);
        }
        const snapResult = await snapResponse.json();
        console.log(
          "Midtrans Snap response:",
          JSON.stringify(snapResult, null, 2)
        );
        // Store payment record
        const { error: insertError } = await supabaseService
          .from("payments")
          .insert({
            user_id: user.id,
            midtrans_order_id: orderId,
            amount: finalAmount,
            status: "pending",
            payment_method: "credit_card",
            currency: "IDR",
            lesson_id: lesson.id,
            actions: [
              {
                name: "redirect",
                url: snapResult.redirect_url,
              },
            ],
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            is_production: environment === "production",
          });
        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to store payment: ${insertError.message}`);
        }
        return new Response(
          JSON.stringify({
            orderId,
            transactionStatus: "pending",
            paymentMethod: "credit_card",
            amount: finalAmount,
            snapToken: snapResult.token,
            redirectUrl: snapResult.redirect_url,
            lessonSlug: lesson.slug,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          }
        );
      }
      // Use Core API for VA and GoPay
      let paymentType = "gopay";
      if (paymentChannel === "va" && selectedBank !== "mandiri") {
        paymentType = "bank_transfer";
      } else if (selectedBank === "mandiri") {
        paymentType = "echannel";
      }
      const generateRandomBillKey = () => {
        return Math.floor(
          100000000000000 + Math.random() * 900000000000000
        ).toString();
      };
      // 🧾 Build Midtrans Charge Payload
      const midtransChargeData = {
        payment_type: paymentType,
        transaction_details: {
          order_id: orderId,
          gross_amount: finalAmount,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.display_name || "User",
        },
        item_details: [
          {
            id: lesson.id.substring(0, 20),
            price: finalAmount,
            quantity: 1,
            name:
              lesson.title.length > 50
                ? lesson.title.substring(0, 47) + "..."
                : lesson.title,
          },
        ],
        custom_expiry: {
          order_time: orderTime,
          expiry_duration: expiryMinutes,
          unit: "minute",
        },
      };
      // Add payment-specific fields
      if (paymentChannel === "va") {
        if (selectedBank === "mandiri") {
          midtransChargeData.echannel = {
            bill_info1: "Payment For:",
            bill_info2: "Event Ticket",
            bill_key: generateRandomBillKey,
          };
        } else {
          midtransChargeData.bank_transfer = {
            bank: selectedBank || "bni",
          };
        }
      } else if (paymentMethod === "gopay") {
        midtransChargeData.gopay = {
          enable_callback: true,
          callback_url: `${origin}/events/payment/complete`,
        };
      }
      console.log(
        "Midtrans charge request:",
        JSON.stringify(midtransChargeData, null, 2)
      );
      // Create Midtrans charge via Core API For Lesson
      const midtransApiUrl =
        environment === "production"
          ? "https://api.midtrans.com/v2/charge"
          : "https://api.sandbox.midtrans.com/v2/charge";
      const midtransResponse = await fetch(midtransApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
        },
        body: JSON.stringify(midtransChargeData),
      });
      if (!midtransResponse.ok) {
        const errorText = await midtransResponse.text();
        console.error("Midtrans error response:", errorText);
        throw new Error(`Failed to create payment: ${errorText}`);
      }
      const chargeData = await midtransResponse.json();
      console.log(
        "Midtrans charge response:",
        JSON.stringify(chargeData, null, 2)
      );
      // Extract payment details based on method
      let vaNumber = null;
      let paymentCode = null;
      let qrCodeUrl = null;
      let deeplink = null;
      let actions = null;
      let billerCode = null;
      let billKey = null;
      if (paymentChannel === "va") {
        vaNumber =
          chargeData.va_numbers?.[0]?.va_number || chargeData.permata_va_number;
        // For Mandiri echannel, extract biller_code and bill_key
        if (selectedBank === "mandiri") {
          billerCode = chargeData.biller_code;
          billKey = chargeData.bill_key;
        }
      } else if (paymentChannel === "gopay") {
        qrCodeUrl = chargeData.actions?.find(
          (a) => a.name === "generate-qr-code"
        )?.url;
        deeplink = chargeData.actions?.find(
          (a) => a.name === "deeplink-redirect"
        )?.url;
        actions = chargeData.actions;
      }
      let expiresAtFinal;
      if (chargeData.expiry_time) {
        // Ubah format jadi ISO-compatible dan tambahkan offset WIB (+07:00)
        const expiryWithOffset = `${chargeData.expiry_time.replace(
          " ",
          "T"
        )}+07:00`;
        expiresAtFinal = new Date(expiryWithOffset);
      } else {
        // fallback default
        expiresAtFinal = new Date(Date.now() + expiryMinutes * 60 * 1000);
      }
      // Store payment record
      const { error: insertError } = await supabaseService
        .from("payments")
        .insert({
          user_id: user.id,
          midtrans_order_id: orderId,
          midtrans_transaction_id: chargeData.transaction_id,
          amount: finalAmount,
          status:
            chargeData.transaction_status === "settlement" ? "paid" : "pending",
          payment_method: paymentChannel,
          currency: "IDR",
          lesson_id: lesson.id,
          va_number: vaNumber,
          qr_code_url: qrCodeUrl,
          biller_code: billerCode,
          bill_key: billKey,
          deeplink_url: deeplink,
          payment_code: selectedBank || "bni",
          actions: actions,
          expires_at: chargeData.expiry_time ? expiresAtFinal : expiresAt,
          is_production: environment === "production",
        });
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to store payment: ${insertError.message}`);
      }
      return new Response(
        JSON.stringify({
          orderId,
          transactionId: chargeData.transaction_id,
          transactionStatus: chargeData.transaction_status,
          paymentMethod: paymentChannel,
          amount: finalAmount,
          vaNumber,
          qrCodeUrl,
          deeplink,
          actions,
          expiryTime: chargeData.expiry_time,
          lessonSlug: lesson.slug,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }
    // Handle event payments
    if (event_id && tickets && Array.isArray(tickets) && tickets.length > 0) {
      console.log(
        `Processing event payment for user ${user.id}, event ${event_id}, ${tickets.length} tickets`
      );
      // Fetch event with fee configuration and max_purchase settings
      const { data: event, error: eventError } = await supabaseService
        .from("events")
        .select(
          "*, organizer_id, admin_fee_amount, admin_fee_enabled, admin_fee_paid_by_customer, platform_fee_amount, platform_fee_enabled, platform_fee_paid_by_customer, vat_tax_percentage, vat_tax_enabled, vat_tax_paid_by_customer, enable_max_purchase, max_purchase, use_core_api, payment_expiry_minutes"
        )
        .eq("id", event_id)
        .single();
      if (eventError || !event) throw new Error("Event not found");
      // Fetch ticket categories with all validation fields
      const categoryIds = tickets.map((t) => t.ticket_category_id);
      const { data: categories, error: categoriesError } = await supabaseService
        .from("event_ticket_categories")
        .select(
          "id, name, price, remaining_quota, sale_start_date, sale_end_date, is_active, max_purchase"
        )
        .in("id", categoryIds);
      if (categoriesError || !categories?.length)
        throw new Error("Invalid ticket categories");
      // Get user's purchase history for these categories
      const { data: purchaseHistory, error: historyError } =
        await supabaseService
          .from("event_quota_transaction_history")
          .select("ticket_category_id, ticket_count, payment_id")
          .in("ticket_category_id", categoryIds)
          .eq("transaction_type", "purchase");
      if (historyError) {
        console.error("Error fetching purchase history:", historyError);
      }
      // Get paid payments for this user to count only completed purchases
      const { data: paidPayments, error: paymentsError } = await supabaseService
        .from("event_payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "paid");
      if (paymentsError) {
        console.error("Error fetching paid payments:", paymentsError);
      }
      const paidPaymentIds = new Set(paidPayments?.map((p) => p.id) || []);
      // Calculate purchase counts per category from paid transactions only
      const purchaseCounts = {};
      let totalEventPurchases = 0; // Track total purchases for event-level limit
      if (purchaseHistory) {
        purchaseHistory.forEach((h) => {
          if (h.payment_id && paidPaymentIds.has(h.payment_id)) {
            purchaseCounts[h.ticket_category_id] =
              (purchaseCounts[h.ticket_category_id] || 0) + h.ticket_count;
            totalEventPurchases += h.ticket_count;
          }
        });
      }
      // Validate event-level max_purchase if enabled
      if (event.enable_max_purchase && event.max_purchase) {
        const currentOrderTotal = tickets.length;
        const totalAfterPurchase = totalEventPurchases + currentOrderTotal;
        if (totalAfterPurchase > event.max_purchase) {
          const remaining = event.max_purchase - totalEventPurchases;
          throw new Error(
            `Event purchase limit exceeded. You can only purchase ${remaining} more ticket(s) for this event (max: ${event.max_purchase} per user)`
          );
        }
      }
      // Validate all tickets before processing payment
      let ticketSubtotal = 0;
      const categoryTicketCounts = {};
      // ✅ Step 1: Hitung jumlah tiket per kategori
      for (const ticket of tickets) {
        categoryTicketCounts[ticket.ticket_category_id] =
          (categoryTicketCounts[ticket.ticket_category_id] || 0) + 1;
      }
      // ✅ Step 2: Loop tiap kategori dan lakukan validasi
      for (const [categoryId, countValue] of Object.entries(
        categoryTicketCounts
      )) {
        const count = Number(countValue); // pastikan number
        const category = categories.find((c) => c.id === categoryId);
        if (!category) {
          throw new Error(`Invalid category: ${categoryId}`);
        }
        const price = Number(category.price ?? 0); // konversi harga ke number
        // 1. Check if category is active
        if (!category.is_active) {
          throw new Error(
            `Ticket category "${category.name}" is not available for purchase`
          );
        }
        // 2. Check if sales have started
        if (
          category.sale_start_date &&
          new Date(category.sale_start_date) > now
        ) {
          throw new Error(
            `Ticket sales for "${category.name}" have not started yet`
          );
        }
        // 3. Check if sales have ended
        if (category.sale_end_date && new Date(category.sale_end_date) < now) {
          throw new Error(`Ticket sales for "${category.name}" have ended`);
        }
        // 4. Check quota availability
        if (
          category.remaining_quota !== null &&
          category.remaining_quota !== undefined
        ) {
          if (category.remaining_quota <= 0) {
            throw new Error(`Ticket category "${category.name}" is sold out`);
          }
        }
        // 5. Check max_purchase limit
        const maxPurchase = category.max_purchase ?? 10;
        const previousPurchases = purchaseCounts[categoryId] ?? 0;
        const totalPurchases = previousPurchases + count;
        if (totalPurchases > maxPurchase) {
          const remaining = Math.max(maxPurchase - previousPurchases, 0);
          throw new Error(
            `Purchase limit exceeded for "${category.name}". You can only purchase ${remaining} more ticket(s) (max: ${maxPurchase} per user)`
          );
        }
        // ✅ Add to subtotal properly (price * count)
        ticketSubtotal += price * count;
      }
      // Calculate fees paid by customer
      let adminFee = 0;
      let platformFee = 0;
      let vatTax = 0;
      if (event.admin_fee_enabled && event.admin_fee_paid_by_customer) {
        // Calculate admin fee as percentage of ticket subtotal
        const adminFeePercentage = event.admin_fee_amount || 0;
        adminFee = Math.round((ticketSubtotal * adminFeePercentage) / 100);
      }
      if (event.platform_fee_enabled && event.platform_fee_paid_by_customer) {
        platformFee = event.platform_fee_amount || 0;
      }
      if (event.vat_tax_enabled && event.vat_tax_paid_by_customer) {
        const taxableAmount = ticketSubtotal + adminFee + platformFee;
        vatTax = Math.round(
          (taxableAmount * (event.vat_tax_percentage || 0)) / 100
        );
      }
      // Calculate total amount including fees
      const totalAmount = ticketSubtotal + adminFee + platformFee + vatTax;
      console.log(
        `Event payment calculation - Tickets: ${ticketSubtotal}, Admin: ${adminFee}, Platform: ${platformFee}, VAT: ${vatTax}, Total: ${totalAmount}`
      );
      // Calculate expiry time
      const expiryMinutes = event.payment_expiry_minutes || 2;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      const offsetMs = 7 * 60 * 60 * 1000; // +7 timezone
      const localTime = new Date(now.getTime() + offsetMs)
        .toISOString()
        .replace("T", " ")
        .replace("Z", "")
        .split(".")[0];
      const orderTime = `${localTime} +0700`;
      // Determine environment
      const origin =
        req.headers.get("origin") || req.headers.get("referer") || "";
      const hostname = new URL(origin).hostname;
      const environment =
        hostname === "arrangely.io"
          ? "production"
          : hostname === "staging.arrangely.io"
          ? "staging"
          : "sandbox";
      const midtransServerKey =
        environment === "production"
          ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY")
          : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
      if (!midtransServerKey) throw new Error("Midtrans server key missing");
      // Build order ID
      const orderId = `EVT-${Date.now()}-${user.id.substring(0, 8)}`;
      // Build item details including ticket + fees
      const ticketItems = tickets.map((t) => ({
        id: t.ticket_category_id.substring(0, 20),
        price:
          categories.find((c) => c.id === t.ticket_category_id)?.price || 0,
        quantity: 1,
        name:
          event.title.length > 50
            ? event.title.substring(0, 47) + "..."
            : event.title,
      }));
      // Add admin fee, platform fee, and VAT if enabled
      if (adminFee > 0) {
        ticketItems.push({
          id: "admin_fee",
          price: adminFee,
          quantity: 1,
          name: "Admin Fee",
        });
      }
      if (platformFee > 0) {
        ticketItems.push({
          id: "platform_fee",
          price: platformFee,
          quantity: 1,
          name: "Platform Fee",
        });
      }
      if (vatTax > 0) {
        ticketItems.push({
          id: "vat_tax",
          price: vatTax,
          quantity: 1,
          name: "VAT / PPN Tax",
        });
      }
      // If Core API is disabled, use Snap for all payment methods
      if (!event.use_core_api) {
        console.log(
          "Core API disabled, using Snap Midtrans for event:",
          event.title
        );
        // First, insert the payment record so we can get the payment.id
        const { data: payment1, error: insertError } = await supabaseService
          .from("payments")
          .insert({
            user_id: user.id,
            midtrans_order_id: orderId,
            amount: totalAmount,
            status: "pending",
            payment_method: paymentMethod,
            payment_type: "event",
            event_id,
            ticket_count: tickets.length,
            currency: "IDR",
            expires_at: expiresAt,
            is_production: environment === "production",
            metadata: {
              tickets: tickets.map((t) => ({
                ticket_category_id: t.ticket_category_id,
                participant_name: t.participant_name,
                participant_email: t.participant_email,
                participant_phone: t.participant_phone,
                participant_ktp: t.participant_ktp || null,
              })),
              event_slug: event.slug,
            },
          })
          .select()
          .single();
        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to store payment: ${insertError.message}`);
        }
        // Now that we have payment.id, build Snap request
        const snapData = {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalAmount,
          },
          customer_details: {
            email: user.email,
            first_name: tickets[0].participant_name || "User",
          },
          item_details: ticketItems,
          callbacks: {
            finish: `${origin}/events?tab=tickets`,
          },
          expiry: {
            start_time: orderTime,
            unit: "minute",
            duration: expiryMinutes,
          },
        };
        console.log(
          "Midtrans Snap request (Core API disabled):",
          JSON.stringify(snapData, null, 2)
        );
        const snapApiUrl =
          environment === "production"
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";
        const snapResponse = await fetch(snapApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify(snapData),
        });
        if (!snapResponse.ok) {
          const errorText = await snapResponse.text();
          console.error("Midtrans Snap error:", errorText);
          throw new Error(`Failed to create payment: ${errorText}`);
        }
        const snapResult = await snapResponse.json();
        console.log(
          "Midtrans Snap response:",
          JSON.stringify(snapResult, null, 2)
        );
        // Update the payment with Snap data
        await supabaseService
          .from("payments")
          .update({
            actions: [
              {
                name: "redirect",
                url: snapResult.redirect_url,
              },
            ],
            metadata: {
              ...payment1.metadata,
              snap_token: snapResult.token,
            },
          })
          .eq("id", payment1.id);
        // Book quota
        for (const ticket of tickets) {
          const { data: bookResult, error: bookError } =
            await supabaseService.rpc("book_event_quota", {
              p_ticket_category_id: ticket.ticket_category_id,
              p_payment_id: payment1.id,
              p_ticket_count: 1,
            });
          if (bookError || !bookResult?.success) {
            console.error("Error booking quota:", bookError || bookResult);
            throw new Error(bookResult?.error || "Failed to book event quota");
          }
        }
        console.log(
          "✅ Event Snap payment created successfully (Core API disabled)"
        );
        return new Response(
          JSON.stringify({
            payment_id: payment1.id,
            orderId,
            transactionStatus: "pending",
            paymentMethod: paymentMethod,
            amount: totalAmount,
            discountAmount: 0,
            snapToken: snapResult.token,
            snapUrl: snapResult.redirect_url,
            eventSlug: event.slug,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          }
        );
      }
      // Handle Credit Card payments (use Snap API like lessons)
      if (paymentChannel === "credit_card") {
        
        const expiryMinutes = event.payment_expiry_minutes || 30; // default 30 menit jika tidak diset
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
        const offsetMs = 7 * 60 * 60 * 1000; // WIB offset
        const now = new Date();
        const localTime = new Date(now.getTime() + offsetMs)
          .toISOString()
          .replace("T", " ")
          .replace("Z", "")
          .split(".")[0];
        const orderTime = `${localTime} +0700`;
        const snapData = {
          transaction_details: {
            order_id: orderId,
            gross_amount: totalAmount,
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            email: user.email,
            first_name: tickets[0].participant_name || "User",
          },
          item_details: ticketItems,
          enabled_payments: ["credit_card"],
          callbacks: {
            finish: `${origin}/events?tab=tickets`,
          },
          expiry: {
            start_time: orderTime,
            unit: "minute",
            duration: expiryMinutes,
          },
        };
        console.log(
          "Midtrans Snap request for event:",
          JSON.stringify(snapData, null, 2)
        );
        const snapApiUrl =
          environment === "production"
            ? "https://app.midtrans.com/snap/v1/transactions"
            : "https://app.sandbox.midtrans.com/snap/v1/transactions";
        const snapResponse = await fetch(snapApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify(snapData),
        });
        if (!snapResponse.ok) {
          const errorText = await snapResponse.text();
          console.error("Midtrans Snap error:", errorText);
          throw new Error(`Failed to create credit card payment: ${errorText}`);
        }
        const snapResult = await snapResponse.json();
        console.log(
          "Midtrans Snap response:",
          JSON.stringify(snapResult, null, 2)
        );
        // Store payment record
        const { error: insertError } = await supabaseService
          .from("payments")
          .insert({
            user_id: user.id,
            midtrans_order_id: orderId,
            amount: totalAmount,
            status: "pending",
            payment_method: "credit_card",
            payment_type: "event",
            event_id,
            ticket_count: tickets.length,
            currency: "IDR",
            actions: [
              {
                name: "redirect",
                url: snapResult.redirect_url,
              },
            ],
            expires_at: expiresAt,
            is_production: environment === "production",
          });
        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to store payment: ${insertError.message}`);
        }
        // Get the created payment record
        const { data: createdPayment, error: fetchError } =
          await supabaseService
            .from("payments")
            .select("id")
            .eq("midtrans_order_id", orderId)
            .single();
        if (fetchError || !createdPayment) {
          console.error("Failed to fetch payment:", fetchError);
          throw new Error("Failed to fetch payment record");
        }
        // Book quota for each ticket
        for (const ticket of tickets) {
          const { data: bookResult, error: bookError } =
            await supabaseService.rpc("book_event_quota", {
              p_ticket_category_id: ticket.ticket_category_id,
              p_payment_id: createdPayment.id,
              p_ticket_count: 1,
            });
          if (bookError || !bookResult?.success) {
            console.error("Error booking quota:", bookError || bookResult);
            throw new Error(bookResult?.error || "Failed to book event quota");
          }
        }
        console.log(
          "✅ Event credit card payment created successfully with quota booked"
        );
        return new Response(
          JSON.stringify({
            payment_id: createdPayment.id,
            orderId,
            transactionStatus: "pending",
            paymentMethod: "credit_card",
            amount: totalAmount,
            snapToken: snapResult.token,
            snapUrl: snapResult.redirect_url,
            redirectUrl: snapResult.redirect_url,
            eventSlug: event.slug,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          }
        );
      }
      let paymentType = "gopay";
      if (paymentChannel === "va" && selectedBank !== "mandiri") {
        paymentType = "bank_transfer";
      } else if (selectedBank === "mandiri") {
        paymentType = "echannel";
      }
      const generateRandomBillKey = () => {
        return Math.floor(
          100000000000000 + Math.random() * 900000000000000
        ).toString();
      };
      // 🧾 Build Midtrans Charge Payload
      const midtransChargeData = {
        payment_type: paymentType,
        transaction_details: {
          order_id: orderId,
          gross_amount: totalAmount,
        },
        customer_details: {
          email: user.email,
          first_name: tickets[0].participant_name || "User",
        },
        item_details: ticketItems,
        custom_expiry: {
          order_time: orderTime,
          expiry_duration: expiryMinutes,
          unit: "minute",
        },
      };
      // Add payment-specific fields
      if (paymentChannel === "va") {
        if (selectedBank === "mandiri") {
          midtransChargeData.echannel = {
            bill_info1: "Payment For:",
            bill_info2: "Event Ticket",
            bill_key: generateRandomBillKey,
          };
        } else {
          midtransChargeData.bank_transfer = {
            bank: selectedBank || "bni",
          };
        }
      } else if (paymentMethod === "gopay") {
        midtransChargeData.gopay = {
          enable_callback: true,
          callback_url: `${origin}/events/payment/complete`,
        };
      }
      console.log(
        "Midtrans charge request:",
        JSON.stringify(midtransChargeData, null, 2)
      );
      // 🏦 Call Midtrans Charge API
      const midtransApiUrl =
        environment === "production"
          ? "https://api.midtrans.com/v2/charge"
          : "https://api.sandbox.midtrans.com/v2/charge";
      const midtransResponse = await fetch(midtransApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
        },
        body: JSON.stringify(midtransChargeData),
      });
      if (!midtransResponse.ok) {
        const errorText = await midtransResponse.text();
        console.error("Midtrans error:", errorText);
        throw new Error(`Failed to create payment: ${errorText}`);
      }
      const chargeData = await midtransResponse.json();
      console.log(
        "Midtrans charge response:",
        JSON.stringify(chargeData, null, 2)
      );
      // Extract payment details
      let vaNumber = null;
      let qrCodeUrl = null;
      let deeplink = null;
      let actions = null;
      let billerCode = null;
      let billKey = null;
      if (paymentChannel === "va") {
        vaNumber =
          chargeData.va_numbers?.[0]?.va_number || chargeData.permata_va_number;
        // For Mandiri echannel, extract biller_code and bill_key
        if (selectedBank === "mandiri") {
          billerCode = chargeData.biller_code;
          billKey = chargeData.bill_key;
        }
      } else if (paymentChannel === "gopay") {
        qrCodeUrl = chargeData.actions?.find(
          (a) => a.name === "generate-qr-code"
        )?.url;
        deeplink = chargeData.actions?.find(
          (a) => a.name === "deeplink-redirect"
        )?.url;
        actions = chargeData.actions;
      }
      let expiresAtFinal;
      if (chargeData.expiry_time) {
        // Ubah format jadi ISO-compatible dan tambahkan offset WIB (+07:00)
        const expiryWithOffset = `${chargeData.expiry_time.replace(
          " ",
          "T"
        )}+07:00`;
        expiresAtFinal = new Date(expiryWithOffset);
      } else {
        // fallback default
        expiresAtFinal = new Date(Date.now() + expiryMinutes * 60 * 1000);
      }
      // ✅ Only insert payment after successful Midtrans charge
      // Store ticket details in metadata for later use by webhook
      const { data: payment1, error: paymentError } = await supabaseService
        .from("payments")
        .insert({
          user_id: user.id,
          midtrans_order_id: orderId,
          midtrans_transaction_id: chargeData.transaction_id,
          amount: totalAmount,
          status:
            chargeData.transaction_status === "settlement" ? "paid" : "pending",
          payment_method: paymentMethod,
          payment_type: "event",
          event_id,
          ticket_count: tickets.length,
          currency: "IDR",
          va_number: vaNumber,
          qr_code_url: qrCodeUrl,
          deeplink_url: deeplink,
          actions,
          biller_code: billerCode,
          bill_key: billKey,
          expires_at: chargeData.expiry_time ? expiresAtFinal : expiresAt,
          is_production: environment === "production",
          payment_code: selectedBank || "bni",
          metadata: {
            tickets: tickets.map((t) => ({
              ticket_category_id: t.ticket_category_id,
              participant_name: t.participant_name,
              participant_email: t.participant_email,
              participant_phone: t.participant_phone,
              participant_ktp: t.participant_ktp || null,
            })),
            event_slug: event.slug,
          },
        })
        .select()
        .single();
      if (paymentError) {
        console.error("Failed to save payment:", paymentError);
        throw new Error("Failed to save payment record");
      }
      // Book quota for each ticket
      for (const ticket of tickets) {
        const { data: bookResult, error: bookError } =
          await supabaseService.rpc("book_event_quota", {
            p_ticket_category_id: ticket.ticket_category_id,
            p_payment_id: payment1.id,
            p_ticket_count: 1,
          });
        if (bookError || !bookResult?.success) {
          console.error("Error booking quota:", bookError || bookResult);
          throw new Error(bookResult?.error || "Failed to book event quota");
        }
      }
      console.log(
        `✅ Event payment ${payment1.id} created with quota booked, awaiting webhook confirmation for registration`
      );
      return new Response(
        JSON.stringify({
          payment_id: payment1.id,
          order_id: orderId,
          transaction_id: chargeData.transaction_id,
          transaction_status: chargeData.transaction_status,
          payment_method: paymentMethod,
          amount: totalAmount,
          va_number: vaNumber,
          qr_code_url: qrCodeUrl,
          deeplink,
          actions,
          expiry_time: chargeData.expiry_time,
          expires_at: expiresAt.toISOString(),
          eventSlug: event.slug,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }
    // Handle one-time payments (like sequencer purchases)
    if (isOneTimePayment) {
      if (!amount || !description) {
        throw new Error(
          "Amount and description are required for one-time payments"
        );
      }
      // Generate unique order ID for one-time payment (shortened to avoid length issues)
      const orderId = `seq-${Date.now()}-${user.id.substring(0, 6)}`;
      
      // Determine environment and get appropriate Midtrans keys
      const origin =
        req.headers.get("origin") || req.headers.get("referer") || "";
      let environment = "staging";
      const hostname = new URL(origin).hostname; // arrangely.io, staging.arrangely.io, localhost
      if (hostname === "arrangely.io") {
        environment = "production";
      } else if (hostname === "staging.arrangely.io") {
        environment = "staging";
      }
      const midtransServerKey =
        environment === "production"
          ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY")
          : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
      if (!midtransServerKey) {
        throw new Error(`Midtrans ${environment} server key not configured`);
      }
      const midtransData = {
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        credit_card: {
          secure: true,
        },
        customer_details: {
          email: user.email,
          first_name: user.user_metadata?.display_name || "User",
        },
        item_details: item_details || [
          {
            id: `seq_${sequencerId?.substring(0, 8) || "item"}`,
            price: amount,
            quantity: 1,
            name:
              description.length > 50
                ? description.substring(0, 47) + "..."
                : description,
          },
        ],
      };
      // Handle GoPay linking using Core API v2/pay/account
      if (paymentMethod === "gopay-link") {
        
        const coreApiData = {
          payment_type: "gopay",
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          gopay: {
            enable_callback: true,
            callback_url: `${req.headers.get(
              "origin"
            )}/payment-callback?method=gopay&order_id=${orderId}&type=account_link`,
          },
          customer_details: {
            email: user.email,
            first_name: user.user_metadata?.display_name || "User",
          },
        };
        // Use Core API for GoPay account linking
        const coreApiUrl =
          environment === "production"
            ? "https://api.midtrans.com/v2/pay/account"
            : "https://api.sandbox.midtrans.com/v2/pay/account";
        
        const coreApiResponse = await fetch(coreApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
          },
          body: JSON.stringify(coreApiData),
        });
        if (!coreApiResponse.ok) {
          const errorText = await coreApiResponse.text();
          console.error("Midtrans Core API error:", errorText);
          throw new Error(`Failed to create GoPay account link: ${errorText}`);
        }
        const coreApiResult = await coreApiResponse.json();
        
        // Store payment record for GoPay linking
        const { error: insertError } = await supabaseService
          .from("payments")
          .insert({
            user_id: user.id,
            midtrans_order_id: orderId,
            amount: amount,
            status: "pending",
            payment_method: "gopay_link",
            payment_type: "sequencer",
            sequencer_id: sequencerId,
            currency: "IDR",
            discount_code_id: discountId,
            is_production: environment === "production",
          });
        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to insert payment: ${insertError.message}`);
        }
        return new Response(
          JSON.stringify({
            redirect_url: coreApiResult.actions?.find(
              (action) => action.name === "deeplink-redirect"
            )?.url,
            qr_string: coreApiResult.actions?.find(
              (action) => action.name === "generate-qr-code"
            )?.url,
            orderId,
            amount,
            payment_type: "gopay_link",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
            status: 200,
          }
        );
      } else if (paymentMethod === "card-save") {
        midtransData.credit_card = {
          secure: true,
          save_card: true,
        };
        midtransData.enabled_payments = ["credit_card"];
      }
      // Add callbacks
      midtransData.callbacks = {
        finish: `${req.headers.get(
          "origin"
        )}/arrangement/${sequencerId}?payment=success&order_id=${orderId}`,
        error: `${req.headers.get(
          "origin"
        )}/arrangement/${sequencerId}?payment=error`,
        pending: `${req.headers.get(
          "origin"
        )}/arrangement/${sequencerId}?payment=pending`,
      };
      console.log(
        "Midtrans request data for one-time payment:",
        JSON.stringify(midtransData, null, 2)
      );
      // Create Midtrans Snap transaction
      const midtransApiUrl =
        environment === "production"
          ? "https://app.midtrans.com/snap/v1/transactions"
          : "https://app.sandbox.midtrans.com/snap/v1/transactions";
      const midtransResponse = await fetch(midtransApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
        },
        body: JSON.stringify(midtransData),
      });
      if (!midtransResponse.ok) {
        const errorText = await midtransResponse.text();
        console.error("Midtrans error response:", errorText);
        throw new Error(`Failed to create payment session: ${errorText}`);
      }
      const snapData = await midtransResponse.json();
      
      // Store payment record in database for one-time payment
      const { error: insertError } = await supabaseService
        .from("payments")
        .insert({
          user_id: user.id,
          midtrans_order_id: orderId,
          amount: amount,
          status: "pending",
          payment_method: "snap",
          payment_type: "sequencer",
          sequencer_id: sequencerId,
          currency: "IDR",
          discount_code_id: discountId,
          is_production: environment === "production",
        });
      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to insert payment: ${insertError.message}`);
      }
      return new Response(
        JSON.stringify({
          snapToken: snapData.token,
          redirect_url: snapData.redirect_url,
          orderId,
          amount,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }
    // Handle subscription payments (existing logic)
    const paymentType = event_id
      ? "event"
      : isLessonPayment && lessonId
      ? "lesson"
      : planId
      ? "subscription"
      : isOneTimePayment
      ? "one_time"
      : null;
    if (!paymentType) {
      throw new Error(
        "Invalid payment request: Missing event_id, lessonId, planId, or payment type."
      );
    }
    // Get subscription plan
    
    const { data: plan, error: planError } = await supabaseService
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();
    console.log("Plan query result:", {
      plan,
      planError,
    });
    if (planError || !plan) {
      console.error("Plan error:", planError);
      throw new Error(
        `Invalid subscription plan: ${planError?.message || "Plan not found"}`
      );
    }
    let finalAmount = plan.price;
    let discountAmount = 0;
    
    // Check if user already has a successful payment or active subscription
    // const { data: existingPayments } = await supabaseService.from("payments").select("id").eq("user_id", user.id).eq("status", "success").limit(1);
    // const { data: activeSubscription } = await supabaseService.from("subscriptions").select("id, status").eq("user_id", user.id).eq("status", "active").limit(1);
    // if (existingPayments && existingPayments.length > 0) {
    //   throw new Error("You already have a successful payment. Please check your subscription status.");
    // }
    // if (activeSubscription && activeSubscription.length > 0) {
    //   throw new Error("You already have an active subscription.");
    // }
    // Apply discount if provided
    if (discountCode) {
      const planCycle = plan.interval_type === "month" ? "monthly" : "yearly";
      const { data: discount } = await supabaseService
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode)
        .eq("is_active", true)
        .eq("billing_cycle", planCycle)
        .gte("valid_until", new Date().toISOString())
        .single();
      if (discount) {
        if (discount.discount_type === "percentage") {
          discountAmount = Math.floor(
            (plan.price * discount.discount_value) / 100
          );
        } else {
          discountAmount = discount.discount_value;
        }
        finalAmount = Math.max(0, plan.price - discountAmount);
        console.log("Discount applied:", {
          discountAmount,
          finalAmount,
        });
      }
    }
    // Generate unique order ID (shortened to avoid length issues)
    const orderId = `sub-${Date.now()}-${user.id.substring(0, 6)}`;
    
    // Determine environment and get appropriate Midtrans keys
    const origin =
      req.headers.get("origin") || req.headers.get("referer") || "";
    let environment = "staging";
    const hostname = new URL(origin).hostname; // arrangely.io, staging.arrangely.io, localhost
    if (hostname === "arrangely.io") {
      environment = "production";
    } else if (hostname === "staging.arrangely.io") {
      environment = "staging";
    }
    
    const midtransServerKey =
      environment === "production"
        ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY")
        : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
    
    
    if (!midtransServerKey) {
      throw new Error(`Midtrans ${environment} server key not configured`);
    }
    const midtransData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        email: user.email,
        first_name: user.user_metadata?.display_name || "User",
      },
      item_details: [
        {
          id: plan.id.substring(0, 20),
          price: finalAmount,
          quantity: 1,
          name:
            plan.name.length > 50
              ? plan.name.substring(0, 47) + "..."
              : plan.name,
        },
      ],
    };
    // Handle different payment methods for subscriptions
    if (paymentMethod === "gopay-link") {
      midtransData.gopay = {
        enable_callback: true,
        callback_url: `${req.headers.get(
          "origin"
        )}/payment-callback?method=gopay&order_id=${orderId}&type=subscription`,
      };
      midtransData.enabled_payments = ["gopay"];
    } else if (paymentMethod === "card-save") {
      midtransData.credit_card = {
        secure: true,
        save_card: true,
      };
      midtransData.enabled_payments = ["credit_card"];
    } else if (paymentMethod === "one-time") {
      // For one-time payments, don't restrict payment methods
      // but if recurring is enabled, still enable save_card
      if (enableRecurring) {
        midtransData.credit_card = {
          secure: true,
          save_card: true,
        };
      }
    }
    // Add callbacks
    midtransData.callbacks = {
      finish: `${req.headers.get(
        "origin"
      )}/pricing?status=check_payment&order_id=${orderId}`,
      error: `${req.headers.get("origin")}/pricing?error=payment_failed`,
      pending: `${req.headers.get("origin")}/pricing?status=pending`,
    };
    console.log(
      "Midtrans request data:",
      JSON.stringify(midtransData, null, 2)
    );
    // Create Midtrans Snap transaction
    const midtransApiUrl =
      environment === "production"
        ? "https://app.midtrans.com/snap/v1/transactions"
        : "https://app.sandbox.midtrans.com/snap/v1/transactions";
    
    const midtransResponse = await fetch(midtransApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(midtransServerKey + ":")}`,
      },
      body: JSON.stringify(midtransData),
    });
    
    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error("Midtrans error response:", errorText);
      console.error("Midtrans error status:", midtransResponse.status);
      throw new Error(`Failed to create payment session: ${errorText}`);
    }
    const snapData = await midtransResponse.json();
    
    // Create pending subscription first with auto_payment based on enableRecurring
    const { data: subscription } = await supabaseService
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id: planId,
        status: "pending",
        auto_payment_enabled: enableRecurring === true,
      })
      .select()
      .single();
    // Store payment record in database with subscription link
    const { error: insertError } = await supabaseService
      .from("payments")
      .insert({
        user_id: user.id,
        subscription_id: subscription.id,
        midtrans_order_id: orderId,
        amount: finalAmount,
        status: "pending",
        payment_method: "snap",
        payment_type: paymentType,
        discount_code_id: discountId,
        is_production: environment === "production" ? true : false,
      });
    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert payment: ${insertError.message}`);
    }
    console.log("Payment session created:", {
      orderId,
      amount: finalAmount,
      discountAmount,
      snapToken: snapData.token,
    });
    return new Response(
      JSON.stringify({
        snapToken: snapData.token,
        snapUrl: snapData.redirect_url,
        orderId,
        amount: finalAmount,
        discountAmount,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-midtrans-payment:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
};
serve(handler);
