import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  publicationId: string;
  songId: string;
}

// ============= QUALITY VALIDATION HELPERS =============

// Valid keywords for instrumental sections (Intro, Interlude, Outro)
const VALID_INSTRUMENTAL_KEYWORDS = [
  'full band', 'drums', 'guitar', 'bass', 'piano', 'keys', 
  'solo', 'build', 'hold', 'modulation', 'synth', 'strings',
  'brass', 'melody', 'riff', 'loop', 'chanting', 'vocal',
  'acoustic', 'electric', 'fade', 'syncopation', 'tutti',
  'intro', 'outro', 'interlude', 'instrumental', 'r&b',
  'smooth', 'power', 'slow', 'fast', 'kick', 'drum',
  'strum', 'pick', 'arpeggio', 'fingerstyle', 'bar'
];

// Section type classifications
const LYRIC_SECTION_TYPES = ['verse', 'chorus', 'bridge', 'prechorus', 'pre-chorus'];
const INSTRUMENTAL_SECTION_TYPES = ['intro', 'interlude', 'outro', 'instrumental'];

/**
 * Detects if text is gibberish (spam, random typing, punctuation only)
 */
function isGibberish(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  
  const normalized = text.trim();
  
  // Only punctuation/symbols (catches ",,,,", "....", "!!!!")
  if (/^[\s,\.!@#\$%\^&\*\(\)\-_\+=\[\]\{\}\\|;:'"<>\/\?`~]+$/.test(normalized)) {
    return true;
  }
  
  // Keyboard spam patterns (catches "asdf", "qwerty", "dsadadasd")
  if (/^(asdf|qwer|zxcv|hjkl|uiop|dsad|dsa|asd|fgh|jkl)/i.test(normalized)) {
    return true;
  }
  
  // Repeated single character (5+ times, catches "aaaaaaa", "xxxxxxx")
  if (/^(.)\1{4,}$/.test(normalized)) {
    return true;
  }
  
  // Only consonants (5+ chars, no vowels = random typing indicator)
  if (/^[bcdfghjklmnpqrstvwxyz]{5,}$/i.test(normalized)) {
    return true;
  }
  
  // Very short test content patterns
  const lowerText = normalized.toLowerCase();
  if (['test', 'cek', 'ok', 'tes', 'asdf'].includes(lowerText)) {
    return true;
  }
  
  return false;
}

/**
 * Detects chords embedded in text (inline chord format above lyrics)
 * Returns true if at least 2 chord mentions are found
 */
function detectChordsInText(text: string): boolean {
  if (!text) return false;
  
  // Match common chord patterns: C, Am, F#m7, Bb, Gsus4, D/F#, Cmaj7, etc.
  const chordPattern = /\b[A-G][#b]?(m|maj|min|dim|aug|sus|add|M)?[0-9]*(\/[A-G][#b]?)?\b/g;
  const matches = text.match(chordPattern) || [];
  
  // Require at least 2 chord mentions to count as "has chords"
  return matches.length >= 2;
}

/**
 * Validates a lyric section (Verse, Chorus, Bridge, Pre-Chorus)
 */
function validateLyricSection(section: any): { valid: boolean; reason: string; error?: string } {
  const lyrics = (section.lyrics || '').trim();
  const chords = (section.chords || '').trim();
  const sectionName = section.name || section.section_type || 'Unknown';
  
  // Check for gibberish content
  if (isGibberish(lyrics)) {
    return { 
      valid: false, 
      reason: 'gibberish',
      error: `Section [${sectionName}] mengandung konten tidak valid (hanya simbol/karakter acak)`
    };
  }
  
  // Check minimum length (30 chars for meaningful lyrics)
  if (lyrics.length > 0 && lyrics.length < 30) {
    return { 
      valid: false, 
      reason: 'too_short',
      error: `Section [${sectionName}] terlalu pendek - minimal 30 karakter untuk section lirik`
    };
  }
  
  // Check for at least 3 actual words (not just punctuation)
  const words = lyrics.split(/\s+/).filter(w => /[a-zA-Z]/.test(w));
  if (lyrics.length > 0 && words.length < 3) {
    return { 
      valid: false, 
      reason: 'no_words',
      error: `Section [${sectionName}] harus memiliki minimal 3 kata yang bermakna`
    };
  }
  
  // Empty lyric section is also invalid
  if (lyrics.length === 0 && chords.length === 0) {
    return { 
      valid: false, 
      reason: 'empty',
      error: `Section [${sectionName}] kosong - tambahkan lirik dan chord`
    };
  }
  
  return { valid: true, reason: 'valid' };
}

/**
 * Validates an instrumental section (Intro, Interlude, Outro)
 * More flexible - accepts chords, descriptions, or empty (conditionally)
 */
function validateInstrumentalSection(section: any): { valid: boolean; reason: string; error?: string } {
  const lyrics = (section.lyrics || '').trim();
  const chords = (section.chords || '').trim();
  const sectionName = section.name || section.section_type || 'Unknown';
  
  // Check 1: Has chord notation in chords field (min 8 chars for meaningful notation like "| C . . . |")
  if (chords.length >= 8) {
    return { valid: true, reason: 'has_chords' };
  }
  
  // Check 2: Has chord notation in lyrics field
  if (detectChordsInText(lyrics)) {
    return { valid: true, reason: 'has_inline_chords' };
  }
  
  // Check 3: Has descriptive text with valid keywords
  const lyricsLower = lyrics.toLowerCase();
  const hasKeyword = VALID_INSTRUMENTAL_KEYWORDS.some(kw => lyricsLower.includes(kw));
  
  if (hasKeyword && lyrics.length >= 5) {
    return { valid: true, reason: 'has_description' };
  }
  
  // Check 4: Has minimal non-gibberish content
  if (!isGibberish(lyrics) && lyrics.length >= 5) {
    return { valid: true, reason: 'has_content' };
  }
  
  // Check 5: Reject if gibberish
  if (isGibberish(lyrics)) {
    return { 
      valid: false, 
      reason: 'gibberish',
      error: `Section [${sectionName}] mengandung konten tidak valid. Gunakan notasi chord atau deskripsi seperti "Full Band", "Guitar Solo", dll.`
    };
  }
  
  // Empty is conditionally OK - will be checked at song level
  return { valid: false, reason: 'empty_or_minimal' };
}

/**
 * Gets the base section type from section_type field
 */
function getBaseSectionType(sectionType: string): string {
  if (!sectionType) return 'unknown';
  // Handle section_type like "verse_1", "chorus_2", etc.
  return sectionType.toLowerCase().split('_')[0].replace(/[0-9]/g, '').trim();
}

/**
 * Truncates text and adds ellipsis if too long
 */
function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return '';
  const trimmed = text.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength) + '...';
}

