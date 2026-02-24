import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Plus } from "lucide-react";
import { calculateChordNotes, parseFormulaString } from "@/lib/chordTheory";
import { getChordData } from "@/lib/chordDatabase";
import { useState } from "react";

interface ChordData {
    chord_name: string;
    root_note: string;
    quality: string;
    bass_note?: string;
    instrument: "guitar" | "piano" | "both";
    status: "draft" | "approved" | "deprecated";
    notes: string;
    formula?: string;
    guitar_fingering: (number | "x")[];
    guitar_chord_shape: string;
    guitar_difficulty: number;
    piano_notes: string[];
    piano_fingering: string;
    piano_hand: "left" | "right" | "both";
}

interface ChordMetadataFormProps {
    chordData: ChordData;
    onChange: (data: ChordData) => void;
}

const ROOT_NOTES = [
    { value: "C", enharmonic: "B#" },
    { value: "C#", enharmonic: "Db" },
    { value: "D", enharmonic: null },
    { value: "D#", enharmonic: "Eb" },
    { value: "E", enharmonic: "Fb" },
    { value: "F", enharmonic: "E#" },
    { value: "F#", enharmonic: "Gb" },
    { value: "G", enharmonic: null },
    { value: "G#", enharmonic: "Ab" },
    { value: "A", enharmonic: null },
    { value: "A#", enharmonic: "Bb" },
    { value: "B", enharmonic: "Cb" },
];

const CHORD_QUALITIES = [
    { value: "maj", label: "Major", formula: "1-3-5" },
    { value: "min", label: "Minor", formula: "1-b3-5" },
    { value: "7", label: "Dominant 7th", formula: "1-3-5-b7" },
    { value: "maj7", label: "Major 7th", formula: "1-3-5-7" },
    { value: "min7", label: "Minor 7th", formula: "1-b3-5-b7" },
    { value: "sus2", label: "Suspended 2nd", formula: "1-2-5" },
    { value: "sus4", label: "Suspended 4th", formula: "1-4-5" },
    { value: "dim", label: "Diminished", formula: "1-b3-b5" },
    { value: "aug", label: "Augmented", formula: "1-3-#5" },
    { value: "add9", label: "Add 9", formula: "1-3-5-9" },
    { value: "9", label: "9th", formula: "1-3-5-b7-9" },
    { value: "11", label: "11th", formula: "1-3-5-b7-9-11" },
    { value: "13", label: "13th", formula: "1-3-5-b7-9-11-13" },
    { value: "m7b5", label: "Half Diminished", formula: "1-b3-b5-b7" },
    { value: "dim7", label: "Diminished 7th", formula: "1-b3-b5-bb7" },
];

// Guitar constants
const GUITAR_STRINGS = ["E", "A", "D", "G", "B", "E"]; // Standard tuning
const FRETS = Array.from({ length: 9 }, (_, i) => i); // 0-8 frets for compact view
const DIFFICULTIES = [
    { value: 1, label: "Easy", color: "bg-green-500" },
    { value: 2, label: "Medium", color: "bg-yellow-500" },
    { value: 3, label: "Advanced", color: "bg-red-500" },
];

// Piano constants
const PIANO_NOTES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];
const OCTAVES = [2, 3, 4, 5, 6];

