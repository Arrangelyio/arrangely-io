import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface ChordPosition {
  line: number;
  position: number;
  word: string;
}

interface FloatingMenuProps {
  position: { x: number; y: number };
  onChordSelect: (chord: string) => void;
  onClose: () => void;
  currentKey: string;
}

const FloatingChordMenu = ({ position, onChordSelect, onClose, currentKey }: FloatingMenuProps) => {
  const [manualChord, setManualChord] = useState('');
  const getChordSuggestions = (key: string) => {
    const chordTypes = ['', 'm', '7', 'm7', 'maj7', 'sus4', 'sus2', 'add9', 'dim'];
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
      slash: [],
      other: []
    };
    
    baseChords.forEach(chord => {
      suggestions.major.push(chord);
      suggestions.minor.push(chord + 'm');
      suggestions.seventh.push(chord + '7', chord + 'maj7');
      // Add slash chords - very common in worship music
      suggestions.slash.push(chord + '/E', chord + '/G', chord + '/B', chord + '/D');
      suggestions.other.push(chord + 'sus4', chord + 'add9', chord + 'sus2');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualChordSubmit();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.chord-menu')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className="chord-menu fixed z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-[320px]"
      style={{ 
        left: Math.max(10, position.x - 160), 
        top: Math.max(10, position.y - 80),
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
      <div className="mb-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
        <p className="text-xs text-muted-foreground mb-2">Type any chord manually:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualChord}
            onChange={(e) => setManualChord(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g. G/C, Dm7, Cadd9..."
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
      
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Major Chords</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.major.slice(0, 8).map(chord => (
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
          <p className="text-xs text-muted-foreground mb-1">Minor Chords</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.minor.slice(0, 8).map(chord => (
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
          <p className="text-xs text-muted-foreground mb-1">Slash Chords (e.g., G/C)</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.slash.slice(0, 8).map(chord => (
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
          <p className="text-xs text-muted-foreground mb-1">7th & Extended</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.seventh.slice(0, 8).map(chord => (
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
          <p className="text-xs text-muted-foreground mb-1">Sus & Add Chords</p>
          <div className="flex flex-wrap gap-1">
            {chordSuggestions.other.slice(0, 8).map(chord => (
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
      
      <div className="mt-3 pt-2 border-t">
        <p className="text-xs text-muted-foreground">💡 Tip: Type manually above or click any chord to place it above your selected word</p>
      </div>
    </div>
  );
};

interface InteractiveChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  referenceLyrics: string;
  sectionType: string;
  currentKey: string;
}

const InteractiveChordEditor = ({ 
  value, 
  onChange, 
  referenceLyrics, 
  sectionType, 
  currentKey 
}: InteractiveChordEditorProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedPosition, setSelectedPosition] = useState<ChordPosition | null>(null);
  const [snapToWord, setSnapToWord] = useState(true);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const handleLyricClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Create a temporary selection to find exact character position
    const selection = window.getSelection();
    if (!selection) return;

    // Clear any existing selection
    selection.removeAllRanges();
    
    // Create a range at the click point
    const range = document.caretRangeFromPoint(clickX, clickY);
    if (!range) return;

    const clickedElement = range.startContainer;
    const clickOffset = range.startOffset;

    // Find which line this click belongs to
    let lineElement = clickedElement.nodeType === Node.TEXT_NODE 
      ? clickedElement.parentElement 
      : clickedElement as HTMLElement;
    
    // Traverse up to find the line container
    while (lineElement && !lineElement.hasAttribute('data-line-index')) {
      lineElement = lineElement.parentElement;
    }

    if (!lineElement) return;

    const lineIndex = parseInt(lineElement.getAttribute('data-line-index') || '0');
    const lineText = lineElement.textContent || '';
    
    // Calculate the exact character position within the line
    let characterPosition = 0;
    
    if (clickedElement.nodeType === Node.TEXT_NODE) {
      // Find position by walking through the line's text nodes
      const walker = document.createTreeWalker(
        lineElement,
        NodeFilter.SHOW_TEXT
      );

      let currentNode;
      while (currentNode = walker.nextNode()) {
        if (currentNode === clickedElement) {
          characterPosition += clickOffset;
          break;
        }
        characterPosition += currentNode.textContent?.length || 0;
      }
    }

    

    // Find the clicked character/word for display
    const clickedChar = lineText[characterPosition] || '';
    const wordStart = lineText.lastIndexOf(' ', characterPosition - 1) + 1;
    const wordEnd = lineText.indexOf(' ', characterPosition);
    const clickedWord = lineText.substring(wordStart, wordEnd === -1 ? lineText.length : wordEnd);

    setSelectedPosition({
      line: lineIndex,
      position: characterPosition,
      word: `"${clickedChar}" in "${clickedWord}"`
    });

    setMenuPosition({ x: clickX, y: clickY });
    setShowMenu(true);
  };

  const handleChordInsert = (chord: string) => {
    if (!selectedPosition) return;

    

    // Get current lines and reference lyrics lines
    const currentLines = value.split('\n').filter(line => line !== undefined);
    const lyricLines = referenceLyrics.split('\n');
    
    // Build new content with proper chord-line/lyric-line structure
    const newContent = [];
    
    for (let lineIndex = 0; lineIndex < lyricLines.length; lineIndex++) {
      const chordLineIndex = lineIndex * 2;
      const lyricLineIndex = lineIndex * 2 + 1;
      
      // Get existing chord line for this lyric line, or create empty
      let existingChordLine = '';
      
      // Find the chord line that corresponds to this lyric line
      // Look through current content to find matching chord lines
      if (currentLines.length > chordLineIndex) {
        existingChordLine = currentLines[chordLineIndex] || '';
      }
      
      let chordLine = existingChordLine;
      
      // If this is the line we want to add chord to
      if (lineIndex === selectedPosition.line) {
        const targetPosition = selectedPosition.position;
        
        // Ensure chord line is long enough
        while (chordLine.length < targetPosition) {
          chordLine += ' ';
        }
        
        // Insert chord at position, replacing any existing chord at that position
        const beforeChord = chordLine.substring(0, targetPosition);
        const afterChord = chordLine.substring(targetPosition);
        
        // Remove any existing chord characters at this position
        const afterChordCleaned = afterChord.replace(/^[^\s]*/, ''); // Remove existing chord
        
        chordLine = beforeChord + chord + afterChordCleaned;
        
        
      }
      
      // Add the chord line and lyric line
      newContent.push(chordLine);
      newContent.push(lyricLines[lineIndex] || '');
    }
    
    const newValue = newContent.join('\n');
    
    
    onChange(newValue);
    setShowMenu(false);
    setSelectedPosition(null);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'copy':
        onChange(referenceLyrics);
        break;
      case 'clear':
        onChange('');
        break;
      case 'format':
        // Auto-format with chord lines above lyric lines
        const lyricLines = referenceLyrics.split('\n');
        const formattedLines = [];
        lyricLines.forEach(line => {
          formattedLines.push(''); // Empty chord line
          formattedLines.push(line); // Lyric line
        });
        onChange(formattedLines.join('\n'));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Display and Settings */}
      <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/20">
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-primary">
            Key: {currentKey} Major (Do = {currentKey})
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="snap-to-word" 
              checked={snapToWord}
              onChange={(e) => setSnapToWord(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="snap-to-word" className="text-sm text-muted-foreground">
              Snap chords to words
            </label>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          💡 Click any character in the lyrics below to add a chord at that exact position
        </div>
      </div>

      {/* Interactive Lyrics Display */}
      <div>
        <Label className="text-base font-semibold">🎵 Click Words to Add Chords</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Click on any character/letter in the lyrics below to place chords at that exact position.
        </p>
        
        <Card className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div 
              ref={lyricsRef}
              className="font-mono text-sm leading-relaxed whitespace-pre-wrap cursor-text select-none"
              onClick={handleLyricClick}
              style={{ 
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                lineHeight: '1.8',
                letterSpacing: '0.5px'
              }}
            >
              {referenceLyrics.split('\n').map((line, lineIndex) => (
                <div 
                  key={lineIndex} 
                  className="hover:bg-accent/20 rounded px-1 py-0.5 transition-colors"
                  data-line-index={lineIndex}
                >
                  {line}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chord & Lyric Result */}
      <div>
        <Label className="text-base font-semibold">🎼 Chord & Lyric Arrangement</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Your chord arrangement will appear here. You can also edit directly if needed.
        </p>
        <Textarea
          id="chord-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Chords will appear here as you click on words above, or you can type directly..."
          className="min-h-[200px] font-mono text-sm leading-relaxed resize-none border-2 border-border focus:border-primary/40 bg-background"
          style={{ 
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            lineHeight: '1.8',
            letterSpacing: '0.5px'
          }}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => handleQuickAction('copy')}>
          📋 Copy Reference Lyrics
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => handleQuickAction('format')}>
          🎼 Auto-Format (Chord + Lyric Lines)
        </Button>
        
        <Button variant="outline" size="sm" onClick={() => handleQuickAction('clear')}>
          🗑️ Clear All
        </Button>
      </div>

      {/* Floating Chord Menu */}
      {showMenu && (
        <FloatingChordMenu
          position={menuPosition}
          onChordSelect={handleChordInsert}
          onClose={() => setShowMenu(false)}
          currentKey={currentKey}
        />
      )}
    </div>
  );
};

export default InteractiveChordEditor;