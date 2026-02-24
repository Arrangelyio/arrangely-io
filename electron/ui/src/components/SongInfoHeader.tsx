/**
 * Song Info Header
 * Ultra-compact single-line info display with integrated controls slot
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SongInfoHeaderProps {
  timeSignature: string;
  currentTime: number;
  duration: number;
  currentSection?: { name: string } | null;
  songTitle?: string;
  isPlaying?: boolean;
  loadingProgress?: number;
  isLoading?: boolean;
  children?: React.ReactNode; // For transport controls
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SongInfoHeader({
  timeSignature,
  currentTime,
  duration,
  currentSection,
  songTitle,
  isPlaying = false,
  loadingProgress = 100,
  isLoading = false,
  children,
}: SongInfoHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-secondary border-b border-border">
      {/* Time Signature */}
      <span className="text-[10px] font-medium text-muted-foreground px-1 py-0.5 bg-muted rounded">
        {timeSignature}
      </span>

      {/* Time Display */}
      <div className="flex items-center gap-0.5 font-mono text-xs tabular-nums">
        <span className="font-bold text-foreground">{formatTime(currentTime)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formatTime(duration)}</span>
      </div>

      {/* Current Section Badge */}
      {currentSection && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/20 rounded border border-primary/30">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full bg-primary",
            isPlaying && "animate-pulse"
          )} />
          <span className="text-xs font-medium text-primary">
            {currentSection.name}
          </span>
        </div>
      )}

      {/* Loading Progress Indicator */}
      {isLoading && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/20 rounded border border-orange-500/30">
          <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
          <span className="text-xs font-medium text-orange-400">
            {Math.round(loadingProgress)}%
          </span>
          <div className="w-12 h-1 bg-orange-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Transport Controls Slot */}
      {children}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Song Title - right aligned */}
      {songTitle && (
        <div className="flex items-center gap-1.5 text-xs">
          {isPlaying && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
          <span className="text-muted-foreground truncate max-w-[180px]">
            {songTitle}
          </span>
        </div>
      )}
    </div>
  );
}

export default React.memo(SongInfoHeader);
