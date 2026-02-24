import { useState, useRef, useEffect } from "react";
import { Gauge, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TempoControlProps {
  tempo: number;
  onTempoChange: (tempo: number) => void;
  disabled?: boolean;
}

const BASE_BPM = 120;
const BPM_PRESETS = [60, 90, 120, 150, 180, 240];

export default function TempoControl({
  tempo,
  onTempoChange,
  disabled = false,
}: TempoControlProps) {
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

  const tempoBpm = Math.round(tempo * BASE_BPM);
  const formatBpm = (bpm: number) => `${bpm} BPM`;
  
  const handleBpmChange = (bpm: number) => {
    onTempoChange(bpm / BASE_BPM);
  };

  const isModified = tempo !== 1;

  const handleReset = () => {
    onTempoChange(1);
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
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-72 p-4 rounded-lg border border-[hsl(0,0%,28%)] bg-[hsl(0,0%,18%)] text-[hsl(0,0%,90%)] shadow-xl z-50"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[hsl(0,0%,90%)]">Tempo Control</span>
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

            <p className="text-[10px] text-[hsl(0,0%,45%)] leading-relaxed">
              Adjust playback speed. Default tempo is 120 BPM.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
