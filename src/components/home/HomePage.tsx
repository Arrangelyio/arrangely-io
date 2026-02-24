import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, Clock, Users, X, Calendar, EyeOff } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOfflineDetection } from "@/hooks/useOfflineDetection";
import { OfflineConnectionBanner } from "@/components/capacitor/OfflineConnectionBanner";
import { MusicAnimatedBackground } from "@/components/backgrounds/MusicAnimatedBackground";

import { StoryCircleRow } from "./StoryCircleRow";
import { SongCarouselRow } from "./SongCarouselRow";
import {
    useTrustedArrangers,
    type TrustedArranger,
} from "@/hooks/useTrustedArrangers";
import {
    useTrendingSongs,
    useNewArrivals,
    useRecentArrangements,
    useSongsInLibrary,
    useFollowingSongs,
} from "@/hooks/useHomepageSongs";
import { SequencerHighlightCarousel } from "@/components/sequencer/SequencerHighlightCarousel";
import FeaturedLessonsCarousel from "@/components/lessons/FeaturedLessonsCarousel";
import EventsSection from "@/components/EventsSection";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile"; // Pastikan hook ini tersedia
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import webinarBanner from "@/assets/webinar.jpeg";
import { createPortal } from "react-dom";


const HomePromoBanner = () => {
    const [showBanner, setShowBanner] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Cek apakah user sudah menekan tombol "Don't show again" hari ini
        const snoozedAt = localStorage.getItem("snooze-promo-feb2026");
        const now = new Date().getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;

        // Jika ada data snooze dan belum lewat 24 jam, jangan tampilkan banner
        if (snoozedAt && (now - parseInt(snoozedAt) < oneDayInMs)) {
            return;
        }

        const timer = setTimeout(() => {
            setShowBanner(true);
        }, 800);
        
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        // Hanya menyembunyikan banner dari UI (akan muncul lagi kalau di-refresh)
        setShowBanner(false);
    };

    const handleSnooze = (e: React.MouseEvent) => {
        // Hentikan event onClick dari container parent (supaya tidak redirect ke event)
        e.stopPropagation();
        
        // Simpan ke localStorage dan tutup banner
        localStorage.setItem("snooze-promo-feb2026", new Date().getTime().toString());
        setShowBanner(false);
    };

    const handleBannerClick = () => {
        handleClose();
        navigate("/events/a57e96a5-c46f-45b4-9561-69110d604f2c/webinar-dari-karya-jadi-ecosystem");
    };

    if (!showBanner) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={handleBannerClick}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full md:max-w-4xl lg:max-w-5xl bg-background rounded-2xl shadow-2xl overflow-hidden border border-white/10"
            >
                <button
                    onClick={handleSnooze}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/50 text-white hover:bg-black/80 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="relative w-full bg-[#0a0b10] flex flex-col items-center justify-center cursor-pointer">
                    <img
                        src={webinarBanner}
                        alt="Arrangely Online Session"
                        className="w-full h-auto object-cover"
                    />
                </div>
            </motion.div>
        </div>,
        document.body
    );
};