/**
 * Validates overall song quality - orchestrates section validation
 */
function validateSongQuality(sections: any[]): { passed: boolean; error?: string; reason?: string; details?: any } {
  if (!sections || sections.length === 0) {
    return { 
      passed: false, 
      error: 'Lagu harus memiliki section yang didefinisikan',
      reason: 'no_sections'
    };
  }
  
  const lyricSections: any[] = [];
  const instrumentalSections: any[] = [];
  
  // Categorize sections
  sections.forEach(section => {
    const baseType = getBaseSectionType(section.section_type);
    if (LYRIC_SECTION_TYPES.includes(baseType)) {
      lyricSections.push(section);
    } else if (INSTRUMENTAL_SECTION_TYPES.includes(baseType)) {
      instrumentalSections.push(section);
    } else {
      // Default to lyric section for unknown types
      lyricSections.push(section);
    }
  });
  
  console.log('Quality validation:', {
    totalSections: sections.length,
    lyricSections: lyricSections.length,
    instrumentalSections: instrumentalSections.length
  });
  
  // Validate lyric sections (strict)
  const lyricValidationResults = lyricSections.map(s => ({
    section: s,
    result: validateLyricSection(s)
  }));
  
  const validLyricSections = lyricValidationResults.filter(r => r.result.valid);
  const invalidLyricSections = lyricValidationResults.filter(r => !r.result.valid);

  // Always include a short list of detected lyric sections (even when they are valid)
  // so users can see what the validator is reading.
  const detectedLyricSections = validLyricSections.slice(0, 3).map(r => {
    const sectionName = r.section.name || r.section.section_type || 'Unknown';
    const lyrics = (r.section.lyrics || '').trim();
    return {
      name: sectionName,
      preview: truncateText(lyrics, 40) || '(kosong)',
      charCount: lyrics.length,
    };
  });
  
  // Need at least 3 valid lyric sections
  if (validLyricSections.length < 3) {
    const firstError = invalidLyricSections[0]?.result.error;
    
    // Build detailed info about problematic sections (show up to 3)
    const problematicSections = invalidLyricSections.slice(0, 3).map(r => {
      const sectionName = r.section.name || r.section.section_type || 'Unknown';
      const lyrics = (r.section.lyrics || '').trim();
      const preview = truncateText(lyrics, 40);
      return {
        name: sectionName,
        issue: r.result.reason,
        preview: preview || '(kosong)',
        charCount: lyrics.length
      };
    });

    // Special case: user has <3 lyric sections total but none are "invalid"
    // (e.g. only 1-2 lyric sections exist). In this case, show what we detected as valid
    // and leave problematicSections empty (since the valid ones aren't actually problematic).
    const isCountProblemOnly = invalidLyricSections.length === 0;
    const countOnlyError = languageSafeId(
      `Saat ini terdeteksi hanya ${validLyricSections.length} section lirik. Tambahkan minimal 3 section lirik (Verse/Chorus/Bridge/Pre-Chorus) yang berisi lirik (≥30 karakter, ≥3 kata).`
    );
    
    return { 
      passed: false, 
      error: firstError || (isCountProblemOnly ? countOnlyError : 'Minimal 3 section lirik (verse/chorus/bridge) harus memiliki konten yang lengkap'),
      reason: 'insufficient_lyric_sections',
      details: {
        validCount: validLyricSections.length,
        required: 3,
        totalLyricSections: lyricSections.length,
        issues: invalidLyricSections.map(r => r.result.error).filter(Boolean),
        // Only show problematic sections if there actually are invalid ones
        // Don't show valid sections as "problematic" - that's confusing
        problematicSections: problematicSections,
        detectedLyricSections,
        hint: isCountProblemOnly
          ? 'Tambahkan section lirik baru (Verse/Chorus/Bridge/Pre-Chorus), lalu isi liriknya. Setelah itu submit ulang.'
          : 'Periksa section di atas dan pastikan memiliki lirik minimal 30 karakter dengan chord'
      }
    };
  }
  
  // Validate instrumental sections (flexible)
  const instrumentalValidationResults = instrumentalSections.map(s => ({
    section: s,
    result: validateInstrumentalSection(s)
  }));
  
  // Only fail if instrumental has gibberish content
  const gibberishInstrumentals = instrumentalValidationResults.filter(
    r => r.result.reason === 'gibberish'
  );
  
  if (gibberishInstrumentals.length > 0) {
    const problematicSections = gibberishInstrumentals.slice(0, 3).map(r => {
      const sectionName = r.section.name || r.section.section_type || 'Unknown';
      const lyrics = (r.section.lyrics || '').trim();
      return {
        name: sectionName,
        preview: truncateText(lyrics, 40) || '(tidak valid)',
        issue: 'gibberish'
      };
    });
    
    const names = gibberishInstrumentals.map(r => r.section.name || r.section.section_type).join(', ');
    return { 
      passed: false, 
      error: `Section instrumental (${names}) mengandung konten tidak valid. Gunakan notasi chord atau deskripsi seperti "Full Band", "Guitar Solo", dll.`,
      reason: 'invalid_instrumental_content',
      details: {
        invalidSections: names,
        problematicSections: problematicSections,
        hint: 'Gunakan chord notation seperti "| C . . . |" atau deskripsi seperti "Full Band", "Build Up"'
      }
    };
  }
  
  return { 
    passed: true,
    details: {
      validLyricSections: validLyricSections.length,
      validInstrumentalSections: instrumentalValidationResults.filter(r => r.result.valid).length
    }
  };
}

