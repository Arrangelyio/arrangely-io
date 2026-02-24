import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useParams } from "react-router-dom"; // Tambahkan useParams jika diperlukan, atau hapus jika tidak
import { TierAssessmentModal } from "@/components/lessons/tier-assessment/TierAssessmentModal";
import { FloatingTestButton } from "@/components/lessons/tier-assessment/FloatingTestButton";
import { CreatorProfileCarousel } from "@/components/lessons/CreatorProfileCarousel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    BookOpen,
    Clock,
    Star,
    User,
    Sparkles,
    TrendingUp,
    Award,
    Play,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    ChevronDown,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Lessons() {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState("");
    const [category, setCategory] = useState<string>("all");
    const [difficulty, setDifficulty] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [showAssessment, setShowAssessment] = useState(false);
    const [displayCount, setDisplayCount] = useState(12); // Initial display limit
    const [instrumentType, setInstrumentType] = useState<string>("all");

    // Check if user needs tier assessment
    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

            return data;
        },
    });

    useEffect(() => {
        if (profile && !profile.tier_assessment_completed) {
            setShowAssessment(true);
        }
    }, [profile]);

    const categories = [
        { value: "all", label: "All Categories", icon: Sparkles },
        { value: "instrument", label: "Instrument", icon: BookOpen },
        { value: "theory", label: "Theory", icon: BookOpen },
        { value: "production", label: "Production", icon: BookOpen },
        // { value: "worship_leading", label: "Worship Leading", icon: BookOpen },
        { value: "songwriting", label: "Songwriting", icon: BookOpen },
    ];

    const difficulties = [
        { value: "all", label: "All Levels" },
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
        { value: "master", label: "Master" },
    ];

    // Fetch section visibility settings
    const { data: sectionSettings } = useQuery({
        queryKey: ["lesson-section-settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_section_settings")
                .select("*")
                .eq("is_visible", true);

            if (error) throw error;
            return data || [];
        },
    });

    // Fetch featured lessons
    const { data: featuredLessonIds } = useQuery({
        queryKey: ["featured-lessons"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("featured_lessons")
                .select("lesson_id, section_key")
                .order("display_order");

            if (error) throw error;
            return data || [];
        },
    });

    // Fetch platform statistics
    const { data: stats } = useQuery({
        queryKey: ["platform-stats"],
        queryFn: async () => {
            // Get total published lessons count
            const { count: totalLessons } = await supabase
                .from("lessons")
                .select("*", { count: "exact", head: true })
                .eq("status", "published")
                .eq("is_production", true)
                .eq("is_unlisted", false);

            // Get unique instructors count (creators who have published lessons)
            const { data: instructors } = await supabase
                .from("lessons")
                .select("creator_id")
                .eq("status", "published")
                .eq("is_production", true);

            const uniqueInstructors = new Set(
                instructors?.map((l) => l.creator_id),
            ).size;

            // Get average rating across all published lessons
            const { data: ratings } = await supabase
                .from("lessons")
                .select("average_rating")
                .eq("status", "published")
                .eq("is_production", true)
                .not("average_rating", "is", null);

            const avgRating =
                ratings && ratings.length > 0
                    ? ratings.reduce(
                          (sum, l) => sum + (l.average_rating || 0),
                          0,
                      ) / ratings.length
                    : 0;

            return {
                totalLessons: totalLessons || 0,
                totalInstructors: uniqueInstructors || 0,
                averageRating: avgRating || 0,
            };
        },
    });

    const { data: lessons, isLoading } = useQuery({
        queryKey: ["lessons", category, difficulty, sortBy, instrumentType],
        queryFn: async () => {
            // UBAH: Select juga module dan content untuk menghitung durasi secara real-time
            let query = supabase
                .from("lessons_with_duration") // Gunakan nama View yang dibuat di SQL
                .select("*, lesson_reviews(count)") // Select * sudah cukup karena view sudah punya kolom total_duration
                .eq("status", "published")
                .eq("is_production", true)
                .eq("is_unlisted", false);

            if (category !== "all") {
                query = query.eq("category", category);
            }
            //   if (category === "instrument" && instrumentType !== "all") {
            //     // Gunakan .ilike agar pencarian tidak sensitif huruf besar/kecil
            //     query = query.ilike("instrument_type", instrumentType);
            //   }
            if (difficulty !== "all") {
                query = query.eq("difficulty_level", difficulty);
            }

            switch (sortBy) {
                case "popular":
                    query = query.order("total_enrollments", {
                        ascending: false,
                    });
                    break;
                case "rated":
                    query = query.order("average_rating", { ascending: false });
                    break;
                default:
                    query = query.order("created_at", { ascending: false });
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });

    const { data: instrumentLessons, isLoading: isInstrumentLoading } =
        useQuery({
            queryKey: [
                "lessons-by-instrument",
                instrumentType,
                difficulty,
                sortBy,
            ],
            enabled: category === "instrument" && instrumentType !== "all",
            queryFn: async () => {
                let query = supabase
                    .from("lessons") // <--- LANGSUNG KE TABEL, BUKAN VIEW
                    .select(
                        `
        *,
        profiles:creator_id (display_name, avatar_url),
        lesson_reviews(count),
        lesson_modules (
          lesson_content (duration_minutes)
        )
      `,
                    )
                    .ilike("instrument_type", instrumentType) //
                    .eq("status", "published")
                    .eq("is_production", true);

                if (difficulty !== "all") {
                    query = query.eq("difficulty_level", difficulty);
                }

                // Sorting tetap sama
                const { data, error } = await query.order("created_at", {
                    ascending: false,
                });
                if (error) throw error;
                return data;
            },
        });

    // 1. Tentukan data mana yang aktif
    const isSubInstrumentActive =
        category === "instrument" && instrumentType !== "all";

    // 2. Pilih data source (Gunakan data instrumen jika filter aktif, jika tidak gunakan data utama)
    const activeLessonsData = isSubInstrumentActive
        ? instrumentLessons
        : lessons;

    // 3. Gabungkan loading state
    const isActuallyLoading =
        isLoading || (isSubInstrumentActive && isInstrumentLoading);

    // 4. Update Filtered Lessons menggunakan data yang aktif
    const filteredLessons = activeLessonsData?.filter(
        (lesson) =>
            lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lesson.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()),
    );

    // Get top lessons for carousel
    const topLessons = filteredLessons?.slice(0, 8) || [];

    // Pagination logic
    const displayedLessons = filteredLessons?.slice(0, displayCount);
    const hasMore = (filteredLessons?.length || 0) > displayCount;
    const remainingCount = (filteredLessons?.length || 0) - displayCount;

    const handleLoadMore = () => {
        setDisplayCount((prev) => prev + 12);
    };

    const handleViewAll = () => {
        setDisplayCount(filteredLessons?.length || 0);
    };

    useEffect(() => {
        if (category !== "instrument") {
            setInstrumentType("all");
        }
    }, [category]);

    // Reset display count when filters change
    useEffect(() => {
        setDisplayCount(12);
    }, [category, difficulty, sortBy, searchTerm]);

    const scrollCarousel = (direction: "left" | "right") => {
        if (direction === "left") {
            setCarouselIndex(Math.max(0, carouselIndex - 1));
        } else {
            setCarouselIndex(
                Math.min(topLessons.length - 4, carouselIndex + 1),
            );
        }
    };

    const handleAssessmentClose = async () => {
        setShowAssessment(false);
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from("profiles")
                .update({ tier_assessment_completed: true })
                .eq("user_id", user.id);
        }
    };

    // --- UBAH: Logika perhitungan disamakan dengan LessonDetail.tsx ---
    const calculateTotalDuration = (lesson: any) => {
        const modules = lesson.lesson_modules || [];
        return modules.reduce(
            (acc: number, module: any) =>
                acc +
                (module.lesson_content?.reduce(
                    (sum: number, content: any) =>
                        sum + (content.duration_minutes || 0),
                    0,
                ) || 0),
            0,
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pt-[calc(4rem+env(safe-area-inset-top))] md:pt-5">
            <TierAssessmentModal
                open={showAssessment}
                onClose={handleAssessmentClose}
            />
            {/* Search Bar - Top of Page */}
            <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] pt-5 lg:pt-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
                <div className="container mx-auto px-4 py-4 max-w-7xl">
                    <div className="flex items-center gap-3 max-w-4xl mx-auto">
                        <div className="relative flex-1 max-w-2xl">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder={t("lesson.search")}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-12 text-base border-2 focus-visible:ring-2"
                            />
                        </div>
                        <Link to="/my-progress">
                            <Button
                                className="
                  h-12 gap-2 whitespace-nowrap
                  bg-gradient-to-r from-[#0A1D4D] via-[#1E3A8A] to-[#0B58CA]
                  hover:from-[#0B58CA] hover:via-[#1D4ED8] hover:to-[#2563EB]
                  text-white font-semibold
                  shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-400/30
                  transition-all duration-500 hover:scale-105
                  relative overflow-hidden
                  before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                  before:translate-x-[-200%] hover:before:translate-x-[200%]
                  before:transition-transform before:duration-1000
                  rounded-xl
                "
                            >
                                <BarChart3 className="h-5 w-5 text-white" />
                                {/* My Progress */}
                                {t("lesson.myProgress")}
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Hero Section - Only show when not searching */}

            {!searchTerm && (
                <>
                    {sectionSettings?.some(
                        (s) => s.section_key === "master_musical_journey",
                    ) && (
                        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />

                            <div className="container mx-auto px-4 py-8 md:py-12 relative">
                                <div className="grid md:grid-cols-2 gap-8 items-center">
                                    {/* Left: Content */}
                                    <div className="space-y-6">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium text-primary">
                                                {/* 10,000+ Active Learners */}
                                                {t("lesson.active")}
                                            </span>
                                        </div>

                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                            {/* Master Your */}
                                            {t("lesson.title")}
                                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                                                {/* Musical Journey */}
                                                {t("lesson.title2")}
                                            </span>
                                        </h1>

                                        <p className="text-lg text-muted-foreground max-w-xl">
                                            {/* Learn from industry professionals. Over{" "} */}
                                            {t("lesson.desc")}{" "}
                                            {stats?.totalLessons || 0}
                                            {t("lesson.desc2")}
                                        </p>

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-3 gap-4 pt-4">
                                            <div className="space-y-1">
                                                <div className="text-2xl md:text-3xl font-bold text-primary">
                                                    {stats?.totalLessons || 0}+
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {/* Courses */}
                                                    {t("lesson.course")}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-2xl md:text-3xl font-bold text-primary">
                                                    {stats?.totalInstructors ||
                                                        0}
                                                    +
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {/* Instructors */}
                                                    {t("lesson.instructor")}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-2xl md:text-3xl font-bold text-primary">
                                                    {stats?.averageRating
                                                        ? stats.averageRating.toFixed(
                                                              1,
                                                          )
                                                        : "5.0"}
                                                    ★
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {/* Avg Rating */}
                                                    {t("lesson.avg")}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Featured Lessons Preview */}
                                    <div className="relative">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Top Featured Cards */}
                                            {lessons
                                                ?.filter((lesson) =>
                                                    featuredLessonIds?.some(
                                                        (f) =>
                                                            f.lesson_id ===
                                                                lesson.id &&
                                                            f.section_key ===
                                                                "master_musical_journey",
                                                    ),
                                                )
                                                ?.slice(0, 4)
                                                .map(
                                                    (
                                                        lesson: any,
                                                        idx: number,
                                                    ) => (
                                                        <Link
                                                            key={lesson.id}
                                                            to={`/arrangely-music-lab/${lesson.slug}`}
                                                            className="group relative rounded-xl overflow-hidden aspect-[4/5] hover:scale-105 transition-transform duration-300"
                                                            style={{
                                                                transform:
                                                                    idx % 2 ===
                                                                    0
                                                                        ? "translateY(0)"
                                                                        : "translateY(0rem)",
                                                            }}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                                                            {lesson.cover_image_url ? (
                                                                <img
                                                                    src={
                                                                        lesson.cover_image_url
                                                                    }
                                                                    alt={
                                                                        lesson.title
                                                                    }
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                                                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                                    <span className="text-xs font-semibold text-white">
                                                                        {lesson.average_rating?.toFixed(
                                                                            1,
                                                                        ) ||
                                                                            "5.0"}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-bold text-white line-clamp-2 group-hover:text-primary transition-colors">
                                                                    {
                                                                        lesson.title
                                                                    }
                                                                </h4>
                                                            </div>
                                                            {lesson.is_free && (
                                                                <Badge className="absolute top-2 right-2 z-20 shadow-lg">
                                                                    {/* FREE */}
                                                                    {t(
                                                                        "lesson.free",
                                                                    )}
                                                                </Badge>
                                                            )}
                                                        </Link>
                                                    ),
                                                )}
                                        </div>

                                        {/* Floating badge */}
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background border-2 border-primary/20 rounded-full px-6 py-2 shadow-xl backdrop-blur-sm">
                                            <span className="text-sm font-semibold text-primary">
                                                {stats?.totalLessons || 0}{" "}
                                                {t("lesson.more")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Featured Courses Carousel - Apple TV+ Style */}
                    {sectionSettings?.some(
                        (s) => s.section_key === "featured_courses",
                    ) && (
                        <div className="relative py-12 px-4 md:px-8 bg-background">
                            <div className="max-w-[1400px] mx-auto">
                                {/* Section Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-bold mb-2">
                                            {/* Featured Courses */}
                                            {t("lesson.featureCourse")}
                                        </h2>
                                        <p className="text-muted-foreground">
                                            {/* Handpicked lessons from top instructors */}
                                            {t("lesson.picked")}
                                        </p>
                                    </div>

                                    {/* Carousel Controls */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                                scrollCarousel("left")
                                            }
                                            disabled={carouselIndex === 0}
                                            className="rounded-full"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                                scrollCarousel("right")
                                            }
                                            disabled={
                                                carouselIndex >=
                                                topLessons.length - 4
                                            }
                                            className="rounded-full"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Carousel */}
                                <div className="relative">
                                    {/* Wrapper */}
                                    <div
                                        className={`
                      flex gap-4 transition-transform duration-500 ease-out
                      md:overflow-hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide
                      pb-2
                    `}
                                        style={{
                                            transform: `translateX(-${
                                                carouselIndex * (100 / 4)
                                            }%)`,
                                        }}
                                    >
                                        {(
                                            lessons?.filter((lesson) =>
                                                featuredLessonIds?.some(
                                                    (f) =>
                                                        f.lesson_id ===
                                                            lesson.id &&
                                                        f.section_key ===
                                                            "featured_courses",
                                                ),
                                            ) || topLessons
                                        ).map((lesson: any) => (
                                            <Link
                                                key={lesson.id}
                                                to={`/arrangely-music-lab/${lesson.slug}`}
                                                className={`
                          group flex-shrink-0
                          w-[85%] sm:w-[48%] md:w-[calc(25%-12px)]
                          snap-center
                        `}
                                            >
                                                {/* Thumbnail */}
                                                <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-3 bg-muted">
                                                    {lesson.cover_image_url ? (
                                                        <img
                                                            src={
                                                                lesson.cover_image_url
                                                            }
                                                            alt={lesson.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                                            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
                                                        </div>
                                                    )}

                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 flex items-center justify-center">
                                                                <Play className="h-4 w-4 sm:h-5 sm:w-5 text-black ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="shadow-lg backdrop-blur-sm bg-background/90"
                                                        >
                                                            {lesson.instrument_type
                                                                ? `instrument : ${lesson.instrument_type.toLowerCase()}`
                                                                : lesson.category.replace(
                                                                      "_",
                                                                      " ",
                                                                  )}
                                                        </Badge>

                                                        {lesson.is_free && (
                                                            <Badge className="shadow-lg backdrop-blur-sm bg-primary/90">
                                                                {t(
                                                                    "categories.free",
                                                                )}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Tag FREE - Tetap di Kanan Atas jika ada */}
                                                    {lesson.is_free && (
                                                        <div className="absolute top-3 right-3 z-20">
                                                            <Badge className="shadow-lg backdrop-blur-sm bg-primary/90 text-[10px] sm:text-xs">
                                                                {t(
                                                                    "categories.free",
                                                                )}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Lesson Info */}
                                                <div className="space-y-2 px-1">
                                                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 group-hover:text-primary transition-colors">
                                                        {lesson.title}
                                                    </h3>

                                                    <div className="flex items-center gap-3 text-[11px] sm:text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                                            <span>
                                                                {lesson.average_rating?.toFixed(
                                                                    1,
                                                                ) || "5.0"}
                                                            </span>
                                                        </div>
                                                        <span>•</span>
                                                        <span>
                                                            {calculateTotalDuration(
                                                                lesson,
                                                            )}{" "}
                                                            {t(
                                                                "lessonDetail.hoursVideo",
                                                            )}
                                                        </span>
                                                    </div>

                                                    {lesson.profiles && (
                                                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                                                            {
                                                                lesson.profiles
                                                                    .display_name
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Creator Profile Carousel */}
                    <CreatorProfileCarousel />
                </>
            )}

            <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
                {/* Filter Dropdowns */}
                <div className="mb-8">
                    <div
                        className="
              flex flex-wrap md:flex-nowrap gap-4 md:gap-6 items-center
              bg-gradient-to-r from-[#0A1D4D] via-[#1E3A8A] to-[#0B58CA]
              text-white font-semibold text-base
              border border-white/10 rounded-2xl p-4 sm:p-6
              shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.25)]
              transition-all duration-500
            "
                    >
                        {/* Category Dropdown */}
                        {/* Category Dropdown Menggunakan DropdownMenu untuk Sub-menu yang Mulus */}
                        <div className="flex-1 min-w-[130px] sm:min-w-[160px] md:min-w-[180px]">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="w-full h-11 justify-between rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-white transition-all font-semibold"
                                    >
                                        <span className="truncate">
                                            {category === "all"
                                                ? t("categories.allCate")
                                                : category === "instrument"
                                                ? `${t(
                                                      "categories.instrument",
                                                  )}${
                                                      instrumentType !== "all"
                                                          ? `: ${instrumentType}`
                                                          : ""
                                                  }`
                                                : t(`categories.${category}`)}
                                        </span>
                                        <ChevronDown className="h-4 w-4 opacity-70" />
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    className="w-[200px] rounded-xl shadow-lg bg-white text-gray-800"
                                    align="start"
                                >
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setCategory("all");
                                            setInstrumentType("all");
                                        }}
                                    >
                                        {t("categories.allCate")}
                                    </DropdownMenuItem>

                                    {/* Sub-menu Instrument dengan Hover Otomatis */}
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="flex items-center justify-between cursor-pointer">
                                            <span>
                                                {t("categories.instrument")}
                                            </span>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent className="rounded-xl shadow-xl bg-white min-w-[150px]">
                                                {[
                                                    "all",
                                                    "piano",
                                                    "guitar",
                                                    "bass",
                                                    "drum",
                                                ].map((type) => (
                                                    <DropdownMenuItem
                                                        key={type}
                                                        className={`capitalize ${
                                                            instrumentType ===
                                                            type
                                                                ? "bg-blue-50 text-blue-600 font-bold"
                                                                : ""
                                                        }`}
                                                        onClick={() => {
                                                            setCategory(
                                                                "instrument",
                                                            );
                                                            setInstrumentType(
                                                                type,
                                                            );
                                                        }}
                                                    >
                                                        {type === "all"
                                                            ? "All Instruments"
                                                            : type}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuItem
                                        onClick={() => setCategory("theory")}
                                    >
                                        {t("categories.theory")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setCategory("production")
                                        }
                                    >
                                        {t("categories.production")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setCategory("worship_leading")
                                        }
                                    >
                                        {t("categories.worshipLead")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            setCategory("songwriting")
                                        }
                                    >
                                        {t("categories.songWriting")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Difficulty Dropdown */}
                        <div className="flex-1 min-w-[130px] sm:min-w-[160px] md:min-w-[160px]">
                            <Select
                                value={difficulty}
                                onValueChange={setDifficulty}
                            >
                                <SelectTrigger
                                    className="
                    h-11 rounded-xl bg-white/10 text-white placeholder:text-white/70 border border-white/20
                    focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300
                    transition-all
                  "
                                >
                                    <SelectValue placeholder="All Levels" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-lg bg-white text-gray-800">
                                    <SelectItem value="all">
                                        {/* All Levels */}
                                        {t("categories.allLevels")}
                                    </SelectItem>
                                    <SelectItem value="beginner">
                                        {/* Beginner */}
                                        {t("categories.beginner")}
                                    </SelectItem>
                                    <SelectItem value="intermediate">
                                        {/* Intermediate */}
                                        {t("categories.intermediate")}
                                    </SelectItem>
                                    <SelectItem value="advanced">
                                        {/* Advanced */}
                                        {t("categories.advanced")}
                                    </SelectItem>
                                    <SelectItem value="master">
                                        {/* Master */}
                                        {t("categories.master")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex-1 min-w-[130px] sm:min-w-[160px] md:min-w-[160px]">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger
                                    className="
                    h-11 rounded-xl bg-white/10 text-white placeholder:text-white/70 border border-white/20
                    focus:ring-2 focus:ring-blue-400/50 focus:border-blue-300
                    transition-all
                  "
                                >
                                    <SelectValue placeholder="Newest" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-lg bg-white text-gray-800">
                                    <SelectItem value="newest">
                                        {/* Newest */}
                                        {t("categories.newest")}
                                    </SelectItem>
                                    <SelectItem value="popular">
                                        {/* Popular */}
                                        {t("categories.popular")}
                                    </SelectItem>
                                    <SelectItem value="rated">
                                        {/* Top Rated */}
                                        {t("categories.topRate")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Results Count */}
                        {filteredLessons && (
                            <div
                                className="
                  w-full md:w-auto text-center md:text-right
                  border-t md:border-t-0 md:border-l border-white/20
                  md:pl-6 pt-3 md:pt-0
                "
                            >
                                <p className="text-sm sm:text-base text-white/90">
                                    {t("categories.found")}{" "}
                                    <span className="font-bold text-white">
                                        {filteredLessons.length}
                                    </span>{" "}
                                    {/* lessons */}
                                    {t("categories.lesson")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lessons Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <Card
                                key={i}
                                className="h-full overflow-hidden border-2 bg-card/30 backdrop-blur rounded-2xl"
                            >
                                {/* Cover Image Placeholder */}
                                <div className="relative aspect-video w-full bg-muted rounded-t-2xl" />

                                <CardContent className="p-5 space-y-4">
                                    <div className="h-5 w-3/4 bg-muted rounded" />
                                    <div className="h-4 w-full bg-muted rounded" />
                                    <div className="h-4 w-2/3 bg-muted rounded" />
                                    <div className="flex items-center gap-2 pt-4 border-t">
                                        <div className="h-8 w-8 bg-muted rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-1/2 bg-muted rounded" />
                                            <div className="h-3 w-1/3 bg-muted rounded" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : filteredLessons && filteredLessons.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayedLessons?.map((lesson: any) => (
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
                                            {/* Ganti blok 'Overlay badges' lama dengan ini */}
                                            <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-20">
                                                {/* Tag Instrument */}
                                                <Badge
                                                    variant="secondary"
                                                    className="shadow-lg backdrop-blur-sm bg-background/90 text-[10px] sm:text-xs"
                                                >
                                                    {lesson.instrument_type
                                                        ? ` ${lesson.instrument_type.toLowerCase()}`
                                                        : lesson.category.replace(
                                                              "_",
                                                              " ",
                                                          )}
                                                </Badge>

                                                {/* Tag Level (Beginner) - Dipindah ke sini */}
                                                <Badge
                                                    variant="outline"
                                                    className="capitalize shadow-lg backdrop-blur-sm bg-background/90 text-[10px] sm:text-xs"
                                                >
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
                                                    {lesson.average_rating?.toFixed(
                                                        1,
                                                    ) || "5.0"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    (
                                                    {lesson.lesson_reviews?.[0]
                                                        ?.count || 0}{" "}
                                                    reviews)
                                                </span>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="font-medium">
                                                        {/* UBAH: Menggunakan helper function yang baru */}
                                                        {lesson.total_duration ||
                                                            0}{" "}
                                                        min
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <BookOpen className="h-4 w-4" />
                                                    <span className="font-medium">
                                                        {/* UBAH: Gunakan count materi, bukan enrollment */}
                                                        {lesson.total_lessons_count ||
                                                            0}{" "}
                                                        lessons
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Creator */}
                                            <div className="flex items-center gap-3 pt-4 border-t">
                                                <div className="relative">
                                                    {/* {lesson.profiles?.avatar_url ? (
                            <img
                              src={lesson.profiles.avatar_url}
                              alt={lesson.profiles.display_name}
                              className="h-8 w-8 rounded-full ring-2 ring-muted"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-muted">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )} */}
                                                </div>

                                                <div className="relative">
                                                    {/* Gunakan instructor_avatar dari View */}
                                                    {lesson.instructor_avatar ? (
                                                        <img
                                                            src={
                                                                lesson.instructor_avatar
                                                            }
                                                            alt={
                                                                lesson.instructor_name
                                                            }
                                                            className="h-8 w-8 rounded-full ring-2 ring-muted object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-muted">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t(
                                                            "categories.instructor",
                                                        )}
                                                    </p>
                                                    {/* Gunakan instructor_name dari View */}
                                                    <p className="text-sm font-semibold truncate">
                                                        {/* Menggunakan data dari View (instructor_name) atau Tabel (profiles.display_name) */}
                                                        {lesson.instructor_name ||
                                                            lesson.profiles
                                                                ?.display_name ||
                                                            lesson.instructor_avatar ||
                                                            "Unknown Instructor"}
                                                    </p>
                                                </div>

                                                {/* Price/CTA */}
                                                <div className="flex flex-col items-end gap-1">
                                                    {lesson.is_free ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="font-semibold"
                                                        >
                                                            {/* Free */}
                                                            {t(
                                                                "categories.free",
                                                            )}
                                                        </Badge>
                                                    ) : (
                                                        <>
                                                            {lesson.original_price &&
                                                                lesson.original_price >
                                                                    lesson.price && (
                                                                    <span className="text-xs text-muted-foreground line-through">
                                                                        Rp
                                                                        {Number(
                                                                            lesson.original_price,
                                                                        ).toLocaleString(
                                                                            "id-ID",
                                                                        )}
                                                                    </span>
                                                                )}
                                                            <span className="text-sm font-bold text-primary">
                                                                Rp{" "}
                                                                {Number(
                                                                    lesson.price,
                                                                ).toLocaleString(
                                                                    "id-ID",
                                                                    {
                                                                        minimumFractionDigits: 0,
                                                                    },
                                                                )}
                                                            </span>
                                                            {lesson.original_price &&
                                                                lesson.original_price >
                                                                    lesson.price && (
                                                                    <Badge className="bg-red-500 text-white text-xs py-0">
                                                                        {Math.round(
                                                                            (1 -
                                                                                lesson.price /
                                                                                    lesson.original_price) *
                                                                                100,
                                                                        )}
                                                                        % OFF
                                                                    </Badge>
                                                                )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>

                        {/* Load More / View All Section */}
                        {hasMore && (
                            <div className="mt-12 text-center space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
                                    <span className="text-sm text-muted-foreground">
                                        Showing {displayCount} of{" "}
                                        {filteredLessons.length} lessons
                                    </span>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={handleLoadMore}
                                        size="lg"
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        Load More (12)
                                    </Button>
                                    <Button
                                        onClick={handleViewAll}
                                        size="lg"
                                        className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                                    >
                                        View All ({remainingCount} more)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-20">
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold">
                                {/* No lessons found */}
                                {t("categories.noLesson")}
                            </h3>
                            <p className="text-muted-foreground">
                                {/* Try adjusting your filters or search terms to find what you're
                looking for. */}
                                {t("categories.descNo")}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearchTerm("");
                                    setCategory("all");
                                    setDifficulty("all");
                                }}
                                className="mt-4"
                            >
                                {/* Clear Filters */}
                                {t("categories.clear")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Test Button */}
            <FloatingTestButton />
        </div>
    );
}
