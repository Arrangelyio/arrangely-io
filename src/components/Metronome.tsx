import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
interface MetronomeProps {
  tempo: number;
  onTempoChange: (tempo: number) => void;
  timeSignature: '2/4' | '3/4' | '4/4' | '5/4' | '6/8' | '7/8' | '9/8' | '12/8' | '2/2';
  isPlaying?: boolean;
}
const Metronome: React.FC<MetronomeProps> = ({
  tempo,
  onTempoChange,
  timeSignature,
  isPlaying = false
}) => {
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const currentBeatRef = useRef<number>(1);
  const isActiveRef = useRef<boolean>(false); // Track active state in ref for scheduler
  const lookahead = 25.0; // Lookahead time in milliseconds
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (in seconds)
  const scheduleRef = useRef<number | null>(null);
  const lastPlayTimeRef = useRef<number>(0); // Track last actual play time
  const scheduledNodesRef = useRef<OscillatorNode[]>([]); // Track scheduled audio nodes
  // Calculate beats per measure for different time signatures
  const getBeatsPerMeasure = (timeSig: string) => {
    switch (timeSig) {
      case '2/4': return 2;
      case '3/4': return 3;
      case '4/4': return 4;
      case '5/4': return 5;
      case '6/8': return 6;
      case '7/8': return 7;
      case '9/8': return 9;
      case '12/8': return 12;
      case '2/2': return 2;
      default: return 4;
    }
  };
  const beatsPerMeasure = getBeatsPerMeasure(timeSignature);

  // Initialize Audio Context with low latency settings
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Create audio context with optimal settings for low latency
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        // Optimize for low latency
        sampleRate: 44100 // Standard sample rate
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // Create metronome click with precise timing and cleanup tracking
  const playClickAtTime = useCallback((isAccent: boolean = false, when: number = 0) => {
    if (!audioContextRef.current || isMuted) return;
    // Check ref state at execution time to avoid stale closure
    if (!isActiveRef.current) return;
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Track this node for cleanup
    scheduledNodesRef.current.push(oscillator);

    // Use 'when' parameter for precise scheduling
    const startTime = when || audioContextRef.current.currentTime;
    if (isAccent) {
      // Beat 1: Strong BEEP - very audible over music
      oscillator.frequency.value = 1200; // High frequency that cuts through
      oscillator.type = 'square'; // Sharp, cutting sound
      const adjustedVolume = volume / 100 * 0.4; // Much louder
      gainNode.gain.setValueAtTime(adjustedVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    } else {
      // Beats 2,3,4: Clear tick - audible but distinct from accent
      oscillator.frequency.value = 800; // Mid-high frequency 
      oscillator.type = 'triangle'; // Clear but softer than accent
      const adjustedVolume = volume / 100 * 0.25; // Loud enough to hear over music
      gainNode.gain.setValueAtTime(adjustedVolume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.12);
    }

    // Clean up node reference after it finishes
    oscillator.onended = () => {
      const index = scheduledNodesRef.current.indexOf(oscillator);
      if (index > -1) {
        scheduledNodesRef.current.splice(index, 1);
      }
    };
  }, [volume, isMuted]); // Removed isMetronomeActive dependency since we use ref

  // Legacy method for backward compatibility
  const playClick = useCallback((isAccent: boolean = false) => {
    playClickAtTime(isAccent, 0);
  }, [playClickAtTime]);

  // High-precision scheduler with tempo lock
  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const currentTime = audioContextRef.current.currentTime;

    // Tempo-locked scheduling - prevent drift
    while (nextNoteTimeRef.current < currentTime + scheduleAheadTime) {
      const beatToPlay = currentBeatRef.current;
      const isAccent = beatToPlay === 1;

      // Calculate exact timing for this beat
      const scheduleTime = nextNoteTimeRef.current;

      // Simplified visual synchronization - update immediately with each beat
      setCurrentBeat(beatToPlay);

      // Play the click with exact timing
      playClickAtTime(isAccent, scheduleTime);

      // Calculate next beat timing with locked precision
      const secondsPerBeat = 60.0 / tempo;
      nextNoteTimeRef.current += secondsPerBeat;

      // Advance beat counter
      currentBeatRef.current = currentBeatRef.current >= beatsPerMeasure ? 1 : currentBeatRef.current + 1;

      // Store the actual play time for consistency tracking
      lastPlayTimeRef.current = scheduleTime;
    }
  }, [beatsPerMeasure, tempo, playClickAtTime, scheduleAheadTime]);

  // Main metronome loop with stable timing
  useEffect(() => {
    // Sync ref with state to avoid stale closures
    isActiveRef.current = isMetronomeActive;
    
    if (isMetronomeActive) {
      initAudioContext();
      if (audioContextRef.current) {
        // Initialize timing precisely
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.005; // Small buffer
        currentBeatRef.current = 1;
        setCurrentBeat(1);
        lastPlayTimeRef.current = audioContextRef.current.currentTime;

        // Use setTimeout with self-correcting interval for stable timing
        let timeoutId: number;
        const preciseScheduler = () => {
          // Check ref instead of stale closure
          if (!isActiveRef.current) return;
          scheduler();

          // Self-correcting interval based on lookahead time
          const nextInterval = Math.max(1, lookahead / 4); // Dynamic interval
          timeoutId = window.setTimeout(preciseScheduler, nextInterval);
        };

        // Start the scheduler
        timeoutId = window.setTimeout(preciseScheduler, 1);
        scheduleRef.current = timeoutId;
      }
    } else {
      // Stop metronome and clean up all scheduled audio
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
        scheduleRef.current = null;
      }

      // Stop and disconnect all scheduled audio nodes immediately
      scheduledNodesRef.current.forEach(node => {
        try {
          node.stop();
          node.disconnect();
        } catch (e) {
          // Node might already be stopped
        }
      });
      scheduledNodesRef.current = [];
      currentBeatRef.current = 1;
      setCurrentBeat(1);
    }
    return () => {
      if (scheduleRef.current) {
        clearTimeout(scheduleRef.current);
        scheduleRef.current = null;
      }
    };
  }, [isMetronomeActive, scheduler, initAudioContext, lookahead]);

  // Reset beat when time signature changes
  useEffect(() => {
    currentBeatRef.current = 1;
    setCurrentBeat(1);
  }, [timeSignature]);

  // Toggle metronome with proper cleanup
  const toggleMetronome = () => {
    if (isMetronomeActive) {
      // Stop all scheduled audio nodes immediately
      scheduledNodesRef.current.forEach(node => {
        try {
          node.stop();
          node.disconnect();
        } catch (e) {
          // Node might already be stopped
        }
      });
      scheduledNodesRef.current = [];
    }
    setIsMetronomeActive(!isMetronomeActive);
  };

  // Handle tempo change from input
  const handleTempoChange = (newTempo: string) => {
    const tempoNum = parseInt(newTempo);
    if (tempoNum >= 40 && tempoNum <= 300) {
      onTempoChange(tempoNum);
    }
  };

  // Handle tempo change from slider
  const handleSliderChange = (value: number[]) => {
    onTempoChange(value[0]);
  };

  // Visual beat indicator - subtle and stable
  const renderBeatIndicator = () => {
    const beats = Array.from({
      length: beatsPerMeasure
    }, (_, i) => i + 1);
    return <div className="flex gap-3 justify-center mb-4">
        {beats.map(beat => <div key={beat} className={`relative w-5 h-5 rounded-full transition-colors duration-100 ${currentBeat === beat && isMetronomeActive ? beat === 1 ? 'bg-red-500' // Accent beat - red
      : 'bg-blue-500' // Regular beat - blue
      : 'bg-muted border border-border'}`}>
            {beat === 1 && <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xs font-bold ${currentBeat === 1 && isMetronomeActive ? 'text-white' : 'text-muted-foreground'}`}>1</span>
              </div>}
          </div>)}
        <div className="ml-3 text-xs text-muted-foreground self-center font-mono">
          {timeSignature}
        </div>
      </div>;
  };
  return <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          🎵 Metronome
          {isPlaying && <span className="text-xs text-muted-foreground">(YouTube Playing)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Beat Indicator */}
        {renderBeatIndicator()}
        
        
        {/* Tempo Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs min-w-fit">Tempo:</Label>
            <Input type="number" value={tempo} onChange={e => handleTempoChange(e.target.value)} className="w-20 h-8 text-sm" min="40" max="300" />
            <span className="text-xs text-muted-foreground">BPM</span>
          </div>
          
          {/* Tempo Slider */}
          <div className="space-y-2">
            <Slider value={[tempo]} onValueChange={handleSliderChange} max={300} min={40} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>40</span>
              <span>300</span>
            </div>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 p-0">
            {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Slider value={[volume]} onValueChange={value => setVolume(value[0])} max={100} min={0} step={5} className="flex-1" disabled={isMuted} />
          <span className="text-xs text-muted-foreground w-8">{isMuted ? '0' : volume}%</span>
        </div>

        {/* Play/Pause Button */}
        <Button onClick={toggleMetronome} className="w-full" variant={isMetronomeActive ? "destructive" : "default"}>
          {isMetronomeActive ? <>
              <Pause className="h-4 w-4 mr-2" />
              Stop Metronome
            </> : <>
              <Play className="h-4 w-4 mr-2" />
              Start Metronome
            </>}
        </Button>

        {/* Tempo Presets */}
        

        {/* Time Signature Display */}
        
      </CardContent>
    </Card>;
};
export default Metronome;