export function HomePage() {
    const isMobile = useIsMobile();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useUserRole();
    const { isOnline } = useOfflineDetection();
    const { subscriptionStatus } = useSubscription();
    const isNative = Capacitor.isNativePlatform();

    // Data fetching
    const { data: arrangers = [], isLoading: arrangersLoading } =
        useTrustedArrangers();
    const { data: trendingData, isLoading: trendingLoading } =
        useTrendingSongs();
    const ENABLE_NEW_ARRIVALS = false;

    const { data: newArrivalsData, isLoading: newArrivalsLoading } =
        ENABLE_NEW_ARRIVALS
            ? // eslint-disable-next-line react-hooks/rules-of-hooks
              useNewArrivals()
            : { data: { songs: [], creators: new Map() }, isLoading: false };

    const { data: recentData, isLoading: recentLoading } =
        useRecentArrangements(user?.id);
    const { data: songsInLibrary = new Set() } = useSongsInLibrary(user?.id);
    const { data: followingData, isLoading: followingLoading } =
        useFollowingSongs(user?.id, 12);

    const handleArrangerClick = (arranger: TrustedArranger) => {
        // Navigate to community library with creator filter
        navigate("/community-library", {
            state: {
                creatorFilter: arranger.user_id,
                creatorName: arranger.name,
                creatorId: arranger.user_id,
            },
        });
    };

    const handleSongClick = (song: { id: string }) => {
        navigate(`/arrangement/${song.id}?source=home`);
    };

    const handleAddToLibrary = async (song: { id: string; title: string }) => {
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
        <div
            className={cn(
                "min-h-screen bg-background relative",
                // Ubah pt-12 menjadi pt-16 atau pt-20 untuk memberi ruang lebih bagi Notch Android
                isNative ? "pt-16" : "pt-6 md:pt-0",
            )}
        >
            {/* Animated Music Background */}
            {/* <MusicAnimatedBackground variant="full" /> */}

            {/* Content Container */}
            <div className="relative z-10">
                {/* Offline Connection Banner */}
                <OfflineConnectionBanner isOnline={isOnline} />

                {isMobile && (
                    <motion.div
                        className={cn(
                            "px-4 relative z-50",
                            isNative ? "mb-6 mt-4" : "mb-4 mt-1",
                        )}
                    >
                        <GlobalSearchBar className="w-full shadow-md bg-background/50 backdrop-blur-sm rounded-full" />
                    </motion.div>
                )}
                {/* Trusted Creators - Story Row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="md:-mt-6"
                >
                    <StoryCircleRow
                        arrangers={arrangers}
                        onArrangerClick={handleArrangerClick}
                        loading={arrangersLoading}
                        title={t("arrangers.title") || "Trusted Creators"}
                        seeAllLink="/creators"
                    />
                </motion.div>

                {/* Trending Songs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <SongCarouselRow
                        title="Trending This Week"
                        songs={trendingData?.songs || []}
                        creators={trendingData?.creators}
                        icon={TrendingUp}
                        iconColor="text-orange-500"
                        seeAllLink="/songs?sort=trending"
                        loading={trendingLoading}
                        songsInLibrary={songsInLibrary}
                        onSongClick={handleSongClick}
                        onAddToLibrary={handleAddToLibrary}
                    />
                </motion.div>

                {/* Latest From Creators You Follow */}
                {user && (followingData?.songs?.length || 0) > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                    >
                        <SongCarouselRow
                            title="Latest From Creators You Follow"
                            songs={followingData?.songs || []}
                            creators={followingData?.creators}
                            icon={Users}
                            iconColor="text-green-500"
                            seeAllLink="/songs?sort=following"
                            loading={followingLoading}
                            songsInLibrary={songsInLibrary}
                            onSongClick={handleSongClick}
                            onAddToLibrary={handleAddToLibrary}
                        />
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <SongCarouselRow
                        title="New Arrivals"
                        songs={newArrivalsData?.songs || []}
                        creators={newArrivalsData?.creators}
                        icon={Sparkles}
                        iconColor="text-purple-500"
                        seeAllLink="/songs?sort=newest"
                        loading={newArrivalsLoading}
                        songsInLibrary={songsInLibrary}
                        onSongClick={handleSongClick}
                        onAddToLibrary={handleAddToLibrary}
                    />
                </motion.div>

                {/* Premium Audio Stems (Sequencer) */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    <SequencerHighlightCarousel isLoggedIn={!!user} />
                </motion.div>

                {/* Music Lab Spotlight */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                >
                    <FeaturedLessonsCarousel />
                </motion.div>

                {/* Events Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                >
                    <EventsSection />
                </motion.div>

                {/* Your Recent Arrangements (logged in only) */}
                {user && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 }}
                    >
                        <SongCarouselRow
                            title="Your Recent"
                            songs={recentData?.songs || []}
                            creators={recentData?.creators}
                            icon={Clock}
                            iconColor="text-blue-500"
                            seeAllLink="/songs?sort=recent"
                            loading={recentLoading}
                            showCreatorBadge={false}
                            songsInLibrary={songsInLibrary}
                            onSongClick={handleSongClick}
                        />
                    </motion.div>
                )}

                {/* Bottom spacing for mobile navigation */}
                <div className="h-20 md:h-8" />
                <HomePromoBanner />
            </div>
        </div>
    );
}

export default HomePage;
