import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";
import { SongCardSquare } from "@/components/ui/SongCardSquare";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Sparkles, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import DynamicNavigation from "@/components/DynamicNavigation";
import { Capacitor } from "@capacitor/core";

interface Song {
  id: string;
  title: string;
  artist: string;
  youtube_link?: string | null;
  youtube_thumbnail?: string | null;
  user_id?: string;
}

interface Creator {
  display_name?: string;
  avatar_url?: string | null;
  creator_type?: string;
}

const SORT_CONFIG = {
  trending: {
    title: "Trending This Week",
    icon: TrendingUp,
    iconColor: "text-orange-500",
  },
  newest: {
    title: "New Arrivals",
    icon: Sparkles,
    iconColor: "text-purple-500",
  },
  recent: {
    title: "Your Recent",
    icon: Clock,
    iconColor: "text-blue-500",
  },
  following: {
    title: "From Creators You Follow",
    icon: Users,
    iconColor: "text-green-500",
  },
};

export default function SongListing() {
  const [searchParams] = useSearchParams();
  const sortType = (searchParams.get("sort") as keyof typeof SORT_CONFIG) || "trending";
  const { t } = useLanguage();
  const { user } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscriptionStatus } = useSubscription();
  const isNative = Capacitor.isNativePlatform();

  const [songs, setSongs] = useState<Song[]>([]);
  const [creators, setCreators] = useState<Map<string, Creator>>(new Map());
  const [loading, setLoading] = useState(true);
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());

  const config = SORT_CONFIG[sortType] || SORT_CONFIG.trending;
  const Icon = config.icon;

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      try {
        let songsData: Song[] = [];

        if (sortType === "trending") {
          // Fetch trending songs using RPC
          const { data, error } = await supabase.rpc("get_weekly_trending_songs", {
            days_back: 7,
            limit_count: 50,
          });
          if (error) throw error;
          songsData = (data || []).map((item: any) => ({
            id: item.song_id,
            title: item.song_title,
            artist: item.artist,
            youtube_link: item.youtube_link,
            youtube_thumbnail: item.youtube_thumbnail,
            user_id: item.user_id,
          }));
        } else if (sortType === "newest") {
          // Fetch new arrivals from trusted creators
          const { data, error } = await supabase
            .from("songs")
            .select("id, title, artist, youtube_link, youtube_thumbnail, user_id")
            .eq("is_public", true)
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) throw error;
          songsData = data || [];
        } else if (sortType === "recent" && user) {
          // Fetch user's recent arrangements
          const { data, error } = await supabase
            .from("user_library_actions")
            .select("song_id, songs(id, title, artist, youtube_link, youtube_thumbnail, user_id)")
            .eq("user_id", user.id)
            .eq("action_type", "add_to_library")
            .order("created_at", { ascending: false })
            .limit(50);
          if (error) throw error;
          songsData = (data || [])
            .filter((item: any) => item.songs)
            .map((item: any) => item.songs);
        } else if (sortType === "following" && user) {
          // Fetch latest songs from creators the user follows (creator_pro or creator_professional)
          const { data: followingData, error: followingError } = await supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", user.id);

          if (followingError) throw followingError;

          const followingIds = (followingData || []).map((f) => f.following_id);

          if (followingIds.length > 0) {
            // Filter to only creator_pro or creator_professional
            const { data: creatorProfiles, error: profilesError } = await supabase
              .from("profiles")
              .select("user_id")
              .in("user_id", followingIds)
              .in("creator_type", ["creator_pro", "creator_professional"]);

            if (profilesError) throw profilesError;

            const validCreatorIds = (creatorProfiles || []).map((p) => p.user_id);

            if (validCreatorIds.length > 0) {
              const { data, error } = await supabase
                .from("songs")
                .select("id, title, artist, youtube_link, youtube_thumbnail, user_id")
                .eq("is_public", true)
                .in("user_id", validCreatorIds)
                .order("created_at", { ascending: false })
                .limit(50);
              if (error) throw error;
              songsData = data || [];
            }
          }
        }

        setSongs(songsData);

        // Fetch creators for songs
        const userIds = [...new Set(songsData.map((s) => s.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, creator_type")
            .in("user_id", userIds);

          const creatorsMap = new Map<string, Creator>();
          (profilesData || []).forEach((p) => {
            creatorsMap.set(p.user_id, {
              display_name: p.display_name || undefined,
              avatar_url: p.avatar_url,
              creator_type: p.creator_type || undefined,
            });
          });
          setCreators(creatorsMap);
        }

        // Fetch songs in library
        if (user) {
          const { data: libraryData } = await supabase
            .from("user_library_actions")
            .select("song_id")
            .eq("user_id", user.id)
            .eq("action_type", "add_to_library");
          setSongsInLibrary(new Set((libraryData || []).map((item) => item.song_id)));
        }
      } catch (error) {
        console.error("Error fetching songs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [sortType, user]);

  const handleSongClick = (song: Song) => {
    navigate(`/arrangement/${song.id}?source=community-library`);
  };

  const handleAddToLibrary = async (song: Song) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add songs to your library.",
        variant: "destructive",
      });
      return;
    }

    if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialing) {
      toast({
        title: "Subscription Required",
        description: "Please subscribe to add songs to your library.",
        variant: "destructive",
      });
      return;
    }

    try {
      await supabase.from("user_library_actions").insert({
        user_id: user.id,
        song_id: song.id,
        action_type: "add_to_library",
      });

      setSongsInLibrary((prev) => new Set([...prev, song.id]));
      toast({
        title: "Success",
        description: `"${song.title}" added to your library!`,
      });
    } catch (error) {
      console.error("Error adding to library:", error);
      toast({
        title: "Error",
        description: "Failed to add song to library.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DynamicNavigation isMobileView={isNative} />

      <div className={`pb-24 px-4 md:px-6 lg:px-8 
        ${Capacitor.isNativePlatform() ? "pt-36" : "pt-24"}
      `}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
            <h1 className="text-xl md:text-2xl font-bold">{config.title}</h1>
          </div>
        </div>

        {/* Songs Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="w-full aspect-square rounded-lg mb-2" />
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No songs found</p>
            <Button asChild className="mt-4">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {songs.map((song) => {
              const creator = song.user_id ? creators.get(song.user_id) : undefined;
              return (
                <SongCardSquare
                  key={song.id}
                  song={song}
                  creator={creator}
                  showCreatorBadge={true}
                  isInLibrary={songsInLibrary.has(song.id)}
                  onClick={() => handleSongClick(song)}
                  onAddToLibrary={() => handleAddToLibrary(song)}
                  size="md"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
