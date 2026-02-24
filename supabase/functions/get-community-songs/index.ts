import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueryParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  category?: string
  followedOnly?: boolean
  userId?: string
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

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '12')
    const search = url.searchParams.get('search') || ''
    const sortBy = url.searchParams.get('sortBy') || 'recent'
    const category = url.searchParams.get('category') || 'all'
    const followedOnly = url.searchParams.get('followedOnly') === 'true'
    const userId = url.searchParams.get('userId')

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Base query for public songs
    let query = supabaseClient
      .from('songs')
      .select('*, created_sign', { count: 'exact' })
      .eq('is_public', true)

    // Apply search filter
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,` +
        `artist.ilike.%${search}%,` +
        `created_sign.ilike.%${search}%`
      )
    }

    // Apply category filter
    if (category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply followed creators filter
    if (followedOnly && userId) {
      const { data: follows } = await supabaseClient
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (follows && follows.length > 0) {
        const validFollowedIds = follows
          .map(f => f.following_id)
          .filter(id => id !== 'arrangely_creator_group')
        
        if (validFollowedIds.length > 0) {
          query = query.in('user_id', validFollowedIds)
        }
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'recent':
        query = query.order('created_at', { ascending: false })
        break
      case 'popular':
        query = query.order('views_count', { ascending: false })
        break
      case 'liked':
        query = query.order('likes_count', { ascending: false })
        break
      case 'title':
        query = query.order('title', { ascending: true })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Execute paginated query
    const { data: songsData, error: songsError, count } = await query.range(from, to)

    if (songsError) {
      throw songsError
    }

    if (!songsData || songsData.length === 0) {
      return new Response(
        JSON.stringify({ songs: [], total: 0, page, hasMore: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profiles for all song creators
    const userIds = [...new Set(songsData.map(song => song.user_id))]
    const { data: profilesData } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name, avatar_url, role, creator_type')
      .in('user_id', userIds)

    const profilesMap = new Map()
    profilesData?.forEach(profile => {
      profilesMap.set(profile.user_id, profile)
    })

    // Get engagement data if user is logged in
    let likesMap = new Map()
    let userLikedSongs = new Set()
    let userFollowedCreators = new Set()

    if (userId) {
      const songIds = songsData.map(song => song.id)

      // Batch fetch like counts
      const { data: likesData } = await supabaseClient
        .from('song_likes')
        .select('song_id')
        .in('song_id', songIds)

      songIds.forEach(songId => {
        const count = likesData?.filter(like => like.song_id === songId).length || 0
        likesMap.set(songId, count)
      })

      // Batch fetch user liked songs
      const { data: likedSongsData } = await supabaseClient
        .from('song_likes')
        .select('song_id')
        .eq('user_id', userId)
        .in('song_id', songIds)

      likedSongsData?.forEach(item => {
        userLikedSongs.add(item.song_id)
      })

      // Batch fetch user followed creators
      const { data: followedCreatorsData } = await supabaseClient
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', userIds)

      followedCreatorsData?.forEach(item => {
        userFollowedCreators.add(item.following_id)
      })
    }

    // Transform songs data
    const transformedSongs = songsData.map(song => {
      const profile = profilesMap.get(song.user_id)
      const creatorType = profile?.creator_type

      let displayArranger = song.created_sign || 'Unknown Creator'
      let displayAvatar = profile?.avatar_url || null

      if (creatorType === 'creator_arrangely') {
        displayArranger = 'Arrangely'
        displayAvatar = null
      }

      return {
        id: song.id,
        title: song.title,
        artist: song.artist || 'Unknown Artist',
        arranger: displayArranger,
        arrangerAvatar: displayAvatar,
        arrangerBio: `Creator with role: ${profile?.role || 'user'}`,
        arrangerSocial: {},
        key: song.current_key,
        tempo: song.tempo || 120,
        theme: song.theme,
        tags: song.tags,
        difficulty: song.difficulty,
        likes: likesMap.get(song.id) || 0,
        views: song.views_count || 0,
        followers: 0,
        isLiked: userLikedSongs.has(song.id),
        isFavorited: song.is_favorite || false,
        isFollowed: userFollowedCreators.has(song.user_id),
        isPublic: song.is_public,
        isPremium: false,
        isTrusted: profile?.role === 'creator' || profile?.role === 'admin',
        createdAt: song.created_at,
        duration: '4:30',
        youtubeLink: song.youtube_link || '',
        youtubeThumbnail: song.youtube_thumbnail || null,
        user_id: song.user_id,
        category: song.category,
      }
    })

    const hasMore = count ? (page * limit) < count : false

    return new Response(
      JSON.stringify({
        songs: transformedSongs,
        total: count || 0,
        page,
        hasMore
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in get-community-songs function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})