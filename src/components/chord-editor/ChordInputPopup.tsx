import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Music } from 'lucide-react';

interface ChordInputPopupProps {
  isOpen: boolean;
  position: { x: number; y: number };
  sectionIndex: number;
  barIndex: number;
  beatIndex: number;
  currentChord?: string;
  chordSuggestions: string[];
  onChordSelect: (chord: string) => void;
  onClose: () => void;
}

const ChordInputPopup = ({
  isOpen,
  position,
  sectionIndex,
  barIndex,
  beatIndex,
  currentChord,
  chordSuggestions,
  onChordSelect,
  onClose
}: ChordInputPopupProps) => {
  const [customChord, setCustomChord] = useState(currentChord || '');

  useEffect(() => {
    setCustomChord(currentChord || '');
  }, [currentChord]);

  if (!isOpen) return null;

  const handleCustomChordAdd = () => {
    if (customChord.trim()) {
      onChordSelect(customChord.trim());
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomChordAdd();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50 w-80"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 300)
      }}
    >
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              <span>Section {sectionIndex + 1}, Bar {barIndex + 1}, Beat {beatIndex + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Custom Chord Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter chord (e.g., Am7, C/E)"
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleCustomChordAdd} size="sm">
              Add
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {chordSuggestions.map(chord => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChordSelect(chord);
                    onClose();
                  }}
                  className="h-7 px-2 text-xs"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Option */}
          {currentChord && (
            <Button
              onClick={() => {
                onChordSelect('');
                onClose();
              }}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              Clear Chord
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChordInputPopup;