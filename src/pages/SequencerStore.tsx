import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SequencerHero } from "@/components/sequencer/SequencerHero";
import { SequencerFilters, OwnershipFilter } from "@/components/sequencer/SequencerFilters";
import { SequencerProductCard } from "@/components/sequencer/SequencerProductCard";
import { SequencerProductListItem } from "@/components/sequencer/SequencerProductListItem";
import { MyPurchasesSection } from "@/components/sequencer/MyPurchasesSection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, LayoutGrid, List } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePagination } from "@/hooks/usePagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface SequencerProduct {
  id: string;
  songId: string;
  title: string;
  artist: string;
  tempo: number;
  timeSignature: string;
  tracks: any[];
  price?: number;
  originalPrice?: number;
  currency?: string;
  thumbnailUrl?: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorId?: string;
  audioPreviewUrl?: string;
}

interface TrustedCreator {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  sequencer_count: number;
  creator_slug: string | null;
}

const ITEMS_PER_PAGE = 15;

const SequencerStore = () => {
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [products, setProducts] = useState<SequencerProduct[]>([]);
  const [creators, setCreators] = useState<TrustedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const audioPacksRef = useRef<HTMLDivElement>(null);

  const handleExploreAudioPacks = () => {
    audioPacksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    fetchProducts();
    fetchCreators();
    fetchUserEnrollments();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sequencer_files")
        .select(`
          id, title, song_id, tempo, time_signature, tracks, preview_audio_r2_key,
          songs!inner (title, artist, youtube_link, profiles:user_id (display_name, avatar_url, user_id)),
          sequencer_file_pricing (price, currency)
        `)
        .eq("is_production", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => {
        const videoId = extractYouTubeVideoId(item.songs?.youtube_link);
        const price = item.sequencer_file_pricing?.[0]?.price;
        
        // Build preview audio URL from R2 key
        let audioPreviewUrl: string | undefined;
        if (item.preview_audio_r2_key) {
          const R2_PUBLIC_DOMAIN = "https://pub-1a13947b34c14a78875a3cddf8bb02d6.r2.dev";
          audioPreviewUrl = `${R2_PUBLIC_DOMAIN}/${item.preview_audio_r2_key}`;
        }
        
        return {
          id: item.id,
          songId: item.song_id,
          title: item.songs?.title || item.title,
          artist: item.songs?.artist || "",
          tempo: item.tempo,
          timeSignature: item.time_signature,
          tracks: item.tracks || [],
          price: price,
          originalPrice: price ? Math.round(price * 1.4) : undefined,
          currency: item.sequencer_file_pricing?.[0]?.currency || "IDR",
          thumbnailUrl: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : undefined,
          creatorName: item.songs?.profiles?.display_name,
          creatorAvatar: item.songs?.profiles?.avatar_url,
          creatorId: item.songs?.profiles?.user_id,
          audioPreviewUrl,
        };
      });
      setProducts(formatted);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("sequencer_files")
        .select(`
          songs!inner (
            profiles:user_id (user_id, display_name, avatar_url, creator_slug)
          )
        `)
        .eq("is_production", true);

      if (error) throw error;

      const creatorMap = new Map<string, TrustedCreator>();
      (data || []).forEach((item: any) => {
        const profile = item.songs?.profiles;
        if (profile?.user_id) {
          const existing = creatorMap.get(profile.user_id);
          if (existing) {
            existing.sequencer_count++;
          } else {
            creatorMap.set(profile.user_id, {
              user_id: profile.user_id,
              display_name: profile.display_name || "Creator",
              avatar_url: profile.avatar_url,
              creator_slug: profile.creator_slug,
              sequencer_count: 1,
            });
          }
        }
      });

      setCreators(Array.from(creatorMap.values()).sort((a, b) => b.sequencer_count - a.sequencer_count));
    } catch (error) {
      console.error("Error fetching creators:", error);
    }
  };

  const fetchUserEnrollments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }
      
      setIsLoggedIn(true);
      
      const { data, error } = await supabase
        .from("sequencer_enrollments")
        .select("sequencer_file_id")
        .eq("user_id", user.id)
        .eq("is_production", true);

      if (error) throw error;

      setOwnedIds(new Set(data?.map(e => e.sequencer_file_id) || []));
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
    }
  };

  const handleCreatorProfile = (creatorSlug: string | null) => {
    if (creatorSlug) {
      navigate(`/creator/${creatorSlug}`);
    }
  };

  const extractYouTubeVideoId = (url: string | null): string => {
    if (!url) return "";
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] || "";
  };

  // Products with ownership status
  const productsWithOwnership = products.map(p => ({
    ...p,
    isOwned: ownedIds.has(p.id),
  }));

  // Owned products for My Purchases section
  const ownedProducts = productsWithOwnership.filter(p => p.isOwned);

  // Filter counts
  const counts = {
    all: products.length,
    owned: ownedIds.size,
    available: products.length - ownedIds.size,
  };

  const filteredProducts = productsWithOwnership
    .filter((p) => {
      const matchesSearch = !searchTerm || 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCreator = !selectedCreator || p.creatorId === selectedCreator;
      
      // Apply ownership filter
      let matchesOwnership = true;
      if (ownershipFilter === "owned") {
        matchesOwnership = p.isOwned;
      } else if (ownershipFilter === "available") {
        matchesOwnership = !p.isOwned;
      }
      
      return matchesSearch && matchesCreator && matchesOwnership;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "tracks") return b.tracks.length - a.tracks.length;
      return 0;
    });

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    canGoNext,
    canGoPrev,
    nextPage,
    prevPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({ data: filteredProducts, itemsPerPage: ITEMS_PER_PAGE });

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`min-h-screen bg-gradient-sanctuary pb-20 ${isNative ? "pt-[calc(5rem+env(safe-area-inset-top))]" : "pt-20"}`}>
      <div className="container mx-auto px-4 max-w-7xl">
        <SequencerHero onExplore={handleExploreAudioPacks} />

        {/* Trusted Creators Section */}
        {creators.length > 0 && (
          <div className="mb-12 relative group">
            <div className="mb-5 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-foreground">
                {t("sequencerStore.trustedCreatorsTitle")}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t("sequencerStore.trustedCreatorsSubtitle")}
              </p>
            </div>
            
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-4 scrollbar-hide">
              <AnimatePresence>
                {creators.map((creator) => (
                  <motion.div
                    key={creator.user_id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col items-center gap-2 text-center w-24 sm:w-28 flex-shrink-0 cursor-pointer group/creator transition-transform duration-300 hover:scale-105"
                    onClick={() => setSelectedCreator(selectedCreator === creator.user_id ? null : creator.user_id)}
                  >
                    <Avatar
                      className={`h-16 w-16 sm:h-20 sm:w-20 transition-all duration-300 ring-4 ring-offset-2 ${
                        selectedCreator === creator.user_id
                          ? "ring-primary"
                          : "ring-transparent group-hover/creator:ring-primary/30"
                      }`}
                    >
                      <AvatarImage
                        src={creator.avatar_url || undefined}
                        className="object-cover h-full w-full"
                      />
                      <AvatarFallback className="text-2xl sm:text-3xl bg-muted text-muted-foreground">
                        {creator.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-grow flex flex-col justify-between w-full">
                      <div className="px-1">
                        <p className="font-semibold text-[11px] sm:text-xs text-foreground text-center leading-tight truncate">
                          {creator.display_name}
                        </p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {creator.sequencer_count} {t("sequencerStore.sequencers")}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatorProfile(creator.creator_slug);
                        }}
                        className="w-full mt-2 sm:mt-3 h-7 sm:h-8 text-[11px] sm:text-xs"
                      >
                        {t("communityLib.viewProfile")}
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {/* JOIN US CARD */}
                <motion.div
                  key="become-creator"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center gap-3 text-center w-28 flex-shrink-0 cursor-pointer group/join"
                  onClick={() => navigate("/become-creator")}
                >
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center bg-muted border-2 border-dashed border-border group-hover/join:border-primary group-hover/join:bg-primary/10 transition-all duration-300">
                    <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground group-hover/join:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {t("sequencerStore.joinUs")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("sequencerStore.becomeCreator")}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
        
        {/* My Purchases Section - Quick access for owned items */}
        {isLoggedIn && ownedProducts.length > 0 && ownershipFilter === "all" && (
          <MyPurchasesSection products={ownedProducts} />
        )}
        
        <div ref={audioPacksRef}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <SequencerFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              sortBy={sortBy}
              onSortChange={setSortBy}
              ownershipFilter={ownershipFilter}
              onOwnershipFilterChange={setOwnershipFilter}
              counts={counts}
              isLoggedIn={isLoggedIn}
            />
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-shrink-0">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            {/* Results count */}
            <div className="text-sm text-muted-foreground mb-4">
              Showing {startIndex} - {endIndex} of {totalItems} audio packs
            </div>

            {/* Products */}
            {viewMode === "grid" ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="grid-view"
              >
                {paginatedData.map((product) => (
                  <SequencerProductCard key={product.id} {...product} />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key="list-view"
              >
                {paginatedData.map((product) => (
                  <SequencerProductListItem key={product.id} {...product} />
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => canGoPrev && prevPage()}
                        className={!canGoPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, idx) => (
                      <PaginationItem key={idx}>
                        {page === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => goToPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => canGoNext && nextPage()}
                        className={!canGoNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No audio packs found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SequencerStore;
