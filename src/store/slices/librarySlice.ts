import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

interface Song {
  id: string;
  title: string;
  artist: string | null;
  user_id: string;
  is_public: boolean;
  current_key: string;
  original_key: string;
  tempo: number | null;
  time_signature: string;
  capo: number | null;
  notes: string | null;
  tags: string[] | null;
  youtube_link: string | null;
  youtube_thumbnail: string | null;
  difficulty: string | null;
  theme: string | null;
  category: string | null;
  views_count: number | null;
  last_viewed_at: string | null;
  is_favorite: boolean | null;
  folder_id: string | null;
  rating: number | null;
  original_creator_id: string | null;
  sequencer_price: number | null;
  is_production: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count?: number;
  library_count?: number;
  user_likes_song?: boolean;
  user_follows_creator?: boolean;
  in_user_library?: boolean;
}

interface Creator {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  musical_role: string | null;
  country: string | null;
  city: string | null;
  youtube_channel: string | null;
  creator_type: string | null;
  song_count?: number;
  total_views?: number;
  followers_count?: number;
}

interface LibraryState {
  songs: Song[];
  creators: Creator[];
  userLibrary: string[]; // Song IDs in user's library
  userLikes: string[]; // Song IDs user has liked
  userFollows: string[]; // Creator IDs user follows
  totalSongs: number;
  currentPage: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  filters: {
    search: string;
    difficulty: string[];
    theme: string[];
    key: string[];
    creator: string;
    sort: string;
  };
  lastFetch: number | null;
  cacheTimeout: number; // 5 minutes
}

const initialState: LibraryState = {
  songs: [],
  creators: [],
  userLibrary: [],
  userLikes: [],
  userFollows: [],
  totalSongs: 0,
  currentPage: 1,
  hasMore: true,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    difficulty: [],
    theme: [],
    key: [],
    creator: '',
    sort: 'recent',
  },
  lastFetch: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// Helper function to build optimized query
