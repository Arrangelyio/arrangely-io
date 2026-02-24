/**
 * Cue Track Engine
 * 
 * Plays voice cue announcements when sections change (Intro, Verse, Chorus, etc.)
 * Supports male and female voice options.
 */

export type CueVoice = 'male' | 'female';

export interface CueSection {
  id: string;
  name: string;
  start_time: number;
  end_time: number;
  section_type?: string;
}

export interface CueTrackOptions {
  voice: CueVoice;
  volume: number; // 0-1
  leadTime: number; // seconds before section starts to play cue
  enabled: boolean;
}

// Section name mappings for cue audio files
const SECTION_CUE_NAMES: Record<string, string> = {
  'intro': 'intro',
  'verse': 'verse',
  'verse 1': 'verse',
  'verse 2': 'verse',
  'verse 3': 'verse',
  'chorus': 'chorus',
  'pre-chorus': 'prechorus',
  'pre chorus': 'prechorus',
  'prechorus': 'prechorus',
  'bridge': 'bridge',
  'outro': 'outro',
  'ending': 'outro',
  'solo': 'solo',
  'instrumental': 'instrumental',
  'interlude': 'interlude',
  'break': 'break',
  'hook': 'hook',
  'refrain': 'refrain',
};

export class CueTrackEngine {
  private audioContext: AudioContext | null = null;
  private voice: CueVoice = 'female';
  private volume: number = 0.7;
  private leadTime: number = 1; // 1 second before section
  private enabled: boolean = true;
  
  private sections: CueSection[] = [];
  private scheduledCues: Set<string> = new Set();
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  
  private schedulerIntervalId: number | null = null;
  private audioBufferCache: Map<string, AudioBuffer> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  
  // Base URL for cue audio files (to be configured)
  private cueAudioBaseUrl: string = '/audio/cues';

  constructor(options?: Partial<CueTrackOptions>) {
    if (options?.voice) this.voice = options.voice;
    if (options?.volume !== undefined) this.volume = options.volume;
    if (options?.leadTime !== undefined) this.leadTime = options.leadTime;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private getCueName(section: CueSection): string | null {
    const name = (section.section_type || section.name || '').toLowerCase().trim();
    return SECTION_CUE_NAMES[name] || null;
  }

  private getCueAudioUrl(cueName: string): string {
    return `${this.cueAudioBaseUrl}/${this.voice}/${cueName}.mp3`;
  }

  private async loadCueAudio(cueName: string): Promise<AudioBuffer | null> {
    const cacheKey = `${this.voice}_${cueName}`;
    
    // Return cached buffer
    if (this.audioBufferCache.has(cacheKey)) {
      return this.audioBufferCache.get(cacheKey)!;
    }
    
    // Return existing loading promise
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }
    
    // Load new audio
    const loadPromise = (async () => {
      try {
        const url = this.getCueAudioUrl(cueName);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`Cue audio not found: ${url}`);
          return null;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const ctx = this.getAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        this.audioBufferCache.set(cacheKey, audioBuffer);
        return audioBuffer;
      } catch (error) {
        console.warn(`Failed to load cue audio for ${cueName}:`, error);
        return null;
      } finally {
        this.loadingPromises.delete(cacheKey);
      }
    })();
    
