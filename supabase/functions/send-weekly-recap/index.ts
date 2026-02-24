import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import nodemailer from "https://esm.sh/nodemailer@6.9.9";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
function getYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
async function fetchAllAuthUsers(supabase) {
  const { data, error } = await supabase.rpc("get_admin_users_with_emails"); // panggil function di Postgres
  if (error) {
    throw new Error(`Error fetching auth users: ${error.message}`);
  }
  return data ?? [];
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Get trending songs (top 5 by views_count)
    const { data: trendingSongs, error: songsError } = await supabase.from("songs").select(`
        id,
        title,
        artist,
        views_count,
        youtube_link,
        slug
      `).eq("is_public", true).eq("is_production", true).order("views_count", {
      ascending: false
    }).limit(5);
    if (songsError) {
      console.error("Error fetching trending songs:", songsError);
      throw songsError;
    }
    if (!trendingSongs || trendingSongs.length === 0) {
      
      return new Response(JSON.stringify({
        message: "No trending songs to send"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Get all users with verified emails
    const allAuthUsers = await fetchAllAuthUsers(supabase);
    const totalFetched = allAuthUsers.length;
    
    // Hanya kirim ke user tertentu untuk testing
    // Kirim hanya ke 1 email untuk testing
    const verifiedUsers = allAuthUsers;
    if (verifiedUsers.length === 0) {
      
      return new Response(JSON.stringify({
        message: "No users to send emails to"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Configure Nodemailer with Mailgun SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.mailgun.org",
      port: 587,
      secure: false,
      auth: {
        user: "info@mg.arrangely.io",
        pass: Deno.env.get("SMTP_MAILGUN_PASSWORD")
      }
    });
    // Random subject lines
    const subjectLines = [
      "🏆 Top 5 Aransemen Paling Populer Minggu Ini! (Wajib Cek!)",
      "🎼 Lagu Apa yang Paling Banyak Dilihat? Cek Raport Mingguan Arrangely!",
      "Inspirasi Mingguan Anda: 5 Aransemen Terbaik Pilihan Komunitas!"
    ];
    // Generate trending songs HTML with cards
    const songsHTML = trendingSongs.map((song, index)=>{
      // Dapatkan thumbnail dari youtube_link kalau youtube_thumbnail belum ada
      let thumbnail = null;
      if (song.youtube_link) {
        const videoId = getYouTubeVideoId(song.youtube_link);
        if (videoId) {
          thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
      }
      return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" 
      style="margin-bottom: 20px; background: #ffffff; border-radius: 12px; 
             overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <tr>
        <!-- Thumbnail di kiri -->
        <td style="width: 35%; vertical-align: middle;">
          ${thumbnail ? `
            <img src="${thumbnail}" alt="${song.title}" 
                 style="width: 100%; height: 120px; object-fit: cover; display: block;" />
          ` : ''}
        </td>

        <!-- Konten di kanan -->
        <td style="padding: 15px 20px; width: 65%; vertical-align: middle;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="top" style="font-size: 18px; font-weight: bold; color: #1f2937;">
                <span style="color: #6366f1; margin-right: 5px;">#${index + 1}</span> 
                ${song.title}
              </td>
            </tr>
            <tr>
              <td style="color: #6b7280; font-size: 14px; padding-top: 5px;">
                oleh ${song.artist || 'Artis Tidak Diketahui'}
              </td>
            </tr>
            <tr>
              <td style="padding-top: 10px;">
                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="left" style="color: #6b7280; font-size: 13px;">
                      👁️ ${song.views_count || 0} views
                    </td>
                    <td align="right">
                      <a href="https://arrangely.io/song/${song.slug}" 
                        style="display: inline-block; background: #6366f1; color: #ffffff; 
                                padding: 8px 16px; text-decoration: none; border-radius: 6px; 
                                font-weight: bold; font-size: 13px;">
                        Lihat Aransemen
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
    }).join('');
    // Send emails to all verified users
    let successCount = 0;
    let failCount = 0;
    for (const user of verifiedUsers){
      try {
        // Get user's display name from profiles
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        const displayName = profile?.display_name || user.email?.split('@')[0] || 'Sobat Arrangely';
        // Randomly select a subject line
        const randomSubject = subjectLines[Math.floor(Math.random() * subjectLines.length)];
        await transporter.sendMail({
          from: '"Arrangely" <info@arrangely.io>',
          to: user.email,
          subject: randomSubject,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
              <!-- Banner -->
              <div style="text-align: center; margin-bottom: 0;">
                <img src="https://jowuhdfznveuopeqwzzd.supabase.co/storage/v1/object/public/email-storage/Top%205%20Weekly%20Arrangements%20Banner.png" alt="Top 5 Arrangements of the Week" style="width: 100%; max-width: 600px; display: block;" />
              </div>

              <!-- Main Content -->
              <div style="background: #f3f4f6; padding: 30px 20px;">
                <!-- Greeting -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">
                  Halo ${displayName}!
                </h2>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                  Selamat datang kembali di <strong>Weekly Newsletter Arrangely</strong>!
                </p>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Seminggu telah berlalu, dan komunitas kita kembali menciptakan melodi yang indah. Inilah saatnya kita mengumumkan <strong>5 aransemen terpopuler</strong> yang paling banyak dilihat dan dinikmati minggu ini. Siapa tahu lagu favorit Anda masuk dalam daftar! 👇
                </p>

                <!-- Top 5 Section -->
                <h2 style="color: #1f2937; margin: 0 0 25px 0; font-size: 20px; text-align: center;">
                  🏆 Top 5 Aransemen Paling Dilihat Minggu Ini
                </h2>
                
                <p style="color: #4b5563; font-size: 14px; text-align: center; margin-bottom: 30px;">
                  Berikut adalah mahakarya yang paling bersinar, didukung oleh talenta hebat para Kreator Arrangely:
                </p>

                ${songsHTML}

                <!-- CTA Button 1 -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="https://arrangely.io/community-library" 
                     style="display: inline-block; background: #6366f1; color: white; padding: 16px 50px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Jelajahi Lebih Banyak Lagu
                  </a>
                </div>

                <!-- Premium Section -->
                <div style="margin-top: 50px; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
                  <h3 style="color: #ffffff; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
                    🚀 Maksimalkan Pengalaman Anda dengan Fitur Premium!
                  </h3>
                  
                  <p style="color: #ffffff; margin: 0 0 20px 0; font-size: 15px; line-height: 1.6;">
                    Apakah Anda ingin meningkatkan kualitas bermusik Anda ke level selanjutnya? <strong>Upgrade ke Arrangely Premium</strong> sekarang dan nikmati keuntungan eksklusif ini:
                  </p>
                  
                  <ul style="color: #ffffff; margin: 0 0 25px 0; padding-left: 20px; line-height: 1.8;">
                    <li style="margin-bottom: 10px;">
                      <strong>🎹 Live Performance View:</strong> Tampilkan aransemen Anda dalam mode khusus yang dioptimalkan untuk pertunjukan langsung, membuat Anda lebih fokus saat bermain.
                    </li>
                    <li style="margin-bottom: 10px;">
                      <strong>💾 Save Arrangement to Library:</strong> Simpan (Add to Library) aransemen favorit Anda tanpa batas ke dalam Digital Song Book pribadi, sehingga mudah ditemukan dan dimainkan kapan saja.
                    </li>
                    <li style="margin-bottom: 10px;">
                      <strong>📄 Unlimited PDF Download:</strong> Unduh file PDF dari semua aransemen yang tersedia sebanyak yang Anda mau untuk dicetak atau digunakan secara offline.
                    </li>
                    <li style="margin-bottom: 10px;">
                      <strong>⚡ Priority Support:</strong> Dapatkan layanan dukungan pelanggan yang lebih cepat dan diprioritaskan untuk semua pertanyaan atau masalah teknis Anda.
                    </li>
                  </ul>
                  
                  <p style="color: #ffffff; margin: 0 0 25px 0; font-size: 15px;">
                    Jangan lewatkan kesempatan ini untuk mendapatkan tools terbaik untuk musisi!
                  </p>
                  
                  <!-- CTA Button 2 -->
                  <div style="text-align: center;">
                    <a href="https://arrangely.io/pricing" 
                       style="display: inline-block; background: #ffffff; color: #6366f1; padding: 16px 50px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Buka Fitur Premium Sekarang
                    </a>
                  </div>
                </div>

                <!-- Closing -->
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 40px 0 10px 0; text-align: center;">
                  Terima kasih telah menjadi bagian dari komunitas Arrangely.<br/>
                  Selamat berlatih!
                </p>
                
                <p style="color: #6b7280; font-size: 15px; margin: 0; text-align: center;">
                  <strong>Salam Musik,</strong><br/>
                  <a href="https://arrangely.io" style="color: #6366f1; text-decoration: none;">Tim Arrangely</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding: 30px 20px; color: #9ca3af; font-size: 12px; background: #ffffff;">
                <p style="margin: 0 0 10px 0;">© 2025 Arrangely. Create beautiful song arrangements with ease.</p>
                <p style="margin: 0;">
                  <a href="https://arrangely.io" style="color: #9ca3af; text-decoration: none;">Kunjungi Website</a> | 
                  <a href="https://arrangely.io/pricing" style="color: #9ca3af; text-decoration: none;">Berlangganan</a>
                </p>
              </div>
            </div>
          `
        });
        successCount++;
        
      } catch (error) {
        failCount++;
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Weekly recap emails sent",
      successCount,
      failCount,
      totalUsers: verifiedUsers.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in send-weekly-recap function:", error);
    return new Response(JSON.stringify({
      error: "Failed to send weekly recap emails",
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
