import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MasterSection {
  lyrics: string;
  chords: string;
}

interface MusicalSectionEditorProps {
  sectionData: MasterSection;
  sectionType: string;
  currentKey: string;
  updateMasterSection: (type: string, field: 'lyrics' | 'chords', value: string) => void;
}

interface FloatingChordMenuProps {
  position: { x: number; y: number };
  onChordSelect: (chord: string) => void;
  onClose: () => void;
  currentKey: string;
}

const FloatingChordMenu = ({ position, onChordSelect, onClose, currentKey }: FloatingChordMenuProps) => {
  const [manualChord, setManualChord] = useState('');
  
  const getChordSuggestions = (key: string) => {
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const keyIndex = keys.indexOf(key);
    
    // Common chord progressions in the key
    const romanNumerals = [0, 2, 4, 5, 7, 9, 11]; // I, ii, iii, IV, V, vi, vii
    const baseChords = romanNumerals.map(interval => 
      keys[(keyIndex + interval) % 12]
    );
    
    const suggestions = {
      major: [],
      minor: [],
      seventh: [],
      slash: []
    };
    
    baseChords.forEach(chord => {
      suggestions.major.push(chord);
      suggestions.minor.push(chord + 'm');
      suggestions.seventh.push(chord + '7', chord + 'maj7');
      suggestions.slash.push(chord + '/E', chord + '/G', chord + '/B');
    });
    
    return suggestions;
  };

  const chordSuggestions = getChordSuggestions(currentKey);

  const handleManualChordSubmit = () => {
    if (manualChord.trim()) {
      onChordSelect(manualChord.trim());
      setManualChord('');
    }
  };

  return (
    <div 
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-[280px]"
      style={{ 
        left: Math.max(10, position.x - 140), 
        top: Math.max(10, position.y - 60),
        maxWidth: '90vw'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-primary">Choose Chord</h4>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          ×
        </Button>
      </div>

      {/* Manual Input */}
      <div className="mb-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualChord}
            onChange={(e) => setManualChord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleManualChordSubmit()}
            placeholder="e.g. G, Am, F..."
            className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
            autoFocus
          />
          <Button 
            size="sm" 
            onClick={handleManualChordSubmit}
            disabled={!manualChord.trim()}
            className="px-3"
          >
            Add
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Major</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.major.slice(0, 6).map(chord => (
              <Button 
                key={chord} 
                variant="outline" 
                size="sm" 
                className="text-xs h-6 px-2"
                onClick={() => onChordSelect(chord)}
              >
                {chord}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-1">Minor</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.minor.slice(0, 6).map(chord => (
              <Button 
                key={chord} 
                variant="outline" 
                size="sm" 
                className="text-xs h-6 px-2"
                onClick={() => onChordSelect(chord)}
              >
                {chord}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MusicalSectionEditor = ({ 
  sectionData, 
  sectionType, 
  currentKey, 
  updateMasterSection 
}: MusicalSectionEditorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const [selectedBeat, setSelectedBeat] = useState<number | null>(null);

  // Parse section data from Step 2
  let sectionConfig;
  try {
    sectionConfig = JSON.parse(sectionData.lyrics);
  } catch {
    sectionConfig = { barCount: 4, timeSignature: '4/4', notes: sectionData.lyrics || '' };
  }

  const barCount = sectionConfig.barCount || 4;
  const timeSignature = sectionConfig.timeSignature || '4/4';
  const beatsPerBar = parseInt(timeSignature.split('/')[0]);

  // Parse current chords
  let currentChords;
  try {
    currentChords = sectionData.chords ? JSON.parse(sectionData.chords) : {};
  } catch {
    currentChords = {};
  }

  const handleBeatClick = (barIndex: number, beatIndex: number, event: React.MouseEvent) => {
    setSelectedBar(barIndex);
    setSelectedBeat(beatIndex);
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setShowMenu(true);
  };

  const handleChordSelect = (chord: string) => {
    if (selectedBar !== null && selectedBeat !== null) {
      const beatKey = `bar${selectedBar + 1}_beat${selectedBeat + 1}`;
      const updatedChords = { ...currentChords, [beatKey]: chord };
      updateMasterSection(sectionType, 'chords', JSON.stringify(updatedChords));
    }
    setShowMenu(false);
    setSelectedBar(null);
    setSelectedBeat(null);
  };

  const clearBeat = (barIndex: number, beatIndex: number) => {
    const beatKey = `bar${barIndex + 1}_beat${beatIndex + 1}`;
    const updatedChords = { ...currentChords };
    delete updatedChords[beatKey];
    updateMasterSection(sectionType, 'chords', JSON.stringify(updatedChords));
  };

  return (
    <div className="space-y-4">
      {/* Section Info */}
      <div className="p-3 bg-muted rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm">Section Configuration:</h4>
          <div className="text-xs text-muted-foreground">
            {barCount} bars • {timeSignature}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {sectionConfig.notes || 'No notes added'}
        </p>
      </div>

      {/* Interactive Bar/Beat Grid */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Click on beats to add chords:</h4>
        <div className="grid gap-3">
          {Array.from({ length: barCount }, (_, barIndex) => (
            <div key={barIndex} className="p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {barIndex + 1}
                </div>
                <span className="text-sm font-medium">Bar {barIndex + 1}</span>
              </div>
              
              {/* Beat positions */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${beatsPerBar}, 1fr)` }}>
                {Array.from({ length: beatsPerBar }, (_, beatIndex) => {
                  const beatKey = `bar${barIndex + 1}_beat${beatIndex + 1}`;
                  const chord = currentChords[beatKey];
                  
                  return (
                    <div key={beatIndex} className="relative">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">
                          Beat {beatIndex + 1}
                        </div>
                        <Button
                          variant={chord ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => handleBeatClick(barIndex, beatIndex, e)}
                          className={`w-full h-12 text-xs ${chord ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-accent'}`}
                        >
                          {chord || '+'}
                        </Button>
                        {chord && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearBeat(barIndex, beatIndex)}
                            className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs hover:bg-destructive hover:text-destructive-foreground"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>💡 Tip:</span>
          <span>Click any beat to add a chord. Key: {currentKey}</span>
        </div>
      </div>

      {/* Floating Chord Menu */}
      {showMenu && (
        <FloatingChordMenu
          position={menuPosition}
          onChordSelect={handleChordSelect}
          onClose={() => setShowMenu(false)}
          currentKey={currentKey}
        />
      )}
    </div>
  );
};

export default MusicalSectionEditor;