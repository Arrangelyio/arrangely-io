// src/pages/ArtistSongsPage.jsx
// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  Music,
  Clock,
  Heart,
  Eye,
  Play,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  Verified,
  Share2,
  Upload,
} from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useLibraryLimit } from "@/hooks/useLibraryLimit";
import { LibraryLimitModal } from "@/components/LibraryLimitModal";
import PaymentModal from "@/components/payment/PaymentModal";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

const IS_TRIAL_ENABLED = false;

const extractYouTubeVideoId = (url: string | null | undefined): string => {
  if (!url) {
    return "";
  }
  const regExp =
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match && match[1] && match[1].length === 11 ? match[1] : "";
};

const detectArrangementType = (song: {
  /*...*/
}): "chord_grid" | "chord_lyrics" => {
  return "chord_lyrics";
};

const ArtistSongsPage = () => {
  const { artistName } = useParams<{ artistName: string }>();
  const decodedArtistName = artistName ? decodeURIComponent(artistName) : "";
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserRole();
  const { subscriptionStatus } = useSubscription();
  const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());
  const [archivedSongs, setArchivedSongs] = useState<Map<string, string>>(
    new Map()
  );
  const [addingToLibrary, setAddingToLibrary] = useState<Set<string>>(
    new Set()
  );
  const [currentUser, setCurrentUser] = useState<any>(null);

  const {
    libraryUsage,
    loading: libraryLoading,
    recordLibraryAction,
  } = useLibraryLimit();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingSongAdd, setPendingSongAdd] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const getCurrentUserAndLibrary = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setCurrentUser(authUser);
        if (authUser) {
          await checkSongsInLibrary(authUser.id);
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };
    getCurrentUserAndLibrary();
  }, []);

  const checkSongsInLibrary = async (userId: string) => {
    try {
      const { data: userSongs } = await supabase
        .from("songs")
        .select("id, title, artist, status")
        .eq("user_id", userId);

      if (userSongs) {
        const activeSet = new Set<string>();
        const archivedMap = new Map<string, string>();
        userSongs.forEach((userSong) => {
          const songKey = `${userSong.title}-${userSong.artist}`;
          if (userSong.status === "archived") {
            const key = `${userSong.title
              .trim()
              .toLowerCase()}|${userSong.artist.trim().toLowerCase()}`;
            archivedMap.set(key, userSong.id);
          } else {
            activeSet.add(songKey);
          }
        });
        setSongsInLibrary(activeSet);
        setArchivedSongs(archivedMap);
      }
    } catch (error) {
      console.error("Error checking songs in library:", error);
    }
  };

  useEffect(() => {
    const fetchArtistSongs = async () => {
      if (!decodedArtistName) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("songs")
          .select(
            `
            *,
            profiles (
              display_name,
              avatar_url,
              creator_slug,
              creator_type
            )
          `
          )
          .eq("is_public", true)
          .eq("artist", decodedArtistName)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const formattedData = (data || []).map((song) => {
          let displayArrangerName = "Community Member";
          let displayArrangerAvatar = null;
          let displayIsTrusted = false;

          if (song.profiles) {
            if (song.profiles.creator_type === "creator_arrangely") {
              displayArrangerName = "Creator Arrangely";
              displayIsTrusted = true;
            } else if (song.profiles.creator_type === "creator_professional") {
              displayArrangerName =
                song.profiles.display_name || "Professional";
              displayArrangerAvatar = song.profiles.avatar_url;
              displayIsTrusted = true;
            } else {
              displayArrangerName =
                song.profiles.display_name || "Community Member";
              displayArrangerAvatar = song.profiles.avatar_url;
              displayIsTrusted = false;
            }
          }

          return {
            ...song,
            key: song.current_key || song.original_key || "N/A",
            likes: song.likes_count || 0,
            views: song.views_count || 0,
            youtubeLink: song.youtube_link,
            youtubeThumbnail: song.youtube_thumbnail,
            arranger: displayArrangerName,
            arrangerAvatar: displayArrangerAvatar,
            creatorSlug: song.profiles?.creator_slug,
            is_trusted: displayIsTrusted,
            isLiked: false,
            isFavorited: false,
          };
        });

        setSongs(formattedData);
      } catch (error: any) {
        console.error("Error fetching artist songs:", error);
        toast({
          title: "Error",
          description: `Failed to load songs for ${decodedArtistName}. ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArtistSongs();
  }, [decodedArtistName, toast]);

  const handlePreview = (song: any) => {
    navigate(`/arrangement/${song.id}/${song.slug}`, {
      state: { from: `/artist/${artistName}` },
    });
  };

  const handleAddToLibrary = async (songId: string, title: string) => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add songs to your library",
        variant: "destructive",
      });
      return;
    }
    if (!libraryUsage.canAddMore) {
      setShowLimitModal(true);
      return;
    }
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
            id,
            plan_id,
            subscription_plans (
              id,
              library_limit
            )
          `
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      !subscriptionStatus?.hasActiveSubscription &&
      !subscriptionStatus?.isTrialing
    ) {
      if (subscriptionStatus?.hasSuccessfulPayment && !isCapacitorIOS()) {
        navigate("/pricing");
      }
      setPendingSongAdd({ id: songId, title });

      const planDetails = {
        name: "Monthly",
        price: 29000,
        features: [
          "Everything in Free",
          "Unlimited access to premium arrangements",
          "Unlimited PDF downloads",
          "+ 9 more features",
        ],
        interval_type: "month",
      };

      if (IS_TRIAL_ENABLED && subscriptionStatus?.canStartTrial) {
        setSelectedPlan({
          ...planDetails,
          id: "2f75a824-20ac-4da0-ac8d-879a03737a89",
          description: "Start your 7-day free trial to unlock all features.",
          withTrial: true,
        });
      } else {
        setSelectedPlan({
          ...planDetails,
          id: "plan_monthly_standard",
          description:
            "Your trial has ended. Subscribe to unlock all features.",
          withTrial: false,
        });
      }

      setIsPaymentModalOpen(true);
      return;
    }
    await continueAddToLibrary(songId, title);
  };

  const continueAddToLibrary = async (songId: string, title: string) => {
    setAddingToLibrary((prev) => new Set(prev).add(songId));
    try {
      const { data: originalSong, error: songError } = await supabase
        .from("songs")
        .select(`*, song_sections(*), arrangements(*)`)
        .eq("id", songId)
        .single();
      if (songError || !originalSong) {
        throw new Error("Failed to fetch song data");
      }

      let creatorUsername = "Unknown Creator";
      if (originalSong.user_id) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", originalSong.user_id)
          .single();

        if (creatorProfile) {
          creatorUsername = creatorProfile.display_name;
        }
      }
      const { data: existingSong } = await supabase
        .from("songs")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("title", originalSong.title)
        .eq("artist", originalSong.artist)
        .maybeSingle();

      if (existingSong) {
        toast({
          title: "Already in Library",
          description: `"${title}" is already in your library`,
          variant: "destructive",
        });
        return;
      }

      const { data: newSong, error: createError } = await supabase
        .from("songs")
        .insert({
          title: originalSong.title,
          artist: originalSong.artist,
          user_id: currentUser.id,
          original_key: originalSong.original_key,
          current_key: originalSong.current_key,
          tempo: originalSong.tempo,
          time_signature: originalSong.time_signature,
          capo: originalSong.capo,
          difficulty: originalSong.difficulty,
          theme: originalSong.theme,
          // notes: `Duplicated from creator arrangement. Original by: ${creatorUsername}`,
          tags: originalSong.tags,
          youtube_link: originalSong.youtube_link,
          youtube_thumbnail: originalSong.youtube_thumbnail,
          is_public: false,
          is_favorite: false,
          original_creator_id: originalSong.user_id,
        })
        .select()
        .single();

      if (createError || !newSong)
        throw new Error("Failed to create song copy");

      await recordLibraryAction(
        newSong.id,
        originalSong.id,
        originalSong.user_id,
        "add_to_library"
      );

      const sectionIdMapping = new Map();
      if (originalSong.song_sections && originalSong.song_sections.length > 0) {
        const sectionsToInsert = originalSong.song_sections.map((section) => ({
          song_id: newSong.id,
          section_type: section.section_type,
          name: section.name,
          lyrics: section.lyrics,
          chords: section.chords,
          bar_count: section.bar_count,
          section_time_signature: section.section_time_signature,
        }));
        const { data: newSections, error: sectionsError } = await supabase
          .from("song_sections")
          .insert(sectionsToInsert)
          .select();

        if (sectionsError) throw new Error("Failed to copy song sections");

        originalSong.song_sections.forEach((originalSection, index) => {
          if (newSections && newSections[index]) {
            sectionIdMapping.set(originalSection.id, newSections[index].id);
          }
        });
      }

      if (originalSong.arrangements && originalSong.arrangements.length > 0) {
        const arrangementsToInsert = originalSong.arrangements.map(
          (arrangement) => ({
            song_id: newSong.id,
            section_id:
              sectionIdMapping.get(arrangement.section_id) ||
              arrangement.section_id,
            position: arrangement.position,
            repeat_count: arrangement.repeat_count,
            notes: arrangement.notes,
          })
        );
        await supabase.from("arrangements").insert(arrangementsToInsert);
      }

      await supabase.rpc("increment_song_views", { song_id: songId });
      setSongs((prev) =>
        prev.map((s) => (s.id === songId ? { ...s, views: s.views + 1 } : s))
      );

      const songKey = `${originalSong.title}-${originalSong.artist}`;
      setSongsInLibrary((prev) => new Set(prev).add(songKey));

      toast({
        title: "Added to Your Library",
        description: `"${title}" is now available in your personal library.`,
      });
      navigate("/library");
    } catch (error) {
      console.error("Error adding to library:", error);
      toast({
        title: "Error",
        description: "Failed to add song to your library. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAddingToLibrary((prev) => {
        const newSet = new Set(prev);
        newSet.delete(songId);
        return newSet;
      });
    }
  };

  const handleUnarchive = async (
    songId: string,
    title: string,
    artist: string
  ) => {
    toast({ title: "Placeholder: Unarchive logic here" });
  };

  const handleShare = (song: any) => {
    const shareUrl = `${window.location.origin}/arrangement/${song?.id}/${song?.slug}`;
    navigator.clipboard.writeText(shareUrl).then(/*...*/);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary pt-20 pb-5">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {decodedArtistName}
          </h1>
          <p className="text-muted-foreground">
            {loading
              ? "Loading songs..."
              : `${songs.length} arrangement${
                  songs.length !== 1 ? "s" : ""
                } found.`}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-lg border bg-white dark:bg-gray-800 p-3 animate-pulse"
              >
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="w-full h-36 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mt-auto"></div>
              </div>
            ))}
          </div>
        ) : songs.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {songs.map((song) => (
              <motion.div key={song.id} variants={itemVariants} layout>
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <div className="flex items-start justify-between gap-2 min-h-[60px]">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight">
                          {song.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {song.artist}{" "}
                        </p>
                        <div className="mt-2">
                          <Badge
                            variant={
                              detectArrangementType(song) === "chord_grid"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {detectArrangementType(song) === "chord_grid"
                              ? "Chord Grid"
                              : "Chord + Lyrics"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          /* onClick={handleLike} */ className={
                            song.isLiked ? "text-red-500" : ""
                          }
                        >
                          {" "}
                          <Heart
                            className={`h-4 w-4 ${
                              song.isLiked ? "fill-current" : ""
                            }`}
                          />{" "}
                        </Button>
                        {/* <Button size="sm" variant="ghost" onClick={handleFavorite}> <Star className={`h-4 w-4 ${ song.isFavorited ? "fill-current" : "" }`} /> </Button> */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShare(song)}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 space-y-3 flex flex-col flex-grow">
                    <div className="space-y-1">
                      <div className="relative w-full h-32 sm:h-36 overflow-hidden rounded-lg bg-muted">
                        {song.youtubeThumbnail || song.youtubeLink ? (
                          <img
                            src={
                              song.youtubeThumbnail ||
                              `https://img.youtube.com/vi/${extractYouTubeVideoId(
                                song.youtubeLink
                              )}/mqdefault.jpg`
                            }
                            alt={`${song.title} thumbnail`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {" "}
                            <Music className="h-8 w-8 text-muted-foreground" />{" "}
                          </div>
                        )}
                      </div>
                      {/* Info Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Music className="h-4 w-4" />{" "}
                          <span className="truncate">{song.key}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />{" "}
                          <span className="truncate">{song.tempo} BPM</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-4 w-4" />{" "}
                          <span className="truncate">{song.likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" />{" "}
                          <span className="truncate">{song.views}</span>
                        </div>
                      </div>
                      {/* Info Arranger */}
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors" /* onClick={handleCreatorProfile} */
                      >
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={song.arrangerAvatar} />
                          <AvatarFallback className="text-xs">
                            {song.arranger
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground truncate pt-3 pb-3 hover:text-primary transition-colors cursor-pointer">
                          {" "}
                          by{" "}
                          <span className="hover:underline">
                            {song.arranger}
                          </span>
                        </span>
                        {song.is_trusted && (
                          <Verified className="h-3 w-3 inline-block ml-1 text-blue-500" />
                        )}
                      </div>
                    </div>
                    {/* Tombol Aksi */}
                    <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(song)}
                        className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                      >
                        {" "}
                        <Play className="h-4 w-4 mr-1" /> Preview{" "}
                      </Button>
                      {(() => {
                        const isSongInLibrary = songsInLibrary.has(
                          `${song.title}-${song.artist}`
                        );
                        const archivedId = archivedSongs.get(
                          `${song.title.trim().toLowerCase()}|${song.artist
                            .trim()
                            .toLowerCase()}`
                        );
                        const isAdding = addingToLibrary.has(song.id);

                        if (isAdding)
                          return (
                            <Button
                              size="sm"
                              disabled
                              className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                            >
                              {" "}
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />{" "}
                              Adding...{" "}
                            </Button>
                          );
                        if (archivedId)
                          return (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleUnarchive(
                                  archivedId,
                                  song.title,
                                  song.artist
                                )
                              }
                              className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                              variant="secondary"
                            >
                              {" "}
                              <Upload className="h-4 w-4 mr-1" /> Unarchive{" "}
                            </Button>
                          );
                        if (isSongInLibrary)
                          return (
                            <Button
                              size="sm"
                              disabled
                              className="w-full bg-green-600 hover:bg-green-600 h-8 text-xs sm:h-9 sm:text-sm"
                            >
                              {" "}
                              <Check className="h-4 w-4 mr-1" /> In Library{" "}
                            </Button>
                          );
                        return (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddToLibrary(song.id, song.title)
                            }
                            className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                          >
                            {" "}
                            <Plus className="h-4 w-4 mr-1" /> Add to Library{" "}
                          </Button>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                {/* --- Akhir Kartu Lagu --- */}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Arrangements Found
              </h3>
              <p className="text-muted-foreground">
                No public arrangements found for {decodedArtistName}.
              </p>
              {/* Mungkin tambahkan tombol Request Arrangement di sini? */}
            </CardContent>
          </Card>
        )}

        <LibraryLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          currentCount={libraryUsage.currentCount}
          limit={libraryUsage.limit}
          isTrialing={libraryUsage.isTrialing ?? false}
        />
        {selectedPlan && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={() => {
              setIsPaymentModalOpen(false);
              window.location.reload(); // Atau cara yang lebih baik untuk update state
            }}
            plan={selectedPlan}
          />
        )}
        {/* Tambahkan Pagination jika diperlukan */}
      </div>
    </div>
  );
};

export default ArtistSongsPage;
