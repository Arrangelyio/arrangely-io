import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "https://esm.sh/nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // [PERBAIKAN 1]: Terima imageUrl, bukan hasAttachment boolean
    const { songId, commentContent, commenterId, imageUrl } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // [PERBAIKAN 2]: Tambahkan 'id' ke dalam select agar URL tidak undefined
    const { data: song, error: songError } = await supabaseAdmin
      .from("songs")
      .select("id, title, user_id, slug")
      .eq("id", songId)
      .single();

    if (songError || !song) throw new Error("Song not found");

    if (song.user_id === commenterId) {
      return new Response(JSON.stringify({ message: "Self-comment ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: commenterProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", commenterId)
      .single();

    const commenterName = commenterProfile?.display_name || "Someone";

    const { data: creatorUser, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(song.user_id);

    if (userError || !creatorUser.user)
      throw new Error("Creator user not found");
    const creatorEmail = creatorUser.user.email;

    if (!creatorEmail) throw new Error("Creator has no email address");

    // [PERBAIKAN 3]: Persiapkan Attachments
    const attachments = [];
    if (imageUrl) {
      try {
        
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const imgBuffer = await imgRes.arrayBuffer();
          // Ambil nama file dari URL atau default
          const filename =
            imageUrl.split("/").pop().split("?")[0] || "attachment.jpg";

          attachments.push({
            filename: filename,
            content: new Uint8Array(imgBuffer),
          });
        }
      } catch (e) {
        console.error("Failed to fetch attachment image:", e);
      }
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: "info@mg.arrangely.io",
        pass: Deno.env.get("SMTP_MAILGUN_PASSWORD"),
      },
    });

    // Pastikan URL menggunakan ID yang benar
    const songUrl = `https://arrangely.io/arrangement/${song.id}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .header { background: #2563eb; padding: 20px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
            .content { padding: 30px; }
            .comment-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .comment-text { font-style: italic; color: #475569; margin: 0; }
            .attachment-badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-top: 10px; font-weight: bold; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px; }
            .footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Comment on "${song.title}"</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${commenterName}</strong> just left a comment on your arrangement.</p>
              
              <div class="comment-box">
                <p class="comment-text">"${commentContent}"</p>
                ${
                  imageUrl
                    ? `<div class="attachment-badge">📎 See attached image</div>`
                    : ""
                }
              </div>

              <div style="text-align: center;">
                <a href="${songUrl}" class="btn">Reply to Comment</a>
              </div>
            </div>
            <div class="footer">
              <p>Arrangely Notification System</p>
              <p>You received this email because you are the owner of this song.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: '"Arrangely Notifications" <info@arrangely.io>',
      to: creatorEmail,
      subject: `New comment on ${song.title}`,
      html: htmlContent,
      attachments: attachments, // [PERBAIKAN 4]: Lampirkan array attachments
    });

    console.log(
      `✅ Email sent to creator (${creatorEmail}) for song ${song.title}`
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
