import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, Star, BookOpen, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/ui/verified-badge";

interface FeaturedLesson {
  id: string;
  title: string;
  description: string;
  slug: string;
  cover_image_url: string | null;
  difficulty_level: string;
  category: string;
  duration_minutes: number;
  average_rating: number;
  total_enrollments: number;
  original_price: number | null;
  price: number;
  is_free: boolean;
  creator: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
}

const FeaturedLessonsCarousel = () => {
  const [featuredLessons, setFeaturedLessons] = useState<FeaturedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedLessons = async () => {
      try {
        // First get featured lesson IDs from featured_lessons table
        const { data: featuredIds } = await supabase
          .from("featured_lessons")
          .select("lesson_id")
          .order("display_order", { ascending: true })
          .limit(6);

        let lessonsToProcess: any[] = [];

        if (!featuredIds || featuredIds.length === 0) {
          // Fallback: Get top-rated published lessons
          const { data: lessons } = await supabase
            .from("lessons")
            .select(
              `
              id,
              title,
              description,
              slug,
              cover_image_url,
              difficulty_level,
              category,
              duration_minutes,
              original_price,
              price,
              is_free,
              creator_id,
              profiles!lessons_creator_id_fkey (
                user_id,
                display_name,
                avatar_url,
                role
              )
            `
            )
            .eq("status", "published")
            .eq("is_unlisted", false)
            .limit(6);

          if (lessons) {
            lessonsToProcess = lessons;
          }
        } else {
          // Get the featured lessons by IDs
          const lessonIds = featuredIds.map((f) => f.lesson_id);
          const { data: lessons } = await supabase
            .from("lessons")
            .select(
              `
              id,
              title,
              description,
              slug,
              cover_image_url,
              difficulty_level,
              category,
              duration_minutes,
              original_price,
              price,
              is_free,
              creator_id,
              profiles!lessons_creator_id_fkey (
                user_id,
                display_name,
                avatar_url,
                role
              )
            `
            )
            .in("id", lessonIds)
            .eq("status", "published")
            .eq("is_unlisted", false);

          if (lessons) {
            lessonsToProcess = lessons;
          }
        }

        if (lessonsToProcess.length > 0) {
          // Fetch enrollment counts and ratings for all lessons in parallel
          const lessonIds = lessonsToProcess.map((l) => l.id);
          
          // Fetch enrollment counts using the RPC function
          const enrollmentPromises = lessonIds.map((id) =>
            supabase.rpc("get_lesson_enrollment_count", { lesson_uuid: id })
          );
          
          // Fetch average ratings from lesson_reviews table
          const { data: reviewData } = await supabase
            .from("lesson_reviews")
            .select("lesson_id, rating")
            .in("lesson_id", lessonIds);

          const enrollmentResults = await Promise.all(enrollmentPromises);
          
          // Create a map of lesson_id to enrollment count
          const enrollmentMap: Record<string, number> = {};
          lessonIds.forEach((id, index) => {
            enrollmentMap[id] = enrollmentResults[index]?.data || 0;
          });

          // Calculate average ratings per lesson
          const ratingMap: Record<string, { sum: number; count: number }> = {};
          if (reviewData) {
            reviewData.forEach((review) => {
              if (!ratingMap[review.lesson_id]) {
                ratingMap[review.lesson_id] = { sum: 0, count: 0 };
              }
              ratingMap[review.lesson_id].sum += review.rating;
              ratingMap[review.lesson_id].count += 1;
            });
          }

          const formattedLessons = lessonsToProcess.map((lesson: any) => {
            const ratingData = ratingMap[lesson.id];
            const averageRating = ratingData 
              ? ratingData.sum / ratingData.count 
              : 0;

            return {
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              slug: lesson.slug,
              cover_image_url: lesson.cover_image_url,
              difficulty_level: lesson.difficulty_level,
              category: lesson.category,
              duration_minutes: lesson.duration_minutes,
              average_rating: averageRating,
              total_enrollments: enrollmentMap[lesson.id] || 0,
              original_price: lesson.original_price || null,
              price: lesson.price || 0,
              is_free: lesson.is_free,
              creator: {
                id: lesson.profiles?.user_id || "",
                display_name: lesson.profiles?.display_name || "Unknown Creator",
                avatar_url: lesson.profiles?.avatar_url,
                role: lesson.profiles?.role || "user",
              },
            };
          });
          setFeaturedLessons(formattedLessons);
        }
      } catch (error) {
        console.error("Error fetching featured lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedLessons();
  }, []);

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "beginner":
        return "bg-green-500/10 text-green-700 border-green-500/30";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
      case "advanced":
        return "bg-red-500/10 text-red-700 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading || featuredLessons.length === 0) {
    return null;
  }

  return (
    <div className="pl-4 pr-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Music Lab</h2>
          </div>
          <Link to="/arrangely-music-lab">
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-8">
              View All
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {featuredLessons.map((lesson) => (
              <CarouselItem 
                key={lesson.id} 
                className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pl-4"
              >
                <Link to={`/arrangely-music-lab/${lesson.slug}`} className="block h-full">
                  <Card className="group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/50 overflow-hidden h-full flex flex-col">
                    {/* Compact Cover Image - 4:3 aspect ratio */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {lesson.cover_image_url ? (
                        <img
                          src={lesson.cover_image_url}
                          alt={lesson.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                          <BookOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Price Badge - Compact */}
                      <div className="absolute top-2 right-2">
                        {lesson.is_free ? (
                          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 h-5">
                            Free
                          </Badge>
                        ) : (
                          <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 h-5">
                            Rp{(lesson.price / 1000).toFixed(0)}k
                          </Badge>
                        )}
                      </div>

                      {/* Difficulty Badge - Bottom left */}
                      <Badge
                        variant="outline"
                        className={`absolute bottom-2 left-2 text-[10px] px-1.5 py-0.5 h-5 ${getDifficultyColor(lesson.difficulty_level)}`}
                      >
                        {lesson.difficulty_level}
                      </Badge>
                    </div>

                    <CardContent className="p-2.5 flex-1 flex flex-col">
                      {/* Title - 2 lines max */}
                      <h3 className="font-medium text-sm text-primary mb-1.5 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                        {lesson.title}
                      </h3>

                      {/* Stats Row - Compact */}
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span>{lesson.average_rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{lesson.duration_minutes}m</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          <span>{lesson.total_enrollments}</span>
                        </div>
                      </div>

                      {/* Creator - Minimal */}
                      <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-border/50">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={lesson.creator.avatar_url || ""} />
                          <AvatarFallback className="text-[8px]">
                            {lesson.creator.display_name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground truncate flex-1">
                          {lesson.creator.display_name}
                        </span>
                        {lesson.creator.role === "creator" && (
                          <VerifiedBadge size="sm" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-1 h-7 w-7 bg-background/80 backdrop-blur border-border text-foreground hover:bg-accent" />
          <CarouselNext className="right-1 h-7 w-7 bg-background/80 backdrop-blur border-border text-foreground hover:bg-accent" />
        </Carousel>
      </motion.div>
    </div>
  );
};

export default FeaturedLessonsCarousel;
