import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GuitarChordDiagram from "@/components/chords/GuitarChordDiagram";
import PianoChordDiagram from "@/components/chords/PianoChordDiagram";
import { Play, Volume2 } from "lucide-react";
import { UserRole } from "./RoleSelectionModal";
import { getChordData } from "@/lib/chordDatabase";

interface ChordClickableTextProps {
    text: string;
    userRole: UserRole;
}

export const ChordClickableText = ({
    text,
    userRole,
}: ChordClickableTextProps) => {
    const [selectedChord, setSelectedChord] = useState<string | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    // Only guitarists and keyboardists can interact with chords
    if (userRole !== "guitarist" && userRole !== "keyboardist") {
        return <div className="whitespace-pre-wrap">{text}</div>;
    }

    const playChordSound = async (chord: string) => {
        try {
            if (!audioContext) {
                const ctx = new (window.AudioContext ||
                    (window as any).webkitAudioContext)();
                setAudioContext(ctx);

                // Resume audio context if needed
                if (ctx.state === "suspended") {
                    await ctx.resume();
                }
            }

            const chordData = getChordData(chord);
            if (!chordData?.notes) return;

            // Simple chord sound generation using Web Audio API
            const ctx = audioContext || new AudioContext();

            // Note frequencies (C4 = 261.63 Hz)
            const noteFrequencies: { [key: string]: number } = {
                C: 261.63,
                "C#": 277.18,
                D: 293.66,
                "D#": 311.13,
                E: 329.63,
                F: 349.23,
                "F#": 369.99,
                G: 392.0,
                "G#": 415.3,
                A: 440.0,
                "A#": 466.16,
                B: 493.88,
            };

            // Play each note in the chord
            chordData.notes.forEach((note, index) => {
                const frequency = noteFrequencies[note] || noteFrequencies["C"];
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.frequency.value = frequency;
                oscillator.type = "sine";

                // Stagger the notes slightly for a more natural sound
                const startTime = ctx.currentTime + index * 0.05;
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(
                    0.01,
                    startTime + 1.5
                );

                oscillator.start(startTime);
                oscillator.stop(startTime + 1.5);
            });
        } catch (error) {
            console.warn("Could not play chord sound:", error);
        }
    };

    // Parse text to find chord patterns (letters followed by optional modifiers)
    const parseTextWithChords = (text: string) => {
        const chordPattern =
            /\b([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)*(?:\/[A-G][#b]?)?)\b/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = chordPattern.exec(text)) !== null) {
            // Add text before the chord
            if (match.index > lastIndex) {
                parts.push({
                    type: "text",
                    content: text.slice(lastIndex, match.index),
                });
            }

            // Add the chord
            parts.push({
                type: "chord",
                content: match[1],
                fullMatch: match[0],
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            parts.push({
                type: "text",
                content: text.slice(lastIndex),
            });
        }

        return parts;
    };

    const parts = parseTextWithChords(text);

    return (
        <>
            <div className="whitespace-pre-wrap">
                {parts.map((part, index) =>
                    part.type === "chord" ? (
                        <button
                            key={index}
                            onClick={() => setSelectedChord(part.content)}
                            className="inline-block font-bold hover:bg-primary/20 rounded transition-colors cursor-pointer "
                        >
                            {part.fullMatch || part.content}
                        </button>
                    ) : (
                        <span key={index}>{part.content}</span>
                    )
                )}
            </div>

            <Dialog
                open={!!selectedChord}
                onOpenChange={() => setSelectedChord(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedChord} Chord
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    selectedChord &&
                                    playChordSound(selectedChord)
                                }
                                className="ml-auto"
                            >
                                <Play className="h-4 w-4 mr-1" />
                                Play
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedChord && (
                        <Tabs
                            defaultValue={
                                userRole === "guitarist" ? "guitar" : "piano"
                            }
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="guitar">Guitar</TabsTrigger>
                                <TabsTrigger value="piano">Piano</TabsTrigger>
                            </TabsList>

                            <TabsContent value="guitar" className="mt-4">
                                <GuitarChordDiagram chord={selectedChord} />
                            </TabsContent>

                            <TabsContent value="piano" className="mt-4">
                                <PianoChordDiagram chord={selectedChord} />
                            </TabsContent>
                        </Tabs>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
