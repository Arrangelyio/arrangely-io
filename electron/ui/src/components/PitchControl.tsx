import { useState, useRef, useEffect } from "react";
import { Music2, X, RotateCcw, Zap, Sparkles, Mic, Loader2, Cpu, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

export type PitchQualityMode = 'fast' | 'high';
export type PitchEngine = 'worklet' | 'soundtouch';

interface PitchControlProps {
  pitch: number;
  onPitchChange: (pitch: number) => void;
  qualityMode?: PitchQualityMode;
  onQualityModeChange?: (mode: PitchQualityMode) => void;
  formantPreservation?: boolean;
  onFormantPreservationChange?: (enabled: boolean) => void;
  pitchEngine?: PitchEngine;
  onPitchEngineChange?: (engine: PitchEngine) => void;
  isLoading?: boolean;
  loadingProgress?: number;
  disabled?: boolean;
  // Track pitch exclusion info
  pitchEnabledCount?: number;
  totalTrackCount?: number;
}

// Reduced to ±3 semitones for initial stability (prevents Electron crashes)
const PITCH_PRESETS = [-3, -2, -1, 0, 1, 2, 3];
const PITCH_MIN = -3;
const PITCH_MAX = 3;

export default function PitchControl({
  pitch,
  onPitchChange,
  qualityMode = 'high',
  onQualityModeChange,
  formantPreservation = false,
  onFormantPreservationChange,
  pitchEngine = 'soundtouch',
  onPitchEngineChange,
  isLoading = false,
  loadingProgress = 0,
  disabled = false,
  pitchEnabledCount,
  totalTrackCount,
}: PitchControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatPitch = (value: number) => {
    if (value === 0) return "0";
    return value > 0 ? `+${value}` : `${value}`;
  };

  const isModified = pitch !== 0;

  const handleReset = () => {
    onPitchChange(0);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
          isLoading
            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
            : isModified
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "bg-muted hover:bg-muted/80 text-muted-foreground",
          (disabled || isLoading) && "opacity-70 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading {loadingProgress}%</span>
          </>
        ) : (
          <>
            <Music2 className="w-4 h-4" />
            <span>Pitch Control</span>
          </>
        )}
      </button>

      {isOpen && !isLoading && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-72 p-4 rounded-lg border border-[hsl(0,0%,28%)] bg-[hsl(0,0%,18%)] text-[hsl(0,0%,90%)] shadow-xl z-50"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(0,0%,90%)]">Pitch Control</span>
              <div className="flex items-center gap-1">
                {isModified && (
                  <button
                    onClick={handleReset}
                    className="p-1 rounded hover:bg-[hsl(0,0%,25%)] transition-colors text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,90%)]"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-[hsl(0,0%,25%)] transition-colors text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,90%)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-orange-400/70" />
                  <label className="text-xs font-medium text-[hsl(0,0%,55%)] uppercase tracking-wide">
                    Pitch (semitones)
                  </label>
                </div>
                <span className="text-sm font-mono font-medium text-[hsl(0,0%,90%)]">{formatPitch(pitch)} st</span>
              </div>
              <input
                type="range"
                value={pitch}
                onChange={(e) => onPitchChange(parseInt(e.target.value))}
                min={PITCH_MIN}
                max={PITCH_MAX}
                step={1}
                className="w-full h-2 bg-[hsl(0,0%,25%)] rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, hsl(0,0%,25%) 0%, hsl(0,0%,25%) ${((pitch - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 100}%, hsl(25, 95%, 53%) ${((pitch - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 100}%, hsl(25, 95%, 53%) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-[hsl(0,0%,50%)]">
                <span>{PITCH_MIN} st</span>
                <span>0</span>
                <span>+{PITCH_MAX} st</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {PITCH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onPitchChange(preset)}
                    className={cn(
                      "px-1.5 py-1 text-xs font-medium rounded transition-colors",
                      pitch === preset
                        ? "bg-orange-500 text-white"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    {preset === 0 ? "0" : preset > 0 ? `+${preset}` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch Engine Toggle */}
            {onPitchEngineChange && (
              <div className="space-y-2 pt-2 border-t border-[hsl(0,0%,25%)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[hsl(0,0%,55%)] uppercase tracking-wide">
                    Pitch Engine
                  </label>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onPitchEngineChange('worklet')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                      pitchEngine === 'worklet'
                        ? "bg-cyan-500 text-white"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    <Cpu className="w-3 h-3" />
                    Modern
                  </button>
                  <button
                    onClick={() => onPitchEngineChange('soundtouch')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                      pitchEngine === 'soundtouch'
                        ? "bg-amber-500 text-white"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    <Waves className="w-3 h-3" />
                    SoundTouch
                  </button>
                </div>
                <p className="text-[9px] text-[hsl(0,0%,40%)] leading-relaxed">
                  {pitchEngine === 'worklet' 
                    ? "AudioWorklet (stable, runs on audio thread). Recommended."
                    : "SoundTouch TDHS (legacy, higher quality but may be unstable)."}
                </p>
              </div>
            )}

            {/* Quality Mode Toggle (SoundTouch only) */}
            {onQualityModeChange && pitchEngine === 'soundtouch' && (
              <div className="space-y-2 pt-2 border-t border-[hsl(0,0%,25%)]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[hsl(0,0%,55%)] uppercase tracking-wide">
                    Quality Mode
                  </label>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onQualityModeChange('fast')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                      qualityMode === 'fast'
                        ? "bg-blue-500 text-white"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    Fast
                  </button>
                  <button
                    onClick={() => onQualityModeChange('high')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                      qualityMode === 'high'
                        ? "bg-green-500 text-white"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    <Sparkles className="w-3 h-3" />
                    High Quality
                  </button>
                </div>
                <p className="text-[9px] text-[hsl(0,0%,40%)] leading-relaxed">
                  {qualityMode === 'high' 
                    ? "Ableton-quality TDHS algorithm. Best for ±12 semitones."
                    : "Lower CPU usage. Best for small shifts (±2 semitones)."}
                </p>
              </div>
            )}

            {/* Formant Preservation Toggle */}
            {onFormantPreservationChange && (
              <div className="space-y-2 pt-2 border-t border-[hsl(0,0%,25%)]">
                <button
                  onClick={() => onFormantPreservationChange(!formantPreservation)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded transition-colors",
                    formantPreservation
                      ? "bg-purple-500/20 border border-purple-500/40"
                      : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,26%)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Mic className={cn(
                      "w-4 h-4",
                      formantPreservation ? "text-purple-400" : "text-[hsl(0,0%,55%)]"
                    )} />
                    <span className={cn(
                      "text-xs font-medium",
                      formantPreservation ? "text-purple-300" : "text-[hsl(0,0%,70%)]"
                    )}>
                      Formant Preservation
                    </span>
                  </div>
                  <div className={cn(
                    "w-8 h-4 rounded-full transition-colors relative",
                    formantPreservation ? "bg-purple-500" : "bg-[hsl(0,0%,35%)]"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                      formantPreservation ? "translate-x-4" : "translate-x-0.5"
                    )} />
                  </div>
                </button>
                <p className="text-[9px] text-[hsl(0,0%,40%)] leading-relaxed px-1">
                  {formantPreservation 
                    ? "Vocal character preserved. Reduces chipmunk/Darth Vader effect."
                    : "Enable to maintain natural vocal timbre when transposing."}
                </p>
              </div>
            )}

            {/* Track exclusion info */}
            {pitchEnabledCount !== undefined && totalTrackCount !== undefined && (
              <div className="text-[10px] text-[hsl(0,0%,50%)] leading-relaxed">
                <span className="text-orange-400 font-medium">{pitchEnabledCount}</span>
                <span>/{totalTrackCount} tracks pitch-shifted</span>
                {pitchEnabledCount < totalTrackCount && (
                  <span className="text-[hsl(0,0%,40%)]"> (drums/click excluded)</span>
                )}
              </div>
            )}

            <p className="text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">
              Shift the key in semitones. SoundTouch provides high-quality transposition.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
