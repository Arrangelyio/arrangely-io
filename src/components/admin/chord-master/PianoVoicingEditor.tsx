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

interface PianoVoicingEditorProps {
  chordData: ChordData;
  onChange: (data: ChordData) => void;
}

const PIANO_NOTES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

const OCTAVES = [2, 3, 4, 5, 6]; // Piano octave range

const INVERSIONS = [
  { value: "root", label: "Root Position" },
  { value: "first", label: "1st Inversion" },
  { value: "second", label: "2nd Inversion" },
  { value: "third", label: "3rd Inversion" }
];

const REGISTERS = [
  { value: "low", label: "Low (Bass)", range: "C2-C4" },
  { value: "mid", label: "Mid (Treble)", range: "C4-C6" },
  { value: "high", label: "High (Upper)", range: "C6-C8" }
];

const DIFFICULTIES = [
  { value: 1, label: "Easy", color: "bg-green-500" },
  { value: 2, label: "Medium", color: "bg-yellow-500" },
  { value: 3, label: "Advanced", color: "bg-red-500" }
];

const PianoVoicingEditor = ({ chordData, onChange }: PianoVoicingEditorProps) => {
  const [startOctave, setStartOctave] = useState(4);
  const [numOctaves, setNumOctaves] = useState(2);
  const [inversion, setInversion] = useState("root");
  const [register, setRegister] = useState("mid");
  const [voicingLabel, setVoicingLabel] = useState("");

  const handleFieldChange = (field: keyof ChordData, value: any) => {
    onChange({ ...chordData, [field]: value });
  };

  const handleKeyClick = (note: string, octave: number) => {
    const fullNote = `${note}${octave}`;
    const currentNotes = [...chordData.piano_notes];
    
    if (currentNotes.includes(fullNote)) {
      // Remove note if already selected
      const updatedNotes = currentNotes.filter(n => n !== fullNote);
      handleFieldChange("piano_notes", updatedNotes);
    } else {
      // Add note
      const updatedNotes = [...currentNotes, fullNote].sort();
      handleFieldChange("piano_notes", updatedNotes);
    }
  };

  const clearKeyboard = () => {
    handleFieldChange("piano_notes", []);
  };

  const playPreview = () => {
    // Simple chord preview - could be enhanced with actual piano sounds
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    chordData.piano_notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Simple frequency calculation based on note
      const baseFreq = 220; // A4
      oscillator.frequency.setValueAtTime(baseFreq * (index + 1), audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime + index * 0.1);
      oscillator.stop(audioContext.currentTime + 1 + index * 0.1);
    });
  };

  const selectedDifficulty = DIFFICULTIES.find(d => d.value === chordData.guitar_difficulty);

  const renderPianoKey = (note: string, octave: number, isBlack = false) => {
    const fullNote = `${note}${octave}`;
    const isSelected = chordData.piano_notes.includes(fullNote);
    
    return (
      <button
        key={fullNote}
        className={`
          ${isBlack 
            ? 'w-6 h-16 bg-foreground text-background absolute transform -translate-x-1/2 z-10' 
            : 'w-8 h-24 bg-background text-foreground border border-border'
          }
          ${isSelected 
            ? isBlack 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-primary text-primary-foreground'
            : ''
          }
          hover:opacity-80 transition-all rounded-b-sm flex items-end justify-center pb-2 text-xs font-mono
        `}
        onClick={() => handleKeyClick(note, octave)}
        style={isBlack ? { left: `${PIANO_NOTES.indexOf(note.replace('#', '')) * 32 + 20}px` } : {}}
      >
        {!isBlack && note}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Compact Settings Row */}
      <div className="grid grid-cols-5 gap-3">
        <div className="space-y-1">
          <Label className="text-sm">Hand</Label>
          <Select
            value={chordData.piano_hand}
            onValueChange={(value) => handleFieldChange("piano_hand", value as any)}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">LH</SelectItem>
              <SelectItem value="right">RH</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        <div className="space-y-1">
          <Label className="text-sm">Start Octave</Label>
          <Select value={startOctave.toString()} onValueChange={(v) => setStartOctave(parseInt(v))}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCTAVES.map((octave) => (
                <SelectItem key={octave} value={octave.toString()}>
                  {octave}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Octaves</Label>
          <Select value={numOctaves.toString()} onValueChange={(v) => setNumOctaves(parseInt(v))}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Octave</SelectItem>
              <SelectItem value="2">2 Octaves</SelectItem>
              <SelectItem value="3">3 Octaves</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-1">
          <Button variant="outline" size="sm" onClick={clearKeyboard}>
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={playPreview}>
            <Play className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Compact Piano Keyboard */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">Piano Keyboard</h4>
            <div className="text-xs text-muted-foreground">
              {numOctaves > 1 ? `${numOctaves} octaves` : '1 octave'} • Click keys to build voicing
            </div>
          </div>
          
          <div className="relative overflow-x-auto">
            <div 
              className="relative flex" 
              style={{ 
                width: `${168 * numOctaves}px`, 
                height: '60px' 
              }}
            >
              {/* White keys for all octaves */}
              <div className="flex">
                {Array.from({ length: numOctaves }, (_, octaveIndex) => {
                  const currentOctave = startOctave + octaveIndex;
                  return PIANO_NOTES.filter(note => !note.includes('#')).map((note, noteIndex) => {
                    const fullNote = `${note}${currentOctave}`;
                    const isSelected = chordData.piano_notes.includes(fullNote);
                    const keyIndex = octaveIndex * 7 + noteIndex;
                    
                    return (
                      <button
                        key={fullNote}
                        className={`
                          w-6 h-12 bg-background text-foreground border border-border
                          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          hover:opacity-80 transition-all rounded-b-sm flex items-end justify-center pb-1 text-xs font-mono
                        `}
                        onClick={() => handleKeyClick(note, currentOctave)}
                      >
                        <span className="truncate">{note}{currentOctave}</span>
                      </button>
                    );
                  });
                }).flat()}
              </div>
              
              {/* Black keys for all octaves */}
              <div className="absolute top-0 left-0">
                {Array.from({ length: numOctaves }, (_, octaveIndex) => {
                  const currentOctave = startOctave + octaveIndex;
                  const octaveOffset = octaveIndex * 168; // 7 white keys * 24px = 168px per octave
                  
                  return PIANO_NOTES.filter(note => note.includes('#')).map((note, index) => {
                    const fullNote = `${note}${currentOctave}`;
                    const isSelected = chordData.piano_notes.includes(fullNote);
                    const leftPos = [15, 39, 87, 111, 135]; // Positions within one octave
                    
                    return (
                      <button
                        key={fullNote}
                        className={`
                          w-4 h-8 bg-foreground text-background absolute transform -translate-x-1/2 z-10
                          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                          hover:opacity-80 transition-all rounded-b-sm text-xs
                        `}
                        onClick={() => handleKeyClick(note, currentOctave)}
                        style={{ left: `${octaveOffset + leftPos[index]}px` }}
                      >
                      </button>
                    );
                  });
                }).flat()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Compact Status & Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Selected Notes & Fingering */}
        <Card className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Selected Notes</h4>
            {chordData.piano_notes.length > 0 ? (
              <div className="space-y-1">
                <code className="bg-muted px-2 py-1 rounded text-xs block">
                  [{chordData.piano_notes.join(', ')}]
                </code>
                <Input
                  className="h-7 text-xs"
                  placeholder="Fingering (e.g., 1-3-5)"
                  value={chordData.piano_fingering}
                  onChange={(e) => handleFieldChange("piano_fingering", e.target.value)}
                />
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">No notes selected</span>
            )}
          </div>
        </Card>

        {/* Quick Presets */}
        <Card className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Quick Presets</h4>
            <div className="grid grid-cols-3 gap-1">
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("piano_notes", ["C4", "E4", "G4"])}
              >
                Root
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("piano_notes", ["E4", "G4", "C5"])}
              >
                1st
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"  
                onClick={() => handleFieldChange("piano_notes", ["G4", "C5", "E5"])}
              >
                2nd
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("piano_notes", ["C3", "G3", "E4"])}
              >
                Shell
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("piano_notes", ["C3", "E4", "G4", "C5"])}
              >
                Spread
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => handleFieldChange("piano_notes", ["C4", "E4", "G4", "B4"])}
              >
                +7th
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact Settings & Variations */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Settings</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Inversion</Label>
                <Select value={inversion} onValueChange={setInversion}>
                  <SelectTrigger className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVERSIONS.map((inv) => (
                      <SelectItem key={inv.value} value={inv.value}>
                        {inv.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Register</Label>
                <Select value={register} onValueChange={setRegister}>
                  <SelectTrigger className="h-7">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGISTERS.map((reg) => (
                      <SelectItem key={reg.value} value={reg.value}>
                        {reg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-sm">Variations</h4>
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
    </div>
  );
};

export default PianoVoicingEditor;