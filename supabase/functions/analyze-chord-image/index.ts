import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const METADATA_BLOCK = `
METADATA EXTRACTION (output these as header lines BEFORE the chord content):
- If you see a song title at the top, output: TITLE: Song Name
- If you see a key indication (e.g. "(D)", "Key: Bb", "Key = G"), output: KEY: D
- If you see tempo (e.g. "94bpm", "J=130", "♩=94", "med. swing"), output: TEMPO: 94
- If you see a time signature (e.g. "4/4", "3/4", "6/8"), output: TIME: 4/4

SYMBOL TRANSLATION:
- Triangle symbol (Δ or △) after a chord root = major 7th: FΔ -> Fmaj7, BbΔ -> Bbmaj7, EbΔ -> Ebmaj7
- Degree symbol (°) after a chord = diminished: E° -> Edim, B° -> Bdim
- Half-diminished (ø) = m7b5: Bø7 -> Bm7b5
- Dash between two chords in one bar = split bar (use dots for beats): Em-A -> Em . A . (2 chords sharing 4 beats), F#-F#7 -> F# . F#7 .
- Staff paper horizontal lines = IGNORE completely, focus only on chord text written on/above/below them
- "Back to top" or "top" = D.C.
- "Done" or "end" = Fine
- Use pipe characters | as bar separators to clearly separate bars: | E . G#m . | A . B . | C#m . G#m . | A |
- Each bar in 4/4 has 4 beat positions. A single chord filling the whole bar: | E | Two chords splitting the bar: | E . G#m . | Three chords: | E . G#m A |
- ALWAYS use | to separate bars so the reader knows exactly which chords belong together in one bar

NASHVILLE NUMBER SYSTEM (CRITICAL):
- Many charts use numbers instead of chord names. "Do = E" or "1 = E" means key of E, where numbers map to scale degrees.
- You MUST detect the key from lines like "Do = E", "Do = C", "1 = G", "Key: D" etc.
- Then convert ALL numbers to real chord names using the major scale of that key:
  Key of C: 1=C, 2=Dm, 3=Em, 4=F, 5=G, 6=Am, 7=Bdim
  Key of D: 1=D, 2=Em, 3=F#m, 4=G, 5=A, 6=Bm, 7=C#dim
  Key of E: 1=E, 2=F#m, 3=G#m, 4=A, 5=B, 6=C#m, 7=D#dim
  Key of F: 1=F, 2=Gm, 3=Am, 4=Bb, 5=C, 6=Dm, 7=Edim
  Key of G: 1=G, 2=Am, 3=Bm, 4=C, 5=D, 6=Em, 7=F#dim
  Key of A: 1=A, 2=Bm, 3=C#m, 4=D, 5=E, 6=F#m, 7=G#dim
  Key of Bb: 1=Bb, 2=Cm, 3=Dm, 4=Eb, 5=F, 6=Gm, 7=Adim
  Key of Eb: 1=Eb, 2=Fm, 3=Gm, 4=Ab, 5=Bb, 6=Cm, 7=Ddim
  Key of Ab: 1=Ab, 2=Bbm, 3=Cm, 4=Db, 5=Eb, 6=Fm, 7=Gdim
  Key of B: 1=B, 2=C#m, 3=D#m, 4=E, 5=F#, 6=G#m, 7=A#dim
  Key of F#: 1=F#, 2=G#m, 3=A#m, 4=B, 5=C#, 6=D#m, 7=E#dim
  Key of C#: 1=C#, 2=D#m, 3=E#m(Fm), 4=F#, 5=G#, 6=A#m, 7=B#dim(Cdim)
- Number modifiers -- the letter after a number changes the chord quality:
  "Xm" = minor version of that degree (e.g., in key E: 5m = Bm, 4m = Am, 1m = Em)
  "Xb" = flat the ROOT by a semitone (e.g., in key E: 5b = Bb, 6b = C, 7b = D)
  "X7" = dominant 7th of that degree (e.g., in key E: 5.67 or 67 = C#m7 context, but "17" = E7, "57" = B7)
  "3.5m" or "3,5m" = chromatic passing chord between 3rd and 4th degree
- Dots between numbers represent beat positions just like with chord names: "1 . 3 . | 4 . 4/5 ." means "E . G#m . | A . A/B ."
- Slash between numbers like "4/5" = slash chord: 4th degree over 5th degree bass (e.g., in key E: 4/5 = A/B)
- NEVER output raw numbers in the final result. Always convert to real chord names.
- If the chart says "Do = E - F#" it means the song modulates from key E to key F#. Use key E for sections before the modulation and key F# after.

RHYTHMIC NOTATION (CRITICAL):
- Handwritten charts often have note stems, flags, beams, or noteheads drawn BELOW or BETWEEN chord names. These indicate rhythm/strumming patterns -- IGNORE THEM COMPLETELY.
- Focus ONLY on the chord letter names (e.g., Am7, Bbmaj7, Dm7) written above or on the staff. Do NOT let rhythmic marks obscure or replace chord text.
- If a bar has two chord names written with rhythmic figures below, treat it as a SPLIT BAR with both chords: e.g., "Bbmaj7 . Am7 ."
- Navigation markers (Fine, D.S., D.C., D.S. al Coda, etc.) may be written INSIDE or immediately AFTER the last bar. Always capture them as a SEPARATE TOKEN on a NEW LINE after the bar's closing pipe.
`;

