import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Metronome from "@/components/Metronome";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import DynamicNavigation from "@/components/DynamicNavigation";
import wholeRestImg from "@/assets/whole_rest.svg";
import halfRestImg from "@/assets/half_rest.svg";
import quarterRestImg from "@/assets/quarter_rest.svg";
import eighthRestImg from "@/assets/eighth_rest.svg";
import VisibilitySelector from "@/components/VisibilitySelector";
import { useLanguage } from "@/contexts/LanguageContext";
import {
    Music,
    Youtube,
    Grid,
    Settings,
    Plus,
    Minus,
    Save,
    FolderOpen,
    Trash2,
    Copy,
    Undo,
    Redo,
    Percent,
    X,
    Mic,
    ChevronUp,
    ChevronDown,
    PenTool,
} from "lucide-react";
import ImageChordImport from "@/components/chord-grid/ImageChordImport";
import TextModeEditor from "@/components/chord-grid/TextModeEditor";
import LiveChordPreview from "@/components/chord-grid/LiveChordPreview";
import TextModeConverter from "@/components/chord-grid/TextModeConverter";
import ChordSheetEditor from "@/components/chord-editor/ChordSheetEditor";
import SectionArrangementStep from "@/components/chord-grid/SectionArrangementStep";
import VocalistLyricsEditor from "@/components/chord-editor/VocalistLyricsEditor";
import Tesseract from "tesseract.js";
import HandwritingChordCanvas from "@/components/chord-grid/HandwritingChordCanvas";
import BlankGridCanvas from "@/components/chord-grid/BlankGridCanvas";
import GridTemplateSelector from "@/components/chord-grid/GridTemplateSelector";
import { useNavigate } from "react-router-dom";
import sixteenthRestImg from "@/assets/sixteenth_rest.svg";

import codaSign from "@/assets/coda_sign.svg";
import segno from "@/assets/segno.svg";
import FlexibleNoteEditor, {
    FlexibleNote,
} from "@/components/chord-grid/FlexibleNoteEditor";
import { NotationDisplay } from "@/components/chord-grid/NoteSymbols";
import { ValidationOverlay } from "@/components/validation/ValidationOverlay";
interface ChordBar {
    id: string;
    chord: string;
    chordAfter?: string;
    chordEnd?: string;
    beats: number;
    comment?: string;
    restType?: "WR" | "HR" | "QR" | "ER" | "SR" | "WR." | "HR." | "QR." | "ER." | "SR.";
    trailingRestType?: "WR" | "HR" | "QR" | "ER" | "SR" | "WR." | "HR." | "QR." | "ER." | "SR.";
    timestamp?: number; // Time in seconds when this bar starts
    noteSymbol?: string; // Musical note symbol to display above chord
    noteTypes?: Array<{
        type:
            | "whole_note"
            | "half_note"
            | "quarter_note"
            | "eighth_note"
            | "sixteenth_note";
        count: number;
    }>; // Track note types and their counts for time signature validation
    melody?: {
        notAngka?: string; // Number notation melody (1 2 3 4 5...)
    };
    ending?: {
        type: "1" | "2";
        isStart?: boolean;
        isEnd?: boolean;
    };
    musicalSigns?: {
        segno?: boolean;
        coda?: boolean;
        dsAlCoda?: boolean;
        dcAlCoda?: boolean;
        ds?: boolean;
        fine?: boolean;
        dcAlFine?: boolean;
    };
    fermata?: boolean;
    timeSignatureOverride?: TimeSignature; // Override time signature for this specific bar
    notes?: FlexibleNote[]; // Flexible note system with different note types per beat
}
interface ChordSection {
    id: string;
    name: string;
    timeSignature: TimeSignature;
    bars: ChordBar[];
    isExpanded: boolean;
    barCount: number; // Add bar count to track desired number of bars
    showMelody?: boolean; // Toggle to show/hide melody for this section
    showNoteTypes?: boolean; // Toggle to show/hide note type inputs for this section
    position?: number;
}
type TimeSignature =
    | "2/4"
    | "3/4"
    | "4/4"
    | "5/4"
    | "6/8"
    | "7/8"
    | "9/8"
    | "12/8"
    | "2/2";
type ViewMode = "basic" | "intermediate" | "pro";
type EditorMode = "grid" | "text" | "handwriting" | "blank-canvas" | "selector" | "image-upload";

