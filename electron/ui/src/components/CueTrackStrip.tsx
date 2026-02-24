/**
 * Cue Track Strip Component
 * Dedicated mixer strip for section cue announcements
 * Positioned before Master strip in the mixer
 */

import { Mic2, Volume2, VolumeX } from 'lucide-react';
import { CueVoice } from '../lib/CueTrackEngine';
import { cn } from '@/lib/utils';

interface CueTrackStripProps {
  enabled: boolean;
  onToggle: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  voice: CueVoice;
  onVoiceChange: (voice: CueVoice) => void;
  selectedOutputChannel?: number;
  onOutputChannelChange?: (channel: number) => void;
  maxChannels?: number;
  compact?: boolean;
}

export default function CueTrackStrip({
  enabled,
  onToggle,
  volume,
  onVolumeChange,
  voice,
  onVoiceChange,
  selectedOutputChannel = 0,
  onOutputChannelChange,
  maxChannels = 8,
  compact = false,
}: CueTrackStripProps) {
  // Cue track uses a distinctive purple/violet color
  const colorBase = enabled ? 'hsl(270, 60%, 55%)' : 'hsl(220, 10%, 35%)';
  const colorDark = enabled ? 'hsl(270, 55%, 40%)' : 'hsl(220, 10%, 25%)';
  const colorGlow = enabled ? 'hsl(270, 65%, 65%)' : 'hsl(220, 10%, 40%)';
  const colorMuted = enabled ? 'hsl(270, 40%, 45%)' : 'hsl(220, 10%, 30%)';

  // Convert volume (0-1) to dB display (-∞ to 0)
  const volumeToDb = (vol: number) => {
    if (vol === 0) return '-∞';
    const db = 20 * Math.log10(vol);
    return db.toFixed(1);
  };

  // Tick mark positions (0dB, -6dB, -12dB, -24dB, -48dB)
  const tickMarks = [
    { db: 0, pos: 100 },
    { db: -6, pos: 75 },
    { db: -12, pos: 50 },
    { db: -24, pos: 25 },
    { db: -48, pos: 6 },
  ];

  const voiceOptions: CueVoice[] = ['female', 'male'];

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
          ? "bg-[hsl(270,15%,10%)] border border-[hsl(270,30%,25%)]" 
          : "bg-[hsl(220,15%,10%)] border border-[hsl(220,10%,20%)]"
      )}
      style={{
        borderTopColor: colorMuted,
        borderTopWidth: '3px',
      }}
    >
      {/* Cue Label with colored badge like track strips */}
      <div className={cn("flex items-center gap-1", compact ? "mb-1" : "mb-2")}>
        <div 
          className={cn("rounded-full flex items-center justify-center", compact ? "w-5 h-5" : "w-6 h-6")}
          style={{ 
            backgroundColor: enabled ? 'hsl(270, 50%, 22%)' : 'hsl(220, 10%, 18%)',
          }}
        >
          <Mic2 className={cn(compact ? "w-3 h-3" : "w-3.5 h-3.5")} style={{ color: colorBase }} />
        </div>
        <span 
          className={cn("font-bold uppercase tracking-wider", compact ? "text-[9px]" : "text-xs")}
          style={{ color: colorBase }}
        >
          Cue
        </span>
      </div>

      {/* Enable/Disable Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          "px-2 py-0.5 rounded font-medium transition-colors",
          compact ? "text-[8px] mb-1" : "text-[9px] mb-2",
          enabled
            ? "bg-[hsl(270,50%,30%)] text-[hsl(270,60%,75%)] border border-[hsl(270,40%,40%)]"
            : "bg-[hsl(220,12%,14%)] text-[hsl(220,8%,50%)] border border-[hsl(220,10%,20%)] hover:bg-[hsl(220,12%,18%)]"
        )}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>

      {/* Voice Selector - hide in compact */}
      {!compact && (
        <div className="w-full mb-2">
          <span className="text-[8px] text-[hsl(220,8%,45%)] uppercase block mb-1">Voice</span>
          <div className="flex gap-0.5">
            {voiceOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => onVoiceChange(opt)}
                className={cn(
                  "flex-1 px-1 py-1 rounded text-[9px] font-medium transition-colors capitalize",
                  voice === opt
                    ? "bg-[hsl(270,50%,35%)] text-[hsl(270,60%,85%)]"
                    : "bg-[hsl(220,12%,16%)] text-[hsl(220,8%,50%)] hover:bg-[hsl(220,12%,20%)]"
                )}
              >
                {opt === 'female' ? 'F' : 'M'}
              </button>
            ))}
          </div>
        </div>
      )}

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
                {tick.db}
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
                height: `${volume * 100}%`,
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
            max={1}
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
              bottom: `calc(${volume * 100}% - 10px)`,
              background: enabled
                ? `linear-gradient(180deg, hsl(270,40%,50%) 0%, hsl(270,35%,40%) 40%, hsl(270,30%,33%) 60%, hsl(270,35%,43%) 100%)`
                : `linear-gradient(180deg, hsl(220,10%,40%) 0%, hsl(220,10%,30%) 40%, hsl(220,10%,25%) 60%, hsl(220,10%,35%) 100%)`,
              boxShadow: `0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)`,
              border: enabled ? '1px solid hsl(270,30%,35%)' : '1px solid hsl(220,10%,25%)',
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

        {/* Mute button replacing meter */}
        <div className="flex flex-col items-center justify-center h-32">
          <button
            onClick={onToggle}
            className={cn(
              "p-1.5 rounded transition-colors",
              enabled
                ? "bg-[hsl(270,50%,30%)] text-[hsl(270,60%,75%)]"
                : "bg-[hsl(220,12%,16%)] text-[hsl(220,8%,40%)] hover:bg-[hsl(220,12%,20%)]"
            )}
            title={enabled ? 'Mute cue' : 'Enable cue'}
          >
            {enabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
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
