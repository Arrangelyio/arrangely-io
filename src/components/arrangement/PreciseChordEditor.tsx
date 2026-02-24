import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import ChordPickerModal from "./ChordPickerModal";

interface PreciseChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  currentKey: string;
  onFocus?: () => void;
  'data-section'?: string;
  'data-field'?: string;
}

const PreciseChordEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  currentKey, 
  onFocus,
  'data-section': dataSection,
  'data-field': dataField
}: PreciseChordEditorProps) => {
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [clickPosition, setClickPosition] = useState({ line: 0, char: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaClick = useCallback((e: React.MouseEvent) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    
    // Set focus and get cursor position after click
    textarea.focus();
    
    // Use setTimeout to get the cursor position after the click is processed
    setTimeout(() => {
      const cursorPosition = textarea.selectionStart;
      const text = textarea.value;
      const lines = text.split('\n');
      
      // Find which line and character position
      let currentPos = 0;
      let lineIndex = 0;
      let charIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length;
        
        if (cursorPosition <= currentPos + lineLength) {
          lineIndex = i;
          charIndex = cursorPosition - currentPos;
          break;
        }
        currentPos += lineLength + 1; // +1 for newline character
      }
      
      // Ensure we don't exceed line length
      const currentLine = lines[lineIndex] || '';
      charIndex = Math.min(charIndex, currentLine.length);
      
      const clickedChar = currentLine[charIndex] || 'end of line';
      
      setSelectedWord(`Character "${clickedChar}" at position ${charIndex}`);
      setClickPosition({ line: lineIndex, char: charIndex });
      setShowChordPicker(true);
    }, 10);
  }, []);

  const handleChordSelect = useCallback((chord: string) => {
    if (!textareaRef.current) return;

    const text = textareaRef.current.value;
    const lines = text.split('\n');
    const { line: lineIndex, char: charIndex } = clickPosition;
    
    // Ensure we have the target line
    if (lineIndex >= lines.length) return;
    
    const lyricsLine = lines[lineIndex];
    
    // Check if this is already a chord line (contains mainly chords)
    const isChordLine = /^[\s\w#\/b♭♯]+$/.test(lyricsLine) && 
                       lyricsLine.split(/\s+/).some(word => 
                         /^[A-G]/.test(word) && word.length <= 6
                       );
    
    let targetLyricsLineIndex = lineIndex;
    let chordLineIndex = lineIndex - 1;
    
    // If this is a chord line, find the lyrics line below it
    if (isChordLine) {
      targetLyricsLineIndex = lineIndex + 1;
      chordLineIndex = lineIndex;
      
      // If no lyrics line exists below, create one
      if (targetLyricsLineIndex >= lines.length || !lines[targetLyricsLineIndex].trim()) {
        lines.splice(targetLyricsLineIndex, 0, lyricsLine);
        lines[lineIndex] = ''; // Clear the original line to make it chord line
      }
    } else {
      // This is a lyrics line, ensure there's a chord line above it
      if (chordLineIndex < 0 || (lines[chordLineIndex].trim() && 
          !(/^[\s\w#\/b♭♯]+$/.test(lines[chordLineIndex])))) {
        lines.splice(lineIndex, 0, '');
        chordLineIndex = lineIndex;
        targetLyricsLineIndex = lineIndex + 1;
      }
    }
    
    // Get the lyrics line for character positioning
    const actualLyricsLine = lines[targetLyricsLineIndex] || '';
    let chordLine = lines[chordLineIndex] || '';
    
    // Calculate exact position - use the character index directly
    const targetPosition = Math.min(charIndex, actualLyricsLine.length);
    
    // Ensure chord line is long enough
    const requiredLength = Math.max(targetPosition + chord.length, actualLyricsLine.length);
    chordLine = chordLine.padEnd(requiredLength, ' ');
    
    // Clear any existing chord at this position to avoid overlap
    const clearStart = Math.max(0, targetPosition - 1);
    const clearEnd = Math.min(chordLine.length, targetPosition + chord.length + 1);
    
    for (let i = clearStart; i < clearEnd; i++) {
      if (i !== targetPosition && chordLine[i] !== ' ') {
        chordLine = chordLine.substring(0, i) + ' ' + chordLine.substring(i + 1);
      }
    }
    
    // Insert the chord at the exact position
    chordLine = chordLine.substring(0, targetPosition) + 
                chord + 
                chordLine.substring(targetPosition + chord.length);
    
    // Update the chord line
    lines[chordLineIndex] = chordLine.trimEnd();
    
    // Update the value
    const newValue = lines.join('\n');
    onChange(newValue);
    
    setShowChordPicker(false);
    
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  }, [clickPosition, onChange]);

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Click on any character in the lyrics to add a chord above it
        </div>
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onClick={handleTextareaClick}
          className="min-h-[200px] resize-y font-mono text-base leading-loose tracking-wide cursor-pointer bg-background border-input focus:ring-2 focus:ring-primary/20"
          data-section={dataSection}
          data-field={dataField}
          style={{
            fontFamily: 'Monaco, "Lucida Console", monospace',
            letterSpacing: '0.1em',
            lineHeight: '2'
          }}
        />
        <div className="text-xs text-muted-foreground">
          Use monospace font for precise alignment. Each character position corresponds exactly to the chord position above.
        </div>
      </div>
      
      <ChordPickerModal
        isOpen={showChordPicker}
        onClose={() => setShowChordPicker(false)}
        onChordSelect={handleChordSelect}
        currentKey={currentKey}
        selectedWord={selectedWord}
      />
    </>
  );
};

export default PreciseChordEditor;