import React, { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Music3 } from "lucide-react";

interface MetronomeWidgetProps {
    tempo: number;
    timeSignature?: string;
    isPlaying?: boolean;
    onTempoChange?: (tempo: number) => void;
    className?: string;
}

export const MetronomeWidget = ({
    tempo,
    timeSignature = "4/4",
    isPlaying = false,
    onTempoChange,
    className = "",
}: MetronomeWidgetProps) => {
    const [internalPlaying, setInternalPlaying] = useState(isPlaying);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [volume, setVolume] = useState([0.5]);
    const [tone, setTone] = useState([440]);
    const [muted, setMuted] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const beatsPerMeasure = useMemo(() => {
        if (!timeSignature || typeof timeSignature !== "string") return 4;
        const parts = timeSignature.split("/");
        const beats = parseInt(parts[0], 10);
        return isNaN(beats) || beats < 1 ? 4 : beats;
    }, [timeSignature]);

    const playMetronomeClick = async (isAccent = false) => {
        if (muted || volume[0] === 0) return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext ||
                    (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === "suspended") {
                await ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            const baseFrequency = tone[0];
            oscillator.frequency.value = isAccent
                ? baseFrequency * 1.5
                : baseFrequency;
            oscillator.type = "sine";

            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume[0] * 0.5, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            oscillator.start(now);
            oscillator.stop(now + 0.1);
        } catch (error) {
            console.warn("Could not play metronome sound:", error);
        }
    };

    useEffect(() => {
        if (internalPlaying) {
            const interval = 60000 / tempo;
            playMetronomeClick(true);
            setCurrentBeat(0);

            intervalRef.current = setInterval(() => {
                setCurrentBeat((prev) => {
                    const nextBeat = (prev + 1) % beatsPerMeasure;
                    playMetronomeClick(nextBeat === 0);
                    return nextBeat;
                });
            }, interval);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setCurrentBeat(0);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [internalPlaying, tempo, beatsPerMeasure]);

    useEffect(() => {
        setInternalPlaying(isPlaying);
    }, [isPlaying]);

    const togglePlay = () => {
        setInternalPlaying(!internalPlaying);
    };

    const toggleMute = () => {
        setMuted(!muted);
    };

    return (
        <Card
            // DIUBAH: Ganti warna background dan border agar sesuai tema gelap
            className={`${className} w-full h-auto bg-[#1A202C] border border-gray-700 flex flex-col justify-between`}
        >
            <CardContent className="p-4 space-y-4 flex flex-col justify-between h-full">
                {/* BPM & Beat Indicator */}
                <div className="flex flex-col items-center justify-center space-y-2 flex-grow">
                    <div className="flex items-center gap-2">
                        {onTempoChange && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    onTempoChange(Math.max(40, tempo - 5))
                                }
                                disabled={tempo <= 40}
                                // DIUBAH: Warna ikon agar terlihat di background gelap
                                className="h-7 w-7 text-gray-400 hover:text-white"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        {/* DIUBAH: Warna teks BPM menjadi putih */}
                        <div className="text-3xl font-mono font-extrabold tracking-tight text-white">
                            {tempo}
                        </div>
                        {onTempoChange && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    onTempoChange(Math.min(200, tempo + 5))
                                }
                                disabled={tempo >= 200}
                                // DIUBAH: Warna ikon agar terlihat di background gelap
                                className="h-7 w-7 text-gray-400 hover:text-white"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {/* DIUBAH: Warna teks label BPM */}
                    <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        BPM
                    </div>

                    <div className="flex justify-center gap-1 mt-2">
                        {Array.from(
                            { length: beatsPerMeasure },
                            (_, i) => i
                        ).map((beat) => (
                            <div
                                key={beat}
                                className={`w-8 h-8 rounded-full border-2 transition-all duration-100 ${
                                    currentBeat === beat && internalPlaying
                                        ? beat === 0
                                            ? "bg-sky-400 border-sky-400 scale-125" // Warna beat lebih cerah
                                            : "bg-sky-600 border-sky-600 scale-110" // Warna beat lebih cerah
                                        : "border-gray-600" // Warna border default untuk tema gelap
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Main Controls & Volume */}
                <div className="space-y-3 pt-2">
                    <Button
                        onClick={togglePlay}
                        // DIUBAH: Warna tombol Start/Stop agar kontras
                        className="w-full text-md font-semibold h-8 bg-sky-500 text-white hover:bg-sky-600"
                    >
                        {internalPlaying ? (
                            <Pause className="h-4 w-4 mr-1" />
                        ) : (
                            <Play className="h-4 w-4 mr-1" />
                        )}
                        {internalPlaying ? "Stop" : "Start"}
                    </Button>

                    <div className="flex items-center gap-2">
                        {/* DIUBAH: Warna ikon Tone */}
                        <Music3 className="h-4 w-4 text-gray-400" />
                        <Slider
                            value={tone}
                            onValueChange={setTone}
                            max={1000}
                            min={200}
                            step={50}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            // DIUBAH: Warna ikon mute
                            className="h-7 w-7 text-gray-400 hover:bg-gray-700"
                        >
                            {muted ? (
                                <VolumeX className="h-4 w-4 text-gray-400" />
                            ) : (
                                <Volume2 className="h-4 w-4 text-white" />
                            )}
                        </Button>
                        <Slider
                            value={muted ? [0] : volume}
                            onValueChange={(value) => {
                                setVolume(value);
                                if (muted) setMuted(false);
                            }}
                            max={1}
                            min={0}
                            step={0.1}
                            className="flex-1"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
