import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    if (!bodyText) {
      return new Response(JSON.stringify({ error: "Missing request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { 
      creatorId, 
      amount, 
      method, 
      paymentDetails, 
      fee, 
      netAmount 
    } = JSON.parse(bodyText);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get creator profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email:user_id')
      .eq('user_id', creatorId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch creator profile" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user email from auth
    const creatorEmail = user.email;
    const creatorName = profile?.display_name || 'Unknown Creator';

    // Format payment details for display
    const formatPaymentDetails = (details: any, method: string) => {
      switch (method) {
        case 'bank':
          return `
            <strong>Bank Details:</strong><br>
            Bank: ${details.bankName}<br>
            Account Number: ${details.accountNumber}<br>
            Account Holder: ${details.accountHolderName}
          `;
        case 'gopay':
        case 'ovo':
        case 'dana':
          return `
            <strong>E-Wallet Details:</strong><br>
            ${method.toUpperCase()} Number: ${details.phoneNumber}
          `;
        default:
          return 'Payment details not specified';
      }
    };

    // Send email using Resend API
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Arrangely Withdrawals <info@arrangely.io>",
        to: ["admin@arrangely.io"],
        subject: `💰 Withdrawal Request from ${creatorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1; margin: 0;">Arrangely</h1>
              <h2 style="color: #1f2937; margin: 10px 0;">Withdrawal Request</h2>
            </div>

            <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
              <h3 style="color: #1f2937; margin-bottom: 20px;">Creator Information</h3>
              <p><strong>Name:</strong> ${creatorName}</p>
              <p><strong>Email:</strong> ${creatorEmail}</p>
              <p><strong>Creator ID:</strong> ${creatorId}</p>

              <h3 style="color: #1f2937; margin: 30px 0 20px 0;">Withdrawal Details</h3>
              <p><strong>Requested Amount:</strong> IDR ${amount.toLocaleString()}</p>
              <p><strong>Processing Fee:</strong> IDR ${fee.toLocaleString()}</p>
              <p><strong>Net Amount:</strong> IDR ${netAmount.toLocaleString()}</p>
              <p><strong>Withdrawal Method:</strong> ${method.charAt(0).toUpperCase() + method.slice(1)}</p>

              <h3 style="color: #1f2937; margin: 30px 0 20px 0;">Payment Information</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #6366f1;">
                ${formatPaymentDetails(paymentDetails, method)}
              </div>

              <div style="margin-top: 30px; padding: 15px; background: #fef3c7; border-radius: 5px; border-left: 4px solid #f59e0b;">
                <strong>Action Required:</strong> Please process this withdrawal request and transfer the net amount to the provided payment details.
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
              <p>© 2024 Arrangely. Creator earnings withdrawal system.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errorData = await emailRes.text();
      console.error("Resend API error:", errorData);
    }

    // Send Telegram notification
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (telegramChatId) {
      const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (telegramBotToken) {
        try {
          const telegramMessage = `
🏦 *New Withdrawal Request*

👤 *Creator:* ${creatorName}
📧 *Email:* ${creatorEmail}
💰 *Amount:* IDR ${amount.toLocaleString()}
💸 *Fee:* IDR ${fee.toLocaleString()}
📊 *Net Amount:* IDR ${netAmount.toLocaleString()}
🔄 *Method:* ${method.charAt(0).toUpperCase() + method.slice(1)}

*Payment Details:*
${formatPaymentDetails(paymentDetails, method).replace(/<[^>]*>/g, '')}

⚠️ *Action Required:* Please process this withdrawal request.
          `.trim();

          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramChatId,
              message_thread_id: Number(Deno.env.get("TELEGRAM_WITHDRAW_TOPIC_ID")),
              text: telegramMessage,
              parse_mode: 'Markdown'
            })
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
        }
      }
    }

    // Store withdrawal request in database for tracking
    const { error: insertError } = await supabase
      .from('creator_withdrawal_requests')
      .insert({
        creator_id: creatorId,
        amount: amount,
        method: method,
        payment_details: paymentDetails,
        fee: fee,
        net_amount: netAmount,
        status: 'pending',
        is_production: true
      });

    if (insertError) {
      console.error('Error storing withdrawal request:', insertError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Withdrawal request sent to admin successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-withdrawal-request function:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to send withdrawal request",
      details: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
