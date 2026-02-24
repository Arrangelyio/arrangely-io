import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a daily seed for consistent randomization within a day
// Uses UTC date to ensure consistent behavior across timezones
function getDailySeed(): number {
  const today = new Date()
  // Use padded month (1-12) and day for better hash distribution
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1 // 1-indexed for better uniqueness
  const day = today.getUTCDate()
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  // Use djb2 hash algorithm for better distribution
  let hash = 5381
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i)
    hash = ((hash << 5) + hash) + char // hash * 33 + char
    hash = hash >>> 0 // Convert to unsigned 32-bit integer
  }
  
  console.log(`[get-trusted-arrangers] Daily seed for ${dateString}: ${hash}`)
  return hash
}

// Improved seeded random using mulberry32 algorithm
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed + 0x6D2B79F5) >>> 0
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates shuffle with seeded random generator
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array]
  const random = seededRandom(seed)
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  console.log(`[get-trusted-arrangers] Shuffled ${shuffled.length} creators with seed ${seed}`)
  return shuffled
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get minimum songs threshold from query params (default 5)
    const url = new URL(req.url)
    const minSongs = parseInt(url.searchParams.get('minSongs') || '5', 10)

    let finalArrangers = []
    const dailySeed = getDailySeed()

    // Step 1: Get Arrangely Creator Group (always first)
    const { data: arrangelyMembers, error: membersError } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('creator_type', 'creator_arrangely')

    if (!membersError && arrangelyMembers && arrangelyMembers.length > 0) {
      const memberIds = arrangelyMembers.map(m => m.user_id)

      // Count public songs from Arrangely creators
      const { count: arrangelyCount, error: arrangelyError } = await supabaseClient
        .from('songs')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true)
        .in('user_id', memberIds)

      if (!arrangelyError && arrangelyCount && arrangelyCount > 0) {
        finalArrangers.push({
          user_id: 'arrangely_creator_group',
          name: 'Arrangely Creator',
          arrangements: arrangelyCount,
          isTrusted: true,
          avatar: null,
          library_adds: 999999, // Always first
          creator_slug: null,
          creator_type: 'creator_arrangely',
        })
      }
    }

    // Step 2: Get Professional Creators with their creator_slug
    const { data: profilesData, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name, avatar_url, creator_slug, creator_type')
      .eq('role', 'creator')
      .eq('creator_type', 'creator_professional')

    if (!profilesError && profilesData && profilesData.length > 0) {
      const professionalUserIds = profilesData.map(p => p.user_id)

      // Count public songs for each professional creator
      const { data: songsData, error: songsError } = await supabaseClient
        .from('songs')
        .select('id, user_id')
        .eq('is_public', true)
        .in('user_id', professionalUserIds)

      // Get library adds count for personalized sorting
      const songIds = songsData?.map(s => s.id) || []
      let libraryAddsMap = new Map()
      
      if (songIds.length > 0) {
        const { data: libraryData, error: libraryError } = await supabaseClient
          .from('user_library_actions')
          .select('song_id, song_original_id')
          .eq('action_type', 'add')
          .or(`song_id.in.(${songIds.join(',')}),song_original_id.in.(${songIds.join(',')})`)

        if (!libraryError && libraryData) {
          // Count library adds per creator's songs
          libraryData.forEach(action => {
            const songId = action.song_id || action.song_original_id
            const song = songsData?.find(s => s.id === songId)
            if (song) {
              libraryAddsMap.set(
                song.user_id,
                (libraryAddsMap.get(song.user_id) || 0) + 1
              )
            }
          })
        }
      }

      // Get recent publishing activity (last 7 days) for "productive" creators
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { data: recentSongs, error: recentError } = await supabaseClient
        .from('songs')
        .select('user_id')
        .eq('is_public', true)
        .in('user_id', professionalUserIds)
        .gte('created_at', sevenDaysAgo.toISOString())

      let recentActivityMap = new Map()
      if (!recentError && recentSongs) {
        recentSongs.forEach(song => {
          recentActivityMap.set(
            song.user_id,
            (recentActivityMap.get(song.user_id) || 0) + 1
          )
        })
      }

      if (!songsError && songsData) {
        const arrangementsCountMap = new Map()
        songsData.forEach(song => {
          arrangementsCountMap.set(
            song.user_id,
            (arrangementsCountMap.get(song.user_id) || 0) + 1
          )
        })

        // Combine profile data with song counts and scoring
        // Only include creators with at least minSongs published
        profilesData.forEach(profile => {
          const songCount = arrangementsCountMap.get(profile.user_id) || 0
          if (songCount >= minSongs) {
            const libraryAdds = libraryAddsMap.get(profile.user_id) || 0
            const recentActivity = recentActivityMap.get(profile.user_id) || 0
            
            // Combined score: library_adds (weight 3) + arrangements (weight 1) + recent activity (weight 2)
            const score = (libraryAdds * 3) + songCount + (recentActivity * 2)
            
            finalArrangers.push({
              user_id: profile.user_id,
              name: profile.display_name || 'Unknown Creator',
              avatar: profile.avatar_url,
              isTrusted: true,
              arrangements: songCount,
              library_adds: libraryAdds,
              creator_slug: profile.creator_slug,
              creator_type: profile.creator_type,
              _score: score,
            })
          }
        })
      }
    }

    // Separate Arrangely (always first) from others
    const arrangelyCreator = finalArrangers.find(a => a.user_id === 'arrangely_creator_group')
    const otherCreators = finalArrangers.filter(a => a.user_id !== 'arrangely_creator_group')

    // Apply daily-seeded shuffle to other creators for consistent randomization within a day
    const shuffledCreators = seededShuffle(otherCreators, dailySeed)

    // Reconstruct: Arrangely first, then shuffled others
    finalArrangers = arrangelyCreator ? [arrangelyCreator, ...shuffledCreators] : shuffledCreators

    // Remove internal _score field before returning
    const cleanedArrangers = finalArrangers.map(({ _score, ...rest }) => rest)

    return new Response(
      JSON.stringify({ arrangers: cleanedArrangers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-trusted-arrangers function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
