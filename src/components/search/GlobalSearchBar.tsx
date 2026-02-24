import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Home,
    Search,
    Music,
    User,
    Loader2,
    X,
    Crown,
    Verified,
    TrendingUp,
    Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile"; // Pastikan hook ini tersedia
import { motion, AnimatePresence } from "framer-motion";
import { RequestArrangementDialog } from "@/components/RequestArrangementDialog";

interface SearchResult {
    id: string;
    title: string;
    artist?: string;
    slug?: string;
    youtube_thumbnail?: string;
    type: "song" | "artist" | "creator";
    creator_name?: string;
    creator_slug?: string;
    creator_type?: string;
    avatar_url?: string;
}

interface GlobalSearchBarProps {
    className?: string;
    defaultValue?: string;
    onClear?: () => void;
}

const extractYouTubeThumbnail = (url: string | null) => {
    if (!url) return undefined;
    const match = url.match(
        /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]{11})/,
    );
    return match
        ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
        : undefined;
};

export function GlobalSearchBar({
    className,
    defaultValue = "",
    onClear,
}: GlobalSearchBarProps) {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState(defaultValue);
    //   const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [trendingSearches, setTrendingSearches] = useState<string[]>([
        "Hillsong",
        "NDC Worship",
        "Bethel Music",
        "Elevation Worship",
        "JPCC Worship",
    ]);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tambahkan useEffect ini agar jika URL berubah (misal user tekan back),
    // isi search bar ikut update
    useEffect(() => {
        setSearchQuery(defaultValue);
    }, [defaultValue]);

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("recentSearches");
        if (stored) {
            try {
                setRecentSearches(JSON.parse(stored).slice(0, 5));
            } catch {
                setRecentSearches([]);
            }
        }
    }, []);

    // Save recent search
    const saveRecentSearch = (term: string) => {
        const updated = [
            term,
            ...recentSearches.filter((s) => s !== term),
        ].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
    };

    const isIOS =
        typeof window !== "undefined" &&
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !("MSStream" in window);


    // Debounced search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setResults([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Search songs by title and artist
                const { data: songs, error: songsError } = await supabase
                    .from("songs")
                    .select(
                        `
            id,
            title,
            artist,
            slug,
            youtube_link,
            youtube_thumbnail,
            profiles!inner (
              display_name,
              avatar_url,
              creator_slug,
              creator_type
            )
          `,
                    )
                    .eq("is_public", true)
                    .or(
                        `title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`,
                    )
                    .order("views_count", { ascending: false })
                    .limit(6);

                // Search creators by display_name
                const { data: creators, error: creatorsError } = await supabase
                    .from("profiles")
                    .select(
                        "user_id, display_name, avatar_url, creator_slug, creator_type, role",
                    )
                    .in("role", ["creator", "admin"])
                    .ilike("display_name", `%${searchQuery}%`)
                    .limit(4);

                const searchResults: SearchResult[] = [];

                // Add song results
                if (songs && !songsError) {
                    songs.forEach((song: any) => {
                        searchResults.push({
                            id: song.id,
                            title: song.title,
                            artist: song.artist,
                            slug: song.slug,
                            youtube_thumbnail:
                                song.youtube_thumbnail ||
                                extractYouTubeThumbnail(song.youtube_link),
                            type: "song",
                            creator_name: song.profiles?.display_name,
                            creator_slug: song.profiles?.creator_slug,
                            creator_type: song.profiles?.creator_type,
                        });
                    });
                }

                // Add creator results
                if (creators && !creatorsError) {
                    creators.forEach((creator: any) => {
                        searchResults.push({
                            id: creator.user_id,
                            title: creator.display_name || "Unknown Creator",
                            type: "creator",
                            creator_slug: creator.creator_slug,
                            creator_type: creator.creator_type,
                            avatar_url: creator.avatar_url,
                        });
                    });
                }

                setResults(searchResults);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Handle click outside
    // GlobalSearchBar.tsx

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            // 1. Cek apakah klik di dalam kontainer search bar
            if (containerRef.current && containerRef.current.contains(target)) {
                return;
            }

            // 2. Cek apakah klik berada di dalam elemen Radix UI (seperti Dialog/Modal)
            // Radix biasanya merender modal di luar body utama.
            const isClickInsideDialog =
                (target as Element).closest('[role="dialog"]') ||
                (target as Element).closest("[data-radix-focus-guard]");

            if (!isClickInsideDialog) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            saveRecentSearch(searchQuery.trim());
            navigate(
                `/community-library?search=${encodeURIComponent(
                    searchQuery.trim(),
                )}`,
            );
            setIsOpen(false);
            //   setSearchQuery("");
        }
    };

    const handleResultClick = (result: SearchResult) => {
        saveRecentSearch(result.title);
        setIsOpen(false);
        setSearchQuery(""); // Clear search input when clicking a result

        if (result.type === "song") {
            if (result.id && result.slug) {
                navigate(`/arrangement/${result.id}/${result.slug}`);
            } else if (result.slug) {
                navigate(`/arrangement/${result.slug}`);
            } else {
                navigate(`/arrangement/${result.id}`);
            }
        } else if (result.type === "creator" && result.creator_slug) {
            navigate(`/creator/${result.creator_slug}`);
        }
    };

    const handleQuickSearch = (term: string) => {
        saveRecentSearch(term);
        navigate(`/community-library?search=${encodeURIComponent(term)}`);
        setIsOpen(false);
        setSearchQuery("");
    };

    const clearSearch = () => {
        setSearchQuery("");
        setResults([]);

        // 1. Beritahu parent kalau search dihapus
        if (onClear) {
            onClear();
        }

        // 2. Navigasi balik ke URL bersih
        if (location.pathname.includes("/community-library")) {
            navigate("/community-library");
        }

        inputRef.current?.focus();
    };

    const getCreatorBadge = (creatorType: string | undefined) => {
        if (creatorType === "creator_arrangely") {
            return (
                <Badge className="ml-1 px-1 py-0 text-[9px] bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    <Crown className="h-2 w-2 mr-0.5" />
                    Arrangely
                </Badge>
            );
        }
        if (creatorType === "creator_professional") {
            return (
                <Badge className="ml-1 px-1 py-0 text-[9px] bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                    <Verified className="h-2 w-2 mr-0.5" />
                    Verified
                </Badge>
            );
        }
        // Community (creator_pro) - no badge shown in search results
        return null;
    };

    const showSuggestions = isOpen && searchQuery.length === 0;
    const showResults = isOpen && searchQuery.length >= 2;

    return (
        <div
            ref={containerRef}
            className={cn("relative flex-1 max-w-xl", className)}
        >
            <form onSubmit={handleSubmit}>
                <div
                    className={cn(
                        "relative flex items-center",
                        isIOS ? "mt-1" : "mt-4"
                    )}
                    >
                    {/* Home button integrated into search bar */}
                    {!isMobile && (
                        <Link to="/" className="absolute left-1 z-10">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80"
                            >
                                <Home className="h-5 w-5" />
                            </Button>
                        </Link>
                    )}
                    <Search className="absolute left-14 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="What do you want to play?"
                        value={searchQuery}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setSearchQuery(newValue);

                            // When input becomes empty (via backspace), clear URL params
                            if (
                                newValue === "" &&
                                location.pathname.includes("/community-library")
                            ) {
                                navigate("/community-library", {
                                    replace: true,
                                });
                                if (onClear) {
                                    onClear();
                                }
                            }
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="pl-20 pr-10 h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 rounded-full text-base"
                    />
                    {searchQuery && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 h-8 w-8 rounded-full hover:bg-muted"
                            onClick={clearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </form>

            {/* Dropdown */}
            <AnimatePresence>
                {(showSuggestions || showResults) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                    >
                        <ScrollArea className="max-h-[400px]">
                            {/* Loading */}
                            {isLoading && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {/* Suggestions when input is empty */}
                            {showSuggestions && !isLoading && (
                                <div className="p-3">
                                    {/* Recent Searches */}
                                    {recentSearches.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 px-2 mb-2">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Recent
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {recentSearches.map(
                                                    (term, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() =>
                                                                handleQuickSearch(
                                                                    term,
                                                                )
                                                            }
                                                            className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors"
                                                        >
                                                            {term}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Trending Searches */}
                                    <div>
                                        <div className="flex items-center gap-2 px-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                Trending
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {trendingSearches.map(
                                                (term, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            handleQuickSearch(
                                                                term,
                                                            )
                                                        }
                                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm transition-colors"
                                                    >
                                                        {term}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search Results */}
                            {showResults && !isLoading && (
                                <div className="py-2">
                                    {results.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">
                                                No results found for "
                                                {searchQuery}"
                                            </p>
                                            <p className="text-xs mt-1 mb-6">
                                                Try different keywords
                                            </p>
                                            <div className="w-full flex justify-center">
                                                <RequestArrangementDialog />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Songs Section */}
                                            {results.filter(
                                                (r) => r.type === "song",
                                            ).length > 0 && (
                                                <div className="mb-2">
                                                    <div className="flex items-center gap-2 px-4 py-2">
                                                        <Music className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Songs
                                                        </span>
                                                    </div>
                                                    {results
                                                        .filter(
                                                            (r) =>
                                                                r.type ===
                                                                "song",
                                                        )
                                                        .map((result) => (
                                                            <button
                                                                key={result.id}
                                                                onClick={() =>
                                                                    handleResultClick(
                                                                        result,
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                                            >
                                                                <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                                                                    {result.youtube_thumbnail ? (
                                                                        <img
                                                                            src={
                                                                                result.youtube_thumbnail
                                                                            }
                                                                            alt={
                                                                                result.title
                                                                            }
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                                                                            <Music className="h-4 w-4 text-primary/50" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium truncate">
                                                                        {
                                                                            result.title
                                                                        }
                                                                    </p>
                                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <span className="truncate">
                                                                            {
                                                                                result.artist
                                                                            }
                                                                        </span>
                                                                        {result.creator_name && (
                                                                            <>
                                                                                <span>
                                                                                    •
                                                                                </span>
                                                                                <span className="truncate">
                                                                                    {
                                                                                        result.creator_name
                                                                                    }
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {getCreatorBadge(
                                                                            result.creator_type,
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                </div>
                                            )}

                                            {/* Creators Section */}
                                            {results.filter(
                                                (r) => r.type === "creator",
                                            ).length > 0 && (
                                                <div>
                                                    <Separator className="my-2" />
                                                    <div className="flex items-center gap-2 px-4 py-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                            Creators
                                                        </span>
                                                    </div>
                                                    {results
                                                        .filter(
                                                            (r) =>
                                                                r.type ===
                                                                "creator",
                                                        )
                                                        .map((result) => (
                                                            <button
                                                                key={result.id}
                                                                onClick={() =>
                                                                    handleResultClick(
                                                                        result,
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                                                            >
                                                                <Avatar className="h-10 w-10">
                                                                    <AvatarImage
                                                                        src={
                                                                            result.avatar_url
                                                                        }
                                                                    />
                                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                                        {result.title
                                                                            ?.charAt(
                                                                                0,
                                                                            )
                                                                            .toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1">
                                                                        <p className="font-medium truncate">
                                                                            {
                                                                                result.title
                                                                            }
                                                                        </p>
                                                                        {getCreatorBadge(
                                                                            result.creator_type,
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Creator
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                </div>
                                            )}

                                            {/* View All Results */}
                                            <Separator className="my-2" />
                                            <button
                                                onClick={handleSubmit as any}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-primary hover:bg-primary/5 transition-colors font-medium"
                                            >
                                                <Search className="h-4 w-4" />
                                                View all results for "
                                                {searchQuery}"
                                            </button>

                                            <div className="px-4 py-3 bg-muted/30">
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                    <p className="text-[11px] text-muted-foreground text-center sm:text-left leading-tight">
                                                        Can't find what you're
                                                        looking for?
                                                        <span className="block sm:inline">
                                                            {" "}
                                                            Request it to our
                                                            creators.
                                                        </span>
                                                    </p>
                                                    <RequestArrangementDialog />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default GlobalSearchBar;
