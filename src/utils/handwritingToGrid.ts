/**
 * handwritingToGrid.ts
 * 
 * Comprehensive parser that converts normalized handwriting recognition text
 * into fully populated ChordSection[] with all musical properties mapped.
 */

interface ChordBar {
  id: string;
  chord: string;
  chordAfter?: string;
  chordEnd?: string;
  beats: number;
  restType?: "WR" | "HR" | "QR" | "ER" | "WR." | "HR." | "QR." | "ER.";
  trailingRestType?: "WR" | "HR" | "QR" | "ER" | "WR." | "HR." | "QR." | "ER.";
  fermata?: boolean;
  ending?: {
    type: "1" | "2";
    isStart?: boolean;
    isEnd?: boolean;
  };
  musicalSigns?: {
    segno?: boolean;
    coda?: boolean;
    dsAlCoda?: boolean;
    dcAlCoda?: boolean;
    ds?: boolean;
    fine?: boolean;
    dcAlFine?: boolean;
  };
  timeSignatureOverride?: string;
}

interface ChordSection {
  id: string;
  name: string;
  timeSignature: string;
  bars: ChordBar[];
  isExpanded: boolean;
  barCount: number;
  position?: number;
}

const NAVIGATION_TOKENS: Record<string, Partial<ChordBar['musicalSigns']>> = {
  'D.S.': { ds: true },
  'D.S. al Coda': { dsAlCoda: true },
  'D.S. al Fine': { ds: true, fine: true },
  'D.C.': { ds: true }, // D.C. uses same rendering path
  'D.C. al Coda': { dcAlCoda: true },
  'D.C. al Fine': { dcAlFine: true },
  'Fine': { fine: true },
};

const REST_TYPES = new Set(['WR', 'HR', 'QR', 'ER']);

let barCounter = 0;
let sectionCounter = 0;

function makeBarId(): string {
  return `hw-bar-${Date.now()}-${barCounter++}`;
}

function makeSectionId(): string {
  return `hw-section-${Date.now()}-${sectionCounter++}`;
}

function createEmptyBar(overrides?: Partial<ChordBar>): ChordBar {
  return {
    id: makeBarId(),
    chord: '',
    beats: 4,
    ...overrides,
  };
}

/**
 * Parse a single chord token into a ChordBar with all properties mapped.
 */
function parseToken(token: string): ChordBar {
  const bar = createEmptyBar();

  // Segno symbol
  if (token === '§') {
    bar.musicalSigns = { segno: true };
    return bar;
  }

  // Coda symbol (standalone O)
  if (token === 'O') {
    bar.musicalSigns = { coda: true };
    return bar;
  }

  // Navigation markers
  if (NAVIGATION_TOKENS[token]) {
    bar.musicalSigns = { ...NAVIGATION_TOKENS[token] };
    return bar;
  }

  // Rest types
  if (REST_TYPES.has(token)) {
    bar.restType = token as ChordBar['restType'];
    return bar;
  }

  // Simile marks
  if (token === '%%') {
    bar.chord = '%%';
    return bar;
  }
  if (token === '%') {
    bar.chord = '%';
    return bar;
  }

  // Spacer
  if (token === 'X') {
    bar.chord = '';
    return bar;
  }

  // Page break - treat as empty bar with marker (consumer can handle)
  if (token === '+') {
    bar.chord = '+';
    return bar;
  }

  // Fermata: chord ending with ,,
  if (token.endsWith(',,')) {
    bar.chord = token.slice(0, -2);
    bar.fermata = true;
    return bar;
  }

  // Split bars: A_B or A_B_C
  if (token.includes('_')) {
    const parts = token.split('_');
    bar.chord = parts[0] || '';
    if (parts[1]) bar.chordAfter = parts[1];
    if (parts[2]) bar.chordEnd = parts[2];
    return bar;
  }

  // Default: treat as chord name
  bar.chord = token;
  return bar;
}

/**
 * Parse a repeat/ending group: (A B C D), (A B L C D), (A B)x3
 */
function parseRepeatGroup(groupText: string): ChordBar[] {
  // Check for repeat count: (...)xN
  let repeatCount = 1;
  const countMatch = groupText.match(/\)x(\d+)$/);
  if (countMatch) {
    repeatCount = parseInt(countMatch[1], 10);
    groupText = groupText.slice(0, -(countMatch[0].length - 1)); // Remove xN but keep )
  }

  // Remove parentheses
  const inner = groupText.replace(/^\(/, '').replace(/\)$/, '').trim();
  const tokens = inner.split(/\s+/);

  // Check for L separator (1st/2nd ending)
  const lIndex = tokens.indexOf('L');

  if (lIndex >= 0) {
    // Ending group: tokens before L = 1st ending, tokens after L = 2nd ending
    const firstEndingTokens = tokens.slice(0, lIndex);
    const secondEndingTokens = tokens.slice(lIndex + 1);

    const bars: ChordBar[] = [];

    // 1st ending bars
    firstEndingTokens.forEach((t, i) => {
      const bar = parseToken(t);
      bar.ending = {
        type: '1',
        isStart: i === 0,
        isEnd: i === firstEndingTokens.length - 1,
      };
      bars.push(bar);
    });

    // 2nd ending bars
    secondEndingTokens.forEach((t, i) => {
      const bar = parseToken(t);
      bar.ending = {
        type: '2',
        isStart: i === 0,
        isEnd: i === secondEndingTokens.length - 1,
      };
      bars.push(bar);
    });

    return bars;
  }

  // Simple repeat group (no L separator)
  const bars = tokens.map((t) => parseToken(t));

  // If repeatCount > 1, we could duplicate bars or mark them
  // For now, just return the bars (repeat count info can be added to metadata)
  return bars;
}

