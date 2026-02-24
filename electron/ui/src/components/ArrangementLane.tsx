import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSectionColorConfig } from '../lib/sectionColors';

interface Section {
  id: string;
  dbId?: string;
  name: string;
  start_time: number;
  end_time: number;
  color?: string;
}

interface ArrangementLaneProps {
  sections: Section[];
  duration: number;
  currentTime: number;
  zoom: number;
  scrollLeft: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSectionClick: (section: Section) => void;
  onSectionSelect?: (section: Section | null) => void;
  onSectionUpdate: (section: Section, updates: Partial<Section>) => void;
  onSectionUpdateEnd?: (section: Section, updates: Partial<Section>) => void; // Called on drag end to save to DB
  onSectionDelete: (section: Section) => void;
  onSectionEdit: (section: Section) => void;
  onSectionRename?: (section: Section, newName: string) => void; // Called on inline rename
  onAddSection: () => void;
  currentSection?: Section | null;
  selectedSection?: Section | null;
  containerWidth?: number; // Container width for proper scaling
  showAddOnRight?: boolean;
}

function ArrangementLane({
  sections,
  duration,
  currentTime,
  zoom,
  scrollLeft,
  isExpanded,
  onToggleExpand,
  onSectionClick,
  onSectionSelect,
  onSectionUpdate,
  onSectionUpdateEnd,
  onSectionDelete,
  onSectionEdit,
  onSectionRename,
  onAddSection,
  currentSection,
  selectedSection,
  containerWidth = 800,
  showAddOnRight = true
}: ArrangementLaneProps) {
  const [dragState, setDragState] = useState<{
    section: Section;
    type: 'move' | 'start' | 'end';
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null); // For inline rename
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const [livePosition, setLivePosition] = useState<{ left: number; width: number } | null>(null);
  // Track final values for DB save on drag end
  const finalUpdatesRef = useRef<{ start_time: number; end_time: number } | null>(null);

  // At zoom 1 (100%), the entire timeline fits in the container
  const totalWidth = containerWidth * zoom;

  // Calculate grid lines based on zoom level
  const getGridLines = () => {
    const lines: { position: number; isMajor: boolean }[] = [];
    const pixelsPerSecond = (containerWidth / duration) * zoom;
    
    // Determine step size based on zoom
    let stepSeconds = 4;
    if (pixelsPerSecond > 80) stepSeconds = 2;
    if (pixelsPerSecond > 150) stepSeconds = 1;
    if (pixelsPerSecond < 30) stepSeconds = 8;
    if (pixelsPerSecond < 15) stepSeconds = 16;
    
    for (let t = 0; t <= duration; t += stepSeconds) {
      const position = (t / duration) * totalWidth;
      const isMajor = t % (stepSeconds * 4) === 0;
      lines.push({ position, isMajor });
    }
    return lines;
  };

  const gridLines = getGridLines();

  const handleMouseDown = useCallback((section: Section, type: 'move' | 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragState({
      section,
      type,
      startX: e.clientX,
      originalStart: section.start_time,
      originalEnd: section.end_time
    });
    finalUpdatesRef.current = null;
  }, []);

  // Use RAF for smooth dragging
  useEffect(() => {
    if (!dragState) {
      setLivePosition(null);
      return;
    }

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = (deltaX / totalWidth) * duration;
      
      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;
      
      if (dragState.type === 'move') {
        newStart = Math.max(0, dragState.originalStart + deltaTime);
        const sectionDuration = dragState.originalEnd - dragState.originalStart;
        newEnd = Math.min(duration, newStart + sectionDuration);
        newStart = Math.max(0, newEnd - sectionDuration);
        newEnd = newStart + sectionDuration;
      } else if (dragState.type === 'start') {
        newStart = Math.max(0, Math.min(dragState.originalEnd - 0.5, dragState.originalStart + deltaTime));
        newEnd = dragState.originalEnd;
      } else if (dragState.type === 'end') {
        newStart = dragState.originalStart;
        newEnd = Math.max(dragState.originalStart + 0.5, Math.min(duration, dragState.originalEnd + deltaTime));
      }
      
      // Update visual position immediately via state (no transition)
      const left = (newStart / duration) * totalWidth;
      const width = ((newEnd - newStart) / duration) * totalWidth;
      
      // Store final values for DB save
      finalUpdatesRef.current = { start_time: newStart, end_time: newEnd };
      
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setLivePosition({ left, width });
      });
      
      // Update local state only (no DB call during drag)
      onSectionUpdate(dragState.section, { start_time: newStart, end_time: newEnd });
    };

    const handleMouseUp = () => {
      // Save to DB on drag end
      if (dragState && finalUpdatesRef.current && onSectionUpdateEnd) {
        onSectionUpdateEnd(dragState.section, finalUpdatesRef.current);
      }
      setDragState(null);
      setLivePosition(null);
      finalUpdatesRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, totalWidth, duration, onSectionUpdate, onSectionUpdateEnd]);

  const getSectionColor = (section: Section) => {
    if (section.color) return section.color;
    return getSectionColorConfig(section.name).bg;
  };

  // Handle double-click to start inline editing
  const handleDoubleClick = useCallback((section: Section, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingSection(section.id);
    setEditingName(section.name);
  }, []);

  // Handle inline edit submit
  const handleEditSubmit = useCallback((section: Section) => {
    if (editingName.trim() && editingName !== section.name && onSectionRename) {
      onSectionRename(section, editingName.trim());
    }
    setEditingSection(null);
    setEditingName('');
  }, [editingName, onSectionRename]);

  // Handle edit key events
  const handleEditKeyDown = useCallback((section: Section, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit(section);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingSection(null);
      setEditingName('');
    }
  }, [handleEditSubmit]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSection && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSection]);

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
        <span className="text-[11px] font-medium text-[hsl(0,0%,70%)]">Arrangement</span>
        {!showAddOnRight && (
          <button
            onClick={onAddSection}
            className="ml-2 p-0.5 hover:bg-[hsl(0,0%,22%)] rounded transition-colors"
            title="Add section"
          >
            <Plus className="w-3.5 h-3.5 text-[hsl(145,60%,55%)]" />
          </button>
        )}
        <div className="flex-1" />
        {currentSection && (
          <span className="text-[10px] text-[hsl(0,0%,60%)] mr-2">
            Current: <span className="text-[hsl(145,60%,55%)] font-medium">{currentSection.name}</span>
          </span>
        )}
        {showAddOnRight && (
          <button
            onClick={onAddSection}
            className="p-0.5 hover:bg-[hsl(0,0%,22%)] rounded transition-colors"
            title="Add section"
          >
            <Plus className="w-3.5 h-3.5 text-[hsl(145,60%,55%)]" />
          </button>
        )}
      </div>
      
      {/* Lane Content */}
      {isExpanded && (
        <div 
          ref={laneRef}
          className={cn(
            "relative h-8 overflow-hidden",
            dragState ? "cursor-grabbing" : "cursor-default"
          )}
          style={{ userSelect: 'none' }}
          onClick={(e) => {
            // Deselect when clicking on empty area (not on a section)
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('absolute')) {
              onSectionSelect?.(null);
            }
          }}
        >
          <div 
            className="absolute top-0 h-full"
            style={{ 
              width: `${totalWidth}px`,
              transform: `translateX(-${scrollLeft}px)`
            }}
          >
            {/* Grid Lines */}
            {gridLines.map((line, i) => (
              <div
                key={i}
                className="absolute top-0 h-full pointer-events-none"
                style={{
                  left: `${line.position}px`,
                  width: '1px',
                  backgroundColor: line.isMajor ? 'hsl(0,0%,28%)' : 'hsl(0,0%,20%)'
                }}
              />
            ))}

            {sections.map((section, idx) => {
              const isDragging = dragState?.section.id === section.id;
              // Use live position during drag for immediate response
              const startX = isDragging && livePosition 
                ? livePosition.left 
                : (section.start_time / duration) * totalWidth;
              const width = isDragging && livePosition 
                ? livePosition.width 
                : ((section.end_time - section.start_time) / duration) * totalWidth;
              const isActive = currentSection?.id === section.id;
              const isSelected = selectedSection?.id === section.id;
              const isHovered = hoveredSection === section.id;
              const color = getSectionColor(section);

              return (
                <div
                  key={`${section.id}-${idx}`}
                  className={cn(
                    "absolute top-1 h-6 rounded select-none",
                    isActive && "ring-1 ring-white/50",
                    isSelected && "ring-2 ring-yellow-400",
                    isDragging && "shadow-lg z-20"
                  )}
                  style={{
                    left: `${startX}px`,
                    width: `${Math.max(20, width)}px`,
                    backgroundColor: color,
                    // No transition during drag for immediate response
                    transform: 'translateZ(0)', // GPU acceleration
                  }}
                  onClick={(e) => {
                    if (isDragging) return;
                    // Select section for keyboard shortcuts
                    onSectionSelect?.(section);
                    onSectionClick(section);
                  }}
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                >
                  {/* Section Label - Double-click to edit inline */}
                  {editingSection === section.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleEditSubmit(section)}
                      onKeyDown={(e) => handleEditKeyDown(section, e)}
                      className="w-full h-full px-1 py-0.5 text-[10px] font-medium text-white bg-black/40 border-none outline-none rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div 
                      className="px-2 py-0.5 text-[10px] font-medium text-white truncate drop-shadow-sm cursor-grab"
                      onMouseDown={(e) => {
                        if (e.detail === 1) {
                          handleMouseDown(section, 'move', e);
                        }
                      }}
                      onDoubleClick={(e) => handleDoubleClick(section, e)}
                    >
                      {section.name}
                    </div>
                  )}

                  {/* Start Handle - always visible on hover */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 w-2 cursor-ew-resize transition-opacity",
                      isHovered || isDragging ? "opacity-100" : "opacity-0"
                    )}
                    onMouseDown={(e) => handleMouseDown(section, 'start', e)}
                  >
                    <div className="absolute inset-y-1 left-0.5 w-1 bg-white/80 rounded" />
                  </div>

                  {/* End Handle - always visible on hover */}
                  <div
                    className={cn(
                      "absolute inset-y-0 right-0 w-2 cursor-ew-resize transition-opacity",
                      isHovered || isDragging ? "opacity-100" : "opacity-0"
                    )}
                    onMouseDown={(e) => handleMouseDown(section, 'end', e)}
                  >
                    <div className="absolute inset-y-1 right-0.5 w-1 bg-white/80 rounded" />
                  </div>

                  {/* Action Buttons */}
                  {isHovered && !isDragging && width > 60 && (
                    <div className="absolute top-0.5 right-1 flex gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionEdit(section);
                        }}
                        className="p-0.5 rounded bg-black/30 hover:bg-black/50"
                        title="Edit section"
                      >
                        <Edit2 className="w-2.5 h-2.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSectionDelete(section);
                        }}
                        className="p-0.5 rounded bg-black/30 hover:bg-red-500/50"
                        title="Delete section"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-white" />
                      </button>
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

export default React.memo(ArrangementLane);
