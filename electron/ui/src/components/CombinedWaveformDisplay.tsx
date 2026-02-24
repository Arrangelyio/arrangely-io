/**
 * Combined Waveform Display
 * Renders a merged waveform from all tracks' peaks data
 * Logic Pro inspired purple/blue waveform with white peaks on dark background
 * Uses same coordinate system as ControlBarRuler: 100px per second at zoom 1
 * Enhanced with section overlays like competitor apps
 */

import React, { useEffect, useRef, useMemo } from 'react';
import SectionOverlay from './SectionOverlay';
import { getSectionWaveformBgColor } from '../lib/sectionColors';

interface Section {
  id: string;
  name: string;
  start_time: number;
  end_time: number;
  color?: string;
}

interface CombinedWaveformDisplayProps {
  trackPeaks: number[][]; // Array of peaks arrays for each track
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  height?: number;
  zoom?: number;
  scrollLeft?: number;
  containerWidth?: number; // Pass container width for proper scaling
  verticalZoom?: number; // Vertical zoom for waveform amplitude display (1 = 100%)
  // Section overlay props
  sections?: Section[];
  currentSection?: Section | null;
  onSectionClick?: (section: Section) => void;
  onAddSection?: (section: Section) => void;
  onRemoveSection?: (section: Section) => void;
  onSectionOptions?: (section: Section) => void;
  showSectionOverlay?: boolean;
}

