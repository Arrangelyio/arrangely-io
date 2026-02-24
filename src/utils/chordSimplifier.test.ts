import { describe, it, expect } from "vitest";
import { simplifyChord } from "./chordSimplifier";

describe("simplifyChord", () => {
  // Major extensions stripped
  it.each([
    ["Cmaj7", "C"],
    ["C7", "C"],
    ["C9", "C"],
    ["C11", "C"],
    ["C13", "C"],
    ["C6", "C"],
    ["Cmaj9", "C"],
  ])("simplifies major %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Minor extensions stripped
  it.each([
    ["Cm7", "Cm"],
    ["Cm9", "Cm"],
    ["Cm11", "Cm"],
    ["Cm6", "Cm"],
    ["Cmin7", "Cm"],
  ])("simplifies minor %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Diminished preserved
  it.each([
    ["Cdim7", "Cdim"],
    ["Cdim", "Cdim"],
  ])("simplifies dim %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Augmented preserved
  it.each([
    ["Caug7", "Caug"],
    ["Caug", "Caug"],
    ["C+", "Caug"],
  ])("simplifies aug %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Suspensions become major
  it.each([
    ["Csus2", "C"],
    ["Csus4", "C"],
  ])("simplifies sus %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Additions stripped
  it.each([
    ["Cadd9", "C"],
    ["Cadd11", "C"],
  ])("simplifies add %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Slash chords
  it.each([
    ["C/G", "C"],
    ["C/E", "C"],
    ["Cm7/G", "Cm"],
  ])("simplifies slash %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Accidentals preserved
  it.each([
    ["F#m7", "F#m"],
    ["Bb7", "Bb"],
    ["Ebmaj7", "Eb"],
    ["G#dim7", "G#dim"],
  ])("handles accidentals %s to %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });

  // Special symbols unchanged
  it.each(["WR", "HR", "QR", "ER", ".", "%", "/", "N", ""])
    ("returns special symbol %s unchanged", (input) => {
      expect(simplifyChord(input)).toBe(input);
    });

  // Simple chords stay the same
  it.each([
    ["C", "C"],
    ["Am", "Am"],
    ["G", "G"],
    ["F#m", "F#m"],
  ])("keeps simple chord %s as %s", (input, expected) => {
    expect(simplifyChord(input)).toBe(expected);
  });
});
