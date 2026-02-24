import { useEffect, useRef, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface ChordResult {
  chord: string;
  start: number;
  end: number;
  confidence: number;
}

interface AIChordLyricViewProps {
  chords: ChordResult[];
  lyrics: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

interface LyricLine {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  chords: ChordResult[];
}

// --- Helper: Parse LRC ---
const parseLRC = (
  lrcString: string
): Omit<LyricLine, "chords" | "endTime">[] => {
  const lines: Omit<LyricLine, "chords" | "endTime">[] = [];
  const lrcRegex = /^\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\](.*)/;

  const rawLines = lrcString.split("\n");

  rawLines.forEach((line, index) => {
    const match = line.match(lrcRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0")) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();

      lines.push({
        id: index,
        startTime: time,
        text: text,
      });
    }
  });

  return lines;
};

export default function AIChordLyricView({
  chords,
  lyrics,
  currentTime,
  onSeek,
}: AIChordLyricViewProps) {
  const activeLineRef = useRef<HTMLDivElement>(null);

  // --- 1. Process Data (Memoized) ---
  const processedLines = useMemo(() => {
    // A. Parse Lyrics
    let parsedLines = parseLRC(lyrics);

    // Fallback jika bukan format LRC
    if (parsedLines.length === 0 && lyrics.length > 0) {
      const rawLines = lyrics.split("\n").filter((l) => l.trim() !== "");
      const durationPerLine = 4;
      parsedLines = rawLines.map((line, idx) => ({
        id: idx,
        startTime: idx * durationPerLine,
        text: line,
      }));
    }

    // B. Calculate End Times & Map Chords
    const linesWithChords: LyricLine[] = parsedLines.map((line, index) => {
      const nextLine = parsedLines[index + 1];

      // Logic Durasi: Batasi gap maksimal agar chord tidak "terbang" ke area kosong
      const gapToNext = nextLine ? nextLine.startTime - line.startTime : 5;

      // Jika gap antar baris > 6 detik, kita anggap baris visualnya selesai di detik ke-6
      // Ini mencegah chord yang sebenarnya ada di jeda instrumental ditaruh terlalu jauh di kanan teks
      const durationCap = 6;
      const effectiveDuration = Math.min(gapToNext, durationCap);

      const lineEndTime = line.startTime + effectiveDuration;

      // Ambil chord yang start-nya ada di rentang baris ini
      const lineChords = chords.filter((chord) => {
        const chordStart = chord.start;
        return chordStart >= line.startTime && chordStart < lineEndTime;
      });

      return {
        ...line,
        endTime: lineEndTime,
        chords: lineChords,
      };
    });

    return linesWithChords;
  }, [lyrics, chords]);

  // --- 2. Auto Scroll Logic ---
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  // --- 3. Render Helper: Calculate Chord Position ---
  const getChordPosition = (
    chordStart: number,
    lineStart: number,
    lineEnd: number
  ) => {
    const duration = lineEnd - lineStart;
    if (duration <= 0) return 0;
    const offset = chordStart - lineStart;
    let percent = (offset / duration) * 100;
    // Batasi 0-100%
    return Math.min(Math.max(percent, 0), 100);
  };

  return (
    // Menggunakan font-mono (monospace) agar spasi lebih konsisten dengan waktu
    <div className="h-[600px] w-full bg-white rounded-xl border border-slate-100 relative shadow-sm font-mono">
      <ScrollArea className="h-full w-full px-4 py-6">
        <div className="flex flex-col gap-10 pb-40">
          {processedLines.map((line) => {
            const isActive =
              currentTime >= line.startTime && currentTime < line.endTime + 0.5;

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : null}
                onClick={() => onSeek(line.startTime)}
                className={cn(
                  "relative px-4 py-3 rounded-lg transition-all duration-300 cursor-pointer w-full text-center sm:text-left hover:bg-slate-50",
                  isActive ? "bg-blue-50/50" : ""
                )}
              >
                {/* Wrapper: inline-block w-fit relative 
                  Agar posisi chord % mengacu pada panjang teks, bukan lebar layar.
                */}
                <div className="relative inline-block w-fit max-w-full min-w-[200px] pr-8">
                  {/* --- CHORD ROW --- */}
                  {/* Posisi absolute di atas teks (-top-6) */}
                  <div className="absolute -top-6 left-0 w-full h-6 pointer-events-none select-none">
                    {line.chords.map((chord, idx) => {
                      if (chord.chord === "N") return null;

                      const leftPos = getChordPosition(
                        chord.start,
                        line.startTime,
                        line.endTime
                      );

                      return (
                        <span
                          key={idx}
                          className={cn(
                            "absolute bottom-0 text-base font-bold transition-colors whitespace-nowrap transform -translate-x-1/2",
                            // Styling mirip referensi: Text Biru Tebal, tanpa background kotak
                            isActive
                              ? "text-blue-600 scale-110"
                              : "text-blue-500/70"
                          )}
                          style={{ left: `${leftPos}%` }}
                        >
                          {chord.chord.replace(":min", "m").replace(":maj", "")}
                        </span>
                      );
                    })}
                  </div>

                  {/* --- LYRIC TEXT --- */}
                  <p
                    className={cn(
                      "text-lg sm:text-xl font-medium leading-relaxed tracking-wider transition-colors", // Tracking wider membantu spacing chord
                      isActive ? "text-slate-900" : "text-slate-400"
                    )}
                  >
                    {line.text === "" ? (
                      // Placeholder untuk baris instrumental agar chord tetap punya tempat berpijak
                      <span className="text-sm text-slate-300 italic font-normal block py-2 opacity-50">
                        • • •
                      </span>
                    ) : (
                      line.text
                    )}
                  </p>
                </div>

                {/* Timestamp Indicator */}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 hidden sm:block font-sans">
                  {Math.floor(line.startTime / 60)}:
                  {Math.floor(line.startTime % 60)
                    .toString()
                    .padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