const ChordGridGenerator = () => {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user } = useUserRole();
    const [searchParams] = useSearchParams();

    const updateChordAfter = (
        sectionId: string,
        barId: string,
        chord: string,
    ) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) =>
                              bar.id === barId
                                  ? { ...bar, chordAfter: chord }
                                  : bar,
                          ),
                      }
                    : section,
            ),
        );
    };

    const updateChordEnd = (
        sectionId: string,
        barId: string,
        chord: string,
    ) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) =>
                              bar.id === barId
                                  ? { ...bar, chordEnd: chord }
                                  : bar,
                          ),
                      }
                    : section,
            ),
        );
    };

    const handleKeyDown = (
        e: React.KeyboardEvent,
        sectionId: string,
        barId: string,
        pos: "primary" | "after" | "end",
    ) => {
        const section = sections.find((s) => s.id === sectionId);
        if (!section) return;

        const barIndex = section.bars.findIndex((b) => b.id === barId);
        const bar = section.bars[barIndex];

        // NAVIGASI KE KANAN
        if (e.key === "ArrowRight") {
            const input = e.currentTarget as HTMLInputElement;
            // Hanya pindah jika kursor berada di akhir teks
            if (input.selectionStart === input.value.length) {
                if (pos === "primary" && bar.restType) {
                    // Jika di input 1 dan ada rest, pindah ke input 2 (after)
                    e.preventDefault();
                    inputRefs.current[`${barId}-after`]?.focus();
                } else if (pos === "after" && bar.trailingRestType) {
                    // Tambahkan logika ini
                    e.preventDefault();
                    inputRefs.current[`${barId}-end`]?.focus();
                } else if (barIndex < section.bars.length - 1) {
                    // Jika sudah di akhir bar, pindah ke bar berikutnya
                    e.preventDefault();
                    const nextBarId = section.bars[barIndex + 1].id;
                    inputRefs.current[`${nextBarId}-primary`]?.focus();
                }
            }
        }

        // NAVIGASI KE KIRI
        if (e.key === "ArrowLeft") {
            const input = e.currentTarget as HTMLInputElement;
            // Hanya pindah jika kursor berada di awal teks
            if (input.selectionStart === 0) {
                if (pos === "after") {
                    // Dari input 2 balik ke input 1
                    e.preventDefault();
                    inputRefs.current[`${barId}-primary`]?.focus();
                } else if (barIndex > 0) {
                    // Pindah ke bar sebelumnya
                    e.preventDefault();
                    const prevBar = section.bars[barIndex - 1];
                    const targetKey = prevBar.restType
                        ? `${prevBar.id}-after`
                        : `${prevBar.id}-primary`;
                    inputRefs.current[targetKey]?.focus();
                }
            }
        }

        if (e.key === "Enter") {
            e.preventDefault();
            enterBarToSection(sectionId);
        }
    };

    // Core state
    const [sections, setSections] = useState<ChordSection[]>([
        {
            id: "1",
            name: "Intro",
            timeSignature: "4/4",
            bars: [
                {
                    id: "1-1",
                    chord: "",
                    beats: 4,
                },
                {
                    id: "1-2",
                    chord: "",
                    beats: 4,
                },
                {
                    id: "1-3",
                    chord: "",
                    beats: 4,
                },
                {
                    id: "1-4",
                    chord: "",
                    beats: 4,
                },
            ],
            isExpanded: true,
            barCount: 4,
            position: 1,
        },
    ]);

    // Settings
    const [isInfoLocked, setIsInfoLocked] = useState(false);
    const [songTitle, setSongTitle] = useState("");
    const [artistName, setArtistName] = useState("");
    const [songKey, setSongKey] = useState("C");
    const [tempo, setTempo] = useState(120);
    const [timeSignature, setTimeSignature] = useState<TimeSignature>("4/4");
    const [barsPerLine, setBarsPerLine] = useState(4);
    const [viewMode, setViewMode] = useState<ViewMode>("basic");
    const [capo, setCapo] = useState(0);

    const [visibility, setVisibility] = useState<"public" | "private">(
        "private",
    );
    const [isAlreadyPublic, setIsAlreadyPublic] = useState(false);
    const [originalCreatorId, setOriginalCreatorId] = useState<string | null>(
        null,
    );
    
    // NEW: State for creator type and visibility lock
    const [creatorType, setCreatorType] = useState<string | null>(null);
    const [isVisibilityLockedToPrivate, setIsVisibilityLockedToPrivate] = useState(false);
    const [duplicateLockReason, setDuplicateLockReason] = useState<string>("");
    
    // Only creator_professional can publish chord grids
    const canPublishChordGrid = creatorType === "creator_professional";

    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
    const [showVideoPreview, setShowVideoPreview] = useState(false);
    const navigate = useNavigate();

    const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

    // UI state
    const [showBarNumbers, setShowBarNumbers] = useState(false);
    const [showChordDiagrams, setShowChordDiagrams] = useState(false);

    // YouTube Player state
    const [showYouTubePlayer, setShowYouTubePlayer] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [volume, setVolume] = useState(100);
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);

    // Chord timing state
    const [chordTimestamps, setChordTimestamps] = useState<
        Record<string, number>
    >({});
    const [isRecordingMode, setIsRecordingMode] = useState(false);

    // Save/Load state
    const [currentChordGridId, setCurrentChordGridId] = useState<string | null>(
        null,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [savedChordGrids, setSavedChordGrids] = useState<any[]>([]);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const keys = [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
    ];

    const enharmonicMap: { [key: string]: string } = {
        Db: "C#",
        Eb: "D#",
        Gb: "F#",
        Ab: "G#",
        Bb: "A#",
    };

    const [showMelodyTemplates, setShowMelodyTemplates] = useState(false);
    const [selectedBar, setSelectedBar] = useState<{
        sectionId: string;
        barId: string;
    } | null>(null);

    // OCR state
    const [ocrImage, setOcrImage] = useState<File | null>(null);
    const [ocrProgress, setOcrProgress] = useState<number>(0);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [ocrText, setOcrText] = useState<string>("");

    // Text Mode state
    const [editorMode, setEditorMode] = useState<EditorMode>("grid");
    const [textModeContent, setTextModeContent] = useState<string>("");

    // History management for undo/redo
    const [history, setHistory] = useState<ChordSection[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Selected bars for group operations
    const [selectedBars, setSelectedBars] = useState<Set<string>>(new Set());

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);

    // Animation state for new sections
    const [newSectionId, setNewSectionId] = useState<string | null>(null);

    // Enhanced chord sheet data for the new editor
    const [chordSheetData, setChordSheetData] = useState<any>(null);
    const [showChordSheetEditor, setShowChordSheetEditor] = useState(false);

    // Section arrangement step
    // const [showArrangementStep, setShowArrangementStep] = useState(false);
    // const [currentSections, setCurrentSections] = useState<ChordSection[]>([]);
    // const [currentSectionsForView, setCurrentSectionsForView] = useState<
    //   ChordSection[]
    // >([]);

    // Validation overlay state
    const [showValidationOverlay, setShowValidationOverlay] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        allPassed: boolean;
        results?: Record<string, { passed: boolean; error?: string }>;
    } | null>(null);

    // Vocalist lyrics editor state
    const [showVocalistLyricsEditor, setShowVocalistLyricsEditor] = useState<
        string | null
    >(null);
    const [vocalistLyrics, setVocalistLyrics] = useState<
        Record<string, string>
    >({});

    // Fetch creator type on mount
    useEffect(() => {
        const fetchCreatorType = async () => {
            if (!user) return;
            try {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("creator_type")
                    .eq("user_id", user.id)
                    .single();
                if (profile) {
                    setCreatorType(profile.creator_type);
                }
            } catch (error) {
                console.error("Error fetching creator type:", error);
            }
        };
        fetchCreatorType();
    }, [user]);

    useEffect(() => {
        const checkMobile = () => {
            // Gunakan 1024 agar iPad Pro/Air masuk kategori mobile
            setIsMobile(window.innerWidth <= 1024);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Initialize chord sheet data when sections change
    useEffect(() => {
        setChordSheetData({
            tempo: tempo,
            time_signature: timeSignature,
            sections: sections.map((section) => ({
                name: section.name,
                start_time: "0:00",
                end_time: "0:30",
                bars: section.bars.length,
                bar_structure: "| / / / |",
                rows: Math.ceil(section.bars.length / 4), // Default to 4 bars per row
            })),
            metadata: {
                title: songTitle || t("chordGrid.untitled"),
                artist: artistName || "Unknown Artist",
                key: songKey,
                duration: "3:00",
                confidence: 0.85,
            },
        });
    }, [sections, tempo, timeSignature, songTitle, artistName, songKey]);

    // History Management
    const saveToHistory = (newSections: ChordSection[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newSections)));

        // Limit history to last 50 actions
        if (newHistory.length > 50) {
            newHistory.shift();
        } else {
            setHistoryIndex(historyIndex + 1);
        }

        setHistory(newHistory);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setSections(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setSections(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    // Enhanced Bar Operations
    const addSingleBar = (sectionId: string) => {
        const newSections = sections.map((section) => {
            if (section.id !== sectionId) return section;

            // Find the first empty bar to activate/focus, otherwise add new bar
            const emptyBarIndex = section.bars.findIndex(
                (bar) => !bar.chord || bar.chord.trim() === "",
            );

            if (emptyBarIndex !== -1) {
                // Select/focus the first empty bar (just keep as is since it's already there)
                return section;
            } else {
                // No empty bars, add a new bar
                return {
                    ...section,
                    bars: [
                        ...section.bars,
                        {
                            id: `${section.id}-${section.bars.length + 1}`,
                            chord: "",
                            beats: getBeatsForTimeSignature(
                                section.timeSignature,
                            ),
                        },
                    ],
                    barCount: section.bars.length + 1,
                };
            }
        });
        saveToHistory(sections);
        setSections(newSections);
    };

    const repeatLastBar = (sectionId: string) => {
        const newSections = sections.map((section) => {
            if (section.id !== sectionId || section.bars.length === 0)
                return section;

            // Find the last non-empty bar
            const lastFilledBarIndex = section.bars
                .slice()
                .reverse()
                .findIndex((bar) => bar.chord && bar.chord.trim() !== "");
            if (lastFilledBarIndex === -1) return section;

            const actualLastFilledIndex =
                section.bars.length - 1 - lastFilledBarIndex;
            const lastBar = section.bars[actualLastFilledIndex];

            // Find the first empty bar to fill, otherwise add new bar
            const emptyBarIndex = section.bars.findIndex(
                (bar) => !bar.chord || bar.chord.trim() === "",
            );

            if (emptyBarIndex !== -1) {
                // Fill the first empty bar with the last bar's content
                const newBars = [...section.bars];
                newBars[emptyBarIndex] = {
                    ...lastBar,
                    id: newBars[emptyBarIndex].id, // Keep the original ID
                };
                return {
                    ...section,
                    bars: newBars,
                };
            } else {
                // No empty bars, add a new bar
                const newBar = {
                    ...lastBar,
                    id: `${section.id}-${section.bars.length + 1}`,
                };
                return {
                    ...section,
                    bars: [...section.bars, newBar],
                    barCount: section.bars.length + 1,
                };
            }
        });
        saveToHistory(sections);
        setSections(newSections);
    };

    // const addRepeatSign = (sectionId: string) => {
    //     const newSections = sections.map((section) => {
    //         if (section.id !== sectionId) return section;

    //         // Find the first empty bar (no chord) to fill, otherwise add new bar
    //         const emptyBarIndex = section.bars.findIndex(bar => !bar.chord || bar.chord.trim() === '');

    //         if (emptyBarIndex !== -1) {
    //             // Fill the first empty bar with repeat sign
    //             const newBars = [...section.bars];
    //             newBars[emptyBarIndex] = {
    //                 ...newBars[emptyBarIndex],
    //                 chord: "%",
    //                 comment: "Repeat previous bar",
    //             };
    //             return {
    //                 ...section,
    //                 bars: newBars,
    //             };
    //         } else {
    //             // No empty bars, add a new bar
    //             return {
    //                 ...section,
    //                 bars: [
    //                     ...section.bars,
    //                     {
    //                         id: `${section.id}-${section.bars.length + 1}`,
    //                         chord: "%",
    //                         beats: getBeatsForTimeSignature(section.timeSignature),
    //                         comment: "Repeat previous bar",
    //                     },
    //                 ],
    //                 barCount: section.bars.length + 1,
    //             };
    //         }
    //     });
    //     saveToHistory(sections);
    //     setSections(newSections);
    // };

    const addRepeatSign = (sectionId: string) => {
        // Jika tidak ada bar yang dipilih, beri peringatan
        if (selectedBars.size === 0) {
            toast({
                title: "Pilih Bar",
                description:
                    "Klik pada kotak bar terlebih dahulu untuk memasukkan simbol %",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id !== sectionId) return section;

            const newBars = section.bars.map((bar) => {
                // Jika ID bar ada di dalam Set selectedBars, isi dengan %
                if (selectedBars.has(bar.id)) {
                    return {
                        ...bar,
                        chord: "%",
                        comment: "Repeat previous bar",
                    };
                }
                return bar;
            });

            return { ...section, bars: newBars };
        });

        saveToHistory(sections);
        setSections(newSections);
        // Opsional: hilangkan seleksi setelah input jika ingin
        // setSelectedBars(new Set());
    };

    // Additional shortcuts
    const addBarRest = (
        sectionId: string,
        // UPDATE PARAMETER INI:
        restType:
            | "whole_rest"
            | "half_rest"
            | "quarter_rest"
            | "eighth_rest"
            | "sixteenth_rest"
            | "dotted_whole_rest"
            | "dotted_half_rest"
            | "dotted_quarter_rest"
            | "dotted_eighth_rest"
            | "dotted_sixteenth_rest",
    ) => {
        if (selectedBars.size === 0) {
            toast({
                title: "Pilih Bar",
                description: "Klik kotak bar-nya dulu",
            });
            return;
        }

        const newSections: ChordSection[] = sections.map((section) => {
            if (section.id === sectionId) {
                return {
                    ...section,
                    bars: section.bars.map((bar) => {
                        if (selectedBars.has(bar.id)) {
                            // UPDATE MAPPING INI:
                            const restMap: Record<string, any> = {
                                whole_rest: "WR",
                                half_rest: "HR",
                                quarter_rest: "QR",
                                eighth_rest: "ER",
                                sixteenth_rest: "SR",
                                dotted_whole_rest: "WR.",
                                dotted_half_rest: "HR.",
                                dotted_quarter_rest: "QR.",
                                dotted_eighth_rest: "ER.",
                                dotted_sixteenth_rest: "SR.",
                            };

                            let restCode = restMap[restType] || "QR";

                            if (bar.restType) {
                                return { ...bar, trailingRestType: restCode };
                            }
                            return { ...bar, restType: restCode };
                        }
                        return bar;
                    }),
                };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
    };
    // Helper function to get note duration in beats based on time signature
    const getNoteBeats = (
        noteType: string,
        timeSignature: TimeSignature,
    ): number => {
        const denominator = parseInt(timeSignature.split("/")[1]);

        const baseValues = {
            whole_note: 4,
            half_note: 2,
            quarter_note: 1,
            eighth_note: 0.5,
            sixteenth_note: 0.25,
        };

        // PERBAIKAN: Jika denominator 8, multiplier harus 2 agar Eighth Note (0.5) jadi 1 beat.
        const multiplier = denominator / 4;

        return baseValues[noteType as keyof typeof baseValues] * multiplier;
    };

    // Calculate current total beats used in a bar
    const getBarUsedBeats = (
        bar: ChordBar,
        timeSignature: TimeSignature,
    ): number => {
        if (!bar.noteTypes || bar.noteTypes.length === 0) return 0;

        return bar.noteTypes.reduce((total, noteTypeEntry) => {
            const noteBeats = getNoteBeats(noteTypeEntry.type, timeSignature);
            return total + noteBeats * noteTypeEntry.count;
        }, 0);
    };

    // Check if adding a note type would exceed time signature limit
    const canAddNoteType = (
        bar: ChordBar,
        noteType: string,
        timeSignature: TimeSignature,
    ): boolean => {
        const maxBeats = getBeatsForTimeSignature(timeSignature);
        const currentBeats = getBarUsedBeats(bar, timeSignature);
        const newNoteBeats = getNoteBeats(noteType, timeSignature);

        return currentBeats + newNoteBeats <= maxBeats;
    };

    // Add note symbols function with time signature validation
    const addNoteSymbol = (
        sectionId: string,
        noteType:
            | "whole_note"
            | "half_note"
            | "quarter_note"
            | "eighth_note"
            | "sixteenth_note",
    ) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to add note",
                variant: "destructive",
            });
            return;
        }

        const section = sections.find((s) => s.id === sectionId);
        if (!section) return;

        // Validate all selected bars first
        const selectedBarsList = Array.from(selectedBars);
        const invalidBars = [];

        for (const barId of selectedBarsList) {
            const bar = section.bars.find((b) => b.id === barId);
            if (bar && !canAddNoteType(bar, noteType, section.timeSignature)) {
                invalidBars.push(barId);
            }
        }

        if (invalidBars.length > 0) {
            const maxBeats = getBeatsForTimeSignature(section.timeSignature);
            toast({
                title: "Time Signature Limit Exceeded",
                description: `Adding ${noteType.replace(
                    "_",
                    " ",
                )} would exceed ${
                    section.timeSignature
                } time signature limit (${maxBeats} beats). ${
                    invalidBars.length
                } bar(s) affected.`,
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((currentSection) => {
            if (currentSection.id === sectionId) {
                const newBars = [...currentSection.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                let noteSymbol = "WN";
                if (noteType === "whole_note") noteSymbol = "WN";
                else if (noteType === "half_note") noteSymbol = "HN";
                else if (noteType === "quarter_note") noteSymbol = "QN";
                else if (noteType === "eighth_note") noteSymbol = "EN";
                else if (noteType === "sixteenth_note") noteSymbol = "SN";

                selectedBarIndices.forEach((index) => {
                    const currentBar = newBars[index];
                    const baseChord = currentBar.chord.split(" ")[0] || "—";
                    let autoChord = currentBar.chord;

                    if (noteType === "whole_note") {
                        autoChord = `${baseChord} . . .`; // Otomatis isi 3 titik
                    } else if (noteType === "half_note") {
                        autoChord = `${baseChord} .`; // Otomatis isi 1 titik
                    } else if (noteType === "quarter_note") {
                        autoChord = baseChord;
                    } else if (noteType === "eighth_note") {
                        autoChord = `${baseChord} /`; // Gunakan slash sebagai penanda rapat
                    } else if (noteType === "sixteenth_note") {
                        autoChord = `${baseChord} / / /`;
                    }
                    const existingNoteTypes = currentBar.noteTypes || [];

                    // Find existing entry for this note type or create new one
                    const existingIndex = existingNoteTypes.findIndex(
                        (nt) => nt.type === noteType,
                    );
                    let updatedNoteTypes;

                    if (existingIndex >= 0) {
                        // Increment count of existing note type
                        updatedNoteTypes = [...existingNoteTypes];
                        updatedNoteTypes[existingIndex] = {
                            ...updatedNoteTypes[existingIndex],
                            count: updatedNoteTypes[existingIndex].count + 1,
                        };
                    } else {
                        // Add new note type
                        updatedNoteTypes = [
                            ...existingNoteTypes,
                            { type: noteType, count: 1 },
                        ];
                    }

                    // Update note symbol to show combination
                    const symbolString = updatedNoteTypes
                        .map((nt) => {
                            const symbols = {
                                whole_note: "WN",
                                half_note: "HN",
                                quarter_note: "QN",
                                eighth_note: "EN",
                                sixteenth_note: "SN",
                            };
                            return nt.count > 1
                                ? `${symbols[nt.type]}×${nt.count}`
                                : symbols[nt.type];
                        })
                        .join(" ");

                    newBars[index] = {
                        ...currentBar,
                        chord: autoChord,
                        noteSymbol: symbolString,
                        noteTypes: updatedNoteTypes,
                        comment: `${(
                            currentBar.comment || ""
                        ).trim()} note`.trim(),
                    };
                });

                return {
                    ...currentSection,
                    bars: newBars,
                };
            }

            return currentSection;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Note Added",
            description: `Added ${noteType.replace("_", " ")} to ${
                selectedBars.size
            } bar(s)`,
        });
    };

    // Clear note types from selected bars
    const clearNoteTypes = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select bars to clear note types",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    const { noteTypes, noteSymbol, ...barWithoutNotes } =
                        newBars[index];
                    newBars[index] = barWithoutNotes;
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Notes Cleared",
            description: `Cleared note types from ${selectedBars.size} bar(s)`,
        });
    };

    // Get available note types based on time signature and current bar usage
    const getAvailableNoteTypes = (
        bar: ChordBar,
        timeSignature: TimeSignature,
    ) => {
        const allNoteTypes = [
            {
                value: "note_whole_note",
                label: "Whole Note",
                symbol: "WN",
                beats: getNoteBeats("whole_note", timeSignature),
            },
            {
                value: "note_half_note",
                label: "Half Note",
                symbol: "HN",
                beats: getNoteBeats("half_note", timeSignature),
            },
            {
                value: "note_quarter_note",
                label: "Quarter Note",
                symbol: "QN",
                beats: getNoteBeats("quarter_note", timeSignature),
            },
            {
                value: "note_eighth_note",
                label: "Eighth Note",
                symbol: "EN",
                beats: getNoteBeats("eighth_note", timeSignature),
            },
            {
                value: "note_sixteenth_note",
                label: "Sixteenth Note",
                symbol: "SN",
                beats: getNoteBeats("sixteenth_note", timeSignature),
            },
        ];

        return allNoteTypes.filter((noteType) => {
            const noteTypeKey = noteType.value.replace("note_", "");
            return canAddNoteType(bar, noteTypeKey, timeSignature);
        });
    };

    const addSlashNotation = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to add slash notation",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        chord: `${(
                            newBars[index].chord || ""
                        ).trim()} / /`.trim(),
                        comment: `${(
                            newBars[index].comment || ""
                        ).trim()} slash`.trim(),
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Slash Notation Added",
            description: `Appended slash notation to ${selectedBars.size} bar(s)`,
        });
    };

    const addFirstEnding = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select bars to mark as first ending",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1)
                    .sort((a, b) => a - b);

                if (selectedBarIndices.length > 0) {
                    // Clear any existing endings first
                    selectedBarIndices.forEach((index) => {
                        newBars[index] = {
                            ...newBars[index],
                            ending: undefined,
                        };
                    });

                    // Only set isStart and isEnd for the first and last bars of contiguous sequences
                    const contiguousRanges = [];
                    let currentRange = [selectedBarIndices[0]];

                    for (let i = 1; i < selectedBarIndices.length; i++) {
                        if (
                            selectedBarIndices[i] ===
                            selectedBarIndices[i - 1] + 1
                        ) {
                            currentRange.push(selectedBarIndices[i]);
                        } else {
                            contiguousRanges.push(currentRange);
                            currentRange = [selectedBarIndices[i]];
                        }
                    }
                    contiguousRanges.push(currentRange);

                    // Apply ending markers for each contiguous range
                    contiguousRanges.forEach((range) => {
                        range.forEach((index, i) => {
                            newBars[index] = {
                                ...newBars[index],
                                ending: {
                                    type: "1",
                                    isStart: i === 0,
                                    isEnd: i === range.length - 1,
                                },
                            };
                        });
                    });
                }

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "First Ending Added",
            description: `Marked ${selectedBars.size} bar(s) as first ending`,
        });
    };

    const addSecondEnding = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select bars to mark as second ending",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1)
                    .sort((a, b) => a - b);

                if (selectedBarIndices.length > 0) {
                    // Clear any existing endings first
                    selectedBarIndices.forEach((index) => {
                        newBars[index] = {
                            ...newBars[index],
                            ending: undefined,
                        };
                    });

                    // Only set isStart and isEnd for the first and last bars of contiguous sequences
                    const contiguousRanges = [];
                    let currentRange = [selectedBarIndices[0]];

                    for (let i = 1; i < selectedBarIndices.length; i++) {
                        if (
                            selectedBarIndices[i] ===
                            selectedBarIndices[i - 1] + 1
                        ) {
                            currentRange.push(selectedBarIndices[i]);
                        } else {
                            contiguousRanges.push(currentRange);
                            currentRange = [selectedBarIndices[i]];
                        }
                    }
                    contiguousRanges.push(currentRange);

                    // Apply ending markers for each contiguous range
                    contiguousRanges.forEach((range) => {
                        range.forEach((index, i) => {
                            newBars[index] = {
                                ...newBars[index],
                                ending: {
                                    type: "2",
                                    isStart: i === 0,
                                    isEnd: i === range.length - 1,
                                },
                            };
                        });
                    });
                }

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Second Ending Added",
            description: `Marked ${selectedBars.size} bar(s) as second ending`,
        });
    };

    const addSegno = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to mark with Segno sign",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        musicalSigns: {
                            ...newBars[index].musicalSigns,
                            segno: true,
                        },
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Segno Added",
            description: `Marked ${selectedBars.size} bar(s) with Segno sign`,
        });
    };

    const addCoda = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to mark with Coda sign",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        musicalSigns: {
                            ...newBars[index].musicalSigns,
                            coda: true,
                        },
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Coda Added",
            description: `Marked ${selectedBars.size} bar(s) with Coda sign`,
        });
    };

    const addDSAlCoda = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to mark with D.S. al Coda",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        musicalSigns: {
                            ...newBars[index].musicalSigns,
                            dsAlCoda: true,
                        },
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "D.S. al Coda Added",
            description: `Marked ${selectedBars.size} bar(s) with D.S. al Coda`,
        });
    };

    const addDS = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to mark with D.S.",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        musicalSigns: {
                            ...newBars[index].musicalSigns,
                            ds: true,
                        },
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "D.S. Added",
            description: `Marked ${selectedBars.size} bar(s) with D.S.`,
        });
    };

    const addDCAlCoda = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to mark with D.C. al Coda",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        musicalSigns: {
                            ...newBars[index].musicalSigns,
                            dcAlCoda: true,
                        },
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "D.C. al Coda Added",
            description: `Marked ${selectedBars.size} bar(s) with D.C. al Coda`,
        });
    };

    const addTimeSignature = (
        sectionId: string,
        newTimeSignature: TimeSignature,
    ) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select bars to change time signature",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1);

                selectedBarIndices.forEach((index) => {
                    newBars[index] = {
                        ...newBars[index],
                        timeSignatureOverride: newTimeSignature,
                        beats: getBeatsForTimeSignature(newTimeSignature),
                    };
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Time Signature Changed",
            description: `Changed time signature for ${selectedBars.size} bar(s) to ${newTimeSignature}`,
        });
    };

    const removeEnding = (sectionId: string, endingType: "1" | "2") => {
        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = section.bars.map((bar) => {
                    if (bar.ending && bar.ending.type === endingType) {
                        const { ending, ...barWithoutEnding } = bar;
                        return barWithoutEnding;
                    }
                    return bar;
                });

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);

        toast({
            title: `${endingType === "1" ? "First" : "Second"} Ending Removed`,
            description: `Removed all ${
                endingType === "1" ? "first" : "second"
            } ending markers from section`,
        });
    };

    const addRepeatStartMarker = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to add a repeat start marker",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1)
                    .sort((a, b) => a - b);

                if (selectedBarIndices.length > 0) {
                    const firstIndex = selectedBarIndices[0];
                    newBars[firstIndex] = {
                        ...newBars[firstIndex],
                        chord: `||: ${newBars[firstIndex].chord || ""}`.trim(),
                    };
                }

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Repeat Start Added",
            description: "||: marker added",
        });
    };

    const addRepeatEndMarker = (sectionId: string) => {
        if (selectedBars.size === 0) {
            toast({
                title: "No Selection",
                description: "Please select a bar to add a repeat end marker",
                variant: "destructive",
            });
            return;
        }

        const newSections = sections.map((section) => {
            if (section.id === sectionId) {
                const newBars = [...section.bars];
                const selectedBarIndices = Array.from(selectedBars)
                    .map((barId) =>
                        newBars.findIndex((bar) => bar.id === barId),
                    )
                    .filter((index) => index !== -1)
                    .sort((a, b) => a - b);

                if (selectedBarIndices.length > 0) {
                    const lastIndex =
                        selectedBarIndices[selectedBarIndices.length - 1];
                    newBars[lastIndex] = {
                        ...newBars[lastIndex],
                        chord: `${newBars[lastIndex].chord || ""} :||`.trim(),
                        comment: `${
                            newBars[lastIndex].comment || ""
                        } (1x)`.trim(),
                    };
                }

                return { ...section, bars: newBars };
            }
            return section;
        });

        saveToHistory(sections);
        setSections(newSections);
        setSelectedBars(new Set());

        toast({
            title: "Repeat End Added",
            description: ":|| marker added",
        });
    };

    const toggleBarSelection = (barId: string, event?: React.MouseEvent) => {
        // Jika yang diklik adalah element INPUT, biarkan fokus tapi tetap select bar tersebut
        if (event?.target instanceof HTMLInputElement) {
            if (!isMobile) {
                setSelectedBars(new Set([barId]));
            } else {
                // Di mobile, klik input juga menambah seleksi agar konsisten
                const newSelection = new Set(selectedBars);
                newSelection.add(barId);
                setSelectedBars(newSelection);
            }
            return;
        }

        const newSelection = new Set(selectedBars);

        if (isMobile) {
            // LOGIKA BARU MOBILE: Toggle Persistent Selection
            // Klik bar 1 (select), klik bar 2 (bar 1 & 2 select), klik bar 1 lagi (unselect bar 1)
            if (newSelection.has(barId)) {
                newSelection.delete(barId);
            } else {
                newSelection.add(barId);
            }
        } else {
            // Logika Desktop: Gunakan Ctrl/Meta untuk multi-select
            if (!event?.ctrlKey && !event?.metaKey) {
                newSelection.clear();
            }
            if (newSelection.has(barId)) {
                newSelection.delete(barId);
            } else {
                newSelection.add(barId);
            }
        }

        setSelectedBars(newSelection);

        // Fokus ke input hanya jika bukan sedang unselect
        if (newSelection.has(barId)) {
            setTimeout(() => {
                inputRefs.current[`${barId}-primary`]?.focus();
            }, 0);
        }
    };

    // Format chord with superscript numbers
    const formatChordWithSuperscript = (chord: string) => {
        if (!chord) return chord;

        // Match chord patterns like A11, C13, F#maj7, etc.
        const chordPattern = /^([A-G][#b]?)(.*)$/;
        const match = chord.match(chordPattern);

        if (!match) return chord;

        const [, root, extension] = match;

        // Extract numbers that should be superscript
        const numberPattern = /(\d+)/g;
        const formattedExtension = extension.replace(numberPattern, (num) => {
            return `<sup>${num}</sup>`;
        });

        return `${root}${formattedExtension}`;
    };

    // Sync between modes
    const handleModeSwitch = (newMode: EditorMode) => {
        if (newMode === "text" && editorMode === "grid") {
            // Convert grid to text
            const textContent = TextModeConverter.sectionsToText(sections);
            setTextModeContent(textContent);
        } else if (newMode === "grid" && editorMode === "text") {
            // Convert text to grid
            const gridSections =
                TextModeConverter.textToSections(textModeContent);
            setSections(
                gridSections.map((section) => ({
                    ...section,
                    timeSignature: section.timeSignature as TimeSignature,
                })),
            );
        }
        setEditorMode(newMode);
    };

    const handleTextModeChange = (newContent: string) => {
        setTextModeContent(newContent);
        // Auto-sync to grid mode when text changes
        if (newContent.trim()) {
            const gridSections = TextModeConverter.textToSections(newContent);
            setSections(
                gridSections.map((section) => ({
                    ...section,
                    timeSignature: section.timeSignature as TimeSignature,
                })),
            );
        }
    };

    // Helper function to get beats for time signature
    const getBeatsForTimeSignature = (timeSig: TimeSignature): number => {
        switch (timeSig) {
            case "2/4":
                return 2;
            case "3/4":
                return 3;
            case "4/4":
                return 4;
            case "5/4":
                return 5;
            case "6/8":
                return 6;
            case "7/8":
                return 7;
            case "9/8":
                return 9;
            case "12/8":
                return 12;
            case "2/2":
                return 2;
            default:
                return 4;
        }
    };

    // Extract YouTube video ID from URL
    const extractVideoId = (url: string): string | null => {
        const regex =
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    // Generate YouTube thumbnail URL
    const getVideoThumbnail = (videoId: string): string => {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    };

    // Initialize history when sections are first loaded
    useEffect(() => {
        if (sections.length > 0 && history.length === 0) {
            setHistory([JSON.parse(JSON.stringify(sections))]);
            setHistoryIndex(0);
        }
    }, [sections, history.length]);

    // Load saved chord grids when component mounts
    useEffect(() => {
        if (user) {
            loadSavedChordGrids();

            // Check if we need to load a specific song
            const songId = searchParams.get("songId");
            const currentChordGridIdParam =
                searchParams.get("currentChordGridId");

            if (songId) {
                loadSongForEditing(songId);
            } else if (currentChordGridIdParam) {
                loadSongForEditing(currentChordGridIdParam);
                setCurrentChordGridId(currentChordGridIdParam);
            }
        }
    }, [user, searchParams]);

    const loadSongForEditing = async (songId: string) => {
        try {
            const { data: song, error } = await supabase
                .from("songs")
                .select(
                    `
                    *,
                    sections:song_sections(*),
                    arrangements:arrangements(*)
                `,
                )
                .eq("id", songId)
                .single();

            if (error || !song) {
                toast({
                    title: "Error",
                    description: "Could not load song for editing.",
                    variant: "destructive",
                });
                return;
            }

            // Populate form with basic song data
            setSongTitle(song.title || "");
            setArtistName(song.artist || "");
            setSongKey(song.current_key || "C");
            setTempo(song.tempo || 120);
            setTimeSignature((song.time_signature as TimeSignature) || "4/4");
            setCapo(song.capo || 0);
            setYoutubeUrl(song.youtube_link || "");
            setVisibility(song.is_public ? "public" : "private");
            setIsAlreadyPublic(song.is_public);
            setOriginalCreatorId(song.original_creator_id);

            if (song.theme === "chord_grid" && song.sections?.length > 0) {
                const convertedSections = song.sections.map((section: any) => {
                    let bars: ChordBar[] = [];

                    try {
                        if (section.lyrics && section.lyrics.startsWith("[")) {
                            bars = JSON.parse(section.lyrics);
                        }
                    } catch (e) {
                        console.error(
                            "Failed to parse bars JSON for section:",
                            section.id,
                            e,
                        );
                        bars = [];
                    }

                    const arrangement = song.arrangements?.find(
                        (a: any) => a.section_id === section.id,
                    );

                    return {
                        id: section.id,
                        name: section.name || "Section",
                        timeSignature: section.section_time_signature || "4/4",
                        bars,
                        isExpanded: true,
                        barCount: bars.length,
                        position: arrangement?.position ?? 0,
                        repeatCount: arrangement?.repeat_count ?? 1,
                        notes: arrangement?.notes || "",
                    };
                });

                const sortedSections = convertedSections.sort(
                    (a, b) => a.position - b.position,
                );

                setSections(sortedSections);

                // Load vocalist lyrics from the chords field
                const lyricsData: Record<string, string> = {};
                song.sections.forEach((section: any) => {
                    if (section.chords && section.chords.trim()) {
                        lyricsData[section.id] = section.chords;
                    }
                });
                setVocalistLyrics(lyricsData);
            } else {
                console.log(
                    "Song is not in chord_grid format or has no sections.",
                );
            }

            setCurrentChordGridId(song.id);

            toast({
                title: "Song Loaded",
                description: "Song data is ready for editing.",
            });
        } catch (error) {
            console.error("Error loading song for editing:", error);
            toast({
                title: "Load Failed",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        }
    };

    const loadSavedChordGrids = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from("songs")
                .select("*, song_sections(*)")
                .eq("user_id", user.id)
                .eq("theme", "chord_grid")
                .order("updated_at", {
                    ascending: false,
                });
            if (error) throw error;
            setSavedChordGrids(data || []);
        } catch (error) {
            console.error("Error loading saved chord grids:", error);
        }
    };
    // Helper function to format chord bars into lyrics format
    const formatChordBarsToLyrics = (
        section: ChordSection,
    ): { chords: string; melody: string } => {
        const barsPerLineValue = 4;
        const chordLines: string[] = [];
        const melodyLines: string[] = [];

        for (let i = 0; i < section.bars.length; i += barsPerLineValue) {
            const lineBars = section.bars.slice(i, i + barsPerLineValue);

            // Format baris untuk chord
            const formattedChords = lineBars
                .map((bar) => {
                    const chord = bar.chord || "/";
                    // Sesuaikan padding agar sesuai dengan panjang melodi jika perlu
                    return ` ${chord.padEnd(8, " ")} `;
                })
                .join("|");
            chordLines.push(`|${formattedChords}|`);

            // Format baris untuk melodi
            const formattedMelody = lineBars
                .map((bar) => {
                    const notAngka = bar.melody?.notAngka || " ";
                    // Pastikan melodi juga memiliki panjang yang konsisten
                    return ` ${notAngka.padEnd(8, " ")} `;
                })
                .join("|");
            melodyLines.push(`|${formattedMelody}|`);
        }

        return {
            chords: chordLines.join("\n"),
            melody: melodyLines.join("\n"),
        };
    };

    const saveChordGrid = async () => {
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please sign in to save your chord grid",
                variant: "destructive",
            });
            return;
        }

        if (!songTitle.trim()) {
            toast({
                title: "Title Required",
                description: "Please enter a song title before saving",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);

        try {
            // 1. Dapatkan info profile untuk created_sign
            const { data: profile } = await supabase
                .from("profiles")
                .select("creator_type, display_name")
                .eq("user_id", user.id)
                .single();

            let createdSign = "Arrangely";
            if (
                ((profile as any)?.creator_type === "creator_professional" || (profile as any)?.creator_type === "creator_pro") &&
                (profile as any)?.display_name
            ) {
                createdSign = (profile as any).display_name;
            }

            // 2. Siapkan data lagu
            const songData = {
                user_id: user.id,
                title: songTitle,
                artist: artistName,
                current_key: songKey as any,
                original_key: songKey as any,
                tempo,
                time_signature: timeSignature as any,
                capo,
                theme: "chord_grid",
                notes: `Bars per line: ${barsPerLine}, View mode: ${viewMode}`,
                youtube_link: youtubeUrl || null,
                // IMPORTANT: Always save as private initially if user wants public
                // Validation will set is_public = true if it passes
                is_public: false,
                original_creator_id: originalCreatorId,
                created_sign: createdSign,
            };

            let songId = currentChordGridId;

            // 3. Upsert Lagu
            if (currentChordGridId) {
                const { error } = await supabase
                    .from("songs")
                    .update(songData)
                    .eq("id", currentChordGridId);
                if (error) throw error;

                // Hapus arrangement & section lama jika update
                await supabase
                    .from("arrangements")
                    .delete()
                    .eq("song_id", currentChordGridId);
                await supabase
                    .from("song_sections")
                    .delete()
                    .eq("song_id", currentChordGridId);
            } else {
                const { data, error } = await supabase
                    .from("songs")
                    .insert(songData)
                    .select()
                    .single();
                if (error) throw error;
                songId = data.id;
                setCurrentChordGridId(data.id);
            }

            // 4. Insert Song Sections
            const sectionData = sections.map((section) => ({
                song_id: songId,
                section_type: section.name.toLowerCase().replace(/\s+/g, "_"),
                name: section.name,
                chords: vocalistLyrics[section.id] || "",
                lyrics: JSON.stringify(section.bars),
                bar_count: section.bars.length,
                section_time_signature: section.timeSignature as any,
            }));

            const { data: createdSections, error: sectionsError } =
                await supabase
                    .from("song_sections")
                    .insert(sectionData)
                    .select("id, name");

            if (sectionsError) throw sectionsError;

            // 5. Insert Arrangements secara otomatis (berdasarkan urutan di editor)
            if (createdSections) {
                const arrangementData = createdSections.map(
                    (newSection, index) => {
                        // Cari data section asli untuk mendapatkan format chords/melody
                        const originalSection = sections[index];
                        return {
                            song_id: songId,
                            section_id: newSection.id,
                            position: index + 1,
                            notes: JSON.stringify(
                                formatChordBarsToLyrics(originalSection),
                            ),
                        };
                    },
                );

                const { error: arrangementsError } = await supabase
                    .from("arrangements")
                    .insert(arrangementData);

                if (arrangementsError) throw arrangementsError;
            }

            // If user wants to publish (visibility = public), trigger validation workflow
            const wantsToPublish = visibility === "public";
            
            if (wantsToPublish && user) {
                // Show the beautiful validation overlay
                setValidationResult(null);
                setShowValidationOverlay(true);

                try {
                    // Create publication record
                    const { data: publication, error: pubError } = await supabase
                        .from('creator_pro_publications')
                        .insert({
                            user_id: user.id,
                            song_id: songId,
                            status: 'pending_review'
                        })
                        .select()
                        .single();

                    if (pubError) {
                        if (pubError.code === '23505') {
                            // Already exists
                        } else {
                            throw pubError;
                        }
                    }

                    // if (publication) {
                    //     // Create validation queue entries
                    //     const validationTypes = ['youtube', 'sections', 'chords', 'content'];
                    //     await supabase
                    //         .from('content_validation_queue')
                    //         .insert(validationTypes.map(type => ({
                    //             publication_id: publication.id,
                    //             song_id: songId,
                    //             validation_type: type,
                    //             status: 'pending'
                    //         })));

                    //     // Trigger validation edge function
                    //     const { data: validationData, error: funcError } = await supabase.functions.invoke('validate-song-publication', {
                    //         body: { publicationId: publication.id, songId }
                    //     });

                    //     if (funcError) {
                    //         console.error('Validation function error:', funcError);
                    //         setShowValidationOverlay(false);
                    //         toast({
                    //             title: "Validation service unavailable",
                    //             description: "Your chord grid was saved but publication review is delayed.",
                    //             variant: "destructive",
                    //         });
                    //         navigate("/library");
                    //     } else {
                    //         // Set the validation result to show in overlay
                    //         setValidationResult({
                    //             allPassed: validationData?.allPassed ?? false,
                    //             results: validationData?.results || {}
                    //         });
                    //     }
                    // } else {
                        setShowValidationOverlay(false);
                        navigate("/library");
                    // }
                } catch (pubError) {
                    console.error('Publication error:', pubError);
                    setShowValidationOverlay(false);
                    toast({
                        title: "Chord grid saved",
                        description: "Saved as private. Publication validation failed.",
                        variant: "destructive",
                    });
                    navigate("/library");
                }
            } else {
                toast({
                    title: "Success",
                    description: currentChordGridId
                        ? "Chord grid updated successfully"
                        : "Chord grid saved successfully",
                });
                // Redirect to library
                navigate("/library");
            }
        } catch (error) {
            console.error("Error saving chord grid:", error);
            toast({
                title: "Save Failed",
                description: "An unexpected error occurred while saving.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // const handleSectionsReorder = (reorderedSections: ChordSection[]) => {
    //     setCurrentSections(reorderedSections);
    // };

    // const handleBackToEditor = () => {
    //     setShowArrangementStep(false);
    // };

    const handleFinalSave = async () => {
        if (!user || !currentChordGridId) {
            toast({
                title: "Error",
                description: "Missing user or song data",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            // Delete existing arrangements first
            const { error: deleteError } = await supabase
                .from("arrangements")
                .delete()
                .eq("song_id", currentChordGridId);
            if (deleteError) throw deleteError;

            // Create arrangement entries using existing song_section_id from SectionArrangementStep
            const arrangementData = sections.map((section, index) => ({
                song_id: currentChordGridId,
                section_id: section.id, // langsung pakai id section yang sudah ada
                position: section.position || index + 1,
                notes: JSON.stringify(formatChordBarsToLyrics(section)),
            }));

            const { error: arrangementsError } = await supabase
                .from("arrangements")
                .insert(arrangementData);
            if (arrangementsError) throw arrangementsError;

            toast({
                title: "Arrangement Saved Successfully",
                description: "Your section arrangement has been saved",
            });

            // setShowArrangementStep(false);
            navigate("/library");
        } catch (error) {
            console.error("Error saving arrangement:", error);
            toast({
                title: "Save Failed",
                description: "Failed to save arrangement. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const loadChordGrid = async (gridId: string) => {
        try {
            // Load song data
            const { data: songData, error: songError } = await supabase
                .from("songs")
                .select("*")
                .eq("id", gridId)
                .single();
            if (songError) throw songError;

            // Load song sections
            const { data: sectionsData, error: sectionsError } = await supabase
                .from("song_sections")
                .select("*")
                .eq("song_id", gridId)
                .order("id");
            if (sectionsError) throw sectionsError;

            setCurrentChordGridId(songData.id);
            setSongTitle(songData.title);
            setArtistName(songData.artist || "");
            setSongKey(songData.current_key);
            setTempo(songData.tempo);
            setTimeSignature(songData.time_signature as TimeSignature);
            setCapo(songData.capo);

            // Parse settings from notes field
            const notes = songData.notes || "";
            const barsPerLineMatch = notes.match(/Bars per line: (\d+)/);
            const viewModeMatch = notes.match(/View mode: (\w+)/);

            if (barsPerLineMatch) setBarsPerLine(parseInt(barsPerLineMatch[1]));
            if (viewModeMatch) setViewMode(viewModeMatch[1] as ViewMode);

            // Convert sections back to ChordSection format
            const loadedSections: ChordSection[] = sectionsData.map(
                (section, index) => {
                    let bars: ChordBar[] = [];
                    try {
                        bars = JSON.parse(section.lyrics || "[]");
                    } catch {
                        // Fallback: parse from lyrics if chords field is invalid
                        bars = [];
                    }

                    return {
                        id: String(index + 1),
                        name: section.name || section.section_type,
                        timeSignature: (section.section_time_signature ||
                            "4/4") as TimeSignature,
                        bars:
                            bars.length > 0
                                ? bars
                                : [
                                      {
                                          id: `${index + 1}-1`,
                                          chord: "",
                                          beats: 4,
                                      },
                                  ],
                        isExpanded: true,
                        barCount: section.bar_count || 4,
                        position: index,
                    };
                },
            );

            setSections(
                loadedSections.length > 0
                    ? loadedSections
                    : [
                          {
                              id: "1",
                              name: "Intro",
                              timeSignature: "4/4",
                              bars: [{ id: "1-1", chord: "", beats: 4 }],
                              isExpanded: true,
                              barCount: 4,
                              position: 0,
                          },
                      ],
            );

            setShowLoadModal(false);
            toast({
                title: "Loaded Successfully",
                description: `"${songData.title}" has been loaded`,
            });
        } catch (error) {
            console.error("Error loading chord grid:", error);
            toast({
                title: "Load Failed",
                description: "Unable to load the chord grid. Please try again.",
                variant: "destructive",
            });
        }
    };
    const deleteChordGrid = async (gridId: string) => {
        try {
            // Delete song sections first
            await supabase.from("song_sections").delete().eq("song_id", gridId);

            // Delete the song
            const { error } = await supabase
                .from("songs")
                .delete()
                .eq("id", gridId);
            if (error) throw error;

            if (currentChordGridId === gridId) {
                setCurrentChordGridId(null);
            }
            loadSavedChordGrids();
            toast({
                title: "Deleted Successfully",
                description: "The chord grid has been deleted",
            });
        } catch (error) {
            console.error("Error deleting chord grid:", error);
            toast({
                title: "Delete Failed",
                description:
                    "Unable to delete the chord grid. Please try again.",
                variant: "destructive",
            });
        }
    };
    const newChordGrid = () => {
        setCurrentChordGridId(null);
        setSongTitle("");
        setArtistName("");
        setSongKey("C");
        setTempo(120);
        setTimeSignature("4/4");
        setCapo(0);
        setBarsPerLine(4);
        setViewMode("basic");
        setVisibility("private");
        setIsAlreadyPublic(false);
        setOriginalCreatorId(null);
        setSections([
            {
                id: "1",
                name: "Intro",
                timeSignature: "4/4",
                bars: [
                    {
                        id: "1-1",
                        chord: "",
                        beats: 4,
                    },
                    {
                        id: "1-2",
                        chord: "",
                        beats: 4,
                    },
                    {
                        id: "1-3",
                        chord: "",
                        beats: 4,
                    },
                    {
                        id: "1-4",
                        chord: "",
                        beats: 4,
                    },
                ],
                isExpanded: true,
                barCount: 4,
                position: 0,
            },
        ]);
    };
    const addSection = () => {
        const maxPosition =
            sections.length > 0
                ? Math.max(...sections.map((s) => s.position || 0))
                : -1;

        const newSectionId = Date.now().toString();
        const newSection: ChordSection = {
            id: newSectionId,
            name: `Section ${sections.length + 1}`,
            timeSignature: timeSignature,
            bars: Array.from({ length: 4 }, (_, i) => ({
                id: `${newSectionId}-${i}`,
                chord: "",
                beats: getBeatsForTimeSignature(timeSignature),
            })),
            isExpanded: true,
            barCount: 4,
            position: maxPosition + 1,
        };

        setSections([...sections, newSection]);
        setNewSectionId(newSectionId);

        // Clear animation state after animation completes
        setTimeout(() => setNewSectionId(null), 600);

        // Scroll to new section on mobile
        if (isMobile) {
            setTimeout(() => {
                const element = document.getElementById(
                    `section-${newSectionId}`,
                );
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                }
            }, 100);
        }
    };
    const deleteSection = (sectionId: string) => {
        if (sections.length <= 1) {
            toast({
                title: "Cannot Delete",
                description: "Must have at least one section",
                variant: "destructive",
            });
            return;
        }
        setSections(sections.filter((section) => section.id !== sectionId));
    };
    const duplicateSection = (sectionId: string) => {
        const sectionToDuplicate = sections.find(
            (section) => section.id === sectionId,
        );
        if (!sectionToDuplicate) return;

        const newSection: ChordSection = {
            id: Date.now().toString(),
            name: `${sectionToDuplicate.name} Copy`,
            timeSignature: sectionToDuplicate.timeSignature,
            // Bagian ini hanya menyalin 'bar.chord' apa adanya
            bars: sectionToDuplicate.bars.map((bar, index) => ({
                id: `${Date.now()}-${index}`,
                chord: bar.chord, // <-- PERBAIKAN: Tidak ada lagi transposisi di sini
                beats: bar.beats,
            })),
            isExpanded: true,
            barCount: sectionToDuplicate.barCount,
            position: (sectionToDuplicate.position || 0) + 1,
        };

        const sectionIndex = sections.findIndex(
            (section) => section.id === sectionId,
        );
        const newSections = [...sections];
        newSections.splice(sectionIndex + 1, 0, newSection);
        setSections(newSections);
    };
    const updateSectionName = (sectionId: string, name: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          name,
                      }
                    : section,
            ),
        );
    };
    const updateSectionTimeSignature = (
        sectionId: string,
        newTimeSignature: TimeSignature,
    ) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          timeSignature: newTimeSignature,
                          bars: section.bars.map((bar) => ({
                              ...bar,
                              beats: getBeatsForTimeSignature(newTimeSignature),
                          })),
                      }
                    : section,
            ),
        );
    };
    const updateChord = (sectionId: string, barId: string, chord: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) =>
                              bar.id === barId
                                  ? {
                                        ...bar,
                                        chord: chord,
                                    }
                                  : bar,
                          ),
                      }
                    : section,
            ),
        );

        // Auto-record timestamp when chord is added in recording mode
        if (chord && isRecordingMode) {
            recordChordTimestamp(sectionId, barId);
        }
    };

    // Update flexible notes (per bar)
    const updateBarNotes = (
        sectionId: string,
        barId: string,
        newNotes: FlexibleNote[],
    ) => {
        saveToHistory(sections);
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) => {
                              if (bar.id === barId) {
                                  // CEK APAKAH ADA WHOLE NOTE DI DALAM NOTES BARU
                                  const hasWhole = newNotes.some(
                                      (n) => n.type === "whole",
                                  );
                                  const hasHalf = newNotes.some(
                                      (n) => n.type === "half",
                                  );

                                  const baseChord =
                                      bar.chord.split(" ")[0] || "-";
                                  let autoChord = bar.chord;

                                  if (hasWhole)
                                      autoChord = `${baseChord} . . .`;
                                  else if (hasHalf && !bar.chord.includes("."))
                                      autoChord = `${baseChord} .`;

                                  return {
                                      ...bar,
                                      notes: newNotes,
                                      chord: autoChord,
                                  };
                              }
                              return bar;
                          }),
                      }
                    : section,
            ),
        );
    };

    const updateMelody = (sectionId: string, barId: string, melody: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) =>
                              bar.id === barId
                                  ? {
                                        ...bar,
                                        melody: {
                                            ...bar.melody,
                                            notAngka: melody,
                                        },
                                    }
                                  : bar,
                          ),
                      }
                    : section,
            ),
        );
    };

    const updateNoteType = (
        sectionId: string,
        barId: string,
        noteType: string,
    ) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.map((bar) =>
                              bar.id === barId
                                  ? {
                                        ...bar,
                                        noteSymbol: noteType,
                                    }
                                  : bar,
                          ),
                      }
                    : section,
            ),
        );
    };

    const toggleSectionMelody = (sectionId: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          showMelody: !section.showMelody,
                      }
                    : section,
            ),
        );
    };

    const toggleSectionNoteTypes = (sectionId: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          showNoteTypes: !section.showNoteTypes,
                      }
                    : section,
            ),
        );
    };

    const toggleVocalistLyricsEditor = (sectionId: string) => {
        setShowVocalistLyricsEditor(
            showVocalistLyricsEditor === sectionId ? null : sectionId,
        );
    };

    const saveVocalistLyrics = (sectionId: string, lyrics: string) => {
        setVocalistLyrics((prev) => ({
            ...prev,
            [sectionId]: lyrics,
        }));
    };

    const previewVocalistLyrics = (sectionId: string) => {
        const lyrics = vocalistLyrics[sectionId] || "";
        // Here you could open a preview modal or navigate to preview
        
    };

    const addBarToSection = (sectionId: string, numberOfBars: number = 1) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: [
                              ...section.bars,
                              ...Array.from(
                                  { length: numberOfBars },
                                  (_, i) => ({
                                      id: `${Date.now()}-${i}`,
                                      chord: "",
                                      beats: getBeatsForTimeSignature(
                                          timeSignature,
                                      ),
                                  }),
                              ),
                          ],
                      }
                    : section,
            ),
        );
    };

    const enterBarToSection = (sectionId: string) => {
        saveToHistory(sections);

        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    let targetIndex = section.bars.length - 1; // Default ke paling akhir

                    // Jika ada bar yang dipilih, kita ambil index terakhir yang dipilih
                    if (selectedBars.size > 0) {
                        const selectedIds = Array.from(selectedBars);
                        const lastSelectedId =
                            selectedIds[selectedIds.length - 1];
                        targetIndex = section.bars.findIndex(
                            (b) => b.id === lastSelectedId,
                        );
                    }

                    // Hitung sisa bar di baris saat ini
                    // targetIndex + 1 karena index mulai dari 0
                    const currentPosOnLine = (targetIndex + 1) % barsPerLine;

                    if (currentPosOnLine === 0) {
                        // Sudah pas di ujung baris, tambahkan satu baris penuh (4 bar)
                        const newBarsToAdd = Array.from(
                            { length: barsPerLine },
                            (_, i) => ({
                                id: `empty-${Date.now()}-${i}`,
                                chord: "",
                                beats: getBeatsForTimeSignature(
                                    section.timeSignature,
                                ),
                            }),
                        );

                        const updatedBars = [...section.bars];
                        updatedBars.splice(targetIndex + 1, 0, ...newBarsToAdd);
                        return { ...section, bars: updatedBars };
                    } else {
                        // Tambahkan bar kosong hanya sampai ujung baris agar konten selanjutnya pindah ke bawah
                        const barsNeededToFillLine =
                            barsPerLine - currentPosOnLine;
                        const newBarsToAdd = Array.from(
                            { length: barsNeededToFillLine },
                            (_, i) => ({
                                id: `fill-${Date.now()}-${i}`,
                                chord: "",
                                beats: getBeatsForTimeSignature(
                                    section.timeSignature,
                                ),
                            }),
                        );

                        const updatedBars = [...section.bars];
                        updatedBars.splice(targetIndex + 1, 0, ...newBarsToAdd);
                        return { ...section, bars: updatedBars };
                    }
                }
                return section;
            }),
        );

        toast({
            title: "Baris Baru Berhasil",
            description:
                "Bar sisa telah diisi kotak kosong untuk merapikan layout.",
        });
    };

    const insertBarInSection = (sectionId: string, insertIndex: number) => {
        saveToHistory(sections);
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: [
                              ...section.bars.slice(0, insertIndex),
                              {
                                  id: `${Date.now()}`,
                                  chord: "",
                                  beats: getBeatsForTimeSignature(
                                      timeSignature,
                                  ),
                              },
                              ...section.bars.slice(insertIndex),
                          ],
                      }
                    : section,
            ),
        );
    };
    const removeBarFromSection = (sectionId: string, barId: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          bars: section.bars.filter((bar) => bar.id !== barId),
                      }
                    : section,
            ),
        );
    };

    // Update section bar count
    const updateSectionBarCount = (sectionId: string, newBarCount: number) => {
        setSections(
            sections.map((section) => {
                if (section.id === sectionId) {
                    const currentBarCount = section.bars.length;
                    let updatedBars = [...section.bars];

                    if (newBarCount > currentBarCount) {
                        // Add bars
                        const barsToAdd = newBarCount - currentBarCount;
                        const newBars = Array.from(
                            { length: barsToAdd },
                            (_, i) => ({
                                id: `${Date.now()}-${currentBarCount + i}`,
                                chord: "",
                                beats: getBeatsForTimeSignature(
                                    section.timeSignature,
                                ),
                            }),
                        );
                        updatedBars = [...updatedBars, ...newBars];
                    } else if (newBarCount < currentBarCount) {
                        // Remove bars
                        updatedBars = updatedBars.slice(0, newBarCount);
                    }

                    return {
                        ...section,
                        barCount: newBarCount,
                        bars: updatedBars,
                    };
                }
                return section;
            }),
        );
    };

    const toggleSectionExpansion = (sectionId: string) => {
        setSections(
            sections.map((section) =>
                section.id === sectionId
                    ? {
                          ...section,
                          isExpanded: !section.isExpanded,
                      }
                    : section,
            ),
        );
    };

    // YouTube Player Integration
    useEffect(() => {
        if (currentVideoId && showYouTubePlayer) {
            // Load YouTube IFrame API if not already loaded
            if (!(window as any).YT) {
                const tag = document.createElement("script");
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag =
                    document.getElementsByTagName("script")[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

                // Initialize player when API is ready
                (window as any).onYouTubeIframeAPIReady = () => {
                    initializePlayer();
                };
            } else {
                // API already loaded, initialize immediately
                initializePlayer();
            }
        }
    }, [currentVideoId, showYouTubePlayer]);
    const initializePlayer = () => {
        if ((window as any).YT && (window as any).YT.Player) {
            const player = new (window as any).YT.Player(
                "youtube-player-iframe",
                {
                    videoId: currentVideoId,
                    events: {
                        onReady: (event: any) => {
                            setYoutubePlayer(event.target);
                            setDuration(event.target.getDuration());
                            // Set initial volume and speed
                            event.target.setVolume(volume);
                            event.target.setPlaybackRate(playbackSpeed);
                        },
                        onStateChange: (event: any) => {
                            if (
                                event.data ===
                                (window as any).YT.PlayerState.PLAYING
                            ) {
                                setIsPlaying(true);
                                startTimeUpdater(event.target);
                            } else if (
                                event.data ===
                                (window as any).YT.PlayerState.PAUSED
                            ) {
                                setIsPlaying(false);
                            }
                        },
                    },
                },
            );
        }
    };
    const startTimeUpdater = (player: any) => {
        const updateTime = () => {
            if (player && player.getCurrentTime) {
                const time = player.getCurrentTime();
                setCurrentTime(time);
                if (
                    player.getPlayerState() ===
                    (window as any).YT.PlayerState.PLAYING
                ) {
                    setTimeout(updateTime, 100);
                }
            }
        };
        updateTime();
    };
    const handleResetInfo = () => {
        setSongTitle("");
        setArtistName("");
        setIsInfoLocked(false);
        // Opsional: kosongkan juga URL YouTube jika diperlukan
        // setYoutubeUrl("");
        toast({
            title: "Info Direset",
            description:
                "Anda sekarang bisa mengisi judul dan artis secara manual.",
            duration: 2000,
        });
    };
    const togglePlayPause = () => {
        if (youtubePlayer) {
            if (isPlaying) {
                youtubePlayer.pauseVideo();
            } else {
                youtubePlayer.playVideo();
            }
        }
    };
    const changePlaybackSpeed = (speed: number) => {
        if (youtubePlayer) {
            youtubePlayer.setPlaybackRate(speed);
            setPlaybackSpeed(speed);
        }
    };
    const changeVolume = (vol: number) => {
        if (youtubePlayer) {
            youtubePlayer.setVolume(vol);
            setVolume(vol);
        }
    };
    const skipBackward = () => {
        if (youtubePlayer) {
            const newTime = Math.max(0, currentTime - 10);
            youtubePlayer.seekTo(newTime);
            setCurrentTime(newTime);
        }
    };
    const skipForward = () => {
        if (youtubePlayer) {
            const newTime = Math.min(duration, currentTime + 10);
            youtubePlayer.seekTo(newTime);
            setCurrentTime(newTime);
        }
    };
    const seekTo = (time: number) => {
        if (youtubePlayer) {
            youtubePlayer.seekTo(time);
            setCurrentTime(time);
        }
    };
    const recordChordTimestamp = (sectionId: string, barId: string) => {
        if (isRecordingMode && currentTime > 0) {
            const key = `${sectionId}-${barId}`;
            setChordTimestamps((prev) => ({
                ...prev,
                [key]: currentTime,
            }));
            toast({
                title: "Timestamp Recorded",
                description: `Chord synced at ${Math.floor(
                    currentTime / 60,
                )}:${String(Math.floor(currentTime % 60)).padStart(2, "0")}`,
            });
        }
    };
    const getCurrentPlayingChord = () => {
        let closestChord = null;
        let closestTime = -1;
        Object.entries(chordTimestamps).forEach(([key, timestamp]) => {
            if (timestamp <= currentTime && timestamp > closestTime) {
                closestTime = timestamp;
                closestChord = key;
            }
        });
        return closestChord;
    };
    const loadYouTubeVideo = async () => {
        if (!youtubeUrl.trim()) {
            toast({
                title: "Missing URL",
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

        const thumbnailUrl = getVideoThumbnail(videoId);
        setVideoThumbnail(thumbnailUrl);
        setShowVideoPreview(true);
        setCurrentVideoId(videoId);
        setShowYouTubePlayer(true);

        // Ekstrak info lagu dari judul YouTube
        try {
            const response = await fetch(
                `https://noembed.com/embed?url=${encodeURIComponent(
                    youtubeUrl,
                )}`,
            );
            const data = await response.json();

            if (data.title) {
                // Membersihkan judul dari kata-kata umum video
                let title = data.title
                    .replace(/\s*\(.*?video.*?\)/gi, "")
                    .replace(/\s*\[.*?video.*?\]/gi, "")
                    .replace(/\s*-?\s*official\s*(music\s*)?video/gi, "")
                    .replace(/\s*-?\s*lyric\s*video/gi, "")
                    .replace(/\s*-?\s*audio/gi, "")
                    .replace(/\s*\(HD\)/gi, "")
                    .replace(/\s*\[HD\]/gi, "")
                    .replace(/\s*\(Live\)/gi, "")
                    .replace(/\s*\[Live\]/gi, "");

                let extractedSong = "";
                let extractedArtist = "";

                // Mencoba berbagai pola umum "Artis - Judul"
                const patterns = [
                    /^(?<artist>[^-]+?)\s*-\s*(?<song>.+)$/, // Artist - Song
                    /^(?<song>.+?)\s+by\s+(?<artist>.+)$/i, // Song by Artist
                    /^(?<artist>[^|]+?)\s*\|\s*(?<song>.+)$/, // Artist | Song
                    /^(?<song>.+?)\s*\|\s*(?<artist>[^|]+)$/, // Song | Artist
                ];

                let matchFound = false;
                for (const pattern of patterns) {
                    const match = title.match(pattern);
                    if (match && match.groups) {
                        extractedSong = match.groups.song.trim();
                        extractedArtist = match.groups.artist.trim();
                        matchFound = true;
                        break;
                    }
                }

                if (!matchFound) {
                    extractedSong = title.trim(); // Fallback jika tidak ada pola yang cocok
                }

                // Membersihkan hasil akhir
                extractedSong = extractedSong.replace(/^\W+|\W+$/g, "").trim();
                extractedArtist = extractedArtist
                    .replace(/^\W+|\W+$/g, "")
                    .trim();

                setSongTitle(extractedSong || "");
                setArtistName(extractedArtist || "");
                setIsInfoLocked(true);

                toast({
                    title: "Video Info Loaded",
                    description: `Extracted: ${extractedSong}${
                        extractedArtist ? ` by ${extractedArtist}` : ""
                    }`,
                });
            } else {
                toast({
                    title: "Video Loaded",
                    description: "YouTube video is ready for playback",
                });
            }
        } catch (error) {
            console.error("Error extracting video info:", error);
            toast({
                title: "Video Loaded",
                description: "Could not fetch title, but video is ready.",
            });
        }
    };

    // Calculate bar duration in seconds based on tempo and time signature
    const getBarDuration = () => {
        const beatsPerBar = getBeatsForTimeSignature(timeSignature);
        const beatDuration = 60 / tempo; // seconds per beat
        return beatDuration * beatsPerBar;
    };

    // Calculate total bars needed for the song duration
    const calculateTotalBars = () => {
        if (duration === 0) return 0;
        const barDuration = getBarDuration();
        return Math.ceil(duration / barDuration);
    };

    // Auto-generate bars for the entire song
    const autoGenerateBars = () => {
        if (duration === 0) {
            toast({
                title: "No Duration",
                description:
                    "Please load a YouTube video first to calculate bars",
                variant: "destructive",
            });
            return;
        }
        const totalBars = calculateTotalBars();
        const barDuration = getBarDuration();

        // Calculate bars per section (typically 8, 16, or 32 bars)
        const barsPerSection = barsPerLine * 4; // 4 lines per section typically
        const numberOfSections = Math.ceil(totalBars / barsPerSection);
        const newSections: ChordSection[] = [];
        const sectionNames = [
            "Intro",
            "Verse 1",
            "Chorus",
            "Verse 2",
            "Chorus",
            "Bridge",
            "Chorus",
            "Outro",
        ];
        for (let i = 0; i < numberOfSections; i++) {
            const startBar = i * barsPerSection;
            const endBar = Math.min(startBar + barsPerSection, totalBars);
            const barsInSection = endBar - startBar;
            const section: ChordSection = {
                id: `section-${i + 1}`,
                name: sectionNames[i] || `Section ${i + 1}`,
                timeSignature: timeSignature,
                bars: Array.from(
                    {
                        length: barsInSection,
                    },
                    (_, barIndex) => {
                        const globalBarIndex = startBar + barIndex;
                        const barStartTime = globalBarIndex * barDuration;
                        return {
                            id: `bar-${globalBarIndex + 1}`,
                            chord: "",
                            beats: getBeatsForTimeSignature(timeSignature),
                            timestamp: barStartTime,
                        };
                    },
                ),
                isExpanded: true,
                barCount: barsInSection,
            };
            newSections.push(section);
        }
        setSections(newSections);
        toast({
            title: "Bars Generated",
            description: `Created ${totalBars} bars across ${numberOfSections} sections based on ${tempo} BPM`,
        });
    };

    // Get current bar based on playback time
    const getCurrentBar = () => {
        const barDuration = getBarDuration();
        return Math.floor(currentTime / barDuration);
    };

    const transposeSingleChord = (chord: string, semitones: number) => {
        if (!chord || chord.trim() === "") return chord;

        const chordRegex = /^([A-G][#b]?)/;
        const match = chord.match(chordRegex);
        if (!match) return chord;

        const rootNote = match[1];
        const suffix = chord.slice(rootNote.length);

        // 1. Normalisasi nada mol (Db -> C#) sebelum mencari indeks
        const normalizedNote = enharmonicMap[rootNote] || rootNote;
        const noteIndex = keys.indexOf(normalizedNote);

        if (noteIndex === -1) return chord;

        // 2. Kalkulasi transposisi
        const newIndex = (noteIndex + semitones + keys.length) % keys.length;

        return keys[newIndex] + suffix;
    };

    const transposeChords = (semitones: number) => {
        setSections(
            sections.map((section) => ({
                ...section,
                bars: section.bars.map((bar) => ({
                    ...bar,
                    chord: bar.chord
                        .split(/\s+/)
                        .map((singleChord) =>
                            transposeSingleChord(singleChord, semitones),
                        )
                        .join(" "),
                    chordAfter: bar.chordAfter
                        ? transposeSingleChord(bar.chordAfter, semitones)
                        : bar.chordAfter,
                    chordEnd: bar.chordEnd
                        ? transposeSingleChord(bar.chordEnd, semitones)
                        : bar.chordEnd,
                })),
            })),
        );

        const newKeyIndex = keys.indexOf(songKey);
        if (newKeyIndex !== -1) {
            const newKey =
                keys[(newKeyIndex + semitones + keys.length) % keys.length];
            setSongKey(newKey);
        }
    };
    const exportToPDF = async () => {
        toast({
            title: "Export Started",
            description: "Generating PDF...",
        });
        setTimeout(() => {
            toast({
                title: "Export Complete",
                description: "Your chord sheet has been downloaded",
            });
        }, 2000);
    };

    const saveToLibrary = async () => {
        if (!user) {
            toast({
                title: "Please sign in",
                description: "You need to sign in to save to library",
                variant: "destructive",
            });
            return;
        }

        if (!songTitle.trim()) {
            toast({
                title: "Title Required",
                description:
                    "Please enter a song title before saving to library",
                variant: "destructive",
            });
            return;
        }

        try {
            // Create a song entry
            const songData = {
                title: songTitle,
                artist: artistName || null,
                current_key: songKey as any,
                original_key: songKey as any,
                tempo: tempo,
                time_signature: timeSignature as any,
                capo: capo,
                is_public: false,
                user_id: user.id,
                notes: `Chord grid with ${sections.length} sections`,
                theme: "chord_grid",
                tags: ["chord_grid"],
                youtube_link: youtubeUrl || null,
            };

            const { data: song, error: songError } = await supabase
                .from("songs")
                .insert(songData)
                .select()
                .single();

            if (songError) {
                console.error("Error creating song:", songError);
                toast({
                    title: "Error",
                    description: "Failed to save chord grid to library",
                    variant: "destructive",
                });
                return;
            }

            // Create song sections from chord grid sections
            const songSections = sections.map((section) => ({
                song_id: song.id,
                section_type: section.name.toLowerCase().replace(/\s+/g, "_"),
                name: section.name,
                chords: section.bars.map((bar) => bar.chord).join(" | "),
                lyrics: section.bars
                    .map((bar) => bar.melody?.notAngka || "")
                    .join(" | "),
                bar_count: section.bars.length,
                section_time_signature: section.timeSignature as any,
            }));

            const { error: sectionsError } = await supabase
                .from("song_sections")
                .insert(songSections);

            if (sectionsError) {
                console.error("Error creating sections:", sectionsError);
                // Still show success as the main song was created
            }

            // Also save/update the chord grid for backup
            await saveChordGrid();

            toast({
                title: "Saved to Library",
                description:
                    "Chord grid has been saved to your library and can be used with setlists and live preview",
                duration: 3000,
            });
        } catch (error) {
            console.error("Error saving to library:", error);
            toast({
                title: "Error",
                description: "Failed to save chord grid to library",
                variant: "destructive",
            });
        }
    };

    // OCR Processing Functions
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setOcrImage(file);
            setOcrText("");
        }
    };

    const processImageWithOCR = async () => {
        if (!ocrImage) return;

        setIsProcessingOCR(true);
        setOcrProgress(0);

        try {
            const {
                data: { text },
            } = await Tesseract.recognize(ocrImage, "eng", {
                logger: (m) => {
                    if (m.status === "recognizing text") {
                        setOcrProgress(Math.round(m.progress * 100));
                    }
                },
            });

            setOcrProgress(100);

            // PENTING: Simpan teks MENTAH dari Tesseract untuk di-parsing.
            // Teks mentah ini yang akan kita tampilkan sebagai "Extracted Text" untuk debug.
            setOcrText(text);

            // PENTING: Panggil fungsi parsing dengan teks MENTAH yang masih memiliki
            // informasi struktur baris dan section, BUKAN teks yang sudah dibersihkan.
            parseAndPopulateFromOCR(text);

            toast({
                title: "OCR Complete",
                description: "Chord grid has been structured.",
            });
        } catch (error) {
            console.error("OCR Error:", error);
            toast({
                title: "OCR Failed",
                description: "Could not extract text from the image.",
                variant: "destructive",
            });
        } finally {
            setIsProcessingOCR(false);
        }
    };

    const detectAndValidateChords = (text: string): string[] => {
        let correctedLine = text
            .replace(/FMA7|FMAJ7/gi, "Fmaj7")
            .replace(/Dm\s*7/gi, "Dm7")
            .replace(/\bF\s*m\b/gi, "Fmaj7")
            .replace(/\b([A-G][#b]?)\s*\/\s*([A-G][#b]?)\b/g, "$1/$2");

        const nonChordPattern =
            /Intro|Verse|Chorus|pop|ballad|lyrics|by|Bern|elton|john|D\.C\.|[\|\[\]]/gi;
        correctedLine = correctedLine.replace(nonChordPattern, " ");

        const chordPattern =
            /[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add\d*|[2-79]|maj[79]|m[79])?(\/[A-G][#b]?)?/g;
        const potentialChords = correctedLine.match(chordPattern);

        if (!potentialChords) {
            return [];
        }

        return potentialChords
            .map((chord) => {
                const cleaned = chord.trim();
                if (cleaned.length > 0 && cleaned.length < 8) {
                    if (cleaned.toLowerCase() === "am/f#") return "Am/F#";
                    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                }
                return null;
            })
            .filter((c): c is string => c !== null);
    };

    // Di dalam file ChordGridGenerator.tsx

// Cari fungsi parseAndPopulateFromOCR yang lama, dan ganti dengan yang ini:

const parseAndPopulateFromOCR = (rawOcrText: string): boolean => {
    // Use the SAME parser as the preview (TextModeConverter) so bar count matches
    const parsedSections = TextModeConverter.textToSections(rawOcrText);

    if (parsedSections.length === 0) {
        toast({
            title: "Gagal Membaca Chord",
            description: "Format teks tidak dikenali.",
            variant: "destructive",
        });
        return false;
    }

    const mappedSections: ChordSection[] = parsedSections.map(
    (section: any, i: number) => ({
        ...section,
        id: `section-${Date.now()}-${i}`,
        timeSignature: section.timeSignature || timeSignature,
        isExpanded: true,
        position: i,
        bars: section.bars.map((bar: any, bIdx: number) => ({
        ...bar,
        id: `bar-${Date.now()}-${i}-${bIdx}`,
        })),
    })
    );

    console.log("mappedSection", mappedSections);

    setSections(mappedSections);
    toast({
        title: "Import Berhasil!",
        description: `Berhasil memuat ${mappedSections.length} bagian lagu dengan format grid yang benar.`,
    });
    return true;
};

    const moveSection = (index: number, direction: "up" | "down") => {
        const newSections = [...sections];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newSections.length) return;

        // Swap positions
        [newSections[index], newSections[targetIndex]] = [
            newSections[targetIndex],
            newSections[index],
        ];

        // Update position property based on new index
        const updatedSections = newSections.map((s, i) => ({
            ...s,
            position: i,
        }));

        saveToHistory(sections);
        setSections(updatedSections);
    };

    const autoDetectSections = (allBars: ChordBar[]): ChordSection[] => {
        const sections: ChordSection[] = [];
        const totalBars = allBars.length;

        if (totalBars >= 32) {
            const introLength = 4;
            const verseLength = 16;
            const chorusLength = totalBars - introLength - verseLength;

            console.log(
                `Large song detected: Intro(${introLength}) + Verse(${verseLength}) + Chorus(${chorusLength})`,
            );

            // Intro section (4 bars)
            sections.push({
                id: "intro-1",
                name: "Intro",
                timeSignature: timeSignature,
                bars: allBars.slice(0, introLength).map((bar, i) => ({
                    ...bar,
                    id: `intro-1-${i + 1}`,
                })),
                isExpanded: true,
                barCount: introLength,
            });

            // Verse section (16 bars)
            sections.push({
                id: "verse-1",
                name: "Verse",
                timeSignature: timeSignature,
                bars: allBars
                    .slice(introLength, introLength + verseLength)
                    .map((bar, i) => ({
                        ...bar,
                        id: `verse-1-${i + 1}`,
                    })),
                isExpanded: true,
                barCount: verseLength,
            });

            // Chorus section (remaining bars)
            sections.push({
                id: "chorus-1",
                name: "Chorus",
                timeSignature: timeSignature,
                bars: allBars
                    .slice(introLength + verseLength)
                    .map((bar, i) => ({
                        ...bar,
                        id: `chorus-1-${i + 1}`,
                    })),
                isExpanded: true,
                barCount: chorusLength,
            });
        } else if (totalBars >= 20) {
            // Medium-long song: Intro (4) + Verse (12) + Chorus (remaining)
            const introLength = 4;
            const verseLength = 12;
            const chorusLength = totalBars - introLength - verseLength;

            console.log(
                `Medium song detected: Intro(${introLength}) + Verse(${verseLength}) + Chorus(${chorusLength})`,
            );

            sections.push({
                id: "intro-1",
                name: "Intro",
                timeSignature: timeSignature,
                bars: allBars.slice(0, introLength).map((bar, i) => ({
                    ...bar,
                    id: `intro-1-${i + 1}`,
                })),
                isExpanded: true,
                barCount: introLength,
            });

            sections.push({
                id: "verse-1",
                name: "Verse",
                timeSignature: timeSignature,
                bars: allBars
                    .slice(introLength, introLength + verseLength)
                    .map((bar, i) => ({
                        ...bar,
                        id: `verse-1-${i + 1}`,
                    })),
                isExpanded: true,
                barCount: verseLength,
            });

            sections.push({
                id: "chorus-1",
                name: "Chorus",
                timeSignature: timeSignature,
                bars: allBars
                    .slice(introLength + verseLength)
                    .map((bar, i) => ({
                        ...bar,
                        id: `chorus-1-${i + 1}`,
                    })),
                isExpanded: true,
                barCount: chorusLength,
            });
        } else if (totalBars >= 12) {
            // Split evenly into Verse and Chorus
            const half = Math.floor(totalBars / 2);

            console.log(
                `Medium song detected: Verse(${half}) + Chorus(${
                    totalBars - half
                })`,
            );

            sections.push({
                id: "verse-1",
                name: "Verse",
                timeSignature: timeSignature,
                bars: allBars.slice(0, half).map((bar, i) => ({
                    ...bar,
                    id: `verse-1-${i + 1}`,
                })),
                isExpanded: true,
                barCount: half,
            });

            sections.push({
                id: "chorus-1",
                name: "Chorus",
                timeSignature: timeSignature,
                bars: allBars.slice(half).map((bar, i) => ({
                    ...bar,
                    id: `chorus-1-${i + 1}`,
                })),
                isExpanded: true,
                barCount: totalBars - half,
            });
        } else {
            // Short progression - keep as single section
            

            sections.push({
                id: "intro-1",
                name: totalBars <= 4 ? "Intro" : "Main",
                timeSignature: timeSignature,
                bars: allBars.map((bar, i) => ({
                    ...bar,
                    id: `intro-1-${i + 1}`,
                })),
                isExpanded: true,
                barCount: totalBars,
            });
        }

        return sections;
    };

    const handleSwitchToNewEditor = () => {
        if (chordSheetData) {
            setShowChordSheetEditor(true);
        } else {
            toast({
                title: "No Data Available",
                description: "Please create some sections first",
                variant: "destructive",
            });
        }
    };

    // If showing the new chord sheet editor, render that instead
    if (showChordSheetEditor && chordSheetData) {
        return (
            <div className="min-h-screen bg-background">
                <DynamicNavigation isMobileView={false} />
                <div className="container mx-auto px-4 py-8 mt-20">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold">
                            Enhanced Chord Grid Editor
                        </h1>
                        <Button
                            variant="outline"
                            onClick={() => setShowChordSheetEditor(false)}
                            className="flex items-center gap-2"
                        >
                            <Settings className="h-4 w-4" />
                            Back to Classic
                        </Button>
                    </div>
                    <ChordSheetEditor
                        data={chordSheetData}
                        youtubeUrl={youtubeUrl}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-7xl mt-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        {/* Chord Grid Generator */}
                        {t("chordGrid.title")}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {/* Create professional chord sheets */}
                        {t("chordGrid.subtitle")}
                    </p>
                </div>
                {/* <div className="flex gap-2">
                    <Button 
                        onClick={handleSwitchToNewEditor}
                        variant="default"
                        className="flex items-center gap-2"
                        disabled={!chordSheetData}
                    >
                        <Grid className="h-4 w-4" />
                        Enhanced Editor
                    </Button>
                </div> */}
            </div>

            {/* Mobile-Optimized Top Controls */}
            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                {/* Song Info - Full width */}
                <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                        <h3 className="font-semibold text-xs sm:text-sm">
                            {/* Song Info */}
                            {t("chordGrid.songInfo")}
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {/* Input YouTube dipindah ke atas agar alurnya lebih jelas */}
                        <div className="flex items-center gap-2">
                            <Youtube className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <Input
                                placeholder="Tempel link YouTube di sini untuk isi otomatis..."
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === "Enter") loadYouTubeVideo();
                                }}
                                className="text-xs sm:text-sm h-8 sm:h-10 flex-grow"
                            />
                            <Button
                                onClick={loadYouTubeVideo}
                                size="sm"
                                className="h-8 sm:h-10"
                            >
                                Load
                            </Button>
                        </div>

                        {/* Wrapper untuk Input Judul & Artis + Tombol Reset */}
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                            {/* 1. Wrapper baru untuk input Judul Lagu + Tombol 'X' */}
                            <div className="relative w-full">
                                <Input
                                    placeholder="Judul Lagu"
                                    value={songTitle}
                                    onChange={(e) =>
                                        setSongTitle(e.target.value)
                                    }
                                    readOnly={isInfoLocked}
                                    // 2. Tambahkan padding kanan (pr-8) agar teks tidak tertutup tombol
                                    className={`text-xs sm:text-sm h-8 sm:h-10 w-full pr-8 ${
                                        isInfoLocked ? "bg-muted/50" : ""
                                    }`}
                                />
                                {isInfoLocked && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetInfo}
                                        // 3. Posisikan tombol di dalam wrapper baru
                                        className="absolute top-1/2 right-1 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        title="Edit manual"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Input Artis tetap sama */}
                            <Input
                                placeholder="Artis"
                                value={artistName}
                                onChange={(e) => setArtistName(e.target.value)}
                                readOnly={isInfoLocked}
                                className={`text-xs sm:text-sm h-8 sm:h-10 w-full ${
                                    isInfoLocked ? "bg-muted/50" : ""
                                }`}
                            />
                        </div>

                        {/* Visibility Selector - Only creator_professional can publish */}
                        <VisibilitySelector
                            value={visibility}
                            onChange={setVisibility}
                            originalCreatorId={originalCreatorId}
                            forcePrivate={!canPublishChordGrid}
                            theme="chord_grid"
                            creatorType={creatorType}
                            isCurrentlyPublic={isAlreadyPublic}
                            forcePrivateLocked={isVisibilityLockedToPrivate || !canPublishChordGrid}
                            forcePrivateLockedReason={
                                !canPublishChordGrid
                                    ? "Only Verified Creators can publish Chord Grid arrangements"
                                    : duplicateLockReason
                            }
                        />
                    </div>
                </Card>

                {/* OCR Import - Mobile-first design
                <Card className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
                        <h3 className="font-semibold text-xs sm:text-sm">
                            Import from Image (OCR)
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="ocr-upload"
                            />
                            <label htmlFor="ocr-upload" className="flex-1">
                                <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 sm:p-4 cursor-pointer hover:border-muted-foreground/50 transition-colors min-h-[60px]">
                                    <div className="text-center">
                                        <Upload className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1 sm:mb-2 text-muted-foreground" />
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            {ocrImage
                                                ? ocrImage.name.substring(
                                                      0,
                                                      20
                                                  ) +
                                                  (ocrImage.name.length > 20
                                                      ? "..."
                                                      : "")
                                                : "Upload chord image"}
                                        </p>
                                    </div>
                                </div>
                            </label>
                            {ocrImage && (
                                <Button
                                    onClick={processImageWithOCR}
                                    disabled={isProcessingOCR}
                                    size="sm"
                                    className="w-full sm:w-auto h-8 text-xs sm:text-sm"
                                >
                                    {isProcessingOCR
                                        ? `Processing... ${ocrProgress}%`
                                        : "Extract Chords"}
                                </Button>
                            )}
                        </div>

                        {isProcessingOCR && (
                            <div className="w-full bg-muted rounded-full h-1.5 sm:h-2">
                                <div
                                    className="bg-primary h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${ocrProgress}%` }}
                                />
                            </div>
                        )}

                        {ocrText && (
                            <div className="text-xs bg-muted p-2 rounded max-h-16 sm:max-h-20 overflow-y-auto">
                                <p className="font-medium mb-1 text-xs">
                                    Extracted Text:
                                </p>
                                <p className="text-muted-foreground whitespace-pre-wrap text-xs">
                                    {ocrText.substring(0, 150)}...
                                </p>
                            </div>
                        )}
                    </div>
                </Card> */}

                {/* Quick Settings - Mobile Stack */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">
                            {/* Key */}
                            {t("songLibrary.key")}
                        </Label>
                        <Select value={songKey} onValueChange={setSongKey}>
                            <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {keys.map((key) => (
                                    <SelectItem
                                        key={key}
                                        value={key}
                                        className="text-xs sm:text-sm"
                                    >
                                        {key}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Tempo</Label>
                        <Input
                            type="number"
                            value={tempo}
                            onChange={(e) => setTempo(Number(e.target.value))}
                            className="h-7 sm:h-8 text-xs sm:text-sm"
                            min="60"
                            max="200"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Time</Label>
                        <Select
                            value={timeSignature}
                            onValueChange={(value: TimeSignature) =>
                                setTimeSignature(value)
                            }
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2/4">2/4</SelectItem>
                                <SelectItem value="3/4">3/4</SelectItem>
                                <SelectItem value="4/4">4/4</SelectItem>
                                <SelectItem value="5/4">5/4</SelectItem>
                                <SelectItem value="6/8">6/8</SelectItem>
                                <SelectItem value="7/8">7/8</SelectItem>
                                <SelectItem value="9/8">9/8</SelectItem>
                                <SelectItem value="12/8">12/8</SelectItem>
                                <SelectItem value="2/2">2/2</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs">Transpose</Label>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => transposeChords(-1)}
                                className="h-8 px-2 text-xs"
                            >
                                -1
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => transposeChords(1)}
                                className="h-8 px-2 text-xs"
                            >
                                +1
                            </Button>
                        </div>
                    </div>

                    {/* <div className="space-y-1">
                        <Label className="text-xs">Actions</Label>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                onClick={() => setShowLoadModal(true)}
                                size="sm"
                                className="h-8 px-2 text-xs"
                            >
                                <FolderOpen className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={autoGenerateBars}
                                size="sm"
                                className="h-8 px-2 text-xs"
                            >
                                <Grid className="h-3 w-3" />
                            </Button>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* Standalone Metronome - Always Visible */}
            <div className="mb-6">
                <Metronome
                    tempo={tempo}
                    onTempoChange={setTempo}
                    timeSignature={timeSignature}
                    isPlaying={isPlaying}
                />
            </div>

            {/* YouTube Player - Collapsible */}

            {/* Main Chord Grid */}
            <Card>
                <CardHeader className="p-3 sm:p-4 sm:pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Grid className="h-5 w-5" />
                                {songTitle || t("chordGrid.untitled")}
                            </CardTitle>
                            <CardDescription className="text-sm flex flex-wrap gap-x-2">
                                Key: {songKey} | Tempo: {tempo} BPM |{" "}
                                {timeSignature}
                                {capo > 0 && ` | Capo: ${capo}`}
                                {duration > 0 &&
                                    ` | Duration: ${Math.floor(
                                        duration / 60,
                                    )}:${String(
                                        Math.floor(duration % 60),
                                    ).padStart(
                                        2,
                                        "0",
                                    )} | Total Bars: ${calculateTotalBars()}`}
                            </CardDescription>
                        </div>
                        {/* <div className="flex flex-wrap gap-2 self-end sm:self-auto"> */}
                        {/* Mode Toggle */}
                        {/* <div className="flex items-center gap-1 border rounded-lg p-1"> */}
                                {/* <Button
                                    variant={
                                        editorMode === "grid"
                                            ? "default"
                                            : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => handleModeSwitch("grid")}
                                    className="h-7 px-2 text-xs"
                                >
                                    <Grid className="h-3 w-3 mr-1" />
                                    Grid
                                </Button> */}
                                {/* <Button
                                    variant={
                                        editorMode === "text"
                                            ? "default"
                                            : "ghost"
                                    }
                                    size="sm"
                                    onClick={() => handleModeSwitch("text")}
                                    className="h-7 px-2 text-xs"
                                >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Text
                                </Button> */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant={editorMode === "handwriting" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEditorMode(editorMode === "handwriting" ? "grid" : "handwriting")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <PenTool className="h-3.5 w-3.5 mr-1" />
                                    {editorMode === "handwriting" ? "Exit Handwriting" : "Handwriting"}
                                </Button>
                                <Button
                                    variant={editorMode === "blank-canvas" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEditorMode(editorMode === "blank-canvas" ? "grid" : "blank-canvas")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <PenTool className="h-3.5 w-3.5 mr-1" />
                                    {editorMode === "blank-canvas" ? "Exit Blank Canvas" : "Blank Canvas"}
                                </Button>
                                <Button
                                    variant={editorMode === "image-upload" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEditorMode(editorMode === "image-upload" ? "grid" : "image-upload")}
                                    className="h-8 px-3 text-xs"
                                >
                                    <Mic className="h-3.5 w-3.5 mr-1" />
                                    {editorMode === "image-upload" ? "Exit Upload" : "Upload Image"}
                                </Button>
                            </div>
                    </div>
                    {/* <Button
                                onClick={saveToLibrary}
                                variant="secondary"
                                size="sm"
                                className="text-xs sm:text-sm"
                            >
                                <Music className="h-4 w-4 mr-1" />
                                Save to Library
                            </Button> */}
                    {/* <Button
                                onClick={addSection}
                                size="sm"
                                className="text-xs sm:text-sm"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Section
                            </Button> */}
                    {/* <Button
                                variant="outline"
                                onClick={exportToPDF}
                                size="sm"
                            >
                                <Download className="h-4 w-4" />
                            </Button> */}
                    {/* </div> */}
                    {/* </div> */}
                </CardHeader>
                <CardContent className="p-4">
                    {editorMode === "grid" ? (
                        <div className="space-y-4">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    id={`section-${section.id}`}
                                    className={`border rounded-lg p-3 transition-all duration-500 ${
                                        newSectionId === section.id
                                            ? "animate-scale-in animate-fade-in"
                                            : ""
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* TOMBOL REORDER (PINDAH ATAS/BAWAH) */}
                                            <div className="flex flex-col gap-0.5 mr-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-6 p-0 hover:bg-secondary"
                                                    onClick={() =>
                                                        moveSection(index, "up")
                                                    }
                                                    disabled={index === 0}
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-6 p-0 hover:bg-secondary"
                                                    onClick={() =>
                                                        moveSection(
                                                            index,
                                                            "down",
                                                        )
                                                    }
                                                    disabled={
                                                        index ===
                                                        sections.length - 1
                                                    }
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Input
                                                value={section.name}
                                                onChange={(e) =>
                                                    updateSectionName(
                                                        section.id,
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-32 md:w-48 font-semibold text-sm h-8"
                                            />

                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">
                                                    Time:
                                                </Label>
                                                <Select
                                                    value={
                                                        section.timeSignature
                                                    }
                                                    onValueChange={(
                                                        value: TimeSignature,
                                                    ) =>
                                                        updateSectionTimeSignature(
                                                            section.id,
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-16 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="2/4">
                                                            2/4
                                                        </SelectItem>
                                                        <SelectItem value="3/4">
                                                            3/4
                                                        </SelectItem>
                                                        <SelectItem value="4/4">
                                                            4/4
                                                        </SelectItem>
                                                        <SelectItem value="5/4">
                                                            5/4
                                                        </SelectItem>
                                                        <SelectItem value="6/8">
                                                            6/8
                                                        </SelectItem>
                                                        <SelectItem value="7/8">
                                                            7/8
                                                        </SelectItem>
                                                        <SelectItem value="9/8">
                                                            9/8
                                                        </SelectItem>
                                                        <SelectItem value="12/8">
                                                            12/8
                                                        </SelectItem>
                                                        <SelectItem value="2/2">
                                                            2/2
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs">
                                                    Bars:
                                                </Label>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSectionBarCount(
                                                                section.id,
                                                                Math.max(
                                                                    1,
                                                                    (section.barCount ||
                                                                        section
                                                                            .bars
                                                                            .length) -
                                                                        1,
                                                                ),
                                                            )
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Select
                                                        value={(
                                                            section.barCount ||
                                                            section.bars.length
                                                        ).toString()}
                                                        onValueChange={(
                                                            value,
                                                        ) =>
                                                            updateSectionBarCount(
                                                                section.id,
                                                                parseInt(value),
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="w-16 h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="1">
                                                                1
                                                            </SelectItem>
                                                            <SelectItem value="2">
                                                                2
                                                            </SelectItem>
                                                            <SelectItem value="4">
                                                                4
                                                            </SelectItem>
                                                            <SelectItem value="8">
                                                                8
                                                            </SelectItem>
                                                            <SelectItem value="12">
                                                                12
                                                            </SelectItem>
                                                            <SelectItem value="16">
                                                                16
                                                            </SelectItem>
                                                            <SelectItem value="24">
                                                                24
                                                            </SelectItem>
                                                            <SelectItem value="32">
                                                                32
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSectionBarCount(
                                                                section.id,
                                                                Math.min(
                                                                    32,
                                                                    (section.barCount ||
                                                                        section
                                                                            .bars
                                                                            .length) +
                                                                        1,
                                                                ),
                                                            )
                                                        }
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 items-center">
                                            {/* <Button
                        variant={section.showNoteTypes ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleSectionNoteTypes(section.id)}
                        className="h-8 px-2 text-xs"
                        title="Toggle note type inputs"
                      >
                        <Music className="h-3 w-3 mr-1" />
                        Notes
                      </Button> */}
                                            <Button
                                                variant={
                                                    section.showMelody
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    toggleSectionMelody(
                                                        section.id,
                                                    )
                                                }
                                                className="h-8 px-2 text-xs"
                                                title="Toggle melody inputs"
                                            >
                                                <Music className="h-3 w-3 mr-1" />
                                                Melody
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    toggleVocalistLyricsEditor(
                                                        section.id,
                                                    )
                                                }
                                                className="h-8 px-2 text-xs"
                                                title="Edit vocalist lyrics"
                                            >
                                                <Mic className="h-3 w-3 mr-1" />
                                                Lyrics
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    duplicateSection(section.id)
                                                }
                                                className="h-8 w-8 p-0"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    deleteSection(section.id)
                                                }
                                                className="h-8 w-8 p-0"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    toggleSectionExpansion(
                                                        section.id,
                                                    )
                                                }
                                                className="h-8 w-8 p-0"
                                            >
                                                {section.isExpanded ? (
                                                    <Minus className="h-3 w-3" />
                                                ) : (
                                                    <Plus className="h-3 w-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {section.isExpanded && (
                                        <div className="space-y-3">
                                            {/* Enhanced Bar Editor Toolbar */}
                                            <div className="bg-muted/30 rounded-lg p-3 mb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Section Info */}
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>
                                                            Bars:{" "}
                                                            {
                                                                section.bars
                                                                    .length
                                                            }
                                                        </span>
                                                        {selectedBars.size >
                                                            0 && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="h-5 text-xs"
                                                            >
                                                                {
                                                                    selectedBars.size
                                                                }{" "}
                                                                selected
                                                            </Badge>
                                                        )}
                                                        {isMobile && (
                                                            <Badge
                                                                variant="outline"
                                                                className="h-5 text-xs"
                                                            >
                                                                Tap to select
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {!isMobile && (
                                                        <Separator
                                                            orientation="vertical"
                                                            className="h-6"
                                                        />
                                                    )}

                                                    {/* Primary Actions */}
                                                    <div className="flex items-center gap-1">
                                                        {/* <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => addSingleBar(section.id)}
                                                             className="h-7 px-2 text-xs hover:bg-primary/10"
                                                             title="Add new empty bar"
                                                         >
                                                             <Plus className="h-3 w-3 mr-1" />
                                                             {isMobile ? "+" : "Add Bar"}
                                                         </Button> */}

                                                        {/* <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => repeatLastBar(section.id)}
                                                             className="h-7 px-2 text-xs hover:bg-secondary/50"
                                                             title="Duplicate last bar"
                                                             disabled={section.bars.length === 0}
                                                         >
                                                             <Repeat className="h-3 w-3 mr-1" />
                                                             {isMobile ? "⟲" : "Repeat"}
                                                         </Button> */}

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                addRepeatSign(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs hover:bg-secondary/50"
                                                            title="Add repeat sign (%)"
                                                        >
                                                            <Percent className="h-3 w-3 mr-1" />
                                                        </Button>
                                                    </div>

                                                    {!isMobile && (
                                                        <Separator
                                                            orientation="vertical"
                                                            className="h-6"
                                                        />
                                                    )}

                                                    {/* Rest and Note Selectors */}
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value=""
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                addBarRest(
                                                                    section.id,
                                                                    value as any,
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 w-32 text-xs">
                                                                <SelectValue placeholder="Rest Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {/* Rest Biasa */}
                                                                <SelectItem value="whole_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={wholeRestImg} className="h-4 w-auto opacity-80" alt="WR" />
                                                                        <span>Whole Rest</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="half_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={halfRestImg} className="h-4 w-auto opacity-80" alt="HR" />
                                                                        <span>Half Rest</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="quarter_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={quarterRestImg} className="h-4 w-auto opacity-80" alt="QR" />
                                                                        <span>Quarter Rest</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="eighth_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={eighthRestImg} className="h-4 w-auto opacity-80" alt="ER" />
                                                                        <span>Eighth Rest</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="sixteenth_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <img src={sixteenthRestImg} className="h-4 w-auto opacity-80" alt="SR" />
                                                                        <span>Sixteenth Rest</span>
                                                                    </div>
                                                                </SelectItem>

                                                                <Separator className="my-2" />
                                                                <Label className="px-2 text-[10px] font-bold text-muted-foreground">
                                                                    Dotted Rests
                                                                </Label>

                                                                {/* Rest Bertitik */}
                                                                <SelectItem value="dotted_whole_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-baseline">
                                                                            <img src={wholeRestImg} className="h-4 w-auto opacity-80" alt="WR" />
                                                                            <span className="font-bold text-sm leading-none ml-[1px]">.</span>
                                                                        </div>
                                                                        <span>Dotted Whole</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="dotted_half_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-baseline">
                                                                            <img src={halfRestImg} className="h-4 w-auto opacity-80" alt="HR" />
                                                                            <span className="font-bold text-sm leading-none ml-[1px]">.</span>
                                                                        </div>
                                                                        <span>Dotted Half</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="dotted_quarter_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-baseline">
                                                                            <img src={quarterRestImg} className="h-4 w-auto opacity-80" alt="QR" />
                                                                            <span className="font-bold text-sm leading-none ml-[1px]">.</span>
                                                                        </div>
                                                                        <span>Dotted Quarter</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="dotted_eighth_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-baseline">
                                                                            <img src={eighthRestImg} className="h-4 w-auto opacity-80" alt="ER" />
                                                                            <span className="font-bold text-sm leading-none ml-[1px]">.</span>
                                                                        </div>
                                                                        <span>Dotted Eighth</span>
                                                                    </div>
                                                                </SelectItem>
                                                                <SelectItem value="dotted_sixteenth_rest">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-baseline">
                                                                            <img src={sixteenthRestImg} className="h-4 w-auto opacity-80" alt="SR" />
                                                                            <span className="font-bold text-sm leading-none ml-[1px]">.</span>
                                                                        </div>
                                                                        <span>Dotted Sixteenth</span>
                                                                    </div>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        {/* <Select
                                                            value=""
                                                            onValueChange={(value) => {
                                                                const [type, noteType] = value.split('_');
                                                                if (type === 'note') {
                                                                    addNoteSymbol(section.id, noteType as "whole_note" | "half_note" | "quarter_note" | "eighth_note" | "sixteenth_note");
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-7 w-32 text-xs">
                                                                <SelectValue placeholder="Note Type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                    <SelectItem value="note_whole_note">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-lg">WN</span>
                                                                            <span>Whole Note</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="note_half_note">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-lg">HN</span>
                                                                            <span>Half Note</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="note_quarter_note">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-lg">QN</span>
                                                                            <span>Quarter Note</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="note_eighth_note">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-lg">EN</span>
                                                                            <span>Eighth Note</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                    <SelectItem value="note_sixteenth_note">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-lg">SN</span>
                                                                            <span>Sixteenth Note</span>
                                                                        </div>
                                                                    </SelectItem>
                                                            </SelectContent>
                                                        </Select> */}
                                                        <Select
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                addTimeSignature(
                                                                    section.id,
                                                                    value as TimeSignature,
                                                                )
                                                            }
                                                            disabled={
                                                                selectedBars.size ===
                                                                0
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 w-16 px-2 text-xs">
                                                                <SelectValue placeholder="Time" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="2/4">
                                                                    2/4
                                                                </SelectItem>
                                                                <SelectItem value="3/4">
                                                                    3/4
                                                                </SelectItem>
                                                                <SelectItem value="4/4">
                                                                    4/4
                                                                </SelectItem>
                                                                <SelectItem value="5/4">
                                                                    5/4
                                                                </SelectItem>
                                                                <SelectItem value="6/8">
                                                                    6/8
                                                                </SelectItem>
                                                                <SelectItem value="7/8">
                                                                    7/8
                                                                </SelectItem>
                                                                <SelectItem value="9/8">
                                                                    9/8
                                                                </SelectItem>
                                                                <SelectItem value="12/8">
                                                                    12/8
                                                                </SelectItem>
                                                                <SelectItem value="2/2">
                                                                    2/2
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addFirstEnding(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add first ending to selected bars"
                                                        >
                                                            1st
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addSecondEnding(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add second ending to selected bars"
                                                        >
                                                            2nd
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addSegno(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add Segno sign to selected bars"
                                                        >
                                                            <img
                                                                src={segno}
                                                                alt="segno"
                                                                className={`w-[1em] h-[1em] ml-1`}
                                                            />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addCoda(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add Coda sign to selected bars"
                                                        >
                                                            <img
                                                                src={codaSign}
                                                                alt="codaSign"
                                                                className={`w-[1em] h-[1em] ml-1`}
                                                            />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addDS(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add D.S. al Coda to selected bars"
                                                        >
                                                            D.S.
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addDSAlCoda(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add D.S. al Coda to selected bars"
                                                        >
                                                            D.S. al coda
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addDCAlCoda(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add D.C. al Coda to selected bars"
                                                        >
                                                            D.C.
                                                        </Button>
                                                    </div>

                                                    {!isMobile && (
                                                        <Separator
                                                            orientation="vertical"
                                                            className="h-6"
                                                        />
                                                    )}

                                                    {/* Bulk Add Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addBarToSection(
                                                                    section.id,
                                                                    4,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add 4 bars"
                                                        >
                                                            +4
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                addBarToSection(
                                                                    section.id,
                                                                    8,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs"
                                                            title="Add 8 bars"
                                                        >
                                                            +8
                                                        </Button>
                                                    </div>

                                                    {!isMobile && (
                                                        <Separator
                                                            orientation="vertical"
                                                            className="h-6"
                                                        />
                                                    )}

                                                    {/* Advanced Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                addRepeatStartMarker(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs hover:bg-accent/50"
                                                            title="Wrap selected bars with repeat markers ||: :||"
                                                            disabled={
                                                                selectedBars.size ===
                                                                0
                                                            }
                                                        >
                                                            <span className="font-mono text-xs">
                                                                ||:
                                                            </span>
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                addRepeatEndMarker(
                                                                    section.id,
                                                                )
                                                            }
                                                            className="h-7 px-2 text-xs hover:bg-accent/50"
                                                            title="Wrap selected bars with repeat markers ||: :||"
                                                            disabled={
                                                                selectedBars.size ===
                                                                0
                                                            }
                                                        >
                                                            <span className="font-mono text-xs">
                                                                :||
                                                            </span>
                                                        </Button>
                                                    </div>

                                                    {!isMobile && (
                                                        <Separator
                                                            orientation="vertical"
                                                            className="h-6"
                                                        />
                                                    )}

                                                    {/* History Controls */}

                                                    {/* History Controls */}
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={undo}
                                                            className="h-7 px-2 text-xs"
                                                            title="Undo last action"
                                                            disabled={
                                                                historyIndex <=
                                                                0
                                                            }
                                                        >
                                                            <Undo className="h-3 w-3" />
                                                            {!isMobile &&
                                                                " Undo"}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={redo}
                                                            className="h-7 px-2 text-xs"
                                                            title="Redo last action"
                                                            disabled={
                                                                historyIndex >=
                                                                history.length -
                                                                    1
                                                            }
                                                        >
                                                            <Redo className="h-3 w-3" />
                                                            {!isMobile &&
                                                                " Redo"}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Chord Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                {" "}
                                                {/* MODIFIED LINE */}
                                                {section.bars.map(
                                                    (bar, index) => {
                                                        const barDuration =
                                                            getBarDuration();
                                                        const globalBarIndex =
                                                            sections
                                                                .slice(
                                                                    0,
                                                                    sections.findIndex(
                                                                        (s) =>
                                                                            s.id ===
                                                                            section.id,
                                                                    ),
                                                                )
                                                                .reduce(
                                                                    (
                                                                        total,
                                                                        s,
                                                                    ) =>
                                                                        total +
                                                                        s.bars
                                                                            .length,
                                                                    0,
                                                                ) + index;

                                                        const barStartTime =
                                                            globalBarIndex *
                                                            barDuration;
                                                        const barEndTime =
                                                            barStartTime +
                                                            barDuration;
                                                        const isCurrentBar =
                                                            currentTime >=
                                                                barStartTime &&
                                                            currentTime <
                                                                barEndTime &&
                                                            isPlaying;
                                                        const isSelected =
                                                            selectedBars.has(
                                                                bar.id,
                                                            );
                                                        const beatsPerBar =
                                                            getBeatsForTimeSignature(
                                                                section.timeSignature,
                                                            );

                                                        return (
                                                            <div
                                                                key={bar.id}
                                                                className={`relative border border-dashed rounded-md p-1 transition-all flex flex-col items-center justify-center min-h-[90px] ${
                                                                    isCurrentBar
                                                                        ? "bg-primary/5 border-primary"
                                                                        : "border-muted-foreground/20 hover:border-muted-foreground/40"
                                                                } ${
                                                                    isSelected
                                                                        ? "ring-1 ring-primary/30 bg-primary/5"
                                                                        : ""
                                                                }`}
                                                                onClick={(e) =>
                                                                    toggleBarSelection(
                                                                        bar.id,
                                                                        e,
                                                                    )
                                                                }
                                                            >
                                                                {bar.ending && (
                                                                    <div
                                                                        className="absolute -top-3 z-10 pointer-events-none"
                                                                        style={{
                                                                            // Menjembatani gap antar grid (asumsi gap-2 atau 8px)
                                                                            left: bar
                                                                                .ending
                                                                                .isStart
                                                                                ? "0"
                                                                                : "-5px",
                                                                            right: bar
                                                                                .ending
                                                                                .isEnd
                                                                                ? "0"
                                                                                : "-5px",
                                                                        }}
                                                                    >
                                                                        <div
                                                                            className={`
      relative h-4 border-foreground border-t-[1.5px]
      ${bar.ending.isStart ? "border-l-[1.5px]" : ""} 
      ${bar.ending.isEnd ? "border-r-[1.5px] h-2.5" : ""}
    `}
                                                                        >
                                                                            {bar
                                                                                .ending
                                                                                .isStart && (
                                                                                <span className="absolute -top-3.5 left-0 text-[11px] font-bold bg-background px-1 leading-none">
                                                                                    {
                                                                                        bar
                                                                                            .ending
                                                                                            .type
                                                                                    }

                                                                                    .
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {/* 1. NOTASI (RHYTHM) - SEJAJAR DI TENGAH */}
                                                                {/* <div className="w-full flex justify-center h-6 items-center overflow-hidden">
                                                                    {bar.notes &&
                                                                    bar.notes
                                                                        .length >
                                                                        0 ? (
                                                                        <NotationDisplay
                                                                            notes={
                                                                                bar.notes
                                                                            }
                                                                            className="opacity-90" // Menghapus scale agar tidak pecah/geser
                                                                        />
                                                                    ) : (
                                                                        <div className="h-1" />
                                                                    )}
                                                                </div> */}

                                                                {/* 2. AREA CHORD & REST - SUPPORT MULTIPLE CHORDS WITH REST IN BETWEEN */}
                                                                <div className="flex-1 w-full flex flex-row items-center justify-center gap-1 relative group min-h-[60px] px-1">
                                                                    {/* AREA CHORD & RITME - Versi 3 Chord Slot */}
                                                                    {/* AREA CHORD & RITME - 3 Slot Rapat & Padat */}
                                                                    <div className="flex flex-row items-center justify-center gap-0.5 w-full py-2">
                                                                        {/* 1. CHORD UTAMA */}
                                                                        <div className="flex flex-col items-center">
                                                                            <div className="h-4 flex items-center justify-center mb-1 w-full relative">
                                                                                {bar.notes &&
                                                                                    bar
                                                                                        .notes
                                                                                        .length >
                                                                                        0 && (
                                                                                        <NotationDisplay
                                                                                            notes={
                                                                                                bar.notes
                                                                                            }
                                                                                            className="scale-[0.7] origin-top"
                                                                                        />
                                                                                    )}
                                                                            </div>
                                                                            <input
                                                                                ref={(
                                                                                    el,
                                                                                ) =>
                                                                                    (inputRefs.current[
                                                                                        `${bar.id}-primary`
                                                                                    ] =
                                                                                        el)
                                                                                }
                                                                                value={
                                                                                    bar.chord
                                                                                }
                                                                                onChange={(
                                                                                    e,
                                                                                ) =>
                                                                                    updateChord(
                                                                                        section.id,
                                                                                        bar.id,
                                                                                        e
                                                                                            .target
                                                                                            .value,
                                                                                    )
                                                                                }
                                                                                onKeyDown={(
                                                                                    e,
                                                                                ) =>
                                                                                    handleKeyDown(
                                                                                        e,
                                                                                        section.id,
                                                                                        bar.id,
                                                                                        "primary",
                                                                                    )
                                                                                }
                                                                                placeholder={
                                                                                    bar.restType
                                                                                        ? ""
                                                                                        : "—"
                                                                                }
                                                                                className="bg-transparent border-none text-center text-md focus:outline-none p-0 m-0 font-bold  text-foreground"
                                                                                style={{
                                                                                    width: bar.chord
                                                                                        ? `${
                                                                                              bar
                                                                                                  .chord
                                                                                                  .length +
                                                                                              0.5
                                                                                          }ch`
                                                                                        : "2ch",
                                                                                }}
                                                                            />
                                                                        </div>

                                                                        {/* 2. REST TENGAH */}
                                                                        {bar.restType && (
                                                                            <div className="flex items-center self-end pb-0.5 px-0.5">
                                                                                <img
                                                                                    src={
                                                                                        bar.restType.startsWith("WR") ? wholeRestImg
                                                                                    : bar.restType.startsWith("HR") ? halfRestImg
                                                                                    : bar.restType.startsWith("QR") ? quarterRestImg
                                                                                    : bar.restType.startsWith("ER") ? eighthRestImg
                                                                                    : sixteenthRestImg // <-- Fallback ke sixteenth rest jika SR
                                                                                    }
                                                                                    className="h-5 w-auto opacity-90"
                                                                                />
                                                                                {/* Jika kode rest mengandung titik, tampilkan teks titik di sebelahnya */}
                                                                                {bar.restType.endsWith(
                                                                                    ".",
                                                                                ) && (
                                                                                    <span className="font-bold text-lg leading-none ml-0.5">
                                                                                        .
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* 3. CHORD KEDUA (chordAfter) */}
                                                                        {bar.restType && (
                                                                            <div className="flex flex-col items-center">
                                                                                <div className="h-4 flex items-center justify-center mb-1 w-full relative">
                                                                                    {/* {bar.notes && (
                                          <NotationDisplay
                                            notes={bar.notes.filter(
                                              (n) => n.beat > 1 && n.beat <= 3,
                                            )}
                                            className="scale-[0.65] origin-bottom"
                                          />
                                        )} */}
                                                                                </div>
                                                                                <input
                                                                                    ref={(
                                                                                        el,
                                                                                    ) =>
                                                                                        (inputRefs.current[
                                                                                            `${bar.id}-after`
                                                                                        ] =
                                                                                            el)
                                                                                    }
                                                                                    value={
                                                                                        bar.chordAfter ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        updateChordAfter(
                                                                                            section.id,
                                                                                            bar.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleKeyDown(
                                                                                            e,
                                                                                            section.id,
                                                                                            bar.id,
                                                                                            "after",
                                                                                        )
                                                                                    }
                                                                                    placeholder="..."
                                                                                    className="bg-transparent border-none text-center text-md focus:outline-none p-0 m-0 font-bold  text-primary"
                                                                                    style={{
                                                                                        width: bar.chordAfter
                                                                                            ? `${
                                                                                                  bar
                                                                                                      .chordAfter
                                                                                                      .length +
                                                                                                  0.5
                                                                                              }ch`
                                                                                            : "2ch",
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}

                                                                        {/* 4. REST AKHIR (TRAILING) */}
                                                                        {bar.trailingRestType && (
                                                                            <div className="flex items-center self-end pb-0.5 px-0.5">
                                                                                <img
                                                                                    src={
                                                                                        bar.trailingRestType.startsWith("WR") ? wholeRestImg
                                                                                    : bar.trailingRestType.startsWith("HR") ? halfRestImg
                                                                                    : bar.trailingRestType.startsWith("QR") ? quarterRestImg
                                                                                    : bar.trailingRestType.startsWith("ER") ? eighthRestImg
                                                                                    : sixteenthRestImg // <-- Fallback ke sixteenth rest jika SR
                                                                                    }
                                                                                    className="h-5 w-auto opacity-90"
                                                                                />
                                                                                {bar.trailingRestType.endsWith(
                                                                                    ".",
                                                                                ) && (
                                                                                    <span className="font-bold text-lg leading-none ml-0.5">
                                                                                        .
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* 5. CHORD KETIGA (chordEnd) */}
                                                                        {bar.trailingRestType && (
                                                                            <div className="flex flex-col items-center">
                                                                                <div className="h-4 flex items-center justify-center mb-1 w-full relative">
                                                                                    {/* {bar.notes && (
                                          <NotationDisplay
                                            notes={bar.notes.filter(
                                              (n) => n.beat > 3,
                                            )}
                                            className="scale-[0.65] origin-bottom"
                                          />
                                        )} */}
                                                                                </div>
                                                                                <input
                                                                                    ref={(
                                                                                        el,
                                                                                    ) =>
                                                                                        (inputRefs.current[
                                                                                            `${bar.id}-end`
                                                                                        ] =
                                                                                            el)
                                                                                    }
                                                                                    value={
                                                                                        bar.chordEnd ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e,
                                                                                    ) =>
                                                                                        updateChordEnd(
                                                                                            section.id,
                                                                                            bar.id,
                                                                                            e
                                                                                                .target
                                                                                                .value,
                                                                                        )
                                                                                    }
                                                                                    onKeyDown={(
                                                                                        e,
                                                                                    ) =>
                                                                                        handleKeyDown(
                                                                                            e,
                                                                                            section.id,
                                                                                            bar.id,
                                                                                            "end",
                                                                                        )
                                                                                    }
                                                                                    placeholder="..."
                                                                                    className="bg-transparent border-none text-center text-md focus:outline-none p-0 m-0 font-bold text-foreground"
                                                                                    style={{
                                                                                        width: bar.chordEnd
                                                                                            ? `${
                                                                                                  bar
                                                                                                      .chordEnd
                                                                                                      .length +
                                                                                                  0.5
                                                                                              }ch`
                                                                                            : "2ch",
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Tombol X tetap di pojok */}
                                                                    {bar.restType && (
                                                                        <button
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                saveToHistory(
                                                                                    sections,
                                                                                ); // Simpan history sebelum menghapus

                                                                                const updatedSections =
                                                                                    sections.map(
                                                                                        (
                                                                                            s,
                                                                                        ) => ({
                                                                                            ...s,
                                                                                            bars: s.bars.map(
                                                                                                (
                                                                                                    b,
                                                                                                ) => {
                                                                                                    if (
                                                                                                        b.id ===
                                                                                                        bar.id
                                                                                                    ) {
                                                                                                        // LOGIKA PERBAIKAN:
                                                                                                        // Gabungkan chord pertama dan chordAfter menjadi satu string di chord utama
                                                                                                        const mergedChord =
                                                                                                            b.chordAfter
                                                                                                                ? `${b.chord} ${b.chordAfter}`.trim()
                                                                                                                : b.chord;

                                                                                                        return {
                                                                                                            ...b,
                                                                                                            chord: mergedChord, // Chord pindah ke sini
                                                                                                            restType:
                                                                                                                undefined, // Rest dihapus
                                                                                                            chordAfter:
                                                                                                                undefined, // Input kedua dibersihkan karena sudah gabung ke atas
                                                                                                        };
                                                                                                    }
                                                                                                    return b;
                                                                                                },
                                                                                            ),
                                                                                        }),
                                                                                    );
                                                                                setSections(
                                                                                    updatedSections,
                                                                                );

                                                                                toast(
                                                                                    {
                                                                                        title: "Rest Dihapus",
                                                                                        description:
                                                                                            "Chord telah digabungkan kembali.",
                                                                                        duration: 2000,
                                                                                    },
                                                                                );
                                                                            }}
                                                                            className="absolute top-1 right-1 h-4 w-4 bg-destructive text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* 3. MELODI - DI BAWAH (FONT NORMAL) */}
                                                                {section.showMelody && (
                                                                    <div className="w-full mt-2 pt-1 border-t border-dotted border-muted-foreground/10">
                                                                        <input
                                                                            value={
                                                                                bar
                                                                                    .melody
                                                                                    ?.notAngka ||
                                                                                ""
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                updateMelody(
                                                                                    section.id,
                                                                                    bar.id,
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            placeholder="1 2 3"
                                                                            className="w-full bg-transparent border-none text-center text-[10px] font-mono focus:outline-none p-0 text-muted-foreground"
                                                                            style={{
                                                                                fontWeight:
                                                                                    "400",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Nomor Bar (Kecil di pojok kiri atas) */}
                                                                {showBarNumbers && (
                                                                    <span className="absolute top-0.5 left-1 text-[8px] text-muted-foreground/30 font-mono select-none">
                                                                        {globalBarIndex +
                                                                            1}
                                                                    </span>
                                                                )}

                                                                {/* Tombol Hapus Bar */}
                                                                <button
                                                                    className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={(
                                                                        e,
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        removeBarFromSection(
                                                                            section.id,
                                                                            bar.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                </button>

                                                                {/* Editor Detail saat Bar dipilih */}
                                                                {isSelected && (
                                                                    <div
                                                                        className="absolute top-full left-0 w-full z-30 mt-1 bg-white border rounded-md shadow-md p-2"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        <FlexibleNoteEditor
                                                                            timeSignature={
                                                                                bar.timeSignatureOverride ||
                                                                                section.timeSignature
                                                                            }
                                                                            notes={
                                                                                bar.notes ||
                                                                                []
                                                                            }
                                                                            onNotesChange={(
                                                                                newNotes,
                                                                            ) =>
                                                                                updateBarNotes(
                                                                                    section.id,
                                                                                    bar.id,
                                                                                    newNotes,
                                                                                )
                                                                            }
                                                                            availableChords={
                                                                                [
                                                                                    ...bar.chord.split(
                                                                                        /\s+/,
                                                                                    ),
                                                                                    ...(bar.chordAfter?.split(
                                                                                        /\s+/,
                                                                                    ) ||
                                                                                        []),
                                                                                    ...(bar.chordEnd?.split(
                                                                                        /\s+/,
                                                                                    ) ||
                                                                                        []),
                                                                                ].filter(
                                                                                    Boolean,
                                                                                ) as string[]
                                                                            }
                                                                            compact
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                                {/* Add Single Bar Button - styled like regular bar but more prominent */}
                                                <div
                                                    onClick={() =>
                                                        addBarToSection(
                                                            section.id,
                                                            1,
                                                        )
                                                    }
                                                    className={`border-2 border-dashed rounded p-2 ${
                                                        section.showMelody ||
                                                        section.showNoteTypes
                                                            ? "min-h-[100px]"
                                                            : section.showMelody
                                                            ? "min-h-[80px]"
                                                            : section.showNoteTypes
                                                            ? "min-h-[80px]"
                                                            : "min-h-[60px]"
                                                    } flex flex-col justify-center cursor-pointer border-primary/50 hover:border-primary transition-all duration-200 hover:bg-primary/5 bg-primary/5`}
                                                >
                                                    <div className="text-center">
                                                        <Plus className="h-4 w-4 mx-auto text-primary mb-1" />
                                                        <div className="text-xs font-medium text-primary">
                                                            {/* Add Bar */}
                                                            {t(
                                                                "chordGrid.addBar",
                                                            )}
                                                        </div>
                                                    </div>

                                                    {section.showNoteTypes && (
                                                        <div className="mb-2 border-b border-dashed border-primary/30 pb-1">
                                                            <div className="text-center text-xs text-primary/60">
                                                                (notes)
                                                            </div>
                                                        </div>
                                                    )}

                                                    {section.showMelody && (
                                                        <div className="mt-2 border-t border-dashed border-primary/30 pt-1">
                                                            <div className="text-center text-xs text-primary/60">
                                                                (melody)
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Enter Bar Button - moves to next line */}
                                                <div
                                                    onClick={() =>
                                                        enterBarToSection(
                                                            section.id,
                                                        )
                                                    }
                                                    className={`border-2 border-dashed rounded p-2 ${
                                                        section.showMelody ||
                                                        section.showNoteTypes
                                                            ? "min-h-[100px]"
                                                            : section.showMelody
                                                            ? "min-h-[80px]"
                                                            : section.showNoteTypes
                                                            ? "min-h-[80px]"
                                                            : "min-h-[60px]"
                                                    } flex flex-col justify-center cursor-pointer border-primary/50 hover:border-primary transition-all duration-200 hover:bg-primary/5 bg-primary/5`}
                                                >
                                                    <div className="text-center">
                                                        <div className="h-4 w-4 mx-auto text-primary mb-1 flex items-center justify-center text-xs">
                                                            ↵
                                                        </div>
                                                        <div className="text-xs font-medium text-primary">
                                                            Enter Bar
                                                        </div>
                                                    </div>

                                                    {section.showNoteTypes && (
                                                        <div className="mb-2 border-b border-dashed border-secondary/30 pb-1">
                                                            <div className="text-center text-xs text-secondary/60">
                                                                (notes)
                                                            </div>
                                                        </div>
                                                    )}

                                                    {section.showMelody && (
                                                        <div className="mt-2 border-t border-dashed border-secondary/30 pt-1">
                                                            <div className="text-center text-xs text-secondary/60">
                                                                (melody)
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Vocalist Lyrics Editor */}
                                            {showVocalistLyricsEditor ===
                                                section.id && (
                                                <div className="mt-4">
                                                    <VocalistLyricsEditor
                                                        sectionName={
                                                            section.name
                                                        }
                                                        sectionType="chord_grid"
                                                        currentLyrics={
                                                            vocalistLyrics[
                                                                section.id
                                                            ] || ""
                                                        }
                                                        onSave={(lyrics) =>
                                                            saveVocalistLyrics(
                                                                section.id,
                                                                lyrics,
                                                            )
                                                        }
                                                        onPreview={() =>
                                                            previewVocalistLyrics(
                                                                section.id,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Mobile Add Section Button at Bottom */}
                            {sections.length > 0 && (
                                <div className="flex justify-center pt-4 pb-2">
                                    <Button
                                        onClick={addSection}
                                        size="lg"
                                        className="w-full max-w-xs animate-fade-in"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        {/* Add Section */}
                                        {t("chordGrid.addSection")}
                                    </Button>
                                </div>
                            )}

                            {sections.length === 0 && (
                                <div className="text-center py-8">
                                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">
                                        No sections yet
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        Add a section to start building your
                                        chord sheet
                                    </p>
                                    <Button onClick={addSection}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Section
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : editorMode === "handwriting" ? (
                        /* Handwriting Mode */
                        <div className="h-[600px]">
                            <HandwritingChordCanvas
                                onApply={(text) => {
                                    parseAndPopulateFromOCR(text);
                                    setEditorMode("grid");
                                    toast({
                                        title: "Chords Applied!",
                                        description: "Handwritten chords have been added to the grid.",
                                    });
                                }}
                                onClose={() => setEditorMode("grid")}
                            />
                        </div>
                    ) : editorMode === "blank-canvas" ? (
                        /* Blank Grid Canvas Mode */
                        <div className="h-[600px]">
                            <BlankGridCanvas
                                onApply={(text) => {
                                    parseAndPopulateFromOCR(text);
                                    setEditorMode("grid");
                                    toast({
                                        title: "Chords Applied!",
                                        description: "Handwritten chords from blank canvas have been added to the grid.",
                                    });
                                }}
                                onClose={() => setEditorMode("grid")}
                            />
                        </div>
                    ) : editorMode === "image-upload" ? (
                        /* Image Upload Mode */
                        <div className="h-[600px]">
                            <ImageChordImport
                                onApply={(text, metadata) => {
                                    // Panggil fungsi dan cek hasilnya
                                    const isSuccess = parseAndPopulateFromOCR(text);
                                    
                                    if (isSuccess) {
                                        if (metadata.title) setSongTitle(metadata.title);
                                        if (metadata.artist) setArtistName(metadata.artist);
                                        if (metadata.songKey) setSongKey(metadata.songKey);
                                        if (metadata.tempo) setTempo(metadata.tempo);
                                        if (metadata.timeSignature) setTimeSignature(metadata.timeSignature as TimeSignature);
                                        
                                        // HANYA pindah mode jika sukses
                                        setEditorMode("grid"); 
                                    }
                                    // Jika gagal, user tetap di layar import untuk memperbaiki teks
                                }}
                                onClose={() => setEditorMode("grid")}
                            />
                        </div>
                    ) : (
                        /* Text Mode */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
                            <TextModeEditor
                                value={textModeContent}
                                onChange={handleTextModeChange}
                                className="h-full"
                            />
                            <LiveChordPreview
                                textInput={textModeContent}
                                songTitle={songTitle}
                                artistName={artistName}
                                songKey={songKey}
                                tempo={tempo}
                                timeSignature={timeSignature}
                                className="h-full"
                            />
                        </div>
                    )}
                </CardContent>

                {/* Save Button at Bottom */}
                <div className="px-4 pb-4">
                    <Button
                        onClick={saveChordGrid}
                        className="w-full"
                        disabled={isSaving}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {
                            isSaving
                                ? "Saving..."
                                : currentChordGridId
                                ? t("chordGrid.updateChord") // <-- Diperbaiki
                                : t("chordGrid.saveChord") // <-- Diperbaiki
                        }
                    </Button>
                </div>
            </Card>

            {/* Load Modal */}
            {showLoadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <FolderOpen className="h-5 w-5" />
                                    Load Chord Grid
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowLoadModal(false)}
                                >
                                    <Minus className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-y-auto">
                            {savedChordGrids.length === 0 ? (
                                <div className="text-center py-8">
                                    <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold">
                                        No saved chord grids
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Create and save your first chord grid to
                                        see it here
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Langsung panggil .map() pada array savedChordGrids */}
                                    {savedChordGrids.map((grid) => {
                                        // Logika untuk membuat pratinjau melodi
                                        let melodyPreview = "No melody data";
                                        try {
                                            if (
                                                grid.song_sections &&
                                                grid.song_sections[0] &&
                                                grid.song_sections[0].lyrics
                                            ) {
                                                const firstSectionBars =
                                                    JSON.parse(
                                                        grid.song_sections[0]
                                                            .lyrics,
                                                    );

                                                const melodyNotes =
                                                    firstSectionBars
                                                        .filter(
                                                            (bar) =>
                                                                bar.melody
                                                                    ?.notAngka,
                                                        )
                                                        .slice(0, 4)
                                                        .map((bar) =>
                                                            bar.melody.notAngka.trim(),
                                                        )
                                                        .join(" | ");

                                                if (melodyNotes) {
                                                    melodyPreview = melodyNotes;
                                                }
                                            }
                                        } catch (e) {
                                            console.error(
                                                "Could not parse melody preview for grid:",
                                                grid.id,
                                                e,
                                            );
                                        }

                                        // Return elemen JSX secara langsung
                                        return (
                                            <div
                                                key={grid.id}
                                                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="flex items-start sm:items-center justify-between gap-3">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold">
                                                            {grid.title}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {grid.artist &&
                                                                `${grid.artist} • `}
                                                            Key:{" "}
                                                            {grid.current_key} •{" "}
                                                            {grid.tempo} BPM
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded w-fit">
                                                            Melody:{" "}
                                                            {melodyPreview.length >
                                                            30
                                                                ? `${melodyPreview.substring(
                                                                      0,
                                                                      30,
                                                                  )}...`
                                                                : melodyPreview}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-2">
                                                            Updated:{" "}
                                                            {new Date(
                                                                grid.updated_at,
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                loadChordGrid(
                                                                    grid.id,
                                                                )
                                                            }
                                                        >
                                                            Load
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        "Are you sure you want to delete this chord grid?",
                                                                    )
                                                                ) {
                                                                    deleteChordGrid(
                                                                        grid.id,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Section Arrangement Step */}
            {/* {showArrangementStep && (
                <div className="fixed inset-0 bg-background z-50 overflow-auto">
                    <div className="min-h-screen py-8">
                        <SectionArrangementStep
                            sections={currentSections}
                            availableSections={currentSectionsForView}
                            onSectionsReorder={handleSectionsReorder}
                            onBack={handleBackToEditor}
                            onSave={handleFinalSave}
                            isSaving={isSaving}
                            songTitle={songTitle}
                            artistName={artistName}
                            songKey={songKey}
                        />
                    </div>
                </div>
            )} */}

            {/* AI Validation Overlay */}
            <ValidationOverlay 
                isOpen={showValidationOverlay}
                validationResult={validationResult}
                onComplete={(success) => {
                    setShowValidationOverlay(false);
                    navigate("/library");
                }}
            />
        </div>
    );
};
export default ChordGridGenerator;