/**
 * Deno edge: keep helper to avoid accidental undefined / non-string issues in messages.
 */
function languageSafeId(text: string): string {
  return (text || '').toString();
}

/**
 * Validates chord coverage across the song
 * Requires at least 3 sections to have chord annotations
 */
function validateChordCoverage(sections: any[]): { passed: boolean; error?: string; reason?: string; details?: any } {
  if (!sections || sections.length === 0) {
    return { passed: false, error: 'Tidak ada section untuk divalidasi chord', reason: 'no_sections' };
  }
  
  // Categorize and check each section
  const sectionAnalysis = sections.map(section => {
    const lyrics = (section.lyrics || '').trim();
    const chords = (section.chords || '').trim();
    const sectionName = section.name || section.section_type || 'Unknown';
    
    // Has chords in dedicated chords field (min 5 chars for meaningful content)
    const hasChordsField = chords.length >= 5;
    
    // Has inline chords in lyrics
    const hasInlineChords = detectChordsInText(lyrics);
    
    return {
      name: sectionName,
      hasChords: hasChordsField || hasInlineChords,
      preview: truncateText(lyrics, 30) || truncateText(chords, 30) || '(kosong)'
    };
  });
  
  const sectionsWithChords = sectionAnalysis.filter(s => s.hasChords);
  const sectionsWithoutChords = sectionAnalysis.filter(s => !s.hasChords);
  const chordCount = sectionsWithChords.length;
  
  console.log('Chord validation:', {
    totalSections: sections.length,
    sectionsWithChords: chordCount,
    sectionNames: sectionsWithChords.map(s => s.name)
  });
  
  // Require minimum 3 sections with chords
  if (chordCount < 3) {
    // Show sections missing chords (up to 3)
    const missingSections = sectionsWithoutChords.slice(0, 3).map(s => ({
      name: s.name,
      preview: s.preview
    }));
    
    return { 
      passed: false, 
      error: 'Minimal 3 section harus memiliki chord (di lirik atau field chord). Tambahkan chord di atas lirik pada verse/chorus.',
      reason: 'insufficient_chords',
      details: {
        sectionsWithChords: chordCount,
        required: 3,
        sectionsFound: sectionsWithChords.map(s => s.name),
        sectionsWithoutChords: missingSections,
        hint: 'Section berikut belum memiliki chord yang terdeteksi. Tambahkan chord di atas lirik.'
      }
    };
  }
  
  return { 
    passed: true,
    details: {
      sectionsWithChords: chordCount,
      coverage: `${chordCount}/${sections.length}`
    }
  };
}

