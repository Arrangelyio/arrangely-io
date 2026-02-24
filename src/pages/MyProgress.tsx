import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, PlayCircle, Clock, Award, Download, Loader2, Star } from "lucide-react";
import { LevelProgressTracker } from "@/components/progress/LevelProgressTracker";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { generateLessonCertificate } from "@/utils/certificateGenerator";
import { motion } from "framer-motion";
import { LessonReviewDialog } from "@/components/lessons/LessonReviewDialog";

type FilterType = "all" | "in-progress" | "completed";

export default function MyProgress() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterType>("all");
  const [downloadingCerts, setDownloadingCerts] = useState<Set<string>>(new Set());
  const [highlightedLesson, setHighlightedLesson] = useState<string | null>(null);
  const lessonRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [reviewDialogLesson, setReviewDialogLesson] = useState<{
    lessonId: string;
    lessonTitle: string;
  } | null>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
  .from("lesson_enrollments")
  .select(`
    *,
    profiles:user_id (
      display_name,
      avatar_url
    ),
    lessons!inner (
      id,
      title,
      slug,
      description,
      cover_image_url,
      difficulty_level,
      duration_minutes,
      price,
      creator_id,
      profiles!lessons_creator_id_fkey (
        display_name,
        avatar_url
      )
    )
  `)
  .eq("user_id", currentUser!.id)
  .order("enrolled_at", { ascending: false });


      if (error) throw error;
      return data;
    },
  });

  // Query to check which lessons have been reviewed
  const { data: userReviews } = useQuery({
    queryKey: ["user-lesson-reviews", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_reviews")
        .select("lesson_id")
        .eq("user_id", currentUser!.id);
      
      if (error) throw error;
      return data?.map(r => r.lesson_id) || [];
    },
  });

  useEffect(() => {
    const highlightLessonId = searchParams.get("highlightLesson");
    if (highlightLessonId && enrollments) {
      setHighlightedLesson(highlightLessonId);
      
      // Wait for DOM to render then scroll to the lesson
      setTimeout(() => {
        const lessonElement = lessonRefs.current[highlightLessonId];
        if (lessonElement) {
          lessonElement.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
          });
          
          // Remove highlight after 5 seconds
          setTimeout(() => {
            setHighlightedLesson(null);
          }, 5000);
        }
      }, 100);
    }
  }, [searchParams, enrollments]);

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">My Learning Progress</h1>
        <p className="text-muted-foreground">Track your journey and achievements</p>
      </div>

      {/* Level Progress Tracker */}
      <div className="mb-8">
        <LevelProgressTracker />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card 
          className={`cursor-pointer transition-all ${filter === "all" ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
          onClick={() => setFilter("all")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <PlayCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{enrollments?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Enrolled</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filter === "in-progress" ? "ring-2 ring-orange-500 shadow-lg" : "hover:shadow-md"}`}
          onClick={() => setFilter("in-progress")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {enrollments?.filter((e: any) => !e.completed_at).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filter === "completed" ? "ring-2 ring-green-500 shadow-lg" : "hover:shadow-md"}`}
          onClick={() => setFilter("completed")}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Award className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {enrollments?.filter((e: any) => e.completed_at).length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Courses</h2>
        
        {enrollments && enrollments.length > 0 ? (
          enrollments
            .filter((enrollment: any) => {
              if (filter === "all") return true;
              if (filter === "in-progress") return !enrollment.completed_at;
              if (filter === "completed") return enrollment.completed_at;
              return true;
            })
            .map((enrollment: any) => {
              const isHighlighted = highlightedLesson === enrollment.lessons?.id;
              const hasReviewed = userReviews?.includes(enrollment.lessons?.id);
              const isCompletedNoReview = enrollment.completed_at && !hasReviewed;
              
              return (
                <motion.div
                  key={enrollment.id}
                  ref={(el) => (lessonRefs.current[enrollment.lessons?.id] = el)}
                  initial={false}
                  animate={isHighlighted ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className={`group hover:shadow-lg transition-all duration-300 overflow-hidden ${
                    isHighlighted ? "ring-4 ring-primary shadow-2xl" : ""
                  }`}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row gap-0">
                  {/* Course Image with Status Badge */}
                  <div className="relative md:w-64 h-48 md:h-auto flex-shrink-0">
                    {enrollment.lessons?.cover_image_url ? (
                      <img
                        src={enrollment.lessons.cover_image_url}
                        alt={enrollment.lessons?.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <PlayCircle className="h-16 w-16 text-primary/40" />
                      </div>
                    )}
                    
                    {/* Free/Paid Badge */}
                    <div className="absolute top-3 right-3">
                      {enrollment.lessons?.price && enrollment.lessons.price > 0 ? (
                        <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full shadow-lg">
                          Premium
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-full shadow-lg">
                          Free
                        </span>
                      )}
                    </div>

                    {/* Completion Badge */}
                    {enrollment.completed_at && (
                      <div className="absolute top-3 left-3">
                        <div className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Course Details */}
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Title and Creator */}
                      <div>
                        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {enrollment.lessons?.title}
                        </h3>
                        
                        {enrollment.lessons?.profiles?.display_name && (
                          <div className="flex items-center gap-2 mb-3">
                            {enrollment.lessons?.profiles?.avatar_url && (
                              <img 
                                src={enrollment.lessons.profiles.avatar_url} 
                                alt={enrollment.lessons.profiles.display_name}
                                className="w-6 h-6 rounded-full ring-2 ring-primary/20"
                              />
                            )}
                            <span className="text-sm font-medium text-muted-foreground">
                              by {enrollment.lessons.profiles.display_name}
                            </span>
                          </div>
                        )}
                        
                        {/* Meta Information */}
                        <div className="flex flex-wrap items-center gap-3">
                          {enrollment.lessons?.difficulty_level && (
                            <span className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                              {enrollment.lessons.difficulty_level}
                            </span>
                          )}
                          
                          {enrollment.lessons?.duration_minutes && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{enrollment.lessons.duration_minutes} min</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {enrollment.lessons?.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {enrollment.lessons.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="font-medium text-foreground">Your Progress</span>
                          <span className="font-bold text-primary">
                            {enrollment.completed_at ? "100%" : `${enrollment.progress_percentage || 0}%`}
                          </span>
                        </div>
                        <Progress 
                          value={enrollment.completed_at ? 100 : (enrollment.progress_percentage || 5)} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      {enrollment.completed_at ? (
                        <>
                          {isCompletedNoReview && (
                            <Button
                              onClick={() =>
                                setReviewDialogLesson({
                                  lessonId: enrollment.lesson_id,
                                  lessonTitle: enrollment.lessons?.title,
                                })
                              }
                              className="gap-2 flex-1 sm:flex-initial bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg animate-pulse"
                            >
                              <Star className="h-4 w-4 fill-white" />
                              Rate this Lesson
                            </Button>
                          )}
                          <Button
                            onClick={() => navigate(`/learn/${enrollment.lesson_id}`)}
                            variant="outline"
                            className="gap-2 flex-1 sm:flex-initial"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Review Music Lab
                          </Button>
                          <Button
                            onClick={async () => {
                              const isDownloading = downloadingCerts.has(enrollment.id);
                              if (isDownloading) return;

                              setDownloadingCerts(prev => new Set(prev).add(enrollment.id));
                              try {
                                const certificateUrl = await generateLessonCertificate({
                                  participantName: enrollment?.profiles?.display_name || "Student",
                                  lessonTitle: enrollment.lessons?.title || "Music Lab",
                                  creatorName: enrollment.lessons?.profiles?.display_name || "Instructor",
                                  completionDate: enrollment.completed_at,
                                  enrollmentId: enrollment.id,
                                  lessonId: enrollment.lesson_id,
                                  userId: currentUser?.id || "",
                                });
                                
                                // Open certificate in new tab
                                window.open(certificateUrl, "_blank");
                                toast.success("Certificate generated successfully!");
                              } catch (error: any) {
                                console.error("Error generating certificate:", error);
                                toast.error("Failed to generate certificate: " + error.message);
                              } finally {
                                setDownloadingCerts(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(enrollment.id);
                                  return newSet;
                                });
                              }
                            }}
                            disabled={downloadingCerts.has(enrollment.id)}
                            className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            {downloadingCerts.has(enrollment.id) ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Download Certificate
                              </>
                            )}
                          </Button>
                          <div className="flex items-center gap-2 text-sm text-green-600 font-semibold px-3 py-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="hidden sm:inline">Completed {new Date(enrollment.completed_at).toLocaleDateString()}</span>
                            <span className="sm:hidden">Completed</span>
                          </div>
                        </>
                      ) : (
                        <Button
                          onClick={() => navigate(`/learn/${enrollment.lesson_id}`)}
                          className="gap-2 group-hover:shadow-md transition-shadow flex-1 sm:flex-initial"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Continue Learning
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          );
        })
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">You haven't enrolled in any courses yet</p>
              <Button onClick={() => navigate("/arrangely-music-lab")}>
                Explore Music Lab
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      {reviewDialogLesson && currentUser && (
        <LessonReviewDialog
          open={!!reviewDialogLesson}
          onOpenChange={(open) => !open && setReviewDialogLesson(null)}
          lessonId={reviewDialogLesson.lessonId}
          lessonTitle={reviewDialogLesson.lessonTitle}
          userId={currentUser.id}
          onSubmitSuccess={() => {
            setReviewDialogLesson(null);
          }}
        />
      )}
    </div>
  );
}
