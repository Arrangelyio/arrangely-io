import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
    Play,
    Pause,
    Download,
    Music,
    Mic,
    Activity,
    Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import YouTubeAudioCapture from "@/components/youtube/YouTubeAudioCapture";
import ChordDetectionEngine from "@/components/youtube/ChordDetectionEngine";
import { useLanguage } from "@/contexts/LanguageContext";

interface Section {
    name: string;
    start_time: string;
    end_time: string;
    bars: number;
    bar_structure: string;
}

interface AnalysisResult {
    tempo: number;
    time_signature: string;
    sections: Section[];
    key: string;
    title: string;
    artist: string;
}

const YouTubeRealtimeGenerate = () => {
    const { t } = useLanguage();
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
        null
    );
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [chords, setChords] = useState<Map<string, any>>(new Map());
    const [detectedChords, setDetectedChords] = useState<any[]>([]);
    const [autoDetectionEnabled, setAutoDetectionEnabled] = useState(true);
    const [detectionMethod, setDetectionMethod] = useState<"local" | "backend">(
        "local"
    );
    const [audioData, setAudioData] = useState<Float32Array | null>(null);
    const [detectionActivity, setDetectionActivity] = useState(0);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
    const { toast } = useToast();
    const videoIdRef = useRef<string | null>(null);

    const extractVideoId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    };

    const analyzeYouTubeVideo = async () => {
        if (!youtubeUrl) {
            toast({
                title: "URL Required",
                description: "Please enter a YouTube URL",
                variant: "destructive",
            });
            return;
        }

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) {
            toast({
                title: "Invalid URL",
                description: "Please enter a valid YouTube URL",
                variant: "destructive",
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch(
                "https://tmseyrcoxbwhztvvivgl.functions.supabase.co/youtube-realtime-chords",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: youtubeUrl }),
                }
            );

            if (!response.ok) throw new Error("Analysis failed");

            const result = await response.json();
            setAnalysisResult(result);

            toast({
                title: "Analysis Complete",
                description: "YouTube video analyzed successfully",
            });
        } catch (error) {
            toast({
                title: "Analysis Failed",
                description: "Could not analyze the YouTube video",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getCurrentBarInfo = (currentTime: number) => {
        if (!analysisResult) return null;

        for (
            let sectionIndex = 0;
            sectionIndex < analysisResult.sections.length;
            sectionIndex++
        ) {
            const section = analysisResult.sections[sectionIndex];
            const startSeconds = timeToSeconds(section.start_time);
            const endSeconds = timeToSeconds(section.end_time);

            if (currentTime >= startSeconds && currentTime <= endSeconds) {
                const sectionDuration = endSeconds - startSeconds;
                const barDuration = sectionDuration / section.bars;
                const timeInSection = currentTime - startSeconds;
                const barIndex = Math.floor(timeInSection / barDuration);

                return {
                    sectionIndex,
                    barIndex: Math.min(barIndex, section.bars - 1),
                };
            }
        }
        return null;
    };

    const timeToSeconds = (timeStr: string): number => {
        const [minutes, seconds] = timeStr.split(":").map(Number);
        return minutes * 60 + seconds;
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleChordDetected = useCallback(
        (chord: string, timestamp: number, confidence: number) => {
            setDetectedChords((prev) => [
                ...prev,
                { chord, timestamp, confidence },
            ]);
            setDetectionActivity((prev) => Math.min(prev + 20, 100));

            toast({
                title: "Chord Detected",
                description: `${chord} detected at ${timestamp.toFixed(1)}s (${(
                    confidence * 100
                ).toFixed(0)}% confidence)`,
            });
        },
        [toast]
    );

    const handleAudioData = useCallback((data: Float32Array) => {
        setAudioData(data);
        // Update activity indicator
        const volume = Math.sqrt(
            data.reduce((sum, val) => sum + val * val, 0) / data.length
        );
        setDetectionActivity((prev) =>
            Math.max(prev * 0.95, Math.min(volume * 1000, 100))
        );
    }, []);

    const togglePlayback = () => {
        if (youtubePlayer) {
            if (isPlaying) {
                youtubePlayer.pauseVideo();
            } else {
                youtubePlayer.playVideo();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const exportChordSheet = () => {
        if (!analysisResult) return;

        const exportData = {
            ...analysisResult,
            chords: Object.fromEntries(chords),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${analysisResult.title || "chord-sheet"}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "Export Complete",
            description: "Chord sheet exported successfully",
        });
    };

    const onYouTubeReady = (event: any) => {
        setYoutubePlayer(event.target);
        

        // Set up time tracking
        const updateTime = () => {
            if (
                event.target &&
                typeof event.target.getCurrentTime === "function"
            ) {
                const time = event.target.getCurrentTime();
                setCurrentTime(time);
            }
        };

        // Update time more frequently for better synchronization
        setInterval(updateTime, 100);
    };

    const onYouTubeStateChange = (event: any) => {
        const isVideoPlaying = event.data === 1; // 1 = playing
        setIsPlaying(isVideoPlaying);
        console.log(
            "YouTube player state changed:",
            isVideoPlaying ? "playing" : "paused"
        );
    };

    // Initialize YouTube Player API
    useEffect(() => {
        if (!analysisResult) return;

        const videoId = extractVideoId(youtubeUrl);
        if (!videoId) return;

        // Load YouTube API if not already loaded
        if (!window.YT) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName("script")[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

            window.onYouTubeIframeAPIReady = () => {
                initializePlayer(videoId);
            };
        } else {
            initializePlayer(videoId);
        }

        function initializePlayer(videoId: string) {
            new window.YT.Player("youtube-player-container", {
                height: "100%",
                width: "100%",
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    rel: 0,
                    showinfo: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: onYouTubeReady,
                    onStateChange: onYouTubeStateChange,
                },
            });
        }
    }, [analysisResult, youtubeUrl]);

    // Set up realtime subscription for chords
    useEffect(() => {
        if (!videoIdRef.current) return;

        const channel = supabase
            .channel("chord-updates")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chords",
                    filter: `video_id=eq.${videoIdRef.current}`,
                },
                (payload) => {
                    const newChord = payload.new;
                    setDetectedChords((prev) => [...prev, newChord]);

                    if (newChord.detection_method !== detectionMethod) {
                        toast({
                            title: "Remote Chord Detected",
                            description: `${newChord.chord} detected by another user`,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [videoIdRef.current, detectionMethod, toast]);

    // Update video ID when URL changes
    useEffect(() => {
        const videoId = extractVideoId(youtubeUrl);
        videoIdRef.current = videoId;
    }, [youtubeUrl]);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
                        <Music className="h-8 w-8" />
                        YouTube Real-time Chord Generator
                    </h1>
                    <p className="text-muted-foreground">
                        Analyze YouTube videos and generate chords in real-time
                    </p>
                </div>

                {/* YouTube URL Input */}
                <Card className="p-6">
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter YouTube URL..."
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={analyzeYouTubeVideo}
                                disabled={isAnalyzing}
                                className="px-6"
                            >
                                {isAnalyzing ? "Analyzing..." : "Analyze"}
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Analysis Results */}
                {analysisResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Video Player & Controls */}
                        <Card className="p-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">
                                    Video Player
                                </h3>

                                {/* YouTube Player */}
                                <div className="aspect-video">
                                    <div id="youtube-player-container"></div>
                                </div>

                                {/* Playback Controls */}
                                <div className="flex items-center justify-between">
                                    <Button
                                        onClick={togglePlayback}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        {isPlaying ? (
                                            <Pause className="h-4 w-4" />
                                        ) : (
                                            <Play className="h-4 w-4" />
                                        )}
                                        {isPlaying ? "Pause" : "Play"}
                                    </Button>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    autoDetectionEnabled
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                <Activity className="h-3 w-3 mr-1" />
                                                Detection:{" "}
                                                {autoDetectionEnabled
                                                    ? "ON"
                                                    : "OFF"}
                                            </Badge>
                                            <Switch
                                                checked={autoDetectionEnabled}
                                                onCheckedChange={
                                                    setAutoDetectionEnabled
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    detectionMethod === "local"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                <Settings className="h-3 w-3 mr-1" />
                                                {detectionMethod === "local"
                                                    ? "Local"
                                                    : "AI Backend"}
                                            </Badge>
                                            <Button
                                                onClick={() =>
                                                    setDetectionMethod((prev) =>
                                                        prev === "local"
                                                            ? "backend"
                                                            : "local"
                                                    )
                                                }
                                                variant="outline"
                                                size="sm"
                                            >
                                                Switch Mode
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Detection Activity Indicator */}
                                    {autoDetectionEnabled && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mic className="h-4 w-4" />
                                                <span>Detection Activity</span>
                                            </div>
                                            <Progress
                                                value={detectionActivity}
                                                className="h-2"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Song Information & Detected Chords */}
                        <Card className="p-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">
                                    {/* Song Information */}
                                    {t("arrEditor.subtitle")}
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Title
                                        </label>
                                        <p className="font-medium">
                                            {analysisResult.title}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Artist
                                        </label>
                                        <p className="font-medium">
                                            {analysisResult.artist}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Tempo
                                        </label>
                                        <p className="font-medium">
                                            {analysisResult.tempo} BPM
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Time Signature
                                        </label>
                                        <p className="font-medium">
                                            {analysisResult.time_signature}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Key
                                        </label>
                                        <p className="font-medium">
                                            {analysisResult.key}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">
                                            Detected Chords
                                        </label>
                                        <p className="font-medium">
                                            {detectedChords.length}
                                        </p>
                                    </div>
                                </div>

                                {/* Recent Detected Chords */}
                                {detectedChords.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">
                                            Recent Detections
                                        </h4>
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {detectedChords
                                                .slice(-5)
                                                .reverse()
                                                .map((detection, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded"
                                                    >
                                                        <span className="font-medium">
                                                            {detection.chord}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span>
                                                                {detection.timestamp?.toFixed(
                                                                    1
                                                                )}
                                                                s
                                                            </span>
                                                            {detection.confidence && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {Math.round(
                                                                        detection.confidence *
                                                                            100
                                                                    )}
                                                                    %
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={exportChordSheet}
                                    className="w-full flex items-center gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Export Chord Sheet
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Sections Timeline */}
                {analysisResult && (
                    <Card className="p-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Song Structure
                            </h3>

                            <div className="space-y-4">
                                {analysisResult.sections.map(
                                    (section, sectionIndex) => {
                                        const currentBarInfo =
                                            getCurrentBarInfo(currentTime);
                                        const isCurrentSection =
                                            currentBarInfo?.sectionIndex ===
                                            sectionIndex;

                                        return (
                                            <div
                                                key={sectionIndex}
                                                className="space-y-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium">
                                                        {section.name}
                                                    </h4>
                                                    <Badge variant="outline">
                                                        {section.start_time} -{" "}
                                                        {section.end_time}
                                                    </Badge>
                                                    <Badge variant="secondary">
                                                        {section.bars} bars
                                                    </Badge>
                                                </div>

                                                {/* Bars Display */}
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {Array.from(
                                                        {
                                                            length: section.bars,
                                                        },
                                                        (_, barIndex) => {
                                                            const isCurrentBar =
                                                                isCurrentSection &&
                                                                currentBarInfo?.barIndex ===
                                                                    barIndex;
                                                            const sectionStart =
                                                                timeToSeconds(
                                                                    section.start_time
                                                                );
                                                            const sectionEnd =
                                                                timeToSeconds(
                                                                    section.end_time
                                                                );
                                                            const sectionDuration =
                                                                sectionEnd -
                                                                sectionStart;
                                                            const barDuration =
                                                                sectionDuration /
                                                                section.bars;
                                                            const barStartTime =
                                                                sectionStart +
                                                                barIndex *
                                                                    barDuration;
                                                            const barEndTime =
                                                                sectionStart +
                                                                (barIndex + 1) *
                                                                    barDuration;

                                                            // Find chord for this bar time range
                                                            const currentBarChord =
                                                                detectedChords.find(
                                                                    (chord) =>
                                                                        chord.timestamp >=
                                                                            barStartTime &&
                                                                        chord.timestamp <
                                                                            barEndTime
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        barIndex
                                                                    }
                                                                    className={`
                                min-w-[80px] h-16 border-2 rounded-lg flex items-center justify-center
                                transition-all duration-200 cursor-pointer
                                ${
                                    isCurrentBar
                                        ? "border-primary bg-primary/20 shadow-lg scale-105"
                                        : currentBarChord
                                        ? "border-secondary bg-secondary/10"
                                        : "border-border bg-background hover:bg-muted/50"
                                }
                              `}
                                                                    onClick={() => {
                                                                        if (
                                                                            youtubePlayer
                                                                        ) {
                                                                            youtubePlayer.seekTo(
                                                                                barStartTime,
                                                                                true
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    <div className="text-center">
                                                                        <div className="text-xs text-muted-foreground">
                                                                            Bar{" "}
                                                                            {barIndex +
                                                                                1}
                                                                        </div>
                                                                        <div className="text-sm font-medium">
                                                                            {currentBarChord
                                                                                ? currentBarChord.chord
                                                                                : isCurrentBar
                                                                                ? "..."
                                                                                : ""}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Progress Bar */}
                {analysisResult && (
                    <Card className="p-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                Playback Progress
                            </h3>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>
                                        {formatTime(
                                            timeToSeconds(
                                                analysisResult.sections[
                                                    analysisResult.sections
                                                        .length - 1
                                                ]?.end_time || "0:00"
                                            )
                                        )}
                                    </span>
                                </div>

                                <div className="relative">
                                    <Progress
                                        value={
                                            (currentTime /
                                                timeToSeconds(
                                                    analysisResult.sections[
                                                        analysisResult.sections
                                                            .length - 1
                                                    ]?.end_time || "0:00"
                                                )) *
                                            100
                                        }
                                        className="h-3"
                                    />

                                    {/* Section markers */}
                                    <div className="absolute top-0 left-0 w-full h-3 pointer-events-none">
                                        {analysisResult.sections.map(
                                            (section, index) => {
                                                const totalDuration =
                                                    timeToSeconds(
                                                        analysisResult.sections[
                                                            analysisResult
                                                                .sections
                                                                .length - 1
                                                        ]?.end_time || "0:00"
                                                    );
                                                const sectionStart =
                                                    (timeToSeconds(
                                                        section.start_time
                                                    ) /
                                                        totalDuration) *
                                                    100;
                                                const sectionEnd =
                                                    (timeToSeconds(
                                                        section.end_time
                                                    ) /
                                                        totalDuration) *
                                                    100;

                                                return (
                                                    <div
                                                        key={index}
                                                        className="absolute top-0 h-full bg-primary/20 border-l-2 border-primary/40"
                                                        style={{
                                                            left: `${sectionStart}%`,
                                                            width: `${
                                                                sectionEnd -
                                                                sectionStart
                                                            }%`,
                                                        }}
                                                    />
                                                );
                                            }
                                        )}

                                        {/* Current position indicator */}
                                        <div
                                            className="absolute top-0 h-full w-1 bg-primary shadow-lg"
                                            style={{
                                                left: `${
                                                    (currentTime /
                                                        timeToSeconds(
                                                            analysisResult
                                                                .sections[
                                                                analysisResult
                                                                    .sections
                                                                    .length - 1
                                                            ]?.end_time ||
                                                                "0:00"
                                                        )) *
                                                    100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Current section info */}
                                {getCurrentBarInfo(currentTime) && (
                                    <div className="text-sm text-center">
                                        <span className="font-medium">
                                            {
                                                analysisResult.sections[
                                                    getCurrentBarInfo(
                                                        currentTime
                                                    )!.sectionIndex
                                                ].name
                                            }
                                        </span>
                                        <span className="text-muted-foreground ml-2">
                                            Bar{" "}
                                            {getCurrentBarInfo(currentTime)!
                                                .barIndex + 1}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Audio Capture & Chord Detection */}
                {youtubePlayer && videoIdRef.current && (
                    <>
                        <YouTubeAudioCapture
                            youtubePlayer={youtubePlayer}
                            isPlaying={isPlaying}
                            onAudioData={handleAudioData}
                            enabled={autoDetectionEnabled}
                        />
                        <ChordDetectionEngine
                            audioData={audioData}
                            videoId={videoIdRef.current}
                            currentTime={currentTime}
                            detectionMethod={detectionMethod}
                            onChordDetected={handleChordDetected}
                            enabled={autoDetectionEnabled}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default YouTubeRealtimeGenerate;
