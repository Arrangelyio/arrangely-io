import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Clock,
    Star,
    User,
    PlayCircle,
    Check,
    Video,
    FileText,
    Download,
    Smartphone,
    Award,
    ChevronDown,
    ChevronUp,
    UserCircle2,
    Globe,
    Info,
    Zap,
    BarChart,
    Infinity,
    ArrowRight,
    Layout,
    Play,
    Lock,
    X,
    ArrowLeft,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import VideoPreview from "@/components/creator/VideoPreview";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";
import { storeIntendedUrl } from "@/utils/redirectUtils";

// Import Images
import arrangelyLogo from "@/assets/Final-Logo-Arrangely-Logogram.png";
import arrangelyBlueBg from "@/assets/arrangely-biru.jpg";
import { cn } from "@/lib/utils";

export default function LessonDetail() {
    const { t } = useLanguage();
    const { slug } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isNative = Capacitor.isNativePlatform();

    const [previewContent, setPreviewContent] = useState<any>(null);
    const [expandedModules, setExpandedModules] = useState<
        Record<string, boolean>
    >({});

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
        script.setAttribute(
            "data-client-key",
            "SB-Mid-client-JX2c-Ey1cxVLMUUj",
        );
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // --- 1. FETCH CURRENT USER FIRST ---
    const { data: currentUser } = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            return user;
        },
    });

    // --- 2. Query Data Lesson Utama ---
    const { data: lesson, isLoading } = useQuery({
        queryKey: ["lesson", slug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select(
                    `
          *,
          profiles:creator_id (
            display_name,
            avatar_url,
            bio,
            creator_slug
          )
        `,
                )
                .eq("slug", slug)
                .eq("status", "published")
                .single();

            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        const isNative = Capacitor.isNativePlatform();

        const configureSystemBars = async () => {
            if (isNative) {
                try {
                    // 1. Force Status Bar (Atas)
                    await StatusBar.setStyle({ style: Style.Light }); // Teks putih jika bg gelap

                    // 2. Force Navigation Bar (Bawah)
                    if (Capacitor.getPlatform() === "android") {
                        await NavigationBar.show();
                        await NavigationBar.setColor({
                            color: "#000000", // Pastikan jadi HITAM PEKAT
                            darkButtons: false, // Icon tombol jadi putih
                        });
                    }
                } catch (err) {
                    console.error(
                        "Gagal setting system bars di LessonDetail:",
                        err,
                    );
                }
            }
        };

        configureSystemBars();
    }, []);

    // --- 3. Query Modules ---
    const { data: modules } = useQuery({
        queryKey: ["lesson-modules", lesson?.id, currentUser?.id],
        enabled: !!lesson?.id,
        queryFn: async () => {
            const { data, error } = await supabase.rpc(
                "get_secure_lesson_modules",
                {
                    p_lesson_id: lesson.id,
                },
            );

            if (error) throw error;
            return data;
        },
    });

    // --- 4. Query Students Count ---
    const { data: studentsCount } = useQuery({
        queryKey: ["students-count", lesson?.id],
        enabled: !!lesson?.id,
        queryFn: async () => {
            const { data, error } = await supabase.rpc(
                "get_lesson_enrollment_count",
                {
                    lesson_uuid: lesson.id,
                },
            );

            if (error) {
                console.error("Error fetching count:", error);
                return 0;
            }
            return data;
        },
    });

    // --- 5. Query Enrollment Status ---
    const { data: hasAccess, isLoading: accessLoading } = useQuery({
        queryKey: ["lesson-access", lesson?.id, currentUser?.id],
        enabled: !!lesson?.id && !!currentUser?.id,
        queryFn: async () => {
            const { data, error } = await supabase.rpc("has_lesson_access", {
                _user_id: currentUser.id,
                _lesson_id: lesson.id,
            });

            if (error) throw error;
            return data === true;
        },
    });

    const isEnrolled = hasAccess === true;

    // --- 6. Query Reviews ---
    const { data: reviews } = useQuery({
        queryKey: ["lesson-reviews", lesson?.id],
        enabled: !!lesson?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_reviews")
                .select(
                    `
          *,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `,
                )
                .eq("lesson_id", lesson.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    // --- 7. Query Creator Stats ---
    const { data: creatorStats } = useQuery({
        queryKey: ["creator-stats-mini", lesson?.creator_id],
        enabled: !!lesson?.creator_id,
        queryFn: async () => {
            const { count } = await supabase
                .from("lessons")
                .select("*", { count: "exact", head: true })
                .eq("creator_id", lesson.creator_id)
                .eq("status", "published");

            return { totalCourses: count || 1 };
        },
    });

    const firstPreviewContent = modules
        ?.flatMap((m: any) => m.lesson_content)
        ?.filter(
            (c: any) => c.content_type === "video" && c.is_preview === true,
        )
        ?.sort((a: any, b: any) => a.order_index - b.order_index)[0];

    const handleOpenPreview = () => {
        const videoUrlToPlay =
            lesson.preview_video_url || firstPreviewContent?.video_url;
        const titleToPlay = firstPreviewContent?.title || "Course Preview";

        if (videoUrlToPlay) {
            setPreviewContent({
                title: titleToPlay,
                video_url: videoUrlToPlay,
                content_type: "video",
            });
        } else {
            toast.error("Preview video is not available for this course.");
        }
    };

    const enrollMutation = useMutation({
        mutationFn: async () => {
            if (!currentUser) {
                throw new Error("Please login first");
            }

            // 🟢 SUDAH PUNYA AKSES → LANGSUNG MASUK
            if (isEnrolled) {
                navigate(`/learn/${lesson.id}`);
                return null;
            }

            // 🔵 PAID COURSE
            if (!lesson.is_free && lesson.price > 0) {
                const { data: existingPayment } = await supabase
                    .from("payments")
                    .select("midtrans_order_id")
                    .eq("lesson_id", lesson.id)
                    .eq("user_id", currentUser.id)
                    .in("status", ["pending", "processing"])
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existingPayment) {
                    navigate(
                        `/arrangely-music-lab/${slug}/payment/waiting/${existingPayment.midtrans_order_id}`,
                    );
                    return null;
                }

                navigate(`/arrangely-music-lab/${slug}/payment/channel`);
                return null;
            }

            // 🟢 FREE COURSE → INSERT ENROLL
            const { error } = await supabase.from("lesson_enrollments").insert({
                lesson_id: lesson.id,
                user_id: currentUser.id,
                is_production: true,
            });

            if (error) throw error;
            return true;
        },
        onSuccess: (result) => {
            if (result) {
                queryClient.invalidateQueries({ queryKey: ["lesson-access"] });
                toast.success("Successfully enrolled!");
                navigate(`/learn/${lesson.id}`);
            }
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to enroll");
        },
    });

    if (isLoading) {
        return <div className="min-h-screen bg-background animate-pulse" />;
    }

    if (!lesson) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold">Lesson not found</h1>
                <Button onClick={() => navigate("/")} className="mt-4">
                    Go Home
                </Button>
            </div>
        );
    }

    const totalContentCount =
        modules?.reduce(
            (acc, module: any) => acc + module.lesson_content.length,
            0,
        ) || 0;
    const totalDuration =
        modules?.reduce(
            (acc, module: any) =>
                acc +
                module.lesson_content.reduce(
                    (sum: number, content: any) =>
                        sum + (content.duration_minutes || 0),
                    0,
                ),
            0,
        ) || 0;

    const learningOutcomes =
        lesson.learning_outcomes && lesson.learning_outcomes.length > 0
            ? lesson.learning_outcomes
            : [
                  "Mempelajari teknik fingering dasar untuk stabilitas dan kontrol kedua tangan",
                  "Menguasai major/minor scale lengkap dengan interval, 1 oktaf & 2 oktaf",
                  "Belajar triad (1–3–5), bentuk major/minor, dan variasi augmented",
                  "Memahami arpeggio 7th chord dan membangun dasar walking bass",
              ];

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => ({
            ...prev,
            [moduleId]: !prev[moduleId],
        }));
    };

    const SidebarContent = () => (
        <Card className="overflow-hidden shadow-xl border-0 border-t-4 border-t-primary ring-1 ring-gray-200 dark:ring-gray-800 bg-white transform transition-all hover:-translate-y-1 duration-300">
            <div
                className="relative aspect-video w-full bg-slate-900 group cursor-pointer"
                onClick={handleOpenPreview}
            >
                {lesson.cover_image_url ? (
                    <img
                        src={lesson.cover_image_url}
                        alt={lesson.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-75"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Video className="h-12 w-12 text-slate-600" />
                    </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 shadow-2xl scale-100 group-hover:scale-110 transition-transform duration-300 border border-white/30">
                        <Play className="h-8 w-8 text-white fill-white ml-1" />
                    </div>
                </div>

                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview();
                        }}
                        variant="secondary"
                        className="shadow-lg font-semibold gap-2 hover:scale-105 transition-transform bg-white text-slate-900 hover:bg-slate-100"
                    >
                        <PlayCircle className="h-4 w-4" />
                        {t("lessonDetail.previewThisCourse")}
                    </Button>
                </div>
            </div>

            <CardContent className="p-6 space-y-6">
                {!isEnrolled && (
                    <div className="space-y-1">
                        {lesson.is_free ? (
                            <div className="text-3xl font-bold text-emerald-600">
                                FREE
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {lesson.original_price &&
                                    lesson.original_price > lesson.price && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg text-muted-foreground line-through">
                                                Rp{" "}
                                                {Number(
                                                    lesson.original_price,
                                                ).toLocaleString("id-ID", {
                                                    minimumFractionDigits: 0,
                                                })}
                                            </span>
                                            <Badge className="bg-red-500 text-white">
                                                {Math.round(
                                                    (1 -
                                                        lesson.price /
                                                            lesson.original_price) *
                                                        100,
                                                )}
                                                % OFF
                                            </Badge>
                                        </div>
                                    )}
                                <div className="flex items-baseline gap-2">
                                    <div className="text-3xl font-bold text-slate-900">
                                        Rp{" "}
                                        {Number(lesson.price).toLocaleString(
                                            "id-ID",
                                            {
                                                minimumFractionDigits: 0,
                                            },
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    {isEnrolled ? (
                        <Button
                            className="w-full h-12 text-base font-semibold"
                            size="lg"
                            onClick={() => navigate(`/learn/${lesson.id}`)}
                        >
                            {t("lessonDetail.goToCourse")}
                        </Button>
                    ) : (
                        <Button
                            className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90 text-white"
                            size="lg"
                            onClick={() => enrollMutation.mutate()}
                            disabled={enrollMutation.isPending}
                        >
                            {isEnrolled
                                ? "Go to Course"
                                : enrollMutation.isPending
                                ? "Processing..."
                                : t("lessonDetail.buttonEnrollNow") ||
                                  "Enroll Now"}
                        </Button>
                    )}
                    {!isEnrolled && !lesson.is_free && (
                        <p className="text-xs text-center text-muted-foreground">
                            {/* 30-Day Money-Back Guarantee */}
                        </p>
                    )}
                </div>

                <div className="space-y-4 pt-2">
                    <h4 className="font-semibold text-sm text-slate-900">
                        {t("lessonDetail.this") || "This course includes:"}
                    </h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-center gap-3">
                            <Video className="h-4 w-4" />
                            <span>
                                {totalDuration} {t("lessonDetail.hoursVideo")}
                            </span>
                        </li>
                        {/* <li className="flex items-center gap-3">
                            <FileText className="h-4 w-4" />
                            <span>
                                {modules?.length || 0}{" "}
                                {t("lessonDetail.articles")}
                            </span>
                        </li> */}
                        {/* <li className="flex items-center gap-3">
                            <Download className="h-4 w-4" />
                            <span>
                                {totalContentCount} {t("lessonDetail.download")}
                            </span>
                        </li> */}
                        <li className="flex items-center gap-3">
                            <Smartphone className="h-4 w-4" />
                            <span>{t("lessonDetail.access")}</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Award className="h-4 w-4" />
                            <span>{t("lessonDetail.certificate")}</span>
                        </li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );

    const InstructorCard = () => (
        <Card className="w-full border-0 shadow-xl bg-white ring-1 ring-slate-200 rounded-2xl relative overflow-hidden group">
            <div
                className="absolute top-0 left-0 right-0 h-32 bg-cover bg-center"
                style={{ backgroundImage: `url(${arrangelyBlueBg})` }}
            />

            <CardContent className="pt-0 pb-6 px-0 relative flex flex-col items-center text-center">
                <div className="relative mt-16 mb-3">
                    <div className="h-28 w-28 rounded-full p-1.5 bg-white shadow-xl mx-auto">
                        {lesson.profiles?.avatar_url ? (
                            <img
                                src={lesson.profiles.avatar_url}
                                alt={lesson.profiles.display_name}
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-12 w-12 text-slate-400" />
                            </div>
                        )}
                    </div>
                    <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white hover:bg-slate-800 px-4 py-1 shadow-md whitespace-nowrap border-2 border-white text-xs font-semibold tracking-wide">
                        Instructor
                    </Badge>
                </div>

                <div className="px-6 mt-6 w-full">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
                        {lesson.profiles?.display_name || "Unknown"}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 line-clamp-2">
                        {lesson.profiles?.bio ||
                            "Professional Music Instructor & Developer"}
                    </p>

                    <div className="grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100 py-4 w-full mb-6 bg-slate-50/30 rounded-lg">
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-lg">
                                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                                {lesson.average_rating?.toFixed(1) || "5.0"}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                Rating
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-lg">
                                <Layout className="h-4 w-4 text-slate-600" />
                                {creatorStats?.totalCourses || 1}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                                {t("lesson.course")}
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full group border-slate-200 hover:border-primary hover:text-primary transition-all h-11 font-medium rounded-lg"
                        onClick={() =>
                            navigate(
                                `/creator/${
                                    lesson.profiles?.creator_slug ||
                                    lesson.creator_id
                                }`,
                            )
                        }
                    >
                        View Full Profile
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const MobileBackButton = () => {
        // Tombol hanya muncul jika aplikasi berjalan di platform native (Capacitor)
        if (!isNative) return null;

        return (
            <button
                onClick={() => navigate(-1)}
                className={cn(
                    // Menggunakan left-2 agar lebih ke kiri dibanding left-4 sebelumnya
                    "p-2 -ml-1 mr-2 fixed left-2 z-[110] flex items-center justify-center rounded-full transition-all active:scale-95 shadow-lg",
                    "bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900",
                    "w-10 h-10",
                )}
                style={{
                    // Menyesuaikan posisi top agar sejajar dengan area header navigasi Anda
                    top: isNative
                        ? "calc(env(safe-area-inset-top) + 100px)"
                        : "12px",
                }}
            >
                <ArrowLeft className="h-5 w-5" />
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-white pb-40">
            <MobileBackButton />
            {/* PERUBAHAN: Mengurangi Padding Bawah Header dari pb-24 jadi pb-12 */}
            <div
                className="relative bg-white border-b border-slate-100 pb-8 lg:pt-32 lg:pb-12 overflow-hidden"
                style={{
                    paddingTop: isNative
                        ? "calc(env(safe-area-inset-top) + 130px)" // Tambahkan ekstra 20px agar tidak mepet StatusBar
                        : "6rem", // Ini ekuivalen dengan pt-24 untuk tampilan web
                }}
            >
                {lesson.cover_image_url && (
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-[2px]"
                            style={{
                                backgroundImage: `url(${lesson.cover_image_url})`,
                            }}
                        />

                        {/* Soft cinematic gradient */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/70 to-white/90 backdrop-blur-[1px]" />

                        {/* Noise texture */}
                        <div
                            className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
                            style={{
                                backgroundImage:
                                    "url('https://grainy-gradients.vercel.app/noise.svg')",
                            }}
                        />
                    </div>
                )}
                <div className="absolute top-[-20%] right-[-15%] w-[450px] h-[450px] bg-primary/10 rounded-full blur-[130px] pointer-events-none"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[150px] pointer-events-none"></div>
                <div className="absolute top-1/3 left-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none -translate-x-1/2"></div>

                <div className="container relative max-w-7xl mx-auto px-4 z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-center">
                        <div className="lg:col-span-2">
                            {/* Card Glassmorphism Premium - COMPACT VERSION */}
                            <div className="relative rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] group">
                                {/* 1. Layer Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/70 to-white/50 backdrop-blur-2xl z-0 border border-white/60 rounded-[2.5rem]" />

                                {/* 2. Layer Noise */}
                                <div
                                    className="absolute inset-0 opacity-[0.03] z-0 mix-blend-overlay"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                    }}
                                />

                                {/* 3. Content Container - Padding & Spacing dikurangi disini */}
                                <div className="relative z-10 p-6 md:p-8 space-y-5">
                                    {/* Header Section: Logo & Badges */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 bg-white/50 rounded-xl shadow-sm border border-white/60">
                                                <img
                                                    src={arrangelyLogo}
                                                    alt="Arrangely"
                                                    className="h-6 w-auto object-contain"
                                                />
                                            </div>
                                            <div className="h-8 w-px bg-slate-300/50 hidden sm:block"></div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                                    Category
                                                </span>
                                                <span className="text-sm font-bold text-primary tracking-wide">
                                                    {lesson.category?.replace(
                                                        "_",
                                                        " ",
                                                    ) || "Course"}
                                                </span>
                                            </div>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className="w-fit px-3 py-1 capitalize bg-white/40 border-white/60 text-slate-700 shadow-sm backdrop-blur-sm rounded-full text-xs font-bold tracking-wide"
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full mr-2 ${
                                                    lesson.difficulty_level ===
                                                    "beginner"
                                                        ? "bg-green-400"
                                                        : lesson.difficulty_level ===
                                                          "intermediate"
                                                        ? "bg-yellow-400"
                                                        : "bg-red-400"
                                                }`}
                                            ></span>
                                            {lesson.difficulty_level}
                                        </Badge>
                                    </div>

                                    {/* Title & Description - Jarak judul ke deskripsi dirapatkan (space-y-2) */}
                                    <div className="space-y-2">
                                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-[1.1] text-slate-900 tracking-tight drop-shadow-sm">
                                            {lesson.title}
                                        </h1>
                                        {/* Line height dikurangi jadi leading-normal */}
                                        <p className="text-base md:text-lg text-slate-600 leading-normal font-medium max-w-2xl">
                                            {lesson.description}
                                        </p>
                                    </div>

                                    {/* Feature Chips */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            {
                                                icon: BarChart,
                                                label: "Level",
                                                value: lesson.difficulty_level,
                                            },
                                            {
                                                icon: Clock,
                                                label: "Duration",
                                                value: `${totalDuration} Min`,
                                            },
                                            {
                                                icon: Zap,
                                                label: "Update",
                                                value: "Nov 2025",
                                            },
                                            {
                                                icon: Infinity,
                                                label: "Access",
                                                value: "Lifetime",
                                            },
                                        ].map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="group/item flex flex-col justify-between p-3 rounded-2xl bg-white/40 hover:bg-white/60 border border-white/50 hover:border-white/80 transition-all duration-300 shadow-sm hover:shadow-md"
                                            >
                                                <div className="p-1.5 w-fit bg-white rounded-full shadow-sm text-primary mb-2 group-hover/item:scale-110 transition-transform">
                                                    <item.icon className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <span className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-800 leading-tight block">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer Stats - Padding top dikurangi */}
                                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/60">
                                        {lesson.average_rating > 0 && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl font-black text-slate-900">
                                                    {lesson.average_rating.toFixed(
                                                        1,
                                                    )}
                                                </span>
                                                <div className="flex flex-col">
                                                    <div className="flex text-amber-400 mb-0.5">
                                                        {Array.from({
                                                            length: 5,
                                                        }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`h-3 w-3 ${
                                                                    i <
                                                                    Math.round(
                                                                        lesson.average_rating,
                                                                    )
                                                                        ? "fill-current"
                                                                        : "text-slate-300"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                                                        {lesson.total_reviews}{" "}
                                                        reviews
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                                        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                                            <User className="h-3.5 w-3.5 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-700">
                                                {studentsCount || 0} students
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                                            <Globe className="h-3.5 w-3.5 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-700">
                                                Indonesian
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hidden lg:flex lg:col-span-1 justify-end">
                            <div className="w-full max-w-sm">
                                <SidebarContent />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                    {/* PERUBAHAN: Mengurangi spasi antar elemen dari space-y-10 jadi space-y-8 */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="lg:hidden rounded-xl overflow-hidden shadow-md border border-slate-200">
                            <div
                                className="relative aspect-video w-full bg-slate-100"
                                onClick={handleOpenPreview}
                            >
                                <img
                                    src={lesson.cover_image_url}
                                    alt={lesson.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <div className="bg-white/90 p-3 rounded-full shadow-lg">
                                        <PlayCircle className="h-8 w-8 text-primary fill-primary/20" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900">
                                {t("lessonDetail.what") || "What you'll learn"}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                {learningOutcomes.map((outcome, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3"
                                    >
                                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-700">
                                            {outcome}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {t("lessonDetail.courseContent") ||
                                        "Course Content"}
                                </h2>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span>
                                        {modules?.length || 0} sections •{" "}
                                        {totalContentCount} lectures •{" "}
                                        {/* {(totalDuration / 60).toFixed(0)}h{" "} */}
                                        {totalDuration}m total
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="hidden sm:flex text-primary h-auto p-0 hover:bg-transparent hover:text-primary/80"
                                        onClick={() => {
                                            const allExpanded =
                                                Object.keys(expandedModules)
                                                    .length ===
                                                    modules?.length &&
                                                Object.values(
                                                    expandedModules,
                                                ).every((v) => v);
                                            const newState: Record<
                                                string,
                                                boolean
                                            > = {};
                                            modules?.forEach((m: any) => {
                                                newState[m.id] = !allExpanded;
                                            });
                                            setExpandedModules(newState);
                                        }}
                                    >
                                        {Object.values(expandedModules).every(
                                            (v) => v,
                                        )
                                            ? t("lessonDetail.collapse")
                                            : t("lessonDetail.expand")}{" "}
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                                {modules?.map((module: any) => {
                                    const moduleDuration =
                                        module.lesson_content.reduce(
                                            (sum: number, content: any) =>
                                                sum +
                                                (content.duration_minutes || 0),
                                            0,
                                        );
                                    const isExpanded =
                                        expandedModules[module.id];

                                    return (
                                        <Collapsible
                                            key={module.id}
                                            open={isExpanded}
                                            onOpenChange={() =>
                                                toggleModule(module.id)
                                            }
                                        >
                                            <CollapsibleTrigger className="w-full bg-slate-50/50 hover:bg-slate-50 transition-colors p-4 flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4 text-slate-500" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                                    )}
                                                    <span className="font-semibold text-slate-900 text-left group-hover:text-primary transition-colors">
                                                        {module.title}
                                                    </span>
                                                </div>
                                                <span className="text-xs sm:text-sm text-slate-500 text-right">
                                                    {
                                                        module.lesson_content
                                                            .length
                                                    }{" "}
                                                    lectures • {moduleDuration}
                                                    min
                                                </span>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <ul className="divide-y divide-slate-50">
                                                    {module.lesson_content
                                                        .sort(
                                                            (a: any, b: any) =>
                                                                a.order_index -
                                                                b.order_index,
                                                        )
                                                        .map((content: any) => {
                                                            const isLocked =
                                                                !content.is_preview &&
                                                                !isEnrolled;

                                                            return (
                                                                <li
                                                                    key={
                                                                        content.id
                                                                    }
                                                                    className="flex items-center justify-between p-3 pl-8 sm:pl-10 hover:bg-slate-50 transition-colors"
                                                                >
                                                                    <div className="flex items-start gap-3 flex-1">
                                                                        {isLocked ? (
                                                                            <Lock className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
                                                                        ) : content.content_type ===
                                                                          "video" ? (
                                                                            <PlayCircle className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                                                                        ) : content.content_type ===
                                                                          "article" ? (
                                                                            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                                                                        ) : (
                                                                            <Download className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                                                                        )}

                                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1">
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (
                                                                                        isLocked
                                                                                    )
                                                                                        return;

                                                                                    if (
                                                                                        content.content_type ===
                                                                                        "video"
                                                                                    ) {
                                                                                        setPreviewContent(
                                                                                            {
                                                                                                ...content,
                                                                                                content_type:
                                                                                                    "video",
                                                                                            },
                                                                                        );
                                                                                    } else if (
                                                                                        content.video_url ||
                                                                                        content.resource_url
                                                                                    ) {
                                                                                        setPreviewContent(
                                                                                            content,
                                                                                        );
                                                                                    } else {
                                                                                        toast.info(
                                                                                            "Content available for download/view.",
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                className={`text-left text-sm ${
                                                                                    isLocked
                                                                                        ? "text-slate-400 cursor-not-allowed"
                                                                                        : "text-slate-900 hover:text-primary cursor-pointer"
                                                                                }`}
                                                                                disabled={
                                                                                    isLocked
                                                                                }
                                                                            >
                                                                                {
                                                                                    content.title
                                                                                }
                                                                            </button>
                                                                            {content.is_preview && (
                                                                                <span className="hidden sm:inline-block text-[10px] font-bold uppercase text-primary border border-primary/30 bg-primary/5 rounded px-1.5 py-0.5">
                                                                                    Preview
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs text-slate-400 ml-2">
                                                                        {content.duration_minutes
                                                                            ? `${content.duration_minutes} min`
                                                                            : ""}
                                                                    </span>
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-slate-900">
                                {t("lessonDetail.studentsReview") ||
                                    "Student Reviews"}
                            </h2>
                            <div className="grid grid-cols-1 gap-6">
                                {reviews && reviews.length > 0 ? (
                                    reviews.map((review: any) => (
                                        <div
                                            key={review.id}
                                            className="border-b border-slate-100 pb-6 last:border-0"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    {review.profiles
                                                        ?.avatar_url ? (
                                                        <img
                                                            src={
                                                                review.profiles
                                                                    .avatar_url
                                                            }
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <User className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-sm text-slate-900">
                                                            {review.profiles
                                                                ?.display_name ||
                                                                "Student"}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="flex text-amber-400">
                                                                {Array.from({
                                                                    length: 5,
                                                                }).map(
                                                                    (_, i) => (
                                                                        <Star
                                                                            key={
                                                                                i
                                                                            }
                                                                            className={`w-3 h-3 ${
                                                                                i <
                                                                                review.rating
                                                                                    ? "fill-current"
                                                                                    : "text-slate-200"
                                                                            }`}
                                                                        />
                                                                    ),
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-slate-400">
                                                                {new Date(
                                                                    review.created_at,
                                                                ).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 text-sm leading-relaxed">
                                                {review.review_text}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-slate-500 text-sm italic">
                                        {t("lessonDetail.noReviews") ||
                                            "No reviews yet."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 relative">
                        <div className="sticky top-24 h-fit hidden lg:block">
                            <InstructorCard />
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={!!previewContent}
                onOpenChange={() => setPreviewContent(null)}
            >
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-zinc-200">
                    <button
                        onClick={() => setPreviewContent(null)}
                        className="absolute top-3 right-3 z-[60] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-sm"
                        aria-label="Close preview"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <DialogHeader className="sr-only">
                        <DialogTitle>Preview</DialogTitle>
                    </DialogHeader>
                    <div
                        className={
                            previewContent?.content_type === "video"
                                ? "aspect-video w-full bg-black"
                                : "w-full h-[80vh]"
                        }
                    >
                        {previewContent?.content_type === "video" ? (
                            previewContent?.video_url ? (
                                <VideoPreview
                                    videoUrl={previewContent.video_url}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white">
                                    <PlayCircle className="h-20 w-20 opacity-50" />
                                </div>
                            )
                        ) : (
                            <iframe
                                src={
                                    previewContent?.resource_url ||
                                    previewContent?.video_url
                                }
                                className="w-full h-full"
                                title="Preview Content"
                            />
                        )}
                    </div>
                    <div className="p-4 bg-white border-t border-zinc-100">
                        <h3 className="font-semibold text-lg text-slate-900">
                            {previewContent?.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {t("lessonDetail.sampleContent") ||
                                "Sample content from this course"}
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {isEnrolled ? (
                // --- BAGIAN 1: JIKA SUDAH ENROLL (GO TO COURSE) ---
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[calc(20px+env(safe-area-inset-bottom))]">
                    <div className="flex items-center gap-4">
                        <Button
                            className="w-full h-12 text-base font-semibold"
                            size="lg"
                            onClick={() => navigate(`/learn/${lesson.id}`)}
                        >
                            {t("lessonDetail.goToCourse")}
                        </Button>
                    </div>
                </div>
            ) : (
                // --- BAGIAN 2: JIKA BELUM ENROLL (PRICE & BUTTON) ---
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[calc(20px+env(safe-area-inset-bottom))]">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            {lesson.is_free ? (
                                <div className="text-lg font-bold text-green-600">
                                    FREE
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {lesson.original_price &&
                                        lesson.original_price >
                                            lesson.price && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground line-through">
                                                    Rp{" "}
                                                    {Number(
                                                        lesson.original_price,
                                                    ).toLocaleString("id-ID")}
                                                </span>
                                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-medium">
                                                    {Math.round(
                                                        (1 -
                                                            lesson.price /
                                                                lesson.original_price) *
                                                            100,
                                                    )}
                                                    % OFF
                                                </span>
                                            </div>
                                        )}

                                    <div className="text-xl font-bold text-slate-900">
                                        Rp{" "}
                                        {Number(lesson.price).toLocaleString(
                                            "id-ID",
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Button
                            size="lg"
                            className="flex-1 font-bold"
                            onClick={() => enrollMutation.mutate()}
                            disabled={enrollMutation.isPending}
                        >
                            {enrollMutation.isPending
                                ? "Processing..."
                                : "Enroll Now"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
