/**
 * Section Overlay Component
 * Displays color-coded section badges directly on the waveform
 * Competitor-inspired feature: sections visible at all times on waveform
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getSectionColorConfig } from '../lib/sectionColors';

interface Section {
  id: string;
  name: string;
  start_time: number;
  end_time: number;
  color?: string;
}

interface SectionOverlayProps {
  sections: Section[];
  duration: number;
  currentTime: number;
  currentSection?: Section | null;
  zoom: number;
  scrollLeft: number;
  containerWidth: number;
  onSectionClick: (section: Section) => void;
  onAddBefore?: (section: Section) => void;
  onRemoveSection?: (section: Section) => void;
  onSectionOptions?: (section: Section) => void;
  height?: number;
}

function getSectionStyle(name: string): { bg: string; text: string } {
  const config = getSectionColorConfig(name);
  return { bg: config.bg, text: config.text };
}

function SectionOverlay({
  sections,
  duration,
  currentTime,
  currentSection,
  zoom,
  scrollLeft,
  containerWidth,
  onSectionClick,
  onAddBefore,
  onRemoveSection,
  onSectionOptions,
  height = 120,
}: SectionOverlayProps) {
  const totalWidth = containerWidth * zoom;

  const visibleSections = useMemo(() => {
    const visibleStartTime = (scrollLeft / totalWidth) * duration;
    const visibleEndTime = ((scrollLeft + containerWidth) / totalWidth) * duration;

    return sections.filter(
      (s) => s.end_time >= visibleStartTime && s.start_time <= visibleEndTime
    );
  }, [sections, scrollLeft, totalWidth, containerWidth, duration]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{ 
        width: `${totalWidth}px`,
        transform: `translateX(-${scrollLeft}px)`
      }}
    >
      {sections.map((section, idx) => {
        const startX = (section.start_time / duration) * totalWidth;
        const width = ((section.end_time - section.start_time) / duration) * totalWidth;
        const isActive = currentSection?.id === section.id;
        const style = getSectionStyle(section.name);

        return (
          <div
            key={`${section.id}-${idx}`}
            className={cn(
              "absolute top-0 pointer-events-auto",
              "border-r border-[hsl(0,0%,25%)]"
            )}
            style={{
              left: `${startX}px`,
              width: `${Math.max(40, width)}px`,
              height: `${height}px`,
            }}
          >
            {/* Section color indicator at top */}
            <div 
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: style.bg }}
            />


            {/* Repeat indicator (like competitor) */}
            {/* <div 
              className="absolute top-2 right-2 flex items-center gap-0.5"
              style={{ opacity: width > 80 ? 1 : 0 }}
            >
              <div className="w-4 h-4 rounded-full bg-[hsl(0,0%,20%)] flex items-center justify-center cursor-pointer hover:bg-[hsl(0,0%,30%)] transition-colors pointer-events-auto">
                <svg className="w-2.5 h-2.5 text-[hsl(0,0%,60%)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </div>
            </div> */}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(SectionOverlay);
