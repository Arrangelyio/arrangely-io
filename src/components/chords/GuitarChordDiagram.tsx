import React from 'react';
import { getChordData } from '@/lib/chordDatabase';
import { AlertCircle } from 'lucide-react';

interface GuitarChordDiagramProps {
  chord: string;
  className?: string;
}

const GuitarChordDiagram: React.FC<GuitarChordDiagramProps> = ({ chord, className = "" }) => {
  const chordInfo = getChordData(chord);
  const chordData = chordInfo?.guitar;

  if (!chordData) {
    return (
      <div className={`flex flex-col items-center p-3 bg-card border rounded-lg ${className}`}>
        <h3 className="text-sm font-semibold mb-3 text-foreground">{chord}</h3>
        <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
          <AlertCircle className="h-6 w-6 mb-2" />
          <p className="text-xs text-center">Chord diagram<br />not available</p>
        </div>
      </div>
    );
  }

  // Cari fret terkecil & terbesar
  const numericFrets = chordData.frets.filter(f => typeof f === "number") as number[];
  const minFret = Math.min(...numericFrets.filter(f => f > 0));
  const maxFret = Math.max(...numericFrets);

  // Kalau fret > 4, geser; kalau tidak, tetap mulai dari 1
  const useOffset = maxFret > 4;
  const startFret = useOffset ? minFret : 1;
  const fretCount = 4; // jumlah fret grid

  return (
    <div className={`flex flex-col items-center p-3 bg-card border rounded-lg ${className}`}>
      <h3 className="text-sm font-semibold mb-3 text-foreground">{chord}</h3>

      <div className="relative">
        <svg width="80" height="100" className="border border-border rounded">
          {/* Garis fret (horizontal) */}
          {Array.from({ length: fretCount + 1 }, (_, i) => (
            <line
              key={i}
              x1="10"
              y1={20 + i * 16}
              x2="70"
              y2={20 + i * 16}
              stroke="currentColor"
              strokeWidth={i === 0 && !useOffset ? "2" : "1"}
              className="text-muted-foreground"
            />
          ))}

          {/* Garis senar (vertical) */}
          {[0, 1, 2, 3, 4, 5].map(string => (
            <line
              key={string}
              x1={10 + string * 12}
              y1="20"
              x2={10 + string * 12}
              y2={20 + fretCount * 16}
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
          ))}

          {/* Titik fret */}
          {chordData.frets.map((fret: number | string, index: number) => {
            if (fret === 'x') {
              return (
                <text
                  key={index}
                  x={10 + index * 12}
                  y="15"
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-destructive font-semibold"
                >
                  ×
                </text>
              );
            }
            if (fret === 0) {
              return (
                <circle
                  key={index}
                  cx={10 + index * 12}
                  cy="12"
                  r="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary"
                />
              );
            }

            const fretNum = fret as number;
            const relativeFret = useOffset ? fretNum - startFret + 1 : fretNum;

            return (
              <circle
                key={index}
                cx={10 + index * 12}
                cy={20 + (relativeFret - 0.5) * 16}
                r="5"
                className="fill-primary"
              />
            );
          })}
        </svg>

        {/* Label fret number kalau offset */}
        {useOffset && (
          <div className="absolute -right-6 top-4 text-xs text-muted-foreground">
            {startFret}fr
          </div>
        )}

        {/* Label senar */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-[10px] w-full">
          <span>E</span>
          <span>A</span>
          <span>D</span>
          <span>G</span>
          <span>B</span>
          <span>E</span>
        </div>
      </div>
    </div>
  );
};

export default GuitarChordDiagram;
