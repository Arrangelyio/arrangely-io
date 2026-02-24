/**
 * Click Track Engine
 * 
 * Generates metronome clicks synchronized with the song's tempo.
 * Supports different subdivisions (1/4, 1/8, 1/16) and volume control.
 */

export type ClickSubdivision = '1/4' | '1/8' | '1/16';

export interface ClickTrackOptions {
  tempo: number; // BPM
  subdivision: ClickSubdivision;
  volume: number; // 0-1
  timeSignature?: string; // e.g., '4/4'
  accentDownbeat?: boolean;
  startOffset?: number; // Time in seconds when beat 1 actually starts (default: 0)
}

export class ClickTrackEngine {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private tempo: number = 120;
  private subdivision: ClickSubdivision = '1/4';
  private volume: number = 0.5;
  private timeSignature: string = '4/4';
  private accentDownbeat: boolean = true;
  private startOffset: number = 0; // When beat 1 actually starts in the song
  
  private schedulerIntervalId: number | null = null;
  private nextClickTime: number = 0;
  private currentBeat: number = 0;
  private currentSubBeat: number = 0;
  private lookahead: number = 25; // ms
  private scheduleAheadTime: number = 0.1; // seconds
  
  private startTime: number = 0;
  private pausedAt: number = 0;
  
  // Oscillator pool for click sounds
  private clickGain: GainNode | null = null;

