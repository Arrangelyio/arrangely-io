/**
 * Mixer Strip Component
 * Horizontal mixer view for tracks (Logic Pro mixer-style)
 * Shows pan, volume fader, level meter, solo/mute, channel selector, and track name vertically
 * Supports drag and drop reordering
 */

import { memo } from 'react';
import { GripVertical, Music2 } from 'lucide-react';
import LevelMeter from './LevelMeter';
import { cn } from '@/lib/utils';

// Soft, subtle professional channel colors - reduced saturation for ambient look
const CHANNEL_COLORS = [
  { hue: 30, sat: 40, light: 55 },   // Soft Orange
  { hue: 145, sat: 35, light: 50 },  // Soft Green
  { hue: 260, sat: 35, light: 55 },  // Soft Purple
  { hue: 200, sat: 40, light: 52 },  // Soft Blue
  { hue: 320, sat: 30, light: 55 },  // Soft Pink
  { hue: 50, sat: 35, light: 52 },   // Soft Gold
  { hue: 220, sat: 38, light: 55 },  // Soft Indigo
  { hue: 10, sat: 38, light: 52 },   // Soft Coral
  { hue: 170, sat: 35, light: 48 },  // Soft Teal
  { hue: 280, sat: 32, light: 52 },  // Soft Violet
  { hue: 90, sat: 32, light: 48 },   // Soft Lime
  { hue: 35, sat: 40, light: 50 },   // Soft Amber
  { hue: 240, sat: 35, light: 55 },  // Soft Blue-Purple
];

interface MixerStripProps {
  track: any;
  onUpdate: (updates: any) => void;
  trackIndex: number;
  selectedOutputChannel?: number;
  onOutputChannelChange?: (channel: number) => void;
  maxChannels?: number;
  level?: number;
  isDragging?: boolean;
  dragHandleProps?: any;
  compact?: boolean;
  pitchEnabled?: boolean;
  onPitchEnabledChange?: (enabled: boolean) => void;
  showPitchToggle?: boolean;
}

// Max volume is 2.0 (approx +6dB) to allow boosting tracks
const MAX_VOLUME = 2.0;