const PHOTO_PROMPT = `You are a music expert that analyzes chord chart images (printed, handwritten, or digital). Extract chord progressions and structure into a specific text syntax format.

CRITICAL OUTPUT FORMAT:
${METADATA_BLOCK}

SECTION NAME RECOGNITION:
- Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Solo, Outro, Coda, Tag, Ending
- Indonesian terms: "Reff" or "Refrain" = Chorus, "Bait" = Verse, "Pembuka" = Intro, "Penutup" = Outro, "Jembatan" = Bridge
- Always output the English name (e.g., "Reff" becomes "= Chorus")
- Section headers: Start with "= " followed by section name (e.g., "= Intro", "= Verse", "= Chorus")
- IMPORTANT: If the section header has additional text/annotations after the name (e.g., "Verse: (keys)", "Interlude: modulasi +1"), PRESERVE that extra text exactly as-is after the section name: "= Verse: (keys)", "= Interlude:"
- Any free-text notes or instructions written BELOW a section header or BELOW chord bars (e.g., "modulasi +1 langsung ke 5 - 55 5 (hitnya)") are COMMENTS, NOT chords. Output them with a "#" prefix on their own line EXACTLY where they appear (above or below the chord bars). Example: "# modulasi +1 langsung ke 5 - 55 5 (hitnya)". Do NOT drop, summarize, or try to parse these as chord bars.

CHORD RECOGNITION:
- Standard chords: C, Dm, F#, Bb, G7, Cmaj7, Am7, Bdim, Faug, Gsus4, etc.
- Extended chords: C#11, Bb9, F13, Gsus2, Aadd9, Dm7b5, G7#9 -- preserve extensions exactly
- Nashville numbers: If the chart uses numbers (1, 2m, 3, 4, 5, 6m, 7, etc.), you MUST convert them to actual chord names based on the detected key. For example in Key of E: 1=E, 2=F#m, 3=G#m, 4=A, 5=B, 6=C#m, 7=D#dim. NEVER output raw numbers - always output the real chord name.
- Slash chords: C/G, Am/E -- output as-is with the slash
- Split bars (multiple chords in one bar): use dots for beat positions: "E . G#m ." means E on beat 1, G#m on beat 3 (each chord gets 2 beats in 4/4). For 3 chords: "A . B C" or "A B C ."
- Optional/ghost chords in parentheses: (Am)

MUSICAL SYMBOLS TO RECOGNIZE:
- Repeat/simile mark (% sign or similar): output as "%"
- Double simile (%%): output as "%%"
- Repeat brackets with dots at barlines: wrap in parentheses: "(A B C D)"
- Repeat with count (x3, etc.): "(A B)x3"
- 1st/2nd endings (brackets with 1. and 2.): use L separator: "(A B L C D)"
- Segno (S-shape symbol): output as "§"
- Coda (crosshair circle): output as "O"
- "D.S." or "Dal Segno": output as "D.S."
- "D.C." or "Da Capo": output as "D.C."
- "D.S. al Coda": output as "D.S. al Coda"
- "D.C. al Coda": output as "D.C. al Coda"
- "D.S. al Fine": output as "D.S. al Fine"
- "D.C. al Fine": output as "D.C. al Fine"
- "Fine": output as "Fine"
- Fermata (bird's eye hold mark): append ",," to the chord: "G,,"
- Rest symbols: output as WR (whole rest), HR (half rest), QR (quarter rest), ER (eighth rest)
- Empty bar / spacer / "X": output as "X"
- Time signature fraction (e.g., 3/4): output as "3:4" on its own line

READING INSTRUCTIONS:
1. Read the grid structure: bars are arranged in rows, with section labels above each group
2. Read left to right, top to bottom within each section
3. Each bar box contains one chord (or chord pattern)
4. Handle messy handwriting -- make your best guess based on musical context
5. Navigation symbols (D.S., Coda, Fine, etc.) must appear as separate tokens
6. If the image has staff paper lines in the background, IGNORE them completely
7. Bars may contain rhythmic notation (noteheads, stems, flags, beams) drawn below or between chords. IGNORE all rhythmic marks and focus ONLY on the chord letter names written above or on the staff. If two chord names appear in one bar, output them as a split bar (e.g., "Bbmaj7 . Am7 .").
8. Navigation markers (Fine, D.S., D.C., etc.) written at the end of or after the last bar MUST be output on their own line after the closing bar pipe. Never drop them.

Example output:
TITLE: Let's Stay Together
KEY: F
TEMPO: 94
TIME: 4/4
= Intro
| Am | F | C | G |

= Interlude
| Bb | C | Dm | Am |
| Bb | C | Am |
# modulasi +1 langsung ke 5 - 55 5 (hitnya)

= Chorus
| C | G | Am | F |
| Bbmaj7 . Am7 . | Dm7 . Bb/C . |
Fine

IMPORTANT: Only return the structured chord text in the format above. Use | to separate bars. No explanations or commentary.`;

