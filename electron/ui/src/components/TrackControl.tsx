import { memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface TrackControlProps {
  track: any;
  onUpdate: (updates: any) => void;
  selectedOutputChannel?: number;
  onOutputChannelChange?: (channel: number) => void;
  maxChannels?: number;
}

// Helper to decode channel value into output and sub-channel
const decodeChannel = (value: number): { output: number; subChannel: number } => {
  if (value === 0) return { output: 0, subChannel: 0 }; // Main
  // External outputs: value 1-3 = Ext.1 (1/2, 1, 2), value 4-6 = Ext.2 (3/4, 3, 4), etc.
  const outputIndex = Math.floor((value - 1) / 3) + 1;
  const subChannel = ((value - 1) % 3);
  return { output: outputIndex, subChannel };
};

// Helper to encode output and sub-channel into single value
const encodeChannel = (output: number, subChannel: number): number => {
  if (output === 0) return 0; // Main
  return (output - 1) * 3 + 1 + subChannel;
};

// Get the number of available external outputs based on maxChannels
const getNumExternalOutputs = (maxChannels: number): number => {
  // Each stereo pair = 1 external output (e.g., 2 channels = 1 Ext output, 4 channels = 2 Ext outputs)
  return Math.max(1, Math.floor(maxChannels / 2));
};

function TrackControlComponent({ 
  track, 
  onUpdate,
  selectedOutputChannel = 0,
  onOutputChannelChange,
  maxChannels = 8
}: TrackControlProps) {
  const { output, subChannel } = decodeChannel(selectedOutputChannel);
  const numExternalOutputs = getNumExternalOutputs(maxChannels);

  const handleOutputChange = (newOutput: number) => {
    if (newOutput === 0) {
      onOutputChannelChange?.(0); // Main
    } else {
      // Default to stereo pair (subChannel = 0)
      onOutputChannelChange?.(encodeChannel(newOutput, 0));
    }
  };

  const handleSubChannelChange = (newSubChannel: number) => {
    onOutputChannelChange?.(encodeChannel(output, newSubChannel));
  };

  // Get the channel numbers for the current external output
  const getChannelNumbers = (outputIndex: number) => {
    const leftCh = (outputIndex - 1) * 2 + 1;
    const rightCh = (outputIndex - 1) * 2 + 2;
    return { leftCh, rightCh };
  };

  return (
    <div className="track-strip flex items-center gap-4 px-3 py-2">
      
      {/* Track Color Indicator + Name */}
      <div className="flex items-center gap-2.5 w-40 flex-shrink-0">
        <div
          className="w-2 h-8 rounded-sm flex-shrink-0"
          style={{ backgroundColor: track.color || '#6b9b8a' }}
        />
        <h4 className="font-medium text-xs text-[hsl(0,0%,75%)] truncate" title={track.name}>
          {track.name}
        </h4>
      </div>

      {/* Output Channel - Two dropdowns: Output selector + Sub-channel selector */}
      {onOutputChannelChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[hsl(0,0%,45%)] uppercase tracking-wide">Out</span>
          {/* Main output selector */}
          <select
            value={output}
            onChange={(e) => handleOutputChange(parseInt(e.target.value))}
            className="px-1.5 py-0.5 text-[10px] w-16 bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,22%)] rounded text-[hsl(220,8%,55%)]"
            title="Output"
          >
            <option value={0}>Main</option>
            {Array.from({ length: numExternalOutputs }, (_, i) => (
              <option key={i + 1} value={i + 1}>Ext. {i + 1}</option>
            ))}
          </select>
          
          {/* Sub-channel selector - only shown for external outputs */}
          {output > 0 && (
            <select
              value={subChannel}
              onChange={(e) => handleSubChannelChange(parseInt(e.target.value))}
              className="px-1.5 py-0.5 text-[10px] w-12 bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,22%)] rounded text-[hsl(220,8%,55%)]"
              title="Channel"
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
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-[20px]"></div>

      {/* Solo/Mute Buttons - Logic Pro style */}
      <button
        onClick={() => onUpdate({ solo: !track.solo })}
        className={`
          w-7 h-5 text-[10px] font-bold rounded transition-all duration-100
          ${track.solo
            ? 'btn-solo-active'
            : 'bg-[hsl(0,0%,22%)] text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,28%)] hover:text-[hsl(0,0%,70%)] border border-[hsl(0,0%,28%)]'
          }
        `}
      >
        S
      </button>

      <button
        onClick={() => onUpdate({ muted: !track.muted })}
        className={`
          w-7 h-5 text-[10px] font-bold rounded transition-all duration-100
          ${track.muted
            ? 'btn-mute-active'
            : 'bg-[hsl(0,0%,22%)] text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,28%)] hover:text-[hsl(0,0%,70%)] border border-[hsl(0,0%,28%)]'
          }
        `}
      >
        M
      </button>

      {/* Volume Control */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onUpdate({ volume: track.volume === 0 ? 1 : 0 })}
          className="w-6 h-6 flex items-center justify-center rounded text-[hsl(0,0%,50%)] hover:bg-[hsl(0,0%,25%)] hover:text-[hsl(0,0%,75%)] transition-colors"
        >
          {track.volume === 0 ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={track.volume}
          onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
          className="w-16"
        />
        <span 
          className="text-[10px] w-8 text-right font-mono"
          style={{ color: track.volume > 1 ? 'hsl(45, 70%, 55%)' : 'hsl(0,0%,50%)' }}
        >
          {track.volume > 1 ? `+${(20 * Math.log10(track.volume)).toFixed(0)}` : Math.round(track.volume * 100)}
        </span>
      </div>

      {/* Pan Control */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[hsl(0,0%,45%)] uppercase tracking-wide">Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(e) => onUpdate({ pan: parseFloat(e.target.value) })}
          className="w-14"
        />
        <span className="text-[10px] text-[hsl(0,0%,50%)] w-4 text-center font-mono">
          {track.pan > 0.1 ? 'R' : track.pan < -0.1 ? 'L' : 'C'}
        </span>
      </div>
    </div>
  );
}

export default memo(TrackControlComponent, (prev, next) => {
  return (
    prev.track === next.track &&
    prev.selectedOutputChannel === next.selectedOutputChannel &&
    prev.maxChannels === next.maxChannels
  );
});
