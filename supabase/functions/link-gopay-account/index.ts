import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    
    // Create Supabase client
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    // ✅ Auth header and token
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) throw new Error("User not authenticated");
    // ✅ Parse request body
    const { amount, description, phone_number } = await req.json();
    if (!amount || !description) throw new Error("Amount and description are required");
    if (!phone_number) throw new Error("Phone number is required");
    // ✅ Determine environment
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let environment = "staging";
    let hostname = "";
    try {
      hostname = origin ? new URL(origin).hostname : "";
    } catch  {
      hostname = "";
    }
    if (hostname === "arrangely.io") environment = "production";
    else if (hostname === "staging.arrangely.io") environment = "staging";
    const midtransServerKey = environment === "production" ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY") : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
    if (!midtransServerKey) throw new Error(`Midtrans ${environment} server key not configured`);
    // ✅ Format phone number
    const rawPhone = String(phone_number).replace(/\D/g, "");
    const normalizedPhone = rawPhone.replace(/^0+/, "");
    const phoneOnly = normalizedPhone.startsWith("62") ? normalizedPhone.substring(2) : normalizedPhone;
    const baseOrigin = origin || "https://staging.arrangely.io";
    const maskedNumber = normalizedPhone.replace(/^62/, "0");
    // ✅ Supabase service client
    const supabaseService = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        persistSession: false
      }
    });
    // ✅ Check existing account
    const { data: existingAccount } = await supabaseService.from("linked_payment_accounts").select("*").eq("user_id", user.id).eq("payment_method", "gopay").single();
    
    // ✅ If not exists, create new account link
    if (!existingAccount) {
      
      const createAccountUrl = environment === "production" ? "https://api.midtrans.com/v2/pay/account" : "https://api.sandbox.midtrans.com/v2/pay/account";
      const createAccountBody = {
        payment_type: "gopay",
        gopay_partner: {
          phone_number: phoneOnly,
          country_code: "62",
          redirect_url: `https://staging.arrangely.io/payment-callback?method=gopay&type=account_link`
        }
      };
      
      // ✅ Send POST to Midtrans
      const createAccountResponse = await fetch(createAccountUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(midtransServerKey + ":")}`
        },
        body: JSON.stringify(createAccountBody)
      });
      const rawResponseText = await createAccountResponse.text();
      
      if (!createAccountResponse.ok) {
        throw new Error(`Failed to create GoPay account: ${rawResponseText}`);
      }
      // ✅ Parse response JSON
      let accountData = {};
      try {
        accountData = JSON.parse(rawResponseText);
      } catch (err) {
        console.error("❌ Failed to parse JSON from Midtrans:", err);
        throw new Error(`Invalid JSON response: ${rawResponseText}`);
      }
      
      console.log("🪵 Response analysis:", {
        status_code: accountData.status_code,
        account_status: accountData.account_status,
        has_actions: !!(accountData.actions && accountData.actions.length)
      });
      // ✅ Save to DB (always store response)
      const { error: insertError } = await supabaseService.from("linked_payment_accounts").upsert({
        user_id: user.id,
        account_id: accountData.account_id,
        payment_method: "gopay",
        status: accountData.account_status === "ENABLED" ? "linked" : "pending",
        masked_number: maskedNumber,
        account_details: {
          account_status: accountData.account_status,
          payment_type: accountData.payment_type,
          metadata: accountData.metadata
        }
      }, {
        onConflict: "user_id,payment_method"
      });
      if (insertError) {
        console.error("Database error:", insertError);
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
      // ✅ Handle ENABLED accounts (already linked)
      if (accountData.account_status === "ENABLED") {
        
        return new Response(JSON.stringify({
          success: true,
          account_id: accountData.account_id,
          status: "linked",
          message: "GoPay account already linked and ready to use."
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 200
        });
      }
      // ✅ Handle new accounts (need activation link)
      const actions = accountData.actions || [];
      const redirectAction = actions.find((a)=>a.name === "activation-deeplink") || actions.find((a)=>a.name === "activation-link-url") || actions.find((a)=>a.name === "activation-link-app");
      const redirectUrl = redirectAction?.url;
      if (!redirectUrl) {
        console.error("No redirect URL found in Midtrans response", accountData);
        throw new Error("Failed to get GoPay activation URL (account not ENABLED and no activation link)");
      }
      
      
      return new Response(JSON.stringify({
        success: true,
        account_id: accountData.account_id,
        redirect_url: redirectUrl,
        message: "GoPay account created. Please complete activation in GoPay app."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // ✅ Existing account is already linked
    if (existingAccount.status === "linked" || existingAccount.status === "active") {
      
      return new Response(JSON.stringify({
        success: true,
        account_id: existingAccount.account_id,
        status: existingAccount.status,
        message: "GoPay account already linked and ready to use."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
  } catch (error) {
    console.error("❌ Error in link-gopay-account:", error);
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
