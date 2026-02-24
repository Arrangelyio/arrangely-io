import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, type } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const recipientEmail = email || 'nada@arrangely.io';
    const recipientName = 'Nada';

    const emails = [];

    if (type === 'approval' || type === 'both') {
      emails.push({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject: '🎉 Selamat! Lagu Anda Telah Dipublikasikan | Your Song Has Been Published',
        body: `<div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
  <h2 style="color: #059669; margin-bottom: 15px;">🇮🇩 Bahasa Indonesia</h2>
  <p>Halo <strong>${recipientName}</strong>,</p>
  
  <p>Selamat! 🎉 Lagu Anda "Sampai Jumpa" oleh Endank Soekamti telah berhasil melewati proses validasi dan sekarang <strong style="color: #059669;">sudah dipublikasikan</strong> di Community Library!</p>
  
  <p>Lagu Anda sekarang dapat dilihat dan diakses oleh seluruh pengguna Arrangely. Terima kasih telah berkontribusi untuk komunitas musik kita!</p>
  
  <h3 style="margin-top: 20px;">Langkah Selanjutnya:</h3>
  <ul>
    <li>Bagikan lagu Anda ke teman-teman dan followers</li>
    <li>Terus buat aransemen berkualitas untuk meningkatkan reputasi Anda</li>
    <li>Pantau statistik lagu Anda di dashboard Creator</li>
  </ul>
</div>

<div>
  <h2 style="color: #059669; margin-bottom: 15px;">🇬🇧 English</h2>
  <p>Hello <strong>${recipientName}</strong>,</p>
  
  <p>Congratulations! 🎉 Your song "Sampai Jumpa" by Endank Soekamti has successfully passed the validation process and is now <strong style="color: #059669;">published</strong> in the Community Library!</p>
  
  <p>Your song is now visible and accessible to all Arrangely users. Thank you for contributing to our music community!</p>
  
  <h3 style="margin-top: 20px;">Next Steps:</h3>
  <ul>
    <li>Share your song with friends and followers</li>
    <li>Continue creating quality arrangements to build your reputation</li>
    <li>Monitor your song statistics in the Creator dashboard</li>
  </ul>
</div>`,
        link_url: 'https://arrangely.io/arrangement/test-song-001',
        link_text: 'Lihat Lagu Anda | View Your Song',
        status: 'pending'
      });
    }

    if (type === 'rejection' || type === 'both') {
      emails.push({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject: '⚠️ Publikasi Lagu Ditolak | Song Publication Rejected',
        body: `<div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
  <h2 style="color: #dc2626; margin-bottom: 15px;">🇮🇩 Bahasa Indonesia</h2>
  <p>Halo <strong>${recipientName}</strong>,</p>
  
  <p>Mohon maaf, lagu Anda "Pujaan Hati" oleh Kangen Band <strong style="color: #dc2626;">tidak dapat dipublikasikan</strong> karena tidak memenuhi standar kualitas kami.</p>
  
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <h4 style="color: #dc2626; margin: 0 0 10px 0;">Alasan Penolakan:</h4>
    <p style="margin: 0; color: #7f1d1d;">Chord coverage dalam aransemen Anda kurang dari 50%. Saat ini hanya 35.0% section yang memiliki chord. Mohon tambahkan chord ke lebih banyak section untuk memenuhi standar kualitas kami.</p>
  </div>
  
  <h3 style="margin-top: 20px;">Langkah yang Dapat Anda Lakukan:</h3>
  <ol>
    <li>Perbaiki masalah yang disebutkan di atas</li>
    <li>Pastikan semua section memiliki nama dan chord yang lengkap</li>
    <li>Pastikan link YouTube valid dan berada dalam kategori Musik</li>
    <li>Periksa kembali lirik untuk memastikan tidak ada konten yang melanggar</li>
    <li>Submit ulang lagu Anda setelah perbaikan</li>
  </ol>
  
  <p>Jika Anda yakin ini adalah kesalahan atau membutuhkan bantuan, silakan hubungi tim support kami.</p>
</div>

<div>
  <h2 style="color: #dc2626; margin-bottom: 15px;">🇬🇧 English</h2>
  <p>Hello <strong>${recipientName}</strong>,</p>
  
  <p>We're sorry, but your song "Pujaan Hati" by Kangen Band <strong style="color: #dc2626;">could not be published</strong> as it did not meet our quality standards.</p>
  
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <h4 style="color: #dc2626; margin: 0 0 10px 0;">Reason for Rejection:</h4>
    <p style="margin: 0; color: #7f1d1d;">The chord coverage in your arrangement is less than 50%. Currently only 35.0% of sections have chords. Please add chords to more sections to meet our quality standards.</p>
  </div>
  
  <h3 style="margin-top: 20px;">Steps You Can Take:</h3>
  <ol>
    <li>Fix the issues mentioned above</li>
    <li>Ensure all sections have complete names and chords</li>
    <li>Make sure the YouTube link is valid and in the Music category</li>
    <li>Review your lyrics to ensure there's no violating content</li>
    <li>Resubmit your song after making corrections</li>
  </ol>
  
  <p>If you believe this is an error or need assistance, please contact our support team.</p>
</div>`,
        link_url: 'https://arrangely.io/creator-dashboard',
        link_text: 'Buka Dashboard Creator | Open Creator Dashboard',
        status: 'pending'
      });
    }

    const { data, error } = await supabase
      .from('email_jobs')
      .insert(emails)
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, queued: emails.length, emails: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test email error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
