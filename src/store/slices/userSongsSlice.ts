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
  sections?: SongSection[];
}

interface SongSection {
  id: string;
  song_id: string;
  section_type: string;
  name: string | null;
  lyrics: string | null;
  chords: string | null;
  bar_count: number | null;
  section_category: string | null;
  section_type_original: string | null;
  section_time_signature: string | null;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  song_count?: number;
}

interface UserSongsState {
  songs: Song[];
  folders: Folder[];
  selectedFolder: string | null;
  totalSongs: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    search: string;
    difficulty: string[];
    theme: string[];
    key: string[];
    folder: string;
    sort: string;
    showPublic: boolean;
  };
  lastFetch: number | null;
  cacheTimeout: number;
}

const initialState: UserSongsState = {
  songs: [],
  folders: [],
  selectedFolder: null,
  totalSongs: 0,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    difficulty: [],
    theme: [],
    key: [],
    folder: '',
    sort: 'recent',
    showPublic: false,
  },
  lastFetch: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// Async thunks
export const fetchUserSongs = createAsyncThunk(
  'userSongs/fetchUserSongs',
  async (params: { 
    userId: string; 
    forceRefresh?: boolean; 
    includeSections?: boolean;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { userSongs: UserSongsState };
      const { userId, forceRefresh = false, includeSections = false } = params;
      
      // Check cache validity
      const now = Date.now();
      if (!forceRefresh && state.userSongs.lastFetch && 
          (now - state.userSongs.lastFetch) < state.userSongs.cacheTimeout &&
          state.userSongs.songs.length > 0) {
        return {
          songs: state.userSongs.songs,
          folders: state.userSongs.folders,
          fromCache: true,
        };
      }

      // Build query
      let songSelect = `
        *,
        song_likes(count),
        user_library_actions(count)
      `;
      
      if (includeSections) {
        songSelect += `, song_sections(*)`;
      }

      const { filters } = state.userSongs;
      let query = supabase
        .from('songs')
        .select(songSelect)
        .eq('user_id', userId)
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
      
      if (filters.folder) {
        query = query.eq('folder_id', filters.folder);
      }

      if (!filters.showPublic) {
        // Show both public and private songs for user
      } else {
        query = query.eq('is_public', true);
      }

      // Apply sorting
      switch (filters.sort) {
        case 'title':
          query = query.order('title', { ascending: true });
          break;
         case 'artist':
           query = query.order('artist', { ascending: true, nullsFirst: false });
           break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
         case 'views':
           query = query.order('views_count', { ascending: false, nullsFirst: false });
           break;
        default:
          query = query.order('updated_at', { ascending: false });
      }

      // Fetch songs and folders in parallel
      const [songsResult, foldersResult] = await Promise.all([
        query,
        supabase
          .from('song_folders')
          .select(`
            *,
            songs(count)
          `)
          .eq('user_id', userId)
          .eq('is_production', true)
          .order('name')
      ]);

      if (songsResult.error) throw songsResult.error;
      if (foldersResult.error) throw foldersResult.error;

       // Process songs
       const processedSongs = songsResult.data?.map(song => {
         const songData = song as any;
         return {
           ...songData,
           like_count: songData.song_likes?.[0]?.count || 0,
           library_count: songData.user_library_actions?.[0]?.count || 0,
           sections: includeSections ? songData.song_sections : undefined,
         };
       }) || [];

      // Process folders
      const processedFolders = foldersResult.data?.map(folder => ({
        ...folder,
        song_count: folder.songs?.[0]?.count || 0,
      })) || [];

      return {
        songs: processedSongs,
        folders: processedFolders,
        fromCache: false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createSong = createAsyncThunk(
  'userSongs/createSong',
  async (songData: Partial<Song>, { rejectWithValue }) => {
    try {
       const { data, error } = await supabase
         .from('songs')
         .insert(songData as any)
         .select()
         .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSong = createAsyncThunk(
  'userSongs/updateSong',
  async (params: { id: string; updates: Partial<Song> }, { rejectWithValue }) => {
    try {
       const { data, error } = await supabase
         .from('songs')
         .update(params.updates as any)
         .eq('id', params.id)
         .select()
         .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteSong = createAsyncThunk(
  'userSongs/deleteSong',
  async (songId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      return songId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createFolder = createAsyncThunk(
  'userSongs/createFolder',
  async (folderData: Partial<Folder>, { rejectWithValue }) => {
    try {
       const { data, error } = await supabase
         .from('song_folders')
         .insert(folderData as any)
         .select()
         .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateFolder = createAsyncThunk(
  'userSongs/updateFolder',
  async (params: { id: string; updates: Partial<Folder> }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('song_folders')
        .update(params.updates)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteFolder = createAsyncThunk(
  'userSongs/deleteFolder',
  async (folderId: string, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('song_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      return folderId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const userSongsSlice = createSlice({
  name: 'userSongs',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<UserSongsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setSelectedFolder: (state, action: PayloadAction<string | null>) => {
      state.selectedFolder = action.payload;
      state.filters.folder = action.payload || '';
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCache: (state) => {
      state.songs = [];
      state.folders = [];
      state.lastFetch = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSongs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserSongs.fulfilled, (state, action) => {
        const { songs, folders, fromCache } = action.payload;
        state.songs = songs;
        state.folders = folders;
        state.totalSongs = songs.length;
        state.isLoading = false;
        
        if (!fromCache) {
          state.lastFetch = Date.now();
        }
      })
      .addCase(fetchUserSongs.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
      .addCase(createSong.fulfilled, (state, action) => {
        state.songs.unshift(action.payload);
        state.totalSongs += 1;
      })
      .addCase(updateSong.fulfilled, (state, action) => {
        const index = state.songs.findIndex(song => song.id === action.payload.id);
        if (index !== -1) {
          state.songs[index] = { ...state.songs[index], ...action.payload };
        }
      })
      .addCase(deleteSong.fulfilled, (state, action) => {
        state.songs = state.songs.filter(song => song.id !== action.payload);
        state.totalSongs -= 1;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.folders.push({ ...action.payload, song_count: 0 });
      })
      .addCase(updateFolder.fulfilled, (state, action) => {
        const index = state.folders.findIndex(folder => folder.id === action.payload.id);
        if (index !== -1) {
          state.folders[index] = { ...state.folders[index], ...action.payload };
        }
      })
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.folders = state.folders.filter(folder => folder.id !== action.payload);
        // Remove folder assignment from songs
        state.songs.forEach(song => {
          if (song.folder_id === action.payload) {
            song.folder_id = null;
          }
        });
      });
  },
});

export const { setFilters, clearFilters, setSelectedFolder, clearError, clearCache } = userSongsSlice.actions;
export default userSongsSlice.reducer;