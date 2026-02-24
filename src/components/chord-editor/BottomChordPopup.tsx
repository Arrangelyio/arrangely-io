
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Music, Piano } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BottomChordPopupProps {
  isOpen: boolean;
  sectionName: string;
  barIndex: number;
  currentChords: string[];
  chordSuggestions: string[];
  midiEnabled: boolean;
  onChordAdd: (chord: string) => void;
  onChordRemove: (chord: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

const BottomChordPopup = ({
  isOpen,
  sectionName,
  barIndex,
  currentChords,
  chordSuggestions,
  midiEnabled,
  onChordAdd,
  onChordRemove,
  onClearAll,
  onClose
}: BottomChordPopupProps) => {
  const [customChord, setCustomChord] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    setCustomChord('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomChordAdd = () => {
    if (customChord.trim()) {
      onChordAdd(customChord.trim());
      setCustomChord('');
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
      <Card className="border-0 rounded-none">
        <CardHeader className={isMobile ? 'pb-2 pt-3 px-3' : 'pb-3'}>
          <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-sm' : 'text-sm'}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Music className={isMobile ? 'w-4 h-4 flex-shrink-0' : 'w-4 h-4'} />
              <span className="truncate">{sectionName} - Bar {barIndex + 1}</span>
              {midiEnabled && (
                <Badge className={`bg-green-100 text-green-800 flex-shrink-0 ${isMobile ? 'text-xs px-1' : 'text-xs'}`}>
                  <Piano className={`mr-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                  MIDI
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={isMobile ? 'h-6 w-6 p-0 flex-shrink-0' : 'h-6 w-6 p-0'}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 ${isMobile ? 'px-3 pb-3' : 'space-y-4'}`}>
          {/* Current Chords */}
          {currentChords.length > 0 && (
            <div>
              <p className={`text-muted-foreground mb-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                Current chords in this bar:
              </p>
              <div className="flex flex-wrap gap-2">
                {currentChords.map((chord, index) => (
                  <Button
                    key={`${chord}-${index}`}
                    variant="secondary"
                    size="sm"
                    onClick={() => onChordRemove(chord)}
                    className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                  >
                    {chord}
                    <X className={`ml-1 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
                  </Button>
                ))}
                <Button
                  onClick={onClearAll}
                  variant="outline"
                  size="sm"
                  className={`text-destructive ${isMobile ? 'h-7 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Custom Chord Input */}
          <div className="flex gap-2">
            <Input
              placeholder={isMobile ? "Enter chord..." : "Enter chord (e.g., Am7, C/E, Cmaj7)"}
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              onKeyDown={handleKeyPress}
              className={`flex-1 ${isMobile ? 'h-9 text-sm' : ''}`}
              autoFocus={!isMobile}
            />
            <Button 
              onClick={handleCustomChordAdd} 
              size={isMobile ? "sm" : "default"}
              disabled={!customChord.trim()}
              className={isMobile ? 'h-9 px-3 text-sm' : ''}
            >
              Add
            </Button>
          </div>

          {/* Quick Suggestions */}
          <div>
            <p className={`text-muted-foreground mb-2 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              Quick suggestions:
              {midiEnabled && !isMobile && (
                <span className="ml-2 text-green-600">
                  Play chords on your MIDI controller to add them instantly
                </span>
              )}
            </p>
            <div className={`flex flex-wrap gap-1 ${isMobile ? 'max-h-24 overflow-y-auto' : 'max-h-20 overflow-y-auto'}`}>
              {chordSuggestions.map(chord => (
                <Button
                  key={chord}
                  variant="outline"
                  size="sm"
                  onClick={() => onChordAdd(chord)}
                  className={`${isMobile ? 'h-7 px-2 text-xs' : 'h-7 px-2 text-xs'}`}
                  disabled={currentChords.includes(chord)}
                >
                  {chord}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BottomChordPopup;
