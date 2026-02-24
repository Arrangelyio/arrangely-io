import { useState, useRef, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TempoPoint {
  id: string;
  time: number;
  tempo: number;
}

interface TempoLaneProps {
  duration: number;
  currentTime: number;
  baseTempo: number;
  zoom: number;
  scrollLeft: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  tempoPoints?: TempoPoint[];
  onTempoPointAdd?: (time: number, tempo: number) => void;
  onTempoPointUpdate?: (id: string, updates: Partial<TempoPoint>) => void;
  onTempoPointDelete?: (id: string) => void;
  containerWidth?: number; // Container width for proper scaling
}

export default function TempoLane({
  duration,
  currentTime,
  baseTempo,
  zoom,
  scrollLeft,
  isExpanded,
  onToggleExpand,
  tempoPoints = [],
  onTempoPointAdd,
  onTempoPointUpdate,
  onTempoPointDelete,
  containerWidth = 800
}: TempoLaneProps) {
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [draggedPoint, setDraggedPoint] = useState<{ id: string; startY: number; originalTempo: number } | null>(null);
  const laneRef = useRef<HTMLDivElement>(null);

  // At zoom 1 (100%), the entire timeline fits in the container
  const totalWidth = containerWidth * zoom;

  // Calculate tempo at any given time (linear interpolation between points)
  const getTempoAtTime = (time: number): number => {
    if (tempoPoints.length === 0) return baseTempo;
    
    const sortedPoints = [...tempoPoints].sort((a, b) => a.time - b.time);
    
    // Before first point
    if (time <= sortedPoints[0].time) return sortedPoints[0].tempo;
    
    // After last point
    if (time >= sortedPoints[sortedPoints.length - 1].time) {
      return sortedPoints[sortedPoints.length - 1].tempo;
    }
    
    // Find surrounding points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      if (time >= sortedPoints[i].time && time <= sortedPoints[i + 1].time) {
        const t = (time - sortedPoints[i].time) / (sortedPoints[i + 1].time - sortedPoints[i].time);
        return sortedPoints[i].tempo + t * (sortedPoints[i + 1].tempo - sortedPoints[i].tempo);
      }
    }
    
    return baseTempo;
  };

  // Generate tempo curve path
  const tempoPath = useMemo(() => {
    if (tempoPoints.length === 0) {
      const y = 100 - ((baseTempo - 60) / (200 - 60)) * 100;
      return `M 0 ${y} L ${totalWidth} ${y}`;
    }

    const sortedPoints = [...tempoPoints].sort((a, b) => a.time - b.time);
    const minTempo = 60;
    const maxTempo = 200;
    const range = maxTempo - minTempo;

    let path = '';
    
    // Start from left edge
    const firstY = 100 - ((sortedPoints[0].tempo - minTempo) / range) * 100;
    path = `M 0 ${firstY}`;
    
    // Draw to each point
    sortedPoints.forEach((point, index) => {
      const x = (point.time / duration) * totalWidth;
      const y = 100 - ((point.tempo - minTempo) / range) * 100;
      
      if (index === 0) {
        path += ` L ${x} ${y}`;
      } else {
        // Step change (instant tempo change)
        path += ` L ${x} ${y}`;
      }
    });
    
    // Extend to right edge
    path += ` L ${totalWidth} ${100 - ((sortedPoints[sortedPoints.length - 1].tempo - minTempo) / range) * 100}`;
    
    return path;
  }, [tempoPoints, duration, totalWidth, baseTempo]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!laneRef.current || !onTempoPointAdd) return;
    const rect = laneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
    const time = (x / totalWidth) * duration;
    onTempoPointAdd(time, baseTempo);
  };

  const handlePointDragStart = (id: string, tempo: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedPoint({ id, startY: e.clientY, originalTempo: tempo });
  };

  const handlePointDrag = (e: React.MouseEvent) => {
    if (!draggedPoint || !onTempoPointUpdate) return;
    const deltaY = draggedPoint.startY - e.clientY;
    const deltaTempo = (deltaY / 60) * 20; // 20 BPM per 60px
    const newTempo = Math.max(60, Math.min(200, draggedPoint.originalTempo + deltaTempo));
    onTempoPointUpdate(draggedPoint.id, { tempo: newTempo });
  };

  const handlePointDragEnd = () => {
    setDraggedPoint(null);
  };

  const currentTempo = getTempoAtTime(currentTime);

  return (
    <div className="bg-[hsl(0,0%,14%)] border-b border-[hsl(0,0%,22%)]">
      {/* Lane Header */}
      <div className="flex items-center h-6 px-2 bg-[hsl(0,0%,12%)] border-b border-[hsl(0,0%,20%)]">
        <button
          onClick={onToggleExpand}
          className="p-0.5 hover:bg-[hsl(0,0%,22%)] rounded transition-colors mr-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[hsl(0,0%,60%)]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[hsl(0,0%,60%)]" />
          )}
        </button>
        <span className="text-[11px] font-medium text-[hsl(0,0%,70%)] flex-1">Tempo</span>
        <span className="text-[10px] font-mono text-primary mr-2">
          {Math.round(currentTempo)} BPM
        </span>
      </div>
      
      {/* Lane Content */}
      {isExpanded && (
        <div 
          ref={laneRef}
          className="relative h-16 overflow-hidden cursor-crosshair"
          onDoubleClick={handleDoubleClick}
          onMouseMove={handlePointDrag}
          onMouseUp={handlePointDragEnd}
          onMouseLeave={handlePointDragEnd}
        >
          {/* Tempo Scale */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-[hsl(0,0%,10%)] border-r border-[hsl(0,0%,22%)] z-10 flex flex-col justify-between py-1 text-[8px] text-[hsl(0,0%,50%)] font-mono">
            <span className="px-1">200</span>
            <span className="px-1">130</span>
            <span className="px-1">60</span>
          </div>

          <div 
            className="absolute top-0 left-8 h-full"
            style={{ 
              width: `${totalWidth}px`,
              transform: `translateX(-${scrollLeft}px)`
            }}
          >
            {/* Grid lines */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <pattern id="tempo-grid" width="50" height="100%" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="100%" stroke="hsl(0,0%,20%)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tempo-grid)" />
              {/* Horizontal grid lines */}
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="hsl(0,0%,20%)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="hsl(0,0%,25%)" strokeWidth="0.5" />
              <line x1="0" y1="75%" x2="100%" y2="75%" stroke="hsl(0,0%,20%)" strokeWidth="0.5" strokeDasharray="4" />
            </svg>

            {/* Tempo curve */}
            <svg 
              className="absolute inset-0 w-full h-full" 
              viewBox={`0 0 ${totalWidth} 100`}
              preserveAspectRatio="none"
            >
              <path
                d={tempoPath}
                fill="none"
                stroke="hsl(38, 92%, 50%)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Tempo points */}
            {tempoPoints.map((point) => {
              const x = (point.time / duration) * totalWidth;
              const y = (1 - (point.tempo - 60) / (200 - 60)) * 100;
              const isHovered = hoveredPoint === point.id;

              return (
                <div
                  key={point.id}
                  className={cn(
                    "absolute w-3 h-3 rounded-full border-2 cursor-ns-resize transition-transform z-10",
                    isHovered ? "scale-125" : ""
                  )}
                  style={{
                    left: `${x}px`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'hsl(38, 92%, 50%)',
                    borderColor: 'hsl(38, 92%, 70%)',
                  }}
                  onMouseEnter={() => setHoveredPoint(point.id)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onMouseDown={(e) => handlePointDragStart(point.id, point.tempo, e)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onTempoPointDelete?.(point.id);
                  }}
                  title={`${Math.round(point.tempo)} BPM - Double-click to delete`}
                >
                  {isHovered && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1 py-0.5 bg-[hsl(0,0%,20%)] rounded text-[9px] font-mono text-white whitespace-nowrap">
                      {Math.round(point.tempo)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 h-full w-0.5 bg-primary pointer-events-none z-10"
              style={{ left: `${(currentTime / duration) * totalWidth}px` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