// ============= END QUALITY VALIDATION HELPERS =============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { publicationId, songId } = await req.json() as ValidationRequest;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get song data with sections and arrangements
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('*, song_sections(*), arrangements(*)')
      .eq('id', songId)
      .single();

    if (songError || !song) {
      throw new Error('Song not found');
    }

    const validationResults: Record<string, any> = {};
    let allPassed = true;
    let hasFlags = false;

    console.log('=== Starting FULL validation for song:', songId, '===');
    console.log('Publication ID:', publicationId);
    console.log('Song title:', song.title);
    console.log('Sections count:', song.song_sections?.length || 0);
    console.log('Arrangements count:', song.arrangements?.length || 0);

    // 1. YouTube Validation
    const youtubeResult = await validateYoutube(song.youtube_link);
    await updateValidationQueue(supabase, publicationId, 'youtube', youtubeResult);
    validationResults.youtube = youtubeResult;
    if (!youtubeResult.passed) allPassed = false;

    // Build sections used in arrangement (Step 3) for validation
    // This is more accurate than using raw song_sections (Step 2) because:
    // - A song may have 3 sections in Step 2 but use them 6+ times in arrangement
    // - Validation should check what the user actually arranged, not just defined
    const sectionMap = new Map((song.song_sections || []).map((s: any) => [s.id, s]));
    const sectionsInArrangement = (song.arrangements || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((arr: any) => sectionMap.get(arr.section_id))
      .filter(Boolean);
    
    console.log('Sections in arrangement (Step 3):', sectionsInArrangement.length);
    console.log('Unique sections defined (Step 2):', song.song_sections?.length || 0);

    // 2. Sections Validation (checks for duplicates and unique content)
    // Still use song_sections for duplicate detection (checks defined content quality)
    const sectionsResult = validateSections(song.song_sections || []);
    await updateValidationQueue(supabase, publicationId, 'sections', sectionsResult);
    validationResults.sections = sectionsResult;
    if (!sectionsResult.passed) allPassed = false;

    // 2b. Arrangement Validation (min 4 sections in arrangement - uses Step 3 count)
    const arrangementResult = validateArrangement(song.arrangements || [], song.song_sections || []);
    await updateValidationQueue(supabase, publicationId, 'arrangement', arrangementResult);
    validationResults.arrangement = arrangementResult;
    if (!arrangementResult.passed) allPassed = false;

    // 3. Quality Validation - uses sections from arrangement (Step 3)
    // This validates the actual arranged content, allowing section reuse
    const qualityResult = validateSongQuality(sectionsInArrangement);
    await updateValidationQueue(supabase, publicationId, 'quality', qualityResult);
    validationResults.quality = qualityResult;
    if (!qualityResult.passed) allPassed = false;

    // 4. Chord Coverage Validation - uses sections from arrangement (Step 3)
    const chordsResult = validateChordCoverage(sectionsInArrangement);
    await updateValidationQueue(supabase, publicationId, 'chords', chordsResult);
    validationResults.chords = chordsResult;
    if (!chordsResult.passed) allPassed = false;

    // 5. Content Moderation (flags for manual review)
    const contentResult = await validateContent(song, song.song_sections || []);
    await updateValidationQueue(supabase, publicationId, 'content', contentResult);
    validationResults.content = contentResult;
    if (!contentResult.passed) allPassed = false;
    if (contentResult.flagged || contentResult.needsManualReview) hasFlags = true;

    // If validation fails, auto-reject so users can see reasons and fix
    // If validation passes, set to active (auto-approved)
    const newStatus = allPassed ? 'active' : 'rejected';
    const rejectedReason = !allPassed ? determineRejectionReason(validationResults) : null;

    await supabase
      .from('creator_pro_publications')
      .update({
        status: newStatus,
        validation_results: validationResults,
        rejected_reason: rejectedReason,
        review_notes: hasFlags ? 'Content flagged for manual review' : null,
        published_at: allPassed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', publicationId);

    // If validation passed, set song to public
    if (allPassed) {
      await supabase
        .from('songs')
        .update({ is_public: true })
        .eq('id', songId);
    }

    

    return new Response(
      JSON.stringify({ 
        success: true, 
        allPassed,
        hasFlags,
        status: newStatus,
        message: allPassed 
          ? 'Your song has been submitted for review. An admin will review it shortly.'
          : 'Validation failed. Please check the issues below and resubmit after fixing them.',
        validationResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function validateYoutube(youtubeLink: string | null) {
  if (!youtubeLink) {
    return { passed: false, error: 'No YouTube link provided', reason: 'invalid_youtube' };
  }

  // Extract video ID
  const videoIdMatch = youtubeLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoIdMatch) {
    return { passed: false, error: 'Invalid YouTube URL format', reason: 'invalid_youtube' };
  }

  const videoId = videoIdMatch[1];
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

  try {
    // First check basic accessibility via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await fetch(oembedUrl);
    
    if (!oembedResponse.ok) {
      return { passed: false, error: 'YouTube video not accessible', reason: 'invalid_youtube' };
    }

    const oembedData = await oembedResponse.json();

    // If no API key, skip category check but warn
    if (!youtubeApiKey) {
      console.warn('YOUTUBE_API_KEY not configured, skipping category validation');
      return { 
        passed: true, 
        videoId,
        title: oembedData.title,
        author: oembedData.author_name,
        categoryChecked: false
      };
    }

    // Use YouTube Data API to verify Music category (ID: 10)
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      console.error('YouTube API error:', await apiResponse.text());
      // Fall back to oEmbed result if API fails
      return { 
        passed: true, 
        videoId,
        title: oembedData.title,
        author: oembedData.author_name,
        categoryChecked: false,
        apiError: 'YouTube API unavailable'
      };
    }

    const apiData = await apiResponse.json();
    
    if (!apiData.items || apiData.items.length === 0) {
      return { passed: false, error: 'Video not found via YouTube API', reason: 'invalid_youtube' };
    }

    const videoSnippet = apiData.items[0].snippet;
    const categoryId = videoSnippet.categoryId;
    
    // Allowed YouTube categories for music content:
    // - 10: Music (official music category)
    // - 24: Entertainment (official MVs, live shows, artist channels)
    // - 22: People & Blogs (covers, acoustic sessions, home performances)
    // - 1: Film & Animation (animated MVs, lyric videos, soundtracks)
    const ALLOWED_CATEGORY_IDS = ['1', '10', '22', '24'];
    const CATEGORY_NAMES: Record<string, string> = {
      '1': 'Film & Animation',
      '10': 'Music',
      '22': 'People & Blogs',
      '24': 'Entertainment'
    };

    if (!ALLOWED_CATEGORY_IDS.includes(categoryId)) {
      const allowedNames = ALLOWED_CATEGORY_IDS.map(id => CATEGORY_NAMES[id]).join(', ');
      return { 
        passed: false, 
        error: `Video harus dalam kategori musik yang valid (${allowedNames}). Kategori saat ini tidak diizinkan: ID ${categoryId}`,
        reason: 'invalid_youtube',
        videoId,
        categoryId,
        allowedCategories: ALLOWED_CATEGORY_IDS,
        allowedCategoryNames: allowedNames
      };
    }

    return { 
      passed: true, 
      videoId,
      title: videoSnippet.title,
      author: videoSnippet.channelTitle,
      categoryId,
      categoryChecked: true
    };
  } catch (error) {
    console.error('YouTube validation error:', error);
    return { passed: false, error: 'Failed to validate YouTube link', reason: 'invalid_youtube' };
  }
}

function validateSections(sections: any[]) {
  if (!sections || sections.length === 0) {
    return { 
      passed: false, 
      error: 'Song must have sections defined',
      reason: 'incomplete_sections',
      sectionCount: 0
    };
  }

  const invalidSections = sections.filter(s => !s.name || s.name.trim() === '' || s.name === 'Untitled');
  if (invalidSections.length > 0) {
    return { 
      passed: false, 
      error: 'All sections must have valid names',
      reason: 'incomplete_sections',
      invalidCount: invalidSections.length
    };
  }

  // ========== ENHANCED DUPLICATE DETECTION ==========
  // Key insight: In music arrangements, it's NORMAL to have:
  // 1. Chorus 1, Chorus 2, Chorus 3 with SAME lyrics (repetition in arrangement)
  // 2. Same lyrics but DIFFERENT chords (key modulation)
  // 3. Same section used multiple times via arrangements table
  //
  // We only flag as problematic:
  // 1. Cross-type duplicates (e.g., Verse and Chorus with identical content = copy-paste error)
  // 2. Songs with NO unique content at all
  
  interface SectionInfo {
    name: string;
    baseType: string;
    lyrics: string;
    chords: string;
    lyricsSignature: string;
    fullSignature: string;
  }
  
  const sectionInfos: SectionInfo[] = sections.map(section => {
    const baseType = getBaseSectionType(section.section_type || section.name || '');
    const lyrics = (section.lyrics || '').trim().toLowerCase();
    const chords = (section.chords || '').trim().toLowerCase();
    return {
      name: section.name || section.section_type || 'Unknown',
      baseType,
      lyrics,
      chords,
      lyricsSignature: lyrics,
      fullSignature: `${lyrics}|||${chords}`
    };
  });
  
  // Group by base type (chorus, verse, bridge, etc.)
  const sectionsByBaseType = new Map<string, SectionInfo[]>();
  sectionInfos.forEach(info => {
    if (!sectionsByBaseType.has(info.baseType)) {
      sectionsByBaseType.set(info.baseType, []);
    }
    sectionsByBaseType.get(info.baseType)!.push(info);
  });
  
  // Track lyrics-only signatures to detect key modulation (same lyrics, different chords)
  const lyricSignatureToChords = new Map<string, Set<string>>();
  sectionInfos.forEach(info => {
    if (info.lyrics.length > 0) {
      if (!lyricSignatureToChords.has(info.lyricsSignature)) {
        lyricSignatureToChords.set(info.lyricsSignature, new Set());
      }
      lyricSignatureToChords.get(info.lyricsSignature)!.add(info.chords);
    }
  });
  
  // Track full signatures (lyrics + chords) to base types
  const fullSignatureToBaseTypes = new Map<string, Set<string>>();
  sectionInfos.forEach(info => {
    if (info.lyrics.length > 0 || info.chords.length > 0) {
      if (!fullSignatureToBaseTypes.has(info.fullSignature)) {
        fullSignatureToBaseTypes.set(info.fullSignature, new Set());
      }
      fullSignatureToBaseTypes.get(info.fullSignature)!.add(info.baseType);
    }
  });
  
  // Identify cross-type duplicates (same content across DIFFERENT base types)
  // This is the ONLY problematic case we should flag
  const crossTypeDuplicates: { signature: string; baseTypes: string[]; sections: string[] }[] = [];
  
  fullSignatureToBaseTypes.forEach((baseTypes, signature) => {
    if (baseTypes.size > 1) {
      // Same content appears in different section types (e.g., Verse and Chorus)
      const affectedSections = sectionInfos
        .filter(s => s.fullSignature === signature)
        .map(s => s.name);
      crossTypeDuplicates.push({
        signature,
        baseTypes: Array.from(baseTypes),
        sections: affectedSections
      });
    }
  });
  
  // Calculate unique content signatures (regardless of base type)
  const uniqueFullSignatures = new Set(
    sectionInfos
      .filter(s => s.lyrics.length > 0 || s.chords.length > 0)
      .map(s => s.fullSignature)
  );
  
  // Count sections with key modulation (same lyrics, different chords) - this is GOOD
  const keyModulationCount = Array.from(lyricSignatureToChords.values())
    .filter(chordsSet => chordsSet.size > 1)
    .length;
  
  console.log('Section validation (enhanced):', {
    totalSections: sections.length,
    uniqueSignatures: uniqueFullSignatures.size,
    crossTypeDuplicates: crossTypeDuplicates.length,
    keyModulationDetected: keyModulationCount,
    baseTypes: Array.from(sectionsByBaseType.keys())
  });
  
  // FAILURE CONDITIONS:
  // 1. More than 70% cross-type duplicates (clearly copy-paste errors)
  // 2. No unique content at all (every section is identical)
  
  const crossTypeDuplicateCount = crossTypeDuplicates.reduce((acc, d) => acc + d.sections.length, 0);
  const sectionsWithContent = sectionInfos.filter(s => s.lyrics.length > 0 || s.chords.length > 0);
  const crossTypeDuplicateRatio = sectionsWithContent.length > 0 
    ? crossTypeDuplicateCount / sectionsWithContent.length 
    : 0;
  
  // Only fail if cross-type duplicates are problematic
  if (crossTypeDuplicateRatio > 0.7 && crossTypeDuplicates.length > 0) {
    return { 
      passed: false, 
      error: 'Terlalu banyak section dengan konten yang sama di tipe berbeda. Pastikan Verse dan Chorus memiliki konten yang berbeda.',
      reason: 'cross_type_duplicates',
      sectionCount: sections.length,
      uniqueSignatures: uniqueFullSignatures.size,
      crossTypeDuplicates: crossTypeDuplicates.map(d => ({
        sections: d.sections.join(', '),
        baseTypes: d.baseTypes.join(' & ')
      })),
      hint: 'Section dengan tipe berbeda (misal Verse dan Chorus) harus memiliki lirik yang berbeda'
    };
  }
  
  // Fail if absolutely no unique content exists
  if (uniqueFullSignatures.size === 0 && sections.length > 0) {
    return { 
      passed: false, 
      error: 'Semua section kosong atau tidak memiliki konten unik',
      reason: 'no_unique_content',
      sectionCount: sections.length
    };
  }
  
  // Fail if only 1 unique signature but many sections (all sections have same content)
  if (uniqueFullSignatures.size === 1 && sections.length >= 4) {
    return { 
      passed: false, 
      error: 'Semua section memiliki konten yang persis sama. Pastikan ada variasi antara Verse, Chorus, dan Bridge.',
      reason: 'no_content_variety',
      sectionCount: sections.length,
      uniqueSignatures: uniqueFullSignatures.size
    };
  }

  // Build warning for same-type duplicates (not an error, just info)
  const sameTypeDuplicateInfo: string[] = [];
  sectionsByBaseType.forEach((sectionsInType, baseType) => {
    if (sectionsInType.length > 1) {
      const signatures = new Set(sectionsInType.map(s => s.fullSignature));
      if (signatures.size < sectionsInType.length) {
        // Some sections in this type share the same content (normal for Chorus 1, Chorus 2, etc.)
        sameTypeDuplicateInfo.push(`${baseType}: ${sectionsInType.length} sections`);
      }
    }
  });

  return { 
    passed: true, 
    sectionCount: sections.length,
    uniqueSignatures: uniqueFullSignatures.size,
    sections: sections.map(s => s.name),
    keyModulationDetected: keyModulationCount > 0,
    // Info only - not an error
    sameTypeInfo: sameTypeDuplicateInfo.length > 0 ? sameTypeDuplicateInfo : null,
    crossTypeDuplicateWarning: crossTypeDuplicates.length > 0 && crossTypeDuplicateRatio <= 0.7
      ? crossTypeDuplicates.map(d => `${d.sections.join(', ')} (${d.baseTypes.join(' & ')})`)
      : null
  };
}

function validateArrangement(arrangements: any[], sections: any[]) {
  if (!arrangements || arrangements.length < 4) {
    return { 
      passed: false, 
      error: 'Arrangement must have at least 4 sections. Please add more sections to your arrangement.',
      reason: 'insufficient_arrangement',
      arrangementCount: arrangements?.length || 0,
      required: 4
    };
  }

  // Count unique sections used in arrangement
  const uniqueSectionIds = new Set(arrangements.map(a => a.section_id));
  
  // Get section names for the unique sections
  const sectionMap = new Map(sections.map(s => [s.id, s.name]));
  const usedSections = Array.from(uniqueSectionIds).map(id => sectionMap.get(id) || 'Unknown');

  return { 
    passed: true, 
    arrangementCount: arrangements.length,
    uniqueSectionsUsed: uniqueSectionIds.size,
    sectionsInArrangement: usedSections
  };
}

async function validateContent(song: any, sections: any[]) {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  
  // Gather all content to analyze
  const contentToCheck = [
    `Title: ${song.title || ''}`,
    `Artist: ${song.artist || ''}`,
    ...sections.map(s => `Lyrics: ${s.lyrics || ''}`).filter(l => l !== 'Lyrics: ')
  ].join('\n');

  // If no meaningful content, pass
  if (contentToCheck.trim().length < 10) {
    return { passed: true, flagged: false, reason: 'no_content_to_check' };
  }

  // Priority 1: Use Lovable AI Gateway (for Lovable Cloud / Staging)
  if (lovableApiKey) {
    console.log('Using Lovable AI Gateway for content moderation');
    return await validateContentWithLovableAI(contentToCheck, lovableApiKey);
  }

  // Priority 2: Use Google AI directly (for Production / External Supabase)
  if (googleApiKey) {
    console.log('Using Google AI directly for content moderation');
    return await validateContentWithGoogleAI(contentToCheck, googleApiKey);
  }

  // Priority 3: Fallback to basic keyword check if no API key
  console.warn('No AI API key configured (LOVABLE_API_KEY or GOOGLE_AI_API_KEY), using basic keyword filter');
  return validateContentBasic(contentToCheck);
}

/**
 * Content moderation using Lovable AI Gateway (Staging/Lovable Cloud)
 */
async function validateContentWithLovableAI(contentToCheck: string, apiKey: string) {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: getContentModerationSystemPrompt()
          },
          {
            role: 'user',
            content: `Analyze this song content for moderation:\n\n${contentToCheck}`
          }
        ],
        tools: [getContentModerationTool()],
        tool_choice: { type: 'function', function: { name: 'content_moderation_result' } }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI moderation API error:', response.status, errorText);
      
      if (response.status === 429 || response.status === 402) {
        console.warn('AI rate limited, falling back to basic filter');
      }
      return validateContentBasic(contentToCheck);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in Lovable AI response, falling back to basic filter');
      return validateContentBasic(contentToCheck);
    }

    const result = JSON.parse(toolCall.function.arguments);
    return processAIModerationResult(result, 'lovable');

  } catch (error) {
    console.error('Lovable AI moderation error:', error);
    return validateContentBasic(contentToCheck);
  }
}

