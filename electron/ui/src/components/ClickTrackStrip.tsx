/**
 * Click Track Strip Component
 * Dedicated mixer strip for metronome/click track control
 * Positioned before Master strip in the mixer
 */

import { Music } from 'lucide-react';
import { ClickSubdivision } from '../lib/ClickTrackEngine';
import { cn } from '@/lib/utils';

interface ClickTrackStripProps {
  enabled: boolean;
  onToggle: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  subdivision: ClickSubdivision;
  onSubdivisionChange: (subdivision: ClickSubdivision) => void;
  clickTempo: number;
  onClickTempoChange: (tempo: number) => void;
  songTempo: number;
  startOffset: number;
  onStartOffsetChange: (offset: number) => void;
  selectedOutputChannel?: number;
  onOutputChannelChange?: (channel: number) => void;
  maxChannels?: number;
  compact?: boolean;
}

export default function ClickTrackStrip({
  enabled,
  onToggle,
  volume,
  onVolumeChange,
  subdivision,
  onSubdivisionChange,
  clickTempo,
  onClickTempoChange,
  songTempo,
  startOffset,
  onStartOffsetChange,
  selectedOutputChannel = 0,
  onOutputChannelChange,
  maxChannels = 8,
  compact = false,
}: ClickTrackStripProps) {
  // Click track uses a distinctive cyan/teal color
  const colorBase = enabled ? 'hsl(180, 60%, 50%)' : 'hsl(220, 10%, 35%)';
  const colorDark = enabled ? 'hsl(180, 55%, 35%)' : 'hsl(220, 10%, 25%)';
  const colorGlow = enabled ? 'hsl(180, 65%, 60%)' : 'hsl(220, 10%, 40%)';
  const colorMuted = enabled ? 'hsl(180, 40%, 40%)' : 'hsl(220, 10%, 30%)';

  // Max volume is 2.0 (approx +6dB) to allow boosting click above tracks
  const maxVolume = 2.0;

  // Convert volume to dB display (-∞ to +6)
  const volumeToDb = (vol: number) => {
    if (vol === 0) return '-∞';
    const db = 20 * Math.log10(vol);
    return db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1);
  };

  // Tick mark positions (+6dB, 0dB, -6dB, -12dB, -24dB, -48dB)
  const tickMarks = [
    { db: 6, pos: 100 },
    { db: 0, pos: 75 },
    { db: -6, pos: 56 },
    { db: -12, pos: 38 },
    { db: -24, pos: 19 },
    { db: -48, pos: 5 },
  ];

  const subdivisionOptions: ClickSubdivision[] = ['1/4', '1/8', '1/16'];

  // Sync with song tempo
  const syncToSongTempo = () => {
    onClickTempoChange(songTempo);
  };

  // Output channel encoding/decoding (same as MixerStrip)
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
    if (!onOutputChannelChange) return;
    if (newOutput === 0) {
      onOutputChannelChange(0);
    } else {
      onOutputChannelChange(encodeChannel(newOutput, 0));
    }
  };

  const handleSubChannelChange = (newSubChannel: number) => {
    if (!onOutputChannelChange) return;
    onOutputChannelChange(encodeChannel(output, newSubChannel));
  };

  const getChannelNumbers = (outputIndex: number) => {
    const leftCh = (outputIndex - 1) * 2 + 1;
    const rightCh = (outputIndex - 1) * 2 + 2;
    return { leftCh, rightCh };
  };

  // Dynamic sizing based on compact mode
  const stripWidth = compact ? 'w-[60px] min-w-[60px]' : 'w-[80px] min-w-[80px]';
  const faderHeight = compact ? 'h-20' : 'h-32';
  const padding = compact ? 'p-1.5' : 'p-2';

  return (
    <div 
      className={cn(
        "flex flex-col items-center rounded-lg transition-colors h-full",
        padding,
        stripWidth,
        enabled 
          ? "bg-[hsl(180,15%,10%)] border border-[hsl(180,30%,25%)]" 
          : "bg-[hsl(220,15%,10%)] border border-[hsl(220,10%,20%)]"
      )}
      style={{
        borderTopColor: colorMuted,
        borderTopWidth: '3px',
      }}
    >
      {/* Click Label with colored badge like track strips */}
      <div className={cn("flex items-center gap-1", compact ? "mb-1" : "mb-2")}>
        <div 
          className={cn("rounded-full flex items-center justify-center", compact ? "w-5 h-5" : "w-6 h-6")}
          style={{ 
            backgroundColor: enabled ? 'hsl(180, 50%, 20%)' : 'hsl(220, 10%, 18%)',
          }}
        >
          <Music className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} style={{ color: colorBase }} />
        </div>
        <span 
          className={cn("font-bold uppercase tracking-wider", compact ? "text-[9px]" : "text-xs")}
          style={{ color: colorBase }}
        >
          Click
        </span>
      </div>

      {/* Enable/Disable Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "px-2 py-0.5 rounded font-medium transition-colors",
          compact ? "text-[8px] mb-1" : "text-[9px] mb-2",
          enabled
            ? "bg-[hsl(180,50%,25%)] text-[hsl(180,60%,70%)] border border-[hsl(180,40%,35%)]"
            : "bg-[hsl(220,12%,14%)] text-[hsl(220,8%,50%)] border border-[hsl(220,10%,20%)] hover:bg-[hsl(220,12%,18%)]"
        )}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>

      {/* Tempo Control - hide in compact */}
      {!compact && (
        <div className="w-full mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-[hsl(220,8%,45%)] uppercase">Tempo</span>
            <button
              onClick={syncToSongTempo}
              className="text-[7px] px-1 py-0.5 rounded bg-[hsl(220,12%,18%)] hover:bg-[hsl(220,12%,22%)] text-[hsl(180,50%,55%)] transition-colors"
              title={`Sync to song tempo (${Math.round(songTempo)} BPM)`}
            >
              Sync
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={40}
              max={240}
              value={Math.round(clickTempo)}
              onChange={(e) => onClickTempoChange(Number(e.target.value))}
              className="w-full text-center text-[11px] font-mono bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,22%)] rounded px-1 py-0.5 text-foreground focus:outline-none focus:border-[hsl(180,40%,40%)]"
            />
          </div>
        </div>
      )}

      {/* Beat 1 Start (Start Offset) */}
      <div className="w-full mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] text-[hsl(220,8%,45%)] uppercase">Beat 1</span>
          <span className="text-[8px] text-[hsl(220,8%,45%)] font-mono">{startOffset.toFixed(2)}s</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={0.01}
          value={startOffset}
          onChange={(e) => onStartOffsetChange(parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer bg-[hsl(220,12%,16%)]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[hsl(180,60%,55%)]"
          title="Beat 1 Start offset"
        />
      </div>

      {/* Subdivision Selector */}
      <div className="w-full mb-2">
        <span className="text-[8px] text-[hsl(220,8%,45%)] uppercase block mb-1">Division</span>
        <div className="flex gap-0.5">
          {subdivisionOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => onSubdivisionChange(opt)}
              className={cn(
                "flex-1 px-1 py-1 rounded text-[9px] font-medium transition-colors",
                subdivision === opt
                  ? "bg-[hsl(180,50%,30%)] text-[hsl(180,60%,80%)]"
                  : "bg-[hsl(220,12%,16%)] text-[hsl(220,8%,50%)] hover:bg-[hsl(220,12%,20%)]"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* dB Display */}
      <div 
        className="text-[10px] font-mono mb-1.5 h-4 px-1.5 py-0.5 rounded"
        style={{ 
          color: enabled && volume > 0.9 ? colorGlow : 'hsl(220,8%,50%)',
          backgroundColor: 'hsl(220,12%,10%)',
        }}
      >
        {volumeToDb(volume)} dB
      </div>

      {/* Volume Fader + Tick Marks - Compact height (h-32) */}
      <div className="flex gap-0.5 mb-2">
        {/* Tick Marks - Left */}
        <div className="relative h-32 w-4 flex flex-col justify-between py-1">
          {tickMarks.map((tick) => (
            <div 
              key={tick.db}
              className="absolute right-0 flex items-center"
              style={{ bottom: `${tick.pos}%`, transform: 'translateY(50%)' }}
            >
              <span className="text-[6px] text-[hsl(220,8%,40%)] font-mono w-4 text-right pr-0.5">
                {tick.db > 0 ? `+${tick.db}` : tick.db}
              </span>
              <div className="w-1 h-px bg-[hsl(220,8%,28%)]" />
            </div>
          ))}
        </div>

        {/* Volume Fader */}
        <div className="relative h-32 w-9 flex items-center justify-center">
          {/* Thin Fader Track Line */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full rounded-full"
            style={{ backgroundColor: 'hsl(220,15%,22%)' }}
          >
            {/* Filled portion BELOW the knob */}
            <div 
              className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-75"
              style={{ 
                height: `${(volume / maxVolume) * 100}%`,
                background: enabled 
                  ? `linear-gradient(to top, ${colorDark} 0%, ${colorBase} 70%, ${colorGlow} 100%)`
                  : 'hsl(220,10%,30%)',
                boxShadow: enabled ? `0 0 10px ${colorBase}70, 0 0 4px ${colorGlow}50` : 'none',
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={maxVolume}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          {/* Fader Knob */}
          <div 
            className="absolute w-8 h-4 rounded-sm z-5 pointer-events-none"
            style={{ 
              bottom: `calc(${(volume / maxVolume) * 100}% - 10px)`,
              background: enabled
                ? `linear-gradient(180deg, hsl(180,40%,45%) 0%, hsl(180,35%,35%) 40%, hsl(180,30%,28%) 60%, hsl(180,35%,38%) 100%)`
                : `linear-gradient(180deg, hsl(220,10%,40%) 0%, hsl(220,10%,30%) 40%, hsl(220,10%,25%) 60%, hsl(220,10%,35%) 100%)`,
              boxShadow: `0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)`,
              border: enabled ? '1px solid hsl(180,30%,30%)' : '1px solid hsl(220,10%,25%)',
            }}
          >
            {/* Bright indicator line in center */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-[2px] rounded-full"
              style={{ 
                backgroundColor: enabled ? colorGlow : 'hsl(220,10%,45%)',
                boxShadow: enabled ? `0 0 6px ${colorGlow}` : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Output Channel Selector */}
      {onOutputChannelChange && (
        <div className="w-full mb-2">
          <span className="text-[7px] text-[hsl(220,8%,38%)] uppercase block text-center mb-1 tracking-wide">Output</span>
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
        </div>
      )}

    </div>
  );
}