const ChordMetadataForm = ({ chordData, onChange }: ChordMetadataFormProps) => {
    const [startOctave, setStartOctave] = useState(4);
    const [numOctaves, setNumOctaves] = useState(2);
    const [isEditingName, setIsEditingName] = useState(false);

    const handleFieldChange = (field: keyof ChordData, value: any) => {
        onChange({ ...chordData, [field]: value });
    };

    // Guitar functions
    const handleFretClick = (stringIndex: number, fret: number) => {
        const newFingering = [...chordData.guitar_fingering];
        newFingering[stringIndex] = fret;
        handleFieldChange("guitar_fingering", newFingering);
    };

    const handleStringMute = (stringIndex: number) => {
        const newFingering = [...chordData.guitar_fingering];
        newFingering[stringIndex] = "x";
        handleFieldChange("guitar_fingering", newFingering);
    };

    const clearFretboard = () => {
        handleFieldChange("guitar_fingering", [0, 0, 0, 0, 0, 0]);
    };

    // Piano functions
    const handleKeyClick = (note: string, octave: number) => {
        const fullNote = `${note}${octave}`;
        const currentNotes = [...chordData.piano_notes];

        if (currentNotes.includes(fullNote)) {
            const updatedNotes = currentNotes.filter((n) => n !== fullNote);
            handleFieldChange("piano_notes", updatedNotes);
        } else {
            const updatedNotes = [...currentNotes, fullNote].sort();
            handleFieldChange("piano_notes", updatedNotes);
        }
    };

    const clearKeyboard = () => {
        handleFieldChange("piano_notes", []);
    };

    const playPreview = () => {
        const audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.5
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    const applyFormulaToVoicings = (formula: string) => {
        if (!chordData.root_note || !formula) return;

        // Generate chord data based on formula
        const chordString = chordData.bass_note
            ? `${chordData.root_note}${chordData.quality}/${chordData.bass_note}`
            : `${chordData.root_note}${chordData.quality}`;

        const generatedChordData = getChordData(chordString);

        if (generatedChordData) {
            // Apply to guitar
            if (generatedChordData.guitar && chordData.instrument !== "piano") {
                onChange({
                    ...chordData,
                    formula,
                    guitar_fingering: generatedChordData.guitar.frets || [],
                    guitar_chord_shape: "",
                    guitar_difficulty: 1,
                });
            }

            // Apply to piano
            if (generatedChordData.piano && chordData.instrument !== "guitar") {
                onChange({
                    ...chordData,
                    formula,
                    piano_notes: generatedChordData.piano.notes || [],
                    piano_fingering: "",
                    piano_hand: "both",
                });
            }

            // Apply to both if instrument is "both"
            if (
                chordData.instrument === "both" &&
                generatedChordData.guitar &&
                generatedChordData.piano
            ) {
                onChange({
                    ...chordData,
                    formula,
                    guitar_fingering: generatedChordData.guitar.frets || [],
                    guitar_chord_shape: "",
                    guitar_difficulty: 1,
                    piano_notes: generatedChordData.piano.notes || [],
                    piano_fingering: "",
                    piano_hand: "both",
                });
            }
        }
    };

    const handleFormulaChange = (newFormula: string) => {
        if (!chordData.root_note || !newFormula) return;

        // Parse the formula string and calculate the notes
        const intervals = parseFormulaString(newFormula);
        const notes = calculateChordNotes(chordData.root_note, intervals);

        // Update the chord data with new formula and notes
        onChange({
            ...chordData,
            formula: newFormula,
            notes: notes.join(", "),
        });
    };

    const selectedQuality = CHORD_QUALITIES.find(
        (q) => q.value === chordData.quality
    );
    const currentFormula = chordData.formula || selectedQuality?.formula || "";

    return (
        <>
            {/* Root Note */}
            {/* <div className="space-y-3">
        <Label htmlFor="root_note" className="text-lg font-medium">Root Note</Label>
        <Select
          value={chordData.root_note}
          onValueChange={(value) => handleFieldChange("root_note", value)}
        >
          <SelectTrigger className="h-12 text-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROOT_NOTES.map((note) => (
              <SelectItem key={note.value} value={note.value} className="text-lg py-3">
                {note.value}
                {note.enharmonic && (
                  <span className="text-muted-foreground ml-2">
                    ({note.enharmonic})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

            {/* Bass Note (Optional - for slash chords) */}
            {/* <div className="space-y-3">
        <Label htmlFor="bass_note" className="text-lg font-medium">
          Bass Note <span className="text-sm text-muted-foreground">(optional)</span>
        </Label>
        <Select
          value={chordData.bass_note || "none"}
          onValueChange={(value) => handleFieldChange("bass_note", value === "none" ? undefined : value)}
        >
          <SelectTrigger className="h-12 text-lg">
            <SelectValue placeholder="None (for slash chords like C/G)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-lg py-3">
              None
            </SelectItem>
            {ROOT_NOTES.map((note) => (
              <SelectItem key={note.value} value={note.value} className="text-lg py-3">
                {note.value}
                {note.enharmonic && (
                  <span className="text-muted-foreground ml-2">
                    ({note.enharmonic})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

            {/* Quality */}
            {/* <div className="space-y-3">
        <Label htmlFor="quality" className="text-lg font-medium">Chord Type</Label>
        <Select
          value={chordData.quality}
          onValueChange={(value) => handleFieldChange("quality", value)}
        >
          <SelectTrigger className="h-12 text-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {CHORD_QUALITIES.map((quality) => (
              <SelectItem key={quality.value} value={quality.value} className="py-3">
                <div className="flex justify-between items-center w-full">
                  <span className="text-lg">{quality.label}</span>
                  <span className="text-sm text-muted-foreground ml-4 font-mono">
                    {quality.formula}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

            {/* Formula Editor */}
            {/* <div className="space-y-3">
        <Label htmlFor="formula" className="text-lg font-medium">
          Chord Formula
          <span className="text-sm font-normal text-muted-foreground ml-2">
            (Editable - will auto-apply to guitar/piano tabs)
          </span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="formula"
            value={currentFormula}
            onChange={(e) => handleFormulaChange(e.target.value)}
            placeholder="e.g., 1-3-5-b7"
            className="h-12 text-lg font-mono"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => selectedQuality && handleFormulaChange(selectedQuality.formula)}
            className="h-12"
            disabled={!selectedQuality}
          >
            Reset to Default
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Format: intervals separated by dashes (e.g., 1-3-5 for major triad, 1-b3-5-b7 for minor 7th)
        </p>
      </div> */}

            {/* Generated Chord Name & Notes */}
            <div className="space-y-3">
                <Label className="text-lg font-medium">Generated Chord</Label>
                <div className="space-y-2">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                        <div className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                            {isEditingName ? (
                                <Input
                                    autoFocus
                                    placeholder="Enter chord name"
                                    value={chordData.chord_name}
                                    onChange={(e) =>
                                        handleFieldChange(
                                            "chord_name",
                                            e.target.value
                                        )
                                    }
                                    onBlur={() => setIsEditingName(false)} // auto selesai saat keluar
                                    className="text-center text-2xl font-bold w-auto"
                                />
                            ) : (
                                <>
                                    {chordData.chord_name ||
                                        "Select chord type"}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditingName(true)}
                                        className="h-6 w-6"
                                    >
                                        ✏️
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="text-lg text-center text-muted-foreground mt-2 font-mono">
                            {chordData.notes || "Notes will appear here"}
                        </div>
                        <div className="text-sm text-center text-muted-foreground mt-2">
                            Formula:{" "}
                            <code className="bg-background px-2 py-1 rounded">
                                {currentFormula}
                            </code>
                        </div>
                    </div>
                </div>
            </div>

            {/* Guitar Fretboard Section */}
            {(chordData.instrument === "guitar" ||
                chordData.instrument === "both") && (
                <div className="space-y-4">
                    <Label className="text-lg font-medium">
                        🎸 Guitar Fretboard
                    </Label>

                    {/* Guitar Settings */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm">Difficulty</Label>
                            <Select
                                value={chordData.guitar_difficulty.toString()}
                                onValueChange={(value) =>
                                    handleFieldChange(
                                        "guitar_difficulty",
                                        parseInt(value)
                                    )
                                }
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DIFFICULTIES.map((diff) => (
                                        <SelectItem
                                            key={diff.value}
                                            value={diff.value.toString()}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${diff.color}`}
                                                />
                                                {diff.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm">Chord Shape</Label>
                            <Input
                                className="h-8"
                                value={chordData.guitar_chord_shape}
                                onChange={(e) =>
                                    handleFieldChange(
                                        "guitar_chord_shape",
                                        e.target.value
                                    )
                                }
                                placeholder="e.g., Open C, Barre F"
                            />
                        </div>

                        <div className="flex items-end gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFretboard}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={playPreview}
                            >
                                <Play className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Fretboard */}
                    <Card className="p-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium text-sm">
                                    Fretboard
                                </h4>
                                <div className="text-xs text-muted-foreground">
                                    Click frets • Right-click to mute
                                </div>
                            </div>

                            <div className="relative">
                                {/* Fret markers */}
                                <div className="flex mb-1">
                                    <div className="w-8"></div>
                                    {FRETS.slice(1).map((fret) => (
                                        <div
                                            key={fret}
                                            className="flex-1 text-center text-xs text-muted-foreground"
                                        >
                                            {fret}
                                        </div>
                                    ))}
                                </div>

                                {/* Fretboard grid */}
                                <div className="space-y-0.5">
                                    {GUITAR_STRINGS.map(
                                        (string, stringIndex) => (
                                            <div
                                                key={stringIndex}
                                                className="flex items-center"
                                            >
                                                <div className="w-8 text-xs font-medium text-right pr-1">
                                                    {string}
                                                </div>

                                                <div className="flex flex-1 border border-border rounded">
                                                    {FRETS.map((fret) => (
                                                        <button
                                                            key={fret}
                                                            className={`
                              flex-1 h-6 border-r border-border last:border-r-0 
                              hover:bg-accent transition-colors relative text-xs
                              ${
                                  chordData.guitar_fingering[stringIndex] ===
                                  fret
                                      ? "bg-primary text-primary-foreground"
                                      : chordData.guitar_fingering[
                                            stringIndex
                                        ] === "x"
                                      ? "bg-destructive/20"
                                      : "bg-background"
                              }
                            `}
                                                            onClick={() =>
                                                                handleFretClick(
                                                                    stringIndex,
                                                                    fret
                                                                )
                                                            }
                                                            onContextMenu={(
                                                                e
                                                            ) => {
                                                                e.preventDefault();
                                                                handleStringMute(
                                                                    stringIndex
                                                                );
                                                            }}
                                                        >
                                                            {chordData
                                                                .guitar_fingering[
                                                                stringIndex
                                                            ] === fret &&
                                                                fret > 0 && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="w-3 h-3 bg-primary-foreground rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                                            {
                                                                                fret
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            {chordData
                                                                .guitar_fingering[
                                                                stringIndex
                                                            ] === 0 &&
                                                                fret === 0 && (
                                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                                        <div className="w-3 h-3 border border-primary rounded-full flex items-center justify-center text-xs font-bold">
                                                                            O
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            {chordData
                                                                .guitar_fingering[
                                                                stringIndex
                                                            ] === "x" &&
                                                                fret === 0 && (
                                                                    <div className="absolute inset-0 flex items-center justify-center text-destructive font-bold text-xs">
                                                                        ×
                                                                    </div>
                                                                )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Current Fingering Display */}
                    <Card className="p-3">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                                Current Fingering
                            </h4>
                            <code className="bg-muted px-2 py-1 rounded text-xs block">
                                [
                                {chordData.guitar_fingering
                                    .map((f) => (f === "x" ? "X" : f))
                                    .join(",")}
                                ]
                            </code>
                        </div>
                    </Card>
                </div>
            )}

            {/* Piano Keyboard Section */}
            {(chordData.instrument === "piano" ||
                chordData.instrument === "both") && (
                <div className="space-y-4">
                    <Label className="text-lg font-medium">
                        🎹 Piano Keyboard
                    </Label>

                    {/* Piano Settings */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <Label className="text-sm">Hand</Label>
                            <Select
                                value={chordData.piano_hand}
                                onValueChange={(value) =>
                                    handleFieldChange(
                                        "piano_hand",
                                        value as any
                                    )
                                }
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">LH</SelectItem>
                                    <SelectItem value="right">RH</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm">Start Octave</Label>
                            <Select
                                value={startOctave.toString()}
                                onValueChange={(v) =>
                                    setStartOctave(parseInt(v))
                                }
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {OCTAVES.map((octave) => (
                                        <SelectItem
                                            key={octave}
                                            value={octave.toString()}
                                        >
                                            {octave}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm">Octaves</Label>
                            <Select
                                value={numOctaves.toString()}
                                onValueChange={(v) =>
                                    setNumOctaves(parseInt(v))
                                }
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Octave</SelectItem>
                                    <SelectItem value="2">2 Octaves</SelectItem>
                                    <SelectItem value="3">3 Octaves</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearKeyboard}
                            >
                                Clear
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={playPreview}
                            >
                                <Play className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Piano Keyboard */}
                    <Card className="p-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <h4 className="font-medium text-sm">
                                    Piano Keyboard
                                </h4>
                                <div className="text-xs text-muted-foreground">
                                    {numOctaves > 1
                                        ? `${numOctaves} octaves`
                                        : "1 octave"}{" "}
                                    • Click keys to build voicing
                                </div>
                            </div>

                            <div className="relative overflow-x-auto">
                                <div
                                    className="relative flex"
                                    style={{
                                        width: `${168 * numOctaves}px`,
                                        height: "60px",
                                    }}
                                >
                                    {/* White keys */}
                                    <div className="flex">
                                        {Array.from(
                                            { length: numOctaves },
                                            (_, octaveIndex) => {
                                                const currentOctave =
                                                    startOctave + octaveIndex;
                                                return PIANO_NOTES.filter(
                                                    (note) =>
                                                        !note.includes("#")
                                                ).map((note, noteIndex) => {
                                                    const fullNote = `${note}${currentOctave}`;
                                                    const isSelected =
                                                        chordData.piano_notes.includes(
                                                            fullNote
                                                        );

                                                    return (
                                                        <button
                                                            key={fullNote}
                                                            className={`
                              w-6 h-12 bg-background text-foreground border border-border
                              ${
                                  isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : ""
                              }
                              hover:opacity-80 transition-all rounded-b-sm flex items-end justify-center pb-1 text-xs font-mono
                            `}
                                                            onClick={() =>
                                                                handleKeyClick(
                                                                    note,
                                                                    currentOctave
                                                                )
                                                            }
                                                        >
                                                            <span className="truncate">
                                                                {note}
                                                                {currentOctave}
                                                            </span>
                                                        </button>
                                                    );
                                                });
                                            }
                                        ).flat()}
                                    </div>

                                    {/* Black keys */}
                                    <div className="absolute top-0 left-0">
                                        {Array.from(
                                            { length: numOctaves },
                                            (_, octaveIndex) => {
                                                const currentOctave =
                                                    startOctave + octaveIndex;
                                                const octaveOffset =
                                                    octaveIndex * 168;

                                                return PIANO_NOTES.filter(
                                                    (note) => note.includes("#")
                                                ).map((note, index) => {
                                                    const fullNote = `${note}${currentOctave}`;
                                                    const isSelected =
                                                        chordData.piano_notes.includes(
                                                            fullNote
                                                        );
                                                    const leftPos = [
                                                        15, 39, 87, 111, 135,
                                                    ];

                                                    return (
                                                        <button
                                                            key={fullNote}
                                                            className={`
                              w-4 h-8 bg-foreground text-background absolute transform -translate-x-1/2 z-10
                              ${
                                  isSelected
                                      ? "bg-primary text-primary-foreground"
                                      : ""
                              }
                              hover:opacity-80 transition-all rounded-b-sm text-xs
                            `}
                                                            onClick={() =>
                                                                handleKeyClick(
                                                                    note,
                                                                    currentOctave
                                                                )
                                                            }
                                                            style={{
                                                                left: `${
                                                                    octaveOffset +
                                                                    leftPos[
                                                                        index
                                                                    ]
                                                                }px`,
                                                            }}
                                                        ></button>
                                                    );
                                                });
                                            }
                                        ).flat()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Selected Notes & Fingering */}
                    <Card className="p-3">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                                Selected Notes & Fingering
                            </h4>
                            {chordData.piano_notes.length > 0 ? (
                                <div className="space-y-1">
                                    <code className="bg-muted px-2 py-1 rounded text-xs block">
                                        [{chordData.piano_notes.join(", ")}]
                                    </code>
                                    <Input
                                        className="h-7 text-xs"
                                        placeholder="Fingering (e.g., 1-3-5)"
                                        value={chordData.piano_fingering}
                                        onChange={(e) =>
                                            handleFieldChange(
                                                "piano_fingering",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-xs">
                                    No notes selected
                                </span>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
};

export default ChordMetadataForm;
