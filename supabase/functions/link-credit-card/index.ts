import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const handler = async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Check rate limit first
  const authHeader = req.headers.get("Authorization");
  const rateLimitResult = await checkRateLimit(req, 'link-credit-card', authHeader);
  
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

    const { token_id } = await req.json();
    
    if (!token_id) {
      throw new Error("Token ID is required");
    }

    // Generate unique order ID for card linking
    const orderId = `card-link-${Date.now()}-${user.id.substring(0, 6)}`;
    

    // Determine environment
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let environment = "staging";
    let hostname = "";
    try {
      hostname = origin ? new URL(origin).hostname : "";
    } catch (_e) {
      hostname = "";
    }
    
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

    const baseOrigin = origin || 'https://staging.arrangely.io';

    // Prepare Core API data for One Click Initial Charge
    const coreApiData = {
      payment_type: "credit_card",
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000 // Nominal for card verification (Rp 10,000)
      },
      credit_card: {
        token_id: token_id,
        authentication: true,
        save_token_id: true
      },
      customer_details: {
        email: user.email
      },
      callbacks: {
        finish: `${baseOrigin}/payment-callback?method=card&type=account_link&order_id=${orderId}`
      }
    };

    

    const chargeApiUrl = environment === "production"
      ? "https://api.midtrans.com/v2/charge"
      : "https://api.sandbox.midtrans.com/v2/charge";

    // Create One Click Initial Charge
    
    const chargeResponse = await fetch(chargeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${btoa(midtransServerKey + ":")}`
      },
      body: JSON.stringify(coreApiData)
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      console.error("Charge API error:", errorText);
      throw new Error(`Failed to create One Click Initial Charge: ${errorText}`);
    }

    const chargeResult = await chargeResponse.json();
    
    

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

    // Store linking attempt in database
    // Extract last 4 digits from masked_card if available
    const maskedNumber = chargeResult.masked_card 
      ? `•••• •••• •••• ${chargeResult.masked_card.slice(-4)}` 
      : "•••• •••• •••• ••••";
    
    const { error: insertError } = await supabaseService
      .from("linked_payment_accounts")
      .upsert({
        user_id: user.id,
        account_id: chargeResult.saved_token_id || orderId,
        payment_method: "card",
        status: chargeResult.transaction_status === "capture" ? "linked" : "pending",
        masked_number: maskedNumber
      }, {
        onConflict: "user_id,payment_method"
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert linking record: ${insertError.message}`);
    }

    // Check if 3DS authentication is required
    if (chargeResult.redirect_url) {
      return new Response(JSON.stringify({
        success: true,
        order_id: orderId,
        redirect_url: chargeResult.redirect_url,
        message: "3D Secure authentication required"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: orderId,
      saved_token_id: chargeResult.saved_token_id,
      message: "Credit card linked successfully"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });

  } catch (error: any) {
    console.error("Error in link-credit-card:", error);
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
