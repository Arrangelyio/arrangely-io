import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
interface ChordSuggestionsProps {
  currentKey: string;
  onChordInsert: (chord: string) => void;
}
const ChordSuggestions = ({
  currentKey,
  onChordInsert
}: ChordSuggestionsProps) => {
  const getChordSuggestions = (key: string) => {
    const chordTypes = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'add9', 'dim'];
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = keys.indexOf(key);

    // Common chord progressions in the key
    const romanNumerals = [0, 2, 4, 5, 7, 9, 11]; // I, ii, iii, IV, V, vi, vii
    const baseChords = romanNumerals.map(interval => keys[(keyIndex + interval) % 12]);
    const suggestions = [];
    baseChords.forEach(chord => {
      chordTypes.forEach(type => {
        suggestions.push(chord + type);
      });
    });
    return suggestions;
  };
  const chordSuggestions = getChordSuggestions(currentKey);
  
  return (
    <div className="space-y-3">
      {/* Common chords in the key */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Common in {currentKey}</p>
        <div className="flex flex-wrap gap-1">
          {chordSuggestions.slice(0, 14).map((chord) => (
            <Button
              key={chord}
              variant="outline"
              size="sm"
              onClick={() => onChordInsert(chord)}
              className="h-8 px-3 text-xs font-mono"
            >
              {chord}
            </Button>
          ))}
        </div>
      </div>
      
      {/* All available chords */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">More Options</p>
        <div className="flex flex-wrap gap-1">
          {chordSuggestions.slice(14).map((chord) => (
            <Button
              key={chord}
              variant="ghost"
              size="sm"
              onClick={() => onChordInsert(chord)}
              className="h-7 px-2 text-xs font-mono"
            >
              {chord}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ChordSuggestions;