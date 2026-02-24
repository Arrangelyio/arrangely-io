import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import nodemailer from "https://esm.sh/nodemailer@6.9.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    
    // Parse request
    const body = await req.json();
    const daysBeforeExpiry = body?.daysBeforeExpiry ?? null;
    
    if (daysBeforeExpiry === null || isNaN(daysBeforeExpiry)) {
      throw new Error("Missing or invalid daysBeforeExpiry parameter");
    }
    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Calculate date range
    const now = new Date();
    const targetUTCDate = now.getUTCDate() + daysBeforeExpiry;
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), targetUTCDate, 0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), targetUTCDate, 23, 59, 59, 999)).toISOString();
    // Query subscriptions
    const { data: expiringSubscriptions, error: subError } = await supabase.from("subscriptions").select(`
    id,
    user_id,
    current_period_end,
    plan_id,
    subscription_plans (
      name,
      price
    ),
    payments (
      id,
      status,
      amount
    )
  `).eq("status", "active").eq("payments.status", "paid").gte("current_period_end", startOfDay).lte("current_period_end", endOfDay);
    console.log({
      startOfDay,
      endOfDay,
      expiringSubscriptions
    });
    if (subError) throw subError;
    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      
      return new Response(JSON.stringify({
        message: `No subscriptions expiring in ${daysBeforeExpiry} days`
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Fetch user profiles
    const userIds = expiringSubscriptions.map((s)=>s.user_id);
    // Query hanya profiles yang diperlukan
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("user_id, email").in("user_id", userIds);
    const userProfileMap = new Map(profiles?.map((profile)=>[
        profile.user_id,
        profile.display_name
      ]) || []);
    // Fetch user emails
    const userEmailMap = new Map(profiles?.map((profile)=>[
        profile.user_id,
        profile.email
      ]) || []);
    // Configure mailer
    const transporter = nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: "info@mg.arrangely.io",
        pass: Deno.env.get("SMTP_MAILGUN_PASSWORD")
      }
    });
    // Template functions
    const getExpiredTemplate = (displayName, planName, expiryDate)=>`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://jowuhdfznveuopeqwzzd.supabase.co/storage/v1/object/public/email-storage/Subscription%20Expired.png"
               alt="Arrangely Expired Banner"
               style="max-width: 100%; height: auto; border-radius: 10px;">
        </div>

        <div style="background: white; padding: 30px; border-radius: 10px;">
          <p>Halo <strong>${displayName}</strong>,</p>
          <p style="font-size: 15px;">Langganan <strong>${planName}</strong> Anda telah <strong>kedaluwarsa pada ${expiryDate}</strong>. 😔</p>
          <p style="font-size: 15px;">Anda tidak bisa lagi menggunakan tools canggih yang membuat latihan dan performance Anda lebih mudah. Coba ingat betapa nyamannya fitur-fitur ini:</p>

          <h3 style="color: #dc2626;">🚨 Apa yang Anda Lewatkan Saat Ini?</h3>
          <ul style="font-size: 15px; color: #4b5563;">
            <li>❌ Live Performance View untuk performance panggung yang mulus.</li>
            <li>❌ Simpan Aransemen dari Community Library (Add to Library) ke Digital Song Book Anda.</li>
            <li>❌ Unlimited PDF Download untuk dicetak dan dibawa ke mana saja.</li>
            <li>❌ Priority Support saat Anda butuh bantuan cepat.</li>
          </ul>

          <p style="font-size: 15px;">Jangan biarkan akses Anda terhenti. Semua manfaat hebat itu hanya dengan satu klik!</p>
          <div style="text-align: center; margin: 30px 0;">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
              <tr>
                <td bgcolor="#6366f1" 
                    style="border-radius: 8px; padding: 14px 35px;">
                  <a href="https://arrangely.io/pricing"
                    style="font-size: 16px; font-weight: bold; color: #ffffff; 
                            text-decoration: none; display: inline-block;">
                    Aktifkan Premium Sekarang
                  </a>
                </td>
              </tr>
            </table>
          </div>

        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 Arrangely. Create beautiful song arrangements with ease.</p>
          <p><a href="https://arrangely.io/pricing" style="color: #6366f1;">Kunjungi Halaman Harga</a></p>
        </div>
      </div>
    `;
    const getReminderTemplate = (displayName, planName, expiryDate)=>`
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #f9fafb; padding: 30px;">
        <!-- Banner -->
        <div style="text-align: center; margin-bottom: 25px;">
          <img src="https://jowuhdfznveuopeqwzzd.supabase.co/storage/v1/object/public/email-storage/email%20banner%20expiring%20subscription.png"
               alt="Subscription Expiring Banner" style="width: 100%; border-radius: 8px;">
        </div>

        <div style="background: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
          <h2 style="color: #dc2626; text-align: center;">🚨 Peringatan Penting!</h2>

          <p>Halo <strong>${displayName}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.6;">
            Kami ingin mengingatkan Anda bahwa langganan <strong>${planName}</strong> Arrangely Anda akan segera berakhir dalam 
            <strong>${daysBeforeExpiry}</strong> hari kalender ke depan.
          </p>

          <h3 style="margin-top: 25px;">📅 Detail Langganan Anda:</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Tipe Langganan</td>
              <td style="padding: 8px;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #374151;">Tanggal Kedaluwarsa</td>
              <td style="padding: 8px;">${expiryDate}</td>
            </tr>
          </table>

          <p style="font-size: 15px; line-height: 1.6; margin-top: 20px;">
            Setelah tanggal <strong>${expiryDate}</strong>, Anda akan kehilangan akses ke semua fitur premium yang sangat membantu perjalanan bermusik Anda.
          </p>

          <p style="font-weight: bold;">Pastikan Anda tidak kehilangan akses ke fitur-fitur penting seperti:</p>
          <ul style="color: #4b5563; font-size: 14px;">
            <li>🎹 Live Performance View</li>
            <li>💾 Save Arrangement Tanpa Batas</li>
            <li>📄 Unlimited PDF Download</li>
            <li>⚡ Priority Support</li>
          </ul>

          <div style="text-align: center; margin: 35px 0;">
            <a href="https://arrangely.io/pricing" 
               style="background: #6366f1; color: white; padding: 14px 40px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 16px;">
              Perpanjang Langganan Sekarang
            </a>
          </div>

          <p style="font-size: 14px;">Jika Anda memiliki pertanyaan mengenai perpanjangan atau pembayaran, silakan hubungi tim dukungan kami.</p>
          <p>Salam hangat,<br><strong>Tim Arrangely</strong></p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2025 Arrangely. Create beautiful song arrangements with ease.</p>
          <p><a href="https://arrangely.io/pricing" style="color: #6366f1;">Kunjungi Halaman Harga</a></p>
        </div>
      </div>
    `;
    // Send emails
    let successCount = 0;
    let failCount = 0;
    for (const subscription of expiringSubscriptions){
      const userEmail = userEmailMap.get(subscription.user_id);
      if (!userEmail) continue;
      const displayName = userProfileMap.get(subscription.user_id) || "Pengguna";
      const planName = subscription.subscription_plans?.name || "Premium";
      const expiryDate = new Date(subscription.current_period_end).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const isExpired = daysBeforeExpiry === 0;
      const subject = isExpired ? "❌ Akses Anda Hilang: Langganan Arrangely Premium Sudah Berakhir." : "🚨 Peringatan: Langganan Arrangely Premium Akan Segera Berakhir!";
      const html = isExpired ? getExpiredTemplate(displayName, planName, expiryDate) : getReminderTemplate(displayName, planName, expiryDate);
      try {
        await transporter.sendMail({
          from: '"Arrangely" <info@arrangely.io>',
          to: userEmail,
          subject,
          html
        });
        successCount++;
        
      } catch (err) {
        failCount++;
        console.error(`❌ Failed to send email to ${userEmail}:`, err);
      }
    }
    return new Response(JSON.stringify({
      success: true,
      successCount,
      failCount,
      totalSubscriptions: expiringSubscriptions.length,
      message: `Emails sent for ${daysBeforeExpiry} days before expiry`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-subscription-reminders function:", error);
    return new Response(JSON.stringify({
      error: "Failed to send subscription reminder emails",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
