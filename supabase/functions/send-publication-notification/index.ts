import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  publicationId: string;
  songId: string;
  userId: string;
  status: 'active' | 'rejected';
  songTitle: string;
  songArtist: string;
  rejectedReason?: string;
  validationResults?: Record<string, any>;
}

// Map rejection reasons to human-readable explanations
function getDetailedRejectionReason(reason: string, validationResults?: Record<string, any>): { id: string; en: string } {
  const reasons: Record<string, { id: string; en: string }> = {
    'content_violation': {
      id: `Konten lagu Anda mengandung materi yang tidak sesuai dengan pedoman komunitas kami. ${validationResults?.content?.summary || 'Mohon periksa lirik dan metadata lagu untuk kata-kata atau frasa yang mungkin dianggap tidak pantas, menyinggung SARA, atau mengandung konten dewasa.'}`,
      en: `Your song content contains material that violates our community guidelines. ${validationResults?.content?.summary || 'Please review your lyrics and song metadata for any words or phrases that may be considered inappropriate, offensive, SARA-related, or contain adult content.'}`
    },
    'invalid_youtube': {
      id: `Link YouTube yang Anda berikan tidak valid atau video tidak berada dalam kategori Musik. ${validationResults?.youtube?.error || 'Pastikan URL YouTube benar, video dapat diakses publik, dan berada dalam kategori Musik (bukan Entertainment atau kategori lainnya).'}`,
      en: `The YouTube link you provided is invalid or the video is not in the Music category. ${validationResults?.youtube?.error || 'Please ensure the YouTube URL is correct, the video is publicly accessible, and is categorized as Music (not Entertainment or other categories).'}`
    },
    'incomplete_sections': {
      id: `Lagu Anda tidak memiliki cukup section atau beberapa section tidak memiliki nama yang valid. Diperlukan minimal 3 section dengan nama yang jelas (contoh: Verse, Chorus, Bridge). Anda memiliki ${validationResults?.sections?.sectionCount || 0} section saat ini.`,
      en: `Your song doesn't have enough sections or some sections don't have valid names. A minimum of 3 sections with clear names is required (e.g., Verse, Chorus, Bridge). You currently have ${validationResults?.sections?.sectionCount || 0} sections.`
    },
    'invalid_chords': {
      id: `Chord coverage dalam aransemen Anda kurang dari 50%. Saat ini hanya ${validationResults?.chords?.coverage || 0}% section yang memiliki chord. Mohon tambahkan chord ke lebih banyak section untuk memenuhi standar kualitas kami.`,
      en: `The chord coverage in your arrangement is less than 50%. Currently only ${validationResults?.chords?.coverage || 0}% of sections have chords. Please add chords to more sections to meet our quality standards.`
    },
    'other': {
      id: 'Lagu Anda tidak memenuhi standar kualitas kami. Mohon periksa kembali semua aspek aransemen Anda dan coba submit ulang.',
      en: 'Your song did not meet our quality standards. Please review all aspects of your arrangement and try submitting again.'
    }
  };

  return reasons[reason] || reasons['other'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      publicationId, 
      songId, 
      userId, 
      status, 
      songTitle, 
      songArtist,
      rejectedReason,
      validationResults 
    } = await req.json() as NotificationRequest;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email and name from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Failed to get user profile:', profileError);
      throw new Error('User profile not found');
    }

    // If no email in profile, try to get from auth.users
    let userEmail = profile.email;
    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      userEmail = authUser?.user?.email;
    }

    if (!userEmail) {
      console.error('No email found for user:', userId);
      throw new Error('User email not found');
    }

    const userName = profile.display_name || 'Creator';
    const songInfo = `"${songTitle}"${songArtist ? ` oleh ${songArtist}` : ''}`;

    let emailSubject: string;
    let emailBody: string;

    if (status === 'active') {
      // Approval email - Bilingual (Indonesian first, then English)
      emailSubject = `🎉 Selamat! Lagu Anda Telah Dipublikasikan | Your Song Has Been Published`;
      emailBody = `
<div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
  <h2 style="color: #059669; margin-bottom: 15px;">🇮🇩 Bahasa Indonesia</h2>
  <p>Halo <strong>${userName}</strong>,</p>
  
  <p>Selamat! 🎉 Lagu Anda ${songInfo} telah berhasil melewati proses validasi dan sekarang <strong style="color: #059669;">sudah dipublikasikan</strong> di Community Library!</p>
  
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
  <p>Hello <strong>${userName}</strong>,</p>
  
  <p>Congratulations! 🎉 Your song ${songInfo} has successfully passed the validation process and is now <strong style="color: #059669;">published</strong> in the Community Library!</p>
  
  <p>Your song is now visible and accessible to all Arrangely users. Thank you for contributing to our music community!</p>
  
  <h3 style="margin-top: 20px;">Next Steps:</h3>
  <ul>
    <li>Share your song with friends and followers</li>
    <li>Continue creating quality arrangements to build your reputation</li>
    <li>Monitor your song statistics in the Creator dashboard</li>
  </ul>
</div>
      `.trim();
    } else {
      // Rejection email - Bilingual with detailed reason
      const detailedReason = getDetailedRejectionReason(rejectedReason || 'other', validationResults);
      
      emailSubject = `⚠️ Publikasi Lagu Ditolak | Song Publication Rejected`;
      emailBody = `
<div style="margin-bottom: 30px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
  <h2 style="color: #dc2626; margin-bottom: 15px;">🇮🇩 Bahasa Indonesia</h2>
  <p>Halo <strong>${userName}</strong>,</p>
  
  <p>Mohon maaf, lagu Anda ${songInfo} <strong style="color: #dc2626;">tidak dapat dipublikasikan</strong> karena tidak memenuhi standar kualitas kami.</p>
  
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <h4 style="color: #dc2626; margin: 0 0 10px 0;">Alasan Penolakan:</h4>
    <p style="margin: 0; color: #7f1d1d;">${detailedReason.id}</p>
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
  <p>Hello <strong>${userName}</strong>,</p>
  
  <p>We're sorry, but your song ${songInfo} <strong style="color: #dc2626;">could not be published</strong> as it did not meet our quality standards.</p>
  
  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
    <h4 style="color: #dc2626; margin: 0 0 10px 0;">Reason for Rejection:</h4>
    <p style="margin: 0; color: #7f1d1d;">${detailedReason.en}</p>
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
</div>
      `.trim();
    }

    // Queue email job
    const { error: emailError } = await supabase
      .from('email_jobs')
      .insert({
        recipient_email: userEmail,
        recipient_name: userName,
        subject: emailSubject,
        body: emailBody,
        link_url: status === 'active' 
          ? `https://arrangely.io/arrangement/${songId}` 
          : `https://arrangely.io/creator-dashboard`,
        link_text: status === 'active' 
          ? 'Lihat Lagu Anda | View Your Song' 
          : 'Buka Dashboard Creator | Open Creator Dashboard',
        status: 'pending'
      });

    if (emailError) {
      console.error('Failed to queue email:', emailError);
      throw emailError;
    }

    

    return new Response(
      JSON.stringify({ success: true, status, recipient: userEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