function CombinedWaveformDisplay({
  trackPeaks,
  currentTime,
  duration,
  onSeek,
  height = 100,
  zoom = 1,
  scrollLeft = 0,
  containerWidth = 800,
  verticalZoom = 1,
  sections = [],
  currentSection,
  onSectionClick,
  onAddSection,
  onRemoveSection,
  onSectionOptions,
  showSectionOverlay = true,
}: CombinedWaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);

  // At zoom 1 (100%), the entire timeline fits in the container
  // When zooming in (e.g., 200%), the timeline becomes 2x wider than container
  const totalWidth = containerWidth * zoom;

  // Merge all track peaks into a single combined waveform
  const combinedPeaks = useMemo(() => {
    if (!trackPeaks || trackPeaks.length === 0) return [];
    
    const maxLength = Math.max(...trackPeaks.map(p => p?.length || 0));
    if (maxLength === 0) return [];

    const combined: number[] = new Array(maxLength).fill(0);
    
    for (let i = 0; i < maxLength; i++) {
      let sum = 0;
      let count = 0;
      
      for (const peaks of trackPeaks) {
        if (peaks && peaks.length > 0) {
          const idx = Math.floor((i / maxLength) * peaks.length);
          if (peaks[idx] !== undefined) {
            sum += peaks[idx];
            count++;
          }
        }
      }
      
      combined[i] = count > 0 ? Math.min(sum / count, 1.0) : 0;
    }
    
    return combined;
  }, [trackPeaks]);

  // Draw waveform - Logic Pro style with purple/blue background and white waveform
  // Also draw section-specific background colors
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = waveformRef.current;
    if (!canvas || !container || combinedPeaks.length === 0 || !duration) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const containerW = container.clientWidth;
    
    canvas.width = containerW * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Base purple/blue gradient background - Logic Pro style
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'hsl(240, 30%, 22%)');
    bgGradient.addColorStop(0.5, 'hsl(245, 35%, 27%)');
    bgGradient.addColorStop(1, 'hsl(240, 30%, 22%)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, containerW, height);

    // Calculate visible time range based on scroll position
    const visibleStartTime = (scrollLeft / totalWidth) * duration;
    const visibleEndTime = ((scrollLeft + containerW) / totalWidth) * duration;

    // Draw section-specific background colors (competitor feature)
    if (sections.length > 0) {
      for (const section of sections) {
        if (section.end_time < visibleStartTime || section.start_time > visibleEndTime) continue;
        
        const sectionStartX = ((section.start_time - visibleStartTime) / (visibleEndTime - visibleStartTime)) * containerW;
        const sectionEndX = ((section.end_time - visibleStartTime) / (visibleEndTime - visibleStartTime)) * containerW;
        const sectionWidth = sectionEndX - sectionStartX;
        
        ctx.fillStyle = getSectionWaveformBgColor(section.name);
        ctx.fillRect(Math.max(0, sectionStartX), 0, Math.min(sectionWidth, containerW - sectionStartX), height);
        
        // Draw section divider line
        ctx.strokeStyle = 'hsla(0, 0%, 40%, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sectionStartX, 0);
        ctx.lineTo(sectionStartX, height);
        ctx.stroke();
      }
    }

    // Progress (current time)
    const progress = duration > 0 ? currentTime / duration : 0;

    // Draw continuous waveform like Logic Pro (filled shape, not bars)
    const centerY = height / 2;
    const maxHeight = (height - 8) / 2;
    const numSamples = containerW * 2; // Higher resolution for smoother waveform

    // Build waveform path
    const topPoints: { x: number; y: number }[] = [];
    const bottomPoints: { x: number; y: number }[] = [];

    for (let i = 0; i <= numSamples; i++) {
      const screenX = (i / numSamples) * containerW;
      const barTime = visibleStartTime + (i / numSamples) * (visibleEndTime - visibleStartTime);
      const peakRatio = barTime / duration;
      const sampleIndex = Math.floor(peakRatio * combinedPeaks.length);
      
      if (sampleIndex < 0 || sampleIndex >= combinedPeaks.length) continue;
      
      const peak = combinedPeaks[sampleIndex] || 0;
      const amplifiedPeak = Math.min(peak * verticalZoom, 1.0);
      const waveHeight = Math.max(1, amplifiedPeak * maxHeight);

      topPoints.push({ x: screenX, y: centerY - waveHeight });
      bottomPoints.push({ x: screenX, y: centerY + waveHeight });
    }

    if (topPoints.length > 0) {
      // Draw waveform fill - lighter purple/lavender color (like competitor)
      ctx.beginPath();
      ctx.moveTo(topPoints[0].x, topPoints[0].y);
      
      // Top edge (left to right)
      for (let i = 1; i < topPoints.length; i++) {
        ctx.lineTo(topPoints[i].x, topPoints[i].y);
      }
      
      // Bottom edge (right to left)
      for (let i = bottomPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
      }
      
      ctx.closePath();
      
      // Lavender/light waveform fill - competitor inspired cream/beige tone
      const waveGradient = ctx.createLinearGradient(0, 0, 0, height);
      waveGradient.addColorStop(0, 'hsla(45, 30%, 85%, 0.95)');
      waveGradient.addColorStop(0.3, 'hsla(40, 35%, 80%, 0.9)');
      waveGradient.addColorStop(0.5, 'hsla(38, 40%, 75%, 0.85)');
      waveGradient.addColorStop(0.7, 'hsla(40, 35%, 80%, 0.9)');
      waveGradient.addColorStop(1, 'hsla(45, 30%, 85%, 0.95)');
      ctx.fillStyle = waveGradient;
      ctx.fill();

      // Draw subtle inner glow/highlight
      ctx.beginPath();
      ctx.moveTo(topPoints[0].x, centerY);
      for (let i = 0; i < topPoints.length; i++) {
        const peak = combinedPeaks[Math.floor((i / topPoints.length) * combinedPeaks.length)] || 0;
        const glowHeight = Math.max(0.5, peak * verticalZoom * maxHeight * 0.3);
        ctx.lineTo(topPoints[i].x, centerY - glowHeight);
      }
      for (let i = topPoints.length - 1; i >= 0; i--) {
        const peak = combinedPeaks[Math.floor((i / topPoints.length) * combinedPeaks.length)] || 0;
        const glowHeight = Math.max(0.5, peak * verticalZoom * maxHeight * 0.3);
        ctx.lineTo(topPoints[i].x, centerY + glowHeight);
      }
      ctx.closePath();
      ctx.fillStyle = 'hsla(45, 50%, 95%, 0.4)';
      ctx.fill();
    }

    // Draw playback progress overlay
    if (progress > 0) {
      const progressX = ((currentTime - visibleStartTime) / (visibleEndTime - visibleStartTime)) * containerW;
      
      if (progressX > 0) {
        // Semi-transparent darker overlay for played portion
        ctx.fillStyle = 'hsla(0, 0%, 0%, 0.15)';
        ctx.fillRect(0, 0, Math.min(progressX, containerW), height);
      }
    }

    // Draw center line (subtle)
    ctx.strokeStyle = 'hsla(230, 30%, 50%, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(containerW, centerY);
    ctx.stroke();

  }, [combinedPeaks, currentTime, duration, height, zoom, scrollLeft, totalWidth, verticalZoom, sections]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = waveformRef.current;
    if (!container || duration <= 0) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const containerW = rect.width;
    
    // Calculate time based on scroll position
    const visibleStartTime = (scrollLeft / totalWidth) * duration;
    const visibleEndTime = ((scrollLeft + containerW) / totalWidth) * duration;
    const clickTime = visibleStartTime + (x / containerW) * (visibleEndTime - visibleStartTime);
    
    onSeek(Math.max(0, Math.min(clickTime, duration)));
  };

  // Calculate playhead position - same formula as ControlBarRuler and ArrangementLane
  const playheadPosition = useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * totalWidth;
  }, [currentTime, duration, totalWidth]);

  return (
    <div
      ref={containerRef}
      className="bg-[hsl(240,30%,18%)] rounded-lg overflow-hidden border border-[hsl(240,20%,25%)]"
      style={{ height }}
    >
      {/* Waveform Area */}
      <div
        ref={waveformRef}
        className="w-full h-full cursor-pointer relative overflow-hidden"
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        
        {/* Section Overlay - competitor feature */}
        {showSectionOverlay && sections.length > 0 && onSectionClick && (
          <SectionOverlay
            sections={sections}
            duration={duration}
            currentTime={currentTime}
            currentSection={currentSection}
            zoom={zoom}
            scrollLeft={scrollLeft}
            containerWidth={containerWidth}
            onSectionClick={onSectionClick}
            onAddBefore={onAddSection}
            onRemoveSection={onRemoveSection}
            onSectionOptions={onSectionOptions}
            height={height}
          />
        )}
        
        {/* Playhead Container - same approach as ControlBarRuler and ArrangementLane */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            width: `${totalWidth}px`,
            transform: `translateX(-${scrollLeft}px)`
          }}
        >
          {/* Playhead with glow effect */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] z-10"
            style={{ 
              left: `${playheadPosition}px`,
              background: 'linear-gradient(to bottom, hsl(0, 0%, 70%), hsl(0, 0%, 90%), hsl(0, 0%, 70%))',
              boxShadow: '0 0 6px 1px hsla(0, 0%, 100%, 0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(CombinedWaveformDisplay);