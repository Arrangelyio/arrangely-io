import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { songId } = await req.json()

    if (!songId) {
      throw new Error('Song ID is required')
    }

    // Check if user already liked this song
    const { data: existingLike, error: checkError } = await supabaseClient
      .from('song_likes')
      .select('id')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    let isLiked = false
    let newLikeCount = 0

    if (existingLike) {
      // Unlike - remove the like
      const { error: deleteError } = await supabaseClient
        .from('song_likes')
        .delete()
        .eq('song_id', songId)
        .eq('user_id', user.id)

      if (deleteError) {
        throw deleteError
      }

      isLiked = false
    } else {
      // Like - add the like
      const { error: insertError } = await supabaseClient
        .from('song_likes')
        .insert({ song_id: songId, user_id: user.id })

      if (insertError) {
        throw insertError
      }

      isLiked = true
    }

    // Get updated like count
    const { count, error: countError } = await supabaseClient
      .from('song_likes')
      .select('*', { count: 'exact', head: true })
      .eq('song_id', songId)

    if (countError) {
      throw countError
    }

    newLikeCount = count || 0

    return new Response(
      JSON.stringify({
        success: true,
        isLiked,
        likeCount: newLikeCount,
        message: isLiked ? 'Song liked' : 'Song unliked'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in toggle-song-like function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})