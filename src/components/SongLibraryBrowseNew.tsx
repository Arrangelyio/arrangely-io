import { useState, useEffect } from "react";
import { useLibraryLimit } from "@/hooks/useLibraryLimit";
import { LibraryLimitModal } from "@/components/LibraryLimitModal";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Search,
    Heart,
    Star,
    Play,
    Music,
    Clock,
    Eye,
    Share2,
    Plus,
    ArrowLeft,
    Youtube,
    UserPlus,
    UserCheck,
    Verified,
    Crown,
    Lock,
    Grid,
    List,
    Loader2,
    Sparkles,
    Upload,
    Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreatorApplicationForm } from "@/components/CreatorApplicationForm";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useYouTubeImportLimit } from "@/hooks/useYouTubeImportLimit";
import UpgradeModal from "@/components/monetization/UpgradeModal";
import PaymentModal from "@/components/payment/PaymentModal";

const SongLibraryBrowseNew = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useUserRole();
    const { subscriptionStatus, startFreeTrial, loading: subLoading } = useSubscription();
    const [loading, setLoading] = useState(true);
    const [songs, setSongs] = useState<any[]>([]);
    const [trustedArrangers, setTrustedArrangers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [followedCreatorIds, setFollowedCreatorIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
    const [sortBy, setSortBy] = useState("recent");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFollowedOnly, setShowFollowedOnly] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [previewSong, setPreviewSong] = useState<any>(null);
    const [previewSections, setPreviewSections] = useState<any[]>([]);
    const [selectedCreator, setSelectedCreator] = useState<any>(null);
    const [showCreatorApplication, setShowCreatorApplication] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const { libraryUsage, loading: libraryLoading, recordLibraryAction } = useLibraryLimit();
    const [showTrialModal, setShowTrialModal] = useState(false);
    const [pendingSongAdd, setPendingSongAdd] = useState<{ id: string; title: string } | null>(null);
    const [isAnalyzingYoutube, setIsAnalyzingYoutube] = useState(false);
    const [youtubeAnalysisResults, setYoutubeAnalysisResults] = useState<any[]>([]);
    const [songsInLibrary, setSongsInLibrary] = useState<Set<string>>(new Set());
    const [archivedSongs, setArchivedSongs] = useState<Map<string, string>>(new Map());
    const [addingToLibrary, setAddingToLibrary] = useState<Set<string>>(new Set());
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { importUsage, recordImport } = useYouTubeImportLimit();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [songsPerPage] = useState(12);
    const [totalSongs, setTotalSongs] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (debouncedSearchTerm !== searchTerm) {
                setDebouncedSearchTerm(searchTerm);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, debouncedSearchTerm]);

    // Reset currentPage when search changes
    useEffect(() => {
        if (debouncedSearchTerm && currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [debouncedSearchTerm, currentPage]);

    // Get current user and check library/follows
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

                if (user) {
                    await checkUserLibrary(user.id);
                }
            } catch (err) {
                console.error("Error fetching current user:", err);
            }
        };

        getCurrentUser();
    }, []);

    // Check user library using Edge Function
    const checkUserLibrary = async (userId: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('check-user-library', {
                headers: {
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });

            if (error) throw error;

            if (data) {
                setSongsInLibrary(new Set(data.songsInLibrary));
                setArchivedSongs(new Map(Object.entries(data.archivedSongs)));
                setFollowedCreatorIds(new Set(data.followedCreatorIds));
            }
        } catch (error) {
            console.error("Error checking user library:", error);
        }
    };

    // Handle subscription + pendingSongAdd
    useEffect(() => {
        if (
            !subLoading &&
            subscriptionStatus &&
            (subscriptionStatus.hasActiveSubscription || subscriptionStatus.isTrialing) &&
            pendingSongAdd
        ) {
            toast({
                title: "🎉 Free Trial Activated!",
                description: "Now adding the song to your library...",
            });

            continueAddToLibrary(pendingSongAdd.id, pendingSongAdd.title);
            setPendingSongAdd(null);
        }
    }, [subscriptionStatus, pendingSongAdd]);

    // Fetch songs using Edge Function
    useEffect(() => {
        const fetchSongs = async () => {
            try {
                setLoading(true);

                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: songsPerPage.toString(),
                    search: debouncedSearchTerm,
                    sortBy,
                    category: selectedCategory,
                    followedOnly: showFollowedOnly.toString(),
                });

                if (currentUser) {
                    params.append('userId', currentUser.id);
                }

                const { data, error } = await supabase.functions.invoke('get-community-songs', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (error) throw error;

                if (data) {
                    setSongs(data.songs || []);
                    setTotalSongs(data.total || 0);
                    setHasMore(data.hasMore || false);
                }
            } catch (error) {
                console.error("Error fetching songs:", error);
                toast({
                    title: "Error",
                    description: "Failed to load songs",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSongs();
    }, [
        currentUser,
        currentPage,
        sortBy,
        debouncedSearchTerm,
        showFollowedOnly,
        selectedCategory,
        toast
    ]);

    // Fetch trusted arrangers using Edge Function
    useEffect(() => {
        const fetchTrustedArrangers = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('get-trusted-arrangers');

                if (error) throw error;

                if (data) {
                    setTrustedArrangers(data.arrangers || []);
                }
            } catch (error) {
                console.error("Error fetching trusted arrangers:", error);
                toast({
                    title: "Error",
                    description: "Failed to load trusted arrangers.",
                    variant: "destructive",
                });
            }
        };

        fetchTrustedArrangers();
    }, [toast]);

    // Handle like using Edge Function
    const handleLike = async (songId: string) => {
        if (!currentUser) {
            toast({
                title: "Authentication Required",
                description: "Please log in to like songs",
                variant: "destructive",
            });
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('toggle-song-like', {
                body: { songId },
                headers: {
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });

            if (error) throw error;

            if (data) {
                setSongs(prev =>
                    prev.map(s =>
                        s.id === songId
                            ? { ...s, isLiked: data.isLiked, likes: data.likeCount }
                            : s
                    )
                );

                toast({
                    title: data.message,
                    description: data.isLiked ? "Added to your liked arrangements" : "Removed from your liked arrangements",
                });
            }
        } catch (error) {
            console.error("Error liking song:", error);
            toast({
                title: "Error",
                description: "Failed to like song",
                variant: "destructive",
            });
        }
    };

    const handleFavorite = async (songId: string) => {
        if (!currentUser) {
            toast({
                title: "Authentication Required",
                description: "Please log in to favorite songs",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Added to Favorites",
            description: "Song saved to your favorites collection",
        });
    };

    const continueAddToLibrary = async (songId: string, title: string) => {
        setAddingToLibrary(prev => new Set(prev).add(songId));
        
        try {
            const { data, error } = await supabase.functions.invoke('add-song-to-library', {
                body: { songId },
                headers: {
                    Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
            });

            if (error) throw error;

            if (data) {
                // Update local state
                const song = songs.find(s => s.id === songId);
                if (song) {
                    const songKey = `${song.title}-${song.artist}`;
                    setSongsInLibrary(prev => new Set(prev).add(songKey));
                    
                    // Update view count
                    setSongs(prev =>
                        prev.map(s =>
                            s.id === songId ? { ...s, views: s.views + 1 } : s
                        )
                    );
                }

                toast({
                    title: "Added to Your Library",
                    description: `"${title}" is now available in your personal library.`,
                });
                navigate("/library");
            }
        } catch (error) {
            console.error("Error adding to library:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to add song to library",
                variant: "destructive",
            });
        } finally {
            setAddingToLibrary(prev => {
                const newSet = new Set(prev);
                newSet.delete(songId);
                return newSet;
            });
        }
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

        // Check subscription status
        if (!subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialing) {
            setPendingSongAdd({ id: songId, title });
            setShowTrialModal(true);
            return;
        }

        await continueAddToLibrary(songId, title);
    };

    const handleStartTrial = async () => {
        setShowTrialModal(false);

        toast({
            title: "Activating Free Trial...",
            description: "Please wait a moment.",
        });

        try {
            const result = await startFreeTrial();

            if (!result) {
                toast({
                    title: "Activation Failed",
                    description: "Could not start your free trial. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "An Error Occurred",
                description: "Something went wrong. Please contact support.",
                variant: "destructive",
            });
            console.error("Error starting free trial:", error);
        }
    };

    const handleUnarchive = async (songId: string, title: string, artist: string) => {
        try {
            const { error } = await supabase
                .from("songs")
                .update({ status: null })
                .eq("id", songId)
                .eq("user_id", currentUser.id);

            if (error) {
                throw new Error("Failed to unarchive song");
            }

            const songKey = `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
            const songKeyInLibrary = `${title}-${artist}`;

            setArchivedSongs(prev => {
                const newMap = new Map(prev);
                newMap.delete(songKey);
                return newMap;
            });

            setSongsInLibrary(prev => new Set(prev).add(songKeyInLibrary));

            toast({
                title: "Song Unarchived",
                description: `"${title}" has been moved back to your library.`,
            });
        } catch (err) {
            console.error("Error unarchiving song:", err);
            toast({
                title: "Error",
                description: "Failed to unarchive this song. Please try again.",
                variant: "destructive",
            });
        }
    };

    const extractYouTubeVideoId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        return match ? match[1] : null;
    };

    const handlePreview = (song: any) => {
        setPreviewSong(song);
        // Fetch preview sections if needed
    };

    const handleCreatorProfile = (song: any) => {
        // Handle creator profile view
    };

    const handleShare = (song: any) => {
        if (navigator.share) {
            navigator.share({
                title: `${song.title} - ${song.artist}`,
                text: `Check out this arrangement: ${song.title} by ${song.artist}`,
                url: window.location.href,
            });
        } else {
            // Fallback for browsers that don't support navigator.share
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link Copied",
                description: "Song link copied to clipboard",
            });
        }
    };

    const filteredSongs = songs;

    return (
        <div className="min-h-screen bg-gradient-sanctuary">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-primary mb-2">
                                Community Library
                            </h1>
                            <p className="text-muted-foreground">
                                Discover and add professional arrangements to your collection
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={viewMode === "grid" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("grid")}
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === "list" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setViewMode("list")}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-6 mb-8">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search songs, artists, or arrangers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Recent</SelectItem>
                                        <SelectItem value="popular">Popular</SelectItem>
                                        <SelectItem value="liked">Most Liked</SelectItem>
                                        <SelectItem value="title">Title A-Z</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="worship">Worship</SelectItem>
                                        <SelectItem value="contemporary">Contemporary</SelectItem>
                                        <SelectItem value="traditional">Traditional</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>Loading...</span>
                        </div>
                    )}

                    {/* Songs Display */}
                    {!loading && filteredSongs.length === 0 && (
                        <div className="text-center py-12">
                            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">No songs found</h3>
                            <p className="text-muted-foreground mb-4">
                                Try adjusting your search or filters
                            </p>
                        </div>
                    )}

                    {!loading && filteredSongs.length > 0 && (
                        <div className={`${
                            viewMode === "grid"
                                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                                : "space-y-3"
                        }`}>
                            {filteredSongs.map((song) => (
                                <Card key={song.id} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                                    <CardHeader className="pb-2 px-3 pt-3">
                                        <div className="flex items-start justify-between gap-2 min-h-[60px]">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2 leading-tight">
                                                    {song.title}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground truncate mt-1">
                                                    {song.artist}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleLike(song.id)}
                                                    className={song.isLiked ? "text-red-500" : ""}
                                                >
                                                    <Heart className={`h-4 w-4 ${song.isLiked ? "fill-current" : ""}`} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleFavorite(song.id)}
                                                    className={song.isFavorited ? "text-yellow-500" : ""}
                                                >
                                                    <Star className={`h-4 w-4 ${song.isFavorited ? "fill-current" : ""}`} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleShare(song)}
                                                    className="sm:hidden"
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
                                                        <Music className="h-8 w-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stats Row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Music className="h-4 w-4" />
                                                    <span className="truncate">{song.key}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="truncate">{song.tempo} BPM</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Heart className="h-4 w-4" />
                                                    <span className="truncate">{song.likes}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Eye className="h-4 w-4" />
                                                    <span className="truncate">{song.views}</span>
                                                </div>
                                            </div>

                                            {/* Category badge */}
                                            {song.category && (
                                                <div className="mb-2">
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                                                        {song.category}
                                                    </Badge>
                                                </div>
                                            )}

                                            {/* Creator */}
                                            <div
                                                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                                                onClick={() => handleCreatorProfile(song)}
                                            >
                                                <Avatar className="h-6 w-6 flex-shrink-0">
                                                    <AvatarImage src={song.arrangerAvatar} />
                                                    <AvatarFallback className="text-xs">
                                                        {song.arranger.split(" ").map((n: string) => n[0]).join("")}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-muted-foreground truncate pt-3 pb-3">
                                                    by {song.arranger}
                                                </span>
                                            </div>

                                            {/* Tags */}
                                            {song.tags && song.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {song.tags.map((tag: string) => (
                                                        <Badge key={tag} variant="secondary" className="text-sm">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2 pt-1 mt-auto">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handlePreview(song)}
                                                className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                                            >
                                                <Play className="h-4 w-4 mr-1" />
                                                Preview
                                            </Button>

                                            {(() => {
                                                const isSongInLibrary = songsInLibrary.has(`${song.title}-${song.artist}`);
                                                const archivedId = archivedSongs.get(
                                                    `${song.title.trim().toLowerCase()}|${song.artist.trim().toLowerCase()}`
                                                );
                                                const isAdding = addingToLibrary.has(song.id);
                                                const isSubscriptionLocked = !subscriptionStatus?.hasActiveSubscription && !subscriptionStatus?.isTrialing;

                                                if (isAdding) {
                                                    return (
                                                        <Button
                                                            size="sm"
                                                            disabled
                                                            className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                                                        >
                                                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            Adding...
                                                        </Button>
                                                    );
                                                }

                                                if (archivedId) {
                                                    return (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleUnarchive(archivedId, song.title, song.artist)}
                                                            className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                                                            variant="secondary"
                                                        >
                                                            <Upload className="h-4 w-4 mr-1" />
                                                            Unarchive
                                                        </Button>
                                                    );
                                                }

                                                if (isSongInLibrary) {
                                                    return (
                                                        <Button
                                                            size="sm"
                                                            disabled
                                                            className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                                                            variant="secondary"
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            In Library
                                                        </Button>
                                                    );
                                                }

                                                return (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddToLibrary(song.id, song.title)}
                                                        className="w-full h-8 text-xs sm:h-9 sm:text-sm"
                                                        disabled={isSubscriptionLocked && !currentUser}
                                                    >
                                                        {isSubscriptionLocked ? (
                                                            <>
                                                                <Lock className="h-4 w-4 mr-1" />
                                                                Premium
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="h-4 w-4 mr-1" />
                                                                Add to Library
                                                            </>
                                                        )}
                                                    </Button>
                                                );
                                            })()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalSongs > songsPerPage && (
                        <div className="flex justify-center mt-8">
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                >
                                    Previous
                                </Button>
                                <span className="flex items-center px-4">
                                    Page {currentPage} of {Math.ceil(totalSongs / songsPerPage)}
                                </span>
                                <Button
                                    variant="outline"
                                    disabled={!hasMore}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showTrialModal && (
                <Dialog open={showTrialModal} onOpenChange={setShowTrialModal}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start Your Free Trial</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p>To add songs to your library, you need an active subscription or free trial.</p>
                            <div className="flex gap-2">
                                <Button onClick={handleStartTrial} className="flex-1">
                                    Start Free Trial
                                </Button>
                                <Button variant="outline" onClick={() => setShowTrialModal(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {showCreatorApplication && (
                <CreatorApplicationForm onClose={() => setShowCreatorApplication(false)} />
            )}

            {showLimitModal && (
                <LibraryLimitModal
                    isOpen={showLimitModal}
                    onClose={() => setShowLimitModal(false)}
                    currentCount={0}
                    limit={10}
                    isTrialing={subscriptionStatus?.isTrialing || false}
                />
            )}
            {showUpgradeModal && (
                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                />
            )}
            {isPaymentModalOpen && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    onSuccess={() => {}}
                    plan={{
                        id: 'premium',
                        name: 'Premium',
                        price: 99000,
                        description: 'Premium plan',
                        features: []
                    }}
                />
            )}
        </div>
    );
};

export default SongLibraryBrowseNew;
