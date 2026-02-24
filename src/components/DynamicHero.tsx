import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel";
import { motion, AnimatePresence } from "framer-motion";
import {
    Heart,
    Play,
    Music,
    Sparkles,
    ArrowRight,
    X,
    GraduationCap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Autoplay from "embla-carousel-autoplay";
import VerifiedBadge from "@/components/ui/verified-badge";
import { Capacitor } from "@capacitor/core";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";

// IMPORT GAMBAR DARI ASSETS
import bannerMusic from "@/assets/banner_mucis.jpeg";

interface FeaturedSong {
    id: string;
    title: string;
    artist: string;
    current_key: string;
    tempo: number;
    views_count: number;
    tags: string[];
    user_id: string;
    youtube_link: string;
    youtube_thumbnail: string;
    slug: string;
    profiles?: {
        display_name: string;
        avatar_url: string;
        creator_type: string;
    };
}

// Cache for featured songs data
const featuredSongsCache = {
    data: null as FeaturedSong[] | null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
};

// Debounce utility
const debounce = <T extends (...args: unknown[]) => void>(
    func: T,
    wait: number,
) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const DynamicHero = () => {
    const [featuredSongs, setFeaturedSongs] = useState<FeaturedSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
    const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(
        new Set(),
    );
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);

    // STATE UNTUK POPUP
    const [showPromoPopup, setShowPromoPopup] = useState(false);

    // Refs for optimization
    const lastFetchTime = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const { toast } = useToast();
    const { user } = useUserRole();
    const { subscriptionStatus } = useSubscription();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // EFFECT UNTUK MENAMPILKAN POPUP
    // EFFECT UNTUK MENAMPILKAN POPUP (LOGIC SEKALI SEHARI)
    useEffect(() => {
        // Kunci unik untuk penyimpanan data
        const STORAGE_KEY = "arrangely_promo_last_seen";

        // Ambil tanggal hari ini dalam format string (contoh: "Wed Dec 31 2025")
        // Ini otomatis mereset setiap lewat tengah malam
        const todayStr = new Date().toDateString();

        // Ambil data tanggal terakhir user melihat popup
        const lastSeenDate = localStorage.getItem(STORAGE_KEY);

        // LOGIC: Jika belum pernah lihat ATAU tanggal terakhir lihat BUKAN hari ini
        if (lastSeenDate !== todayStr) {
            const timer = setTimeout(() => {
                setShowPromoPopup(true);
                // Langsung catat bahwa user sudah melihat popup hari ini
                localStorage.setItem(STORAGE_KEY, todayStr);
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const initNavigationBar = async () => {
            // Cek apakah berjalan di Native (Android/iOS)
            if (Capacitor.isNativePlatform()) {
                try {
                    // 1. Pastikan navigation bar muncul
                    await NavigationBar.show();

                    await NavigationBar.setColor({ color: "#333333" });
                } catch (error) {
                    console.error("Error setting navigation bar:", error);
                }
            }
        };

        initNavigationBar();
    }, []);

    const fetchFeaturedSongs = useCallback(async (forceRefresh = false) => {
        const now = Date.now();

        if (
            !forceRefresh &&
            featuredSongsCache.data &&
            now - featuredSongsCache.timestamp < featuredSongsCache.ttl
        ) {
            setFeaturedSongs(featuredSongsCache.data);
            setLoading(false);
            return;
        }

        if (now - lastFetchTime.current < 1000) {
            return;
        }
        lastFetchTime.current = now;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            setLoading(true);

            const { data: songs, error } = await supabase
                .rpc("get_weekly_trending_songs", {
                    days_back: 1,
                    limit_count: 12,
                })
                .abortSignal(signal);

            if (error) {
                if (error.name !== "AbortError") {
                    console.error("Error fetching featured songs:", error);
                    if (featuredSongsCache.data) {
                        setFeaturedSongs(featuredSongsCache.data);
                    }
                }
                return;
            }

            if (songs && songs.length > 0) {
                const songsWithProfiles = songs.map((song) => {
                    return {
                        ...song,
                        profiles: {
                            display_name:
                                song.creator_type === "creator_arrangely"
                                    ? "Arrangely Creator"
                                    : song.display_name,
                            avatar_url: song.avatar_url,
                            creator_type: song.creator_type,
                        },
                    };
                });

                featuredSongsCache.data = songsWithProfiles as FeaturedSong[];
                featuredSongsCache.timestamp = now;

                setFeaturedSongs(songsWithProfiles as FeaturedSong[]);
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error in fetchFeaturedSongs:", error);
                if (featuredSongsCache.data) {
                    setFeaturedSongs(featuredSongsCache.data);
                }
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, []);

    useEffect(() => {
        fetchFeaturedSongs();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchFeaturedSongs]);

    const fetchUserInteractions = useCallback(async () => {
        if (!user || featuredSongs.length === 0) return;

        try {
            const songIds = featuredSongs.map((song) => song.id);
            const [likesResult, libraryResult] = await Promise.all([
                supabase
                    .from("song_likes")
                    .select("song_id")
                    .eq("user_id", user.id)
                    .in("song_id", songIds),
                supabase
                    .from("user_library_actions")
                    .select("song_id")
                    .eq("user_id", user.id)
                    .eq("action_type", "add_to_library")
                    .in("song_id", songIds),
            ]);

            if (likesResult.data) {
                setLikedSongs(
                    new Set(likesResult.data.map((like) => like.song_id)),
                );
            }

            if (libraryResult.data) {
                setSongsInLibrary(
                    new Set(libraryResult.data.map((action) => action.song_id)),
                );
            }
        } catch (error) {
            console.error("Error fetching user interactions:", error);
        }
    }, [user, featuredSongs]);

    useEffect(() => {
        fetchUserInteractions();
    }, [fetchUserInteractions]);

    useEffect(() => {
        if (!api) return;
        setCount(api.scrollSnapList().length);
        setCurrent(api.selectedScrollSnap() + 1);
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1);
        });
    }, [api]);

    const handleLike = useCallback(
        (songId: string) => {
            const debouncedLike = debounce(async (songId: string) => {
                if (!user) {
                    toast({
                        title: "Authentication Required",
                        description: "Please sign in to like songs.",
                        variant: "destructive",
                    });
                    return;
                }

                const isLiked = likedSongs.has(songId);
                setLikedSongs((prev) => {
                    const newSet = new Set(prev);
                    if (isLiked) {
                        newSet.delete(songId);
                    } else {
                        newSet.add(songId);
                    }
                    return newSet;
                });

                try {
                    if (isLiked) {
                        await supabase
                            .from("song_likes")
                            .delete()
                            .eq("user_id", user.id)
                            .eq("song_id", songId);
                    } else {
                        await supabase
                            .from("song_likes")
                            .insert({ user_id: user.id, song_id: songId });
                    }
                } catch (error) {
                    console.error("Error liking/unliking song:", error);
                    setLikedSongs((prev) => {
                        const newSet = new Set(prev);
                        if (isLiked) {
                            newSet.add(songId);
                        } else {
                            newSet.delete(songId);
                        }
                        return newSet;
                    });
                    toast({
                        title: "Error",
                        description: "Failed to update like status.",
                        variant: "destructive",
                    });
                }
            }, 300);
            debouncedLike(songId);
        },
        [user, likedSongs, toast],
    );

    const handleAddToLibrary = useCallback(
        async (song: FeaturedSong) => {
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
                    description:
                        "Please subscribe to add songs to your library.",
                    variant: "destructive",
                });
                return;
            }

            if (songsInLibrary.has(song.id)) return;

            setSongsInLibrary((prev) => new Set([...prev, song.id]));

            try {
                await supabase.from("user_library_actions").insert({
                    user_id: user.id,
                    song_id: song.id,
                    action_type: "add_to_library",
                });
                toast({
                    title: "Success",
                    description: `"${song.title}" added to your library!`,
                });
            } catch (error) {
                console.error("Error adding to library:", error);
                setSongsInLibrary((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(song.id);
                    return newSet;
                });
                toast({
                    title: "Error",
                    description: "Failed to add song to library.",
                    variant: "destructive",
                });
            }
        },
        [user, subscriptionStatus, songsInLibrary, toast],
    );

    // Helper functions for YouTube thumbnails (kept same as original)
    const getYouTubeThumbnailFromTitle = useCallback((song: FeaturedSong) => {
        const title = song.title;
        const artist = song.artist || "";
        // ... logic remains same ...
        return null;
    }, []);

    const extractYouTubeVideoId = useCallback((url: string): string => {
        if (url) {
            const regExp =
                /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
            const match = url.match(regExp);
            return match && match[1] && match[1].length === 11 ? match[1] : "";
        }
        return "";
    }, []);

    if (loading) {
        return (
            <section className="pt-28 pb-16 px-4 bg-gradient-worship min-h-screen flex items-center">
                <div className="container mx-auto">
                    <div className="h-12 w-full max-w-lg bg-white/20 rounded animate-pulse mb-8 mx-auto"></div>
                    <div className="h-96 w-full bg-white/10 rounded-2xl animate-pulse"></div>
                </div>
            </section>
        );
    }

    return (
        <>
            <section
                className={`
        ${Capacitor.isNativePlatform() ? "pt-16" : "pt-8"} 
        pb-8 px-4 bg-gradient-worship relative overflow-hidden
      `}
            >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30"></div>

                <div className="container mx-auto relative z-10">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 leading-tight"
                        >
                            {t("hero.mainHeading")}{" "}
                            <span className="block bg-gradient-to-r pb-2 from-accent to-yellow-300 bg-clip-text text-transparent">
                                {t("hero.mainHeadingAccent")}
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-sm md:text-base text-white/90 mb-6 max-w-2xl mx-auto"
                        >
                            {t("hero.mainSubheading")}
                        </motion.p>
                    </div>

                    {/* ----------------------------------------------------------- */}
                    {/* POSISI 1: TRENDING (CAROUSEL) DI ATAS WIDGET MUSIC LAB */}
                    {/* ----------------------------------------------------------- */}

                    {/* Trending Badge */}
                    <div className="text-center mb-4">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
                        >
                            <Sparkles className="h-4 w-4 text-accent" />
                            <span className="text-white font-medium text-sm">
                                {t("hero.trendingBadge")}
                            </span>
                        </motion.div>
                    </div>

                    {/* Song Carousel */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="max-w-4xl mx-auto mb-8"
                    >
                        <Carousel
                            setApi={setApi}
                            className="w-full"
                            plugins={[
                                Autoplay({
                                    delay: 5000,
                                }),
                            ]}
                        >
                            <CarouselContent>
                                {featuredSongs.map((song, index) => {
                                    const videoId =
                                        getYouTubeThumbnailFromTitle(song);
                                    const youtubeVideoId =
                                        extractYouTubeVideoId(
                                            song.youtube_link,
                                        );

                                    return (
                                        <CarouselItem
                                            key={song.id}
                                            className="md:basis-1/2 lg:basis-1/3"
                                        >
                                            <div className="p-2">
                                                {/* 3D Disc/Album Style Card */}
                                                <div
                                                    className="group relative perspective-1000 cursor-pointer"
                                                    onClick={() =>
                                                        navigate(
                                                            `/arrangement/${song.id}/${song.slug}`,
                                                        )
                                                    }
                                                >
                                                    <div className="relative w-full h-80 transition-all duration-500 transform-style-preserve-3d group-hover:rotate-y-6 group-hover:rotate-x-2">
                                                        {/* Main card */}
                                                        <div className="absolute inset-0 w-full h-full rounded-2xl bg-white shadow-2xl transform transition-all duration-500 group-hover:shadow-worship">
                                                            {/* Album cover area */}
                                                            <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 rounded-t-2xl overflow-hidden">
                                                                {/* YouTube thumbnail */}
                                                                <img
                                                                    src={
                                                                        song.youtube_thumbnail ||
                                                                        `https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`
                                                                    }
                                                                    alt={`${song.title} thumbnail`}
                                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                    onError={(
                                                                        e,
                                                                    ) => {
                                                                        // Fallback to gradient if YouTube thumbnail fails
                                                                        const target =
                                                                            e.currentTarget;
                                                                        target.style.display =
                                                                            "none";
                                                                        const parent =
                                                                            target.parentElement;
                                                                        if (
                                                                            parent
                                                                        ) {
                                                                            const fallback =
                                                                                parent.querySelector(
                                                                                    ".fallback-gradient",
                                                                                ) as HTMLElement;
                                                                            const icon =
                                                                                parent.querySelector(
                                                                                    ".fallback-icon",
                                                                                ) as HTMLElement;
                                                                            if (
                                                                                fallback
                                                                            )
                                                                                fallback.style.display =
                                                                                    "block";
                                                                            if (
                                                                                icon
                                                                            )
                                                                                icon.style.display =
                                                                                    "flex";
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        display:
                                                                            song.youtube_thumbnail ||
                                                                            youtubeVideoId
                                                                                ? "block"
                                                                                : "none",
                                                                    }}
                                                                />

                                                                {/* Fallback gradient for songs without video IDs */}
                                                                <div
                                                                    className={`fallback-gradient absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-80 ${
                                                                        !(
                                                                            song.youtube_thumbnail ||
                                                                            youtubeVideoId
                                                                        )
                                                                            ? "block"
                                                                            : "hidden"
                                                                    }`}
                                                                ></div>

                                                                {/* Dark overlay for better text readability */}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                                                                {/* Fallback music icon */}
                                                                <div
                                                                    className={`fallback-icon absolute inset-0 items-center justify-center ${
                                                                        !(
                                                                            song.youtube_thumbnail ||
                                                                            youtubeVideoId
                                                                        )
                                                                            ? "flex"
                                                                            : "hidden"
                                                                    }`}
                                                                >
                                                                    <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                                                        <Music className="h-10 w-10 text-white" />
                                                                    </div>
                                                                </div>

                                                                {/* Play button overlay on hover */}
                                                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                                                    <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
                                                                        <Play className="h-8 w-8 text-white ml-1" />
                                                                    </div>
                                                                </div>

                                                                {/* Like button */}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/20 backdrop-blur hover:bg-white/30 z-10"
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        handleLike(
                                                                            song.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Heart
                                                                        className={`h-4 w-4 ${
                                                                            likedSongs.has(
                                                                                song.id,
                                                                            )
                                                                                ? "fill-red-500 text-red-500"
                                                                                : "text-white hover:text-red-300"
                                                                        } transition-colors`}
                                                                    />
                                                                </Button>
                                                            </div>

                                                            {/* Card content */}
                                                            <div className="p-4 space-y-3">
                                                                {/* Title and artist */}
                                                                <div>
                                                                    <h3 className="font-bold text-primary text-lg leading-tight line-clamp-2 mb-1">
                                                                        {
                                                                            song.title
                                                                        }
                                                                    </h3>
                                                                    <p className="text-muted-foreground text-sm truncate">
                                                                        by{" "}
                                                                        {song.artist ||
                                                                            "Unknown Artist"}
                                                                    </p>
                                                                </div>

                                                                {/* Creator info */}
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="w-6 h-6">
                                                                        <AvatarImage
                                                                            src={
                                                                                song
                                                                                    .profiles
                                                                                    ?.avatar_url ||
                                                                                ""
                                                                            }
                                                                        />
                                                                        <AvatarFallback className="text-xs">
                                                                            {song.profiles?.display_name?.charAt(
                                                                                0,
                                                                            ) ||
                                                                                "U"}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {song
                                                                            .profiles
                                                                            ?.display_name ||
                                                                            "Unknown Creator"}
                                                                    </span>
                                                                    {song
                                                                        .profiles
                                                                        ?.creator_type ===
                                                                        "creator_professional" && (
                                                                        <VerifiedBadge size="sm" />
                                                                    )}
                                                                </div>

                                                                {/* Tags */}
                                                                {/* <div className="flex flex-wrap gap-1 min-h-[20px]">
                              {song.tags?.slice(0, 3).map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className="text-xs px-2 py-1 max-w-[80px] truncate whitespace-nowrap overflow-hidden flex-shrink-0"
                                  title={tag}
                                >
                                  {tag.length > 12 ? `${tag.substring(0, 12)}...` : tag}
                                </Badge>
                              ))}
                              {song.tags && song.tags.length > 3 && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-2 py-1 flex-shrink-0"
                                >
                                  +{song.tags.length - 3}
                                </Badge>
                              )}
                            </div> */}

                                                                {/* Stats */}
                                                                {/* <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Music className="h-3 w-3" />
                                  <span>{song.current_key || "C"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{song.tempo || 120} BPM</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{song.views_count || 0}</span>
                              </div>
                            </div> */}

                                                                {/* Action buttons */}
                                                                {/* <div className="flex gap-2 pt-2">
                              <Link to={`/arrangement/${song.id}/${song.slug}`} className="flex-1">
                                <Button size="sm" variant="outline" className="w-full">
                                  <Play className="h-3 w-3 mr-1" />
                                  Preview
                                </Button>
                              </Link>
                              
                              {user && (
                                <Button
                                  size="sm"
                                  variant={songsInLibrary.has(song.id) ? "secondary" : "default"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToLibrary(song);
                                  }}
                                  disabled={songsInLibrary.has(song.id)}
                                  className="flex-shrink-0"
                                >
                                  {songsInLibrary.has(song.id) ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Plus className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleShare(song)}
                                className="flex-shrink-0"
                              >
                                <Share2 className="h-3 w-3" />
                              </Button>
                            </div> */}
                                                            </div>
                                                        </div>

                                                        {/* 3D shadow/depth effect */}
                                                        <div className="absolute inset-0 w-full h-full rounded-2xl bg-black/20 transform translate-x-2 translate-y-2 -z-10 transition-all duration-500 group-hover:translate-x-4 group-hover:translate-y-4"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CarouselItem>
                                    );
                                })}
                            </CarouselContent>
                            <CarouselPrevious className="left-4 bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30" />
                            <CarouselNext className="right-4 bg-white/20 backdrop-blur border-white/30 text-white hover:bg-white/30" />
                        </Carousel>

                        {/* Dots indicator */}
                        <div className="flex justify-center gap-2 mt-4">
                            {Array.from({ length: count }).map((_, index) => (
                                <button
                                    key={index}
                                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                        index + 1 === current
                                            ? "bg-accent scale-125"
                                            : "bg-white/30 hover:bg-white/50"
                                    }`}
                                    onClick={() => api?.scrollTo(index)}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* ----------------------------------------------------------- */}
                    {/* POSISI 2: WIDGET MUSIC LAB (DI BAWAH TRENDING) */}
                    {/* ----------------------------------------------------------- */}

                    {/* <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="max-w-4xl mx-auto mb-12"
                    >
                        <div
                            className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-2xl border border-white/10"
                            onClick={() => navigate("/arrangely-music-lab")}
                        >
                            <div className="absolute inset-0">
                                <img
                                    src={bannerMusic}
                                    alt="Music Lab Banner"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
                            </div>

                            <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="space-y-2 max-w-xl">
                                    <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-md px-3 py-1 rounded-full border border-accent/30 mb-2">
                                        <GraduationCap className="w-4 h-4 text-accent" />
                                        <span className="text-accent text-xs font-bold uppercase tracking-wider">
                                            Music Lab
                                        </span>
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                                        Master Bass Basics <br /> with{" "}
                                        <span className="text-accent">
                                            Barry Likumahuwa
                                        </span>
                                    </h3>
                                    <p className="text-gray-300 text-sm sm:text-base line-clamp-2">
                                        Pelajari teknik dasar hingga advance
                                        langsung dari ahlinya. Eksklusif hanya
                                        di Arrangely Music Lab.
                                    </p>
                                </div>

                                <Button
                                    className="bg-accent text-primary font-bold hover:bg-accent/90 shadow-[0_0_20px_rgba(255,215,0,0.3)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all shrink-0"
                                    size="lg"
                                >
                                    Start Learning
                                    <Play className="w-4 h-4 ml-2 fill-current" />
                                </Button>
                            </div>
                        </div>
                    </motion.div> */}

                    {/* ----------------------------------------------------------- */}
                    {/* CTAs */}
                    {/* ----------------------------------------------------------- */}

                    {user && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto"
                        >
                            <Link
                                to="/community-library"
                                className="w-full sm:w-auto"
                            >
                                <Button
                                    size="lg"
                                    className="bg-white text-primary hover:bg-white/90 font-semibold px-8 w-full shadow-lg"
                                >
                                    {t("hero.browseFullLibraryButton")}
                                    <ArrowRight className="h-5 w-5 ml-2" />
                                </Button>
                            </Link>
                            <Link
                                to={user ? "/library" : "/auth"}
                                className="w-full sm:w-auto"
                            >
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="bg-white/90 text-primary border-white hover:bg-white font-semibold px-8 w-full shadow-lg"
                                >
                                    <Music className="h-5 w-5 mr-2" />
                                    {t("hero.myLibraryButton")}
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </div>
            </section>

            {/* --- POP-UP MODAL PROMO (NEW) --- */}
            <AnimatePresence>
                {showPromoPopup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm"
                        onClick={() => setShowPromoPopup(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 300,
                            }}
                            className="relative w-full max-w-4xl" // Lebar max diperbesar agar gambar lebih jelas
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Tombol Close di luar gambar agar tidak menghalangi */}
                            <button
                                onClick={() => setShowPromoPopup(false)}
                                className="absolute -top-12 right-0 sm:-right-4 text-white/70 hover:text-white transition-colors p-2"
                            >
                                <X className="w-8 h-8" />
                            </button>

                            {/* Container Gambar */}
                            {/* <div
                                className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer bg-black"
                                onClick={() => {
                                    setShowPromoPopup(false);
                                    navigate("/arrangely-music-lab");
                                }}
                            >
                                <img
                                    src={bannerMusic}
                                    alt="Barry Likumahuwa Lesson"
                                    className="w-full h-auto object-contain"
                                />

                                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end justify-center pb-5 sm:pb-8">
                                    <Button className="bg-accent text-white font-bold hover:bg-accent/90 shadow-[0_0_15px_rgba(255,215,0,0.4)] scale-100 active:scale-95 transition-all text-sm px-5 py-2 sm:text-base sm:px-8 sm:py-3">
                                        Lihat Sekarang
                                    </Button>
                                </div>
                            </div> */}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* --- END POP-UP MODAL --- */}
        </>
    );
};

export default DynamicHero;
