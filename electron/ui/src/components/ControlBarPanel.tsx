import React, { useState, useRef, useEffect, useCallback } from 'react';
import ControlBarRuler from './ControlBarRuler';
import ArrangementLane from './ArrangementLane';
import TempoLane from './TempoLane';

interface Section {
  id: string;
  dbId?: string;
  name: string;
  start_time: number;
  end_time: number;
  color?: string;
}

interface TempoPoint {
  id: string;
  time: number;
  tempo: number;
}

interface ControlBarPanelProps {
  duration: number;
  tempo: number;
  timeSignature: string;
  currentTime: number;
  sections: Section[];
  currentSection?: Section | null;
  selectedSection?: Section | null;
  onSectionClick: (section: Section) => void;
  onSectionSelect?: (section: Section | null) => void;
  onSectionUpdate: (section: Section, updates: Partial<Section>) => void;
  onSectionUpdateEnd?: (section: Section, updates: Partial<Section>) => void; // Called on drag end to save to DB
  onSectionDelete: (section: Section) => void;
  onSectionEdit: (section: Section) => void;
  onSectionRename?: (section: Section, newName: string) => void; // Called on inline rename
  onAddSection: () => void;
  onSeek: (time: number) => void;
  tempoPoints?: TempoPoint[];
  onTempoPointAdd?: (time: number, tempo: number) => void;
  onTempoPointUpdate?: (id: string, updates: Partial<TempoPoint>) => void;
  onTempoPointDelete?: (id: string) => void;
  // Expose zoom/scroll for external components
  onZoomChange?: (zoom: number) => void;
  onScrollChange?: (scrollLeft: number) => void;
  externalZoom?: number;
  externalScrollLeft?: number;
  // External container width for synchronized playhead
  externalContainerWidth?: number;
  onContainerWidthChange?: (width: number) => void;
}

function ControlBarPanel({
  duration,
  tempo,
  timeSignature,
  currentTime,
  sections,
  currentSection,
  selectedSection,
  onSectionClick,
  onSectionSelect,
  onSectionUpdate,
  onSectionUpdateEnd,
  onSectionDelete,
  onSectionEdit,
  onSectionRename,
  onAddSection,
  onSeek,
  tempoPoints = [],
  onTempoPointAdd,
  onTempoPointUpdate,
  onTempoPointDelete,
  onZoomChange,
  onScrollChange,
  externalZoom,
  externalScrollLeft,
  externalContainerWidth,
  onContainerWidthChange
}: ControlBarPanelProps) {
  const [internalZoom, setInternalZoom] = useState(1);
  const [internalScrollLeft, setInternalScrollLeft] = useState(0);
  const [internalContainerWidth, setInternalContainerWidth] = useState(800);
  const [arrangementExpanded, setArrangementExpanded] = useState(true);
  const [tempoExpanded, setTempoExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external values if provided, otherwise internal
  const zoom = externalZoom !== undefined ? externalZoom : internalZoom;
  const scrollLeft = externalScrollLeft !== undefined ? externalScrollLeft : internalScrollLeft;
  const containerWidth = externalContainerWidth !== undefined ? externalContainerWidth : internalContainerWidth;

  // Measure container width for proper scaling and notify parent
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        if (onContainerWidthChange) {
          onContainerWidthChange(width);
        } else {
          setInternalContainerWidth(width);
        }
      }
    };
    
    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [onContainerWidthChange]);

  // At zoom 1 (100%), the entire timeline fits in the container
  // When zooming in, the timeline becomes wider, enabling scroll
  const totalWidth = containerWidth * zoom;

  const setZoom = useCallback((value: number | ((prev: number) => number)) => {
    const newValue = typeof value === 'function' ? value(zoom) : value;
    if (onZoomChange) {
      onZoomChange(newValue);
    } else {
      setInternalZoom(newValue);
    }
  }, [zoom, onZoomChange]);

  const setScrollLeft = useCallback((value: number | ((prev: number) => number)) => {
    const newValue = typeof value === 'function' ? value(scrollLeft) : value;
    if (onScrollChange) {
      onScrollChange(newValue);
    } else {
      setInternalScrollLeft(newValue);
    }
  }, [scrollLeft, onScrollChange]);

  // Auto-scroll to follow playhead
  useEffect(() => {
    if (!containerRef.current || !duration) return;
    
    const playheadX = (currentTime / duration) * totalWidth;
    
    // Keep playhead visible with some margin
    const margin = containerWidth * 0.2;
    
    if (playheadX < scrollLeft + margin) {
      setScrollLeft(Math.max(0, playheadX - margin));
    } else if (playheadX > scrollLeft + containerWidth - margin) {
      const maxScroll = Math.max(0, totalWidth - containerWidth);
      setScrollLeft(Math.min(maxScroll, playheadX - containerWidth + margin));
    }
  }, [currentTime, duration, zoom, totalWidth, containerWidth]);

  // Handle horizontal scroll (wheel without modifier = horizontal scroll)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const maxScroll = Math.max(0, totalWidth - containerWidth);
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(1, Math.min(16, prev * delta))); // Minimum 1 (100%)
    } else {
      // Horizontal scroll - use deltaY if no deltaX (most mice/trackpads)
      // Shift+wheel also scrolls horizontally
      const scrollDelta = e.shiftKey ? e.deltaY : (Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY);
      setScrollLeft(prev => Math.max(0, Math.min(maxScroll, prev + scrollDelta)));
    }
  }, [totalWidth, containerWidth]);

  return (
    <div 
      ref={containerRef}
      className="bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,22%)] rounded-lg overflow-hidden"
      onWheel={handleWheel}
    >

      {/* Arrangement Lane */}
      <ArrangementLane
        sections={sections}
        duration={duration}
        currentTime={currentTime}
        zoom={zoom}
        scrollLeft={scrollLeft}
        isExpanded={arrangementExpanded}
        onToggleExpand={() => setArrangementExpanded(!arrangementExpanded)}
        onSectionClick={onSectionClick}
        onSectionSelect={onSectionSelect}
        onSectionUpdate={onSectionUpdate}
        onSectionUpdateEnd={onSectionUpdateEnd}
        onSectionDelete={onSectionDelete}
        onSectionEdit={onSectionEdit}
        onSectionRename={onSectionRename}
        onAddSection={onAddSection}
        currentSection={currentSection}
        selectedSection={selectedSection}
        containerWidth={containerWidth}
        showAddOnRight={false}
      />

      {/* Tempo Lane */}
      {/* <TempoLane
        duration={duration}
        currentTime={currentTime}
        baseTempo={tempo}
        zoom={zoom}
        scrollLeft={scrollLeft}
        isExpanded={tempoExpanded}
        onToggleExpand={() => setTempoExpanded(!tempoExpanded)}
        tempoPoints={tempoPoints}
        onTempoPointAdd={onTempoPointAdd}
        onTempoPointUpdate={onTempoPointUpdate}
        onTempoPointDelete={onTempoPointDelete}
        containerWidth={containerWidth}
      /> */}
    </div>
  );
}

export default React.memo(ControlBarPanel);
