// Chord theory utilities for chord name generation and formula calculation

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb", 
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
  "Db": "C#",
  "Eb": "D#",
  "Gb": "F#", 
  "Ab": "G#",
  "Bb": "A#"
};

export const CHORD_FORMULAS: Record<string, number[]> = {
  // Triads
  "maj": [0, 4, 7],           // Major: 1-3-5
  "min": [0, 3, 7],           // Minor: 1-b3-5
  "dim": [0, 3, 6],           // Diminished: 1-b3-b5
  "aug": [0, 4, 8],           // Augmented: 1-3-#5
  
  // Seventh chords
  "7": [0, 4, 7, 10],         // Dominant 7th: 1-3-5-b7
  "maj7": [0, 4, 7, 11],      // Major 7th: 1-3-5-7
  "min7": [0, 3, 7, 10],      // Minor 7th: 1-b3-5-b7
  "dim7": [0, 3, 6, 9],       // Diminished 7th: 1-b3-b5-bb7
  "m7b5": [0, 3, 6, 10],      // Half diminished: 1-b3-b5-b7
  "minmaj7": [0, 3, 7, 11],   // Minor major 7th: 1-b3-5-7
  
  // Extended chords
  "9": [0, 4, 7, 10, 14],     // 9th: 1-3-5-b7-9
  "maj9": [0, 4, 7, 11, 14],  // Major 9th: 1-3-5-7-9
  "min9": [0, 3, 7, 10, 14],  // Minor 9th: 1-b3-5-b7-9
  "11": [0, 4, 7, 10, 14, 17], // 11th: 1-3-5-b7-9-11
  "13": [0, 4, 7, 10, 14, 17, 21], // 13th: 1-3-5-b7-9-11-13
  
  // Suspended chords
  "sus2": [0, 2, 7],          // Sus2: 1-2-5
  "sus4": [0, 5, 7],          // Sus4: 1-4-5
  "7sus4": [0, 5, 7, 10],     // 7sus4: 1-4-5-b7
  
  // Added tone chords
  "add9": [0, 4, 7, 14],      // Add 9: 1-3-5-9
  "add11": [0, 4, 7, 17],     // Add 11: 1-3-5-11
  "6": [0, 4, 7, 9],          // 6th: 1-3-5-6
  "m6": [0, 3, 7, 9],         // Minor 6th: 1-b3-5-6
  
  // Altered chords
  "7b5": [0, 4, 6, 10],       // 7 flat 5: 1-3-b5-b7
  "7#5": [0, 4, 8, 10],       // 7 sharp 5: 1-3-#5-b7
  "7b9": [0, 4, 7, 10, 13],   // 7 flat 9: 1-3-5-b7-b9
  "7#9": [0, 4, 7, 10, 15],   // 7 sharp 9: 1-3-5-b7-#9
  "7#11": [0, 4, 7, 10, 18],  // 7 sharp 11: 1-3-5-b7-#11
  "7b13": [0, 4, 7, 10, 20],  // 7 flat 13: 1-3-5-b7-b13
};

export const QUALITY_DISPLAY_NAMES: Record<string, string> = {
  "maj": "",
  "min": "m", 
  "dim": "°",
  "aug": "+",
  "7": "7",
  "maj7": "maj7",
  "min7": "m7",
  "dim7": "°7",
  "m7b5": "m7b5",
  "minmaj7": "m(maj7)",
  "9": "9",
  "maj9": "maj9", 
  "min9": "m9",
  "11": "11",
  "13": "13",
  "sus2": "sus2",
  "sus4": "sus4",
  "7sus4": "7sus4",
  "add9": "add9",
  "add11": "add11",
  "6": "6",
  "m6": "m6",
  "7b5": "7b5",
  "7#5": "7#5", 
  "7b9": "7b9",
  "7#9": "7#9",
  "7#11": "7#11",
  "7b13": "7b13"
};

/**
 * Generate a chord name from root note and quality
 */
export const generateChordName = (rootNote: string, quality: string): string => {
  const displayQuality = QUALITY_DISPLAY_NAMES[quality] || quality;
  return `${rootNote}${displayQuality}`;
};

/**
 * Get the interval formula for a chord quality
 */
export const calculateChordFormula = (quality: string): number[] => {
  return CHORD_FORMULAS[quality] || [0, 4, 7]; // Default to major triad
};

/**
 * Calculate the notes in a chord given root note and intervals
 */
export const calculateChordNotes = (rootNote: string, intervals: number[]): string[] => {
  const rootIndex = NOTES.indexOf(rootNote);
  if (rootIndex === -1) return [];
  
  return intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    return NOTES[noteIndex];
  });
};

