// Mapping untuk mencari nada Major 3rd dari sebuah Root Note
// Digunakan untuk mengubah format /3 menjadi slash chord (misal A/3 -> A/C#)
const NOTE_TO_MAJOR_THIRD: Record<string, string> = {
  C: "E",
  "C#": "F",
  Db: "F",
  D: "F#",
  Eb: "G",
  "D#": "G",
  E: "G#",
  F: "A",
  "F#": "A#",
  Gb: "Bb",
  G: "B",
  "G#": "C",
  Ab: "C",
  A: "C#",
  Bb: "D",
  "A#": "D",
  B: "D#",
};

export const formatChordName = (rawChord: string) => {
  if (!rawChord || rawChord === "N") return "";

  // 1. Hapus titik dua (:) -> G:maj/3 jadi Gmaj/3
  let formatted = rawChord.replace(":", "");

  // Khusus: Ubah Abm (Ab minor) menjadi G#m (G# minor) karena lebih umum
  // Cek apakah chord dimulai dengan Abmin atau Abm
  if (formatted.startsWith("Abmin") || formatted.startsWith("Abm")) {
    formatted = formatted.replace("Ab", "G#");
  }

  // 2. Ganti "min" jadi "m" -> Gmin jadi Gm
  formatted = formatted.replace("min", "m");

  // 3. Ganti "maj" jadi kosongan jika itu Triad Mayor
  // Regex: Hapus 'maj' jika berada di akhir string ($) ATAU diikuti garis miring (\/)
  // Contoh: "Gmaj" -> "G", "Gmaj/3" -> "G/3", TAPI "Gmaj7" tetap "Gmaj7"
  formatted = formatted.replace(/maj(?=$|\/)/, "");

  // 4. Handle Slash Chord /3 (First Inversion)
  if (formatted.includes("/3")) {
    const [rootPart] = formatted.split("/");

    // Ambil nada dasar (Root Note) menggunakan Regex (Huruf A-G + opsional #/b)
    const match = rootPart.match(/^([A-G][#b]?)/);

    if (match) {
      const rootNote = match[1];
      const bassNote = NOTE_TO_MAJOR_THIRD[rootNote];

      if (bassNote) {
        // Ganti "/3" dengan "/BassNote"
        return formatted.replace("/3", `/${bassNote}`);
      }
    }
  }

  return formatted;
};
