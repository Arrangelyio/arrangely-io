import React from 'react';
import { getChordData } from '@/lib/chordDatabase';
import { AlertCircle } from 'lucide-react';

interface PianoChordDiagramProps {
  chord: string;
  className?: string;
}

const PianoChordDiagram: React.FC<PianoChordDiagramProps> = ({ chord, className = "" }) => {
  // Get chord data from database or generate algorithmically
  const chordInfo = getChordData(chord);
  const notes = chordInfo?.piano?.notes;

  // Fallback if no piano data found
  if (!notes || notes.length === 0) {
    return (
      <div className={`flex flex-col items-center p-3 bg-card border rounded-lg ${className}`}>
        <h3 className="text-sm font-semibold mb-3 text-foreground">{chord}</h3>
        <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mb-2" />
          <p className="text-xs text-center">Chord diagram<br />not available</p>
        </div>
      </div>
    );
  }

  // Define piano keys layout
  const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const blackKeys = ['C#', 'D#', 'F#', 'G#', 'A#'];
  const blackKeyPositions = [0.5, 1.5, 3.5, 4.5, 5.5]; // Position relative to white keys

  const isKeyPressed = (key: string) => {
    // Menghapus nomor oktaf dari notes (misal "C4" menjadi "C")
    const simplifiedNotes = notes.map((n: string) => n.replace(/[0-9]/g, ''));
    return simplifiedNotes.some((note: string) => 
      note === key || 
      (note === 'Db' && key === 'C#') ||
      (note === 'Eb' && key === 'D#') ||
      (note === 'Gb' && key === 'F#') ||
      (note === 'Ab' && key === 'G#') ||
      (note === 'Bb' && key === 'A#')
    );
  };

  return (
    <div className={`flex flex-col items-center p-3 bg-card border rounded-lg ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-foreground">{chord}</h3>
      
      {/* Piano keyboard */}
      <div className="relative">
        <svg width="140" height="80" className="border border-border rounded">
          {/* White keys */}
          {whiteKeys.map((key, index) => (
            <rect
              key={key}
              x={index * 20}
              y="0"
              width="19"
              height="80"
              fill={isKeyPressed(key) ? "hsl(var(--primary))" : "white"}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              className={isKeyPressed(key) ? "opacity-80" : ""}
            />
          ))}
          
          {/* Black keys */}
          {blackKeys.map((key, index) => (
            <rect
              key={key}
              x={blackKeyPositions[index] * 20 - 7}
              y="0"
              width="14"
              height="50"
              fill={isKeyPressed(key) ? "hsl(var(--primary))" : "hsl(var(--foreground))"}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              className={isKeyPressed(key) ? "opacity-80" : ""}
            />
          ))}
          
          {/* Key labels on white keys */}
          {whiteKeys.map((key, index) => (
            <text
              key={`label-${key}`}
              x={index * 20 + 10}
              y="70"
              textAnchor="middle"
              fontSize="10"
              className={`${isKeyPressed(key) ? 'fill-primary-foreground' : 'fill-muted-foreground'} font-medium`}
            >
              {key}
            </text>
          ))}
        </svg>
        
        {/* Chord notes display */}
        <div className="mt-2 text-center">
          <div className="text-xs text-muted-foreground">Notes:</div>
          <div className="text-sm font-medium text-foreground">
            {notes.map((n: string) => n.replace(/[0-9]/g, '')).join(' - ')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PianoChordDiagram;