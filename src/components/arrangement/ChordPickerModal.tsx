import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ChordPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChordSelect: (chord: string) => void;
  currentKey: string;
  selectedWord?: string;
}

const ChordPickerModal = ({ isOpen, onClose, onChordSelect, currentKey, selectedWord }: ChordPickerModalProps) => {
  const [customChord, setCustomChord] = useState("");

  const getChordSuggestions = (key: string) => {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = keys.indexOf(key);
    
    // Common chord progressions in the key
    const romanNumerals = [0, 2, 4, 5, 7, 9, 11]; // I, ii, iii, IV, V, vi, vii
    const baseChords = romanNumerals.map(interval => keys[(keyIndex + interval) % 12]);
    
    return {
      major: baseChords.slice(0, 7),
      minor: baseChords.map(chord => chord + 'm'),
      seventh: baseChords.map(chord => chord + '7'),
      slash: [
        'E/F#', 'F/G', 'E/B', 'F#/D', 'G/F#', 'A/E', 'B/F#', 'C/E', 'D/F#'
      ],
      extended: [
        ...baseChords.map(chord => chord + 'maj7'),
        ...baseChords.map(chord => chord + 'sus4'),
        ...baseChords.map(chord => chord + 'add9'),
        ...baseChords.map(chord => chord + 'sus2')
      ]
    };
  };

  const chordSuggestions = getChordSuggestions(currentKey);

  const handleChordSelect = (chord: string) => {
    onChordSelect(chord);
    onClose();
    setCustomChord("");
  };

  const handleCustomChordAdd = () => {
    if (customChord.trim()) {
      handleChordSelect(customChord.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Chord</DialogTitle>
          {selectedWord && (
            <p className="text-sm text-muted-foreground">
              Adding chord above: "{selectedWord}"
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Custom chord input */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. G/C, Dm7, Cadd9..."
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomChordAdd()}
            />
            <Button onClick={handleCustomChordAdd} disabled={!customChord.trim()}>
              Add
            </Button>
          </div>

          {/* Major Chords */}
          <div>
            <p className="text-sm font-medium mb-2">Major Chords</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.major.map((chord) => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordSelect(chord)}
                  className="h-8 px-3"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          {/* Minor Chords */}
          <div>
            <p className="text-sm font-medium mb-2">Minor Chords</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.minor.map((chord) => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordSelect(chord)}
                  className="h-8 px-3"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          {/* Slash Chords */}
          <div>
            <p className="text-sm font-medium mb-2">Slash Chords (e.g., G/C)</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.slash.map((chord) => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordSelect(chord)}
                  className="h-8 px-3"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          {/* 7th & Extended */}
          <div>
            <p className="text-sm font-medium mb-2">7th & Extended</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.extended.slice(0, 12).map((chord) => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordSelect(chord)}
                  className="h-8 px-3"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          {/* Sus & Add Chords */}
          <div>
            <p className="text-sm font-medium mb-2">Sus & Add Chords</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.extended.slice(12).map((chord) => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordSelect(chord)}
                  className="h-8 px-3"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            💡 Tip: Type manually above or click any chord to place it above your selected word
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChordPickerModal;