/**
 * Unified Section Color System
 * Soft, pastel-inspired colors for a modern, professional look
 * Used across ArrangementLane, SectionOverlay, CombinedWaveformDisplay
 */

export interface SectionColorConfig {
  /** Primary badge/label background color - softer, muted tones */
  bg: string;
  /** Text color for labels */
  text: string;
  /** Waveform background tint (semi-transparent) */
  waveformBg: string;
  /** Short badge abbreviation */
  badge: string;
}

/**
 * Soft, unified section color palette
 * All colors are HSL format for consistency with Tailwind
 */
export const SECTION_COLORS: Record<string, SectionColorConfig> = {
  // Intro - Soft Purple
  intro: {
    bg: 'hsl(271, 50%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(271, 40%, 25%, 0.35)',
    badge: 'Intro',
  },
  i: {
    bg: 'hsl(271, 50%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(271, 40%, 25%, 0.35)',
    badge: 'I',
  },
  
  // Verse - Soft Blue
  verse: {
    bg: 'hsl(210, 55%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(210, 45%, 25%, 0.35)',
    badge: 'Verse',
  },
  v: {
    bg: 'hsl(210, 55%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(210, 45%, 25%, 0.35)',
    badge: 'V',
  },
  v1: {
    bg: 'hsl(210, 55%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(210, 45%, 25%, 0.35)',
    badge: 'V1',
  },
  v2: {
    bg: 'hsl(210, 55%, 58%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(210, 45%, 27%, 0.35)',
    badge: 'V2',
  },
  v3: {
    bg: 'hsl(210, 55%, 60%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(210, 45%, 29%, 0.35)',
    badge: 'V3',
  },
  
  // Chorus - Soft Green
  chorus: {
    bg: 'hsl(150, 45%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(150, 40%, 23%, 0.35)',
    badge: 'Chorus',
  },
  c: {
    bg: 'hsl(150, 45%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(150, 40%, 23%, 0.35)',
    badge: 'C',
  },
  co: {
    bg: 'hsl(150, 45%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(150, 40%, 23%, 0.35)',
    badge: 'Co',
  },
  
  // Pre-Chorus - Soft Yellow/Amber
  pre_chorus: {
    bg: 'hsl(45, 55%, 55%)',
    text: 'hsl(0, 0%, 15%)',
    waveformBg: 'hsla(45, 45%, 25%, 0.35)',
    badge: 'Pre-Chorus',
  },
  pc: {
    bg: 'hsl(45, 55%, 55%)',
    text: 'hsl(0, 0%, 15%)',
    waveformBg: 'hsla(45, 45%, 25%, 0.35)',
    badge: 'PC',
  },
  
  // Bridge - Soft Orange
  bridge: {
    bg: 'hsl(35, 55%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(35, 45%, 23%, 0.35)',
    badge: 'Bridge',
  },
  b: {
    bg: 'hsl(35, 55%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(35, 45%, 23%, 0.35)',
    badge: 'B',
  },
  b1: {
    bg: 'hsl(35, 55%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(35, 45%, 23%, 0.35)',
    badge: 'B1',
  },
  
  // Instrumental - Soft Indigo
  instrumental: {
    bg: 'hsl(245, 45%, 58%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(245, 40%, 25%, 0.35)',
    badge: 'Inst',
  },
  is: {
    bg: 'hsl(245, 45%, 58%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(245, 40%, 25%, 0.35)',
    badge: 'Is',
  },
  
  // Solo - Soft Pink
  solo: {
    bg: 'hsl(320, 45%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(320, 40%, 25%, 0.35)',
    badge: 'Solo',
  },
  s: {
    bg: 'hsl(320, 45%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(320, 40%, 25%, 0.35)',
    badge: 'S',
  },
  
  // Outro - Soft Rose
  outro: {
    bg: 'hsl(0, 45%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(0, 40%, 23%, 0.35)',
    badge: 'Outro',
  },
  o: {
    bg: 'hsl(0, 45%, 55%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(0, 40%, 23%, 0.35)',
    badge: 'O',
  },
  
  // Tag - Soft Teal
  tag: {
    bg: 'hsl(175, 45%, 48%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(175, 40%, 23%, 0.35)',
    badge: 'Tag',
  },
  ta: {
    bg: 'hsl(175, 45%, 48%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(175, 40%, 23%, 0.35)',
    badge: 'Ta',
  },
  
  // Ending - Soft Rose/Red
  ending: {
    bg: 'hsl(0, 45%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(0, 40%, 22%, 0.35)',
    badge: 'End',
  },
  e: {
    bg: 'hsl(0, 45%, 50%)',
    text: 'hsl(0, 0%, 100%)',
    waveformBg: 'hsla(0, 40%, 22%, 0.35)',
    badge: 'E',
  },
};

/** Default color for unknown section types */
const DEFAULT_COLOR: SectionColorConfig = {
  bg: 'hsl(220, 15%, 45%)',
  text: 'hsl(0, 0%, 100%)',
  waveformBg: 'hsla(220, 15%, 22%, 0.3)',
  badge: '?',
};

/**
 * Get section color config by name
 * Supports exact match and partial matching
 */
export function getSectionColorConfig(name: string): SectionColorConfig {
  const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  
  // Try exact match first
  if (SECTION_COLORS[key]) {
    return { ...SECTION_COLORS[key], badge: name };
  }
  
  // Try partial match (e.g., "verse 1" matches "verse")
  for (const [k, v] of Object.entries(SECTION_COLORS)) {
    if (key.includes(k) || k.includes(key)) {
      return { ...v, badge: name };
    }
  }
  
  return { ...DEFAULT_COLOR, badge: name.slice(0, 8) };
}

/**
 * Get just the background color for a section
 * For use in ArrangementLane badges
 */
export function getSectionBgColor(name: string): string {
  return getSectionColorConfig(name).bg;
}

/**
 * Get just the waveform background color for a section
 * For use in CombinedWaveformDisplay
 */
export function getSectionWaveformBgColor(name: string): string {
  return getSectionColorConfig(name).waveformBg;
}
