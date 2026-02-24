/**
 * Master Strip Component
 * Master volume control for the mixer with stereo output visualization
 */

import LevelMeter from './LevelMeter';
import { Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterStripProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  leftLevel?: number;
  rightLevel?: number;
  gainReduction?: number;
  compact?: boolean;
}

// Max volume is 2.0 (approx +6dB) to allow boosting
const MAX_VOLUME = 2.0;

export default function MasterStrip({ 
  volume, 
  onVolumeChange,
  leftLevel = 0,
  rightLevel = 0,
  gainReduction = 0,
  compact = false,
}: MasterStripProps) {
  // Master uses a distinctive gold/amber color
  const colorBase = 'hsl(45, 70%, 55%)';
  const colorDark = 'hsl(45, 65%, 40%)';
  const colorGlow = 'hsl(45, 75%, 65%)';
  const colorMuted = 'hsl(45, 50%, 45%)';

  // Boost zone (above 0dB) uses brighter gold
  const isBoost = volume > 1;
  const boostColorBright = 'hsl(45, 80%, 70%)';

  // Convert volume (0-2) to dB display (-∞ to +6)
  const volumeToDb = (vol: number) => {
    if (vol === 0) return '-∞';
    const db = 20 * Math.log10(vol);
    return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  };

  // Tick mark positions for 0 to +6dB range (volume 0 to 2)
  const tickMarks = [
    { db: 6, pos: 100 },   // +6dB at top
    { db: 0, pos: 50 },    // 0dB at middle
    { db: -6, pos: 37.5 },
    { db: -12, pos: 25 },
    { db: -24, pos: 12.5 },
    { db: -48, pos: 3 },
  ];

  // Dynamic sizing based on compact mode
  const stripWidth = compact ? 'w-[60px] min-w-[60px]' : 'w-[80px] min-w-[80px]';
  const faderHeight = compact ? 'h-20' : 'h-32';
  const meterHeight = compact ? 80 : 120;
  const meterWidth = compact ? 4 : 5;
  const padding = compact ? 'p-1.5' : 'p-2';

  return (
    <div 
      className={cn("flex flex-col items-center bg-[hsl(220,15%,10%)] border border-[hsl(45,30%,25%)] rounded-lg h-full", padding, stripWidth)}
      style={{
        borderTopColor: colorMuted,
        borderTopWidth: '3px',
      }}
    >
      {/* Master Label */}
      <div className={cn("flex items-center gap-1", compact ? "mb-1" : "mb-2")}>
        <Volume2 className={cn(compact ? "w-3 h-3" : "w-4 h-4")} style={{ color: colorBase }} />
        <span 
          className={cn("font-bold uppercase tracking-wider", compact ? "text-[9px]" : "text-xs")}
          style={{ color: colorBase }}
        >
          Master
        </span>
      </div>

      {/* Stereo Output Badge - hide in compact */}
      {!compact && (
        <div 
          className="px-2 py-0.5 rounded text-[9px] font-medium mb-3"
          style={{ 
            backgroundColor: 'hsl(220,12%,14%)',
            color: 'hsl(45, 50%, 55%)',
            border: '1px solid hsl(45, 30%, 25%)',
          }}
        >
          Stereo Out
        </div>
      )}

      {/* dB Display - brighter when boosting */}
      <div 
        className={cn("font-mono rounded", compact ? "text-[8px] mb-1 h-3 px-1" : "text-[10px] mb-1.5 h-4 px-1.5 py-0.5")}
        style={{ 
          color: isBoost ? boostColorBright : volume > 0.9 ? colorGlow : 'hsl(220,8%,50%)',
          backgroundColor: isBoost ? 'hsl(45, 35%, 12%)' : 'hsl(220,12%,10%)',
        }}
      >
        {volumeToDb(volume)} dB
      </div>

      {/* Volume Fader + Tick Marks + Stereo Level Meters */}
      <div className={cn("flex gap-0.5", compact ? "mb-1" : "mb-2")}>
        {/* Tick Marks - Left - hide in compact */}
        {!compact && (
          <div className={cn("relative w-4 flex flex-col justify-between py-1", faderHeight)}>
            {tickMarks.map((tick) => (
              <div 
                key={tick.db}
                className="absolute right-0 flex items-center"
                style={{ bottom: `${tick.pos}%`, transform: 'translateY(50%)' }}
              >
                <span 
                  className="text-[6px] font-mono w-4 text-right pr-0.5"
                  style={{ color: tick.db > 0 ? 'hsl(45, 60%, 55%)' : 'hsl(220,8%,40%)' }}
                >
                  {tick.db > 0 ? `+${tick.db}` : tick.db}
                </span>
                <div 
                  className="w-1 h-px"
                  style={{ backgroundColor: tick.db > 0 ? 'hsl(45, 40%, 40%)' : 'hsl(220,8%,28%)' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Volume Fader */}
        <div className={cn("relative flex items-center justify-center", faderHeight, compact ? "w-7" : "w-9")}>
          {/* Thin Fader Track Line - 2px width like reference */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full rounded-full"
            style={{ backgroundColor: 'hsl(220,15%,22%)' }}
          >
            {/* Filled portion BELOW the knob - brighter glow when boosting */}
            <div 
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-75"
              style={{ 
                height: `${(volume / MAX_VOLUME) * 100}%`,
                background: isBoost
                  ? `linear-gradient(to top, ${colorDark} 0%, ${colorBase} 50%, ${boostColorBright} 100%)`
                  : `linear-gradient(to top, ${colorDark} 0%, ${colorBase} 70%, ${colorGlow} 100%)`,
                boxShadow: isBoost
                  ? `0 0 12px ${boostColorBright}80, 0 0 5px ${colorGlow}60`
                  : `0 0 10px ${colorBase}70, 0 0 4px ${colorGlow}50`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={MAX_VOLUME}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          {/* Fader Knob - Gold/amber style for master, brighter when boosting */}
          <div 
            className={cn("absolute rounded-sm z-5 pointer-events-none", compact ? "w-6 h-3" : "w-8 h-5")}
            style={{ 
              bottom: `calc(${(volume / MAX_VOLUME) * 100}% - ${compact ? 6 : 12}px)`,
              background: isBoost
                ? `linear-gradient(180deg, hsl(45,60%,58%) 0%, hsl(45,55%,45%) 40%, hsl(45,50%,38%) 60%, hsl(45,55%,50%) 100%)`
                : `linear-gradient(180deg, hsl(45,50%,50%) 0%, hsl(45,45%,38%) 40%, hsl(45,40%,32%) 60%, hsl(45,45%,42%) 100%)`,
              boxShadow: isBoost
                ? `0 2px 8px rgba(200,150,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`
                : `0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)`,
              border: '1px solid hsl(45,30%,25%)',
            }}
          >
            {/* Bright indicator line in center */}
            <div 
              className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", compact ? "w-3 h-[1.5px]" : "w-5 h-[2px]")}
              style={{ 
                backgroundColor: isBoost ? boostColorBright : colorGlow,
                boxShadow: `0 0 6px ${isBoost ? boostColorBright : colorGlow}`,
              }}
            />
          </div>
        </div>

        {/* Stereo Level Meters - L and R */}
        <div className="flex gap-0.5">
          <div className="flex flex-col items-center">
            <span className={cn("text-[hsl(220,8%,40%)]", compact ? "text-[5px]" : "text-[6px] mb-0.5")}>L</span>
            <LevelMeter level={leftLevel} height={meterHeight} width={meterWidth} />
          </div>
          <div className="flex flex-col items-center">
            <span className={cn("text-[hsl(220,8%,40%)]", compact ? "text-[5px]" : "text-[6px] mb-0.5")}>R</span>
            <LevelMeter level={rightLevel} height={meterHeight} width={meterWidth} />
          </div>
        </div>

        {/* Gain Reduction Meter - hide in compact */}
        {!compact && (
          <div className="flex flex-col items-center">
            <span className="text-[6px] text-[hsl(0,50%,45%)] mb-0.5">GR</span>
            <div 
              className="relative bg-[hsl(0,0%,8%)] rounded-sm overflow-hidden"
              style={{ width: 5, height: meterHeight }}
            >
              {/* Gain reduction fill - red/orange, fills from TOP down */}
              <div 
                className="absolute top-0 left-0 right-0 transition-all duration-75"
                style={{ 
                  height: `${Math.min(100, gainReduction * 10)}%`,
                  background: gainReduction > 3 
                    ? 'linear-gradient(to bottom, hsl(0, 70%, 50%), hsl(30, 80%, 50%))'
                    : 'linear-gradient(to bottom, hsl(30, 70%, 50%), hsl(45, 70%, 55%))',
                  boxShadow: gainReduction > 0 ? '0 0 4px hsl(30, 70%, 50%)' : 'none',
                }}
              />
              {/* Scale marks */}
              <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div 
                    key={i}
                    className="w-full h-px bg-[hsl(0,0%,20%)]"
                    style={{ opacity: 0.3 }}
                  />
                ))}
              </div>
            </div>
            {/* GR value display */}
            <span 
              className="text-[8px] font-mono mt-1"
              style={{ 
                color: gainReduction > 0.5 ? 'hsl(30, 70%, 55%)' : 'hsl(220,8%,40%)',
              }}
            >
              {gainReduction > 0.1 ? `-${gainReduction.toFixed(1)}` : '0'}
            </span>
          </div>
        )}
      </div>

      {/* Output Label - smaller in compact */}
      <div 
        className={cn("text-center w-full leading-tight px-0.5 flex items-center justify-center font-medium uppercase tracking-wide",
          compact ? "text-[7px] min-h-[16px]" : "text-[9px] min-h-[24px]"
        )}
        style={{ color: 'hsl(220,8%,45%)' }}
      >
        {compact ? 'Out' : 'Main Out'}
      </div>
    </div>
  );
}
