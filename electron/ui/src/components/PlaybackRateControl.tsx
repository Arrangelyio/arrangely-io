import { useState, useRef, useEffect } from "react";
import { Gauge, Music2, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaybackRateControlProps {
  tempo: number;
  pitch: number;
  onTempoChange: (tempo: number) => void;
  onPitchChange: (pitch: number) => void;
  disabled?: boolean;
}

// BPM presets (based on 120 BPM as 1.0x)
const BASE_BPM = 120;
const BPM_PRESETS = [60, 90, 120, 150, 180, 240];
const PITCH_PRESETS = [-12, -7, -5, 0, 5, 7, 12];

export default function PlaybackRateControl({
  tempo,
  pitch,
  onTempoChange,
  onPitchChange,
  disabled = false,
}: PlaybackRateControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
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

  // Convert tempo multiplier to BPM (based on 120 BPM as baseline)
  const tempoBpm = Math.round(tempo * BASE_BPM);
  
  const formatBpm = (bpm: number) => `${bpm} BPM`;

  const formatPitch = (value: number) => {
    if (value === 0) return "0";
    return value > 0 ? `+${value}` : `${value}`;
  };
  
  const handleBpmChange = (bpm: number) => {
    onTempoChange(bpm / BASE_BPM);
  };

  const isModified = tempo !== 1 || pitch !== 0;

  const handleReset = () => {
    onTempoChange(1);
    onPitchChange(0);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
          isModified
            ? "bg-primary/20 text-primary border border-primary/30"
            : "bg-muted hover:bg-muted/80 text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Gauge className="w-4 h-4" />
        <span>{tempoBpm} BPM</span>
        {pitch !== 0 && (
          <>
            <span className="text-muted-foreground/60">|</span>
            <Music2 className="w-3.5 h-3.5" />
            <span>{formatPitch(pitch)}st</span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-80 p-4 rounded-lg border border-[hsl(0,0%,28%)] bg-[hsl(0,0%,18%)] text-[hsl(0,0%,90%)] shadow-xl z-50"
        >
          <div className="space-y-5">
            {/* Header with close button */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(0,0%,90%)]">Tempo & Pitch Control</span>
              <div className="flex items-center gap-1">
                {isModified && (
                  <button
                    onClick={handleReset}
                    className="p-1 rounded hover:bg-[hsl(0,0%,25%)] transition-colors text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,90%)]"
                    title="Reset to defaults"
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

            {/* Tempo Control (BPM) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[hsl(0,0%,55%)]" />
                  <label className="text-xs font-medium text-[hsl(0,0%,55%)] uppercase tracking-wide">
                    Tempo (BPM)
                  </label>
                </div>
                <span className="text-sm font-mono font-medium text-[hsl(0,0%,90%)]">{formatBpm(tempoBpm)}</span>
              </div>
              <input
                type="range"
                value={tempoBpm}
                onChange={(e) => handleBpmChange(parseInt(e.target.value))}
                min={30}
                max={240}
                step={1}
                className="w-full h-2 bg-[hsl(0,0%,25%)] rounded-full appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((tempoBpm - 30) / 210) * 100}%, hsl(0,0%,25%) ${((tempoBpm - 30) / 210) * 100}%, hsl(0,0%,25%) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-[hsl(0,0%,50%)]">
                <span>30</span>
                <span>120</span>
                <span>240</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {BPM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleBpmChange(preset)}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded transition-colors",
                      tempoBpm === preset
                        ? "bg-primary text-primary-foreground"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-[hsl(0,0%,55%)]" />
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
                min={-12}
                max={12}
                step={1}
                className="w-full h-2 bg-[hsl(0,0%,25%)] rounded-full appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, hsl(0,0%,25%) 0%, hsl(0,0%,25%) ${((pitch + 12) / 24) * 100}%, hsl(var(--primary)) ${((pitch + 12) / 24) * 100}%, hsl(var(--primary)) 100%)`
                }}
              />
              <div className="flex justify-between text-[10px] text-[hsl(0,0%,50%)]">
                <span>-12 st</span>
                <span>0</span>
                <span>+12 st</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {PITCH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => onPitchChange(preset)}
                    className={cn(
                      "px-1.5 py-1 text-xs font-medium rounded transition-colors",
                      pitch === preset
                        ? "bg-primary text-primary-foreground"
                        : "bg-[hsl(0,0%,22%)] hover:bg-[hsl(0,0%,28%)] text-[hsl(0,0%,70%)]"
                    )}
                  >
                    {preset === 0 ? "0" : preset > 0 ? `+${preset}` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Info text */}
            <p className="text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">
              Tempo changes playback speed. Pitch shifts the key in semitones.
              {pitch !== 0 && " Note: Pitch shift also affects playback speed slightly."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
