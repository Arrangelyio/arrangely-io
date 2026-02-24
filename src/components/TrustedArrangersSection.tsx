import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  UserPlus,
  UserCheck,
  Verified,
  Crown,
  Heart,
  Play,
  Music,
  Clock,
  Eye,
  Plus,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Link, useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/ui/verified-badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface TrustedArranger {
  user_id: string;
  name: string;
  avatar: string | null;
  arrangements: number;
  isTrusted: boolean;
  creator_slug?: string;
}

interface FeaturedSong {
  id: string;
  title: string;
  artist: string;
  current_key: string;
  tempo: number;
  views_count: number;
  tags: string[];
  user_id: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
    creator_type?: string;
  };
}

export const TrustedArrangersSection = () => {
  const { t } = useLanguage();
  const [trustedArrangers, setTrustedArrangers] = useState<TrustedArranger[]>(
    []
  );
  const [featuredSongs, setFeaturedSongs] = useState<FeaturedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(true);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(
    new Set()
  );
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useUserRole();
  const { subscriptionStatus } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrustedArrangers = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "trusted-arrangers"
        );

        if (error) {
          console.error("Error fetching trusted arrangers:", error);
          return;
        }

        setTrustedArrangers(data || []);
      } catch (error) {
        console.error("Error in fetchTrustedArrangers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustedArrangers();
  }, []);

  useEffect(() => {
    const fetchFeaturedSongs = async () => {
      try {
        // 1. Ambil songs
        const { data: songs, error: songsError } = await supabase
          .from("songs")
          .select(
            "id, title, artist, current_key, tempo, views_count, tags, user_id"
          )
          .eq("is_public", true)
          .order("views_count", { ascending: false })
          .limit(12);

        if (songsError) {
          console.error("Error fetching songs:", songsError);
          return;
        }

        // 2. Ambil user_id unik
        const userIds = [...new Set(songs.map((s) => s.user_id))];

        // 3. Ambil profiles berdasarkan user_id
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, creator_type")
          .in("user_id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          return;
        }

        // 4. Gabungkan manual songs + profiles
        const songsWithProfiles = songs.map((song) => ({
          ...song,
          profile: profiles.find((p) => p.user_id === song.user_id) || null,
        }));

        // 5. Filter trusted
        const trustedSongs = songsWithProfiles.filter(
          (song) =>
            song.profile?.creator_type === "creator_arrangely" ||
            song.profile?.creator_type === "creator_professional"
        );

        // 6. Final mix
        const finalSongs =
          trustedSongs.length >= 6
            ? trustedSongs.slice(0, 6)
            : [
                ...trustedSongs,
                ...songsWithProfiles
                  .filter(
                    (song) =>
                      song.profile?.creator_type !== "creator_arrangely" &&
                      song.profile?.creator_type !== "creator_professional"
                  )
                  .slice(0, 6 - trustedSongs.length),
              ];

        
        setFeaturedSongs(finalSongs);
      } catch (error) {
        console.error("Error in fetchFeaturedSongs:", error);
      } finally {
        setSongsLoading(false);
      }
    };

    fetchFeaturedSongs();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUserInteractions = async () => {
        try {
          // Fetch followed creators
          const { data: follows } = await supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", user.id);

          if (follows) {
            setFollowedCreatorIds(new Set(follows.map((f) => f.following_id)));
          }

          // Fetch user interactions with songs
          if (featuredSongs.length > 0) {
            const songIds = featuredSongs.map((song) => song.id);

            // Fetch liked songs
            const { data: likes } = await supabase
              .from("song_likes")
              .select("song_id")
              .eq("user_id", user.id)
              .in("song_id", songIds);

            if (likes) {
              setLikedSongs(new Set(likes.map((like) => like.song_id)));
            }

            // Fetch songs in library
            const { data: libraryActions } = await supabase
              .from("user_library_actions")
              .select("song_id")
              .eq("user_id", user.id)
              .eq("action_type", "add_to_library")
              .in("song_id", songIds);

            if (libraryActions) {
              setSongsInLibrary(
                new Set(libraryActions.map((action) => action.song_id))
              );
            }
          }
        } catch (error) {
          console.error("Error fetching user interactions:", error);
        }
      };

      fetchUserInteractions();
    }
  }, [user, featuredSongs]);

  const handleFollow = async (creatorId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to follow creators.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isFollowing = followedCreatorIds.has(creatorId);

      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", creatorId);

        setFollowedCreatorIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(creatorId);
          return newSet;
        });
      } else {
        await supabase
          .from("user_follows")
          .insert({ follower_id: user.id, following_id: creatorId });

        setFollowedCreatorIds((prev) => new Set([...prev, creatorId]));
      }
    } catch (error) {
      console.error("Error following/unfollowing creator:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (songId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to like songs.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isLiked = likedSongs.has(songId);

      if (isLiked) {
        await supabase
          .from("song_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("song_id", songId);

        setLikedSongs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(songId);
          return newSet;
        });
      } else {
        await supabase
          .from("song_likes")
          .insert({ user_id: user.id, song_id: songId });

        setLikedSongs((prev) => new Set([...prev, songId]));
      }
    } catch (error) {
      console.error("Error liking/unliking song:", error);
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive",
      });
    }
  };

  const handleCreatorClick = (arranger: TrustedArranger) => {
    // Navigate to community library with creator filter
    navigate("/community-library", {
      state: {
        // UBAH INI: Kirim UUID di 'creatorFilter' sesuai ekspektasi Edge Function
        creatorFilter: arranger.user_id,
        // TAMBAH INI: Kirim nama asli untuk keperluan tampilan di halaman berikutnya
        creatorName: arranger.name,

        // 'creatorId' ini sekarang mungkin tidak diperlukan,
        // tapi tidak apa-apa jika tetap ada
        creatorId: arranger.user_id,
      },
    });
  };

  const handleCreatorProfile = (arranger: TrustedArranger) => {
    // Navigate to creator profile page using the creator slug
    if (arranger.creator_slug) {
      navigate(`/creator/${arranger.creator_slug}`);
    } else {
      toast({
        title: "Creator Profile",
        description: "Creator profile not available",
        variant: "destructive",
      });
    }
  };

  const handleAddToLibrary = async (song: FeaturedSong) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add songs to your library.",
        variant: "destructive",
      });
      return;
    }

    if (
      !subscriptionStatus?.hasActiveSubscription &&
      !subscriptionStatus?.isTrialing
    ) {
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

  if (loading || songsLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        {/* Arrangers Loading */}
        <div className="mb-8 text-center">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2 mx-auto"></div>
          <div className="h-4 w-80 bg-muted rounded animate-pulse mx-auto"></div>
        </div>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 text-center w-24"
            >
              <div className="h-16 w-16 sm:h-20 sm:w-20 bg-muted rounded-full animate-pulse"></div>
              <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
              <div className="h-2 w-12 bg-muted rounded animate-pulse"></div>
              <div className="h-6 w-20 bg-muted rounded animate-pulse mt-2"></div>
            </div>
          ))}
        </div>

        {/* Songs Loading */}
        <div className="mt-16">
          <div className="mb-8 text-center">
            <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2 mx-auto"></div>
            <div className="h-4 w-80 bg-muted rounded animate-pulse mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-muted rounded-lg animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trustedArrangers.length === 0 && featuredSongs.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown className="h-6 w-6 text-yellow-500" />
          <h2 className="text-3xl font-bold text-primary">
            {/* Meet Our Trusted Arrangers */}
            {t("arrangers.title")}
          </h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {/* Discover professional musicians and top contributors who create
          high-quality arrangements for our community. */}

          {t("arrangers.description")}
        </p>
      </div>

      <div className="relative">
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 px-4">
          <AnimatePresence>
            {trustedArrangers.slice(0, 8).map((arranger, index) => (
              <motion.div
                key={arranger.user_id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  duration: 0.3,
                  ease: "easeOut",
                  delay: index * 0.1,
                }}
                className="flex flex-col items-center gap-2 text-center w-24 cursor-pointer group"
                onClick={() => handleCreatorClick(arranger)}
              >
                <div className="relative">
                  <Avatar
                    className={`h-16 w-16 sm:h-20 sm:w-20 transition-all duration-300 transform group-hover:scale-105 ring-4 ring-offset-2 dark:ring-offset-blue-200 ring-transparent group-hover:ring-primary/30`}
                  >
                    <AvatarImage
                      src={
                        arranger.name === "Arrangely Creator"
                          ? "/LOGO_BACK.png"
                          : arranger.avatar || ""
                      }
                      className="object-cover h-full w-full"
                    />
                    <AvatarFallback className="text-2xl sm:text-3xl bg-primary/10 text-primary font-semibold">
                      {arranger.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {arranger.isTrusted &&
                    arranger.name !== "Arrangely Creator" && (
                      <div className="absolute -top-1 -right-1">
                        <VerifiedBadge size="sm" />
                      </div>
                    )}
                </div>

                <div className="min-w-0 flex-grow flex flex-col justify-between">
                  <div>
                    <p className="font-semibold text-xs text-foreground truncate">
                      {arranger.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {arranger.arrangements} song
                      {arranger.arrangements !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreatorProfile(arranger);
                    }}
                    className="w-24 sm:w-24 mt-3 h-7 sm:h-8 text-xs"
                  >
                    {/* View Profile */}
                    {t("arrangers.viewProfile")}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Featured Songs Section - Always show if we have songs
      {featuredSongs.length > 0 && (
        <div className="mt-16">
          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-primary mb-2">Most Popular Arrangements</h3>
            <p className="text-muted-foreground">
              The most viewed arrangements from our community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {featuredSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden bg-card/80 backdrop-blur-sm">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4 border-b border-border/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-primary text-lg leading-tight line-clamp-2 group-hover:text-primary/80 transition-colors">
                              {song.title}
                            </h4>
                            <p className="text-muted-foreground text-sm mt-1">
                              by {song.artist || "Unknown Artist"}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-shrink-0 h-8 w-8 p-0"
                            onClick={() => handleLike(song.id)}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                likedSongs.has(song.id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-muted-foreground hover:text-red-500"
                              } transition-colors`}
                            />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={song.profiles?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {song.profiles?.display_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {song.profiles?.display_name || "Unknown Creator"}
                          </span>
                          {(song.profiles as any)?.creator_type === "creator_arrangely" && (
                            <VerifiedBadge size="sm" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {song.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            <span>Key: {song.current_key || "C"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{song.tempo || 120} BPM</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>{song.views_count || 0} views</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Link to={`/arrangement/${song.id}`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Play className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                          
                          {user && (
                            <Button
                              size="sm"
                              variant={songsInLibrary.has(song.id) ? "secondary" : "default"}
                              onClick={() => handleAddToLibrary(song)}
                              disabled={songsInLibrary.has(song.id)}
                              className="flex-shrink-0"
                            >
                              {songsInLibrary.has(song.id) ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )} */}

      <div className="text-center mt-8">
        <Link to="/community-library">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            {/* Explore All Creators */}
            {t("arrangers.exploreAll")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
