import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Package, 
  ExternalLink,
  Music,
  Volume2
} from "lucide-react";
import { useAppLauncher } from "@/hooks/useAppLauncher";
import { useLanguage } from "@/contexts/LanguageContext";

interface PurchasedProduct {
  id: string;
  songId: string;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  tracks: any[];
}

interface MyPurchasesSectionProps {
  products: PurchasedProduct[];
}

export const MyPurchasesSection = ({ products }: MyPurchasesSectionProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openArrangelyApp } = useAppLauncher();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    checkArrowVisibility();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkArrowVisibility);
      window.addEventListener("resize", checkArrowVisibility);
      return () => {
        container.removeEventListener("scroll", checkArrowVisibility);
        window.removeEventListener("resize", checkArrowVisibility);
      };
    }
  }, [products]);

  const checkArrowVisibility = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Package className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              My Purchases
              <Badge variant="secondary" className="text-xs">
                {products.length}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">Quick access to your owned audio packs</p>
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scrollCarousel("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scrollCarousel("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border shadow-lg flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        >
          {products.map((product) => (
            <motion.div
              key={product.id}
              whileHover={{ scale: 1.02 }}
              className="flex-shrink-0 w-64 bg-card border-2 border-green-500/30 rounded-xl overflow-hidden hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/10 transition-all cursor-pointer"
              onClick={() => navigate(`/arrangement/${product.songId}`)}
            >
              {/* Thumbnail */}
              <div className="relative h-32 bg-muted">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Music className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Owned indicator */}
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white border-0 text-xs">
                    ✓ Owned
                  </Badge>
                </div>

                {/* Track count */}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-xs">
                    <Volume2 className="w-3 h-3 mr-1" />
                    {product.tracks.length} Tracks
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate text-foreground">{product.title}</h3>
                <p className="text-xs text-muted-foreground truncate mb-3">{product.artist}</p>
                
                <Button
                  size="sm"
                  className="w-full h-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    openArrangelyApp(product.songId);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1.5" />
                  Open in App
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default MyPurchasesSection;
