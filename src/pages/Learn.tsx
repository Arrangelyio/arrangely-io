import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    CheckCircle2,
    PlayCircle,
    ChevronRight,
    BookOpen,
    Menu,
    X,
    FileText,
    Award,
    Target,
    Music,
    Circle,
    ChevronLeft,
    PanelLeftClose,
    PanelLeftOpen,
    Lock,
    Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import SecureVideoPlayer from "@/components/lessons/SecureVideoPlayer";
import SecurePdfViewer from "@/components/lessons/SecurePdfViewer";
import { useContentSecurity } from "@/hooks/useContentSecurity";
import PerformanceRecorder from "@/components/lessons/PerformanceRecorder";
import ProtectedSheetMusic from "@/components/lessons/ProtectedSheetMusic";
import InteractiveChordChart from "@/components/lessons/InteractiveChordChart";
import RhythmTrainer from "@/components/lessons/RhythmTrainer";
import QuizExercise from "@/components/lessons/QuizExercise";
import { motion, AnimatePresence } from "framer-motion";
import { generateLessonCertificate } from "@/utils/certificateGenerator";
import { LessonReviewDialog } from "@/components/lessons/LessonReviewDialog";

export default function Learn() {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ====== UI State (UX only) ======
    const [currentContentId, setCurrentContentId] = useState<string | null>(
        null
    );
    const [notes, setNotes] = useState("");
    // Mobile drawer for Curriculum
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // Desktop collapse like Udemy
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [performanceReviews, setPerformanceReviews] = useState<
        Record<string, any>
    >({});
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [showReviewDialog, setShowReviewDialog] = useState(false);

    // Enable content security monitoring (unchanged)
    useContentSecurity(lessonId);

    // ====== Queries (unchanged logic) ======
    const { data: currentUser } = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            return user;
        },
    });

    const { data: profile } = useQuery({
        queryKey: ["profile", currentUser?.id],
        enabled: !!currentUser?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("display_name, email")
                .eq("user_id", currentUser.id)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const { data: lesson } = useQuery({
        queryKey: ["lesson", lessonId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select(
                    `
          *,
          profiles:creator_id (
            display_name,
            avatar_url,
            creator_slug
          )
        `
                )
                .eq("id", lessonId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    // --- ACCESS CONTROL (SINGLE SOURCE OF TRUTH) ---
    const { data: hasAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["lesson-access", lessonId, currentUser?.id],
    enabled: !!lessonId && !!currentUser?.id,
    queryFn: async () => {
        const { data, error } = await supabase.rpc("has_lesson_access", {
        _user_id: currentUser.id,
        _lesson_id: lessonId,
        });
        if (error) throw error;
        return data === true;
    },
    });

    const isEnrolled = hasAccess === true;

    const { data: enrollment } = useQuery({
        queryKey: ["enrollment", lessonId, currentUser?.id],
        enabled: !!lessonId && !!currentUser?.id && isEnrolled,
        queryFn: async () => {
            const { data, error } = await supabase
            .from("lesson_enrollments")
            .select("*")
            .eq("lesson_id", lessonId)
            .eq("user_id", currentUser.id)
            .maybeSingle(); // ⬅️ penting (free / admin bisa belum ada row)
            if (error) throw error;
            return data;
        },
    });

    const ensureEnrollment = async () => {
        if (enrollment) return enrollment;

        const { data, error } = await supabase
            .from("lesson_enrollments")
            .insert({
            lesson_id: lessonId,
            user_id: currentUser.id,
            is_production: true,
            progress_percentage: 0,
            })
            .select()
            .single();

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["enrollment"] });
        return data;
    };


    const { data: modules } = useQuery({
        queryKey: ["lesson-modules", lessonId],
        enabled: !!lessonId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_modules")
                .select(
                    `
          *,
          lesson_content (
            *,
            interactive_exercises (
              exercise_type,
              difficulty
            )
          )
        `
                )
                .eq("lesson_id", lessonId)
                .order("order_index");
            if (error) throw error;
            return data;
        },
    });

    const { data: progress } = useQuery({
        queryKey: ["lesson-progress", enrollment?.id],
        enabled: !!enrollment?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_progress")
                .select("*")
                .eq("enrollment_id", enrollment.id);
            if (error) throw error;
            return data;
        },
    });

    const { data: currentContent } = useQuery({
        queryKey: ["lesson-content", currentContentId],
        enabled: !!currentContentId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_content")
                .select("*")
                .eq("id", currentContentId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const { data: exerciseData } = useQuery({
        queryKey: ["interactive-exercise", currentContentId],
        enabled:
            !!currentContentId && currentContent?.content_type === "exercise",
        queryFn: async () => {
            const { data, error } = await supabase
                .from("interactive_exercises")
                .select("*")
                .eq("content_id", currentContentId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const { data: performanceRecordings } = useQuery({
        queryKey: ["performance-recordings", lessonId, currentUser?.id],
        enabled: !!lessonId && !!currentUser?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_performance_recordings")
                .select("*")
                .eq("lesson_id", lessonId)
                .eq("user_id", currentUser.id);
            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        if (performanceRecordings) {
            const reviews: Record<string, any> = {};
            performanceRecordings.forEach((recording) => {
                if (recording.status === "reviewed") {
                    reviews[recording.content_id] = {
                        status: recording.status,
                        score: recording.score,
                        creator_notes: recording.creator_notes,
                        reviewed_at: recording.reviewed_at,
                        reviewed_by: recording.reviewed_by,
                    };
                }
            });
            setPerformanceReviews(reviews);
        }
    }, [performanceRecordings]);

    // ====== Derived states (unchanged) ======
    const filteredModules =
        modules?.filter(
            (m: any) => m.lesson_content && m.lesson_content.length > 0
        ) || [];
    const completedCount = progress?.filter((p) => p.completed).length || 0;
    const totalCount =
        filteredModules.reduce(
            (acc, m: any) => acc + m.lesson_content.length,
            0
        ) || 0;
    const progressPercentage =
        totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const allCompleted = totalCount > 0 && completedCount === totalCount;

    const { data: relatedLessons } = useQuery({
        queryKey: ["related-lessons", lesson?.creator_id],
        enabled: !!lesson?.creator_id && allCompleted,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select("*")
                .eq("creator_id", lesson.creator_id)
                .neq("id", lessonId)
                .eq("status", "published")
                .eq("is_unlisted", false)
                .limit(3);
            if (error) throw error;
            return data;
        },
    });

    const { data: existingReview } = useQuery({
        queryKey: ["lesson-review", lessonId, currentUser?.id],
        enabled: !!lessonId && !!currentUser?.id && allCompleted,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_reviews")
                .select("id")
                .eq("lesson_id", lessonId)
                .eq("user_id", currentUser.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        if (currentContentId && progress) {
            const contentProgress = progress.find(
                (p) => p.content_id === currentContentId
            );
            setNotes(contentProgress?.notes || "");
        }
    }, [currentContentId, progress]);

    // ====== Mutations (unchanged logic) ======
    const markCompleteMutation = useMutation({
        mutationFn: async (contentId: string) => {
            const activeEnrollment = await ensureEnrollment();

            const { error } = await supabase.from("lesson_progress").upsert(
                {
                    enrollment_id: activeEnrollment.id,
                    content_id: contentId,
                    completed: true,
                    completion_date: new Date().toISOString(),
                },
                {
                    // TAMBAHKAN INI AGAR TIDAK ERROR SAAT SUDAH ADA NOTES
                    onConflict: "enrollment_id,content_id",
                }
            );

            if (error) throw error;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
            if (enrollment && totalCount > 0) {
                const newCompletedCount = (completedCount || 0) + 1;
                const newProgress = Math.round(
                    (newCompletedCount / totalCount) * 100
                );
                await supabase
                    .from("lesson_enrollments")
                    .update({ progress_percentage: newProgress })
                    .eq("id", enrollment.id);
                queryClient.invalidateQueries({ queryKey: ["enrollment"] });
            }
            toast.success("Content marked as complete!");
        },
    });

    const saveNotesMutation = useMutation({
        mutationFn: async () => {
            if (!enrollment || !currentContentId) return;

            // Cari data progress yang sudah ada (jika ada) untuk menjaga status 'completed'
            // Tips: Supabase upsert sebenarnya hanya mengupdate kolom yang dikirim,
            // tapi menambahkan onConflict wajib dilakukan untuk menghindari error 23505.

            const { error } = await supabase.from("lesson_progress").upsert(
                {
                    enrollment_id: enrollment.id,
                    content_id: currentContentId,
                    notes,
                    // Opsional: tambahkan updated_at jika kolomnya ada
                    // updated_at: new Date().toISOString(),
                },
                {
                    // INI KUNCI PERBAIKANNYA:
                    // Memberitahu DB untuk mengecek kolom ini sebagai acuan unik
                    onConflict: "enrollment_id,content_id",
                }
            );

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate agar UI terupdate jika diperlukan
            queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
            toast.success("Notes saved!");
        },
    });

    const completeLessonMutation = useMutation({
        mutationFn: async () => {
            if (!enrollment) throw new Error("Not enrolled");
            const { error } = await supabase
                .from("lesson_enrollments")
                .update({
                    completed_at: new Date().toISOString(),
                    progress_percentage: 100,
                })
                .eq("id", enrollment.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["enrollment"] });
            queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
            toast.success("🎉 Music Lab completed! Check your progress page.");
        },
    });

    const toggleCompleteMutation = useMutation({
        mutationFn: async ({
            contentId,
            isCompleted,
        }: {
            contentId: string;
            isCompleted: boolean;
        }) => {
            const activeEnrollment = await ensureEnrollment();

            if (isCompleted) {
                // Logic Un-complete (Hapus progress atau set false)
                // Hati-hati: Delete akan menghapus Notes juga.
                // Lebih aman update completed: false jika ingin notes tetap ada.
                // Tapi jika logic kamu delete, biarkan delete.
                const { error } = await supabase
                    .from("lesson_progress")
                    .delete()
                    .eq("enrollment_id", enrollment.id)
                    .eq("content_id", contentId);
                if (error) throw error;
            } else {
                // Logic Mark as Complete
                const { error } = await supabase.from("lesson_progress").upsert(
                    {
                        enrollment_id: activeEnrollment.id,
                        content_id: contentId,
                        completed: true,
                        completion_date: new Date().toISOString(),
                    },
                    {
                        // TAMBAHKAN INI JUGA DISINI
                        onConflict: "enrollment_id,content_id",
                    }
                );
                if (error) throw error;
            }
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
            if (enrollment && totalCount > 0) {
                const newCompletedCount =
                    progress?.filter((p) => p.completed).length || 0;
                const newProgress = Math.round(
                    (newCompletedCount / totalCount) * 100
                );
                await supabase
                    .from("lesson_enrollments")
                    .update({ progress_percentage: newProgress })
                    .eq("id", enrollment.id);
                queryClient.invalidateQueries({ queryKey: ["enrollment"] });
            }
        },
    });

    useEffect(() => {
        if (allCompleted && enrollment && !enrollment.completed_at) {
            completeLessonMutation.mutate();
        }
    }, [allCompleted, enrollment]);

    useEffect(() => {
        if (allCompleted && enrollment?.completed_at) {
            setShowSuccessDialog(true);
        }
    }, [allCompleted, enrollment?.completed_at]);

    const handleGetCertificate = async () => {
        if (!lesson || !profile || !enrollment || !currentUser) return;

        setShowSuccessDialog(false);
        toast.info("Preparing your certificate...");

        try {
            // 1. Tangkap URL sertifikat yang dikembalikan oleh generator
            const certificateUrl = await generateLessonCertificate({
                participantName:
                    profile.display_name || profile.email || "Student",
                lessonTitle: lesson.title,
                creatorName: lesson.profiles?.display_name || "Instructor",
                completionDate:
                    enrollment.completed_at || new Date().toISOString(),
                enrollmentId: enrollment.id,
                lessonId: lesson.id,
                userId: currentUser.id,
            });

            // 2. Trigger download/buka sertifikat di tab baru
            if (certificateUrl) {
                // Cara paling simpel: Buka di tab baru
                window.open(certificateUrl, "_blank");

                // ATAU jika ingin paksa download (opsional):
                // const link = document.createElement('a');
                // link.href = certificateUrl;
                // link.download = `Sertifikat-${lesson.title}.pdf`;
                // link.click();
            }

            toast.success("Certificate generated successfully!");

            // 3. (Opsional) Tetap navigate jika Michael ingin user diarahkan ke profil
            // Tapi sebaiknya beri delay sedikit agar user tidak kaget
            setTimeout(() => {
                navigate(`/my-progress?highlightLesson=${lessonId}`);
            }, 1500);
        } catch (error) {
            console.error("Error generating certificate:", error);
            toast.error("Failed to generate certificate. Please try again.");
        }
    };

    useEffect(() => {
        if (modules && modules.length > 0 && !currentContentId) {
            const firstContent = modules[0]?.lesson_content?.[0];
            if (firstContent) {
                setCurrentContentId(firstContent.id);
            }
        }
    }, [modules, currentContentId]);

    if (!isEnrolled) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="mx-auto max-w-md text-center">
                    <h2 className="text-xl font-semibold mb-2">
                        Enroll Required
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        You need to enroll in this music lab first.
                    </p>
                    <Button
                        onClick={() =>
                            navigate(`/arrangely-music-lab/${lesson?.slug}`)
                        }
                        className="mt-4 rounded-xl"
                    >
                        Go to Lesson Page
                    </Button>
                </div>
            </div>
        );
    }

    // ====== Helpers (unchanged) ======
    const getContentIcon = (content: any) => {
        if (
            content.content_type === "exercise" &&
            content.interactive_exercises?.[0]
        ) {
            const exerciseType = content.interactive_exercises[0].exercise_type;
            switch (exerciseType) {
                case "quiz":
                    return <FileText className="h-4 w-4" />;
                case "performance_task":
                    return <Target className="h-4 w-4" />;
                case "chord_chart":
                    return <Music className="h-4 w-4" />;
                case "rhythm_trainer":
                    return <Award className="h-4 w-4" />;
                default:
                    return <BookOpen className="h-4 w-4" />;
            }
        }
        if (content.content_type === "video")
            return <PlayCircle className="h-4 w-4" />;
        return <BookOpen className="h-4 w-4" />;
    };

    const getContentLabel = (content: any) => {
        if (
            content.content_type === "exercise" &&
            content.interactive_exercises?.[0]
        ) {
            const exerciseType = content.interactive_exercises[0].exercise_type;
            switch (exerciseType) {
                case "quiz":
                    return "Quiz";
                case "performance_task":
                    return "Performance Task";
                case "chord_chart":
                    return "Chord Chart";
                case "rhythm_trainer":
                    return "Rhythm Trainer";
                default:
                    return "Exercise";
            }
        }
        return content.title;
    };

    const SidebarList = ({ compact = false }: { compact?: boolean }) => {
        // 1. Buat flat array dari semua konten yang sudah diurutkan
        // Ini penting untuk mengetahui "siapa konten sebelum saya?"
        const allSortedContent = filteredModules.flatMap((m: any) =>
            m.lesson_content.sort(
                (a: any, b: any) => a.order_index - b.order_index
            )
        );

        return (
            <div className={`p-3 ${compact ? "space-y-3" : "p-4 space-y-4"}`}>
                {filteredModules.map((module: any, idx: number) => (
                    <div key={module.id} className="space-y-2">
                        {!compact && (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                    {idx + 1}
                                </span>
                                <h3 className="font-semibold text-sm md:text-base line-clamp-1">
                                    {module.title}
                                </h3>
                            </div>
                        )}

                        <div className="space-y-1">
                            {module.lesson_content
                                .sort(
                                    (a: any, b: any) =>
                                        a.order_index - b.order_index
                                )
                                .map((content: any) => {
                                    // --- LOGIKA UNLOCKING ---

                                    // Cari index konten ini di list keseluruhan
                                    const currentIndex =
                                        allSortedContent.findIndex(
                                            (c: any) => c.id === content.id
                                        );

                                    // Ambil konten sebelumnya
                                    const previousContent =
                                        allSortedContent[currentIndex - 1];

                                    // Cek apakah konten sebelumnya sudah selesai?
                                    // Jika tidak ada konten sebelumnya (index 0), maka dia otomatis unlocked (true)
                                    const isPreviousCompleted = previousContent
                                        ? progress?.some(
                                              (p) =>
                                                  p.content_id ===
                                                      previousContent.id &&
                                                  p.completed
                                          )
                                        : true;

                                    // Status item saat ini
                                    const isCompleted = progress?.some(
                                        (p) =>
                                            p.content_id === content.id &&
                                            p.completed
                                    );

                                    // Tentukan apakah item ini harus dikunci
                                    // Item dikunci jika item sebelumnya belum selesai
                                    const isLocked = !isPreviousCompleted;

                                    const isCurrent =
                                        currentContentId === content.id;

                                    return (
                                        <motion.div
                                            layout
                                            key={content.id}
                                            className={`w-full ${
                                                compact
                                                    ? "px-2 py-1.5"
                                                    : "px-3 py-2"
                                            } rounded-xl flex items-center gap-2 transition-colors border ${
                                                isCurrent
                                                    ? "bg-primary text-primary-foreground border-primary/40 shadow-sm"
                                                    : isLocked
                                                    ? "bg-muted/30 border-transparent opacity-60 cursor-not-allowed" // Style khusus jika Locked
                                                    : "bg-background hover:bg-muted/60 border-transparent"
                                            }`}
                                            // Disable animasi hover/tap jika dikunci
                                            whileHover={
                                                !isLocked ? { scale: 1.01 } : {}
                                            }
                                            whileTap={
                                                !isLocked
                                                    ? { scale: 0.995 }
                                                    : {}
                                            }
                                        >
                                            <button
                                                // Matikan klik jika dikunci
                                                disabled={isLocked}
                                                onClick={() => {
                                                    if (isLocked) return; // Safety check
                                                    setCurrentContentId(
                                                        content.id
                                                    );
                                                    setIsSidebarOpen(false);
                                                    window.scrollTo({
                                                        top: 0,
                                                        behavior: "smooth",
                                                    });
                                                }}
                                                className={`flex-1 text-left flex items-center gap-2 ${
                                                    isLocked
                                                        ? "cursor-not-allowed"
                                                        : "cursor-pointer"
                                                }`}
                                            >
                                                <span
                                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                                                        isCurrent
                                                            ? "bg-white/15"
                                                            : "bg-muted"
                                                    }`}
                                                >
                                                    {/* Ganti Icon jika Locked */}
                                                    {isLocked ? (
                                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                                    ) : (
                                                        getContentIcon(content)
                                                    )}
                                                </span>

                                                {!isSidebarCollapsed && (
                                                    <>
                                                        <span
                                                            className={`text-xs md:text-sm flex-1 font-medium line-clamp-1 ${
                                                                isLocked
                                                                    ? "text-muted-foreground"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {content.content_type ===
                                                                "exercise" &&
                                                            content
                                                                .interactive_exercises?.[0]
                                                                ? getContentLabel(
                                                                      content
                                                                  )
                                                                : content.title}
                                                        </span>
                                                        {content.duration_minutes &&
                                                            !isLocked && (
                                                                <span
                                                                    className={`text-[10px] md:text-xs ${
                                                                        isCurrent
                                                                            ? "opacity-90"
                                                                            : "text-muted-foreground"
                                                                    }`}
                                                                >
                                                                    {
                                                                        content.duration_minutes
                                                                    }
                                                                    m
                                                                </span>
                                                            )}
                                                    </>
                                                )}
                                            </button>

                                            {/* Tombol Checkmark (Sembunyikan jika Locked) */}
                                            {!isLocked && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleCompleteMutation.mutate(
                                                            {
                                                                contentId:
                                                                    content.id,
                                                                isCompleted,
                                                            }
                                                        );
                                                    }}
                                                    className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                                                        isCurrent
                                                            ? "hover:bg-white/10"
                                                            : "hover:bg-muted"
                                                    }`}
                                                    aria-label={
                                                        isCompleted
                                                            ? "Mark as incomplete"
                                                            : "Mark as complete"
                                                    }
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                            )}
                                        </motion.div>
                                    );
                                })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Progress Ring (unchanged visuals)
    const Ring = ({ value = 0 }: { value: number }) => {
        const clamped = Math.min(100, Math.max(0, value));
        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (clamped / 100) * circumference;

        return (
            <svg className="h-10 w-10" viewBox="0 0 48 48">
                <circle
                    cx="24"
                    cy="24"
                    r={radius}
                    className="stroke-muted"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.4}
                />
                <motion.circle
                    cx="24"
                    cy="24"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ type: "spring", stiffness: 80, damping: 20 }}
                    style={{ strokeDasharray: circumference }}
                    className="text-primary"
                />
                <text
                    x="50%"
                    y="50%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-foreground"
                >
                    {Math.round(clamped)}%
                </text>
            </svg>
        );
    };

    // ====== Layout ======
    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Sticky Header */}
            <div className="border-b px-3 md:px-5 pt-[calc(env(safe-area-inset-top)+10px)] pb-3 md:py-3 flex items-center justify-between sticky top-0 bg-background/70 backdrop-blur-md z-40">
                <div className="flex items-center gap-2 md:gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hidden md:inline-flex rounded-xl"
                        onClick={() =>
                            navigate(`/arrangely-music-lab/${lesson?.slug}`)
                        }
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Exit
                    </Button>

                    {/* Mobile-only: open drawer */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl md:hidden"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-4 w-4 mr-2" />
                        Curriculum
                    </Button>

                    {/* Desktop: collapse/expand sidebar */}
                    <div className="hidden md:flex">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setIsSidebarCollapsed((s) => !s)}
                            title={
                                isSidebarCollapsed
                                    ? "Expand curriculum"
                                    : "Collapse curriculum"
                            }
                        >
                            {isSidebarCollapsed ? (
                                <PanelLeftOpen className="h-4 w-4 mr-2" />
                            ) : (
                                <PanelLeftClose className="h-4 w-4 mr-2" />
                            )}
                            {isSidebarCollapsed ? "Expand" : "Collapse"}
                        </Button>
                    </div>

                    <h1 className="font-bold text-sm md:text-base line-clamp-1 px-2 py-1 rounded-lg bg-muted/60">
                        {lesson?.title}
                    </h1>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    <div className="hidden sm:flex flex-col items-end pr-1">
                        <span className="text-[11px] md:text-xs text-muted-foreground">
                            {completedCount} / {totalCount} completed
                        </span>
                        <motion.div layout className="w-28">
                            <Progress value={progressPercentage} />
                        </motion.div>
                    </div>
                    <Ring value={progressPercentage} />
                </div>
            </div>

            {/* Main Content with Persistent Desktop Sidebar */}
            <div className="flex-1 flex">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden md:flex border-r bg-background/70 backdrop-blur-sm transition-all duration-200 ease-out ${
                        isSidebarCollapsed ? "w-20" : "w-80"
                    }`}
                >
                    <div className="flex-1 flex flex-col">
                        {/* Sidebar Header (desktop) */}
                        <div className="px-3 py-3 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
                                    {totalCount}
                                </span>
                                {!isSidebarCollapsed && (
                                    <div>
                                        <div className="text-sm font-semibold">
                                            Curriculum
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Track your music lab & progress
                                        </div>
                                    </div>
                                )}
                            </div>
                            {!isSidebarCollapsed && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl"
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    title="Collapse"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            )}
                        </div>

                        {/* Sidebar List */}
                        <div className="flex-1 overflow-y-auto">
                            <SidebarList compact={isSidebarCollapsed} />
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {currentContent ? (
                            <motion.main
                                key={currentContent.id}
                                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.995 }}
                                transition={{ duration: 0.2 }}
                                className="p-4 sm:p-6 md:p-8 max-w-6xl"
                            >
                                <div className="mb-5 md:mb-7">
                                    <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
                                        {currentContent.title}
                                    </h2>
                                    {currentContent.description && (
                                        <p className="text-sm md:text-base text-muted-foreground">
                                            {currentContent.description}
                                        </p>
                                    )}
                                </div>

                                {/* Recording Available Badge */}
                                {currentContent.content_type === "video" &&
                                    currentContent.enable_camera_recording && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-2"
                                        >
                                            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-xs md:text-sm font-medium text-primary">
                                                📹 Recording Available -
                                                Practice and submit your
                                                performance
                                            </span>
                                        </motion.div>
                                    )}

                                {/* Video Content with Security */}
                                {currentContent.content_type === "video" &&
                                    (currentContent.video_url ||
                                        currentContent.content_url) && (
                                        <>
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mb-4 md:mb-6"
                                            >
                                                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted shadow-sm">
                                                    <SecureVideoPlayer
                                                        videoUrl={
                                                            currentContent.video_url ||
                                                            currentContent.content_url
                                                        }
                                                        contentId={
                                                            currentContent.id
                                                        }
                                                        lessonId={lessonId!}
                                                        userEmail={
                                                            currentUser?.email
                                                        }
                                                        userName={
                                                            profile?.display_name
                                                        }
                                                        onVideoEnd={() => {
                                                            const isAlreadyCompleted =
                                                                progress?.some(
                                                                    (p) =>
                                                                        p.content_id ===
                                                                            currentContent.id &&
                                                                        p.completed
                                                                );
                                                            if (
                                                                !isAlreadyCompleted
                                                            ) {
                                                                markCompleteMutation.mutate(
                                                                    currentContent.id
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </motion.div>

                                            {currentUser && (
                                                <PerformanceRecorder
                                                    contentId={
                                                        currentContent.id
                                                    }
                                                    lessonId={lessonId!}
                                                    userId={currentUser.id}
                                                    enabled={
                                                        currentContent.enable_camera_recording ||
                                                        false
                                                    }
                                                />
                                            )}
                                        </>
                                    )}

                                {/* Text Content */}
                                {currentContent.content_type === "text" &&
                                    currentContent.content_data && (
                                        <Card className="mb-6 rounded-2xl">
                                            <CardContent className="p-4 md:p-6">
                                                <div
                                                    className="prose max-w-none prose-sm md:prose-base"
                                                    dangerouslySetInnerHTML={{
                                                        __html:
                                                            currentContent
                                                                .content_data
                                                                .text || "",
                                                    }}
                                                />
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Sheet Music Content */}
                                {currentContent.content_type ===
                                    "sheet_music" &&
                                    currentContent.content_url && (
                                        <div className="mb-6">
                                            <ProtectedSheetMusic
                                                fileUrl={
                                                    currentContent.content_url
                                                }
                                                userEmail={currentUser?.email}
                                                userName={
                                                    currentUser?.user_metadata
                                                        ?.display_name
                                                }
                                                pageCount={
                                                    currentContent.content_data
                                                        ?.page_count || 1
                                                }
                                            />
                                        </div>
                                    )}

                                {/* Resource/Document Content */}
                                {currentContent.content_type === "resource" &&
                                    currentContent.resource_url && (
                                        <Card className="mb-6 rounded-2xl">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <FileText className="h-6 w-6 text-primary" />
                                                    <div>
                                                        <h3 className="font-semibold">
                                                            Resource Document
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            Secure content with
                                                            user watermarking
                                                        </p>
                                                    </div>
                                                </div>
                                                {currentContent.resource_url
                                                    .toLowerCase()
                                                    .endsWith(".pdf") ? (
                                                    <SecurePdfViewer
                                                        pdfUrl={
                                                            currentContent.resource_url
                                                        }
                                                        contentId={
                                                            currentContent.id
                                                        }
                                                        lessonId={lessonId!}
                                                        userEmail={
                                                            currentUser?.email
                                                        }
                                                        userName={
                                                            profile?.display_name
                                                        }
                                                        onScrollToBottom={() => {
                                                            const isAlreadyCompleted =
                                                                progress?.some(
                                                                    (p) =>
                                                                        p.content_id ===
                                                                            currentContent.id &&
                                                                        p.completed
                                                                );
                                                            if (
                                                                !isAlreadyCompleted
                                                            ) {
                                                                markCompleteMutation.mutate(
                                                                    currentContent.id
                                                                );
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="border rounded-2xl p-4 bg-muted/30">
                                                        <div className="text-center py-8">
                                                            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                                                            <p className="text-sm text-muted-foreground mb-4">
                                                                This resource
                                                                cannot be
                                                                previewed in the
                                                                browser
                                                            </p>
                                                            <Button
                                                                variant="outline"
                                                                className="rounded-xl"
                                                                onClick={() =>
                                                                    window.open(
                                                                        currentContent.resource_url,
                                                                        "_blank"
                                                                    )
                                                                }
                                                            >
                                                                Download
                                                                Resource
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                {/* Interactive Exercises */}
                                {currentContent.content_type === "exercise" &&
                                    exerciseData && (
                                        <div className="mb-6 space-y-4">
                                            {exerciseData.exercise_type ===
                                                "chord_chart" && (
                                                <InteractiveChordChart
                                                    exerciseId={
                                                        currentContent.id
                                                    }
                                                    chords={
                                                        exerciseData
                                                            .exercise_data
                                                            .chords || []
                                                    }
                                                    tempo={
                                                        exerciseData
                                                            .exercise_data
                                                            .tempo || 120
                                                    }
                                                    difficulty={
                                                        exerciseData.difficulty ||
                                                        1
                                                    }
                                                />
                                            )}

                                            {exerciseData.exercise_type ===
                                                "rhythm_trainer" && (
                                                <RhythmTrainer
                                                    exerciseId={
                                                        currentContent.id
                                                    }
                                                    tempo={
                                                        exerciseData
                                                            .exercise_data
                                                            .tempo || 120
                                                    }
                                                    timeSignature={
                                                        exerciseData
                                                            .exercise_data
                                                            .time_signature ||
                                                        "4/4"
                                                    }
                                                    pattern={
                                                        exerciseData
                                                            .exercise_data
                                                            .pattern || [
                                                            1, 0, 1, 0, 1, 0, 1,
                                                            0,
                                                        ]
                                                    }
                                                    measures={
                                                        exerciseData
                                                            .exercise_data
                                                            .measures || 4
                                                    }
                                                    difficulty={
                                                        exerciseData.difficulty ||
                                                        1
                                                    }
                                                />
                                            )}

                                            {exerciseData.exercise_type ===
                                                "quiz" && (
                                                <QuizExercise
                                                    questions={(
                                                        exerciseData
                                                            .exercise_data
                                                            .questions || []
                                                    ).map((q: any) => ({
                                                        ...q,
                                                        correct_answer:
                                                            typeof q.correct_answer ===
                                                            "string"
                                                                ? q.options.indexOf(
                                                                      q.correct_answer
                                                                  )
                                                                : q.correct_answer,
                                                    }))}
                                                    initialAnswers={
                                                        progress?.find(
                                                            (p) =>
                                                                p.content_id ===
                                                                currentContent.id
                                                        )?.quiz_answers ||
                                                        undefined
                                                    }
                                                    initialScore={
                                                        progress?.find(
                                                            (p) =>
                                                                p.content_id ===
                                                                currentContent.id
                                                        )?.quiz_score ||
                                                        undefined
                                                    }
                                                    onComplete={async (
                                                        answers,
                                                        score
                                                    ) => {
                                                        if (!enrollment) return;
                                                        const { error } =
                                                            await supabase
                                                                .from(
                                                                    "lesson_progress"
                                                                )
                                                                .upsert({
                                                                    enrollment_id:
                                                                        enrollment.id,
                                                                    content_id:
                                                                        currentContent.id,
                                                                    completed:
                                                                        true,
                                                                    completion_date:
                                                                        new Date().toISOString(),
                                                                    quiz_answers:
                                                                        answers,
                                                                    quiz_score:
                                                                        score,
                                                                    quiz_total_questions:
                                                                        exerciseData
                                                                            .exercise_data
                                                                            .questions
                                                                            .length,
                                                                });
                                                        if (error) {
                                                            console.error(
                                                                "Error saving quiz progress:",
                                                                error
                                                            );
                                                            toast.error(
                                                                "Failed to save quiz progress"
                                                            );
                                                            return;
                                                        }
                                                        queryClient.invalidateQueries(
                                                            {
                                                                queryKey: [
                                                                    "lesson-progress",
                                                                ],
                                                            }
                                                        );

                                                        if (totalCount > 0) {
                                                            const isAlreadyCompleted =
                                                                progress?.some(
                                                                    (p) =>
                                                                        p.content_id ===
                                                                            currentContent.id &&
                                                                        p.completed
                                                                );
                                                            if (
                                                                !isAlreadyCompleted
                                                            ) {
                                                                const newCompletedCount =
                                                                    (completedCount ||
                                                                        0) + 1;
                                                                const newProgress =
                                                                    Math.round(
                                                                        (newCompletedCount /
                                                                            totalCount) *
                                                                            100
                                                                    );
                                                                await supabase
                                                                    .from(
                                                                        "lesson_enrollments"
                                                                    )
                                                                    .update({
                                                                        progress_percentage:
                                                                            newProgress,
                                                                    })
                                                                    .eq(
                                                                        "id",
                                                                        enrollment.id
                                                                    );
                                                                queryClient.invalidateQueries(
                                                                    {
                                                                        queryKey:
                                                                            [
                                                                                "enrollment",
                                                                            ],
                                                                    }
                                                                );
                                                            }
                                                        }
                                                        toast.success(
                                                            "Quiz submitted successfully!"
                                                        );
                                                    }}
                                                />
                                            )}

                                            {exerciseData.exercise_type ===
                                                "performance_task" && (
                                                <div className="space-y-4">
                                                    <Card className="rounded-2xl">
                                                        <CardContent className="p-6">
                                                            <h3 className="text-xl font-semibold mb-4">
                                                                Performance Task
                                                            </h3>
                                                            <div className="prose max-w-none mb-6">
                                                                <p className="text-muted-foreground">
                                                                    {
                                                                        exerciseData
                                                                            .exercise_data
                                                                            .task_description
                                                                    }
                                                                </p>
                                                            </div>
                                                            {exerciseData
                                                                .exercise_data
                                                                .requirements
                                                                ?.length >
                                                                0 && (
                                                                <div className="mb-6">
                                                                    <h4 className="font-medium mb-2">
                                                                        Requirements:
                                                                    </h4>
                                                                    <ul className="list-disc list-inside space-y-1">
                                                                        {exerciseData.exercise_data.requirements.map(
                                                                            (
                                                                                req: string,
                                                                                idx: number
                                                                            ) => (
                                                                                <li
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="text-sm"
                                                                                >
                                                                                    {
                                                                                        req
                                                                                    }
                                                                                </li>
                                                                            )
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {exerciseData
                                                                .exercise_data
                                                                .rubric_items
                                                                ?.length >
                                                                0 && (
                                                                <div className="mb-6">
                                                                    <h4 className="font-medium mb-2">
                                                                        Grading
                                                                        Rubric:
                                                                    </h4>
                                                                    <div className="space-y-2">
                                                                        {exerciseData.exercise_data.rubric_items.map(
                                                                            (
                                                                                item: any,
                                                                                idx: number
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="p-3 bg-muted rounded-xl"
                                                                                >
                                                                                    <div className="flex justify-between items-start">
                                                                                        <span className="font-medium text-sm">
                                                                                            {
                                                                                                item.criteria
                                                                                            }
                                                                                        </span>
                                                                                        <span className="text-sm text-muted-foreground">
                                                                                            {
                                                                                                item.points
                                                                                            }{" "}
                                                                                            pts
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {currentUser && (
                                                                <div className="mt-6">
                                                                    <h4 className="font-medium mb-3">
                                                                        Submit
                                                                        Your
                                                                        Performance
                                                                    </h4>
                                                                    <PerformanceRecorder
                                                                        contentId={
                                                                            currentContent.id
                                                                        }
                                                                        lessonId={
                                                                            lessonId!
                                                                        }
                                                                        userId={
                                                                            currentUser.id
                                                                        }
                                                                        enabled={
                                                                            true
                                                                        }
                                                                        enrollmentId={
                                                                            enrollment?.id
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {performanceReviews[
                                                        currentContent.id
                                                    ] && (
                                                        <Card className="bg-primary/5 border-primary/20 rounded-2xl">
                                                            <CardContent className="p-6">
                                                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                                                    Instructor
                                                                    Feedback
                                                                </h3>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">
                                                                            Status:
                                                                        </span>
                                                                        <span className="font-medium capitalize">
                                                                            {
                                                                                performanceReviews[
                                                                                    currentContent
                                                                                        .id
                                                                                ]
                                                                                    .status
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    {performanceReviews[
                                                                        currentContent
                                                                            .id
                                                                    ].score !==
                                                                        null && (
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">
                                                                                Score:
                                                                            </span>
                                                                            <span className="font-medium text-lg">
                                                                                {
                                                                                    performanceReviews[
                                                                                        currentContent
                                                                                            .id
                                                                                    ]
                                                                                        .score
                                                                                }
                                                                                /100
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {performanceReviews[
                                                                        currentContent
                                                                            .id
                                                                    ]
                                                                        .creator_notes && (
                                                                        <div>
                                                                            <span className="text-sm text-muted-foreground block mb-2">
                                                                                Comments:
                                                                            </span>
                                                                            <div className="bg-background/50 p-4 rounded-xl">
                                                                                <p className="text-sm whitespace-pre-wrap">
                                                                                    {
                                                                                        performanceReviews[
                                                                                            currentContent
                                                                                                .id
                                                                                        ]
                                                                                            .creator_notes
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {performanceReviews[
                                                                        currentContent
                                                                            .id
                                                                    ]
                                                                        .reviewed_at && (
                                                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                                                            Reviewed
                                                                            on{" "}
                                                                            {new Date(
                                                                                performanceReviews[
                                                                                    currentContent.id
                                                                                ].reviewed_at
                                                                            ).toLocaleDateString(
                                                                                "en-US",
                                                                                {
                                                                                    year: "numeric",
                                                                                    month: "long",
                                                                                    day: "numeric",
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {!performanceReviews[
                                                        currentContent.id
                                                    ] &&
                                                        performanceRecordings?.some(
                                                            (r) =>
                                                                r.content_id ===
                                                                    currentContent.id &&
                                                                r.status ===
                                                                    "pending"
                                                        ) && (
                                                            <Card className="bg-yellow-500/5 border-yellow-500/20 rounded-2xl">
                                                                <CardContent className="p-6">
                                                                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                                                        <PlayCircle className="w-5 h-5 text-yellow-600" />
                                                                        Submission
                                                                        Received
                                                                    </h3>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Your
                                                                        performance
                                                                        has been
                                                                        submitted
                                                                        and is
                                                                        awaiting
                                                                        review
                                                                        from
                                                                        your
                                                                        instructor.
                                                                    </p>
                                                                </CardContent>
                                                            </Card>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                {/* Notes Section */}
                                <Card className="mb-6 rounded-2xl">
                                    <CardContent className="p-4 md:p-6">
                                        <div className="flex items-center justify-between mb-3 md:mb-4">
                                            <h3 className="font-semibold flex items-center gap-2 text-sm md:text-base">
                                                <BookOpen className="h-5 w-5" />
                                                My Notes
                                            </h3>
                                            <Button
                                                size="sm"
                                                className="rounded-xl"
                                                onClick={() =>
                                                    saveNotesMutation.mutate()
                                                }
                                                disabled={
                                                    saveNotesMutation.isPending
                                                }
                                            >
                                                {saveNotesMutation.isPending
                                                    ? "Saving..."
                                                    : "Save Notes"}
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={notes}
                                            onChange={(e) =>
                                                setNotes(e.target.value)
                                            }
                                            placeholder="Take notes about this music lab..."
                                            rows={5}
                                            className="rounded-xl"
                                        />
                                    </CardContent>
                                </Card>

                                {/* Mark Complete Button (non-video & non-quiz) */}
                                {!progress?.some(
                                    (p) =>
                                        p.content_id === currentContent.id &&
                                        p.completed
                                ) &&
                                    currentContent.content_type !== "video" &&
                                    !(
                                        currentContent.content_type ===
                                            "exercise" &&
                                        exerciseData?.exercise_type === "quiz"
                                    ) && (
                                        <motion.div
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.995 }}
                                        >
                                            <Button
                                                className="w-full rounded-2xl"
                                                size="lg"
                                                onClick={() =>
                                                    markCompleteMutation.mutate(
                                                        currentContent.id
                                                    )
                                                }
                                                disabled={
                                                    markCompleteMutation.isPending
                                                }
                                            >
                                                {markCompleteMutation.isPending
                                                    ? "Saving..."
                                                    : "Mark as Complete"}
                                                <ChevronRight className="ml-2 h-5 w-5" />
                                            </Button>
                                        </motion.div>
                                    )}
                            </motion.main>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center justify-center h-full p-6"
                            >
                                <p className="text-muted-foreground text-sm md:text-base">
                                    Select a music lab to start learning
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Mobile Drawer for Curriculum */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-50 md:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                        />
                        <motion.div
                            className="fixed left-0 top-0 w-[85%] sm:w-[70%] h-full z-50 rounded-none md:hidden bg-background border-r shadow-2xl flex flex-col overflow-hidden"
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 24, scale: 0.98 }}
                            transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 16,
                            }}
                        >
                            <div className="px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 border-b flex items-center justify-between bg-primary/5">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold">
                                        {Math.max(
                                            1,
                                            Math.floor(progressPercentage / 10)
                                        )}
                                    </span>
                                    <div>
                                        <div className="text-sm font-semibold">
                                            Curriculum
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Track your path and jump between
                                            music lab
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl"
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                                <SidebarList />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Next Up Floating Pill */}
            {!allCompleted && currentContentId && (
                <AnimatePresence>
                    {(() => {
                        const flatContents = filteredModules.flatMap((m: any) =>
                            m.lesson_content.sort(
                                (a: any, b: any) =>
                                    a.order_index - b.order_index
                            )
                        );
                        const currentIndex = flatContents.findIndex(
                            (c: any) => c.id === currentContentId
                        );
                        const nextContent = flatContents[currentIndex + 1];
                        if (!nextContent) return null;
                        const isCurrentCompleted = progress?.some(
                            (p) =>
                                p.content_id === currentContentId && p.completed
                        );
                        if (!isCurrentCompleted) return null;

                        return (
                            <motion.div
                                key="next-up-pill"
                                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 40, scale: 0.9 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 120,
                                    damping: 12,
                                }}
                                className="fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] right-6 z-40"
                            >
                                <motion.button
                                    onClick={() => {
                                        setCurrentContentId(nextContent.id);
                                        window.scrollTo({
                                            top: 0,
                                            behavior: "smooth",
                                        });
                                    }}
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="flex items-center gap-3 bg-primary text-primary-foreground rounded-full shadow-lg px-5 py-3 md:px-6 md:py-3 font-medium text-sm md:text-base hover:shadow-primary/30 transition-all"
                                >
                                    <div className="flex flex-col text-left">
                                        <span className="text-xs opacity-90">
                                            Next up
                                        </span>
                                        <span className="truncate max-w-[120px] md:max-w-[200px]">
                                            {nextContent.title}
                                        </span>
                                    </div>
                                    <ChevronRight className="h-5 w-5" />
                                </motion.button>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>
            )}

            {/* Success Dialog */}
            <Dialog
                open={showSuccessDialog}
                onOpenChange={setShowSuccessDialog}
            >
                <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
                    {/* Confetti Canvas (optional) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="pointer-events-none absolute inset-0 z-10"
                    >
                        {/* OPTIONAL: Add react-confetti here */}
                    </motion.div>

                    {/* Header Celebration */}
                    <div className="relative bg-gradient-to-b from-primary to-primary/40 p-8 text-center text-primary-foreground">
                        <motion.h2
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-3xl font-extrabold mt-4 drop-shadow-sm"
                        >
                            🎉 You're Amazing!
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-sm opacity-90 mt-1"
                        >
                            You completed "
                            <span className="font-semibold">
                                {lesson?.title}
                            </span>
                            "
                        </motion.p>

                        {/* XP Badge */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.35, type: "spring" }}
                            className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md 
                    px-5 py-2 rounded-full border border-white/30 shadow-lg"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-semibold tracking-wide">
                                {completedCount}/{totalCount} Completed
                            </span>
                        </motion.div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {/* Continue Learning Section */}
                        {relatedLessons?.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-foreground/80">
                                    Continue Learning
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {relatedLessons.map((item: any) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <Card
                                                className="rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 
                              transition-all cursor-pointer"
                                                onClick={() => {
                                                    setShowSuccessDialog(false);
                                                    navigate(
                                                        `/arrangely-music-lab/${item.slug}`
                                                    );
                                                }}
                                            >
                                                <div className="aspect-video bg-muted relative">
                                                    <img
                                                        src={
                                                            item.cover_image_url ||
                                                            "/images/lesson-placeholder.png"
                                                        }
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/10" />
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-sm font-semibold line-clamp-2">
                                                        {item.title}
                                                    </p>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="space-y-3">
                            {!existingReview && (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <Button
                                        onClick={() => {
                                            setShowSuccessDialog(false);
                                            setShowReviewDialog(true);
                                        }}
                                        className="w-full rounded-xl py-5 text-base font-semibold
                          bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
                                    >
                                        <Star className="h-5 w-5 mr-2" />
                                        Rate this Lesson
                                    </Button>
                                </motion.div>
                            )}

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Button
                                    onClick={handleGetCertificate}
                                    className="w-full rounded-xl py-5 text-base font-semibold"
                                >
                                    <Award className="h-5 w-5 mr-2" />
                                    Download Certificate
                                </Button>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <Button
                                    variant="outline"
                                    onClick={() => setShowSuccessDialog(false)}
                                    className="w-full rounded-xl py-5 text-base font-semibold"
                                >
                                    Review Music Lab
                                </Button>
                            </motion.div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Review Dialog */}
            {lesson && currentUser && (
                <LessonReviewDialog
                    open={showReviewDialog}
                    onOpenChange={setShowReviewDialog}
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    userId={currentUser.id}
                    onSubmitSuccess={() => {
                        toast.success(
                            "Review submitted! Thank you for your feedback."
                        );
                    }}
                />
            )}
        </div>
    );
}