    this.loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
  }

  private async playCue(section: CueSection) {
    if (!this.enabled) return;
    
    const cueName = this.getCueName(section);
    if (!cueName) {
      // Fall back to speech synthesis if no audio file
      this.speakCue(section);
      return;
    }
    
    const audioBuffer = await this.loadCueAudio(cueName);
    if (!audioBuffer) {
      // Fall back to speech synthesis
      this.speakCue(section);
      return;
    }
    
    const ctx = this.getAudioContext();
    
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.value = this.volume;
    source.start();
  }

  private speakCue(section: CueSection) {
    // Fallback using Web Speech API
    if (!('speechSynthesis' in window)) return;
    
    const name = section.section_type || section.name || 'Section';
    const utterance = new SpeechSynthesisUtterance(name);
    
    // Select voice based on preference
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => {
      const isEnglish = v.lang.startsWith('en');
      const isFemale = v.name.toLowerCase().includes('female') || 
                       v.name.toLowerCase().includes('samantha') ||
                       v.name.toLowerCase().includes('karen') ||
                       v.name.toLowerCase().includes('victoria');
      const isMale = v.name.toLowerCase().includes('male') ||
                     v.name.toLowerCase().includes('daniel') ||
                     v.name.toLowerCase().includes('alex') ||
                     v.name.toLowerCase().includes('tom');
      
      if (this.voice === 'female') {
        return isEnglish && (isFemale || !isMale);
      } else {
        return isEnglish && isMale;
      }
    });
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.volume = this.volume;
    utterance.rate = 1.2; // Slightly faster for cues
    utterance.pitch = this.voice === 'female' ? 1.1 : 0.9;
    
    speechSynthesis.speak(utterance);
  }

  private scheduler() {
    if (!this.isPlaying || !this.enabled) return;
    
    // Check for upcoming sections
    for (const section of this.sections) {
      const cueTime = section.start_time - this.leadTime;
      const cueId = `${section.id}_${section.start_time}`;
      
      // If we haven't played this cue and we're at or past the cue time
      if (!this.scheduledCues.has(cueId) && 
          this.currentTime >= cueTime && 
          this.currentTime < section.start_time) {
        this.scheduledCues.add(cueId);
        this.playCue(section);
      }
    }
  }

  setSections(sections: CueSection[]) {
    this.sections = sections;
    // Preload cue audio for all sections
    this.preloadSectionCues();
  }

  private async preloadSectionCues() {
    const cueNames = new Set<string>();
    
    for (const section of this.sections) {
      const cueName = this.getCueName(section);
      if (cueName) {
        cueNames.add(cueName);
      }
    }
    
    // Load all unique cue names
    await Promise.all(
      Array.from(cueNames).map(name => this.loadCueAudio(name))
    );
  }

  updateTime(time: number) {
    this.currentTime = time;
    this.scheduler();
  }

  start(fromTime: number = 0) {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.currentTime = fromTime;
    
    // Clear scheduled cues - only mark sections whose cue window has COMPLETELY passed
    // This allows cues to replay when seeking backwards
    this.scheduledCues.clear();
    for (const section of this.sections) {
      const cueTime = section.start_time - this.leadTime;
      // Only mark as played if we're past the section start (cue window fully passed)
      if (section.start_time < fromTime) {
        const cueId = `${section.id}_${section.start_time}`;
        this.scheduledCues.add(cueId);
      }
    }
    
    this.schedulerIntervalId = window.setInterval(() => this.scheduler(), 100);
  }

  stop() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.currentTime = 0;
    this.scheduledCues.clear();
    
    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  pause() {
    this.isPlaying = false;
    
    if (this.schedulerIntervalId !== null) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
  }

  resume() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.schedulerIntervalId = window.setInterval(() => this.scheduler(), 100);
  }

  seekTo(time: number) {
    this.currentTime = time;
    
    // Reset scheduled cues - only mark sections whose cue window has COMPLETELY passed
    // This allows cues to replay when seeking backwards to previous sections
    this.scheduledCues.clear();
    for (const section of this.sections) {
      // Only mark as played if we're past the section start (not just at or before cue trigger)
      if (section.start_time < time) {
        const cueId = `${section.id}_${section.start_time}`;
        this.scheduledCues.add(cueId);
      }
    }
  }

  setVoice(voice: CueVoice) {
    if (this.voice !== voice) {
      this.voice = voice;
      // Clear cache to reload with new voice
      this.audioBufferCache.clear();
      this.preloadSectionCues();
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setLeadTime(leadTime: number) {
    this.leadTime = Math.max(0, Math.min(5, leadTime));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  setCueAudioBaseUrl(url: string) {
    this.cueAudioBaseUrl = url;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getIsEnabled(): boolean {
    return this.enabled;
  }

  dispose() {
    this.stop();
    this.audioBufferCache.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
