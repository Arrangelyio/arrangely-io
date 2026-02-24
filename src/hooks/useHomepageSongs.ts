import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface HomepageSong {
  id: string;
  title: string;
  artist: string;
  youtube_link: string | null;
  youtube_thumbnail: string | null;
  user_id: string;
  created_at: string;
  views_count: number;
}

interface Creator {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  creator_type: string | null;
}

// Fetch trending songs using existing RPC
async function fetchTrendingSongs(): Promise<{
  songs: HomepageSong[];
  creators: Map<string, Creator>;
}> {
  // Use the existing RPC function for trending songs
  const { data: trendingData, error: trendingError } = await supabase.rpc(
    "get_weekly_trending_songs",
    { days_back: 7, limit_count: 12 }
  );

  if (trendingError) {
    console.error("Error fetching trending songs:", trendingError);
    // Fallback to regular query
    const { data: fallbackData } = await supabase
      .from("songs")
      .select("id, title, artist, youtube_link, youtube_thumbnail, user_id, created_at, views_count")
      .eq("is_public", true)
      .order("views_count", { ascending: false })
      .limit(12);

    const songs = (fallbackData || []) as HomepageSong[];
    const creators = await fetchCreatorsForSongs(songs);
    return { songs, creators };
  }

  const songs = (trendingData || []) as HomepageSong[];
  const creators = await fetchCreatorsForSongs(songs);
  return { songs, creators };
}

// Fetch new arrivals from trusted creators
async function fetchNewArrivals(): Promise<{
  songs: HomepageSong[];
  creators: Map<string, Creator>;
}> {
  // First get trusted creator IDs
  const { data: trustedProfiles } = await supabase
    .from("profiles")
    .select("user_id")
    .in("creator_type", ["creator_professional"]);

  const trustedUserIds = trustedProfiles?.map((p) => p.user_id) || [];

  if (trustedUserIds.length === 0) {
    return { songs: [], creators: new Map() };
  }

  const { data: songsData, error } = await supabase
    .from("songs")
    .select("id, title, artist, youtube_link, youtube_thumbnail, user_id, created_at, views_count")
    .eq("is_public", true)
    .in("user_id", trustedUserIds)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Error fetching new arrivals:", error);
    return { songs: [], creators: new Map() };
  }

  const songs = (songsData || []) as HomepageSong[];
  const creators = await fetchCreatorsForSongs(songs);
  return { songs, creators };
}

// Helper to fetch creators for a list of songs
async function fetchCreatorsForSongs(
  songs: HomepageSong[]
): Promise<Map<string, Creator>> {
  const userIds = [...new Set(songs.map((s) => s.user_id))];

  if (userIds.length === 0) {
    return new Map();
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, creator_type")
    .in("user_id", userIds);

  const creatorsMap = new Map<string, Creator>();
  profiles?.forEach((p) => {
    creatorsMap.set(p.user_id, p as Creator);
  });

  return creatorsMap;
}

// Fetch user's recent arrangements
async function fetchRecentArrangements(
  userId: string
): Promise<{ songs: HomepageSong[]; creators: Map<string, Creator> }> {
  const { data, error } = await supabase
    .from("songs")
    .select("id, title, artist, youtube_link, youtube_thumbnail, user_id, created_at, views_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Error fetching recent arrangements:", error);
    return { songs: [], creators: new Map() };
  }

  const songs = (data || []) as HomepageSong[];
  const creators = await fetchCreatorsForSongs(songs);
  return { songs, creators };
}

// Fetch songs in user's library
async function fetchSongsInLibrary(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_library_actions")
    .select("song_id")
    .eq("user_id", userId)
    .eq("action_type", "add_to_library");

  return new Set(data?.map((action) => action.song_id) || []);
}

// Fetch latest songs from creators the user follows (creator_pro or creator_professional)
async function fetchFollowingSongs(
  userId: string,
  limit: number = 12
): Promise<{ songs: HomepageSong[]; creators: Map<string, Creator> }> {
  // Get list of creators the user follows
  const { data: followingData, error: followingError } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (followingError) {
    console.error("Error fetching following list:", followingError);
    return { songs: [], creators: new Map() };
  }

  const followingIds = followingData?.map((f) => f.following_id) || [];

  if (followingIds.length === 0) {
    return { songs: [], creators: new Map() };
  }

  // Filter to only creator_pro or creator_professional
  const { data: creatorProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, creator_type")
    .in("user_id", followingIds)
    .in("creator_type", ["creator_pro", "creator_professional"]);

  if (profilesError) {
    console.error("Error fetching creator profiles:", profilesError);
    return { songs: [], creators: new Map() };
  }

  const validCreatorIds = creatorProfiles?.map((p) => p.user_id) || [];

  if (validCreatorIds.length === 0) {
    return { songs: [], creators: new Map() };
  }

  // Fetch latest songs from these creators
  const { data: songsData, error: songsError } = await supabase
    .from("songs")
    .select("id, title, artist, youtube_link, youtube_thumbnail, user_id, created_at, views_count")
    .eq("is_public", true)
    .in("user_id", validCreatorIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (songsError) {
    console.error("Error fetching following songs:", songsError);
    return { songs: [], creators: new Map() };
  }

  const songs = (songsData || []) as HomepageSong[];

  // Build creators map from already fetched profiles
  const creatorsMap = new Map<string, Creator>();
  creatorProfiles?.forEach((p) => {
    creatorsMap.set(p.user_id, p as Creator);
  });

  return { songs, creators: creatorsMap };
}

export function useTrendingSongs() {
  return useQuery({
    queryKey: ["homepage-trending-songs"],
    queryFn: fetchTrendingSongs,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useNewArrivals() {
  return useQuery({
    queryKey: ["homepage-new-arrivals"],
    queryFn: fetchNewArrivals,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useRecentArrangements(userId: string | undefined) {
  return useQuery({
    queryKey: ["homepage-recent-arrangements", userId],
    queryFn: () => (userId ? fetchRecentArrangements(userId) : Promise.resolve({ songs: [], creators: new Map() })),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useSongsInLibrary(userId: string | undefined) {
  return useQuery({
    queryKey: ["songs-in-library", userId],
    queryFn: () => (userId ? fetchSongsInLibrary(userId) : Promise.resolve(new Set<string>())),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFollowingSongs(userId: string | undefined, limit: number = 12) {
  return useQuery({
    queryKey: ["homepage-following-songs", userId, limit],
    queryFn: () => (userId ? fetchFollowingSongs(userId, limit) : Promise.resolve({ songs: [], creators: new Map() })),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
