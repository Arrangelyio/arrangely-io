import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ChordEditorProps {
  value: string;
  onChange: (value: string) => void;
  referenceLyrics: string;
  sectionType: string;
}

const ChordEditor = ({ value, onChange, referenceLyrics, sectionType }: ChordEditorProps) => {
  const handleChordInsert = (chord: string) => {
    const textarea = document.getElementById('chord-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = value;
      const newValue = currentValue.substring(0, start) + chord + ' ' + currentValue.substring(end);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + chord.length + 1, start + chord.length + 1);
      }, 0);
    }
  };

  const addChordLine = () => {
    const textarea = document.getElementById('chord-editor') as HTMLTextAreaElement;
    if (textarea) {
      const lines = value.split('\n');
      const cursorPos = textarea.selectionStart;
      const beforeCursor = value.substring(0, cursorPos);
      const linesBefore = beforeCursor.split('\n');
      const currentLineIndex = linesBefore.length - 1;
      
      // Add a blank line for chords above current line
      lines.splice(currentLineIndex, 0, '');
      onChange(lines.join('\n'));
    }
  };

  const copyReferenceLyrics = () => {
    onChange(referenceLyrics);
  };

  const clearAll = () => {
    onChange('');
  };

  return (
    <div className="space-y-6">
      {/* Chord Editor */}
      <div>
        <Label className="text-base font-semibold">🎵 Chord & Lyric Arrangement</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Type chords and lyrics together. Use spaces to align chords above the right words.
        </p>
        <div className="relative">
          <Textarea
            id="chord-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Example format:

G                Em
Ku Dibri Kuasa Dari Raja Mulia
C           G/B        Am        D
Menaklukkan Musuh Di Bawah Kakiku

G                Em
Kupakai Kuasa Dari Raja Mulia
C           G/B           C        D
Bila Allah Ada Bersamaku Siapa Jadi Lawanku`}
            className="min-h-[300px] font-mono text-sm leading-relaxed resize-none border-2 border-primary/20 focus:border-primary/40 bg-background"
            style={{ 
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              lineHeight: '1.8',
              letterSpacing: '0.5px'
            }}
          />
          <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background px-2 py-1 rounded">
            Monospace Font for Perfect Alignment
          </div>
        </div>
      </div>
      
      {/* Reference Lyrics */}
      <div>
        <Label className="text-base font-semibold">📄 Reference Lyrics (from Step 2)</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Copy these lyrics above and add chord symbols where they should be played
        </p>
        <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono border-2 border-dashed border-border leading-relaxed">
          {referenceLyrics}
        </div>
      </div>

      {/* Alignment Helper */}
      <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
        <h4 className="font-semibold text-accent mb-2 flex items-center gap-2">
          🎯 Alignment Guide
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Place chords directly above the syllable where they should be played</p>
          <p>• Use spaces to align chords with lyrics (monospace font helps!)</p>
          <p>• Leave blank lines between song sections for clarity</p>
          <p>• Use chord symbols like: C, Am, F, G7, Cadd9, C/E</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={addChordLine}>
          + Add Chord Line
        </Button>
        
        <Button variant="outline" size="sm" onClick={copyReferenceLyrics}>
          📋 Copy Reference Lyrics
        </Button>
        
        <Button variant="outline" size="sm" onClick={clearAll}>
          🗑️ Clear All
        </Button>
      </div>
    </div>
  );
};

export default ChordEditor;