  constructor(options?: Partial<ClickTrackOptions>) {
    if (options?.tempo) this.tempo = options.tempo;
    if (options?.subdivision) this.subdivision = options.subdivision;
    if (options?.volume !== undefined) this.volume = options.volume;
    if (options?.timeSignature) this.timeSignature = options.timeSignature;
    if (options?.accentDownbeat !== undefined) this.accentDownbeat = options.accentDownbeat;
    if (options?.startOffset !== undefined) this.startOffset = options.startOffset;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private getBeatsPerMeasure(): number {
    const [numerator] = this.timeSignature.split('/').map(Number);
    return numerator || 4;
  }

  private getSubdivisionMultiplier(): number {
    switch (this.subdivision) {
      case '1/4': return 1;
      case '1/8': return 2;
      case '1/16': return 4;
      default: return 1;
    }
  }

  private getSecondsPerClick(): number {
    const secondsPerBeat = 60 / this.tempo;
    return secondsPerBeat / this.getSubdivisionMultiplier();
  }

  private scheduleClick(time: number, isAccent: boolean, isSubBeat: boolean) {
    const ctx = this.getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different frequencies for accent, beat, and sub-beat
    if (isAccent) {
      oscillator.frequency.value = 1500; // High pitch for downbeat
    } else if (isSubBeat) {
      oscillator.frequency.value = 600; // Lower pitch for subdivisions
    } else {
      oscillator.frequency.value = 1000; // Medium pitch for regular beats
    }
    
    oscillator.type = 'sine';
    
    // Volume based on click type
    let clickVolume = this.volume;
    if (isSubBeat) {
      clickVolume *= 0.5; // Subdivisions are quieter
    } else if (isAccent) {
      clickVolume *= 1.2; // Accent is louder
    }
    clickVolume = Math.min(1, clickVolume);
    
    gainNode.gain.setValueAtTime(clickVolume * 0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    
    oscillator.start(time);
    oscillator.stop(time + 0.08);
  }

  private scheduler() {
    const ctx = this.getAudioContext();
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const subdivisionsPerBeat = this.getSubdivisionMultiplier();
    
    while (this.nextClickTime < ctx.currentTime + this.scheduleAheadTime) {
      // Determine if this is an accent (downbeat of measure)
      const isAccent = this.accentDownbeat && this.currentBeat === 0 && this.currentSubBeat === 0;
      const isSubBeat = this.currentSubBeat > 0;
      
      this.scheduleClick(this.nextClickTime, isAccent, isSubBeat);
      
      // Advance to next click
      this.currentSubBeat++;
      if (this.currentSubBeat >= subdivisionsPerBeat) {
        this.currentSubBeat = 0;
        this.currentBeat++;
        if (this.currentBeat >= beatsPerMeasure) {
          this.currentBeat = 0;
        }
      }
      
      this.nextClickTime += this.getSecondsPerClick();
    }
  }

  start(fromTime: number = 0) {
    if (this.isPlaying) return;
    
    const ctx = this.getAudioContext();
    
    // Resume audio context if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    this.isPlaying = true;
    this.startTime = ctx.currentTime - fromTime;
    
    // Calculate proper beat alignment based on subdivision and startOffset
    const secondsPerBeat = 60 / this.tempo;
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const subdivisionsPerBeat = this.getSubdivisionMultiplier();
    const secondsPerClick = this.getSecondsPerClick();
    
    // Adjust time relative to the start offset (when beat 1 actually starts)
    const adjustedTime = fromTime - this.startOffset;
    
    // If we're before the start offset, wait until we reach it
    if (adjustedTime < 0) {
      this.currentBeat = 0;
      this.currentSubBeat = 0;
      // Schedule first click at the start offset
      this.nextClickTime = ctx.currentTime + (-adjustedTime);
    } else {
      // Total elapsed clicks (including subdivisions) since the start offset
      const totalClicks = adjustedTime / secondsPerClick;
      const clicksElapsed = Math.floor(totalClicks);
      
      // Calculate current beat and sub-beat position
      this.currentBeat = Math.floor(clicksElapsed / subdivisionsPerBeat) % beatsPerMeasure;
      this.currentSubBeat = clicksElapsed % subdivisionsPerBeat;
      
      // Calculate time until next click
      const timeIntoCurrentClick = adjustedTime - (clicksElapsed * secondsPerClick);
      const timeToNextClick = secondsPerClick - timeIntoCurrentClick;
      
      this.nextClickTime = ctx.currentTime + timeToNextClick;
    }
    
    this.schedulerIntervalId = window.setInterval(() => this.scheduler(), this.lookahead);
  }

  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    
    this.currentBeat = 0;
    this.currentSubBeat = 0;
  }

  pause() {
    if (!this.isPlaying) return;
    
    const ctx = this.getAudioContext();
    this.pausedAt = ctx.currentTime - this.startTime;
    this.stop();
  }

  resume() {
    if (this.isPlaying) return;
    this.start(this.pausedAt);
  }

  seekTo(time: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.stop();
    }
    
    // Reset beat position for new time
    const secondsPerBeat = 60 / this.tempo;
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const subdivisionsPerBeat = this.getSubdivisionMultiplier();
    
    const totalBeats = time / secondsPerBeat;
    this.currentBeat = Math.floor(totalBeats) % beatsPerMeasure;
    const beatFraction = totalBeats - Math.floor(totalBeats);
    this.currentSubBeat = Math.floor(beatFraction * subdivisionsPerBeat);
    
    this.pausedAt = time;
    
    if (wasPlaying) {
      this.start(time);
    }
  }

  setTempo(tempo: number) {
    this.tempo = tempo;
    
    // If playing, restart to recalculate timing
    if (this.isPlaying) {
      const ctx = this.getAudioContext();
      const currentTime = ctx.currentTime - this.startTime;
      this.stop();
      this.start(currentTime);
    }
  }

  setSubdivision(subdivision: ClickSubdivision) {
    this.subdivision = subdivision;
    
    // If playing, restart to recalculate timing
    if (this.isPlaying) {
      const ctx = this.getAudioContext();
      const currentTime = ctx.currentTime - this.startTime;
      this.stop();
      this.start(currentTime);
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setTimeSignature(timeSignature: string) {
    this.timeSignature = timeSignature;
  }

  setStartOffset(offset: number) {
    this.startOffset = Math.max(0, offset);
    
    // If playing, restart to recalculate timing
    if (this.isPlaying) {
      const ctx = this.getAudioContext();
      const currentTime = ctx.currentTime - this.startTime;
      this.stop();
      this.start(currentTime);
    }
  }

  getStartOffset(): number {
    return this.startOffset;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  dispose() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
