import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Volume2, VolumeX, Mic2, Music, ChevronDown, Settings } from 'lucide-react';
import { ClickTrackEngine, ClickSubdivision } from '../lib/ClickTrackEngine';
import { CueTrackEngine, CueVoice, CueSection } from '../lib/CueTrackEngine';
import { cn } from '@/lib/utils';

export interface ClickCuePanelRef {
  seekTo: (time: number) => void;
  start: (time: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

interface ClickCuePanelProps {
  songTempo: number; // Original song BPM (read-only reference)
  clickTempo: number; // Independent click track tempo
  onClickTempoChange: (tempo: number) => void;
  timeSignature?: string;
  isPlaying: boolean;
  currentTime: number;
  sections: CueSection[];
  onSeek?: (time: number) => void;
  className?: string;
  // Start offset: when beat 1 actually starts in the song (in seconds)
  startOffset?: number;
  onStartOffsetChange?: (offset: number) => void;
  // Expose click state for external control (mixer strip)
  clickEnabled?: boolean;
  onClickEnabledChange?: (enabled: boolean) => void;
  clickVolume?: number;
  onClickVolumeChange?: (volume: number) => void;
  clickSubdivision?: ClickSubdivision;
  onClickSubdivisionChange?: (subdivision: ClickSubdivision) => void;
  // Expose cue state for external control (mixer strip)
  cueEnabled?: boolean;
  onCueEnabledChange?: (enabled: boolean) => void;
  cueVolume?: number;
  onCueVolumeChange?: (volume: number) => void;
  cueVoice?: CueVoice;
  onCueVoiceChange?: (voice: CueVoice) => void;
}

const ClickCuePanel = forwardRef<ClickCuePanelRef, ClickCuePanelProps>(({
  songTempo,
  clickTempo,
  onClickTempoChange,
  timeSignature = '4/4',
  isPlaying,
  currentTime,
  sections,
  className,
  // Start offset for beat alignment
  startOffset = 0,
  onStartOffsetChange,
  // External click state controls (for mixer integration)
  clickEnabled: externalClickEnabled,
  onClickEnabledChange,
  clickVolume: externalClickVolume,
  onClickVolumeChange: externalClickVolumeChange,
  clickSubdivision: externalClickSubdivision,
  onClickSubdivisionChange: externalClickSubdivisionChange,
  // External cue state controls (for mixer integration)
  cueEnabled: externalCueEnabled,
  onCueEnabledChange,
  cueVolume: externalCueVolume,
  onCueVolumeChange: externalCueVolumeChange,
  cueVoice: externalCueVoice,
  onCueVoiceChange: externalCueVoiceChange,
}, ref) => {
  // Use external state if provided, otherwise use internal state
  const [internalClickEnabled, setInternalClickEnabled] = useState(false);
  const [internalClickSubdivision, setInternalClickSubdivision] = useState<ClickSubdivision>('1/4');
  const [internalClickVolume, setInternalClickVolume] = useState(0.5);
  const [showClickSettings, setShowClickSettings] = useState(false);
  
  const clickEnabled = externalClickEnabled ?? internalClickEnabled;
  const clickSubdivision = externalClickSubdivision ?? internalClickSubdivision;
  const clickVolume = externalClickVolume ?? internalClickVolume;
  
  const setClickEnabled = onClickEnabledChange ?? setInternalClickEnabled;
  const setClickSubdivision = externalClickSubdivisionChange ?? setInternalClickSubdivision;
  const setClickVolume = externalClickVolumeChange ?? setInternalClickVolume;
  
  // Use external cue state if provided, otherwise use internal state
  const [internalCueEnabled, setInternalCueEnabled] = useState(false);
  const [internalCueVoice, setInternalCueVoice] = useState<CueVoice>('female');
  const [internalCueVolume, setInternalCueVolume] = useState(0.7);
  const [showCueSettings, setShowCueSettings] = useState(false);
  
  const cueEnabled = externalCueEnabled ?? internalCueEnabled;
  const cueVoice = externalCueVoice ?? internalCueVoice;
  const cueVolume = externalCueVolume ?? internalCueVolume;
  
  const setCueEnabled = onCueEnabledChange ?? setInternalCueEnabled;
  const setCueVoice = externalCueVoiceChange ?? setInternalCueVoice;
  const setCueVolume = externalCueVolumeChange ?? setInternalCueVolume;
  
  // Engine refs
  const clickEngineRef = useRef<ClickTrackEngine | null>(null);
  const cueEngineRef = useRef<CueTrackEngine | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Initialize engines
  useEffect(() => {
    clickEngineRef.current = new ClickTrackEngine({
      tempo: clickTempo,
      subdivision: clickSubdivision,
      volume: clickVolume,
      timeSignature,
      startOffset,
    });
    
    cueEngineRef.current = new CueTrackEngine({
      voice: cueVoice,
      volume: cueVolume,
      enabled: cueEnabled,
    });
    
    return () => {
      clickEngineRef.current?.dispose();
      cueEngineRef.current?.dispose();
    };
  }, []);

  // Update click tempo (independent from song tempo)
  useEffect(() => {
    clickEngineRef.current?.setTempo(clickTempo);
  }, [clickTempo]);

  // Keep click engine in sync when mixer controls change subdivision/volume externally
  useEffect(() => {
    clickEngineRef.current?.setSubdivision(clickSubdivision);
  }, [clickSubdivision]);

  useEffect(() => {
    clickEngineRef.current?.setVolume(clickVolume);
  }, [clickVolume]);

  // Update time signature
  useEffect(() => {
    clickEngineRef.current?.setTimeSignature(timeSignature);
  }, [timeSignature]);

  // Update start offset
  useEffect(() => {
    clickEngineRef.current?.setStartOffset(startOffset);
  }, [startOffset]);

  // Update sections
  useEffect(() => {
    cueEngineRef.current?.setSections(sections);
  }, [sections]);

  // Handle play/pause state - start click when playing AND enabled
  useEffect(() => {
    if (isPlaying) {
      if (clickEnabled) {
        clickEngineRef.current?.start(currentTime);
      } else {
        clickEngineRef.current?.stop();
      }
      if (cueEnabled) {
        cueEngineRef.current?.start(currentTime);
      }
    } else {
      clickEngineRef.current?.pause();
      cueEngineRef.current?.pause();
    }
  }, [isPlaying, clickEnabled, cueEnabled]);

  // Sync cue engine with external state changes
  useEffect(() => {
    cueEngineRef.current?.setEnabled(cueEnabled);
    if (cueEnabled && isPlaying) {
      cueEngineRef.current?.start(currentTime);
    } else if (!cueEnabled) {
      cueEngineRef.current?.stop();
    }
  }, [cueEnabled]);

  // Sync cue volume with external changes
  useEffect(() => {
    cueEngineRef.current?.setVolume(cueVolume);
  }, [cueVolume]);

  // Sync cue voice with external changes
  useEffect(() => {
    cueEngineRef.current?.setVoice(cueVoice);
  }, [cueVoice]);

  // Update current time for cue engine
  useEffect(() => {
    if (isPlaying && cueEnabled) {
      cueEngineRef.current?.updateTime(currentTime);
    }
  }, [currentTime, isPlaying, cueEnabled]);

  // Toggle click track
  const toggleClick = useCallback(() => {
    const newEnabled = !clickEnabled;
    setClickEnabled(newEnabled);
    
    if (newEnabled && isPlaying) {
      clickEngineRef.current?.start(currentTime);
    } else {
      clickEngineRef.current?.stop();
    }
  }, [clickEnabled, isPlaying, currentTime, setClickEnabled]);

  // Toggle cue track
  const toggleCue = useCallback(() => {
    const newEnabled = !cueEnabled;
    setCueEnabled(newEnabled);
    cueEngineRef.current?.setEnabled(newEnabled);
    
    if (newEnabled && isPlaying) {
      cueEngineRef.current?.start(currentTime);
    } else {
      cueEngineRef.current?.stop();
    }
  }, [cueEnabled, isPlaying, currentTime, setCueEnabled]);

  // Update click subdivision
  const handleSubdivisionChange = (subdivision: ClickSubdivision) => {
    setClickSubdivision(subdivision);
    clickEngineRef.current?.setSubdivision(subdivision);
  };

  // Update click volume
  const handleClickVolumeChange = (volume: number) => {
    setClickVolume(volume);
    clickEngineRef.current?.setVolume(volume);
  };

  // Update cue voice
  const handleVoiceChange = (voice: CueVoice) => {
    setCueVoice(voice);
    cueEngineRef.current?.setVoice(voice);
  };

  // Update cue volume
  const handleCueVolumeChange = (volume: number) => {
    setCueVolume(volume);
    cueEngineRef.current?.setVolume(volume);
  };

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    clickEngineRef.current?.seekTo(time);
    cueEngineRef.current?.seekTo(time);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      clickEngineRef.current?.seekTo(time);
      cueEngineRef.current?.seekTo(time);
    },
    start: (time: number) => {
      if (clickEnabled) clickEngineRef.current?.start(time);
      if (cueEnabled) cueEngineRef.current?.start(time);
    },
    stop: () => {
      clickEngineRef.current?.stop();
      cueEngineRef.current?.stop();
    },
    pause: () => {
      clickEngineRef.current?.pause();
      cueEngineRef.current?.pause();
    },
    resume: () => {
      if (clickEnabled) clickEngineRef.current?.resume();
      if (cueEnabled) cueEngineRef.current?.resume();
    },
  }), [clickEnabled, cueEnabled]);

  // Close settings dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowClickSettings(false);
        setShowCueSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subdivisionOptions: { label: string; value: ClickSubdivision }[] = [
    { label: '1/4', value: '1/4' },
    { label: '1/8', value: '1/8' },
    { label: '1/16', value: '1/16' },
  ];

  return (
    <div 
      className={cn(
        "flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2 border border-border/50",
        className
      )}
      ref={settingsRef}
    >
      {/* Click Track Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleClick}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
            clickEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
          )}
          title={clickEnabled ? "Click track on" : "Click track off"}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Click</span>
        </button>
        
        {/* Click Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowClickSettings(!showClickSettings);
              setShowCueSettings(false);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all",
              showClickSettings
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
            )}
          >
            <span>{clickSubdivision}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showClickSettings && "rotate-180")} />
          </button>
          
          {showClickSettings && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border rounded-lg shadow-xl z-50 p-3 space-y-3">
              {/* Start Offset (Beat 1 timing) */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Beat 1 Start</span>
                  <span>{startOffset.toFixed(2)}s</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.01"
                  value={startOffset}
                  onChange={(e) => onStartOffsetChange?.(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Adjust when beat 1 starts in the song
                </p>
              </div>

              {/* Click Tempo (Independent) */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Click Tempo</span>
                  <button
                    onClick={() => onClickTempoChange(songTempo)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-primary"
                  >
                    Sync to Song
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={240}
                    value={Math.round(clickTempo)}
                    onChange={(e) => onClickTempoChange(Number(e.target.value))}
                    className="flex-1 text-center text-sm font-mono bg-secondary border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground">BPM</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Song: {Math.round(songTempo)} BPM
                </div>
              </div>
              
              {/* Subdivision */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Subdivision</label>
                <div className="flex gap-1">
                  {subdivisionOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSubdivisionChange(opt.value)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors",
                        clickSubdivision === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Volume */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Volume</span>
                  <span>{Math.round(clickVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={clickVolume}
                  onChange={(e) => handleClickVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Cue Track Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleCue}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
            cueEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
          )}
          title={cueEnabled ? "Cue track on" : "Cue track off"}
        >
          <Mic2 className="w-3.5 h-3.5" />
          <span>Cue</span>
        </button>
        
        {/* Cue Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCueSettings(!showCueSettings);
              setShowClickSettings(false);
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all capitalize",
              showCueSettings
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 hover:bg-secondary text-muted-foreground"
            )}
          >
            <span>{cueVoice}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", showCueSettings && "rotate-180")} />
          </button>
          
          {showCueSettings && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-lg shadow-xl z-50 p-3 space-y-3">
              {/* Voice Selection */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Voice</label>
                <div className="flex gap-1">
                  {(['female', 'male'] as CueVoice[]).map((voice) => (
                    <button
                      key={voice}
                      onClick={() => handleVoiceChange(voice)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors capitalize",
                        cueVoice === voice
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      )}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Volume */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Volume</span>
                  <span>{Math.round(cueVolume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={cueVolume}
                  onChange={(e) => handleCueVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none 
                    [&::-webkit-slider-thumb]:w-3 
                    [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-primary"
                />
              </div>
              
              {/* Info */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Announces section names before they start
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Volume indicators */}
      <div className="flex items-center gap-2 ml-auto">
        {clickEnabled && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Volume2 className="w-3 h-3" />
            <span className="font-mono w-8">{Math.round(clickVolume * 100)}%</span>
          </div>
        )}
        {cueEnabled && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mic2 className="w-3 h-3" />
            <span className="font-mono w-8">{Math.round(cueVolume * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
});

ClickCuePanel.displayName = 'ClickCuePanel';

export default ClickCuePanel;