/**
 * Attempt to join multi-word navigation tokens from a token array.
 * Returns [matched token string, number of tokens consumed] or null.
 */
function matchMultiWordNav(tokens: string[], startIdx: number): [string, number] | null {
  // Try longest matches first (4 words, then 3, then 2, then 1)
  for (let len = 4; len >= 1; len--) {
    if (startIdx + len > tokens.length) continue;
    const candidate = tokens.slice(startIdx, startIdx + len).join(' ');
    if (NAVIGATION_TOKENS[candidate]) {
      return [candidate, len];
    }
  }
  return null;
}

/**
 * Parse a full line of tokens (not a section header or time signature).
 */
function parseLine(line: string): ChordBar[] {
  const bars: ChordBar[] = [];

  // First, extract any parenthesized groups
  // Regex to match (...) or (...)xN
  const groupRegex = /\(([^)]+)\)(x\d+)?/g;
  let lastIndex = 0;
  const segments: Array<{ type: 'text' | 'group'; value: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = groupRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: line.slice(lastIndex, match.index).trim() });
    }
    segments.push({ type: 'group', value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) {
    segments.push({ type: 'text', value: line.slice(lastIndex).trim() });
  }

  for (const segment of segments) {
    if (!segment.value) continue;

    if (segment.type === 'group') {
      bars.push(...parseRepeatGroup(segment.value));
    } else {
      // Process as space-separated tokens with multi-word nav detection
      const tokens = segment.value.split(/\s+/).filter(Boolean);
      let i = 0;
      while (i < tokens.length) {
        const navMatch = matchMultiWordNav(tokens, i);
        if (navMatch) {
          const [navToken, consumed] = navMatch;
          const bar = createEmptyBar();
          bar.musicalSigns = { ...NAVIGATION_TOKENS[navToken] };
          bars.push(bar);
          i += consumed;
        } else {
          bars.push(parseToken(tokens[i]));
          i++;
        }
      }
    }
  }

  return bars;
}

/**
 * Main entry point: parse normalized handwriting text into ChordSection[].
 */
export function handwritingToGrid(normalizedText: string): ChordSection[] {
  barCounter = 0;
  sectionCounter = 0;

  const lines = normalizedText.split('\n');
  const sections: ChordSection[] = [];
  let currentSection: ChordSection | null = null;
  let currentTimeSignature = '4/4';

  const ensureSection = () => {
    if (!currentSection) {
      currentSection = {
        id: makeSectionId(),
        name: 'Intro',
        timeSignature: currentTimeSignature,
        bars: [],
        isExpanded: true,
        barCount: 0,
      };
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Section header: "= SectionName"
    if (line.startsWith('= ')) {
      // Finalize previous section
      if (currentSection && currentSection.bars.length > 0) {
        currentSection.barCount = currentSection.bars.length;
        currentSection.position = sections.length;
        sections.push(currentSection);
      }
      currentSection = {
        id: makeSectionId(),
        name: line.slice(2).trim(),
        timeSignature: currentTimeSignature,
        bars: [],
        isExpanded: true,
        barCount: 0,
      };
      continue;
    }

    // Time signature line: "3:4", "6:8", etc.
    const tsMatch = line.match(/^(\d+):(\d+)$/);
    if (tsMatch) {
      currentTimeSignature = `${tsMatch[1]}/${tsMatch[2]}`;
      if (currentSection) {
        currentSection.timeSignature = currentTimeSignature;
      }
      continue;
    }

    // Page break
    if (line === '+') {
      ensureSection();
      // Add a marker bar for page break
      currentSection!.bars.push(createEmptyBar({ chord: '+' }));
      continue;
    }

    // Chord/token line
    ensureSection();
    const bars = parseLine(line);
    currentSection!.bars.push(...bars);
  }

  // Finalize last section
  if (currentSection && currentSection.bars.length > 0) {
    currentSection.barCount = currentSection.bars.length;
    currentSection.position = sections.length;
    sections.push(currentSection);
  }

  // If no sections were created, return empty
  if (sections.length === 0) {
    return [];
  }

  return sections;
}
