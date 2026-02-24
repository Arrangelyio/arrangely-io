/**
 * chordSymbolMapper.ts
 * 
 * Post-processes recognized handwriting text to normalize it into
 * the exact text syntax expected by LiveChordPreview and TextModeConverter.
 */

// Indonesian section name mappings
const SECTION_NAME_MAP: Record<string, string> = {
  'reff': 'Chorus',
  'refrain': 'Chorus', 
  'bait': 'Verse',
  'pengiring': 'Interlude',
  'pembuka': 'Intro',
  'penutup': 'Outro',
  'jembatan': 'Bridge',
};

// Navigation/musical term normalization (single-word entries)
const NAVIGATION_MAP: Record<string, string> = {
  'ds': 'D.S.',
  'd.s': 'D.S.',
  'ds.': 'D.S.',
  'dc': 'D.C.',
  'd.c': 'D.C.',
  'dc.': 'D.C.',
  'fine': 'Fine',
  'done': 'Fine',
  'end': 'Fine',
  'segno': '§',
  'coda': 'O',
};

// Multi-word navigation phrases (checked during line normalization)
const MULTI_WORD_NAV: Record<string, string> = {
  'ds al coda': 'D.S. al Coda',
  'd.s. al coda': 'D.S. al Coda',
  'ds al fine': 'D.S. al Fine',
  'd.s. al fine': 'D.S. al Fine',
  'dc al coda': 'D.C. al Coda',
  'd.c. al coda': 'D.C. al Coda',
  'dc al fine': 'D.C. al Fine',
  'd.c. al fine': 'D.C. al Fine',
  'back to top': 'D.C.',
};

// Rest type normalization
const REST_MAP: Record<string, string> = {
  'wr': 'WR',
  'hr': 'HR',
  'qr': 'QR',
  'er': 'ER',
  'whole rest': 'WR',
  'half rest': 'HR',
  'quarter rest': 'QR',
  'eighth rest': 'ER',
};

// Note type normalization
const NOTE_MAP: Record<string, string> = {
  'wn': 'WN',
  'hn': 'HN',
  'qn': 'QN',
  'en': 'EN',
  'sn': 'SN',
  'whole note': 'WN',
  'half note': 'HN',
  'quarter note': 'QN',
  'eighth note': 'EN',
  'sixteenth note': 'SN',
};

/**
 * Normalize musical symbols in a chord token.
 * Triangle -> maj7, degree -> dim, half-dim -> m7b5
 */
function normalizeMusicalSymbols(token: string): string {
  return token
    .replace(/[Δ△]/g, 'maj7')
    .replace(/°/g, 'dim')
    .replace(/ø/g, 'm7b5');
}

/**
 * Normalize a section name (handles Indonesian terms and case)
 */
export function normalizeSectionName(name: string): string {
  const lower = name.toLowerCase().trim();
  
  // Check Indonesian mappings
  if (SECTION_NAME_MAP[lower]) {
    return SECTION_NAME_MAP[lower];
  }
  
  // Capitalize first letter of each word
  return name.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize a single token (chord, symbol, navigation marker)
 */
export function normalizeToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return '';
  
  // Apply musical symbol normalization first
  const symbolNormalized = normalizeMusicalSymbols(trimmed);
  const lower = symbolNormalized.toLowerCase();
  
  // Check navigation markers
  if (NAVIGATION_MAP[lower]) {
    return NAVIGATION_MAP[lower];
  }
  
  // Check rest types
  if (REST_MAP[lower]) {
    return REST_MAP[lower];
  }
  
  // Check note types
  if (NOTE_MAP[lower]) {
    return NOTE_MAP[lower];
  }
  
  // Simile marks
  if (symbolNormalized === '%%') return '%%';
  if (symbolNormalized === '%') return '%';
  
  // Fermata: if chord ends with ",," keep as-is
  if (symbolNormalized.endsWith(',,')) return symbolNormalized;
  
  // Page break
  if (symbolNormalized === '+') return '+';
  
  // Spacer
  if (lower === 'x') return 'X';
  
  // Otherwise treat as chord - preserve original case for chord names
  return symbolNormalized;
}

/**
 * Normalize a full line of recognized text
 */
