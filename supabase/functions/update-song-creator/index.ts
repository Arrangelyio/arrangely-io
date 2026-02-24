import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Inisialisasi Supabase Client dengan Service Role Key untuk bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Ambil data dari request body
    const {
      songId,
      newCreatorId,
      benefitTargetId,
      customAmount,
      contributionType
    } = await req.json()

    if (!songId || !newCreatorId) {
      throw new Error("Missing songId or newCreatorId")
    }

    const finalBenefitTargetId = benefitTargetId || newCreatorId;

    
    

    // 2. Ambil profil creator untuk mendapatkan nama (untuk kolom created_sign)
    const { data: creator, error: creatorError } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", newCreatorId)
      .single();

    if (creatorError || !creator) {
      return new Response(JSON.stringify({ error: "Assignee profile not found" }), { status: 400 });
    }
    const creatorName = creator.display_name || creator.email || "Unknown";

    // 3. ✅ UPDATE TABEL SONGS
    const { error: updateError } = await supabase
      .from('songs')
      .update({
        user_id: newCreatorId,
        created_sign: creatorName,
        contribution_type: contributionType // Update tipe kontribusi
      })
      .eq('id', songId)

    if (updateError) {
      console.error('Update Song Error:', updateError)
      throw new Error("Failed to update song assignment")
    }

    // 4. Tentukan Jumlah Benefit
    let finalBenefitAmount = 0;

    if (customAmount !== null && customAmount !== undefined) {
      // Jika ada input manual dari Admin, gunakan nilai tersebut
      finalBenefitAmount = customAmount;
      
    } else {
      // Ambil Base Rate dari config creator
      const { data: config, error: configError } = await supabase
        .from('creator_benefit_configs')
        .select('benefit_per_song_publish')
        .eq('creator_id', finalBenefitTargetId)
        .eq('is_active', true)
        .maybeSingle()

      const baseRate = config?.benefit_per_song_publish || 0;

      // Logika Persentase berdasarkan contribution_type
      let multiplier = 1.0; // Default 100%

      if (contributionType === 'transcription') {
        multiplier = 0.5; // Potong 50% untuk transcription
      } else {
        multiplier = 1.0; // 100% untuk arrangement atau original
      }

      finalBenefitAmount = baseRate * multiplier;
      
    }

    // 5. ✅ UPSERT TABEL CREATOR_BENEFITS
    const { data: existingBenefit, error: checkError } = await supabase
      .from('creator_benefits')
      .select('id')
      .eq('creator_id', finalBenefitTargetId)
      .eq('song_id', songId)
      .eq('benefit_type', 'song_publish')
      .maybeSingle();

    if (checkError) {
      console.error('Check Benefit Error:', checkError);
      throw new Error("Failed to check existing benefit");
    }

    let resultError;

    if (existingBenefit) {
      // Jika data sudah ada, kita Update nilainya
      
      const { error } = await supabase
        .from('creator_benefits')
        .update({
          amount: finalBenefitAmount,
        })
        .eq('id', existingBenefit.id);
      resultError = error;
    } else {
      // Jika data belum ada, kita Insert baru
      
      const { error } = await supabase
        .from('creator_benefits')
        .insert({
          creator_id: finalBenefitTargetId,
          song_id: songId,
          benefit_type: 'song_publish',
          amount: finalBenefitAmount,
        });
      resultError = error;
    }

    if (resultError) {
      console.error('Benefit Processing Error:', resultError);
      throw new Error(`Failed to process benefit: ${resultError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Song assignment and calculated benefit updated successfully",
        calculatedAmount: finalBenefitAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})