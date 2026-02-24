/**
 * Level Meter Component
 * Displays real-time audio level/peak meter for a track
 * Logic Pro-inspired vertical meter with peak hold and smooth animation
 */

import { useEffect, useState, useRef } from 'react';

interface LevelMeterProps {
  level: number; // 0-1 range (can exceed 1 when boosted)
  peakLevel?: number; // 0-1 range for peak hold
  height?: number;
  width?: number;
  showPeak?: boolean;
  showClipIndicator?: boolean; // Show persistent clip indicator at top
}

export default function LevelMeter({ 
  level = 0, 
  peakLevel,
  height = 100,
  width = 6,
  showPeak = true,
  showClipIndicator = true,
}: LevelMeterProps) {
  const [peak, setPeak] = useState(0);
  const [isClipped, setIsClipped] = useState(false);
  const clipResetTimeoutRef = useRef<number | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const peakLineRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const currentLevelRef = useRef(0);
  const targetLevelRef = useRef(0);
  const peakTimeoutRef = useRef<number | null>(null);
  const peakDecayRef = useRef<number | null>(null);
  const lastNonZeroTimeRef = useRef<number>(Date.now());
  const silentResetRef = useRef<number | null>(null);

  // Track clipping - level > 1.0 means signal exceeds 0dB
  useEffect(() => {
    if (level > 1.0) {
      setIsClipped(true);
      // Clear any pending reset
      if (clipResetTimeoutRef.current) {
        clearTimeout(clipResetTimeoutRef.current);
      }
      // Auto-reset clip indicator after 3 seconds of no clipping
      clipResetTimeoutRef.current = window.setTimeout(() => {
        setIsClipped(false);
      }, 3000);
    }
    return () => {
      if (clipResetTimeoutRef.current) {
        clearTimeout(clipResetTimeoutRef.current);
      }
    };
  }, [level]);

  // Track when we last had a non-zero level
  useEffect(() => {
    if (level > 0.01) {
      lastNonZeroTimeRef.current = Date.now();
    }
  }, [level]);

  // Animate level via rAF for smoother meter (attack/release curve)
  useEffect(() => {
    const normalized = Number.isFinite(level) ? level : 0;
    targetLevelRef.current = Math.min(1, Math.max(0, normalized));

    const step = (now: number) => {
      const last = lastFrameTimeRef.current || 0;
      // Cap update to ~45fps
      if (now - last < 22) {
        animRef.current = requestAnimationFrame(step);
        return;
      }
      lastFrameTimeRef.current = now;

      const current = currentLevelRef.current;
      const target = targetLevelRef.current;
      const diff = target - current;

      if (Math.abs(diff) < 0.001) {
        currentLevelRef.current = target;
      } else {
        // Faster attack, gentler release
        const factor = diff > 0 ? 0.35 : 0.12;
        currentLevelRef.current = current + diff * factor;
      }

      const clamped = Math.min(1, Math.max(0, currentLevelRef.current));
      if (meterRef.current) {
        meterRef.current.style.setProperty('--meter-level', clamped.toString());
      }

      animRef.current = requestAnimationFrame(step);
    };

    if (!animRef.current) {
      animRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, [level]);

  // Hard reset after silence to avoid stuck green remnants
  useEffect(() => {
    if (silentResetRef.current) {
      clearTimeout(silentResetRef.current);
      silentResetRef.current = null;
    }

    const normalized = Number.isFinite(level) ? level : 0;
    if (normalized < 0.002) {
      silentResetRef.current = window.setTimeout(() => {
        targetLevelRef.current = 0;
        currentLevelRef.current = 0;
        if (meterRef.current) {
          meterRef.current.style.setProperty('--meter-level', '0');
        }
        setPeak(0);
      }, 250);
    }

    return () => {
      if (silentResetRef.current) {
        clearTimeout(silentResetRef.current);
        silentResetRef.current = null;
      }
    };
  }, [level]);

  // Extra guard: when parent explicitly renders level 0 and no peak, force clear
  useEffect(() => {
    const normalized = Number.isFinite(level) ? level : 0;
    if (normalized === 0 && (!peakLevel || peakLevel === 0)) {
      targetLevelRef.current = 0;
      currentLevelRef.current = 0;
      if (meterRef.current) {
        meterRef.current.style.setProperty('--meter-level', '0');
      }
      setPeak(0);
    }
  }, [level, peakLevel]);

  // Reset peak when level stays at 0 for a while (playback stopped)
  useEffect(() => {
    if (level < 0.01) {
      // If level is essentially 0, start a quick decay for peak
      const resetTimeout = window.setTimeout(() => {
        // Clear any existing decay animations
        if (peakTimeoutRef.current) {
          clearTimeout(peakTimeoutRef.current);
          peakTimeoutRef.current = null;
        }
        if (peakDecayRef.current) {
          cancelAnimationFrame(peakDecayRef.current);
          peakDecayRef.current = null;
        }
        // Quick decay to 0
        const quickDecay = () => {
          setPeak(prev => {
            if (prev > 0.01) {
              peakDecayRef.current = requestAnimationFrame(quickDecay);
              return prev - 0.05; // Faster decay when no signal
            }
            return 0;
          });
        };
        peakDecayRef.current = requestAnimationFrame(quickDecay);
      }, 300); // Start decay after 300ms of no signal

      return () => clearTimeout(resetTimeout);
    }
  }, [level]);

  // Peak hold logic - hold for 1s then decay
  useEffect(() => {
    if (level > peak && level > 0.01) {
      setPeak(level);
      
      // Clear existing timeout
      if (peakTimeoutRef.current) {
        clearTimeout(peakTimeoutRef.current);
      }
      if (peakDecayRef.current) {
        cancelAnimationFrame(peakDecayRef.current);
      }
      
      // Start decay after hold time
      peakTimeoutRef.current = window.setTimeout(() => {
        const decay = () => {
          setPeak(prev => {
            const newPeak = prev - 0.02;
            if (newPeak > level && newPeak > 0.01) {
              peakDecayRef.current = requestAnimationFrame(decay);
              return newPeak;
            }
            return Math.max(0, level);
          });
        };
        peakDecayRef.current = requestAnimationFrame(decay);
      }, 1000); // Reduced from 1.5s to 1s
    }

    return () => {
      if (peakTimeoutRef.current) clearTimeout(peakTimeoutRef.current);
      if (peakDecayRef.current) cancelAnimationFrame(peakDecayRef.current);
    };
  }, [level]);

  const displayPeak = peakLevel !== undefined ? peakLevel : peak;
  const clampedPeak = Math.min(1, Math.max(0, displayPeak));

  // Determine if currently clipping (for meter color)
  const isCurrentlyClipping = targetLevelRef.current >= 0.95 || level > 1.0;

  // Click to reset clip indicator
  const handleClipReset = () => {
    setIsClipped(false);
  };

  return (
    <div 
      className="relative bg-[hsl(0,0%,8%)] rounded-sm overflow-hidden"
      style={{ width, height }}
    >
      {/* Clip Indicator - persistent red light at top */}
      {showClipIndicator && (
        <div 
          onClick={handleClipReset}
          className={`absolute top-0 left-0 right-0 h-2 z-20 cursor-pointer transition-colors ${
            isClipped 
              ? 'bg-red-500 shadow-[0_0_6px_hsl(0,70%,50%)]' 
              : 'bg-[hsl(0,0%,15%)] hover:bg-[hsl(0,0%,20%)]'
          }`}
          title={isClipped ? "Click to reset clip indicator" : "No clipping detected"}
        />
      )}

      {/* Meter scale marks */}
      <div 
        className="absolute inset-x-0 flex flex-col justify-between py-1 pointer-events-none z-10"
        style={{ top: showClipIndicator ? 8 : 0, bottom: 0 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="w-full h-px bg-[hsl(0,0%,20%)]"
            style={{ opacity: i === 0 ? 0.6 : 0.3 }}
          />
        ))}
      </div>

      {/* Level fill - solid green bar that rises/falls */}
      <div 
        ref={meterRef}
        className="absolute bottom-0 left-0 right-0 will-change-[transform]"
        style={{ 
          height: showClipIndicator ? `calc(100% - 8px)` : '100%',
          transformOrigin: 'bottom',
          transform: 'scaleY(var(--meter-level, 0))',
          transition: 'transform 18ms linear',
          background: isCurrentlyClipping 
            ? 'linear-gradient(to top, hsl(0, 70%, 50%), hsl(0, 70%, 60%))'
            : targetLevelRef.current > 0.75
              ? 'linear-gradient(to top, hsl(145, 60%, 45%) 0%, hsl(60, 70%, 50%) 70%, hsl(45, 80%, 50%) 100%)'
              : 'linear-gradient(to top, hsl(145, 60%, 40%), hsl(145, 60%, 50%))',
        }}
      />

      {/* Peak indicator line */}
      {showPeak && clampedPeak > 0.02 && (
        <div 
          ref={peakLineRef}
          className="absolute left-0 right-0 h-0.5 transition-[bottom] duration-75"
          style={{ 
            bottom: showClipIndicator 
              ? `calc(${clampedPeak * 100}% * (1 - 8px / ${height}px))` 
              : `calc(${clampedPeak * 100}% - 1px)`,
            backgroundColor: clampedPeak > 0.95 ? 'hsl(0, 70%, 55%)' : clampedPeak > 0.75 ? 'hsl(45, 80%, 55%)' : 'hsl(145, 60%, 55%)',
          }}
        />
      )}
    </div>
  );
}

// Stereo Level Meter - shows L and R channels
export function StereoLevelMeter({ 
  leftLevel, 
  rightLevel,
  height = 100,
  width = 14,
  showClipIndicator = true,
}: { 
  leftLevel: number; 
  rightLevel: number;
  height?: number;
  width?: number;
  showClipIndicator?: boolean;
}) {
  return (
    <div className="flex gap-0.5" style={{ height, width }}>
      <LevelMeter level={leftLevel} height={height} width={Math.floor(width / 2)} showClipIndicator={showClipIndicator} />
      <LevelMeter level={rightLevel} height={height} width={Math.floor(width / 2)} showClipIndicator={showClipIndicator} />
    </div>
  );
}
