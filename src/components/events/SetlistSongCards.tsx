import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Song {
  id: string;
  slug: string;
  title: string;
  artist?: string;
  current_key?: string;
  tempo?: number;
}

interface SetlistSongCardsProps {
  songs: Song[];
}

export const SetlistSongCards = ({ songs }: SetlistSongCardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const visibleItems = 3;
  const navigate = useNavigate();

  if (!songs || songs.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev + 1 >= songs.length ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? Math.max(0, songs.length - visibleItems) : prev - 1
    );
  };

  const getItemStyle = (index: number) => {
    const relativeIndex = index - currentIndex;
    const isVisible = relativeIndex >= 0 && relativeIndex < visibleItems;
    
    if (!isVisible) return { display: 'none' };

    const centerIndex = Math.floor(visibleItems / 2);
    const distanceFromCenter = Math.abs(relativeIndex - centerIndex);
    
    const scale = 1 - (distanceFromCenter * 0.1);
    const zIndex = 10 - distanceFromCenter;
    const opacity = 1 - (distanceFromCenter * 0.15);

    return {
      transform: `scale(${scale})`,
      zIndex,
      opacity,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      {songs.length > visibleItems && (
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
          <AnimatePresence>
            {songs.map((song, index) => (
              <motion.div
                key={song.id}
                className="flex-shrink-0 w-64"
                style={getItemStyle(index)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                onClick={() =>
                  navigate(`/arrangement/${song.id}/${song.slug}`)
                }
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden bg-card/80 backdrop-blur-sm">
                  <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-primary text-base leading-tight truncate group-hover:text-primary/80 transition-colors">
                          {song.title}
                        </h3>
                        <p className="text-muted-foreground text-sm truncate">
                          {song.artist || "Unknown Artist"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {song.current_key && (
                        <Badge variant="secondary" className="text-xs">
                          <Music className="h-3 w-3 mr-1" />
                          {song.current_key}
                        </Badge>
                      )}
                      {song.tempo && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {song.tempo} BPM
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground text-center">
                      Song #{index + 1} of {songs.length}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Dots Indicator */}
      {songs.length > visibleItems && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: Math.ceil(songs.length / visibleItems) }, (_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                Math.floor(currentIndex / visibleItems) === i
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
              onClick={() => setCurrentIndex(i * visibleItems)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
