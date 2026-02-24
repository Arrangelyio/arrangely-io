import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ControlBarRulerProps {
  duration: number;
  tempo: number;
  timeSignature: string;
  currentTime: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSeek: (time: number) => void;
  scrollLeft?: number;
  onScrollChange?: (scrollLeft: number) => void;
  containerWidth?: number; // Container width for proper scaling
}

export default function ControlBarRuler({
  duration,
  tempo,
  timeSignature,
  currentTime,
  zoom,
  onZoomChange,
  onSeek,
  scrollLeft = 0,
  onScrollChange,
  containerWidth = 800
}: ControlBarRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const beatsPerBar = parseInt(timeSignature?.split('/')[0] || '4');
  const beatUnit = parseInt(timeSignature?.split('/')[1] || '4');
  const secondsPerBeat = 60 / tempo;
  const secondsPerBar = secondsPerBeat * beatsPerBar;
  
  // At zoom 1 (100%), the entire timeline fits in the container
  // When zooming in, the timeline becomes wider than container, enabling scroll
  const totalWidth = useMemo(() => {
    return containerWidth * zoom;
  }, [containerWidth, zoom]);

  // Generate bar/beat markers with adaptive density (DAW-style skipping)
  const markers = useMemo(() => {
    if (!duration || !tempo) return [];
    
    const result: { position: number; label: string; type: 'bar' | 'beat' | 'subbeat' }[] = [];
    const totalBars = Math.ceil(duration / secondsPerBar);
    
    // Adaptive bar interval using power-of-two jumps to avoid clutter when zoomed out
    const maxMarkers = 80;
    const basePow = Math.max(0, Math.ceil(Math.log2(totalBars / maxMarkers)));
    let barInterval = Math.pow(2, basePow);

    // Zoom adjustments: zoom-in halves interval; zoom-out keeps it coarse
    if (zoom >= 4) {
      barInterval = Math.max(1, barInterval / 4);
    } else if (zoom >= 2) {
      barInterval = Math.max(1, barInterval / 2);
    } else if (zoom < 0.75) {
      barInterval = Math.max(barInterval, 8);
    }

    const showBeats = zoom >= 1 && barInterval <= 2;
    const showSubbeats = zoom >= 4 && barInterval === 1;
    
    for (let bar = 0; bar <= totalBars; bar += barInterval) {
      const barTime = bar * secondsPerBar;
      if (barTime <= duration) {
        result.push({
          position: barTime,
          label: `${bar + 1}`,
          type: 'bar'
        });
        
        // Add beat markers
        if (showBeats && barInterval === 1) {
          for (let beat = 1; beat < beatsPerBar; beat++) {
            const beatTime = barTime + beat * secondsPerBeat;
            if (beatTime <= duration) {
              result.push({
                position: beatTime,
                label: showSubbeats ? `${bar + 1}.${beat + 1}` : '',
                type: 'beat'
              });
            }
          }
        }
      }
    }
    
    return result;
  }, [duration, tempo, secondsPerBar, secondsPerBeat, beatsPerBar, zoom]);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom * 1.5, 16));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom / 1.5, 1)); // Minimum 100%
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeekFromEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleSeekFromEvent(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSeekFromEvent = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const progress = x / totalWidth;
    const newTime = Math.max(0, Math.min(duration, progress * duration));
    onSeek(newTime);
  };

  // Calculate playhead position
  const playheadPosition = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * totalWidth;
  }, [currentTime, duration, totalWidth]);

  return (
    <div className="flex items-stretch bg-[hsl(0,0%,12%)] border-b border-[hsl(0,0%,22%)]">
      {/* Scrollable Ruler - full width now that zoom controls moved to transport bar */}
      <div 
        ref={rulerRef}
        className="flex-1 relative overflow-hidden cursor-pointer h-6 select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Ruler Content */}
        <div 
          className="absolute top-0 h-full"
          style={{ 
            width: `${totalWidth}px`,
            transform: `translateX(-${scrollLeft}px)`
          }}
        >
          {markers.map((marker, index) => {
            const x = (marker.position / duration) * totalWidth;
            return (
              <div
                key={`${marker.type}-${index}`}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${x}px` }}
              >
                {/* Tick mark */}
                <div 
                  className={cn(
                    "absolute top-0",
                    marker.type === 'bar' 
                      ? 'w-px h-full bg-[hsl(0,0%,40%)]' 
                      : marker.type === 'beat'
                        ? 'w-px h-3 bg-[hsl(0,0%,30%)]'
                        : 'w-px h-2 bg-[hsl(0,0%,25%)]'
                  )} 
                />
                {/* Label */}
                {marker.label && (
                  <span 
                    className={cn(
                      "absolute font-mono whitespace-nowrap",
                      marker.type === 'bar'
                        ? 'top-1.5 left-1 text-[10px] text-[hsl(0,0%,65%)]'
                        : 'top-0.5 left-0.5 text-[8px] text-[hsl(0,0%,45%)]'
                    )}
                  >
                    {marker.label}
                  </span>
                )}
              </div>
            );
          })}
          
          {/* Playhead */}
          <div
            className="absolute top-0 h-full w-0.5 bg-primary z-10"
            style={{ left: `${playheadPosition}px` }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
