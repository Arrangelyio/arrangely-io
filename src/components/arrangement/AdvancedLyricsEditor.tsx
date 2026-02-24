import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Music, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChordPosition {
    id: string;
    chord: string;
    lineIndex: number;
    charIndex: number;
    pixelLeft: number; // exact pixel position for precise alignment
}

interface AdvancedLyricsEditorProps {
    value: string;
    onChange: (value: string) => void;
    currentKey: string;
    sectionType: string;
    recentChords: string[];
    onRecentChordsChange: (chords: string[]) => void;
}

const AdvancedLyricsEditor = ({
    value,
    onChange,
    currentKey,
    sectionType,
    recentChords,
    onRecentChordsChange,
}: AdvancedLyricsEditorProps) => {
    const { t } = useLanguage();
    const [lyrics, setLyrics] = useState("");
    const [chords, setChords] = useState<ChordPosition[]>([]);
    // const [recentChords, setRecentChords] = useState<string[]>([]); // Track recently used chords
    const [selectedChar, setSelectedChar] = useState<{
        char: string;
        lineIndex: number;
        charIndex: number;
        pixelLeft: number;
    } | null>(null);
    const [showChordPicker, setShowChordPicker] = useState(false);
    const [customChord, setCustomChord] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Parse existing value to extract lyrics and chords
    useEffect(() => {
        if (value) {
            const lines = value.split("\n");
            const lyricsLines: string[] = [];
            const parsedChords: ChordPosition[] = [];

            for (let i = 0; i < lines.length; i += 2) {
                const chordLine = lines[i] || "";
                const lyricsLine = lines[i + 1] || "";
                lyricsLines.push(lyricsLine);

                if (chordLine.trim()) {
                    const chordMatches = chordLine.matchAll(/\S+/g);
                    for (const match of chordMatches) {
                        if (match.index !== undefined) {
                            const lineIndex = Math.floor(i / 2);
                            const charIndex = match.index;
                            const chord = match[0];

                            const existing = chords.find(
                                (c) =>
                                    c.lineIndex === lineIndex &&
                                    c.charIndex === charIndex &&
                                    c.chord === chord
                            );

                            parsedChords.push({
                                id: `chord-${i}-${match.index}`,
                                chord,
                                lineIndex,
                                charIndex,
                                pixelLeft: existing
                                    ? existing.pixelLeft
                                    : match.index * 9.7,
                            });
                        }
                    }
                }
            }

            setLyrics(lyricsLines.join("\n"));
            setChords(parsedChords);
        }
    }, [value]);

    // Auto-format pasted content
    // Auto-format and append pasted content

    const getChordSuggestions = (key: string) => {
        const sharpNotes = [
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
        const flatNotes = [
            "C",
            "Db",
            "D",
            "Eb",
            "E",
            "F",
            "Gb",
            "G",
            "Ab",
            "A",
            "Bb",
            "B",
        ];

        const isFlatKey = key.includes("b") || key === "F";

        const chromaticNotes = isFlatKey ? flatNotes : sharpNotes;

        const keyIndex = chromaticNotes.indexOf(key);

        if (keyIndex === -1)
            return { major: [], minor: [], seventh: [], extended: [] };

        const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
        const scaleNotes = majorScaleIntervals.map(
            (interval) => chromaticNotes[(keyIndex + interval) % 12]
        );

        const majorChords = [scaleNotes[0], scaleNotes[3], scaleNotes[4]]; // I, IV, V
        const minorChords = [
            scaleNotes[1] + "m",
            scaleNotes[2] + "m",
            scaleNotes[5] + "m",
        ];

        const seventhChords = [
            scaleNotes[0] + "maj7",
            scaleNotes[1] + "m7",
            scaleNotes[3] + "maj7",
            scaleNotes[4] + "7",
            scaleNotes[5] + "m7",
        ];

        const extendedChords = [
            scaleNotes[0] + "add9",
            scaleNotes[0] + "sus4",
            scaleNotes[4] + "sus4",
            scaleNotes[1] + "m7",
            scaleNotes[3] + "add9",
            scaleNotes[4] + "7sus4",
        ];

        return {
            major: majorChords,
            minor: minorChords,
            seventh: seventhChords,
            extended: extendedChords,
        };
    };

    const chordSuggestions = getChordSuggestions(currentKey);

    // Handle character click for precise positioning tesss
    const handleCharacterClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("lyric-char")) {
            const char = target.textContent || "";
            const lineIndex = parseInt(target.dataset.lineIndex || "0");
            const charIndex = parseInt(target.dataset.charIndex || "0");

            // Get the exact position using DOM measurements
            const rect = target.getBoundingClientRect();
            const parentRect = target
                .closest(".lyrics-line")
                ?.getBoundingClientRect();
            const relativeLeft = parentRect ? rect.left - parentRect.left : 0;

            setSelectedChar({
                char,
                lineIndex,
                charIndex,
                pixelLeft: relativeLeft + rect.width / 2, // Center of the character
            });
            setShowChordPicker(true);
            setCustomChord("");
        }
    }, []);

    // Add chord
    const addChord = useCallback(
        (chord: string, isManualInput: boolean = false) => {
            if (!selectedChar) return;

            const newChord: ChordPosition = {
                id: `chord-${Date.now()}`,
                chord,
                lineIndex: selectedChar.lineIndex,
                charIndex: selectedChar.charIndex,
                pixelLeft: selectedChar.pixelLeft,
            };

            // Track recent chords when manually entered
            if (isManualInput && chord.trim()) {
                const newRecentChords = [
                    chord.trim(),
                    ...recentChords.filter((c) => c !== chord.trim()),
                ]; // Tetap batasi 8 akor
                onRecentChordsChange(newRecentChords);
            }

            // Don't remove existing chords, allow multiple chords at the same position
            const newChords = [...chords, newChord];
            setChords(newChords);
            updateOutput(lyrics, newChords);
            setShowChordPicker(false);
            setSelectedChar(null);
        },
        [selectedChar, chords, lyrics]
    );

    // Remove chord
    const removeChord = useCallback(
        (chordId: string) => {
            const newChords = chords.filter((c) => c.id !== chordId);
            setChords(newChords);
            updateOutput(lyrics, newChords);
        },
        [chords, lyrics]
    );

    // Update output format
    const updateOutput = useCallback(
        (lyricsText: string, chordsData: ChordPosition[]) => {
            const lines = lyricsText.split("\n");
            const outputLines: string[] = [];

            lines.forEach((line, lineIndex) => {
                // Get chords for this line, sorted by character index
                const lineChords = chordsData
                    .filter((c) => c.lineIndex === lineIndex)
                    .sort((a, b) => a.charIndex - b.charIndex);

                // Create chord line
                let chordLine = "";
                if (lineChords.length > 0) {
                    let lastPos = 0;
                    lineChords.forEach((chord) => {
                        const spacesNeeded = Math.max(
                            0,
                            chord.charIndex - lastPos
                        );
                        chordLine += " ".repeat(spacesNeeded) + chord.chord;
                        lastPos = chord.charIndex + chord.chord.length;
                    });
                }

                // Add chord line (even if empty) and lyrics line
                outputLines.push(chordLine);
                outputLines.push(line);
            });

            onChange(outputLines.join("\n"));
        },
        [onChange]
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData.getData("text");

            // Clean and format the pasted text
            const formattedPastedText = pastedText
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .join("\n");

            // Combine the current lyrics with the new pasted text
            // Add a newline in between if there are existing lyrics
            const newLyrics = lyrics
                ? `${lyrics}${formattedPastedText}`
                : formattedPastedText;

            // Update the state with the combined lyrics
            setLyrics(newLyrics);
            updateOutput(newLyrics, chords);
        },
        [lyrics, chords, updateOutput] // <-- Add `lyrics` and `updateOutput` to the dependency array
    );

    // Handle lyrics change
    const handleLyricsChange = (newLyrics: string) => {
        setLyrics(newLyrics);
        updateOutput(newLyrics, chords);
    };

    // Render lyrics with clickable characters
    const renderLyrics = () => {
        const lines = lyrics.split("\n");

        return lines.map((line, lineIndex) => {
            return (
                <div key={lineIndex} className="relative mb-4">
                    {/* Chord display line */}
                    <div className="h-6 relative text-sm font-mono text-primary font-semibold">
                        {chords
                            .filter((c) => c.lineIndex === lineIndex)
                            .map((chord) => (
                                <span
                                    key={chord.id}
                                    className="absolute cursor-pointer hover:text-destructive transition-colors"
                                    style={{
                                        left: `${chord.pixelLeft}px`,
                                        transform: "translateX(-50%)",
                                    }}
                                    onClick={() => removeChord(chord.id)}
                                    title="Click to remove chord"
                                >
                                    {chord.chord}
                                </span>
                            ))}
                    </div>

                    {/* Lyrics line with clickable characters */}
                    <div className="font-mono text-base leading-relaxed lyrics-line">
                        {Array.from(line).map((char, charIndex) => (
                            <span
                                key={charIndex}
                                className="lyric-char cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors inline-block"
                                data-line-index={lineIndex}
                                data-char-index={charIndex}
                                onClick={handleCharacterClick}
                                style={{
                                    minWidth: char === " " ? "0.5em" : "auto",
                                }}
                            >
                                {char === " " ? "\u00A0" : char}
                            </span>
                        ))}
                    </div>

                    {/* Chord picker appears below this line when selected */}
                    {selectedChar &&
                        selectedChar.lineIndex === lineIndex &&
                        showChordPicker && (
                            <div className="mt-3 p-4 border border-primary/20 rounded-md bg-muted/50">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-sm">
                                        {/* Add chord above:  */}
                                        {t("arrEditor.above")}"
                                        {selectedChar.char}"
                                    </h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setShowChordPicker(false)
                                        }
                                        className="h-6 w-6 p-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>

                                {/* Custom chord input */}
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        placeholder="Type chord (e.g., Cadd9, G/B)"
                                        value={customChord}
                                        onChange={(e) =>
                                            setCustomChord(e.target.value)
                                        }
                                        onKeyPress={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                customChord.trim()
                                            ) {
                                                addChord(
                                                    customChord.trim(),
                                                    true
                                                );
                                            }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        onClick={() =>
                                            customChord.trim() &&
                                            addChord(customChord.trim(), true)
                                        }
                                        disabled={!customChord.trim()}
                                        size="sm"
                                    >
                                        Add
                                    </Button>
                                </div>

                                <Separator className="mb-3" />

                                {/* Chord suggestions */}
                                <div className="space-y-3">
                                    {/* Recent Chords */}
                                    {recentChords.length > 0 && (
                                        <>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Recent
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {recentChords.map(
                                                        (chord, index) => (
                                                            <Button
                                                                key={`recent-${chord}-${index}`}
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    addChord(
                                                                        chord
                                                                    )
                                                                }
                                                                className="h-7 px-2 text-xs font-mono bg-primary/10 hover:bg-primary/20 border-primary/20"
                                                            >
                                                                {chord}
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                            <Separator />
                                        </>
                                    )}

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Major
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {chordSuggestions.major.map(
                                                (chord) => (
                                                    <Button
                                                        key={chord}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            addChord(chord)
                                                        }
                                                        className="h-7 px-2 text-xs font-mono"
                                                    >
                                                        {chord}
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Minor
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {chordSuggestions.minor.map(
                                                (chord) => (
                                                    <Button
                                                        key={chord}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            addChord(chord)
                                                        }
                                                        className="h-7 px-2 text-xs font-mono"
                                                    >
                                                        {chord}
                                                    </Button>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            7th & Extended
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {[
                                                ...chordSuggestions.seventh,
                                                ...chordSuggestions.extended,
                                            ].map((chord, index) => (
                                                <Button
                                                    key={`seventh-extended-${chord}-${index}`}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        addChord(chord)
                                                    }
                                                    className="h-7 px-2 text-xs font-mono"
                                                >
                                                    {chord}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            );
        });
    };
    // Letakkan fungsi ini di dalam komponen AdvancedLyricsEditor
    const handleBlur = () => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        // Mengambil lirik terbaru langsung dari elemen textarea
        const currentLyrics = textarea.value;

        // Menghitung lebar maksimal yang tersedia di dalam textarea
        const style = window.getComputedStyle(textarea);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        const maxWidth = textarea.clientWidth - paddingLeft - paddingRight;

        const lines = currentLyrics.split("\n");
        const formattedLines: string[] = [];

        // Membuat elemen sementara untuk mengukur lebar teks
        const measurer = document.createElement("span");
        measurer.style.font = style.font;
        measurer.style.position = "absolute";
        measurer.style.visibility = "hidden";
        measurer.style.whiteSpace = "nowrap";
        document.body.appendChild(measurer);

        lines.forEach((line) => {
            if (line.trim() === "") {
                formattedLines.push(line);
                return;
            }

            const words = line.split(" ");
            let currentLine = "";

            for (const word of words) {
                // Menangani kata pertama di baris baru
                if (currentLine === "") {
                    currentLine = word;
                    continue;
                }

                // Mencoba menambahkan kata berikutnya untuk diukur
                const testLine = `${currentLine} ${word}`;
                measurer.textContent = testLine;

                // Memeriksa apakah baris menjadi terlalu panjang
                if (measurer.scrollWidth > maxWidth) {
                    // Jika ya, simpan baris sebelumnya
                    formattedLines.push(currentLine);
                    // Memulai baris baru dengan kata yang tidak muat
                    currentLine = word;
                } else {
                    // Jika masih muat, lanjutkan baris saat ini
                    currentLine = testLine;
                }
            }

            // Menyimpan sisa baris terakhir
            formattedLines.push(currentLine);
        });

        // Menghapus elemen pengukur dari DOM
        document.body.removeChild(measurer);

        // Memperbarui state dengan lirik yang sudah diformat
        handleLyricsChange(formattedLines.join("\n"));
    };
    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music className="h-4 w-4" />
                <span>
                    {/* Paste lyrics below, then click on any letter/character to
                    add chords above it */}
                    {t("arrEditor.lyrics")}
                </span>
            </div>

            {/* Raw lyrics input */}
            <div>
                <textarea
                    ref={textareaRef} // <-- PASANG REF DI SINI
                    placeholder={t("arrEditor.lyricsPlaceholder").replace(
                        "{{sectionType}}",
                        sectionType
                    )}
                    value={lyrics}
                    onChange={(e) => handleLyricsChange(e.target.value)}
                    onPaste={handlePaste}
                    onBlur={handleBlur} // <-- TAMBAHKAN INI
                    className="w-full min-h-[120px] p-3 border rounded-md font-mono text-sm resize-y focus:ring-2 focus:ring-primary/20"
                />
            </div>

            {/* Formatted display with clickable words */}
            {lyrics && (
                <div
                    className="border rounded-md p-4 bg-muted/30 min-h-[200px]"
                    ref={editorRef}
                >
                    <div className="text-xs font-medium mb-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                        <span
                            className={`text-center sm:text-left transition-colors text-foreground ${
                                /* <-- Diberi warna default 'text-foreground' */
                                lyrics && chords.length === 0
                                    ? "animate-pulse text-primary font-semibold" // Warna saat animasi
                                    : "opacity-70" // Sedikit redup saat tidak animasi
                            }`}
                        >
                            {/* Click any letter/character to add chords • Click
                            chord badges to remove */}
                            {t("arrEditor.chord")}
                        </span>
                        <Badge
                            variant="outline"
                            className="text-xs flex-shrink-0"
                        >
                            {chords.length} {t("arrEditor.addChord")}
                        </Badge>
                    </div>
                    {renderLyrics()}
                </div>
            )}
        </div>
    );
};

export default AdvancedLyricsEditor;
