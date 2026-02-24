// File: lib/transpose.js (Versi Perbaikan)

// Skala nada menggunakan Kres (#)
export const SHARP_SCALE = [
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

// Skala nada menggunakan Mol (b)
export const FLAT_SCALE = [
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

// Peta komprehensif untuk semua kemungkinan nama nada dan nilai numeriknya (0-11)
export const CHORD_MAP = {
  C: 0,
  "B#": 0,
  Dbb: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "C##": 2,
  Ebb: 2,
  "D#": 3,
  Eb: 3,
  Fbb: 3,
  E: 4,
  Fb: 4,
  "D##": 4,
  F: 5,
  "E#": 5,
  Gbb: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "F##": 7,
  Abb: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "G##": 9,
  Bbb: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "A##": 11,
};

/**
 * Mem-parsing sebuah string chord menjadi root note dan modifier-nya.
 * @param {string} chord - String chord, misal "Am7/G".
 * @returns {{root: string, modifier: string} | null} Objek hasil parse atau null jika tidak valid.
 */
function parseChord(chord) {
  if (!chord) return null;
  // Regex ini akan menangkap root note (C, F#, Gb, D##, dll.)
  // dan sisa dari chord (modifier).
  const match = chord.match(/^([A-G](?:##|#|bb|b)?)(.*)/);
  if (!match || !(match[1] in CHORD_MAP)) {
    return null; // Bukan chord yang valid jika root tidak dikenali.
  }
  return {
    root: match[1],
    modifier: match[2],
  };
}

/**
 * 'Otak' dari sistem: mentransposisi satu chord.
 * @param {string} chord - Chord yang akan ditransposisi.
 * @param {number} semitones - Jumlah semitone untuk digeser (bisa positif atau negatif).
 * @param {boolean} preferSharps - Jika true, akan memilih notasi kres (C#), jika false, mol (Db).
 * @returns {string} Chord yang sudah ditransposisi.
 */
export function transposeChord(chord, semitones, preferSharps = true) {
  const parsed = parseChord(chord);
  if (!parsed) return chord; // Jika bukan chord, kembalikan string aslinya.

  const { root, modifier } = parsed;
  const currentIndex = CHORD_MAP[root];
  const newIndex = (currentIndex + semitones + 12) % 12;

  // INI BAGIAN KUNCI: Pilih skala (kres atau mol) untuk mendapatkan nama root note yang baru.
  // Ini mencegah munculnya notasi aneh seperti D##.
  const scale = preferSharps ? SHARP_SCALE : FLAT_SCALE;
  const newRoot = scale[newIndex];

  // Logika cerdas untuk menangani slash chords.
  // Modifier dipisahkan menjadi bagian sebelum slash dan bass note setelah slash.
  const slashParts = modifier.match(/^(.*?)\/([A-G].*)$/);
  if (slashParts) {
    const quality = slashParts[1]; // misal: "m7", "sus4"
    const bassNote = slashParts[2]; // misal: "F#", "G"

    // Transposisi bass note secara rekursif.
    const transposedBass = transposeChord(bassNote, semitones, preferSharps);
    return newRoot + quality + "/" + transposedBass;
  }

  // Jika bukan slash chord, gabungkan root baru dengan modifier aslinya.
  return newRoot + modifier;
}

/**
 * 'Manajer': Menerima seluruh teks (lirik dengan chord) dan mentransposisinya.
 * @param {string} text - Teks input.
 * @param {string} fromKey - Kunci nada awal.
 * @param {string} toKey - Kunci nada tujuan.
 * @param {boolean} preferSharps - Preferensi notasi kres/mol.
 * @returns {string} Teks yang sudah ditransposisi.
 */
export function transposeText(content, fromKey, toKey, preferSharps = true) {
  if (!content || fromKey === toKey) return content;

  const semitones = getSemitoneInterval(fromKey, toKey);
  if (semitones === 0) return content;

  const lines = content.split("\n");
  const transposedLines = lines.map((line, i) => {
    // Baris genap = chord line → transpos
    if (i % 2 === 0 && line.trim() !== "") {
      return line.replace(
        /([A-G](?:##|#|bb|b)?(?:maj|min|m|dim|aug|add|sus|M|b|#|\d)*\/?(?:[A-G](?:##|#|bb|b)?)?)/g,
        (match) => transposeChord(match, semitones, preferSharps)
      );
    }

    // Baris ganjil = lirik → biarkan tetap
    return line;
  });

  return transposedLines.join("\n");
}

/**
 * Menghitung interval semitone antara dua kunci nada.
 */
export function getSemitoneInterval(fromKey, toKey) {
  const fromIndex = CHORD_MAP[fromKey];
  const toIndex = CHORD_MAP[toKey];
  if (fromIndex === undefined || toIndex === undefined) return 0;
  return (toIndex - fromIndex + 12) % 12;
}
