import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CreatorProfile {
  user_id: string;
  display_name: string;
  creator_slug: string;
  bio: string;
  avatar_url: string;
  instruments: string[];
  city: string;
  country: string;
  youtube_channel: string;
  creator_type: string;
  created_at: string;
}

export interface CreatorSong {
  youtubeLink: string;
  youtubeThumbnail: string;
  original_key: string;
  current_key: string;
  tempo: string;
  time_signature: string;
  id: string;
  title: string;
  artist: string;
  views_count: number;
  created_at: string;
  is_public: boolean;
  hasSequencer?: boolean;
  sequencerTrackCount?: number;
  sequencerPrice?: number;
}

export interface CreatorStats {
  totalSongs: number;
  totalViews: number;
  totalFollowers: number;
  monthlyViews: number;
}

export const useCreatorProfile = (slug?: string) => {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [songs, setSongs] = useState<CreatorSong[]>([]);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      fetchCreatorData(slug);
    }
  }, [slug]);

  const fetchCreatorData = async (creatorSlug: string) => {
    try {
      setLoading(true);

      // Fetch creator profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("creator_slug", creatorSlug)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error("Creator not found");

      setProfile(profileData);

      // Fetch creator's songs with sequencer file info
      const { data: songsData, error: songsError } = await supabase
        .from("songs")
        .select(
          `id, title, artist, views_count, created_at, is_public, youtube_link, youtube_thumbnail, time_signature, tempo, current_key, original_key,
          sequencer_files (
            id,
            tracks,
            sequencer_file_pricing (
              price
            )
          )`
        )
        .eq("user_id", profileData.user_id)
        .eq("is_public", true)
        .eq("is_production", true)
        .order("created_at", { ascending: false });

      if (songsError) throw songsError;

      // Transform from snake_case to camelCase and add sequencer info
      const formattedSongs = (songsData || []).map((song: any) => {
        const activeSequencer = song.sequencer_files?.find(Boolean);
        const pricing = activeSequencer?.sequencer_file_pricing?.[0];
        return {
          ...song,
          youtubeLink: song.youtube_link,
          youtubeThumbnail: song.youtube_thumbnail,
          hasSequencer: !!activeSequencer,
          sequencerTrackCount: activeSequencer?.tracks?.length || 0,
          sequencerPrice: pricing?.price || 0,
        };
      });

      setSongs(formattedSongs);

      // Fetch stats
      const totalViews =
        songsData?.reduce((sum, song) => sum + (song.views_count || 0), 0) || 0;

      const { count: followersCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileData.user_id);

      setStats({
        totalSongs: songsData?.length || 0,
        totalViews,
        totalFollowers: followersCount || 0,
        monthlyViews: Math.floor(totalViews * 0.3), // Rough estimate
      });

      // Check if current user follows this creator
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: followData } = await supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.user_id)
          .single();

        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error("Error fetching creator data:", error);
      toast({
        title: "Error",
        description: "Failed to load creator profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!profile) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to follow creators",
          variant: "destructive",
        });
        return;
      }

      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", profile.user_id);

        setIsFollowing(false);
        setStats((prev) =>
          prev ? { ...prev, totalFollowers: prev.totalFollowers - 1 } : null
        );
        toast({
          title: "Unfollowed",
          description: `You unfollowed ${profile.display_name}`,
        });
      } else {
        await supabase.from("user_follows").insert({
          follower_id: user.id,
          following_id: profile.user_id,
          is_production: true,
        });

        setIsFollowing(true);
        setStats((prev) =>
          prev ? { ...prev, totalFollowers: prev.totalFollowers + 1 } : null
        );
        toast({
          title: "Following",
          description: `You are now following ${profile.display_name}`,
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  return {
    profile,
    songs,
    stats,
    loading,
    isFollowing,
    toggleFollow,
  };
};
