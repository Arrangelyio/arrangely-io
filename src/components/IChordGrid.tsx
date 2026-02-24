import { useEffect, useState } from "react";
import { formatChordName } from "@/utils/chordFormatter";

interface AIChordData {
  chord: string;
  start: number;
  end: number;
}

interface AIChordGridProps {
  chords: AIChordData[];
  beats?: number[]; // Array timestamp ketukan (detik) dari AI
  bpm?: number; // BPM rata-rata dari AI
  duration: number;
  onSeek?: (time: number) => void;
  currentTime?: number;
}

export default function AIChordGrid({
  chords,
  beats,
  bpm,
  duration,
  onSeek,
  currentTime,
}: AIChordGridProps) {
  const DEFAULT_BPM = 120;
  const TIME_SIGNATURE = 4; // Asumsi 4/4

  const [measures, setMeasures] = useState<string[][]>([]);
  const [barTimings, setBarTimings] = useState<
    { start: number; end: number }[]
  >([]);

  useEffect(() => {
    if (!chords || chords.length === 0) return;

    const newMeasures: string[][] = [];

    // --- 1. GENERATE STRUKTUR BAR ---
    let barBoundaries: {
      start: number;
      end: number;
      beats: { start: number; end: number }[];
    }[] = [];

    if (beats && beats.length > 0) {
      for (let i = 0; i < beats.length; i += TIME_SIGNATURE) {
        const barStart = beats[i];
        let barEnd = beats[i + TIME_SIGNATURE];

        const currentBarBeats: { start: number; end: number }[] = [];

        for (let j = 0; j < TIME_SIGNATURE; j++) {
          const bStart = beats[i + j];
          let bEnd = beats[i + j + 1];

          if (!bStart && j > 0) {
            const prev = currentBarBeats[j - 1];
            const duration = prev.end - prev.start;
            currentBarBeats.push({ start: prev.end, end: prev.end + duration });
            continue;
          }

          if (!bEnd) {
            const avg =
              (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
            bEnd = bStart + avg;
          }

          if (bStart !== undefined) {
            currentBarBeats.push({ start: bStart, end: bEnd });
          }
        }

        if (!barEnd && currentBarBeats.length > 0) {
          barEnd = currentBarBeats[currentBarBeats.length - 1].end;
        }

        barBoundaries.push({
          start: barStart,
          end: barEnd,
          beats: currentBarBeats,
        });
      }
    } else {
      // Fallback BPM Statis
      const currentBPM = bpm || DEFAULT_BPM;
      const secPerBeat = 60 / currentBPM;
      const secPerBar = secPerBeat * TIME_SIGNATURE;
      const total = Math.ceil(duration / secPerBar);

      for (let i = 0; i < total; i++) {
        const start = i * secPerBar;
        const end = (i + 1) * secPerBar;
        const barBeats = [];
        for (let j = 0; j < TIME_SIGNATURE; j++) {
          barBeats.push({
            start: start + j * secPerBeat,
            end: start + (j + 1) * secPerBeat,
          });
        }
        barBoundaries.push({ start, end, beats: barBeats });
      }
    }

    setBarTimings(barBoundaries.map((b) => ({ start: b.start, end: b.end })));

    // --- 2. DETEKSI & FILTER CHORD ---
    let lastMusicalChord = ""; // Melacak chord terakhir dari bar sebelumnya

    barBoundaries.forEach((bar, index) => {
      const rawChordsInBar: string[] = [];

      bar.beats.forEach((beat) => {
        const chord = findDominantChord(beat.start, beat.end, chords);
        rawChordsInBar.push(chord);
      });

      // KOMPRESI INTRA-BAR (Dalam 1 Bar)
      // Menggabungkan chord berurutan yang "Mirip" (Abm & Abm7 -> dianggap satu)
      const compressedChords: string[] = [];
      rawChordsInBar.forEach((chord, idx) => {
        if (idx === 0) {
          compressedChords.push(chord);
        } else {
          const prev = compressedChords[compressedChords.length - 1];

          // Cek kemiripan chord (Same Root & Family)
          const isSimilar = areChordsSimilar(prev, chord);

          if (!isSimilar) {
            // Jika beda jauh (misal Bsus4 ke B9), masukkan
            if (prev === "%") {
              compressedChords[compressedChords.length - 1] = chord;
            } else if (chord !== "%") {
              compressedChords.push(chord);
            }
          }
          // Jika similar (Abm ke Abm7), kita abaikan yang baru agar bar tetap bersih 1 chord
        }
      });

      if (compressedChords.length === 0) compressedChords.push("%");

      const actualLastChord = compressedChords[compressedChords.length - 1];

      // FILTER INTER-BAR (Antar Bar)
      // Cek kemiripan dengan chord terakhir bar sebelumnya
      if (
        index > 0 &&
        areChordsSimilar(lastMusicalChord, compressedChords[0]) &&
        compressedChords[0] !== "%"
      ) {
        if (compressedChords.length > 1) {
          // Jika bar ini punya 2 chord (misal: [F#m7, Bsus4]), hapus yang depan karena sustain
          compressedChords.shift();
        } else {
          // Jika bar ini cuma 1 chord (misal: [F#m7]), ganti jadi tanda Repeat (%)
          compressedChords[0] = "%";
        }
      }

      lastMusicalChord = actualLastChord;
      newMeasures.push(compressedChords);
    });

    setMeasures(newMeasures);
  }, [chords, beats, bpm, duration]);

  // --- HELPER: DETEKSI KEMIRIPAN CHORD ---
  // Menganggap chord "sama" jika Root sama dan Family Quality sama (Minor dgn Minor, dll)
  const areChordsSimilar = (c1: string, c2: string) => {
    if (c1 === c2) return true;
    if (c1 === "%" || c2 === "%") return false;
    if (!c1 || !c2) return false;

    // Regex parser sederhana
    const parse = (c: string) => {
      const match = c.match(/^([A-G][#b]?)(.*)$/);
      if (!match) return { root: c, quality: "" };
      return { root: match[1], quality: match[2] };
    };

    const chord1 = parse(c1);
    const chord2 = parse(c2);

    // Beda Root = Beda Chord
    if (chord1.root !== chord2.root) return false;

    // Helper cek Family
    const getFamily = (q: string) => {
      if (
        q === "" ||
        q === "7" ||
        q === "9" ||
        q === "maj7" ||
        q.startsWith("maj")
      )
        return "major";
      if (q.startsWith("m") || q.startsWith("min")) return "minor"; // Covers m, m7, min, min7
      if (q.includes("sus")) return "sus";
      if (q.includes("dim") || q.includes("o")) return "dim";
      if (q.includes("aug") || q.includes("+")) return "aug";
      return "major"; // Default
    };

    return getFamily(chord1.quality) === getFamily(chord2.quality);
  };

  const findDominantChord = (
    start: number,
    end: number,
    allChords: AIChordData[]
  ) => {
    const candidates = allChords.filter(
      (c) => c.end > start && c.start < end && c.chord !== "N"
    );

    if (candidates.length === 0) return "%";

    candidates.sort((a, b) => a.start - b.start);
    const beatDuration = end - start;
    const lastCandidate = candidates[candidates.length - 1];
    const lastOverlap =
      Math.min(lastCandidate.end, end) - Math.max(lastCandidate.start, start);

    if (lastOverlap / beatDuration > 0.4) {
      return formatChordName(lastCandidate.chord);
    }

    const winner = candidates.reduce((prev, curr) => {
      const prevOverlap = Math.min(prev.end, end) - Math.max(prev.start, start);
      const currOverlap = Math.min(curr.end, end) - Math.max(curr.start, start);
      return currOverlap > prevOverlap ? curr : prev;
    });

    return formatChordName(winner.chord);
  };

  const isBarActive = (index: number) => {
    if (currentTime === undefined || !barTimings[index]) return false;
    return (
      currentTime >= barTimings[index].start &&
      currentTime < barTimings[index].end
    );
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px] p-6 bg-white rounded-xl border shadow-sm">
        <div className="grid grid-cols-4 gap-y-10 gap-x-0">
          {measures.map((barChords, index) => (
            <div
              key={index}
              onClick={() => onSeek?.(barTimings[index]?.start || 0)}
              className={`
                relative h-28 border-r-2 border-slate-800 flex flex-col justify-center cursor-pointer transition-all px-1
                ${index % 4 === 0 ? "border-l-2 pl-2" : ""} 
                ${
                  isBarActive(index)
                    ? "bg-blue-50 shadow-inner ring-2 ring-inset ring-blue-200"
                    : "hover:bg-slate-50"
                }
              `}
            >
              <span className="absolute top-1 left-2 text-[10px] text-slate-400 font-mono">
                {index + 1}
              </span>
              <div className="flex w-full h-full items-center justify-around">
                {barChords.map((chord, cIdx) => (
                  <span
                    key={cIdx}
                    className={`
                      font-medium truncate text-center
                      ${barChords.length > 2 ? "text-2xl" : "text-3xl"} 
                      ${isBarActive(index) ? "text-blue-600" : "text-slate-900"}
                    `}
                    style={{
                      fontFamily: "MuseJazzText, sans-serif",
                      minWidth: "20%",
                    }}
                  >
                    {chord === "%" ? (
                      <span className="text-slate-300 font-thin text-4xl select-none">
                        /
                      </span>
                    ) : (
                      renderChordPretty(chord)
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const renderChordPretty = (chordStr: string) => {
  const match = chordStr.match(/^([A-G])([#b]?)(.*)$/);
  if (!match) return chordStr;
  const [, root, accidental, quality] = match;
  return (
    <span className="inline-flex items-baseline">
      {root}
      {accidental && <sup className="text-[0.6em] -top-2">{accidental}</sup>}
      <span className="text-[0.7em] ml-0.5">{quality}</span>
    </span>
  );
};
