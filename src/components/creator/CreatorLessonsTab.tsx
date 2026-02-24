import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Star, User, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface CreatorLessonsTabProps {
  creatorId: string;
}

export const CreatorLessonsTab = ({ creatorId }: CreatorLessonsTabProps) => {
  const navigate = useNavigate();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["creator-lessons", creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-40 w-full mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!lessons || lessons.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">No lessons available</h3>
        <p className="text-sm text-muted-foreground">
          This creator hasn't published any lessons yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lessons.map((lesson) => (
        <Link 
                key={lesson.id} 
                to={`/arrangely-music-lab/${lesson.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/50 backdrop-blur">
                  {/* Cover Image */}
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {lesson.cover_image_url ? (
                      <img
                        src={lesson.cover_image_url}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Overlay badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                      <Badge variant="secondary" className="capitalize shadow-lg backdrop-blur-sm bg-background/90">
                        {lesson.category.replace("_", " ")}
                      </Badge>
                      {lesson.is_free && (
                        <Badge className="shadow-lg backdrop-blur-sm bg-primary/90">
                          FREE
                        </Badge>
                      )}
                    </div>
                    
                    {/* Difficulty badge */}
                    <div className="absolute bottom-3 right-3">
                      <Badge variant="outline" className="capitalize shadow-lg backdrop-blur-sm bg-background/90">
                        {lesson.difficulty_level}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Title */}
                    <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors min-h-[3.5rem]">
                      {lesson.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {lesson.description}
                    </p>

                    {/* Rating - Always Visible */}
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-foreground">
                        {lesson.average_rating?.toFixed(1) || '0.0'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({lesson.total_reviews || 0} reviews)
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{lesson.duration_minutes}min</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">{lesson.total_enrollments}</span>
                      </div>
                    </div>

                    {/* Creator */}
                    <div className="flex items-center gap-3 pt-4 border-t">
                      <div className="relative">
                        {lesson.profiles?.avatar_url ? (
                          <img
                            src={lesson.profiles.avatar_url}
                            alt={lesson.profiles.display_name}
                            className="h-8 w-8 rounded-full ring-2 ring-muted"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-muted">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Instructor</p>
                        <p className="text-sm font-semibold truncate">
                          {lesson.profiles?.display_name || "Unknown"}
                        </p>
                      </div>
                      
                      {/* Price/CTA */}
                      <div>
                        {lesson.is_free ? (
                          <Badge variant="outline" className="font-semibold">
                            Free
                          </Badge>
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            Rp {Number(lesson.price).toLocaleString("id-ID", { minimumFractionDigits: 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
      ))}
    </div>
  );
};