/**
 * Content moderation using Google AI directly (Production/External Supabase)
 */
async function validateContentWithGoogleAI(contentToCheck: string, apiKey: string) {
  try {
    const systemPrompt = getContentModerationSystemPrompt();
    const userPrompt = `Analyze this song content for moderation:\n\n${contentToCheck}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemPrompt}\n\n${userPrompt}\n\nRespond with a JSON object containing:
- is_appropriate: boolean (true if content is appropriate)
- confidence: number (0-100)
- violations: array of objects with category (sara|hate_speech|sexual_content|profanity|violence|drugs), severity (low|medium|high), and description
- summary: string (brief summary of the moderation decision)

Return ONLY the JSON object, no other text.`
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google AI moderation API error:', response.status, errorText);
      return validateContentBasic(contentToCheck);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      console.error('No response text from Google AI, falling back to basic filter');
      return validateContentBasic(contentToCheck);
    }

    const result = JSON.parse(responseText);
    return processAIModerationResult(result, 'google');

  } catch (error) {
    console.error('Google AI moderation error:', error);
    return validateContentBasic(contentToCheck);
  }
}

/**
 * Returns the system prompt for content moderation
 */
function getContentModerationSystemPrompt(): string {
  return `You are a content moderation system for a music arrangement platform. Analyze song content for:
1. SARA violations (Suku/ethnicity, Agama/religion, Ras/race, Antar-golongan/inter-group discrimination)
2. Hate speech or discriminatory language
3. Explicit sexual content or pornographic references
4. Excessive profanity or vulgar language (mild expressions in artistic context are acceptable)
5. Violence glorification or threats
6. Drug abuse promotion

Context: This is song lyrics/music content. Artistic expression and metaphors should be considered. Focus on content that would be genuinely harmful or offensive to a general audience in Indonesia.`;
}

