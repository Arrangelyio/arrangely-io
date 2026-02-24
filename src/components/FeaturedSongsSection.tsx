import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Play, 
  Music, 
  Clock, 
  Eye, 
  Plus, 
  ArrowRight,
  Sparkles,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Link } from "react-router-dom";

interface FeaturedSong {
  id: string;
  title: string;
  artist: string;
  current_key: string;
  tempo: number;
  views_count: number;
  tags: string[];
  user_id: string;
  slug: string;
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

export const FeaturedSongsSection = () => {
  const [featuredSongs, setFeaturedSongs] = useState<FeaturedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useUserRole();
  const { subscriptionStatus } = useSubscription();

  useEffect(() => {
    const fetchFeaturedSongs = async () => {
      try {
        // Get trusted arrangers first
        const { data: trustedArrangers } = await supabase.functions.invoke("trusted-arrangers");
        
        if (!trustedArrangers || trustedArrangers.length === 0) {
          setLoading(false);
          return;
        }

        // Extract user IDs (exclude the special "arrangely_creator_group" entry)
        const creatorIds = trustedArrangers
          .filter((arranger: any) => arranger.user_id !== "arrangely_creator_group")
          .map((arranger: any) => arranger.user_id);

        // Fetch songs from trusted arrangers
        const { data: songs, error } = await supabase
          .from("songs")
          .select(`
            id,
            title,
            artist,
            current_key,
            tempo,
            views_count,
            tags,
            user_id,
            profiles!inner(display_name, avatar_url)
          `)
          .eq("is_public", true)
          .in("user_id", creatorIds)
          .order("views_count", { ascending: false })
          .limit(6);

        if (error) {
          console.error("Error fetching featured songs:", error);
          return;
        }

        setFeaturedSongs(songs || []);
      } catch (error) {
        console.error("Error in fetchFeaturedSongs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedSongs();
  }, []);

  useEffect(() => {
    if (user && featuredSongs.length > 0) {
      const fetchUserInteractions = async () => {
        try {
          const songIds = featuredSongs.map(song => song.id);

          // Fetch liked songs
          const { data: likes } = await supabase
            .from("song_likes")
            .select("song_id")
            .eq("user_id", user.id)
            .in("song_id", songIds);

          if (likes) {
            setLikedSongs(new Set(likes.map(like => like.song_id)));
          }

          // Fetch songs in library
          const { data: libraryActions } = await supabase
            .from("user_library_actions")
            .select("song_id")
            .eq("user_id", user.id)
            .eq("action_type", "add_to_library")
            .in("song_id", songIds);

          if (libraryActions) {
            setSongsInLibrary(new Set(libraryActions.map(action => action.song_id)));
          }
        } catch (error) {
          console.error("Error fetching user interactions:", error);
        }
      };

      fetchUserInteractions();
    }
  }, [user, featuredSongs]);

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
        
        setLikedSongs(prev => {
          const newSet = new Set(prev);
          newSet.delete(songId);
          return newSet;
        });
      } else {
        await supabase
          .from("song_likes")
          .insert({ user_id: user.id, song_id: songId });
        
        setLikedSongs(prev => new Set([...prev, songId]));
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

  const handleAddToLibrary = async (song: FeaturedSong) => {
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
      await supabase
        .from("user_library_actions")
        .insert({
          user_id: user.id,
          song_id: song.id,
          action_type: "add_to_library"
        });

      setSongsInLibrary(prev => new Set([...prev, song.id]));

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2 mx-auto"></div>
          <div className="h-4 w-80 bg-muted rounded animate-pulse mx-auto"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (featuredSongs.length === 0) return null;

  return (
    <div className="container mx-auto px-4 py-12 bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-accent" />
          <h2 className="text-3xl font-bold text-primary">Featured Arrangements</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover the most popular arrangements from our trusted creators, carefully curated for quality and creativity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                        <h3 className="font-semibold text-primary text-lg leading-tight line-clamp-2 group-hover:text-primary/80 transition-colors">
                          {song.title}
                        </h3>
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
                      <Link to={`/arrangement/${song.id}/${song.slug}`} className="flex-1">
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

      <div className="text-center">
        <Link to="/community-library">
          <Button size="lg" className="bg-primary hover:bg-primary/90">
            Browse All Arrangements
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
};