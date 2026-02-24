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

    // Get user's songs to check what's in their library
    const { data: userSongs, error: songsError } = await supabaseClient
      .from('songs')
      .select('id, title, artist, status')
      .eq('user_id', user.id)

    if (songsError) {
      throw songsError
    }

    const activeSet = new Set()
    const archivedMap = new Map()

    if (userSongs) {
      userSongs.forEach(userSong => {
        const songKey = `${userSong.title}-${userSong.artist}`
        
        if (userSong.status === 'archived') {
          const key = `${userSong.title.trim().toLowerCase()}|${userSong.artist.trim().toLowerCase()}`
          archivedMap.set(key, userSong.id)
        } else {
          activeSet.add(songKey)
        }
      })
    }

    // Get user follows
    const { data: follows, error: followsError } = await supabaseClient
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (followsError) {
      throw followsError
    }

    const followedIds = new Set(follows?.map(f => f.following_id) || [])

    return new Response(
      JSON.stringify({
        songsInLibrary: Array.from(activeSet),
        archivedSongs: Object.fromEntries(archivedMap),
        followedCreatorIds: Array.from(followedIds)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-user-library function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})