const HANDWRITING_PROMPT = `You are a music expert that reads handwritten chord charts written with a stylus on a tablet/iPad. Your task is to extract chord progressions from this handwritten notation and output them in a specific text syntax format.

CRITICAL OUTPUT FORMAT:
${METADATA_BLOCK}

SECTION NAME RECOGNITION:
- Intro, Verse, Pre-Chorus, Chorus, Bridge, Interlude, Solo, Outro, Coda, Tag, Ending
- Indonesian terms: "Reff" or "Refrain" = Chorus, "Bait" = Verse, "Pembuka" = Intro, "Penutup" = Outro, "Jembatan" = Bridge
- Always output the English name (e.g., "Reff" becomes "= Chorus")
- Section headers: Start with "= " followed by section name (e.g., "= Intro", "= Verse", "= Chorus")
- IMPORTANT: If the section header has additional text/annotations after the name (e.g., "Verse: (keys)", "Interlude: modulasi +1"), PRESERVE that extra text exactly as-is: "= Verse: (keys)", "= Interlude:"
- Any free-text notes or instructions written BELOW a section header or BELOW chord bars (e.g., "modulasi +1 langsung ke 5 - 55 5 (hitnya)") are COMMENTS, NOT chords. Output them with a "#" prefix on their own line EXACTLY where they appear (above or below the chord bars). Example: "# modulasi +1 langsung ke 5 - 55 5 (hitnya)". Do NOT drop, summarize, or try to parse these as chord bars.

CHORD RECOGNITION:
- Standard chords: C, Dm, F#, Bb, G7, Cmaj7, Am7, Bdim, Faug, Gsus4, etc.
- Extended chords: C#11, Bb9, F13, Gsus2, Aadd9, Dm7b5, G7#9 -- preserve extensions exactly
- Nashville numbers: If the chart uses numbers (1, 2m, 3, 4, 5, 6m, 7, etc.), you MUST convert them to actual chord names based on the detected key. For example in Key of E: 1=E, 2=F#m, 3=G#m, 4=A, 5=B, 6=C#m, 7=D#dim. NEVER output raw numbers - always output the real chord name.
- Slash chords: C/G, Am/E -- output as-is with the slash
- Split bars (multiple chords in one bar): use dots for beat positions: "E . G#m ." means E on beat 1, G#m on beat 3 (each chord gets 2 beats in 4/4). For 3 chords: "A . B C" or "A B C ."
- Optional/ghost chords in parentheses: (Am)
- Nashville numbers: If the chart uses numbers (1, 2m, 3, 4, 5, 6m, 7, etc.) with a key indication like "Do = E", you MUST convert ALL numbers to actual chord names. NEVER output raw numbers.

MUSICAL SYMBOLS TO RECOGNIZE:
- Repeat/simile mark (% sign or similar): output as "%"
- Double simile (%%): output as "%%"
- Repeat brackets with dots at barlines or (: ... :) notation: wrap in parentheses: "(A B C D)"
- Repeat with count (x3, etc.): "(A B)x3"
- 1st/2nd endings (brackets with 1. and 2.): use L separator: "(A B L C D)"
- Segno (S-shape symbol): output as "§"
- Coda (crosshair circle): output as "O"
- "D.S." or "Dal Segno": output as "D.S."
- "D.C." or "Da Capo": output as "D.C."
- "D.S. al Coda": output as "D.S. al Coda"
- "D.C. al Coda": output as "D.C. al Coda"
- "D.S. al Fine": output as "D.S. al Fine"
- "D.C. al Fine": output as "D.C. al Fine"
- "Fine": output as "Fine"
- Fermata (bird's eye hold mark): append ",," to the chord: "G,,"
- Rest symbols: output as WR (whole rest), HR (half rest), QR (quarter rest), ER (eighth rest)
- Note stems drawn above chords (hits): note their presence but focus on the chords
- Empty bar / spacer / "X": output as "X"
- Time signature fraction (e.g., 3/4): output as "3:4" on its own line
- Double barline (||): treat as section boundary, start new section if appropriate
- Page break mark: output as "+"

READING INSTRUCTIONS:
1. Read the grid structure: bars are arranged in rows of 4, with section labels above each group
2. Read left to right, top to bottom within each section
3. Each bar box contains one chord (or chord pattern)
4. Symbols drawn between/above/below bars are musical annotations
5. Handle messy handwriting -- make your best guess based on musical context
6. Common abbreviations: m=minor, M=major, 7=dominant 7th, maj7=major 7th, dim, aug, sus
7. Navigation symbols (D.S., Coda, Fine, etc.) must appear as separate tokens, never mixed into chord names
8. If the image has staff paper lines in the background, IGNORE them completely
9. Bars may contain rhythmic notation (noteheads, stems, flags, beams) drawn below or between chords. IGNORE all rhythmic marks and focus ONLY on the chord letter names written above or on the staff. If two chord names appear in one bar, output them as a split bar (e.g., "Bbmaj7 . Am7 .").
10. Navigation markers (Fine, D.S., D.C., etc.) written at the end of or after the last bar MUST be output on their own line after the closing bar pipe. Never drop them.

Example output:
TITLE: My Song
KEY: D
TEMPO: 130
= Intro
| Am | F | C | G |

= Interlude
| Bb | C | Dm | Am |
# modulasi +1 langsung ke 5 - 55 5 (hitnya)

= Chorus
| C | G | Am | F |
| Bbmaj7 . Am7 . | Dm7 . Bb/C . |
Fine

IMPORTANT: Only return the structured chord text in the format above. Use | to separate bars. No explanations or commentary.`;

