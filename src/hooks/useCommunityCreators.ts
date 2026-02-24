import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommunityCreator {
  user_id: string;
  name: string;
  display_name: string;
  avatar: string | null;
  avatar_url: string | null;
  arrangements: number;
  song_count: number;
  isTrusted: boolean;
  creator_slug: string | null;
  creator_type?: string;
}

/**
 * Hook to fetch all community creators (creator_pro + creator_arrangely)
 * Uses the community-creators edge function to get all creators regardless of pagination
 */
export function useCommunityCreators() {
  return useQuery({
    queryKey: ["community-creators-all"],
    queryFn: async (): Promise<CommunityCreator[]> => {
      const { data, error } = await supabase.functions.invoke("community-creators");

      if (error) {
        console.error("Error fetching community creators:", error);
        throw error;
      }

      // Map the response to include song_count for backwards compatibility
      return (data || []).map((creator: any) => ({
        ...creator,
        song_count: creator.arrangements || 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCommunitySongs({
  page = 1,
  pageSize = 12,
  sortBy = "recent",
}: {
  page?: number;
  pageSize?: number;
  sortBy?: "recent" | "popular" | "liked";
} = {}) {
  return useQuery({
    queryKey: ["community-songs", page, pageSize, sortBy],
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      // First get creator_pro user IDs
      const { data: creatorProUsers, error: usersError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("creator_type", "creator_pro");

      if (usersError || !creatorProUsers) {
        console.error("Error fetching creator_pro users:", usersError);
        return { songs: [], total: 0 };
      }

      const creatorProIds = creatorProUsers.map((u) => u.user_id);
      
      if (creatorProIds.length === 0) {
        return { songs: [], total: 0 };
      }

      // Build the query
      let query = supabase
        .from("songs")
        .select(
          `
          id,
          title,
          artist,
          youtube_thumbnail,
          views_count,
          likes_count,
          created_at,
          slug,
          user_id,
          current_key,
          profiles!inner (
            display_name,
            avatar_url,
            creator_slug
          )
        `,
          { count: "exact" }
        )
        .eq("is_public", true)
        .in("user_id", creatorProIds);

      // Apply sorting
      if (sortBy === "popular") {
        query = query.order("views_count", { ascending: false });
      } else if (sortBy === "liked") {
        query = query.order("likes_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error, count } = await query.range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Error fetching community songs:", error);
        return { songs: [], total: 0 };
      }

      const formattedSongs = (data || []).map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        youtube_thumbnail: song.youtube_thumbnail,
        views_count: song.views_count || 0,
        likes_count: song.likes_count || 0,
        created_at: song.created_at,
        slug: song.slug,
        user_id: song.user_id,
        current_key: song.current_key,
        arranger: song.profiles?.display_name || "Community Creator",
        arranger_avatar: song.profiles?.avatar_url,
        arranger_slug: song.profiles?.creator_slug,
      }));

      return {
        songs: formattedSongs,
        total: count || 0,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCommunityTrendingSongs(limit: number = 10) {
  return useQuery({
    queryKey: ["community-trending-songs", limit],
    queryFn: async () => {
      // First get creator_pro user IDs
      const { data: creatorProUsers } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("creator_type", "creator_pro");

      if (!creatorProUsers || creatorProUsers.length === 0) {
        return [];
      }

      const creatorProIds = creatorProUsers.map((u) => u.user_id);

      const { data, error } = await supabase
        .from("songs")
        .select(
          `
          id,
          title,
          artist,
          youtube_thumbnail,
          views_count,
          slug,
          user_id,
          current_key,
          profiles!inner (
            display_name,
            avatar_url,
            creator_slug
          )
        `
        )
        .eq("is_public", true)
        .in("user_id", creatorProIds)
        .order("views_count", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching trending community songs:", error);
        return [];
      }

      return (data || []).map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        youtube_thumbnail: song.youtube_thumbnail,
        views_count: song.views_count || 0,
        slug: song.slug,
        user_id: song.user_id,
        current_key: song.current_key,
        arranger: song.profiles?.display_name || "Community Creator",
        arranger_avatar: song.profiles?.avatar_url,
        arranger_slug: song.profiles?.creator_slug,
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCommunityFollowingSongs(userId: string | null, limit: number = 10) {
  return useQuery({
    queryKey: ["community-following-songs", userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      // Get followed creator IDs
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (!follows || follows.length === 0) return [];

      const followedIds = follows.map((f) => f.following_id);

      // Filter to only creator_pro
      const { data: creatorProUsers } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("creator_type", "creator_pro")
        .in("user_id", followedIds);

      if (!creatorProUsers || creatorProUsers.length === 0) return [];

      const creatorProFollowedIds = creatorProUsers.map((u) => u.user_id);

      const { data, error } = await supabase
        .from("songs")
        .select(
          `
          id,
          title,
          artist,
          youtube_thumbnail,
          views_count,
          slug,
          user_id,
          current_key,
          profiles!inner (
            display_name,
            avatar_url,
            creator_slug
          )
        `
        )
        .eq("is_public", true)
        .in("user_id", creatorProFollowedIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching following community songs:", error);
        return [];
      }

      return (data || []).map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        youtube_thumbnail: song.youtube_thumbnail,
        views_count: song.views_count || 0,
        slug: song.slug,
        user_id: song.user_id,
        current_key: song.current_key,
        arranger: song.profiles?.display_name || "Community Creator",
        arranger_avatar: song.profiles?.avatar_url,
        arranger_slug: song.profiles?.creator_slug,
      }));
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
