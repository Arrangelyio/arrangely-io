import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Headphones, 
  ArrowLeft, 
  ArrowRight, 
  Music, 
  Volume2,
  Play,
  Sparkles 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface SequencerProduct {
  id: string;
  title: string;
  song_id: string;
  song: {
    title: string;
    artist: string;
    youtube_link: string;
    creator: {
      display_name: string;
      avatar_url: string;
    } | null;
  } | null;
  tempo: number;
  time_signature: string;
  tracks: any[];
  pricing: {
    price: number;
    currency: string;
  } | null;
}

interface SequencerHighlightCarouselProps {
  isLoggedIn?: boolean;
}

export const SequencerHighlightCarousel = ({ isLoggedIn = false }: SequencerHighlightCarouselProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState<SequencerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    fetchSequencerProducts();
  }, []);

  const fetchSequencerProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("sequencer_files")
        .select(`
          id,
          title,
          song_id,
          tempo,
          time_signature,
          tracks,
          songs!inner (
            title,
            artist,
            youtube_link,
            profiles:user_id (
              display_name,
              avatar_url
            )
          ),
          sequencer_file_pricing (
            price,
            currency
          )
        `)
        .eq("is_production", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedProducts = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        song_id: item.song_id,
        tempo: item.tempo,
        time_signature: item.time_signature,
        tracks: item.tracks || [],
        song: item.songs ? {
          title: item.songs.title,
          artist: item.songs.artist,
          youtube_link: item.songs.youtube_link,
          creator: item.songs.profiles ? {
            display_name: item.songs.profiles.display_name,
            avatar_url: item.songs.profiles.avatar_url,
          } : null,
        } : null,
        pricing: item.sequencer_file_pricing?.[0] || null,
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error fetching sequencer products:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractYouTubeVideoId = (url: string | null): string => {
    if (!url) return "";
    const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match && match[1] ? match[1] : "";
  };

  const checkArrowVisibility = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkArrowVisibility);
      window.addEventListener("resize", checkArrowVisibility);
      const timer = setTimeout(checkArrowVisibility, 500);
      return () => {
        scrollElement.removeEventListener("scroll", checkArrowVisibility);
        window.removeEventListener("resize", checkArrowVisibility);
        clearTimeout(timer);
      };
    }
  }, [products]);

  const formatPrice = (price: number, currency: string) => {
    if (currency === "IDR") {
      return price >= 1000 ? `Rp${Math.floor(price / 1000)}K` : `Rp${price}`;
    }
    return `$${price}`;
  };

  if (loading) {
    return (
      <div className="mb-8 pl-6 pr-4">
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Premium Audio Stems</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-none w-64 sm:w-72 animate-pulse">
              <div className="bg-muted rounded-xl h-40 mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 relative group pl-6 pr-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Premium Audio Stems</h2>
        </div>
        <Link to="/sequencer-store">
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
            View All
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          onScroll={checkArrowVisibility}
        >
          {products.map((product) => {
            const videoId = extractYouTubeVideoId(product.song?.youtube_link || null);
            const thumbnail = videoId 
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : null;
            const trackCount = Array.isArray(product.tracks) ? product.tracks.length : 0;

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-none w-64 sm:w-72"
              >
                <Card 
                  className="group/card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden border-purple-200/50 dark:border-purple-800/30"
                  onClick={() => navigate(`/arrangement/${product.song_id}`)}
                >
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative h-36 sm:h-40 overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={product.song?.title || "Audio Pack"}
                          className="w-full h-full object-cover transition-transform group-hover/card:scale-105"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Music className="h-12 w-12 text-purple-400" />
                        </div>
                      )}
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Track count badge */}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-black/60 backdrop-blur-sm text-white border-0">
                          <Volume2 className="w-3 h-3 mr-1" />
                          {trackCount} Tracks
                        </Badge>
                      </div>

                      {/* Price badge */}
                      {product.pricing && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-primary text-primary-foreground border-0 font-bold">
                            {formatPrice(product.pricing.price, product.pricing.currency)}
                          </Badge>
                        </div>
                      )}

                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white font-semibold text-sm line-clamp-1 drop-shadow-lg">
                          {product.song?.title || product.title}
                        </p>
                        <p className="text-white/80 text-xs line-clamp-1">
                          {product.song?.artist}
                        </p>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span>{product.tempo} BPM</span>
                          <span>{product.time_signature}</span>
                        </div>
                        {product.song?.creator && (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={product.song.creator.avatar_url} />
                              <AvatarFallback className="text-[10px]">
                                {product.song.creator.display_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[80px]">
                              {product.song.creator.display_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* View All Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-none w-48"
          >
            <Link to="/sequencer-store">
              <Card className="h-full min-h-[200px] hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-dashed border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardContent className="h-full flex flex-col items-center justify-center gap-3 p-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-semibold text-purple-700 dark:text-purple-300 text-center">
                    Explore All Audio Packs
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Discover more professional stems
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* Navigation Arrows */}
        {showLeftArrow && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollCarousel("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white z-10 hidden sm:flex dark:bg-gray-800/90 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {showRightArrow && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollCarousel("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg backdrop-blur-sm hover:bg-white z-10 hidden sm:flex dark:bg-gray-800/90 dark:hover:bg-gray-800"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Mobile View All */}
      <div className="sm:hidden mt-4">
        <Link to="/sequencer-store">
          <Button variant="outline" className="w-full">
            View All Audio Packs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default SequencerHighlightCarousel;