function MixerStripComponent({ 
  track, 
  onUpdate, 
  trackIndex,
  selectedOutputChannel = 0,
  onOutputChannelChange,
  maxChannels = 8,
  level = 0,
  isDragging = false,
  dragHandleProps,
  compact = false,
  pitchEnabled = true,
  onPitchEnabledChange,
  showPitchToggle = false,
}: MixerStripProps) {
  const channelColor = CHANNEL_COLORS[trackIndex % CHANNEL_COLORS.length];
  // Softer color variants for ambient look
  const colorBase = `hsl(${channelColor.hue}, ${channelColor.sat}%, ${channelColor.light}%)`;
  const colorDark = `hsl(${channelColor.hue}, ${channelColor.sat - 5}%, ${channelColor.light - 12}%)`;
  const colorGlow = `hsl(${channelColor.hue}, ${channelColor.sat - 10}%, ${channelColor.light + 8}%)`;
  const colorMuted = `hsl(${channelColor.hue}, ${channelColor.sat - 15}%, ${channelColor.light - 5}%)`;

  // Boost zone colors (gold/yellow when above 0dB)
  const isBoost = track.volume > 1;
  const boostColor = 'hsl(45, 70%, 55%)';
  const boostColorGlow = 'hsl(45, 75%, 65%)';

  // Convert volume (0-2) to dB display (-∞ to +6)
  const volumeToDb = (vol: number) => {
    if (vol === 0) return '-∞';
    const db = 20 * Math.log10(vol);
    return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  };

  // Tick mark positions for 0 to +6dB range (volume 0 to 2)
  // Position is percentage from bottom: 0% = volume 0, 100% = volume 2
  const tickMarks = [
    { db: 6, pos: 100 },   // +6dB at top (volume = 2.0)
    { db: 0, pos: 50 },    // 0dB at middle (volume = 1.0)
    { db: -6, pos: 37.5 }, // -6dB (volume ≈ 0.5)
    { db: -12, pos: 25 },  // -12dB (volume ≈ 0.25)
    { db: -24, pos: 12.5 },// -24dB (volume ≈ 0.063)
    { db: -48, pos: 3 },   // -48dB near bottom
  ];

  // Dynamic sizing based on compact mode
  const stripWidth = compact ? 'w-[60px] min-w-[60px]' : 'w-[80px] min-w-[80px]';
  const faderHeight = compact ? 'h-20' : 'h-32';
  const panSize = compact ? 'w-6 h-6' : 'w-8 h-8';
  const meterHeight = compact ? 80 : 128;
  const meterWidth = compact ? 5 : 6;
  const padding = compact ? 'p-1.5' : 'p-2';

  return (
    <div 
      className={`flex flex-col items-center bg-[hsl(220,15%,12%)] border border-[hsl(220,10%,18%)] rounded-lg h-full ${padding} ${stripWidth} transition-all ${
        isDragging ? 'opacity-90 shadow-2xl ring-2 ring-primary/50 scale-105' : ''
      }`}
      style={{
        borderTopColor: colorMuted,
        borderTopWidth: '2px',
      }}
    >
      {/* Drag Handle + Track Number */}
      <div className={cn("flex items-center gap-1", compact ? "mb-1" : "mb-2")}>
        {dragHandleProps && (
          <div 
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-[hsl(220,10%,20%)] transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5", "text-[hsl(220,8%,40%)]")} />
          </div>
        )}
        <div 
          className={cn("rounded-full flex items-center justify-center font-bold", compact ? "w-5 h-5 text-[8px]" : "w-6 h-6 text-[10px]")}
          style={{ 
            backgroundColor: `hsl(${channelColor.hue}, ${channelColor.sat - 10}%, ${channelColor.light - 15}%)`,
            color: `hsl(${channelColor.hue}, ${channelColor.sat}%, ${channelColor.light + 15}%)`,
          }}
        >
          {trackIndex + 1}
        </div>
      </div>

      {/* Pan Knob */}
      <div className={cn("flex flex-col items-center", compact ? "mb-1" : "mb-2")}>
        {!compact && <span className="text-[7px] text-[hsl(0,0%,45%)] uppercase tracking-wide mb-0.5">Pan</span>}
        <div className={cn("relative", panSize)}>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={track.pan}
            onChange={(e) => onUpdate({ pan: parseFloat(e.target.value) })}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title={`Pan: ${track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'} ${Math.abs(Math.round(track.pan * 100))}%`}
          />
          <div 
            className={cn("rounded-full bg-[hsl(220,12%,16%)] border-2 border-[hsl(220,10%,22%)] flex items-center justify-center shadow-inner", panSize)}
            style={{
              background: `conic-gradient(from 225deg, ${colorMuted} ${((track.pan + 1) / 2) * 270}deg, hsl(220,12%,14%) 0deg)`
            }}
          >
            <div 
              className={cn("bg-[hsl(0,0%,75%)] rounded-full origin-bottom shadow-sm", compact ? "w-0.5 h-2.5" : "w-1 h-3.5")}
              style={{ transform: `rotate(${track.pan * 135}deg)` }}
            />
          </div>
        </div>
      </div>

      {/* dB Display - gold when boosting */}
      <div 
        className={cn("font-mono rounded", compact ? "text-[8px] mb-1 h-3 px-1" : "text-[10px] mb-1.5 h-4 px-1.5 py-0.5")}
        style={{ 
          color: isBoost ? boostColor : track.volume > 0.9 ? colorGlow : 'hsl(220,8%,50%)',
          backgroundColor: isBoost ? 'hsl(45, 30%, 12%)' : 'hsl(220,12%,10%)',
        }}
      >
        {volumeToDb(track.volume)} dB
      </div>

      {/* Volume Fader + Tick Marks + Level Meter */}
      <div className={cn("flex gap-1", compact ? "mb-1" : "mb-2")}>
        {/* Tick Marks - Left */}
        <div className={cn("relative w-4 flex flex-col justify-between py-1", faderHeight)}>
          {tickMarks.map((tick) => (
            <div 
              key={tick.db}
              className="absolute right-0 flex items-center gap-0.5"
              style={{ bottom: `${tick.pos}%`, transform: 'translateY(50%)' }}
            >
              <span 
                className={cn("font-mono text-right", compact ? "text-[5px] w-3" : "text-[6px] w-4")}
                style={{ color: tick.db > 0 ? 'hsl(45, 50%, 50%)' : 'hsl(220,8%,35%)' }}
              >
                {tick.db > 0 ? `+${tick.db}` : tick.db}
              </span>
              <div 
                className={cn("h-px", compact ? "w-1" : "w-1.5")}
                style={{ backgroundColor: tick.db > 0 ? 'hsl(45, 40%, 35%)' : 'hsl(220,8%,28%)' }}
              />
            </div>
          ))}
        </div>

        {/* Volume Fader */}
        <div className={cn("relative flex items-center justify-center", faderHeight, compact ? "w-7" : "w-9")}>
       
          {/* Thin Fader Track Line - 2px width like reference */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full rounded-full"
            style={{ backgroundColor: 'hsl(220,15%,22%)' }}
          >
            {/* Filled portion BELOW the knob - soft glow gradient, gold when boosting */}
            <div 
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-75"
              style={{ 
                height: `${(track.volume / MAX_VOLUME) * 100}%`,
                background: isBoost
                  ? `linear-gradient(to top, ${colorDark} 0%, ${colorBase} 40%, ${boostColor} 80%, ${boostColorGlow} 100%)`
                  : `linear-gradient(to top, ${colorDark} 0%, ${colorBase} 70%, ${colorGlow} 100%)`,
                boxShadow: isBoost
                  ? `0 0 10px ${boostColor}70, 0 0 4px ${boostColorGlow}50`
                  : `0 0 8px ${colorBase}60, 0 0 3px ${colorGlow}40`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={MAX_VOLUME}
            step={0.01}
            value={track.volume}
            onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          {/* Fader Knob - Clean dark style with colored center line, gold when boosting */}
          <div 
            className={cn("absolute rounded-sm z-5 pointer-events-none", compact ? "w-6 h-3" : "w-8 h-4")}
            style={{ 
              bottom: `calc(${(track.volume / MAX_VOLUME) * 100}% - ${compact ? 6 : 10}px)`,
              background: isBoost
                ? `linear-gradient(180deg, hsl(45,50%,50%) 0%, hsl(45,45%,38%) 40%, hsl(45,40%,32%) 60%, hsl(45,45%,42%) 100%)`
                : `linear-gradient(180deg, hsl(220,12%,38%) 0%, hsl(220,15%,28%) 40%, hsl(220,15%,22%) 60%, hsl(220,12%,30%) 100%)`,
              boxShadow: `0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
              border: isBoost ? '1px solid hsl(45,30%,25%)' : '1px solid hsl(220,12%,18%)',
            }}
          >
            {/* Colored indicator line in center */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[2px] rounded-full"
              style={{ 
                backgroundColor: isBoost ? boostColorGlow : colorBase,
                boxShadow: `0 0 4px ${isBoost ? boostColorGlow : colorBase}80`,
              }}
            />
          </div>
        </div>

        {/* Level Meter with subtle channel color tint */}
        <div className="relative">
          <LevelMeter level={level} height={meterHeight} width={meterWidth} />
          {/* Very subtle color overlay */}
          <div 
            className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-sm opacity-20"
            style={{ 
              height: `${Math.min(level * 100, 100)}%`,
              background: `linear-gradient(to top, transparent, ${colorMuted})`,
            }}
          />
        </div>
      </div>

      {/* Mute/Solo/Pitch Buttons */}
      <div className={cn("flex flex-wrap gap-1 justify-center", compact ? "mb-1" : "mb-1.5")}>
        <button
          onClick={() => onUpdate({ muted: !track.muted })}
          className={cn("font-bold rounded transition-all", 
            compact ? "w-5 h-4 text-[7px]" : "w-6 h-5 text-[8px]",
            track.muted
              ? 'btn-mute-active'
              : 'bg-[hsl(220,12%,15%)] text-[hsl(220,8%,40%)] hover:bg-[hsl(220,10%,20%)] border border-[hsl(220,10%,22%)]'
          )}
        >
          M
        </button>
        <button
          onClick={() => onUpdate({ solo: !track.solo })}
          className={cn("font-bold rounded transition-all",
            compact ? "w-5 h-4 text-[7px]" : "w-6 h-5 text-[8px]",
            track.solo
              ? 'btn-solo-active'
              : 'bg-[hsl(220,12%,15%)] text-[hsl(220,8%,40%)] hover:bg-[hsl(220,10%,20%)] border border-[hsl(220,10%,22%)]'
          )}
        >
          S
        </button>
        {/* Pitch Toggle Button - only shown when pitch control is active */}
        {showPitchToggle && onPitchEnabledChange && (
          <button
            onClick={() => onPitchEnabledChange(!pitchEnabled)}
            className={cn("font-bold rounded transition-all flex items-center justify-center",
              compact ? "w-5 h-4 text-[7px]" : "w-6 h-5 text-[8px]",
              pitchEnabled
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/40'
                : 'bg-[hsl(220,12%,15%)] text-[hsl(220,8%,40%)] hover:bg-[hsl(220,10%,20%)] border border-[hsl(220,10%,22%)] line-through'
            )}
            title={pitchEnabled ? 'Pitch enabled - click to exclude' : 'Pitch disabled - click to include'}
          >
            <Music2 className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
          </button>
        )}
      </div>

      {/* Channel Selector - Two dropdowns: Output + Sub-channel */}
      {onOutputChannelChange && !compact && (
        <div className="w-full mb-1.5">
          <span className="text-[6px] text-[hsl(220,8%,38%)] uppercase block text-center mb-0.5 tracking-wide">Output</span>
          {(() => {
            // Decode channel value into output and sub-channel
            const decodeChannel = (value: number): { output: number; subChannel: number } => {
              if (value === 0) return { output: 0, subChannel: 0 };
              const outputIndex = Math.floor((value - 1) / 3) + 1;
              const subChannel = ((value - 1) % 3);
              return { output: outputIndex, subChannel };
            };
            
            const encodeChannel = (output: number, subChannel: number): number => {
              if (output === 0) return 0;
              return (output - 1) * 3 + 1 + subChannel;
            };
            
            const { output, subChannel } = decodeChannel(selectedOutputChannel);
            const numExternalOutputs = Math.max(1, Math.floor(maxChannels / 2));
            
            const handleOutputChange = (newOutput: number) => {
              if (newOutput === 0) {
                onOutputChannelChange(0);
              } else {
                onOutputChannelChange(encodeChannel(newOutput, 0));
              }
            };
            
            const handleSubChannelChange = (newSubChannel: number) => {
              onOutputChannelChange(encodeChannel(output, newSubChannel));
            };
            
            const getChannelNumbers = (outputIndex: number) => {
              const leftCh = (outputIndex - 1) * 2 + 1;
              const rightCh = (outputIndex - 1) * 2 + 2;
              return { leftCh, rightCh };
            };
            
            return (
              <div className="flex flex-col gap-1">
                <select
                  value={output}
                  onChange={(e) => handleOutputChange(parseInt(e.target.value))}
                  className="w-full text-[9px] px-1 py-0.5 bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,22%)] rounded text-[hsl(220,8%,55%)] focus:outline-none focus:ring-1"
                  style={{ focusRingColor: colorMuted }}
                >
                  <option value={0}>Main</option>
                  {Array.from({ length: numExternalOutputs }, (_, i) => (
                    <option key={i + 1} value={i + 1}>Ext. {i + 1}</option>
                  ))}
                </select>
                
                {output > 0 && (
                  <select
                    value={subChannel}
                    onChange={(e) => handleSubChannelChange(parseInt(e.target.value))}
                    className="w-full text-[9px] px-1 py-0.5 bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,22%)] rounded text-[hsl(220,8%,55%)] focus:outline-none focus:ring-1"
                    style={{ focusRingColor: colorMuted }}
                  >
                    {(() => {
                      const { leftCh, rightCh } = getChannelNumbers(output);
                      return (
                        <>
                          <option value={0}>{leftCh}/{rightCh}</option>
                          <option value={1}>{leftCh}</option>
                          <option value={2}>{rightCh}</option>
                        </>
                      );
                    })()}
                  </select>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Track Name - competitor style with label at bottom */}
      <div className={cn("w-full text-center border-t border-[hsl(220,10%,20%)]", compact ? "pt-1 mt-0.5" : "pt-1.5 mt-0.5")}>
        <div
          className={cn("leading-tight px-0.5 flex items-center justify-center uppercase font-bold tracking-wide", 
            compact ? "text-[7px] min-h-[16px]" : "text-[9px] min-h-[22px]"
          )}
          style={{ color: colorBase }}
          title={track.name || track.filename || `Track ${trackIndex + 1}`}
        >
          <span className={cn("break-words", compact ? "line-clamp-1" : "line-clamp-2")}>
            {track.name || track.filename || `Track ${trackIndex + 1}`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(MixerStripComponent, (prev, next) => {
  return (
    prev.track === next.track &&
    prev.trackIndex === next.trackIndex &&
    prev.selectedOutputChannel === next.selectedOutputChannel &&
    prev.maxChannels === next.maxChannels &&
    prev.level === next.level &&
    prev.isDragging === next.isDragging &&
    prev.dragHandleProps === next.dragHandleProps &&
    prev.compact === next.compact &&
    prev.pitchEnabled === next.pitchEnabled &&
    prev.showPitchToggle === next.showPitchToggle
  );
});