/**
 * Get enharmonic equivalent of a note
 */
export const getEnharmonicEquivalent = (note: string): string | null => {
  return ENHARMONIC_EQUIVALENTS[note] || null;
};

/**
 * Convert interval formula to readable string
 */
export const formulaToString = (intervals: number[]): string => {
  const intervalNames = [
    "1", "b2", "2", "b3", "3", "4", "#4/b5", "5", 
    "#5/b6", "6", "b7", "7", "b9", "9", "#9", "b11", 
    "11", "#11", "b13", "13", "b14", "7"
  ];
  
  return intervals.map(interval => intervalNames[interval] || interval.toString()).join("-");
};

/**
 * Parse a formula string like "1-3-5-6" into interval numbers
 */
export const parseFormulaString = (formulaString: string): number[] => {
  if (!formulaString) return [0, 4, 7]; // Default major triad
  
  const intervalMap: Record<string, number> = {
    "1": 0, "b2": 1, "2": 2, "b3": 3, "3": 4, "4": 5, 
    "#4": 6, "b5": 6, "5": 7, "#5": 8, "b6": 8, "6": 9,
    "b7": 10, "7": 11, "b9": 13, "9": 14, "#9": 15, 
    "b11": 16, "11": 17, "#11": 18, "b13": 20, "13": 21,
    "bb7": 9 // For diminished 7th
  };
  
  try {
    return formulaString
      .split("-")
      .map(interval => interval.trim())
      .map(interval => {
        // Handle special cases like #4/b5
        if (interval.includes("/")) {
          interval = interval.split("/")[0];
        }
        return intervalMap[interval] !== undefined ? intervalMap[interval] : parseInt(interval) || 0;
      })
      .filter((interval, index, arr) => arr.indexOf(interval) === index) // Remove duplicates
      .sort((a, b) => a - b); // Sort intervals
  } catch (error) {
    console.warn("Could not parse formula string:", formulaString);
    return [0, 4, 7]; // Fallback to major triad
  }
};

/**
 * Validate if a set of notes matches a chord formula
 */
export const validateChordNotes = (
  rootNote: string, 
  quality: string, 
  actualNotes: string[]
): { isValid: boolean; missingNotes: string[]; extraNotes: string[] } => {
  const expectedIntervals = calculateChordFormula(quality);
  const expectedNotes = calculateChordNotes(rootNote, expectedIntervals);
  
  // Normalize notes to handle enharmonic equivalents
  const normalizeNote = (note: string) => {
    const noteOnly = note.replace(/\d+$/, ''); // Remove octave numbers
    return getEnharmonicEquivalent(noteOnly) || noteOnly;
  };
  
  const normalizedExpected = expectedNotes.map(normalizeNote);
  const normalizedActual = actualNotes.map(normalizeNote);
  
  const missingNotes = normalizedExpected.filter(note => !normalizedActual.includes(note));
  const extraNotes = normalizedActual.filter(note => !normalizedExpected.includes(note));
  
  return {
    isValid: missingNotes.length === 0 && extraNotes.length === 0,
    missingNotes: missingNotes,
    extraNotes: extraNotes
  };
};

/**
 * Generate chord aliases (enharmonic equivalents)
 */
export const generateChordAliases = (chordName: string): string[] => {
  const aliases: string[] = [];
  
  // Extract root note from chord name
  const rootNote = chordName.charAt(0) + (chordName.charAt(1) === '#' || chordName.charAt(1) === 'b' ? chordName.charAt(1) : '');
  const quality = chordName.slice(rootNote.length);
  
  const enharmonic = getEnharmonicEquivalent(rootNote);
  if (enharmonic) {
    aliases.push(`${enharmonic}${quality}`);
  }
  
  return aliases;
};

/**
 * Get chord complexity/difficulty score
 */
export const getChordComplexity = (quality: string): number => {
  // Simple scoring system based on chord type
  const complexityScores: Record<string, number> = {
    "maj": 1,
    "min": 1,
    "7": 2,
    "maj7": 2,
    "min7": 2,
    "sus2": 2,
    "sus4": 2,
    "dim": 2,
    "aug": 2,
    "9": 3,
    "maj9": 3,
    "min9": 3,
    "11": 4,
    "13": 4,
    "add9": 2,
    "6": 2,
    "m6": 2,
    "7b5": 3,
    "7#5": 3,
    "7b9": 4,
    "7#9": 4,
    "7#11": 4,
    "7b13": 4,
    "dim7": 3,
    "m7b5": 3,
    "minmaj7": 3
  };
  
  return complexityScores[quality] || 2;
};