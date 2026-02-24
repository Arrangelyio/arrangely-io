
# Fix: Grid Apply Using Same Parser as Preview

## Problem
The preview in step 3 correctly shows 4 bars per line (using `TextModeConverter`), but when applied to the grid in step 4, each space and dot creates a separate bar (26 bars instead of the correct count). This is because step 4 uses a completely different parser (`handwritingToGrid`) that treats every space-separated token as its own bar.

## Solution
Replace the `parseAndPopulateFromOCR` function in `ChordGridGenerator.tsx` to use `TextModeConverter.textToSections()` -- the same parser the preview uses -- then map its output to the grid's bar format (splitting multi-chord bars into `chord` / `chordAfter` / `chordEnd` fields).

## What Changes

**File: `src/pages/ChordGridGenerator.tsx`** (function `parseAndPopulateFromOCR`, ~lines 3420-3508)

The new logic will:
1. Call `TextModeConverter.textToSections(rawOcrText)` to get correctly grouped bars (same as preview)
2. For each bar, parse the chord string (e.g., `"E . G#m ."`) into the grid format:
   - Filter out dots (`.`) which are beat placeholders
   - First chord goes to `chord`, second to `chordAfter`, third to `chordEnd`
   - If only one chord, the whole bar is that single chord
3. Handle comment-only bars (beats === 0) by preserving them
4. Map sections to the existing `ChordSection` type with proper IDs and positions

This ensures the preview and the grid always produce the same bar count and structure.

## Technical Details

```text
Current flow (broken):
  rawText --> handwritingToGrid() --> each token = 1 bar --> 26 bars

New flow (fixed):
  rawText --> TextModeConverter.textToSections() --> each |...| = 1 bar --> correct count
           --> map chord string to chord/chordAfter/chordEnd fields
```

No changes needed to the preview, the edge function, or `TextModeConverter` itself. Only the `parseAndPopulateFromOCR` function is rewritten.
