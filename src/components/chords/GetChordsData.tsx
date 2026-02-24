// File: app/actions/getChordsData.ts

import { supabase } from "@/integrations/supabase/client";

// Helper untuk mem-parsing string array dari PostgreSQL (contoh: "{a,b,c}")
const parsePostgresArray = (arrayString: string | null): string[] => {
  if (!arrayString || arrayString.length <= 2) return [];
  return arrayString.substring(1, arrayString.length - 1).split(',');
};

// Mendefinisikan struktur data yang konsisten untuk komponen UI
export interface ChordDisplayData {
  chord_name: string;
  guitar: {
    frets: (number | string)[]; // contoh: ['x', 0, 2, 2, 1, 0]
    difficulty: number;
  } | null;
  piano: {
    notes: string[]; // contoh: ['D', 'F#', 'A']
  } | null;
  is_fallback: boolean;
}

/**
 * Mengambil data chord dari master_chords dan chord_review_queue secara efisien.
 * @param chordNames Array berisi nama-nama chord yang akan dicari.
 * @returns Object map dimana key adalah nama chord dan value adalah data chord yang sudah diproses.
 */
export async function getChordsData(chordNames: string[]): Promise<Record<string, ChordDisplayData>> {
  if (!chordNames || chordNames.length === 0) {
    return {};
  }

  const results: Record<string, ChordDisplayData> = {};

  // --- Langkah 1: Ambil semua chord yang cocok langsung dari master_chords ---
  const { data: masterChords, error: masterErr } = await supabase
    .from("master_chords")
    .select("*")
    .in("chord_name", chordNames);

  if (masterErr) {
    console.error("Error fetching master chords:", masterErr);
    throw masterErr;
  }
  
  const foundMasterNames = new Set<string>();
  (masterChords || []).forEach(master => {
    foundMasterNames.add(master.chord_name);
    results[master.chord_name] = {
      chord_name: master.chord_name,
      guitar: master.guitar_fingering ? {
        frets: parsePostgresArray(master.guitar_fingering).map(f => (f.toLowerCase() === 'x' ? 'x' : parseInt(f, 10))),
        difficulty: master.guitar_difficulty || 1,
      } : null,
      piano: master.piano_notes ? {
        notes: parsePostgresArray(master.piano_notes).map(n => n.replace(/\d/g, '')),
      } : null,
      is_fallback: false,
    };
  });

  // --- Langkah 2: Identifikasi chord yang tidak ditemukan di master_chords ---
  const unfoundChordNames = chordNames.filter(name => !foundMasterNames.has(name));
  if (unfoundChordNames.length === 0) {
    return results; // Semua chord sudah ditemukan, selesai.
  }

  // --- Langkah 3: Ambil review yang 'approved' untuk chord yang tidak ditemukan ---
  const { data: reviews, error: reviewErr } = await supabase
    .from("chord_review_queue")
    .select("id, chord_name, mapped_to_master_id, suggested_guitar_voicing, suggested_piano_voicing")
    .in("chord_name", unfoundChordNames)
    .eq("status", "approved");

  if (reviewErr) {
    console.error("Error fetching review queue:", reviewErr);
    throw reviewErr;
  }

  const reviewsMap = new Map((reviews || []).map(r => [r.chord_name, r]));
  const mappedMasterIds = new Set<string>();
  (reviews || []).forEach(review => {
    if (review.mapped_to_master_id) {
      mappedMasterIds.add(review.mapped_to_master_id);
    }
  });

  // --- Langkah 4: Jika ada review yang ter-mapping, ambil master chord-nya ---
  let mappedMastersMap = new Map();
  if (mappedMasterIds.size > 0) {
    const { data: mappedMasters, error: mappedMasterErr } = await supabase
      .from("master_chords")
      .select("*")
      .in("id", Array.from(mappedMasterIds));
    
    if (mappedMasterErr) throw mappedMasterErr;
    mappedMastersMap = new Map((mappedMasters || []).map(m => [m.id, m]));
  }

  // --- Langkah 5: Proses sisa chord (unfound) berdasarkan hasil review ---
  unfoundChordNames.forEach(chordName => {
    const review = reviewsMap.get(chordName);
    
    // Kasus A: Review ter-mapping ke master chord
    if (review && typeof review === 'object' && 'mapped_to_master_id' in review && review.mapped_to_master_id && mappedMastersMap.has(review.mapped_to_master_id as string)) {
      const master = mappedMastersMap.get(review.mapped_to_master_id as string);
      results[chordName] = {
        chord_name: chordName, // Tampilkan nama asli dari lagu
        guitar: master.guitar_fingering ? {
          frets: parsePostgresArray(master.guitar_fingering).map(f => (f.toLowerCase() === 'x' ? 'x' : parseInt(f, 10))),
          difficulty: master.guitar_difficulty || 1,
        } : null,
        piano: master.piano_notes ? {
          notes: parsePostgresArray(master.piano_notes).map(n => n.replace(/\d/g, '')),
        } : null,
        is_fallback: false,
      };
    // Kasus B: Review tidak ter-mapping (chord baru)
    } else if (review && typeof review === 'object' && 'mapped_to_master_id' in review && !review.mapped_to_master_id) {
      let guitarData = null, pianoData = null;
      try {
        if ('suggested_guitar_voicing' in review && review.suggested_guitar_voicing) {
          const parsed = JSON.parse(review.suggested_guitar_voicing as string);
          const frets = typeof parsed.frets === 'string' ? JSON.parse(parsed.frets) : parsed.frets;
          guitarData = { frets, difficulty: parsed.difficulty || 1 };
        }
        if ('suggested_piano_voicing' in review && review.suggested_piano_voicing) {
          const parsed = JSON.parse(review.suggested_piano_voicing as string);
          const notes = (typeof parsed.notes === 'string' ? JSON.parse(parsed.notes) : parsed.notes).map((n: string) => n.replace(/\d/g, ''));
          pianoData = { notes };
        }
      } catch (e) { console.error(`Gagal parse voicing untuk ${chordName}`, e); }

      results[chordName] = { chord_name: chordName, guitar: guitarData, piano: pianoData, is_fallback: false };
    // Kasus C: Tidak ada di mana-mana, buat fallback
    } else {
      results[chordName] = { chord_name: chordName, guitar: null, piano: null, is_fallback: true };
    }
  });

  return results;
}