const buildSongQuery = (filters: LibraryState['filters'], page: number, limit: number = 20) => {
  let query = supabase
    .from('songs')
    .select(`
      *,
      profiles!songs_user_id_fkey(display_name, avatar_url),
      song_likes(count),
      user_library_actions(count)
    `)
    .eq('is_public', true)
    .eq('is_production', true);

  // Apply filters
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,artist.ilike.%${filters.search}%`);
  }
  
  if (filters.difficulty.length > 0) {
    query = query.in('difficulty', filters.difficulty);
  }
  
  if (filters.theme.length > 0) {
    query = query.in('theme', filters.theme);
  }
  
  if (filters.key.length > 0) {
    query = query.in('current_key', filters.key as any);
  }
  
  if (filters.creator) {
    query = query.eq('user_id', filters.creator);
  }

  // Apply sorting
  switch (filters.sort) {
    case 'popular':
      query = query.order('views_count', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'title':
      query = query.order('title', { ascending: true });
      break;
    case 'artist':
      query = query.order('artist', { ascending: true });
      break;
    default:
      query = query.order('last_viewed_at', { ascending: false })
                   .order('created_at', { ascending: false });
  }

  // Pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  return query.range(from, to);
};

// Async thunks
export const fetchSongs = createAsyncThunk(
  'library/fetchSongs',
  async (params: { 
    page?: number; 
    limit?: number; 
    forceRefresh?: boolean; 
    userId?: string;
  } = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { library: LibraryState };
      const { page = 1, limit = 20, forceRefresh = false, userId } = params;
      
      // Check cache validity
      const now = Date.now();
      if (!forceRefresh && state.library.lastFetch && 
          (now - state.library.lastFetch) < state.library.cacheTimeout &&
          page === 1 && state.library.songs.length > 0) {
        return {
          songs: state.library.songs,
          totalCount: state.library.totalSongs,
          page,
          hasMore: state.library.hasMore,
          userLibrary: state.library.userLibrary,
          userLikes: state.library.userLikes,
          userFollows: state.library.userFollows,
          fromCache: true,
        };
      }

      // Build optimized query
      const query = buildSongQuery(state.library.filters, page, limit);
      
      // Execute query with count
      const { data: songs, error, count } = await query;
      if (error) throw error;

      // Fetch user-specific data in parallel if authenticated
      let userLibrary: string[] = [];
      let userLikes: string[] = [];
      let userFollows: string[] = [];

      if (userId) {
        const [libraryResult, likesResult, followsResult] = await Promise.all([
          supabase
            .from('user_library_actions')
            .select('song_id')
            .eq('user_id', userId)
            .eq('is_production', true),
          supabase
            .from('song_likes')
            .select('song_id')
            .eq('user_id', userId)
            .eq('is_production', true),
          supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', userId)
            .eq('is_production', true),
        ]);

        if (libraryResult.data) {
          userLibrary = libraryResult.data.map(item => item.song_id);
        }
        if (likesResult.data) {
          userLikes = likesResult.data.map(item => item.song_id);
        }
        if (followsResult.data) {
          userFollows = followsResult.data.map(item => item.following_id);
        }
      }

      // Process songs data
      const processedSongs = songs?.map(song => ({
        ...song,
        profile: song.profiles,
        like_count: (song as any).song_likes?.[0]?.count || 0,
        library_count: (song as any).user_library_actions?.[0]?.count || 0,
        user_likes_song: userLikes.includes(song.id),
        user_follows_creator: userFollows.includes(song.user_id),
        in_user_library: userLibrary.includes(song.id),
      })) || [];

      const hasMore = (count || 0) > page * limit;

      return {
        songs: processedSongs,
        totalCount: count || 0,
        page,
        hasMore,
        userLibrary,
        userLikes,
        userFollows,
        fromCache: false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchCreators = createAsyncThunk(
  'library/fetchCreators',
  async (_, { rejectWithValue }) => {
    try {
      // Optimized query to get creators with their stats
      const { data: creators, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          display_name,
          avatar_url,
          bio,
          musical_role,
          country,
          city,
          youtube_channel,
          creator_type,
          songs!songs_user_id_fkey(count),
          user_follows!user_follows_following_id_fkey(count)
        `)
        .in('role', ['creator', 'admin'])
        .eq('is_production', true)
        .order('display_name');

      if (error) throw error;

      const processedCreators = creators?.map(creator => ({
        ...creator,
        id: creator.user_id,
        song_count: (creator as any).songs?.[0]?.count || 0,
        followers_count: (creator as any).user_follows?.[0]?.count || 0,
      })) || [];

      return processedCreators;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleLikeSong = createAsyncThunk(
  'library/toggleLikeSong',
  async (songId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const userId = state.auth.user?.id;
      
      if (!userId) throw new Error('Not authenticated');

      const isLiked = (getState() as { library: LibraryState }).library.userLikes.includes(songId);

      if (isLiked) {
        const { error } = await supabase
          .from('song_likes')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('song_likes')
          .insert({ user_id: userId, song_id: songId, is_production: true });
        if (error) throw error;
      }

      return { songId, isLiked: !isLiked };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleLibrarySong = createAsyncThunk(
  'library/toggleLibrarySong',
  async (songId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const userId = state.auth.user?.id;
      
      if (!userId) throw new Error('Not authenticated');

      const inLibrary = (getState() as { library: LibraryState }).library.userLibrary.includes(songId);

      if (inLibrary) {
        const { error } = await supabase
          .from('user_library_actions')
          .delete()
          .eq('user_id', userId)
          .eq('song_id', songId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_library_actions')
          .insert({ 
            user_id: userId, 
            song_id: songId, 
            action_type: 'add_to_library',
            is_production: true 
          });
        if (error) throw error;
      }

      return { songId, inLibrary: !inLibrary };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleFollowCreator = createAsyncThunk(
  'library/toggleFollowCreator',
  async (creatorId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const userId = state.auth.user?.id;
      
      if (!userId) throw new Error('Not authenticated');

      const isFollowing = (getState() as { library: LibraryState }).library.userFollows.includes(creatorId);

      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', creatorId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ 
            follower_id: userId, 
            following_id: creatorId,
            is_production: true 
          });
        if (error) throw error;
      }

      return { creatorId, isFollowing: !isFollowing };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<LibraryState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset pagination when filters change
      state.currentPage = 1;
      state.hasMore = true;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.currentPage = 1;
      state.hasMore = true;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCache: (state) => {
      state.songs = [];
      state.lastFetch = null;
      state.currentPage = 1;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSongs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSongs.fulfilled, (state, action) => {
        const { songs, totalCount, page, hasMore, userLibrary, userLikes, userFollows, fromCache } = action.payload;
        
        if (page === 1) {
          state.songs = songs as any;
        } else {
          state.songs = [...state.songs, ...songs as any];
        }
        
        state.totalSongs = totalCount;
        state.currentPage = page;
        state.hasMore = hasMore;
        state.userLibrary = userLibrary;
        state.userLikes = userLikes;
        state.userFollows = userFollows;
        state.isLoading = false;
        
        if (!fromCache) {
          state.lastFetch = Date.now();
        }
      })
      .addCase(fetchSongs.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      .addCase(fetchCreators.fulfilled, (state, action) => {
        state.creators = action.payload;
      })
      .addCase(toggleLikeSong.fulfilled, (state, action) => {
        const { songId, isLiked } = action.payload;
        if (isLiked) {
          state.userLikes.push(songId);
        } else {
          state.userLikes = state.userLikes.filter(id => id !== songId);
        }
        // Update song in the list
        const song = state.songs.find(s => s.id === songId);
        if (song) {
          song.user_likes_song = isLiked;
          song.like_count = (song.like_count || 0) + (isLiked ? 1 : -1);
        }
      })
      .addCase(toggleLibrarySong.fulfilled, (state, action) => {
        const { songId, inLibrary } = action.payload;
        if (inLibrary) {
          state.userLibrary.push(songId);
        } else {
          state.userLibrary = state.userLibrary.filter(id => id !== songId);
        }
        // Update song in the list
        const song = state.songs.find(s => s.id === songId);
        if (song) {
          song.in_user_library = inLibrary;
          song.library_count = (song.library_count || 0) + (inLibrary ? 1 : -1);
        }
      })
      .addCase(toggleFollowCreator.fulfilled, (state, action) => {
        const { creatorId, isFollowing } = action.payload;
        if (isFollowing) {
          state.userFollows.push(creatorId);
        } else {
          state.userFollows = state.userFollows.filter(id => id !== creatorId);
        }
        // Update songs by this creator
        state.songs.forEach(song => {
          if (song.user_id === creatorId) {
            song.user_follows_creator = isFollowing;
          }
        });
      });
  },
});

export const { setFilters, clearFilters, setCurrentPage, clearError, clearCache } = librarySlice.actions;
export default librarySlice.reducer;