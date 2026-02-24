import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    
    const bodyText = await req.text();
    const { email, creatorName } = JSON.parse(bodyText);

    if (!email || !creatorName) {
      console.error("Missing required fields:", {
        email: !!email,
        creatorName: !!creatorName
      });
      return new Response(JSON.stringify({
        error: "Email and creator name are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Configure SMTP client with Mailgun
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.mailgun.org",
        port: 587,
        tls: true,
        auth: {
          username: "info@mg.arrangely.io",
          password: Deno.env.get("SMTP_MAILGUN_PASSWORD") || "",
        },
      },
    });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #6366f1; margin: 0;">Arrangely</h1>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">
              Halo ${creatorName},
            </h2>

            <p style="color: #4b5563; font-size: 16px; margin-bottom: 20px;">
              Selamat! 🎉 Sekarang kamu sudah menjadi Creator Profesional di Arrangely.<br>
              Artinya, setiap karya musikmu bisa menghasilkan benefit nyata buat kamu.
            </p>

            <div style="background: white; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px;">✨ Benefit yang kamu dapatkan:</h3>
              
              <ul style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                <li style="margin-bottom: 10px;"><strong>Rp 75.000</strong> untuk setiap lagu yang kamu publish di Arrangely.</li>
                <li style="margin-bottom: 10px;"><strong>Rp 250</strong> setiap kali ada pengguna yang menambahkan lagumu ke Library mereka.</li>
                <li style="margin-bottom: 10px;"><strong>Promo Code khusus</strong> yang bisa kamu bagikan ke followers, untuk memperluas jangkauan karyamu.</li>
              </ul>
            </div>

            <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-bottom: 15px;">🚀 Apa yang harus kamu lakukan sekarang?</h3>
              
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 15px;">
                <strong>Saatnya upload lagu pertamamu di Arrangely!</strong><br>
                Semakin cepat kamu publish, semakin cepat juga kamu bisa menikmati benefitnya. Gunakan kesempatan ini untuk engage dengan fans, bagikan promo code-mu, dan tunjukkan karya terbaikmu ke komunitas musik Indonesia.
              </p>
              
              <p style="color: #4b5563; font-size: 16px;">
                Arrangely hadir untuk mendukung perjalanan musikmu. Yuk, mulai sekarang!
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arrangely.io/editor" style="background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                👉 Upload Lagu Pertamamu Sekarang
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
              Salam hangat,<br>
              <strong>Tim Arrangely 🎶</strong>
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            <p>© 2024 Arrangely. Create beautiful song arrangements with ease.</p>
          </div>
        </div>
      `;

    await client.send({
      from: "Arrangely <info@arrangely.io>",
      to: email,
      subject: "Selamat! Kamu Resmi Jadi Creator Profesional di Arrangely 🎶",
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    
    return new Response(JSON.stringify({
      success: true,
      message: "Creator congratulations email sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-creator-congratulations function:", error);
    return new Response(JSON.stringify({
      error: "Failed to send creator congratulations email",
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