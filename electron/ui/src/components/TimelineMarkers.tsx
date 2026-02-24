import { useState, useRef, useCallback } from 'react';
import { Edit2, Trash2, GripVertical } from 'lucide-react';

interface TimelineMarkersProps {
  sections: any[];
  duration: number;
  currentTime: number;
  onSectionClick: (section: any) => void;
  onSectionUpdate: (section: any, updates: any) => void;
  onSectionUpdateEnd?: (section: any, updates: any) => void; // Called on drag end to save to DB
  onSectionDelete: (section: any) => void;
  onSectionEdit?: (section: any) => void;
  currentSection?: any;
}

export default function TimelineMarkers({
  sections,
  duration,
  currentTime,
  onSectionClick,
  onSectionUpdate,
  onSectionUpdateEnd,
  onSectionDelete,
  onSectionEdit,
  currentSection
}: TimelineMarkersProps) {
  const [draggedMarker, setDraggedMarker] = useState<{ section: any; type: 'start' | 'end'; initialValues: { start_time: number; end_time: number } } | null>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  // Track current drag values for DB save on end
  const dragUpdatesRef = useRef<{ start_time?: number; end_time?: number } | null>(null);

  const handleMarkerDragStart = useCallback((section: any, type: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedMarker({ 
      section, 
      type,
      initialValues: { start_time: section.start_time, end_time: section.end_time }
    });
    dragUpdatesRef.current = null;
  }, []);

  const handleMarkerDrag = useCallback((e: React.MouseEvent) => {
    if (!draggedMarker || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const newTime = progress * duration;

    const updates: { start_time?: number; end_time?: number } = {};
    if (draggedMarker.type === 'start') {
      updates.start_time = Math.min(newTime, draggedMarker.section.end_time - 1);
    } else {
      updates.end_time = Math.max(newTime, draggedMarker.section.start_time + 1);
    }

    // Store for DB save on drag end
    dragUpdatesRef.current = { ...dragUpdatesRef.current, ...updates };
    
    // Only update local state (no DB call during drag)
    onSectionUpdate(draggedMarker.section, updates);
  }, [draggedMarker, duration, onSectionUpdate]);

  const handleMarkerDragEnd = useCallback(() => {
    // Save to DB only on drag end
    if (draggedMarker && dragUpdatesRef.current && onSectionUpdateEnd) {
      onSectionUpdateEnd(draggedMarker.section, dragUpdatesRef.current);
    }
    setDraggedMarker(null);
    dragUpdatesRef.current = null;
  }, [draggedMarker, onSectionUpdateEnd]);

  return (
    <div
      ref={timelineRef}
      className={`absolute inset-0 ${draggedMarker ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onMouseMove={draggedMarker ? handleMarkerDrag : undefined}
      onMouseUp={draggedMarker ? handleMarkerDragEnd : undefined}
      onMouseLeave={draggedMarker ? handleMarkerDragEnd : undefined}
    >
      {/* Section Regions */}
      {sections.map((section, idx) => {
        const startPercent = (section.start_time / duration) * 100;
        const widthPercent = ((section.end_time - section.start_time) / duration) * 100;
        const isActive = currentSection?.id === section.id;
        const isDragging = draggedMarker?.section.id === section.id;

        return (
          <div
            key={`${section.id}-${idx}`}
            className={`absolute inset-y-0 pointer-events-auto cursor-pointer ${
              isDragging 
                ? 'bg-primary/40 ring-2 ring-primary/50' 
                : isActive 
                  ? 'bg-primary/30' 
                  : 'bg-muted/40 hover:bg-muted/60'
            }`}
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
              transition: isDragging ? 'none' : 'background-color 150ms'
            }}
            onClick={() => !draggedMarker && onSectionClick(section)}
            onMouseEnter={() => !draggedMarker && setHoveredMarker(section.id)}
            onMouseLeave={() => !draggedMarker && setHoveredMarker(null)}
          >
            {/* Section Label */}
            <div className="absolute top-1 left-1 text-[10px] font-semibold bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded pointer-events-none select-none">
              {section.name}
            </div>

            {/* Start Marker Handle */}
            <div
              className="absolute inset-y-0 -left-0.5 w-3 cursor-ew-resize group z-10"
              onMouseDown={(e) => handleMarkerDragStart(section, 'start', e)}
            >
              <div className={`h-full w-1 ${isDragging && draggedMarker?.type === 'start' ? 'bg-primary w-1.5' : isActive ? 'bg-primary' : 'bg-border'} group-hover:bg-primary group-hover:w-1.5 transition-all`} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded p-0.5">
                <GripVertical className="w-3 h-3 text-primary" />
              </div>
            </div>

            {/* End Marker Handle */}
            <div
              className="absolute inset-y-0 -right-0.5 w-3 cursor-ew-resize group z-10"
              onMouseDown={(e) => handleMarkerDragStart(section, 'end', e)}
            >
              <div className={`h-full w-1 ${isDragging && draggedMarker?.type === 'end' ? 'bg-primary w-1.5' : isActive ? 'bg-primary' : 'bg-border'} group-hover:bg-primary group-hover:w-1.5 transition-all`} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded p-0.5">
                <GripVertical className="w-3 h-3 text-primary" />
              </div>
            </div>

            {/* Action Buttons */}
            {hoveredMarker === section.id && !draggedMarker && (
              <div className="absolute top-1 right-1 flex gap-1 bg-background/90 backdrop-blur-sm rounded border border-border p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionEdit?.(section);
                  }}
                  className="p-1 rounded hover:bg-muted"
                  title="Edit section"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSectionDelete(section);
                  }}
                  className="p-1 rounded hover:bg-destructive/20"
                  title="Delete section"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