/**
 * Returns the tool definition for content moderation (used by Lovable AI Gateway)
 */
function getContentModerationTool() {
  return {
    type: 'function',
    function: {
      name: 'content_moderation_result',
      description: 'Return the content moderation analysis result',
      parameters: {
        type: 'object',
        properties: {
          is_appropriate: {
            type: 'boolean',
            description: 'True if content is appropriate for the platform'
          },
          confidence: {
            type: 'number',
            description: 'Confidence score 0-100'
          },
          violations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['sara', 'hate_speech', 'sexual_content', 'profanity', 'violence', 'drugs']
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                },
                description: {
                  type: 'string',
                  description: 'Brief description of the violation'
                }
              },
              required: ['category', 'severity', 'description']
            }
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the moderation decision'
          }
        },
        required: ['is_appropriate', 'confidence', 'violations', 'summary']
      }
    }
  };
}

/**
 * Process AI moderation result (shared logic for both providers)
 */
function processAIModerationResult(result: any, provider: string) {
  const highSeverityViolations = result.violations?.filter((v: any) => v.severity === 'high') || [];
  const mediumSeverityViolations = result.violations?.filter((v: any) => v.severity === 'medium') || [];
  const lowSeverityViolations = result.violations?.filter((v: any) => v.severity === 'low') || [];
  const allViolations = result.violations || [];

  console.log(`AI Moderation Result (${provider}):`, {
    confidence: result.confidence,
    totalViolations: allViolations.length,
    high: highSeverityViolations.length,
    medium: mediumSeverityViolations.length,
    low: lowSeverityViolations.length,
    summary: result.summary
  });

  // STRICTER POLICY: Reject if ANY violation is detected
  if (allViolations.length > 0) {
    const severityMessage = highSeverityViolations.length > 0 
      ? 'severe content violations' 
      : mediumSeverityViolations.length > 0 
        ? 'content policy violations'
        : 'inappropriate content detected';
        
    return {
      passed: false,
      error: result.summary || `Content rejected: ${severityMessage}`,
      reason: 'content_violation',
      flagged: true,
      aiModeration: true,
      aiProvider: provider,
      confidence: result.confidence,
      violations: result.violations,
      violationSummary: {
        high: highSeverityViolations.length,
        medium: mediumSeverityViolations.length,
        low: lowSeverityViolations.length
      }
    };
  }

  // Content passed - no violations
  return {
    passed: true,
    flagged: false,
    aiModeration: true,
    aiProvider: provider,
    confidence: result.confidence,
    summary: result.summary || 'Content approved - no violations detected',
    violations: []
  };
}

