import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "https://esm.sh/nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { conversationId, content, adminName, imageUrl } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Ambil data Conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("title, user_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) throw new Error("Conversation not found");

    // 2. Ambil Email User
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(conversation.user_id);

    if (userError || !userData.user?.email)
      throw new Error("User email not found");
    const userEmail = userData.user.email;

    // 3. [PERBAIKAN] Logic Download Gambar untuk Attachment
    const attachments = [];
    if (imageUrl) {
      try {
        
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          // Ambil nama file dari URL atau pakai default
          const filename =
            imageUrl.split("/").pop().split("?")[0] || "attachment.jpg";

          attachments.push({
            filename: filename,
            content: new Uint8Array(imgBuffer),
          });
        }
      } catch (e) {
        console.error("Failed to download attachment image:", e);
      }
    }

    // 4. Setup Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: "info@mg.arrangely.io",
        pass: Deno.env.get("SMTP_MAILGUN_PASSWORD"),
      },
    });

    // 5. Template Email
    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb; border-bottom: 1px solid #eee; padding-bottom: 10px;">Balasan Baru pada Tiket Dukungan</h2>
        
        <p>Halo,</p>
        
        <p><strong>${adminName}</strong> (Tim Support) baru saja membalas tiket Anda: <strong>"${
      conversation.title
    }"</strong></p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
          <p style="margin: 0; font-style: italic; color: #475569;">"${content}"</p>
          ${
            imageUrl
              ? '<p style="margin-top: 10px; font-size: 12px; color: #2563eb; font-weight: bold;">📎 [Lihat File Terlampir]</p>'
              : ""
          }
        </div>

        <p>Silakan masuk ke aplikasi Arrangely untuk melihat percakapan lengkap dan membalas pesan ini.</p>
        
        <div style="margin-top: 25px; text-align: center;">
          <a href="https://arrangely.io/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Lihat Tiket</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">Email ini dikirim secara otomatis oleh Arrangely Support System.</p>
      </div>
    `;

    // 6. Kirim Email dengan Attachment
    await transporter.sendMail({
      from: '"Arrangely Support" <support@arrangely.io>',
      to: userEmail,
      subject: `[Support] Balasan baru untuk: ${conversation.title}`,
      html: htmlContent,
      attachments: attachments, // <--- INI KUNCINYA
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