const TEXT_NORMALIZE_PROMPT = `You are a music expert that normalizes chord chart text into a structured format. The user will paste raw chord chart text (from notes apps, messages, or AI output) which may use various formats like pipes, dashes, or free-form text.

Your job is to normalize it into this exact format:

CRITICAL OUTPUT FORMAT:
${METADATA_BLOCK}

OUTPUT RULES:
- Section headers: Start with "= " followed by section name (e.g., "= Intro", "= Verse", "= Chorus")
- Chords: Space-separated on each line (e.g., "Am F C G")
- Each line of chords represents one row of bars
- Remove all pipe characters |, replace with spaces
- Convert dash-separated chords to dot notation: Em-A -> Em . A .
- Convert (: ... :) or ||: ... :|| to ( ... )
- Convert triangle Δ/△ to maj7, degree ° to dim, ø to m7b5
- Navigation symbols on their own tokens
- Indonesian section names translated to English

Example input:
Let's Stay Together (Key: F, 94bpm)

Intro
| Gm9 | Am7 | Gm7 | Am7 |
| Gm9 | Am7 | Gm7 | Bb/C |

Verse
|: FΔ | FΔ | Am7 | Am7 |
| BbΔ | BbΔ | DbΔ | DbΔ |
| Am7 Gm7 | FΔ Em7 | Dm9 | D9 :|

Example output:
TITLE: Let's Stay Together
KEY: F
TEMPO: 94
TIME: 4/4
= Intro
| Gm9 | Am7 | Gm7 | Am7 |
| Gm9 | Am7 | Gm7 | Bb/C |

= Verse
(| Fmaj7 | Fmaj7 | Am7 | Am7 |
| Bbmaj7 | Bbmaj7 | Dbmaj7 | Dbmaj7 |
| Am7 . Gm7 . | Fmaj7 . Em7 . | Dm9 | D9 |)

IMPORTANT: Only return the structured chord text. Use | to separate bars. No explanations or commentary.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }


  try {
    const { imageBase64, mode, textContent } = await req.json();
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    
    if (!lovableApiKey && !googleApiKey) {
      console.error('No AI API key found');
      throw new Error('AI API key not configured');
    }

    const isTextMode = mode === 'text';
    const isHandwriting = mode === 'handwriting';
    
    let systemPrompt: string;
    if (isTextMode) {
      systemPrompt = TEXT_NORMALIZE_PROMPT;
    } else if (isHandwriting) {
      systemPrompt = HANDWRITING_PROMPT;
    } else {
      systemPrompt = PHOTO_PROMPT;
    }

    let userContent: any[];
    if (isTextMode) {
      userContent = [
        {
          type: 'text',
          text: `Please normalize this chord chart text into structured format:\n\n${textContent}`
        }
      ];
    } else {
      userContent = [
        {
          type: 'text',
           text: isHandwriting
            ? "Read this handwritten chord chart. Extract ALL chord names.\nCRITICAL RULES:\n1. If chords are written as NUMBERS (1, 2, 3, 4, 5, 6, 7) with a key like 'Do = E', convert ALL numbers to real chord names using that key. NEVER output raw numbers.\n2. Ignore musical notation (noteheads, stems, beams) -- focus ONLY on chord text.\n3. If two chords appear in one bar, output as split bar (e.g., 'E . G#m .').\n4. Navigation text like 'Fine', 'D.S. al Fine' MUST be on its own line.\n5. Modulation notes like 'modulasi +1' mean key change -- switch to new key for subsequent sections.\nOnly return chords, sections, and navigation markers."
            : "Read this chord chart image. Extract ALL chords from EVERY section, top to bottom.\nCRITICAL RULES:\n1. If chords are written as NUMBERS (1, 2, 3, 4, 5, 6, 7) with a key like 'Do = E', convert ALL numbers to real chord names. NEVER output raw numbers.\n2. Ignore musical notation (noteheads, stems, beams) -- focus ONLY on chord names.\n3. If two chords appear in one bar, output as split bar (e.g., 'E . G#m .').\n4. Navigation text like 'Fine', 'D.S. al Fine' MUST be on its own line.\nOnly return chords, sections, and navigation markers."
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ];
    }

    let apiUrl: string;
    let headers: Record<string, string>;
    let model: string;

    if (lovableApiKey) {
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      };
      model = 'google/gemini-2.5-flash';
    } else if (googleApiKey) {
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      headers = {
        'Authorization': `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json',
      };
      model = 'gemini-2.5-pro';
    } else {
      throw new Error('No AI API key configured');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
          retryAfter: 30
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'AI credits exhausted. Please add credits to continue.',
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (response.status === 503) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'AI service temporarily unavailable. Please try again in a moment.',
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      console.error('Invalid AI response:', data);
      throw new Error('Invalid response from AI');
    }

    const extractedText = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      success: true, 
      extractedText 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in analyze-chord-image:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
