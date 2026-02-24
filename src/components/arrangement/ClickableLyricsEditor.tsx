import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import ChordPickerModal from "./ChordPickerModal";

interface ClickableLyricsEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  currentKey: string;
  onFocus?: () => void;
  'data-section'?: string;
  'data-field'?: string;
}

const ClickableLyricsEditor = ({ 
  value, 
  onChange, 
  placeholder, 
  currentKey, 
  onFocus,
  'data-section': dataSection,
  'data-field': dataField
}: ClickableLyricsEditorProps) => {
  const [showChordPicker, setShowChordPicker] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [insertPosition, setInsertPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextareaClick = useCallback((e: React.MouseEvent) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const clickPosition = textarea.selectionStart;
    const text = textarea.value;
    
    // Find the start of the current line
    let lineStart = clickPosition;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Find the end of the current line
    let lineEnd = clickPosition;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const currentLine = text.substring(lineStart, lineEnd);
    const positionInLine = clickPosition - lineStart;
    
    // Check if clicking at the end of line (for after-lyric chords)
    const isEndOfLine = positionInLine >= currentLine.length || 
                       (clickPosition < text.length && text[clickPosition] === '\n');
    
    // Get the character or word at click position
    let clickedWord = '';
    if (isEndOfLine) {
      clickedWord = '(end of line)';
    } else {
      // Find word boundaries around click position
      let wordStart = Math.max(0, positionInLine);
      let wordEnd = Math.min(currentLine.length, positionInLine + 1);
      
      // Expand to include full word
      while (wordStart > 0 && currentLine[wordStart - 1] !== ' ') {
        wordStart--;
      }
      while (wordEnd < currentLine.length && currentLine[wordEnd] !== ' ') {
        wordEnd++;
      }
      
      clickedWord = currentLine.substring(wordStart, wordEnd).trim() || '(space)';
    }
    
    setSelectedWord(clickedWord);
    setInsertPosition(clickPosition);
    setShowChordPicker(true);
  }, []);

  const handleChordSelect = useCallback((chord: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const text = textarea.value;
    
    // Auto-format lyrics into chord chart format if not already formatted
    const isFirstChord = !text.includes('\n\n') && !text.match(/^[\s\w#\/]+$/m);
    let formattedText = text;
    
    if (isFirstChord && text.trim()) {
      // Convert single-line lyrics into chord chart format
      const lines = text.split('\n').filter(line => line.trim());
      const formattedLines = [];
      
      for (const line of lines) {
        if (line.trim()) {
          formattedLines.push(''); // Empty line for chords
          formattedLines.push(line); // Lyrics line
        }
      }
      
      formattedText = formattedLines.join('\n');
      onChange(formattedText);
      
      // Update insert position for the new format
      setTimeout(() => {
        handleChordInsertFormatted(chord, formattedText);
      }, 50);
      return;
    }
    
    handleChordInsertFormatted(chord, formattedText);
  }, [insertPosition, onChange]);

  const handleChordInsertFormatted = (chord: string, text: string) => {
    const lines = text.split('\n');
    
    // Find the exact line and position where we want to insert the chord
    let currentPos = 0;
    let targetLyricsLineIndex = -1;
    let positionInLine = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      
      if (currentPos <= insertPosition && insertPosition <= currentPos + lineLength) {
        // Calculate exact position within this line
        positionInLine = insertPosition - currentPos;
        
        // Check if this is a lyrics line (has actual text content)
        if (lines[i].trim()) {
          targetLyricsLineIndex = i;
          break;
        }
      }
      currentPos += lineLength;
    }
    
    if (targetLyricsLineIndex === -1) return;
    
    const lyricsLine = lines[targetLyricsLineIndex];
    
    // Handle placement after the end of line (for syncopation/tutti)
    if (positionInLine >= lyricsLine.length) {
      positionInLine = lyricsLine.length;
    }
    
    // Find or create the chord line above the lyrics line
    let chordLineIndex = targetLyricsLineIndex - 1;
    
    // Ensure there's a chord line above for chords
    if (chordLineIndex < 0 || (lines[chordLineIndex].trim() && lines[chordLineIndex].match(/[a-zA-Z]{2,}/))) {
      lines.splice(targetLyricsLineIndex, 0, '');
      chordLineIndex = targetLyricsLineIndex;
      targetLyricsLineIndex = targetLyricsLineIndex + 1;
    }
    
    // Get the current chord line
    let chordLine = lines[chordLineIndex] || '';
    
    // Use exact position from click
    let insertPos = positionInLine;
    
    // Check for existing chords and avoid collisions
    const existingChords = chordLine.match(/\S+/g) || [];
    const existingPositions = [];
    
    let searchPos = 0;
    for (const existingChord of existingChords) {
      const pos = chordLine.indexOf(existingChord, searchPos);
      if (pos !== -1) {
        existingPositions.push({
          start: pos,
          end: pos + existingChord.length,
          chord: existingChord
        });
        searchPos = pos + existingChord.length;
      }
    }
    
    // Find a safe position for the new chord
    let safePosition = insertPos;
    const chordLength = chord.length;
    
    // Check if position conflicts with existing chords
    for (const existing of existingPositions) {
      if (safePosition >= existing.start - 1 && safePosition <= existing.end + 1) {
        // If there's a conflict, try to place it right after the existing chord
        safePosition = existing.end + 1;
      }
    }
    
    // Build the new chord line with precise positioning
    const newChordLineLength = Math.max(chordLine.length, safePosition + chordLength, lyricsLine.length);
    let newChordLine = chordLine.padEnd(newChordLineLength, ' ');
    
    // Insert the chord at the exact position
    newChordLine = newChordLine.substring(0, safePosition) + 
                   chord + 
                   newChordLine.substring(safePosition + chord.length);
    
    // Clean up extra spaces at the end but preserve necessary spacing
    newChordLine = newChordLine.trimEnd();
    
    lines[chordLineIndex] = newChordLine;
    
    const newValue = lines.join('\n');
    onChange(newValue);
    
    // Restore focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(insertPosition, insertPosition);
      }
    }, 50);
  };

  return (
    <>
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
      />
      
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

export default ClickableLyricsEditor;