// ==========================
// Dynamic Chord Generator (Revised with Cache)
// ==========================

export interface GuitarChordData {
  frets: (number | 'x')[];
  fingers: (number | 'x')[];
  barres?: { fret: number; startString: number; endString: number }[];
}

export interface PianoChordData {
  notes: string[];
}

export interface ChordInfo {
  name: string;
  notes: string[];
  guitar?: GuitarChordData;
  piano: PianoChordData;
}

export interface ParsedChord {
  root: string;
  quality: string;
  bass?: string;
  original: string;
}

// BARU: Cache untuk menyimpan data chord yang sudah di-generate atau diambil dari DB.
// Menggunakan Map untuk performa yang lebih baik.
const chordCache = new Map<string, ChordInfo>();


// --- (Fungsi-fungsi dan konstanta lama tetap sama) ---

const NOTE_INDEX: { [key: string]: number } = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const GUITAR_TUNING = [4, 9, 2, 7, 11, 4];

const CHORD_FORMULAS: { [quality: string]: number[] } = {
  'maj':    [0, 4, 7],
  'm':      [0, 3, 7],
  'dim':    [0, 3, 6],
  'dim7':   [0, 3, 6, 9],
  'aug':    [0, 4, 8],
  '7':      [0, 4, 7, 10],
  'maj7':   [0, 4, 7, 11],
  'm7':     [0, 3, 7, 10],
  'm7b5':   [0, 3, 6, 10],
  'sus2':   [0, 2, 7],
  'sus4':   [0, 5, 7],
  'add9':   [0, 4, 7, 14],
  'madd9':  [0, 3, 7, 14],
};
const QUALITY_KEYS = Object.keys(CHORD_FORMULAS).sort((a, b) => b.length - a.length);

export function parseChord(chordString: string): ParsedChord | null {
  // ... (implementasi fungsi ini tidak berubah)
  const cleanChord = chordString.trim();
  const [mainChord, bass] = cleanChord.split('/');
  const rootMatch = mainChord.match(/^([A-G][#b]?)/);
  if (!rootMatch) return null;
  const root = rootMatch[1];
  const remaining = mainChord.substring(root.length);
  const quality = QUALITY_KEYS.find(q => remaining.startsWith(q)) || (remaining === '' ? 'maj' : 'maj');
  return { root, quality, bass, original: cleanChord };
}

function generateGuitarVoicing(chordNotes: string[]): GuitarChordData | undefined {
  // ... (implementasi fungsi ini tidak berubah)
  const requiredNotes = new Set(chordNotes.map(n => NOTE_INDEX[n]));
  const frets: (number | 'x')[] = Array(6).fill('x');
  let notesFound = 0;
  for (let string = 0; string < 6; string++) {
    const openStringNote = GUITAR_TUNING[string];
    if (requiredNotes.has(openStringNote)) {
      frets[string] = 0;
      notesFound++;
      continue;
    }
    for (let fret = 1; fret <= 4; fret++) {
      const frettedNote = (openStringNote + fret) % 12;
      if (requiredNotes.has(frettedNote)) {
        frets[string] = fret;
        notesFound++;
        break; 
      }
    }
  }
  if (notesFound < 3) return undefined; 
  return { frets, fingers: [] };
}


// ======================================================
// --- FUNGSI BARU DAN FUNGSI YANG DIMODIFIKASI ---
// ======================================================

/**
 * BARU: Fungsi untuk menyimpan data chord secara manual ke dalam cache.
 * Berguna untuk memasukkan data dari database (Supabase) Anda.
 */
export function setChordData(chordName: string, data: ChordInfo): void {
  chordCache.set(chordName, data);
  
}

/**
 * MODIFIKASI: Fungsi getChordData sekarang terintegrasi dengan cache.
 * 1. Cek di cache dulu. Jika ada, langsung kembalikan.
 * 2. Jika tidak ada, generate data chord seperti biasa.
 * 3. Simpan hasil generate ke dalam cache sebelum dikembalikan.
 */
export function getChordData(chordString: string): ChordInfo | null {
  // Langkah 1: Cek di cache dulu
  if (chordCache.has(chordString)) {
    
    return chordCache.get(chordString)!;
  }

  // Langkah 2: Jika tidak ada di cache, generate data baru
  
  const parsed = parseChord(chordString);
  if (!parsed) return null;

  const formula = CHORD_FORMULAS[parsed.quality];
  const rootIndex = NOTE_INDEX[parsed.root];
  if (rootIndex === undefined || !formula) return null;

  const notes = formula.map(i => NOTE_NAMES[(rootIndex + i) % 12]);
  
  if (parsed.bass) {
    const bassNote = parsed.bass;
    if (!notes.includes(bassNote)) {
        notes.unshift(bassNote);
    }
  }

  const generatedChord: ChordInfo = {
    name: parsed.original,
    notes: notes,
    piano: { notes },
    guitar: generateGuitarVoicing(notes)
  };

  // Langkah 3: Simpan hasil ke cache sebelum mengembalikannya
  chordCache.set(chordString, generatedChord);
  

  return generatedChord;
}

// --- Contoh Penggunaan ---

getChordData("Cmaj7");
getChordData("G");


getChordData("Cmaj7");
getChordData("G");


setChordData("F#m", {
    name: "F#m",
    notes: ["F#", "A", "C#"],
    piano: { notes: ["F#", "A", "C#"] },
    guitar: { frets: [2, 4, 4, 2, 2, 2], fingers: [] }
});
getChordData("F#m");