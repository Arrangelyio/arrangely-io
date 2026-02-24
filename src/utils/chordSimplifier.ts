/**
 * Chord Simplification Utility
 * 
 * Simplifies complex chords for beginner users while preserving
 * the 4 essential qualities: Major, Minor, Diminished, Augmented.
 * 
 * Examples:
 *   Cmaj7 -> C, Cm7 -> Cm, Cdim7 -> Cdim, Caug7 -> Caug
 *   Csus2 -> C, Cadd9 -> C, C/G -> C, Cm7/G -> Cm
 */

const SPECIAL_SYMBOLS = new Set(["WR", "HR", "QR", "ER", "WR.", "HR.", "QR.", "ER.", ".", "%", "/", "N", ""]);

export const simplifyChord = (chord: string): string => {
  if (!chord) return chord;

  // 1. Return special symbols as-is
  if (SPECIAL_SYMBOLS.has(chord)) return chord;

  // 2. Handle slash chord: take only the part before "/"
  const slashIndex = chord.indexOf("/");
  const mainPart = slashIndex > 0 ? chord.substring(0, slashIndex) : chord;

  // 3. Parse root note (A-G + optional # or b)
  const rootMatch = mainPart.match(/^([A-G][#b]?)/);
  if (!rootMatch) return chord; // Can't parse, return as-is

  const root = rootMatch[1];
  const remainder = mainPart.substring(root.length);

  // 4. Detect quality from remainder
  let quality = "";

  if (remainder.includes("dim")) {
    quality = "dim";
  } else if (remainder.includes("aug") || remainder.includes("+")) {
    quality = "aug";
  } else if (/(?:^m(?!aj)|min)/.test(remainder)) {
    // Contains 'm' at start (but not 'maj') or 'min'
    quality = "m";
  }
  // else: major (empty string)

  // 5. Return root + quality
  return root + quality;
};

/**
 * Simplifies all chords in a text line while preserving exact spacing.
 * Each chord token (e.g. "Cmaj7") is replaced with its simplified version (e.g. "C"),
 * and the original spacing/padding is maintained by appending extra spaces.
 */
export const simplifyChordLine = (line: string): string => {
  // Match chord tokens: root note + optional accidental + modifiers
  return line.replace(
    /([A-G][#b]?(?:m(?:aj|in)?|dim|aug|sus|add|\+|°)?[0-9]?[0-9]?(?:sus[24])?(?:add[0-9]+)?(?:\/[A-G][#b]?)?)/g,
    (match) => {
      const simplified = simplifyChord(match);
      // Pad with spaces to maintain alignment
      if (simplified.length < match.length) {
        return simplified + ' '.repeat(match.length - simplified.length);
      }
      return simplified;
    }
  );
};
