import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SectionData {
  title: string;
  lyrics: string[];
  isActive: boolean;
}

interface TeleprompterLyricsProps {
  sections: SectionData[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
  className?: string;
}

// Vocalist teleprompter: shows current section prominently, with clear context of previous/next sections
export const TeleprompterLyrics: React.FC<TeleprompterLyricsProps> = ({
  sections,
  currentSectionIndex,
  onSectionChange,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const goToNext = () => {
    if (currentSectionIndex < sections.length - 1) {
      onSectionChange(currentSectionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentSectionIndex > 0) {
      onSectionChange(currentSectionIndex - 1);
    }
  };

  // Auto-scroll the active section into view
  useEffect(() => {
    const activeElement = containerRef.current?.querySelector(`[data-section-index="${currentSectionIndex}"]`);
    if (activeElement) {
      activeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [currentSectionIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSectionIndex]);

  return (
    <div className={`relative ${className}`}>
      {/* Navigation controls */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={goToPrevious}
          disabled={currentSectionIndex === 0}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={goToNext}
          disabled={currentSectionIndex >= sections.length - 1}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Sections container */}
      <div ref={containerRef} className="relative mx-auto max-w-4xl min-h-screen py-16">
        {/* Gradient overlays for focus effect */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/60 to-transparent z-10" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

        <div className="space-y-12 px-4">
          {sections.map((section, i) => {
            const distance = Math.abs(i - currentSectionIndex);
            let containerStyles = "transition-all duration-500 ease-in-out text-center";
            let titleStyles = "font-bold uppercase tracking-widest mb-4";
            let lyricsStyles = "whitespace-pre-wrap leading-relaxed";
            
            // Current section - most prominent
            if (distance === 0) {
              containerStyles += " transform scale-100 opacity-100";
              titleStyles += " text-xl md:text-2xl text-primary";
              lyricsStyles += " text-3xl md:text-5xl font-semibold text-foreground";
            }
            // Next/Previous section - clearly visible for context
            else if (distance === 1) {
              containerStyles += " transform scale-90 opacity-80";
              titleStyles += " text-lg md:text-xl text-foreground/80";
              lyricsStyles += " text-xl md:text-3xl font-medium text-foreground/80";
            }
            // Distant sections - faded and smaller
            else {
              containerStyles += " transform scale-75 opacity-40 blur-sm";
              titleStyles += " text-base md:text-lg text-muted-foreground/60";
              lyricsStyles += " text-lg md:text-2xl text-muted-foreground/60";
            }

            return (
              <div
                key={`section-${i}`}
                data-section-index={i}
                className={containerStyles}
                onClick={() => onSectionChange(i)}
              >
                {/* Section Title */}
                <h3 className={titleStyles}>
                  {section.title}
                </h3>
                
                {/* Section Lyrics */}
                <div className="space-y-2">
                  {section.lyrics.map((line, lineIndex) => {
                    const isEmpty = line.trim() === "";
                    if (isEmpty) {
                      return <div key={`empty-${i}-${lineIndex}`} className="h-4" />;
                    }

                    return (
                      <div
                        key={`lyric-${i}-${lineIndex}`}
                        className={lyricsStyles}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-muted-foreground">
            Section {currentSectionIndex + 1} of {sections.length}: {sections[currentSectionIndex]?.title}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeleprompterLyrics;
