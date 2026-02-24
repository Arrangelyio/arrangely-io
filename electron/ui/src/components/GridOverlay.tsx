import { useMemo } from 'react';

interface GridOverlayProps {
  duration: number;
  tempo: number;
  timeSignature: string;
  zoom?: number;
}

export default function GridOverlay({ duration, tempo, timeSignature, zoom = 1 }: GridOverlayProps) {
  const beatsPerBar = parseInt(timeSignature?.split('/')[0] || '4');
  const secondsPerBeat = 60 / tempo;
  const secondsPerBar = secondsPerBeat * beatsPerBar;

  const gridLines = useMemo(() => {
    if (!duration || !tempo) return [];
    
    const lines: { position: number; type: 'bar' | 'beat' | 'subdivision' }[] = [];
    const totalBars = Math.ceil(duration / secondsPerBar);
    
    // Determine grid density based on zoom
    const barInterval = zoom < 0.5 ? 4 : zoom < 1 ? 2 : 1;
    const showBeats = zoom >= 1;
    const showSubdivisions = zoom >= 3;
    
    // Add bar lines (major)
    for (let bar = 0; bar <= totalBars; bar += barInterval) {
      const time = bar * secondsPerBar;
      if (time <= duration) {
        lines.push({
          position: (time / duration) * 100,
          type: 'bar'
        });
      }
    }
    
    // Add beat lines (minor) - only at reasonable zoom
    if (showBeats && totalBars < 80) {
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 1; beat < beatsPerBar; beat++) {
          const time = bar * secondsPerBar + beat * secondsPerBeat;
          if (time <= duration) {
            lines.push({
              position: (time / duration) * 100,
              type: 'beat'
            });
          }
        }
      }
    }
    
    // Add subdivision lines at high zoom
    if (showSubdivisions && totalBars < 30) {
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 0; beat < beatsPerBar; beat++) {
          for (let sub = 1; sub < 4; sub++) {
            const time = bar * secondsPerBar + beat * secondsPerBeat + (sub * secondsPerBeat / 4);
            if (time <= duration) {
              lines.push({
                position: (time / duration) * 100,
                type: 'subdivision'
              });
            }
          }
        }
      }
    }
    
    return lines;
  }, [duration, tempo, secondsPerBar, secondsPerBeat, beatsPerBar, zoom]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {gridLines.map((line, index) => (
        <div
          key={`${line.type}-${index}`}
          className={`absolute top-0 h-full ${
            line.type === 'bar' 
              ? 'w-px bg-border/50' 
              : line.type === 'beat'
              ? 'w-px bg-border/25'
              : 'w-px bg-border/10'
          }`}
          style={{ left: `${line.position}%` }}
        />
      ))}
    </div>
  );
}