function validateContentBasic(content: string) {
  // Fallback keyword blocklist for SARA/inappropriate content
  const blocklist = [
    // Indonesian inappropriate words
    'anjing', 'babi', 'bangsat', 'bajingan', 'kampret', 'kontol', 'memek', 'ngentot',
    'pepek', 'tolol', 'goblok', 'bodoh', 'idiot', 'brengsek',
    // English inappropriate words
    'fuck', 'shit', 'bitch', 'bastard',
    // SARA keywords
    'rasis', 'racist', 'kafir', 'infidel'
  ];

  const lowerContent = content.toLowerCase();
  const foundWords = blocklist.filter(word => lowerContent.includes(word));

  if (foundWords.length > 0) {
    return {
      passed: false,
      error: 'Content contains inappropriate words',
      reason: 'content_violation',
      flagged: true,
      aiModeration: false,
      basicFilter: true
    };
  }

  return { passed: true, flagged: false, aiModeration: false };
}

async function updateValidationQueue(
  supabase: any, 
  publicationId: string, 
  validationType: string, 
  result: any
) {
  await supabase
    .from('content_validation_queue')
    .update({
      status: result.passed ? 'passed' : 'failed',
      result,
      error_message: result.error || null,
      completed_at: new Date().toISOString()
    })
    .eq('publication_id', publicationId)
    .eq('validation_type', validationType);
}

function determineRejectionReason(results: Record<string, any>): string {
  if (!results.content?.passed) return 'content_violation';
  if (!results.youtube?.passed) return 'invalid_youtube';
  if (!results.sections?.passed) return results.sections?.reason || 'incomplete_sections';
  if (!results.arrangement?.passed) return 'insufficient_arrangement';
  if (!results.quality?.passed) return results.quality?.reason || 'quality_standards';
  if (!results.chords?.passed) return 'insufficient_chords';
  return 'other';
}
