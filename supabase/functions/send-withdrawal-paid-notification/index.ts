import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { withdrawal_id, creator_id, amount, method } = await req.json();
    console.log("Processing withdrawal paid notification:", {
      withdrawal_id,
      creator_id,
      amount,
      method
    });
    // Get creator profile information
    const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name, user_id').eq('user_id', creator_id).single();
    if (profileError) {
      console.error("Error fetching creator profile:", profileError);
      throw new Error("Failed to fetch creator profile");
    }
    // Get creator email from auth.users (using service role)
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(creator_id);
    if (userError || !user?.email) {
      console.error("Error fetching creator email:", userError);
      throw new Error("Failed to fetch creator email");
    }
    const creatorName = profile?.display_name || "Creator";
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);

    // Send email using fetch to Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Withdrawal Paid</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Withdrawal Paid!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <h2 style="color: #333; margin-top: 0;">Hello ${creatorName}!</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Great news! Your withdrawal request has been processed and paid successfully.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #28a745;">📋 Withdrawal Details</h3>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
            <p style="margin: 5px 0;"><strong>Method:</strong> ${method.charAt(0).toUpperCase() + method.slice(1)}</p>
            <p style="margin: 5px 0;"><strong>Withdrawal ID:</strong> ${withdrawal_id}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;"> PAID</span></p>
          </div>
          
          <p style="font-size: 16px; margin: 20px 0;">
            The payment has been sent to your registered ${method} account. Please allow 1-3 business days for the funds to appear in your account.
          </p>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #1976d2;">
              <strong>💡 Tip:</strong> You can track all your withdrawals and earnings in your Creator Dashboard.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://arrangely.io/creator-dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Creator Dashboard
            </a>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #6c757d; margin: 0;">
              Thank you for being part of the Arrangely community!<br>
              <strong>The Arrangely Team</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Arrangely Withdrawals <info@arrangely.io>",
        to: [user.email],
        subject: "💰 Withdrawal Request Paid - Arrangely",
        html: emailHtml
      })
    });

    const emailResult = await emailResponse.json();
    
    return new Response(JSON.stringify({
      success: true,
      message: "Withdrawal paid notification sent successfully",
      email_id: emailResponse.messageId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-withdrawal-paid-notification function:", error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
serve(handler);