export function normalizeLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return '';
  
  // Metadata lines - pass through as-is
  if (/^(TITLE|KEY|TEMPO|TIME):/i.test(trimmed)) {
    return trimmed;
  }
  
  // Section header detection (e.g., "Intro:", "Verse 1:", "Reff:")
  const sectionMatch = trimmed.match(/^([A-Za-z\s]+\d*)\s*:?\s*$/);
  if (sectionMatch) {
    const name = normalizeSectionName(sectionMatch[1]);
    return `= ${name}`;
  }
  
  // Already a section header in correct format
  if (trimmed.startsWith('= ') || trimmed.startsWith('- ')) {
    const name = normalizeSectionName(trimmed.slice(2));
    return `= ${name}`;
  }
  
  // Time signature line (e.g., "3/4" or "6/8")
  const tsMatch = trimmed.match(/^(\d+)\s*[/:]\s*(\d+)$/);
  if (tsMatch) {
    return `${tsMatch[1]}:${tsMatch[2]}`;
  }

  // First, normalize multi-word navigation phrases in the line
  let normalized = trimmed;
  for (const [phrase, replacement] of Object.entries(MULTI_WORD_NAV)) {
    const regex = new RegExp(phrase.replace(/\./g, '\\.'), 'gi');
    normalized = normalized.replace(regex, replacement);
  }

  // Clean up pipe characters: normalize spacing around bars but keep them
  normalized = normalized.replace(/\s*\|\s*/g, ' | ');
  
  // Convert repeat bracket notation: (: ... :) or ||: ... :|| -> ( ... )
  normalized = normalized.replace(/\(\s*:/g, '(').replace(/:\s*\)/g, ')');
  normalized = normalized.replace(/\|\|\s*:/g, '(').replace(/:\s*\|\|/g, ')');
  
  // Convert dash-split bars: chord-chord -> chord_chord
  // Only match when both sides look like chord names (start with A-G or number)
  normalized = normalized.replace(
    /([A-Ga-g][A-Za-z0-9#b/]*)-([A-Ga-g][A-Za-z0-9#b/]*)/g,
    '$1_$2'
  );

  // Preserve parenthesized groups as single units, normalize tokens outside
  const parts: string[] = [];
  const groupRegex = /\(([^)]+)\)(x\d+)?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = groupRegex.exec(normalized)) !== null) {
    // Process text before the group
    if (match.index > lastIndex) {
      const before = normalized.slice(lastIndex, match.index).trim();
      if (before) {
        parts.push(...before.split(/\s+/).map(normalizeToken).filter(Boolean));
      }
    }
    // Keep group as-is (tokens inside are already chord names)
    const innerTokens = match[1].split(/\s+/).map(normalizeToken).filter(Boolean);
    const suffix = match[2] || '';
    parts.push(`(${innerTokens.join(' ')})${suffix}`);
    lastIndex = match.index + match[0].length;
  }

  // Process remaining text after last group
  if (lastIndex < normalized.length) {
    const remaining = normalized.slice(lastIndex).trim();
    if (remaining) {
      parts.push(...remaining.split(/\s+/).map(normalizeToken).filter(Boolean));
    }
  }

  return parts.join(' ');
}

/**
 * Process full recognized text through the normalizer.
 * Input: raw text from Gemini/ML Kit recognition
 * Output: text ready for TextModeConverter.textToSections() or LiveChordPreview
 */
export function normalizeRecognizedText(rawText: string): string {
  const lines = rawText.split('\n');
  const normalized = lines.map(normalizeLine).filter((line) => line.length > 0);
  return normalized.join('\n');
}

/**
 * Extract metadata from normalized text lines.
 * Returns metadata object and the remaining chord text without metadata lines.
 */
export function extractMetadata(text: string): {
  title?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  chordText: string;
} {
  const lines = text.split('\n');
  const metadata: { title?: string; key?: string; tempo?: number; timeSignature?: string } = {};
  const chordLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('TITLE:')) {
      metadata.title = trimmed.replace('TITLE:', '').trim();
    } else if (trimmed.startsWith('KEY:')) {
      metadata.key = trimmed.replace('KEY:', '').trim();
    } else if (trimmed.startsWith('TEMPO:')) {
      const tempoVal = parseInt(trimmed.replace('TEMPO:', '').trim(), 10);
      if (!isNaN(tempoVal)) metadata.tempo = tempoVal;
    } else if (trimmed.startsWith('TIME:')) {
      metadata.timeSignature = trimmed.replace('TIME:', '').trim();
    } else {
      chordLines.push(line);
    }
  }

  return { ...metadata, chordText: chordLines.join('\n') };
}
