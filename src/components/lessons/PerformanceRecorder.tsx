import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Camera,
    StopCircle,
    Upload,
    X,
    Video,
    VideoOff,
    Mic,
    MicOff,
    Sparkles,
    Circle,
    MoreHorizontal,
    Monitor,
    PlayCircle,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
interface PerformanceRecorderProps {
    contentId: string;
    lessonId: string;
    userId: string;
    enabled: boolean;
    enrollmentId?: string;
}
export default function PerformanceRecorder({
    contentId,
    lessonId,
    userId,
    enabled,
    enrollmentId,
}: PerformanceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const [showSetup, setShowSetup] = useState(false);
    const [showEffects, setShowEffects] = useState(false);
    const [showBlur, setShowBlur] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [blurEnabled, setBlurEnabled] = useState(false);
    const [videoEffect, setVideoEffect] = useState<"normal" | "professional">(
        "normal"
    );
    const [recordingTime, setRecordingTime] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const processedStreamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewStreamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    // Check if there's already a submission for this content
    const { data: existingSubmission } = useQuery({
        queryKey: ["performance-submission", contentId, userId],
        enabled: !!contentId && !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_performance_recordings")
                .select("*")
                .eq("content_id", contentId)
                .eq("user_id", userId)
                .order("submitted_at", { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== "PGRST116") throw error;
            return data;
        },
    });

    // Apply video effects using CSS filters
    const getVideoFilterStyle = () => {
        const filters: string[] = [];

        if (videoEffect === "professional") {
            filters.push("brightness(1.1)");
            filters.push("contrast(1.15)");
            filters.push("saturate(1.2)");
        }

        if (blurEnabled) {
            // This creates a subtle glow effect
            filters.push("drop-shadow(0 0 10px rgba(0,0,0,0.3))");
        }

        return filters.length > 0 ? filters.join(" ") : "none";
    };

    // Start preview stream when setup opens
    const startPreview = async () => {
        if (!cameraEnabled) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                },
                audio: false, // No audio for preview
            });
            previewStreamRef.current = stream;
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream;
                previewVideoRef.current.style.filter = getVideoFilterStyle();
                setTimeout(() => {
                    if (previewVideoRef.current) {
                        previewVideoRef.current.play().catch((err) => {
                            console.error("Error playing preview:", err);
                        });
                    }
                }, 100);
            }
        } catch (error) {
            console.error("Error starting preview:", error);
            toast.error("Failed to access camera for preview");
        }
    };
    const stopPreview = () => {
        if (previewStreamRef.current) {
            previewStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());
            previewStreamRef.current = null;
        }
    };

    useEffect(() => {
        // Efek ini jalan setiap kali status 'isRecording' berubah
        if (isRecording && videoRef.current && streamRef.current) {
            

            // Masukkan stream yang sudah disimpan ke elemen video
            videoRef.current.srcObject = streamRef.current;

            // Terapkan filter jika ada
            videoRef.current.style.filter = getVideoFilterStyle();

            // Pastikan video di-play (kadang browser butuh dipancing)
            videoRef.current.play().catch((err) => {
                console.error("Error playing recording preview:", err);
            });
        }
    }, [isRecording, videoEffect, blurEnabled]);

    // Update preview filters when effects change
    useEffect(() => {
        if (previewVideoRef.current) {
            previewVideoRef.current.style.filter = getVideoFilterStyle();
        }
        if (videoRef.current) {
            videoRef.current.style.filter = getVideoFilterStyle();
        }
    }, [videoEffect, blurEnabled]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRecording) {
            // Reset waktu ke 0 saat mulai merekam (opsional, biar pasti)
            // setRecordingTime(0);

            interval = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        }

        // Cleanup function: otomatis matikan timer saat stop atau component unmount
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRecording]);

    // Start preview when setup opens and camera is enabled
    useEffect(() => {
        if (showSetup && cameraEnabled) {
            startPreview();
        } else {
            stopPreview();
        }
        return () => {
            stopPreview();
        };
    }, [showSetup, cameraEnabled]);
    const startRecording = async () => {
        try {
            if (!cameraEnabled && !micEnabled) {
                toast.error("Please enable camera or microphone to record");
                return;
            }

            const constraints: MediaStreamConstraints = {
                video: cameraEnabled
                    ? {
                          width: 1280,
                          height: 720,
                      }
                    : false,
                audio: micEnabled,
            };

            const stream = await navigator.mediaDevices.getUserMedia(
                constraints
            );

            stopPreview();

            // PENTING: Simpan stream ke ref agar bisa diakses oleh useEffect di atas
            streamRef.current = stream;

            setShowSetup(false);

            // --- BAGIAN INI BISA DIHAPUS KARENA AKAN DITANGANI USEEFFECT ---
            /* if (videoRef.current && cameraEnabled) {
        videoRef.current.srcObject = stream;
        // ... code lama ...
      }
      */
            // --------------------------------------------------------------

            const mimeType = MediaRecorder.isTypeSupported(
                "video/webm;codecs=vp9"
            )
                ? "video/webm;codecs=vp9"
                : "video/webm";
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
            });

            chunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // ... logic stop sama seperti sebelumnya ...
                const blob = new Blob(chunksRef.current, {
                    type: "video/webm",
                });
                setRecordedBlob(blob);
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);

                if (streamRef.current) {
                    streamRef.current
                        .getTracks()
                        .forEach((track) => track.stop());
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();

            // Saat ini di-set true, useEffect di atas akan terpanggil otomatis
            setIsRecording(true);
            setRecordingTime(0);

            // if (timerRef.current) {
            //     clearInterval(timerRef.current);
            // }

            // // 2. Baru mulai timer baru
            // timerRef.current = setInterval(() => {
            //     setRecordingTime((prev) => prev + 1);
            // }, 1000);

            toast.success("Recording started!");
        } catch (error) {
            console.error("Error starting recording:", error);
            toast.error("Failed to access camera. Please check permissions.");
        }
    };
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);

            // Stop timer
            // if (timerRef.current) {
            //     clearInterval(timerRef.current);
            //     timerRef.current = null;
            // }
            toast.info("Recording stopped. You can now review and upload.");
        }
    };
    const uploadRecording = async () => {
        if (!recordedBlob) return;
        setIsUploading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get user profile for watermark
            const { data: profile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", user.id)
                .single();

            // Create FormData
            const formData = new FormData();
            formData.append(
                "video",
                recordedBlob,
                `recording-${Date.now()}.webm`
            );
            formData.append("lessonId", lessonId);
            formData.append("userId", user.id);
            formData.append(
                "watermarkText",
                profile?.display_name || user.email || "Student"
            );

            // Upload to Cloudflare via edge function
            const { data: uploadResult, error: uploadError } =
                await supabase.functions.invoke("upload-to-cloudflare-stream", {
                    body: formData,
                });

            if (uploadError) throw uploadError;

            // Save to database with Cloudflare video ID
            const { error: dbError } = await supabase
                .from("lesson_performance_recordings")
                .insert({
                    user_id: userId,
                    lesson_id: lessonId,
                    content_id: contentId,
                    video_url: uploadResult.playbackUrl,
                    // cloudflare_video_id: uploadResult.videoId,
                    duration_seconds: Math.floor(recordingTime),
                    status: "pending",
                    submitted_at: new Date().toISOString(),
                });

            if (dbError) throw dbError;

            // Mark content as complete if enrollmentId is provided
            if (enrollmentId) {
                const { error: progressError } = await supabase
                    .from("lesson_progress")
                    .upsert({
                        enrollment_id: enrollmentId,
                        content_id: contentId,
                        completed: true,
                        completion_date: new Date().toISOString(),
                    });

                if (progressError) {
                    console.error(
                        "Error marking content as complete:",
                        progressError
                    );
                } else {
                    // Update enrollment progress percentage
                    const { data: allProgress } = await supabase
                        .from("lesson_progress")
                        .select("completed")
                        .eq("enrollment_id", enrollmentId);

                    if (allProgress) {
                        const completedCount = allProgress.filter(
                            (p) => p.completed
                        ).length;

                        // Get total content count
                        const { data: modules } = await supabase
                            .from("lesson_modules")
                            .select(
                                `
                lesson_content (id)
              `
                            )
                            .eq("lesson_id", lessonId);

                        if (modules) {
                            const totalCount = modules.reduce(
                                (acc: number, m: any) =>
                                    acc + (m.lesson_content?.length || 0),
                                0
                            );

                            if (totalCount > 0) {
                                const progressPercentage = Math.round(
                                    (completedCount / totalCount) * 100
                                );

                                await supabase
                                    .from("lesson_enrollments")
                                    .update({
                                        progress_percentage: progressPercentage,
                                    })
                                    .eq("id", enrollmentId);
                            }
                        }
                    }
                }
            }

            toast.success(
                "Performance submitted successfully! Your instructor will review it."
            );

            // Reset state
            setRecordedBlob(null);
            setPreviewUrl(null);
            setRecordingTime(0);

            // Invalidate queries to refresh the data
            queryClient.invalidateQueries({
                queryKey: ["performance-recordings"],
            });
            queryClient.invalidateQueries({
                queryKey: ["performance-submission"],
            });
            queryClient.invalidateQueries({
                queryKey: ["lesson-progress"],
            });
            queryClient.invalidateQueries({
                queryKey: ["enrollment"],
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast.error(error.message || "Failed to upload recording");
        } finally {
            setIsUploading(false);
        }
    };
    const discardRecording = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setRecordedBlob(null);
        setPreviewUrl(null);
        setRecordingTime(0);
        toast.info("Recording discarded");
    };

    const handleFileUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("video/")) {
            toast.error("Please select a video file");
            return;
        }

        // Validate file size (max 500MB)
        if (file.size > 500 * 1024 * 1024) {
            toast.error("File size must be less than 500MB");
            return;
        }

        setRecordedBlob(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        toast.success("Video file loaded. Review and upload when ready.");

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            stopPreview();
        };
    }, [previewUrl]);
    if (!enabled) return null;

    // If there's already a submission, show completion status
    if (existingSubmission && !recordedBlob) {
        return (
            <Card className="mt-6 p-6 bg-green-500/5 border-green-500/20">
                <div className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                            Performance Submitted
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                            You've successfully submitted your performance
                            recording. Your instructor will review it and
                            provide feedback.
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Status:</span>
                            <span
                                className={`capitalize ${
                                    existingSubmission.status === "pending"
                                        ? "text-yellow-600"
                                        : existingSubmission.status ===
                                          "reviewed"
                                        ? "text-green-600"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {existingSubmission.status === "pending"
                                    ? "Awaiting Review"
                                    : existingSubmission.status}
                            </span>
                        </div>
                        {existingSubmission.submitted_at && (
                            <div className="text-xs text-muted-foreground mt-2">
                                Submitted on{" "}
                                {new Date(
                                    existingSubmission.submitted_at
                                ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="mt-6 p-0 overflow-hidden border-0 shadow-lg">
            {!isRecording && !recordedBlob && !showSetup && (
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                        Submit Your Performance
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Record yourself or upload a video of your performance.
                        Your instructor will review and provide feedback.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            onClick={() => setShowSetup(true)}
                            className="h-14 rounded-xl text-base font-semibold"
                        >
                            <Camera className="mr-2 h-5 w-5" />
                            Record Video
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="h-14 rounded-xl text-base font-semibold"
                        >
                            <Upload className="mr-2 h-5 w-5" />
                            Upload Video
                        </Button>
                    </div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>
            )}

            {!isRecording && !recordedBlob && showSetup && (
                <div className="relative bg-background/95 backdrop-blur-sm p-6 rounded-2xl max-w-md mx-auto my-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 rounded-full z-10"
                        onClick={() => {
                            setShowSetup(false);
                            stopPreview();
                        }}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Loom-style Circular Camera Preview */}
                    {cameraEnabled && (
                        <div className="flex justify-center mb-6 pt-2">
                            <div className="relative">
                                {/* Circular video preview */}
                                <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-900 shadow-2xl ring-4 ring-primary/20 relative">
                                    <video
                                        ref={previewVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover scale-110"
                                    />
                                    {blurEnabled && (
                                        <div className="absolute inset-0 backdrop-blur-sm bg-black/10 pointer-events-none" />
                                    )}
                                </div>
                                {/* Decorative pulse ring */}
                                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                            </div>
                        </div>
                    )}

                    {/* Mode Selection Icons */}
                    <div className="flex items-center justify-center gap-3 mb-6"></div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        cameraEnabled
                                            ? "bg-primary/10"
                                            : "bg-muted"
                                    }`}
                                >
                                    {cameraEnabled ? (
                                        <Video className="h-5 w-5 text-primary" />
                                    ) : (
                                        <VideoOff className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-sm">
                                        Camera
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {cameraEnabled
                                            ? "HD Camera"
                                            : "Disabled"}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={cameraEnabled}
                                onCheckedChange={(checked) => {
                                    setCameraEnabled(checked);
                                    toast.info(
                                        checked
                                            ? "Camera enabled"
                                            : "Camera disabled"
                                    );
                                    // Restart preview when camera is toggled on
                                    if (checked && showSetup) {
                                        setTimeout(() => startPreview(), 100);
                                    } else {
                                        stopPreview();
                                    }
                                }}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                                <div
                                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        micEnabled
                                            ? "bg-primary/10"
                                            : "bg-muted"
                                    }`}
                                >
                                    {micEnabled ? (
                                        <Mic className="h-5 w-5 text-primary" />
                                    ) : (
                                        <MicOff className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <p className="font-medium text-sm">
                                        Microphone
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {micEnabled ? "Enabled" : "Disabled"}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={micEnabled}
                                onCheckedChange={(checked) => {
                                    setMicEnabled(checked);
                                    toast.info(
                                        checked
                                            ? "Microphone enabled"
                                            : "Microphone disabled"
                                    );
                                }}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={startRecording}
                        disabled={!cameraEnabled && !micEnabled}
                        className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transition-all"
                    >
                        Start Recording
                    </Button>

                    <p className="text-center text-xs text-muted-foreground mt-4">
                        5 min recording limit
                    </p>

                    <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
                        <button
                            onClick={() => setShowEffects(!showEffects)}
                            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Sparkles
                                className={`h-5 w-5 ${
                                    showEffects ? "text-primary" : ""
                                }`}
                            />
                            <span className="text-xs">Effects</span>
                        </button>
                        <button
                            onClick={() => {
                                setBlurEnabled(!blurEnabled);
                                toast.info(
                                    blurEnabled
                                        ? "Blur disabled"
                                        : "Blur enabled"
                                );
                            }}
                            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Circle
                                className={`h-5 w-5 ${
                                    blurEnabled ? "text-primary" : ""
                                }`}
                            />
                            <span className="text-xs">Blur</span>
                        </button>
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <MoreHorizontal
                                className={`h-5 w-5 ${
                                    showMore ? "text-primary" : ""
                                }`}
                            />
                            <span className="text-xs">More</span>
                        </button>
                    </div>

                    {showEffects && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2">
                            <p className="text-sm font-medium mb-3">
                                Video Effects
                            </p>
                            <button
                                onClick={() => {
                                    setVideoEffect("normal");
                                    toast.success("Normal mode selected");
                                    setShowEffects(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                                    videoEffect === "normal"
                                        ? "bg-primary/10 border border-primary/20"
                                        : ""
                                }`}
                            >
                                <p className="font-medium text-sm">Normal</p>
                                <p className="text-xs text-muted-foreground">
                                    No effects applied
                                </p>
                            </button>
                            <button
                                onClick={() => {
                                    setVideoEffect("professional");
                                    toast.success(
                                        "Professional mode selected - Enhanced lighting & colors"
                                    );
                                    setShowEffects(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg hover:bg-muted transition-colors ${
                                    videoEffect === "professional"
                                        ? "bg-primary/10 border border-primary/20"
                                        : ""
                                }`}
                            >
                                <p className="font-medium text-sm">
                                    Professional
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Enhanced brightness, contrast & saturation
                                </p>
                            </button>
                        </div>
                    )}

                    {showMore && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2">
                            <p className="text-sm font-medium mb-3">
                                Additional Options
                            </p>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                                <div>
                                    <p className="font-medium text-sm">
                                        Recording Quality
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        HD (1280x720)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                                <div>
                                    <p className="font-medium text-sm">
                                        Time Limit
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        5 minutes
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isRecording && (
                <div className="relative">
                    {/* Loom-style Floating Camera Bubble */}
                    <div className="relative w-full aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                        {cameraEnabled ? (
                            <>
                                {/* Camera Feed */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    {blurEnabled && (
                                        <div className="absolute inset-0 backdrop-blur-[2px] bg-black/5 pointer-events-none" />
                                    )}
                                </div>

                                {/* Recording Indicator - Top Right */}
                                <div className="absolute top-6 right-6 z-10">
                                    <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                                        <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
                                        Recording
                                    </div>
                                </div>

                                {/* Timer - Top Left */}
                                <div className="absolute top-6 left-6 z-10">
                                    <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-mono">
                                        {Math.floor(recordingTime / 60)}:
                                        {(recordingTime % 60)
                                            .toString()
                                            .padStart(2, "0")}
                                    </div>
                                </div>

                                {/* Bottom Gradient Overlay */}
                                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
                            </> /* Audio-Only Recording View */
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="relative">
                                    {/* Pulsing Circle Animation */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-32 w-32 rounded-full bg-primary/20 animate-ping" />
                                    </div>
                                    <div className="relative h-32 w-32 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center">
                                        <Mic className="h-16 w-16 text-white animate-pulse" />
                                    </div>
                                </div>
                                <p className="text-white font-medium text-lg mt-8">
                                    Audio Recording
                                </p>
                                <div className="mt-6 bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium inline-flex items-center gap-2 shadow-lg">
                                    <div className="h-3 w-3 bg-white rounded-full animate-pulse" />
                                    Recording...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Control Bar - Loom Style */}
                    <div className="mt-6 flex justify-center">
                        <Button
                            onClick={stopRecording}
                            size="lg"
                            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-8 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            <StopCircle className="mr-2 h-5 w-5" />
                            Stop Recording
                        </Button>
                    </div>
                </div>
            )}

            {recordedBlob && previewUrl && (
                <div className="space-y-6">
                    {/* Loom-style Preview */}
                    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
                        <video
                            src={previewUrl}
                            controls
                            className="w-full h-full object-cover"
                        />
                        {/* Play button overlay when paused */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 opacity-0 hover:opacity-100 transition-opacity">
                                <PlayCircle className="h-16 w-16 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons - Loom Style */}
                    <div className="flex gap-3">
                        <Button
                            onClick={uploadRecording}
                            disabled={isUploading}
                            className="flex-1 h-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            <Upload className="mr-2 h-5 w-5" />
                            {isUploading ? "Uploading..." : "Submit Recording"}
                        </Button>
                        <Button
                            onClick={discardRecording}
                            disabled={isUploading}
                            variant="outline"
                            className="h-14 px-6 rounded-full border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
                        >
                            <X className="mr-2 h-5 w-5" />
                            Discard
                        </Button>
                    </div>

                    {/* Info Text */}
                    <p className="text-center text-sm text-muted-foreground">
                        Review your recording before submitting for instructor
                        feedback
                    </p>
                </div>
            )}
        </Card>
    );
}
