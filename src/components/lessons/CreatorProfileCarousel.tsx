import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";

// Import creator photos
// import kevinPhoto from "@/assets/creators/kevin-senjaya.jpg";
// import michaelPhoto from "@/assets/creators/michael-if.jpg";
// import barryPhoto from "@/assets/creators/barry-likumahuwa.jpg";
// import andrePhoto from "@/assets/creators/andre-hermanto.jpg";
// import joshuaPhoto from "@/assets/creators/joshua-sentosa.jpg";
// import sarahPhoto from "@/assets/creators/sarah-chen.jpg";
// import rachelPhoto from "@/assets/creators/rachel-tan.jpg";
// import mariaPhoto from "@/assets/creators/maria-santos.jpg";
import { useLanguage } from "@/contexts/LanguageContext";

interface Creator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  introduction_video_url: string | null;
  introduction_title: string | null;
  introduction_description: string | null;
  creator_slug: string | null;
}

// Map creator names to their photos
const creatorPhotos: Record<string, string> = {
  // KevinSenjaya: kevinPhoto,
  // MichaelIF: michaelPhoto,
  // BarryLikumahuwa: barryPhoto,
  // AndreHermanto: andrePhoto,
  // JoshuaSentosa: joshuaPhoto,
  // SarahChen: sarahPhoto,
  // RachelTan: rachelPhoto,
  // MariaSantos: mariaPhoto,
};

export const CreatorProfileCarousel = () => {
  const { t } = useLanguage();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const { data: creators, isLoading } = useQuery({
    queryKey: ["featured-creators"],
    queryFn: async () => {
      // Use trusted-arrangers function with source=lesson parameter
      const { data, error } = await supabase.functions.invoke(
        "trusted-arrangers?source=lesson"
      );

      if (error) throw error;

      // Add example video if no creators exist
      const creatorsData = (data || []).map((arranger: any) => ({
        id: arranger.user_id,
        display_name: arranger.name,
        avatar_url: arranger.avatar,
        bio: arranger.bio || null,
        introduction_video_url: arranger.introduction_video_url || null,
        introduction_title: arranger.introduction_title || null,
        introduction_description: arranger.introduction_description || null,
        creator_slug: arranger.creator_slug,
      })) as Creator[];

      if (creatorsData.length === 0) {
        // return [
        //   {
        //     id: "example-creator",
        //     display_name: "Sarah Chen",
        //     avatar_url: null,
        //     bio: "Professional music instructor with 10+ years of experience",
        //     introduction_video_url:
        //       "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        //     introduction_title: t("lesson.watchWelcome"),
        //     introduction_description:
        //       "Hi! I'm Sarah, and I'm passionate about helping students discover their musical potential through structured learning.",
        //     creator_slug: null,
        //   },
        // ];
      }

      return creatorsData;
    },
  });

  const handlePlayVideo = (creator: Creator) => {
    setSelectedCreator(creator);
    setIsVideoModalOpen(true);
  };

  const getEmbedUrl = (videoUrl: string) => {
    const videoId = extractYouTubeVideoId(videoUrl);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Check if it's a Vimeo URL
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return videoUrl;
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (direction === "left") {
      setCarouselIndex(Math.max(0, carouselIndex - 1));
    } else {
      setCarouselIndex(
        Math.min((creators?.length || 0) - 4, carouselIndex + 1)
      );
    }
  };

  if (isLoading || !creators || creators.length === 0) {
    return null;
  }

  return (
    <div className="relative py-16 px-4 md:px-8 bg-background">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              {/* Get to know our Creators. */}
              {t("lesson.getTo")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {/* Meet the instructors who will guide your musical journey */}
              {t("lesson.meetThe")}
            </p>
          </div>

          {/* Carousel Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollCarousel("left")}
              disabled={carouselIndex === 0}
              className="rounded-full h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollCarousel("right")}
              disabled={carouselIndex >= creators.length - 4}
              className="rounded-full h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative overflow-hidden">
          <div
            className={`
              flex gap-4 transition-transform duration-500 ease-out
              md:overflow-hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide
            `}
            style={{
              transform: `translateX(-${carouselIndex * (100 / 4)}%)`,
            }}
          >
            {creators.map((creator) => (
              <div
                key={creator.id}
                className={`
                  group flex-shrink-0 
                  w-[80%] sm:w-[45%] md:w-[calc(25%-12px)] 
                  snap-center
                `}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative h-[400px] sm:h-[450px] md:h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-card/50 to-card border border-border/50 cursor-pointer"
                  onClick={() => handlePlayVideo(creator)}
                >
                  {/* Background image */}
                  <div className="absolute inset-0">
                    {creatorPhotos[creator.display_name || ""] ||
                    creator.avatar_url ? (
                      <div className="relative w-full h-full">
                        <img
                          src={
                            creatorPhotos[creator.display_name || ""] ||
                            creator.avatar_url ||
                            ""
                          }
                          alt={creator.display_name || "Creator"}
                          className="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/90" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="relative h-full flex flex-col justify-between p-4 sm:p-6">
                    {/* Top section */}
                    <div>
                      <div className="inline-block px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 mb-3">
                        <span className="text-xs font-semibold text-primary">
                          {/* Meet the Creator */}
                          {t("lesson.meetCreator")}
                        </span>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                      >
                        {creatorPhotos[creator.display_name || ""] ||
                        creator.avatar_url ? (
                          <div className="relative">
                            <img
                              src={
                                creatorPhotos[creator.display_name || ""] ||
                                creator.avatar_url ||
                                ""
                              }
                              alt={creator.display_name || "Creator"}
                              className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-white/20 shadow-2xl"
                            />
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 text-black ml-0.5" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-4 border-white/20 flex items-center justify-center">
                            <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">
                              {creator.display_name?.[0] || "?"}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 sm:space-y-3">
                      <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        {creator.introduction_title ||
                          `Learn from ${creator.display_name}`}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/80 leading-relaxed line-clamp-3">
                        {creator.introduction_description ||
                          creator.bio ||
                          "Discover this creator's unique teaching style and expertise"}
                      </p>

                      {/* Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVideo(creator);
                          }}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {/* Watch */}
                          {t("lesson.watch")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs sm:text-sm"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to={`/creator/${
                              creator.creator_slug || creator.id
                            }`}
                          >
                            {/* Profile */}
                            {t("lesson.profile")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCreator?.introduction_title ||
                `Meet ${selectedCreator?.display_name}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {" "}
            {selectedCreator?.introduction_video_url && (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                {selectedCreator.introduction_video_url.includes("supabase") ? (
                  <video
                    src={selectedCreator.introduction_video_url}
                    className="w-full h-full"
                    controls
                  />
                ) : (
                  // --- Gunakan <iframe> untuk YouTube/Vimeo (logika lama) ---
                  <iframe
                    src={getEmbedUrl(selectedCreator.introduction_video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}{" "}
              </div>
            )}
            {selectedCreator?.introduction_description && (
              <p className="text-muted-foreground">
                {selectedCreator.introduction_description}
              </p>
            )}
            <div className="flex gap-2">
              <Button className="flex-1" asChild>
                <Link
                  to={`/creator/${
                    selectedCreator?.creator_slug || selectedCreator?.id
                  }`}
                >
                  {/* View Full Profile */}
                  {t("lesson.watchButtonView")}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsVideoModalOpen(false)}
              >
                {/* Close */}
                {t("lesson.watchClose")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
