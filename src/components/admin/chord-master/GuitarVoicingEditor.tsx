import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Volume2 } from "lucide-react";

interface ChordData {
  id?: string;
  chord_name: string;
  root_note: string;
  quality: string;
  bass_note?: string;
  instrument: "guitar" | "piano" | "both";
  status: "draft" | "approved" | "deprecated";
  enharmonics: string[];
  guitar_fingering: (number | 'x')[];
  guitar_chord_shape: string;
  guitar_difficulty: number;
  piano_notes: string[];
  piano_fingering: string;
  piano_hand: "left" | "right" | "both";
  notes: string;
  usage_count: number;
  formula?: string;
}

interface GuitarVoicingEditorProps {
  chordData: ChordData;
  onChange: (data: ChordData) => void;
}

const GUITAR_STRINGS = ["E", "A", "D", "G", "B", "E"]; // Standard tuning
const FRETS = Array.from({ length: 13 }, (_, i) => i); // 0-12 frets
const DIFFICULTIES = [
  { value: 1, label: "Easy", color: "bg-green-500" },
  { value: 2, label: "Medium", color: "bg-yellow-500" },
  { value: 3, label: "Advanced", color: "bg-red-500" }
];

const GuitarVoicingEditor = ({ chordData, onChange }: GuitarVoicingEditorProps) => {
  const [selectedString, setSelectedString] = useState<number | null>(null);
  const [voicingLabel, setVoicingLabel] = useState("");

  const handleFieldChange = (field: keyof ChordData, value: any) => {
    onChange({ ...chordData, [field]: value });
  };

  const handleFretClick = (stringIndex: number, fret: number) => {
    const newFingering = [...chordData.guitar_fingering];
    newFingering[stringIndex] = fret;
    handleFieldChange("guitar_fingering", newFingering);
  };

  const handleStringMute = (stringIndex: number) => {
    const newFingering = [...chordData.guitar_fingering];
    newFingering[stringIndex] = 'x'; // 'x' represents muted string
    handleFieldChange("guitar_fingering", newFingering);
  };

  const clearFretboard = () => {
    handleFieldChange("guitar_fingering", [0, 0, 0, 0, 0, 0]);
  };

  const playPreview = () => {
    // Simple audio feedback - could be enhanced with actual chord sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A note
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const selectedDifficulty = DIFFICULTIES.find(d => d.value === chordData.guitar_difficulty);

  return (
    <div className="space-y-4">
      {/* Compact Settings Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Difficulty</Label>
          <Select
            value={chordData.guitar_difficulty.toString()}
            onValueChange={(value) => handleFieldChange("guitar_difficulty", parseInt(value))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map((diff) => (
                <SelectItem key={diff.value} value={diff.value.toString()}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${diff.color}`} />
                    {diff.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 col-span-2">
          <Label className="text-sm">Chord Shape</Label>
          <Input
            className="h-8"
            value={chordData.guitar_chord_shape}
            onChange={(e) => handleFieldChange("guitar_chord_shape", e.target.value)}
            placeholder="e.g., Open C, Barre F"
          />
        </div>

        <div className="flex items-end gap-1">
          <Button variant="outline" size="sm" onClick={clearFretboard}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={playPreview}>
            <Play className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Compact Fretboard */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">Fretboard</h4>
            <div className="text-xs text-muted-foreground">Click frets • Right-click to mute</div>
          </div>
          
          <div className="relative">
            {/* Compact Fret markers */}
            <div className="flex mb-1">
              <div className="w-8"></div>
              {FRETS.slice(1, 9).map((fret) => (
                <div key={fret} className="flex-1 text-center text-xs text-muted-foreground">
                  {fret}
                </div>
              ))}
            </div>

            {/* Compact Fretboard grid */}
            <div className="space-y-0.5">
              {GUITAR_STRINGS.map((string, stringIndex) => (
                <div key={stringIndex} className="flex items-center">
                  <div className="w-8 text-xs font-medium text-right pr-1">
                    {string}
                  </div>
                  
                  <div className="flex flex-1 border border-border rounded">
                    {FRETS.slice(0, 9).map((fret) => (
                      <button
                        key={fret}
                        className={`
                          flex-1 h-6 border-r border-border last:border-r-0 
                          hover:bg-accent transition-colors relative text-xs
                          ${chordData.guitar_fingering[stringIndex] === fret 
                            ? 'bg-primary text-primary-foreground' 
                            : chordData.guitar_fingering[stringIndex] === 'x'
                            ? 'bg-destructive/20'
                            : 'bg-background'
                          }
                        `}
                        onClick={() => handleFretClick(stringIndex, fret)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleStringMute(stringIndex);
                        }}
                      >
                        {chordData.guitar_fingering[stringIndex] === fret && fret > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-primary-foreground rounded-full flex items-center justify-center text-xs font-bold text-primary">
                              {fret}
                            </div>
                          </div>
                        )}
                        {chordData.guitar_fingering[stringIndex] === 0 && fret === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border border-primary rounded-full flex items-center justify-center text-xs font-bold">
                              O
                            </div>
                          </div>
                        )}
                        {chordData.guitar_fingering[stringIndex] === 'x' && fret === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-destructive font-bold text-xs">
                            ×
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Compact Current Status & Presets */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current fingering */}
        <Card className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Current Fingering</h4>
            <div className="flex items-center gap-2">
              <code className="bg-muted px-2 py-1 rounded text-xs">
                [{chordData.guitar_fingering.map(f => f === 'x' ? 'X' : f).join(',')}]
              </code>
              {selectedDifficulty && (
                <Badge variant="outline" className="text-xs">
                  <div className={`w-2 h-2 rounded-full ${selectedDifficulty.color} mr-1`} />
                  {selectedDifficulty.label}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Quick presets */}
        <Card className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Presets</h4>
            <div className="grid grid-cols-3 gap-1">
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [0, 3, 2, 0, 1, 0])}
              >
                C
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [3, 2, 0, 0, 0, 3])}
              >
                G
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [0, 0, 2, 2, 2, 0])}
              >
                A
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [1, 1, 3, 3, 3, 1])}
              >
                F
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [0, 2, 2, 1, 0, 0])}
              >
                Am
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("guitar_fingering", [0, 2, 2, 0, 0, 0])}
              >
                Em
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact Variations */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">Voicing Variations</h4>
            <Button size="sm" className="h-6">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              className="h-7 text-xs"
              placeholder="Variation label"
              value={voicingLabel}
              onChange={(e) => setVoicingLabel(e.target.value)}
            />
            <Button variant="outline" size="sm" className="h-7">Save</Button>
          </div>
          <div className="text-xs text-muted-foreground text-center py-2 border border-dashed rounded">
            No saved variations yet
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GuitarVoicingEditor;