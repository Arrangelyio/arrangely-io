import { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface TimeRulerProps {
  duration: number;
  tempo: number;
  timeSignature: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export default function TimeRuler({ 
  duration, 
  tempo, 
  timeSignature,
  zoom = 1,
  onZoomChange 
}: TimeRulerProps) {
  const [internalZoom, setInternalZoom] = useState(1);
  const currentZoom = onZoomChange ? zoom : internalZoom;
  
  const beatsPerBar = parseInt(timeSignature?.split('/')[0] || '4');
  const secondsPerBeat = 60 / tempo;
  const secondsPerBar = secondsPerBeat * beatsPerBar;

  const handleZoomIn = () => {
    const newZoom = Math.min(currentZoom * 1.5, 8);
    if (onZoomChange) {
      onZoomChange(newZoom);
    } else {
      setInternalZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(currentZoom / 1.5, 0.25);
    if (onZoomChange) {
      onZoomChange(newZoom);
    } else {
      setInternalZoom(newZoom);
    }
  };

  const markers = useMemo(() => {
    if (!duration || !tempo) return [];
    
    const result: { position: number; label: string; type: 'bar' | 'beat' | 'time' }[] = [];
    const totalBars = Math.ceil(duration / secondsPerBar);
    
    // Dynamic bar interval: keep markers readable, use power-of-two jumps (1, 2, 4, 8, 16, 32, ...)
    const maxMarkers = 60; // soft cap to avoid clutter
    const baseIntervalPow = Math.max(0, Math.ceil(Math.log2(totalBars / maxMarkers)));
    let barInterval = Math.pow(2, baseIntervalPow);

    // Zooming in halves the interval; zooming out lets the power-of-two jump dominate
    if (currentZoom >= 4) {
      barInterval = Math.max(1, barInterval / 4);
    } else if (currentZoom >= 2) {
      barInterval = Math.max(1, barInterval / 2);
    } else if (currentZoom < 0.75) {
      // Extra spacing when very zoomed out
      barInterval = Math.max(barInterval, 8);
    }

    const showBeats = currentZoom >= 2 && barInterval <= 2;
    
    // Add bar markers
    for (let bar = 0; bar <= totalBars; bar += barInterval) {
      const time = bar * secondsPerBar;
      if (time <= duration) {
        result.push({
          position: (time / duration) * 100,
          label: `${bar + 1}`,
          type: 'bar'
        });
      }
    }
    
    // Add beat markers if zoomed in enough
    if (showBeats && totalBars < 100) {
      for (let bar = 0; bar < totalBars; bar++) {
        for (let beat = 1; beat < beatsPerBar; beat++) {
          const time = bar * secondsPerBar + beat * secondsPerBeat;
          if (time <= duration) {
            result.push({
              position: (time / duration) * 100,
              label: '',
              type: 'beat'
            });
          }
        }
      }
    }
    
    return result.sort((a, b) => a.position - b.position);
  }, [duration, tempo, secondsPerBar, secondsPerBeat, beatsPerBar, currentZoom]);

  return (
    <div className="relative h-6 bg-secondary/60 border-b border-border select-none flex">
      {/* Zoom Controls */}
      <div className="flex items-center gap-1 px-2 border-r border-border/50 bg-secondary/80">
        <button
          onClick={handleZoomOut}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground w-8 text-center">
          {Math.round(currentZoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      
      {/* Ruler Area */}
      <div className="flex-1 relative overflow-hidden">
        {markers.map((marker, index) => (
          <div
            key={`${marker.type}-${index}`}
            className="absolute top-0 h-full flex flex-col items-center"
            style={{ left: `${marker.position}%` }}
          >
            {/* Tick mark */}
            <div 
              className={`${
                marker.type === 'bar' 
                  ? 'w-px h-3 bg-foreground/40' 
                  : 'w-px h-2 bg-border/60'
              }`} 
            />
            {/* Label */}
            {marker.type === 'bar' && marker.label && (
              <span 
                className="text-[10px] font-mono text-muted-foreground/80 -translate-x-1/2 whitespace-nowrap"
              >
                {marker.label}
              </span>
            )}
          </div>
        ))}
        
        {/* Time overlay at edges */}
        <div className="absolute top-1 right-2 text-[9px] font-mono text-muted-foreground/60">
          {formatDuration(duration)}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
