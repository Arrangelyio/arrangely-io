import { supabase } from "@/integrations/supabase/client";
// Pastikan path ini benar sesuai struktur proyek Anda
import { setChordData } from "@/lib/chordDatabase"; 

/**
 * Mengambil data semua chord yang dibutuhkan dari Supabase secara efisien,
 * lalu menyimpannya ke cache lokal yang akan digunakan oleh komponen diagram.
 * @param chordNames Array berisi nama-nama chord yang akan dicari.
 */
export async function fetchAndCacheChords(chordNames: string[]): Promise<void> {
  if (!chordNames || chordNames.length === 0) {
    return;
  }

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
    // Langsung gunakan data array, tanpa parsing
    const formattedData = {
        ...master,
        guitar: {
            frets: master.guitar_fingering, // SUDAH ARRAY
            difficulty: master.guitar_difficulty,
        },
        piano: {
            notes: master.piano_notes, // SUDAH ARRAY
        }
    };
    setChordData(master.chord_name, formattedData);
  });

  // --- Langkah 2: Identifikasi chord yang tidak ditemukan di master_chords ---
  const unfoundChordNames = chordNames.filter(name => !foundMasterNames.has(name));
  if (unfoundChordNames.length === 0) {
    return;
  }

  // --- Langkah 3: Ambil review yang 'approved' untuk chord yang tidak ditemukan ---
  const { data: reviews, error: reviewErr } = await supabase
    .from("chord_review_queue")
    .select("id, chord_name, mapped_to_master_id, suggested_guitar_voicing, suggested_piano_voicing")
    .in("chord_name", unfoundChordNames)
    .eq("status", "approved");

  if (reviewErr) throw reviewErr;

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

  // --- Langkah 5: Proses sisa chord (unfound) dan simpan ke cache ---
  unfoundChordNames.forEach(chordName => {
    const review = reviewsMap.get(chordName);
    let finalData = null;

    // Kasus A: Review ter-mapping ke master chord
    if (review && typeof review === 'object' && 'mapped_to_master_id' in review && review.mapped_to_master_id && mappedMastersMap.has(review.mapped_to_master_id as string)) {
      const master = mappedMastersMap.get(review.mapped_to_master_id as string);
      finalData = {
          ...master,
          chord_name: chordName,
          guitar: { frets: master.guitar_fingering, difficulty: master.guitar_difficulty },
          piano: { notes: master.piano_notes }
      };
    
    // Kasus B: Review tidak ter-mapping (chord baru dari user/AI)
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
          const notes = typeof parsed.notes === 'string' ? JSON.parse(parsed.notes) : parsed.notes;
          pianoData = { notes };
        }
      } catch (e) { console.error(`Gagal parse voicing untuk ${chordName}`, e); }

      finalData = { chord_name: chordName, guitar: guitarData, piano: pianoData };
    }

    if (finalData) {
        setChordData(chordName, finalData);
    }
  });
}