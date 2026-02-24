import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Clock,
  Music,
  Heart,
  Play,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Arrangement {
  id: string;
  title: string;
  artist: string;
  created_at: string;
  current_key?: string;
  tempo?: number;
  is_favorite: boolean;
  views_count: number;
  tags?: string[];
  folder?: { name: string; color: string };
}

interface RecentArrangementsCarouselProps {
  arrangements: Arrangement[];
}

const RecentArrangementsCarousel = ({
  arrangements,
}: RecentArrangementsCarouselProps) => {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleItems, setVisibleItems] = useState(5);

  useEffect(() => {
    const updateVisibleItems = () => {
      if (window.innerWidth < 640) {
        setVisibleItems(1);
      } else if (window.innerWidth < 1024) {
        setVisibleItems(3);
      } else {
        setVisibleItems(5);
      }
    };

    updateVisibleItems();
    window.addEventListener("resize", updateVisibleItems);
    return () => window.removeEventListener("resize", updateVisibleItems);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) =>
      prev + visibleItems >= arrangements.length ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.max(0, arrangements.length - visibleItems) : prev - 1
    );
  };

  const getItemStyle = (index: number) => {
    const relativeIndex = index - currentIndex;
    const isVisible = relativeIndex >= 0 && relativeIndex < visibleItems;

    if (!isVisible) return { display: "none" };

    const centerIndex = Math.floor(visibleItems / 2);
    const distanceFromCenter = Math.abs(relativeIndex - centerIndex);

    let scale = 1;
    let zIndex = 10;
    let opacity = 1;

    if (visibleItems > 1) {
      scale = 1 - distanceFromCenter * 0.15;
      zIndex = 10 - distanceFromCenter;
      opacity = 1 - distanceFromCenter * 0.2;
    }

    return {
      transform: `scale(${scale})`,
      zIndex,
      opacity,
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

  if (arrangements.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-worship rounded-xl flex items-center justify-center">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {/* Recent Arrangements */}
              {t("recentArrHome.title")}
            </h2>
            <p className="text-muted-foreground">
              {/* Pick up where you left off */}
              {t("recentArrHome.subtitle")}
            </p>
          </div>
        </div>
        <Link to="/library">
          <Button
            variant="ghost"
            className="text-primary hover:text-primary/80"
          >
            {/* View All */}
            {t("recentArrHome.view")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* 3D Carousel */}
      <div className="relative">
        {/* Navigation Buttons */}
        {arrangements.length > visibleItems && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-lg"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-lg"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Carousel Container */}
        <div className="overflow-hidden px-8">
          <div className="flex gap-4 justify-center">
            {arrangements.map((arrangement, index) => (
              <div
                key={arrangement.id}
                className="flex-shrink-0 w-80"
                style={getItemStyle(index)}
              >
                <Link
                  to={`/arrangement/${arrangement.id}/${generateSlug(
                    arrangement.title
                  )}`}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border/50 overflow-hidden bg-card/70 backdrop-blur-sm h-full">
                    {/* Compact Header */}
                    <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-primary text-base leading-tight truncate group-hover:text-primary/80 transition-colors">
                            {arrangement.title}
                          </h3>
                          <p className="text-muted-foreground text-sm truncate">
                            {arrangement.artist || "Unknown Artist"}
                          </p>
                        </div>
                        {arrangement.is_favorite && (
                          <Heart className="h-4 w-4 text-red-500 fill-current flex-shrink-0 ml-2" />
                        )}
                      </div>

                      {/* Compact Musical Details */}
                      <div className="flex items-center gap-2 mt-3">
                        {arrangement.current_key && (
                          <div className="flex items-center gap-1 bg-accent/20 text-accent-foreground px-2 py-1 rounded text-xs">
                            <Music className="h-3 w-3" />
                            {arrangement.current_key}
                          </div>
                        )}
                        {arrangement.tempo && (
                          <div className="text-xs text-muted-foreground">
                            {arrangement.tempo} BPM
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Content */}
                    <CardContent className="p-4">
                      {/* Tags - Show only first tag */}
                      {arrangement.tags && arrangement.tags.length > 0 && (
                        <div className="flex gap-1 mb-3">
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            {arrangement.tags[0]}
                          </span>
                          {arrangement.tags.length > 1 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                              +{arrangement.tags.length - 1}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Folder */}
                      {arrangement.folder && (
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: arrangement.folder.color,
                            }}
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            {arrangement.folder.name}
                          </span>
                        </div>
                      )}

                      {/* Compact Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(arrangement.created_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary group-hover:text-primary/80">
                          <Play className="h-3 w-3" />
                          <span className="font-medium">Preview</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        {arrangements.length > visibleItems && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from(
              { length: Math.ceil(arrangements.length / visibleItems) },
              (_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    Math.floor(currentIndex / visibleItems) === i
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  onClick={() => setCurrentIndex(i * visibleItems)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentArrangementsCarousel;
