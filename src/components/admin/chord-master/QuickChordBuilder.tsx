import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap } from "lucide-react";

interface QuickChordBuilderProps {
  onChordCreate: (chordName: string) => void;
}

const COMMON_QUALITIES = [
  { symbol: "", name: "Major", example: "C" },
  { symbol: "m", name: "Minor", example: "Cm" },
  { symbol: "7", name: "Dominant 7th", example: "C7" },
  { symbol: "maj7", name: "Major 7th", example: "Cmaj7" },
  { symbol: "m7", name: "Minor 7th", example: "Cm7" },
  { symbol: "sus4", name: "Suspended 4th", example: "Csus4" },
  { symbol: "add9", name: "Add 9", example: "Cadd9" },
  { symbol: "dim", name: "Diminished", example: "C°" },
  { symbol: "aug", name: "Augmented", example: "C+" },
];

const ROOT_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const QuickChordBuilder = ({ onChordCreate }: QuickChordBuilderProps) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedRoot, setSelectedRoot] = useState("C");

  const parseChordInput = (input: string) => {
    // Type-ahead chord builder: typing "C# m7 b5" snaps to C#m7b5
    const normalized = input.trim().replace(/\s+/g, "").toLowerCase();
    
    // Simple chord name normalization
    const mappings = {
      "m7b5": "m7b5",
      "m7flat5": "m7b5", 
      "halfdiminished": "m7b5",
      "minor7flat5": "m7b5",
      "dominant7": "7",
      "major7": "maj7",
      "minor7": "m7",
      "suspended4": "sus4",
      "suspended2": "sus2",
      "add9": "add9",
      "diminished": "dim",
      "augmented": "aug"
    };
    
    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) {
        return input.replace(new RegExp(key, "gi"), value);
      }
    }
    
    return input;
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    // Auto-complete common patterns
    const parsed = parseChordInput(value);
    if (parsed !== value) {
      setInputValue(parsed);
    }
  };

  const handleQuickAdd = (root: string, quality: string) => {
    const chordName = `${root}${quality}`;
    onChordCreate(chordName);
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      onChordCreate(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quick Chord Builder
        </CardTitle>
        <CardDescription>
          Type chord names with smart auto-completion or use quick-add buttons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type-ahead input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type chord name (e.g., C# m7 b5 → C#m7b5)"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleInputSubmit();
              }
            }}
          />
          <Button onClick={handleInputSubmit} disabled={!inputValue.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Root note selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Add - Select Root:</label>
          <div className="flex flex-wrap gap-1">
            {ROOT_NOTES.map((note) => (
              <Button
                key={note}
                variant={selectedRoot === note ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRoot(note)}
                className="w-10 h-8"
              >
                {note}
              </Button>
            ))}
          </div>
        </div>

        {/* Common qualities */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Common Qualities:</label>
          <div className="grid grid-cols-3 gap-2">
            {COMMON_QUALITIES.map((quality) => (
              <Button
                key={quality.symbol}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(selectedRoot, quality.symbol)}
                className="flex flex-col items-center p-2 h-auto"
              >
                <code className="font-mono font-bold">
                  {selectedRoot}{quality.symbol}
                </code>
                <span className="text-xs opacity-75">{quality.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {inputValue && (
          <div className="p-2 bg-muted rounded">
            <div className="text-sm text-muted-foreground">Preview:</div>
            <code className="font-mono text-lg font-bold">
              {parseChordInput(inputValue)}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickChordBuilder;