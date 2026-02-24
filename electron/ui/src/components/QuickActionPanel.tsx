/**
 * Quick Action Panel
 * Right-side panel with quick access buttons like competitor's BUSES, PAD PLAYER, MUTE MIDI
 */

import React from 'react';
import { SlidersHorizontal, Disc, VolumeX, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionPanelProps {
  onBusesClick?: () => void;
  onPadPlayerClick?: () => void;
  onMuteMidiClick?: () => void;
  onLinkClick?: () => void;
  isMidiMuted?: boolean;
  isLinked?: boolean;
}

function QuickActionPanel({
  onBusesClick,
  onPadPlayerClick,
  onMuteMidiClick,
  onLinkClick,
  isMidiMuted = false,
  isLinked = false,
}: QuickActionPanelProps) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-[hsl(220,12%,14%)] border-l border-[hsl(220,10%,22%)] rounded-l-lg">
      {/* Buses Button */}
      {onBusesClick && (
        <button
          onClick={onBusesClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[hsl(220,12%,18%)] hover:bg-[hsl(220,12%,25%)] border border-[hsl(220,10%,25%)] transition-colors"
          title="Buses"
        >
          <SlidersHorizontal className="w-5 h-5 text-[hsl(220,20%,60%)]" />
          <span className="text-[8px] font-medium text-[hsl(220,15%,55%)] uppercase tracking-wide">
            Buses
          </span>
        </button>
      )}

      {/* Pad Player Button */}
      {onPadPlayerClick && (
        <button
          onClick={onPadPlayerClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[hsl(220,12%,18%)] hover:bg-[hsl(220,12%,25%)] border border-[hsl(220,10%,25%)] transition-colors"
          title="Pad Player"
        >
          <Disc className="w-5 h-5 text-[hsl(220,20%,60%)]" />
          <span className="text-[8px] font-medium text-[hsl(220,15%,55%)] uppercase tracking-wide leading-tight text-center">
            Pad<br/>Player
          </span>
        </button>
      )}

      {/* Mute MIDI Button */}
      {onMuteMidiClick && (
        <button
          onClick={onMuteMidiClick}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
            isMidiMuted 
              ? "bg-[hsl(0,55%,40%)] border-[hsl(0,50%,50%)] hover:bg-[hsl(0,55%,50%)]"
              : "bg-[hsl(220,12%,18%)] border-[hsl(220,10%,25%)] hover:bg-[hsl(220,12%,25%)]"
          )}
          title="Mute MIDI"
        >
          <VolumeX className={cn(
            "w-5 h-5",
            isMidiMuted ? "text-white" : "text-[hsl(220,20%,60%)]"
          )} />
          <span className={cn(
            "text-[8px] font-medium uppercase tracking-wide leading-tight text-center",
            isMidiMuted ? "text-white" : "text-[hsl(220,15%,55%)]"
          )}>
            Mute<br/>MIDI
          </span>
        </button>
      )}

      {/* Link/Sync Button */}
      {onLinkClick && (
        <button
          onClick={onLinkClick}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors",
            isLinked 
              ? "bg-[hsl(145,50%,35%)] border-[hsl(145,45%,45%)] hover:bg-[hsl(145,50%,45%)]"
              : "bg-[hsl(220,12%,18%)] border-[hsl(220,10%,25%)] hover:bg-[hsl(220,12%,25%)]"
          )}
          title="Link"
        >
          <Link2 className={cn(
            "w-5 h-5",
            isLinked ? "text-white" : "text-[hsl(220,20%,60%)]"
          )} />
        </button>
      )}
    </div>
  );
}

export default React.memo(QuickActionPanel);
