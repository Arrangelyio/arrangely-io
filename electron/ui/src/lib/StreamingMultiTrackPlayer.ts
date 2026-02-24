/**
 * Streaming Multi-Track Player with Pitch Shift Support
 *
 * Supports two pitch shifting engines:
 * 1. SoundTouch (legacy): Uses ScriptProcessorNode (deprecated but high quality TDHS)
 * 2. AudioWorklet (modern): Uses AudioWorkletNode (stable, runs on audio thread)
 *
 * When pitch = 0: Streaming via HTMLAudioElement (low memory)
 * When pitch != 0: Uses selected pitch engine
 *
 * Architecture:
 *   Streaming mode (pitch=0):
 *     per-track: HTMLAudioElement -> MediaElementSource -> gain -> pan -> channelMerger -> masterBus
 *   
 *   SoundTouch mode (pitch!=0, legacy):
 *     per-track: AudioBuffer -> SoundTouch ScriptProcessor -> gain -> pan -> channelMerger -> masterBus
 *   
 *   AudioWorklet mode (pitch!=0, modern):
 *     per-track: HTMLAudioElement -> MediaElementSource -> AudioWorkletPitchShifter -> gain -> pan -> channelMerger -> masterBus
 */

import { streamingCache } from './streamingAudioCache';
import { r2AudioService } from './r2AudioService';
import { PitchShifter as SoundTouchPitchShifter } from 'soundtouchjs';
import { AudioWorkletPitchShifter, createTrackPitchShifter } from './AudioWorkletPitchShifter';

export type PitchEngine = 'soundtouch' | 'worklet';

// Track categories for selective pitch control
export type TrackCategory = 'vocals' | 'melodic' | 'drums' | 'bass' | 'click' | 'ensemble' | 'other';

export interface StreamingTrackConfig {
  name: string;
  filename: string;
  r2_audio_key?: string;
  audioUrl?: string;
  peaksUrl?: string;
  default_volume?: number;
  default_pan?: number;
  outputChannel?: number;
  color?: string;
}

export interface TrackDownloadStatus {
  trackIndex: number;
  status: 'pending' | 'downloading' | 'cached' | 'error' | 'streaming';
  progress: number;
  error?: string;
  isBuffering?: boolean;
}

// Track pitch settings exposed to UI
export interface TrackPitchSettings {
  trackIndex: number;
  category: TrackCategory;
  pitchEnabled: boolean;
}

export class StreamingMultiTrackPlayer {
  private audioContext: AudioContext;
  private channelMerger: ChannelMergerNode;
  private masterBus: GainNode;
  private masterLimiter: DynamicsCompressorNode;
  private masterAnalyzer: AnalyserNode;
  private mediaStreamDestination: MediaStreamAudioDestinationNode;
  private outputElement: HTMLAudioElement;

  private tracks: Array<{
    audioElement: HTMLAudioElement | null;
    audioSource: MediaElementAudioSourceNode | null;
    audioBuffer: AudioBuffer | null;
    gainNode: GainNode;
    panNode: StereoPannerNode;
    analyzerNode: AnalyserNode;
    // Formant compensation filters (EQ-based approximation)
    formantLowShelf: BiquadFilterNode | null;
    formantHighShelf: BiquadFilterNode | null;
    formantMidPeak: BiquadFilterNode | null;
    config: StreamingTrackConfig;
    audioUrl: string;
    localBlobUrl: string | null;
    muted: boolean;
    solo: boolean;
    baseVolume: number;
    outputChannel: number;
    downloadStatus: TrackDownloadStatus['status'];
    downloadProgress: number;
    isBuffering: boolean;
    // SoundTouch per-track state (legacy)
    soundTouchShifter: SoundTouchPitchShifter | null;
    cachedArrayBuffer: ArrayBuffer | null;
    // AudioWorklet per-track state (modern)
    workletPitchShifter: AudioWorkletPitchShifter | null;
    // Selective pitch control
    category: TrackCategory;
    pitchEnabled: boolean;
  }>;

  private songId: string;
  private trackConfigs: StreamingTrackConfig[];
  private isPlaying: boolean = false;
  private isPausedForBuffering: boolean = false;
  private isDownloadPaused: boolean = false;
  private duration: number = 0;
  private currentTime: number = 0;
  private isDisposed: boolean = false;
  private abortController: AbortController | null = null;
  private globalOutputDeviceId: string = 'default';
  private timeUpdateInterval?: number;
  private currentMode: 'stream' | 'download' = 'download';
  private tempo: number = 1.0;
  private pitchSemitones: number = 0;
  private lastAppliedTempo: number = 1.0;

  // SoundTouch pitch shift mode state
  private isSoundTouchMode: boolean = false;
  private soundTouchInitialized: boolean = false; // Track if SoundTouch nodes have been created (persistent graph)
  private soundTouchStartTime: number = 0;
  private soundTouchPlaybackStartTime: number = 0;
  
  // Pitch quality mode: 'fast' = lower CPU, 'high' = Ableton-quality
  private pitchQualityMode: 'fast' | 'high' = 'high';
  
  // Pitch engine selection: 'soundtouch' (high quality) or 'worklet' (low latency)
  // Default to SoundTouch for better quality - users accept loading time
  private pitchEngine: PitchEngine = 'soundtouch';
  private isWorkletMode: boolean = false;
  private workletInitialized: boolean = false;
  
  // Formant preservation mode: applies compensating EQ to reduce "chipmunk" effect
  private formantPreservation: boolean = false;
  
  // Pitch shift loading state
  private isPitchShiftLoading: boolean = false;
  private onPitchLoadingChangeCallback?: (isLoading: boolean, progress: number) => void;

  // Callbacks
  private onTimeUpdateCallback?: (time: number) => void;
  private onReadyCallback?: () => void;
  private onTrackStatusCallback?: (status: TrackDownloadStatus) => void;
  private onAllCachedCallback?: () => void;
  private onDurationCallback?: (duration: number) => void;
  private onBufferingChangeCallback?: (isBuffering: boolean, bufferingTracks: number[]) => void;

  constructor(
    trackConfigs: StreamingTrackConfig[],
    songId: string,
    options?: {
      onReady?: () => void;
      onTrackStatus?: (status: TrackDownloadStatus) => void;
      onAllCached?: () => void;
      onDuration?: (duration: number) => void;
      onBufferingChange?: (isBuffering: boolean, bufferingTracks: number[]) => void;
    }
  ) {
    this.songId = songId;
    this.trackConfigs = trackConfigs;
    this.onReadyCallback = options?.onReady;
    this.onTrackStatusCallback = options?.onTrackStatus;
    this.onAllCachedCallback = options?.onAllCached;
    this.onDurationCallback = options?.onDuration;
    this.onBufferingChangeCallback = options?.onBufferingChange;

    // Create AudioContext + nodes
    this.audioContext = new AudioContext();
    // Create channel merger with enough inputs for all tracks (stereo = 2 channels minimum)
    // Each track needs to connect to both L/R channels of the merger
    // Cap at 32 (Web Audio API maximum for ChannelMergerNode)
    const mergerChannelCount = Math.min(32, Math.max(2, trackConfigs.length * 2));
    this.channelMerger = this.audioContext.createChannelMerger(mergerChannelCount);
    this.masterBus = this.audioContext.createGain();
    this.masterBus.gain.value = 1.0; // Initialize master volume

    // Create soft limiter (DynamicsCompressorNode configured as a limiter)
    // This prevents clipping when tracks are boosted above 0dB
    this.masterLimiter = this.audioContext.createDynamicsCompressor();
    // Limiter settings: fast attack, moderate release, high ratio, threshold at -0.5dB
    this.masterLimiter.threshold.value = -0.5; // Start limiting just below 0dB
    this.masterLimiter.knee.value = 0; // Hard knee for true limiting
    this.masterLimiter.ratio.value = 20; // High ratio for limiting behavior
    this.masterLimiter.attack.value = 0.001; // 1ms attack (very fast)
    this.masterLimiter.release.value = 0.1; // 100ms release (smooth)

    // Create master analyzer for level metering
    this.masterAnalyzer = this.audioContext.createAnalyser();
    this.masterAnalyzer.fftSize = 256;
    this.masterAnalyzer.smoothingTimeConstant = 0.8;

    // Important: route channelMerger -> masterBus -> limiter -> analyzer -> destination
    this.channelMerger.connect(this.masterBus);
    this.masterBus.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyzer);
    this.masterAnalyzer.connect(this.audioContext.destination);

    // Setup media stream for output device selection (if needed)
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
    this.masterAnalyzer.connect(this.mediaStreamDestination);

    this.outputElement = new Audio();
    this.outputElement.autoplay = false;

    // Initialize track structures with analyzer nodes for level metering
    this.tracks = trackConfigs.map((config, index) => {
      const analyzerNode = this.audioContext.createAnalyser();
      analyzerNode.fftSize = 256;
      analyzerNode.smoothingTimeConstant = 0.8;
      
      // Create formant compensation filters (bypass by default)
      const formantLowShelf = this.audioContext.createBiquadFilter();
      formantLowShelf.type = 'lowshelf';
      formantLowShelf.frequency.value = 300;
      formantLowShelf.gain.value = 0; // Bypass
      
      const formantHighShelf = this.audioContext.createBiquadFilter();
      formantHighShelf.type = 'highshelf';
      formantHighShelf.frequency.value = 3000;
      formantHighShelf.gain.value = 0; // Bypass
      
      const formantMidPeak = this.audioContext.createBiquadFilter();
      formantMidPeak.type = 'peaking';
      formantMidPeak.frequency.value = 1000;
      formantMidPeak.Q.value = 1.5;
      formantMidPeak.gain.value = 0; // Bypass
      
      // Detect track category from filename
      const category = this.detectTrackCategory(config.filename || config.name || '');
      const pitchEnabled = this.shouldEnablePitch(category);
      
      return {
        audioElement: null,
        audioSource: null,
        audioBuffer: null,
        gainNode: this.audioContext.createGain(),
        panNode: this.audioContext.createStereoPanner(),
        analyzerNode,
        formantLowShelf,
        formantHighShelf,
        formantMidPeak,
        config,
        audioUrl: '',
        localBlobUrl: null,
        muted: false,
        solo: false,
        baseVolume: config.default_volume ?? 1,
        outputChannel: config.outputChannel ?? 0,
        downloadStatus: 'pending' as const,
        downloadProgress: 0,
        isBuffering: false,
        // SoundTouch per-track state (legacy)
        soundTouchShifter: null,
        cachedArrayBuffer: null,
        // AudioWorklet per-track state (modern)
        workletPitchShifter: null,
        // Selective pitch control
        category,
        pitchEnabled,
      };
    });

    // Set initial volumes and pans
    trackConfigs.forEach((config, index) => {
      if (config.default_volume !== undefined) {
        this.tracks[index].gainNode.gain.value = config.default_volume;
        this.tracks[index].baseVolume = config.default_volume;
      }
      if (config.default_pan !== undefined) {
        this.tracks[index].panNode.pan.value = config.default_pan;
      }
    });

    // Start initialization
    this.initialize();
  }

  private async initialize() {
    this.abortController = new AbortController();
    const trackCount = this.trackConfigs.length;

    

    try {
      // Request R2 URLs
      const extensions = this.trackConfigs.map(config => {
        const ext = config.filename?.split('.').pop()?.toLowerCase();
        return ext || 'wav';
      });

      const r2Urls = await r2AudioService.getTrackUrls(this.songId, trackCount, extensions);

      for (let i = 0; i < trackCount; i++) {
        const urlData = r2Urls.find(u => u.trackIndex === i);
        if (urlData) {
          this.tracks[i].audioUrl = urlData.audioUrl;
          this.tracks[i].config.audioUrl = urlData.audioUrl;
          this.tracks[i].config.peaksUrl = urlData.peaksUrl;
        }

        // Check cache
        const cacheInfo = await streamingCache.checkEncryptedCache(this.songId, i);
        if (cacheInfo.exists && cacheInfo.complete) {
          this.tracks[i].downloadStatus = 'cached';
          this.tracks[i].downloadProgress = 100;
          this.onTrackStatusCallback?.({
            trackIndex: i,
            status: 'cached',
            progress: 100,
          });
        }
      }

      // Create audio elements and connect to graph
      await this.createAudioElements();

      
      this.onReadyCallback?.();

      this.startBackgroundDownload();
    } catch (error) {
      console.error('[StreamingPlayer] Initialization failed:', error);
    }
  }

  private async createAudioElements() {
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'metadata';

      if (track.downloadStatus === 'cached') {
        try {
          
          const cachedBuffer = await streamingCache.loadCachedTrack(this.songId, i);
          const blob = new Blob([cachedBuffer], { type: 'audio/wav' });
          track.localBlobUrl = URL.createObjectURL(blob);
          audio.src = track.localBlobUrl;
          
        } catch (e) {
          console.error(`[StreamingPlayer] Track ${i} cache read failed:`, e);
          audio.src = track.audioUrl;
          
        }
      } else {
        audio.src = track.audioUrl;
        track.downloadStatus = 'streaming';
        this.onTrackStatusCallback?.({
          trackIndex: i,
          status: 'streaming',
          progress: 0,
        });
        
      }

      // Duration detection
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration > this.duration) {
          this.duration = audio.duration;
          this.onDurationCallback?.(this.duration);
        }
      });

      // Buffering events
      const trackIndex = i;
      audio.addEventListener('waiting', () => {
        if (track.downloadStatus === 'cached' || track.localBlobUrl) {
          return;
        }
        track.isBuffering = true;
        this.handleBufferingChange();
      });
      audio.addEventListener('canplay', () => {
        if (track.isBuffering) {
          track.isBuffering = false;
          this.handleBufferingChange();
        }
      });
      audio.addEventListener('playing', () => {
        if (track.isBuffering) {
          track.isBuffering = false;
          this.handleBufferingChange();
        }
      });

      // Apply tempo
      this.applyTempoToElement(audio);

      // Create media element source and connect chain with formant filters
      try {
        const source = this.audioContext.createMediaElementSource(audio);
        // Chain: source -> gain -> formantLow -> formantMid -> formantHigh -> analyzer -> pan -> channelMerger
        source.connect(track.gainNode);
        track.gainNode.connect(track.formantLowShelf!);
        track.formantLowShelf!.connect(track.formantMidPeak!);
        track.formantMidPeak!.connect(track.formantHighShelf!);
        track.formantHighShelf!.connect(track.analyzerNode);
        track.analyzerNode.connect(track.panNode);
        // StereoPannerNode outputs stereo - connect both channels to merger for proper stereo
        track.panNode.connect(this.channelMerger, 0, 0); // Left channel
        track.panNode.connect(this.channelMerger, 0, 1); // Right channel
        track.audioElement = audio;
        track.audioSource = source;
      } catch (e) {
        console.error(`[StreamingPlayer] Failed to create source for track ${i}:`, e);
      }
    }
  }

  // ============================================================================
  // TRACK CATEGORY DETECTION (for selective pitch control)
  // ============================================================================

  /**
   * Detect track category from filename/name for selective pitch control.
   * Drums, click, and bass are typically excluded from pitch shifting.
   */
  private detectTrackCategory(filename: string): TrackCategory {
    const lower = filename.toLowerCase();
    
    // Drums/Percussion - exclude from pitch
    if (lower.includes('drum') || lower.includes('kit') || lower.includes('perc') || 
        lower.includes('snare') || lower.includes('kick') || lower.includes('hihat') ||
        lower.includes('cymbal') || lower.includes('tom')) {
      return 'drums';
    }
    
    // Click/Metronome - exclude from pitch
    if (lower.includes('click') || lower.includes('metro') || lower.includes('count')) {
      return 'click';
    }
    
    // Bass - often excluded (user can toggle)
    if (lower.includes('bass') && !lower.includes('double')) {
      return 'bass';
    }
    
    // Vocals
    if (lower.includes('vocal') || lower.includes('vox') || lower.includes('lead') || 
        lower.includes('voice') || lower.includes('sing')) {
      return 'vocals';
    }
    
    // Melodic instruments
    if (lower.includes('keys') || lower.includes('piano') || lower.includes('guitar') ||
        lower.includes('synth') || lower.includes('organ') || lower.includes('strings') ||
        lower.includes('violin') || lower.includes('cello') || lower.includes('brass') ||
        lower.includes('flute') || lower.includes('sax')) {
      return 'melodic';
    }
    
    // Ensemble/Choir/Pads
    if (lower.includes('ensemble') || lower.includes('choir') || lower.includes('pad') ||
        lower.includes('ambient') || lower.includes('atmosphere')) {
      return 'ensemble';
    }
    
    // Default to other (will be pitch-shifted)
    return 'other';
  }

  /**
   * Determine if a track should have pitch enabled based on its category.
   * Drums and click are always excluded for perfect timing and quality.
   */
  private shouldEnablePitch(category: TrackCategory): boolean {
    // Drums and click are always excluded - they don't benefit from pitch shifting
    // and processing them creates artifacts
    if (category === 'drums' || category === 'click') {
      return false;
    }
    // Everything else is pitch-shifted by default (vocals, melodic, ensemble, bass, other)
    return true;
  }

  /**
   * Decode audio data into AudioBuffer (kept for other uses, not used for pitch)
   */
  private async decodeTrackBuffer(trackIndex: number, arrayBuffer: ArrayBuffer) {
    try {
      
      const bufferCopy = arrayBuffer.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
      this.tracks[trackIndex].audioBuffer = audioBuffer;
      
    } catch (e) {
      console.error(`[StreamingPlayer] Track ${trackIndex} decode failed:`, e);
    }
  }

  private applyTempoToElement(audio: HTMLAudioElement, force: boolean = false) {
    // Skip if tempo hasn't changed (prevents audio quality degradation on pause/play)
    if (!force && this.tempo === this.lastAppliedTempo && audio.playbackRate === this.tempo) {
      return;
    }
    (audio as any).preservesPitch = true;
    (audio as any).mozPreservesPitch = true;
    (audio as any).webkitPreservesPitch = true;
    audio.playbackRate = this.tempo;
    this.lastAppliedTempo = this.tempo;
    
  }

  private applyTempoToAllTracks() {
    this.tracks.forEach(track => {
      if (track.audioElement) {
        this.applyTempoToElement(track.audioElement);
      }
    });
    // If global pitch shift exists, tempo affects only playbackRate (pitch node doesn't change tempo)
  }

  /**
   * Initialize SoundTouch pitch shifters for all tracks.
   * This decodes audio and creates per-track SoundTouch processors for high-quality pitch shifting.
   * 
   * PERSISTENT GRAPH ARCHITECTURE: Once created, SoundTouch nodes stay alive until dispose().
   * When pitch=0, we set shifter.pitchSemitones=0 instead of tearing down the graph.
   * This eliminates ScriptProcessorNode churn that causes Electron hard-crashes.
   */
  private async initializeSoundTouchMode() {
    // If already initialized, just activate the existing nodes
    if (this.soundTouchInitialized) {
      
      this.isSoundTouchMode = true;
      
      // Disconnect streaming sources, connect SoundTouch nodes
      this.tracks.forEach((track, i) => {
        if (track.audioSource) {
          try { track.audioSource.disconnect(); } catch {}
        }
        if (track.audioElement) {
          track.audioElement.pause();
        }
      });
      
      // Update pitch on existing shifters
      this.updateSoundTouchPitch();
      
      // Seek to current position
      const currentPos = this.getCurrentTime();
      this.seekSoundTouchToPosition(currentPos);
      
      return;
    }
    
    // Guard against disposed player or invalid audio context
    if (this.isDisposed) {
      console.warn('[StreamingPlayer] Cannot initialize SoundTouch - player is disposed');
      throw new Error('Player is disposed');
    }
    
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.warn('[StreamingPlayer] Cannot initialize SoundTouch - audio context is closed');
      throw new Error('Audio context is closed');
    }

    
    
    // Notify UI that pitch shift is loading
    this.isPitchShiftLoading = true;
    this.onPitchLoadingChangeCallback?.(true, 0);
    
    const wasPlaying = this.isPlaying;
    const currentPos = this.getCurrentTime();
    let successCount = 0;
    
    // Only process tracks that have pitch enabled
    const pitchEnabledTracks = this.tracks.map((t, i) => ({ track: t, index: i })).filter(({ track }) => track.pitchEnabled);
    const excludedTracks = this.tracks.map((t, i) => ({ track: t, index: i })).filter(({ track }) => !track.pitchEnabled);
    
    
    
    // Pause and disconnect only pitch-enabled tracks
    pitchEnabledTracks.forEach(({ track }) => {
      if (track.audioElement) {
        track.audioElement.pause();
      }
      // Disconnect MediaElementSource from gainNode when switching to SoundTouch
      if (track.audioSource) {
        try {
          track.audioSource.disconnect();
        } catch {}
      }
    });
    
    // Keep excluded tracks streaming normally (don't disconnect them)
    // They continue playing via HTMLAudioElement
    
    // Decode and create SoundTouch shifters for pitch-enabled tracks only
    for (let idx = 0; idx < pitchEnabledTracks.length; idx++) {
      const { track, index: i } = pitchEnabledTracks[idx];
      
      // Skip if this track already has a SoundTouch shifter (shouldn't happen, but guard)
      if (track.soundTouchShifter) {
        successCount++;
        continue;
      }
      
      // Report progress
      const progress = Math.round((idx / pitchEnabledTracks.length) * 100);
      this.onPitchLoadingChangeCallback?.(true, progress);
      
      try {
        // Get audio data (from cache or fetch)
        let arrayBuffer = track.cachedArrayBuffer;
        if (!arrayBuffer) {
          if (track.downloadStatus === 'cached') {
            const cachedData = await streamingCache.loadCachedTrack(this.songId, i);
            arrayBuffer = cachedData;
            track.cachedArrayBuffer = arrayBuffer;
          } else if (track.audioUrl) {
            
            const response = await fetch(track.audioUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            arrayBuffer = await response.arrayBuffer();
            track.cachedArrayBuffer = arrayBuffer;
          }
        }
        
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          console.warn(`[StreamingPlayer] Track ${i}: No audio data available for SoundTouch`);
          continue;
        }
        
        // Decode to AudioBuffer if not already
        if (!track.audioBuffer) {
          
          // Make a copy of the buffer to prevent it from being detached
          const bufferCopy = arrayBuffer.slice(0);
          track.audioBuffer = await this.audioContext.decodeAudioData(bufferCopy);
          
          // Update duration if this is longer
          if (track.audioBuffer.duration > this.duration) {
            this.duration = track.audioBuffer.duration;
            this.onDurationCallback?.(this.duration);
          }
        }
        
        // NOTE: We no longer clean up existing SoundTouch shifters here.
        // Persistent graph architecture keeps nodes alive until dispose().
        
        // Check if player was disposed during async operations
        if (this.isDisposed || !this.audioContext || this.audioContext.state === 'closed') {
          console.warn(`[StreamingPlayer] Track ${i}: Aborting SoundTouch creation - player disposed`);
          break;
        }

        // Create new SoundTouch PitchShifter with proper error handling
        // Use a larger buffer size for higher quality (reduces warble/vibration at ±1 semitone)
        // Tradeoff: slightly higher latency + CPU, but better for production use.
        let shifter: SoundTouchPitchShifter;
        try {
          shifter = new SoundTouchPitchShifter(
            this.audioContext,
            track.audioBuffer,
            8192 // bufferSize
          );
        } catch (shifterError) {
          console.error(`[StreamingPlayer] Track ${i}: Failed to create SoundTouch shifter:`, shifterError);
          continue;
        }
        
        // Apply high-quality SoundTouch parameters (Ableton "Complex" mode style)
        try {
          this.applySoundTouchQualityParams(shifter);
        } catch (paramsError) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to apply quality params:`, paramsError);
        }
        
        // Set pitch using semitones (SoundTouch's TDHS algorithm handles this smoothly)
        try {
          shifter.pitchSemitones = this.pitchSemitones;
          shifter.tempo = this.tempo;
        } catch (pitchError) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to set pitch/tempo:`, pitchError);
        }
        
        // Connect: SoundTouch node -> gain -> formant filters -> analyzer -> pan -> channelMerger
        try {
          shifter.connect(track.gainNode);
        } catch (connectError) {
          console.error(`[StreamingPlayer] Track ${i}: Failed to connect shifter:`, connectError);
          try { shifter.disconnect(); } catch {}
          continue;
        }
        // Formant filters are already connected in the chain (gain -> formantLow -> formantMid -> formantHigh -> analyzer)
        
        track.soundTouchShifter = shifter;
        successCount++;
        
        
      } catch (error) {
        console.error(`[StreamingPlayer] Track ${i}: Failed to initialize SoundTouch:`, error);
        // Continue with other tracks - partial pitch shift is better than none
      }
    }
    
    if (successCount === 0) {
      console.error('[StreamingPlayer] No tracks could be initialized for SoundTouch mode');
      // Restore streaming mode - reconnect MediaElementSources
      this.tracks.forEach(track => {
        if (track.audioSource && track.gainNode) {
          try {
            track.audioSource.connect(track.gainNode);
          } catch {}
        }
        if (track.audioElement) {
          track.audioElement.currentTime = currentPos;
        }
      });
      // Clear loading state on error
      this.isPitchShiftLoading = false;
      this.onPitchLoadingChangeCallback?.(false, 0);
      throw new Error('Failed to initialize pitch shifting - no tracks could be processed');
    }
    
    this.isSoundTouchMode = true;
    this.soundTouchInitialized = true; // Mark as initialized (nodes stay alive)
    this.soundTouchStartTime = currentPos;
    this.soundTouchPlaybackStartTime = this.audioContext.currentTime;
    
    // Seek all SoundTouch shifters to the current position
    this.seekSoundTouchToPosition(currentPos);
    
    // Update formant compensation for the new pitch
    this.updateFormantCompensation();
    
    // Resume playback if it was playing
    if (wasPlaying) {
      this.playSoundTouchMode();
    }
    
    // Clear loading state - pitch shift is ready
    this.isPitchShiftLoading = false;
    this.onPitchLoadingChangeCallback?.(false, 100);
    
    
  }
  
  /**
   * Seek all SoundTouch shifters to a specific position
   */
  private seekSoundTouchToPosition(time: number) {
    const percentage = this.duration > 0 ? (time / this.duration) * 100 : 0;
    
    this.tracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        try {
          track.soundTouchShifter.percentagePlayed = percentage;
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to seek SoundTouch:`, e);
        }
      }
    });
    
    this.soundTouchStartTime = time;
    this.soundTouchPlaybackStartTime = this.audioContext.currentTime;
  }
  
  /**
   * Start SoundTouch playback (resume after pause or initial play)
   */
  private playSoundTouchMode() {
    if (!this.isSoundTouchMode) return;
    
    // SoundTouch uses ScriptProcessorNode which runs automatically
    // Just need to ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Verify all SoundTouch shifters are connected and have correct pitch
    const activeTracks = this.tracks.filter(t => t.soundTouchShifter !== null);
    
    
    // Ensure all shifters have the current pitch applied
    activeTracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        track.soundTouchShifter.pitchSemitones = this.pitchSemitones;
      }
    });
    
    this.soundTouchPlaybackStartTime = this.audioContext.currentTime;
  }
  
  /**
   * Deactivate SoundTouch mode without destroying nodes (persistent graph).
   * Sets pitchSemitones=0 on all shifters for transparent bypass, then reconnects streaming.
   * 
   * NOTE: This does NOT destroy SoundTouch nodes. They remain allocated until dispose().
   */
  private deactivateSoundTouchMode() {
    if (!this.isSoundTouchMode) return;
    
    
    
    // Get position before any changes
    let currentPos = this.currentTime;
    try {
      currentPos = this.getCurrentTime();
    } catch (e) {
      console.warn('[StreamingPlayer] Could not get current time during deactivate:', e);
    }
    
    // Set pitch to 0 on all shifters (transparent bypass - they're still processing, just not shifting)
    this.tracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        try {
          track.soundTouchShifter.pitchSemitones = 0;
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to reset pitch on shifter:`, e);
        }
      }
      
      // Reconnect MediaElementSource for streaming playback
      if (!this.isDisposed && this.audioContext && this.audioContext.state !== 'closed') {
        if (track.audioSource && track.gainNode) {
          try {
            track.audioSource.connect(track.gainNode);
          } catch (e) {
            // May already be connected - ignore
          }
        }
      }
    });
    
    this.isSoundTouchMode = false;
    // NOTE: soundTouchInitialized remains TRUE - nodes are still alive
    
    // Resume HTMLAudioElement playback position (only if not disposed)
    if (!this.isDisposed) {
      this.tracks.forEach(track => {
        if (track.audioElement) {
          try {
            track.audioElement.currentTime = currentPos;
          } catch (e) {
            console.warn('[StreamingPlayer] Failed to set audio element time:', e);
          }
          // Don't auto-play - let the main play logic handle it
        }
      });
    }
    
    this.currentTime = currentPos;
    
  }
  
  /**
   * Full cleanup of SoundTouch nodes - only called from dispose().
   */
  private destroySoundTouchNodes() {
    
    
    this.tracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        try {
          track.soundTouchShifter.disconnect();
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to disconnect SoundTouch shifter:`, e);
        }
        track.soundTouchShifter = null;
      }
    });
    
    this.isSoundTouchMode = false;
    this.soundTouchInitialized = false;
  }
  
  // ============================================================================
  // AUDIOWORKLET PITCH SHIFTING (Modern, Stable)
  // ============================================================================
  
  /**
   * Initialize AudioWorklet-based pitch shifters for all tracks.
   * This is the modern approach that runs on a dedicated audio thread.
   * More stable than SoundTouch's ScriptProcessorNode but may have slightly different audio quality.
   */
  private async initializeWorkletMode() {
    // If already initialized, just activate
    if (this.workletInitialized) {
      
      this.isWorkletMode = true;
      this.updateWorkletPitch();
      return;
    }
    
    // Guard against disposed player
    if (this.isDisposed || !this.audioContext || this.audioContext.state === 'closed') {
      throw new Error('Cannot initialize AudioWorklet - player or context invalid');
    }
    
    // Check if AudioWorklet is supported
    if (!AudioWorkletPitchShifter.isSupported()) {
      console.warn('[StreamingPlayer] AudioWorklet not supported - falling back to SoundTouch');
      this.pitchEngine = 'soundtouch';
      await this.initializeSoundTouchMode();
      return;
    }
    
    
    this.isPitchShiftLoading = true;
    this.onPitchLoadingChangeCallback?.(true, 0);
    
    let successCount = 0;
    const totalTracks = this.tracks.length;
    
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i];
      
      // Report progress
      const progress = Math.round((i / totalTracks) * 100);
      this.onPitchLoadingChangeCallback?.(true, progress);
      
      // Skip if already has worklet shifter
      if (track.workletPitchShifter) {
        successCount++;
        continue;
      }
      
      try {
        // Create worklet pitch shifter
        const shifter = await createTrackPitchShifter(this.audioContext);
        if (!shifter) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to create worklet shifter`);
          continue;
        }
        
        // Disconnect audio source from gain (will route through worklet)
        if (track.audioSource) {
          try { track.audioSource.disconnect(); } catch {}
        }
        
        // Connect: audioSource -> worklet -> gain
        if (track.audioSource) {
          shifter.connectSource(track.audioSource);
        }
        shifter.connectDestination(track.gainNode);
        
        // Set initial pitch
        shifter.setPitch(this.pitchSemitones);
        
        track.workletPitchShifter = shifter;
        successCount++;
        
        
      } catch (error) {
        console.error(`[StreamingPlayer] Track ${i}: Failed to initialize worklet:`, error);
      }
    }
    
    if (successCount === 0) {
      console.error('[StreamingPlayer] No tracks could use AudioWorklet - falling back to SoundTouch');
      this.isPitchShiftLoading = false;
      this.onPitchLoadingChangeCallback?.(false, 0);
      this.pitchEngine = 'soundtouch';
      await this.initializeSoundTouchMode();
      return;
    }
    
    this.isWorkletMode = true;
    this.workletInitialized = true;
    
    this.isPitchShiftLoading = false;
    this.onPitchLoadingChangeCallback?.(false, 100);
    
    
  }
  
  /**
   * Update pitch on all AudioWorklet shifters
   */
  private updateWorkletPitch() {
    if (!this.isWorkletMode) return;
    
    this.tracks.forEach((track, i) => {
      if (track.workletPitchShifter) {
        try {
          track.workletPitchShifter.setPitch(this.pitchSemitones);
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to update worklet pitch:`, e);
        }
      }
    });
    
    // Update formant compensation
    this.updateFormantCompensation();
  }
  
  /**
   * Deactivate AudioWorklet mode without destroying nodes
   */
  private deactivateWorkletMode() {
    if (!this.isWorkletMode) return;
    
    
    
    this.tracks.forEach((track, i) => {
      if (track.workletPitchShifter) {
        // Set pitch to 0 for bypass behavior
        track.workletPitchShifter.setPitch(0);
      }
      
      // Reconnect audio source directly to gain
      if (track.audioSource && track.gainNode) {
        try {
          track.audioSource.connect(track.gainNode);
        } catch (e) {
          // May already be connected
        }
      }
    });
    
    this.isWorkletMode = false;
    // workletInitialized remains TRUE
    
    
  }
  
  /**
   * Full cleanup of AudioWorklet nodes - called from dispose()
   */
  private destroyWorkletNodes() {
    
    
    this.tracks.forEach((track, i) => {
      if (track.workletPitchShifter) {
        try {
          track.workletPitchShifter.dispose();
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to dispose worklet:`, e);
        }
        track.workletPitchShifter = null;
      }
    });
    
    this.isWorkletMode = false;
    this.workletInitialized = false;
  }
  
  /**
   * Set the pitch engine to use ('soundtouch' or 'worklet')
   */
  setPitchEngine(engine: PitchEngine) {
    if (this.pitchEngine === engine) return;
    
    
    
    // Deactivate current engine
    if (this.isSoundTouchMode) {
      this.deactivateSoundTouchMode();
    }
    if (this.isWorkletMode) {
      this.deactivateWorkletMode();
    }
    
    this.pitchEngine = engine;
    
    // If we have a non-zero pitch, reactivate with new engine
    if (this.pitchSemitones !== 0) {
      // Use setTimeout to avoid synchronous async call
      setTimeout(() => {
        this.setPitch(this.pitchSemitones).catch(console.error);
      }, 0);
    }
  }
  
  /**
   * Get current pitch engine
   */
  getPitchEngine(): PitchEngine {
    return this.pitchEngine;
  }
  
  /**
   * Apply high-quality SoundTouch TDHS parameters based on quality mode and pitch amount.
   * These parameters mimic Ableton's "Complex" mode for professional-grade pitch shifting.
   */
  private applySoundTouchQualityParams(shifter: SoundTouchPitchShifter) {
    // Access internal SoundTouch stretch processor for quality tuning
    const soundtouch = (shifter as any)._soundtouch || (shifter as any).soundtouch;
    if (!soundtouch) {
      console.warn('[StreamingPlayer] Could not access internal SoundTouch instance for quality tuning');
      return;
    }
    
    const absPitch = Math.abs(this.pitchSemitones);
    
    if (this.pitchQualityMode === 'high') {
      // Disable quick seek for exhaustive (higher quality) overlap search
      soundtouch.quickSeek = false;
      
      // Adaptive quality based on pitch amount
      // Larger shifts need more conservative parameters for clean output
      if (absPitch > 6) {
        // Large shifts (±7 to ±12 semitones) - maximum quality
        soundtouch.sequenceMs = 120;    // Longer sequence for better harmonic preservation
        soundtouch.seekWindowMs = 30;   // Wider search for optimal overlap points
        soundtouch.overlapMs = 25;      // Larger overlap for smoother transitions
      } else if (absPitch > 3) {
        // Medium shifts (±4 to ±6 semitones)
        soundtouch.sequenceMs = 100;
        soundtouch.seekWindowMs = 25;
        soundtouch.overlapMs = 20;
      } else {
        // Small shifts (±1 to ±3 semitones)
        soundtouch.sequenceMs = 80;
        soundtouch.seekWindowMs = 20;
        soundtouch.overlapMs = 15;
      }
      
      
    } else {
      // Fast mode - lower CPU, acceptable for small shifts
      soundtouch.quickSeek = true;
      soundtouch.sequenceMs = 40;
      soundtouch.seekWindowMs = 15;
      soundtouch.overlapMs = 8;
      
      
    }
  }
  
  /**
   * Update pitch on all SoundTouch shifters
   */
  private updateSoundTouchPitch() {
    if (!this.isSoundTouchMode) return;
    
    // Guard against disposed player
    if (this.isDisposed || !this.audioContext || this.audioContext.state === 'closed') {
      console.warn('[StreamingPlayer] Cannot update pitch - player or audio context invalid');
      return;
    }
    
    this.tracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        try {
          // Re-apply quality parameters when pitch changes (adaptive quality)
          this.applySoundTouchQualityParams(track.soundTouchShifter);
          track.soundTouchShifter.pitchSemitones = this.pitchSemitones;
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to update pitch:`, e);
        }
      }
    });
    
    // Update formant compensation when pitch changes
    try {
      this.updateFormantCompensation();
    } catch (e) {
      console.warn('[StreamingPlayer] Failed to update formant compensation:', e);
    }
  }
  
  /**
   * Set pitch quality mode ('fast' for lower CPU, 'high' for Ableton-quality)
   */
  setPitchQualityMode(mode: 'fast' | 'high') {
    if (this.pitchQualityMode === mode) return;
    
    
    this.pitchQualityMode = mode;
    
    // Re-apply quality parameters to all active SoundTouch shifters
    if (this.isSoundTouchMode) {
      this.tracks.forEach((track, i) => {
        if (track.soundTouchShifter) {
          try {
            this.applySoundTouchQualityParams(track.soundTouchShifter);
          } catch (e) {
            console.warn(`[StreamingPlayer] Track ${i}: Failed to update quality mode:`, e);
          }
        }
      });
    }
  }
  
  /**
   * Get current pitch quality mode
   */
  getPitchQualityMode(): 'fast' | 'high' {
    return this.pitchQualityMode;
  }
  
  /**
   * Set formant preservation mode.
   * When enabled, applies compensating EQ filters to reduce the "chipmunk" effect
   * caused by pitch shifting. This is an EQ-based approximation that works well
   * for moderate pitch shifts (±4 semitones) and provides noticeable improvement
   * for larger shifts.
   */
  setFormantPreservation(enabled: boolean) {
    if (this.formantPreservation === enabled) return;
    
    
    this.formantPreservation = enabled;
    
    // Apply formant compensation to all tracks
    this.updateFormantCompensation();
  }
  
  /**
   * Get current formant preservation state
   */
  getFormantPreservation(): boolean {
    return this.formantPreservation;
  }
  
  /**
   * Update formant compensation filters based on current pitch and formant mode.
   * Uses EQ-based approximation to shift formants back when pitch is changed.
   * 
   * When pitch goes UP, formants also shift up (chipmunk effect).
   * We compensate by boosting lower frequencies and cutting highs.
   * 
   * When pitch goes DOWN, formants shift down (Darth Vader effect).
   * We compensate by boosting higher frequencies and cutting lows.
   */
  private updateFormantCompensation() {
    const semitones = this.pitchSemitones;
    
    // Calculate compensation amount (inverse of pitch shift)
    // Each semitone of pitch shift causes ~5.9% formant shift
    // We apply inverse EQ to compensate
    const compensationDb = this.formantPreservation ? -semitones * 0.8 : 0;
    
    this.tracks.forEach((track, i) => {
      if (!track.formantLowShelf || !track.formantHighShelf || !track.formantMidPeak) return;
      
      try {
        if (this.formantPreservation && semitones !== 0) {
          // Pitch UP: boost lows, cut highs to bring formants back down
          // Pitch DOWN: cut lows, boost highs to bring formants back up
          
          // Low shelf: boost when pitching up, cut when pitching down
          track.formantLowShelf.gain.value = compensationDb * 1.2;
          track.formantLowShelf.frequency.value = 300 * Math.pow(2, -semitones / 12);
          
          // Mid peak: slight opposite boost to maintain presence
          track.formantMidPeak.gain.value = compensationDb * 0.5;
          track.formantMidPeak.frequency.value = 1200 * Math.pow(2, -semitones / 12);
          track.formantMidPeak.Q.value = 1.2;
          
          // High shelf: opposite of low shelf
          track.formantHighShelf.gain.value = -compensationDb * 0.8;
          track.formantHighShelf.frequency.value = 3000 * Math.pow(2, -semitones / 12);
          
          
        } else {
          // Bypass formant filters
          track.formantLowShelf.gain.value = 0;
          track.formantMidPeak.gain.value = 0;
          track.formantHighShelf.gain.value = 0;
        }
      } catch (e) {
        console.warn(`[StreamingPlayer] Track ${i}: Failed to update formant compensation:`, e);
      }
    });
  }
  
  /**
   * Update tempo on all SoundTouch shifters
   */
  private updateSoundTouchTempo() {
    if (!this.isSoundTouchMode) return;
    
    this.tracks.forEach((track, i) => {
      if (track.soundTouchShifter) {
        try {
          track.soundTouchShifter.tempo = this.tempo;
        } catch (e) {
          console.warn(`[StreamingPlayer] Track ${i}: Failed to update tempo:`, e);
        }
      }
    });
  }
  
  /**
   * Get current playback time in SoundTouch mode
   */
  private getSoundTouchCurrentTime(): number {
    if (!this.isSoundTouchMode || this.tracks.length === 0) {
      return this.currentTime;
    }
    
    // Find first track with SoundTouch shifter
    const trackWithShifter = this.tracks.find(t => t.soundTouchShifter);
    if (trackWithShifter?.soundTouchShifter) {
      return trackWithShifter.soundTouchShifter.timePlayed || this.currentTime;
    }
    
    return this.currentTime;
  }
  
  /**
   * Switch pitch shifting mode. Enabling uses SoundTouch for high-quality pitch shifting,
   * disabling returns to streaming mode.
   * 
   * PERSISTENT GRAPH: When disabling, we deactivate (not destroy) SoundTouch nodes.
   */
  private async switchToPitchShiftMode(enable: boolean) {
    if (this.isSoundTouchMode === enable) return;

    const wasPlaying = this.isPlaying;
    const currentPos = this.getCurrentTime();

    if (enable) {
      await this.initializeSoundTouchMode();
    } else {
      this.deactivateSoundTouchMode(); // Use deactivate, not destroy
    }

    // Keep time in sync
    this.currentTime = currentPos;
    
    if (wasPlaying && !enable) {
      // Resuming streaming mode - restart HTMLAudioElements
      await this.play();
    }
  }

  private handleBufferingChange() {
    const isAnyBuffering = this.isAnyTrackBuffering();
    const bufferingTracks = this.getBufferingTracks();

    if (isAnyBuffering && this.isPlaying && !this.isPausedForBuffering) {
      
      this.isPausedForBuffering = true;
      this.tracks.forEach(track => {
        if (track.audioElement && !track.audioElement.paused) {
          track.audioElement.pause();
        }
      });
    } else if (!isAnyBuffering && this.isPausedForBuffering) {
      
      this.isPausedForBuffering = false;

      const syncTime = this.currentTime;
      this.tracks.forEach(track => {
        if (track.audioElement) {
          track.audioElement.currentTime = syncTime;
        }
      });

      this.tracks.forEach(async (track) => {
        if (track.audioElement) {
          try {
            await track.audioElement.play();
          } catch (e) {
            console.warn('[StreamingPlayer] Failed to resume track:', e);
          }
        }
      });
    }

    this.notifyBufferingState();
  }

  private notifyBufferingState() {
    const bufferingTracks = this.tracks
      .map((t, i) => ({ isBuffering: t.isBuffering, index: i }))
      .filter(t => t.isBuffering)
      .map(t => t.index);

    const isAnyBuffering = bufferingTracks.length > 0;
    this.onBufferingChangeCallback?.(isAnyBuffering, bufferingTracks);

    this.tracks.forEach((track, index) => {
      this.onTrackStatusCallback?.({
        trackIndex: index,
        status: track.downloadStatus,
        progress: track.downloadProgress,
        isBuffering: track.isBuffering,
      });
    });
  }

  isAnyTrackBuffering(): boolean {
    return this.tracks.some(t => t.isBuffering);
  }

  getBufferingTracks(): number[] {
    return this.tracks
      .map((t, i) => ({ isBuffering: t.isBuffering, index: i }))
      .filter(t => t.isBuffering)
      .map(t => t.index);
  }

  private async startBackgroundDownload() {
    if (this.currentMode === 'stream' || this.isDownloadPaused) {
      
      return;
    }

    const uncachedTracks = this.tracks
      .map((t, i) => ({ track: t, index: i }))
      .filter(({ track }) => track.downloadStatus !== 'cached');

    if (uncachedTracks.length === 0) {
      
      this.onAllCachedCallback?.();
      return;
    }

    

    for (const { track, index } of uncachedTracks) {
      if (this.isDisposed || this.isDownloadPaused || this.currentMode === 'stream') break;

      track.downloadStatus = 'downloading';
      this.onTrackStatusCallback?.({
        trackIndex: index,
        status: 'downloading',
        progress: 0,
      });

      try {
        await streamingCache.loadFromR2AndCache(
          this.songId,
          index,
          track.audioUrl,
          track.config.peaksUrl || '',
          (progress) => {
            track.downloadProgress = Math.round(progress.percentage * 100);
            this.onTrackStatusCallback?.({
              trackIndex: index,
              status: 'downloading',
              progress: track.downloadProgress,
            });
          },
          this.abortController?.signal
        );

        track.downloadStatus = 'cached';
        track.downloadProgress = 100;
        this.onTrackStatusCallback?.({
          trackIndex: index,
          status: 'cached',
          progress: 100,
        });

        // Switch to local cache after download
        await this.switchToLocalCache(index);

        
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          
          return;
        }

        track.downloadStatus = 'error';
        this.onTrackStatusCallback?.({
          trackIndex: index,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Download failed',
        });
        console.error(`[StreamingPlayer] Track ${index} download failed:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const allCached = this.tracks.every(t => t.downloadStatus === 'cached');
    if (allCached) {
      
      this.onAllCachedCallback?.();
    }
  }

  private async switchToLocalCache(trackIndex: number) {
    const track = this.tracks[trackIndex];
    if (!track.audioElement) return;

    const wasPlaying = this.isPlaying;
    const currentPosition = this.currentTime;

    try {
      const cachedBuffer = await streamingCache.loadCachedTrack(this.songId, trackIndex);
      const blob = new Blob([cachedBuffer], { type: 'audio/wav' });

      if (track.localBlobUrl) {
        URL.revokeObjectURL(track.localBlobUrl);
      }

      track.localBlobUrl = URL.createObjectURL(blob);
      track.audioElement.src = track.localBlobUrl;
      track.audioElement.currentTime = currentPosition;

      // Re-apply tempo settings
      this.applyTempoToElement(track.audioElement);

      // decodeTrackBuffer is still available for other uses
      // but we no longer decode for pitch to avoid memory spike

      if (wasPlaying) {
        await track.audioElement.play();
      }

      
    } catch (e) {
      console.warn(`[StreamingPlayer] Failed to switch track ${trackIndex} to local:`, e);
    }
  }

  // Track if this is a simple resume (no seek needed) vs a fresh play
  private isPausedState: boolean = false;

  // Playback controls
  async play(startOffsetSeconds: number = 0.08) {
    if (this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isPlaying = true;

    if (this.isSoundTouchMode) {
      // SoundTouch mode: ScriptProcessorNodes run automatically
      this.playSoundTouchMode();
    } else {
      // Standard mode: resume or play HTMLAudioElements
      // CRITICAL: If we're resuming from a pause, DO NOT seek or touch any properties
      // This preserves the browser's internal audio buffer and prevents quality degradation
      const isResumingFromPause = this.isPausedState;
      
      const playPromises = this.tracks.map(async (track) => {
        const audio = track.audioElement;
        if (!audio) return;

        try {
          if (isResumingFromPause) {
            // Simple resume - just call play(), don't touch currentTime or any other property
            // This preserves audio quality by not triggering browser re-decode
            await audio.play();
          } else {
            // Fresh play or seek - need to sync position
            const startAt = Number.isFinite(this.currentTime) ? this.currentTime : 0;
            
            // Only seek if position differs significantly
            if (Math.abs(audio.currentTime - startAt) > 0.05) {
              audio.currentTime = startAt;
            }
            
            // Only apply tempo on initial play, not on resume
            this.applyTempoToElement(audio);
            await audio.play();
          }
        } catch (e) {
          console.warn('Failed to play track:', e);
        }
      });

      await Promise.all(playPromises);
    }

    this.isPausedState = false;
    this.startTimeUpdate();
  }

  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.isPausedState = true; // Mark that we're pausing (for clean resume)

    if (this.isSoundTouchMode) {
      // In SoundTouch mode, we can't truly pause ScriptProcessorNode
      // But we track the current time for resume
      this.currentTime = this.getSoundTouchCurrentTime();
    } else {
      // Just pause - don't read currentTime to avoid any side effects
      // The audio elements maintain their position internally
      this.tracks.forEach(track => {
        if (track.audioElement) {
          track.audioElement.pause();
        }
      });
      
      // Update our internal time reference from the first valid track
      const firstValidTime = this.tracks.find(t => t.audioElement)?.audioElement?.currentTime;
      if (typeof firstValidTime === 'number' && Number.isFinite(firstValidTime)) {
        this.currentTime = firstValidTime;
      }
    }

    this.stopTimeUpdate();
  }

  stop() {
    this.pause();
    this.seekTo(0);
  }

  seekTo(time: number) {
    this.currentTime = Math.min(time, this.duration);
    
    // When seeking, we need to actually set the position on next play
    // So clear the pause state to trigger a proper sync
    this.isPausedState = false;

    if (this.isSoundTouchMode) {
      // Seek SoundTouch shifters
      this.seekSoundTouchToPosition(this.currentTime);
    } else {
      // Seek HTML elements (standard mode)
      this.tracks.forEach(track => {
        if (track.audioElement) {
          try {
            track.audioElement.currentTime = this.currentTime;
          } catch {}
        }
      });
    }

    this.onTimeUpdateCallback?.(this.currentTime);
  }

  // Track controls
  setTrackVolume(trackIndex: number, volume: number) {
    if (this.tracks[trackIndex]) {
      this.tracks[trackIndex].baseVolume = volume;
      this.updateSoloMute();
    }
  }

  setTrackPan(trackIndex: number, pan: number) {
    if (this.tracks[trackIndex]) {
      this.tracks[trackIndex].panNode.pan.value = pan;
    }
  }

  setTrackMute(trackIndex: number, muted: boolean) {
    if (this.tracks[trackIndex]) {
      this.tracks[trackIndex].muted = muted;
      this.updateSoloMute();
    }
  }

  setTrackSolo(trackIndex: number, solo: boolean) {
    if (this.tracks[trackIndex]) {
      this.tracks[trackIndex].solo = solo;
      this.updateSoloMute();
    }
  }

  private updateSoloMute() {
    const hasSolo = this.tracks.some(t => t.solo);

    this.tracks.forEach(track => {
      if (hasSolo) {
        track.gainNode.gain.value = track.solo ? track.baseVolume : 0;
      } else {
        track.gainNode.gain.value = track.muted ? 0 : track.baseVolume;
      }
    });
  }

  /**
   * Set track output channel.
   * Channel values follow Ableton-style routing:
   * - 0: Main (stereo, outputs to both channels 0 and 1)
   * - 1: Ext. 1/2 (stereo pair, channels 0 and 1)
   * - 2: Ext. 1 (mono, channel 0 only)
   * - 3: Ext. 2 (mono, channel 1 only)
   * - 4: Ext. 3/4 (stereo pair, channels 2 and 3)
   * - 5: Ext. 3 (mono, channel 2 only)
   * - 6: Ext. 4 (mono, channel 3 only)
   * ... and so on
   */
  setTrackOutputChannel(trackIndex: number, channel: number) {
    const track = this.tracks[trackIndex];
    if (!track) return;

    track.outputChannel = channel;
    try { track.panNode.disconnect(); } catch {}
    
    if (channel === 0) {
      // Main: stereo output to channels 0 and 1
      track.panNode.connect(this.channelMerger, 0, 0);
      track.panNode.connect(this.channelMerger, 0, 1);
    } else {
      // External outputs: 
      // channel 1 = Ext 1/2 (stereo pair 0,1)
      // channel 2 = Ext 1 (mono 0)
      // channel 3 = Ext 2 (mono 1)
      // channel 4 = Ext 3/4 (stereo pair 2,3)
      // channel 5 = Ext 3 (mono 2)
      // channel 6 = Ext 4 (mono 3)
      // Pattern: every 3 options = 1 stereo pair + 2 mono
      const extIndex = channel - 1; // 0-based external index
      const pairIndex = Math.floor(extIndex / 3); // Which stereo pair (0=1/2, 1=3/4, etc)
      const optionInPair = extIndex % 3; // 0=stereo, 1=left mono, 2=right mono
      
      const baseChannel = pairIndex * 2; // Starting channel for this pair
      
      if (optionInPair === 0) {
        // Stereo pair (e.g., 1/2, 3/4)
        const leftCh = Math.min(baseChannel, 31);
        const rightCh = Math.min(baseChannel + 1, 31);
        track.panNode.connect(this.channelMerger, 0, leftCh);
        track.panNode.connect(this.channelMerger, 0, rightCh);
      } else if (optionInPair === 1) {
        // Mono left (e.g., 1, 3)
        const ch = Math.min(baseChannel, 31);
        track.panNode.connect(this.channelMerger, 0, ch);
      } else {
        // Mono right (e.g., 2, 4)
        const ch = Math.min(baseChannel + 1, 31);
        track.panNode.connect(this.channelMerger, 0, ch);
      }
    }
  }

  // Output device
  async setGlobalOutputDevice(deviceId: string) {
    try {
      for (const track of this.tracks) {
        if (track.audioElement && typeof (track.audioElement as any).setSinkId === 'function') {
          await (track.audioElement as any).setSinkId(deviceId);
        }
      }
      this.globalOutputDeviceId = deviceId;
      
    } catch (err) {
      console.error('[StreamingPlayer] Error setting output device:', err);
    }
  }

  getGlobalOutputDevice(): string {
    return this.globalOutputDeviceId;
  }

  // Master volume controls
  setMasterVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterBus.gain.value = clampedVolume;
    
  }

  getMasterVolume(): number {
    return this.masterBus.gain.value;
  }

  // Getters
  getDuration(): number {
    return this.duration;
  }

  private getCurrentTimeFromElements(): number {
    for (const track of this.tracks) {
      if (track.audioElement && !isNaN(track.audioElement.currentTime)) {
        return track.audioElement.currentTime;
      }
    }
    return this.currentTime;
  }

  getCurrentTime(): number {
    if (this.isSoundTouchMode) {
      return this.getSoundTouchCurrentTime();
    }
    return this.getCurrentTimeFromElements();
  }

  getTrackCount(): number {
    return this.tracks.length;
  }

  getTrackConfig(index: number): StreamingTrackConfig | undefined {
    return this.tracks[index]?.config;
  }

  getAllTrackStatuses(): TrackDownloadStatus[] {
    return this.tracks.map((track, index) => ({
      trackIndex: index,
      status: track.downloadStatus,
      progress: track.downloadProgress,
      isBuffering: track.isBuffering,
    }));
  }

  getFailedTrackIndices(): number[] {
    return this.tracks
      .map((t, i) => ({ status: t.downloadStatus, index: i }))
      .filter(({ status }) => status === 'error')
      .map(({ index }) => index);
  }

  getCachedTrackCount(): number {
    return this.tracks.filter(t => t.downloadStatus === 'cached').length;
  }

  async retryFailedDownload(trackIndex: number) {
    const track = this.tracks[trackIndex];
    if (!track || track.downloadStatus !== 'error') return;

    
    track.downloadStatus = 'downloading';
    track.downloadProgress = 0;
    this.onTrackStatusCallback?.({
      trackIndex,
      status: 'downloading',
      progress: 0,
    });

    try {
      await streamingCache.loadFromR2AndCache(
        this.songId,
        trackIndex,
        track.audioUrl,
        track.config.peaksUrl || '',
        (progress) => {
          track.downloadProgress = Math.round(progress.percentage * 100);
          this.onTrackStatusCallback?.({
            trackIndex,
            status: 'downloading',
            progress: track.downloadProgress,
          });
        },
        this.abortController?.signal
      );

      track.downloadStatus = 'cached';
      track.downloadProgress = 100;
      this.onTrackStatusCallback?.({
        trackIndex,
        status: 'cached',
        progress: 100,
      });

      await this.switchToLocalCache(trackIndex);

      

      const allCached = this.tracks.every(t => t.downloadStatus === 'cached');
      if (allCached) {
        
        this.onAllCachedCallback?.();
      }
    } catch (error) {
      track.downloadStatus = 'error';
      this.onTrackStatusCallback?.({
        trackIndex,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Download failed',
      });
      console.error(`[StreamingPlayer] Track ${trackIndex} retry failed:`, error);
    }
  }

  async retryAllFailed() {
    const failedIndices = this.getFailedTrackIndices();
    

    for (const index of failedIndices) {
      await this.retryFailedDownload(index);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  stopDownload() {
    
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.tracks.forEach((track, index) => {
      if (track.downloadStatus === 'downloading') {
        track.downloadStatus = 'pending';
        track.downloadProgress = 0;
        this.onTrackStatusCallback?.({
          trackIndex: index,
          status: 'pending',
          progress: 0,
        });
      }
    });
  }

  isDownloading(): boolean {
    return this.tracks.some(t => t.downloadStatus === 'downloading');
  }

  setMode(mode: 'stream' | 'download') {
    if (this.currentMode === mode) return;

    
    this.currentMode = mode;

    if (mode === 'stream') {
      this.pauseDownloads();
    } else {
      this.isDownloadPaused = false;
      this.startBackgroundDownload();
    }
  }

  getMode(): 'stream' | 'download' {
    return this.currentMode;
  }

  pauseDownloads() {
    if (this.isDownloadPaused) return;

    
    this.isDownloadPaused = true;
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.tracks.forEach((track, index) => {
      if (track.downloadStatus === 'downloading') {
        track.downloadStatus = 'pending';
        track.downloadProgress = 0;
        this.onTrackStatusCallback?.({
          trackIndex: index,
          status: 'pending',
          progress: 0,
        });
      }
    });
  }

  resumeDownloads() {
    if (!this.isDownloadPaused) return;

    
    this.isDownloadPaused = false;
    this.startBackgroundDownload();
  }

  isDownloadsPaused(): boolean {
    return this.isDownloadPaused;
  }

  // Tempo Control (rate-based, 0.25x to 2.0x)
  setTempo(rate: number) {
    this.tempo = Math.max(0.25, Math.min(2.0, rate));
    
    this.applyTempoToAllTracks();
    
    // Also update SoundTouch if in pitch shift mode
    if (this.isSoundTouchMode) {
      this.updateSoundTouchTempo();
    }
  }

  getTempo(): number {
    return this.tempo;
  }

  // Pitch Control (in semitones, -3 to +3 for stability)
  // Supports two engines: 'worklet' (modern/stable) or 'soundtouch' (legacy/high-quality)
  // PERSISTENT GRAPH: Pitch nodes are created once and kept alive.
  private isSettingPitch: boolean = false;
  private pendingPitchSemitones: number | null = null;

  async setPitch(semitones: number) {
    // Guard against disposed player or invalid audio context
    if (this.isDisposed) {
      console.warn('[StreamingPlayer] Cannot set pitch - player is disposed');
      return;
    }
    
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.warn('[StreamingPlayer] Cannot set pitch - audio context is closed');
      return;
    }

    // Clamp to ±3 for initial stability (can be expanded later)
    const clamped = Math.max(-3, Math.min(3, semitones));
    this.pendingPitchSemitones = clamped;

    if (this.isSettingPitch) return;
    this.isSettingPitch = true;

    let lastError: unknown = null;

    try {
      while (this.pendingPitchSemitones !== null) {
        // Re-check disposed state in the loop (async operation may have disposed player)
        if (this.isDisposed || !this.audioContext || this.audioContext.state === 'closed') {
          console.warn('[StreamingPlayer] Aborting pitch change - player disposed during operation');
          break;
        }

        const nextPitch = this.pendingPitchSemitones;
        this.pendingPitchSemitones = null;

        const oldPitch = this.pitchSemitones;
        this.pitchSemitones = nextPitch;

        const needsPitchShift = this.pitchSemitones !== 0;
        const engineName = this.pitchEngine === 'worklet' ? 'AudioWorklet' : 'SoundTouch';
        

        try {
          if (this.pitchEngine === 'worklet') {
            // Modern AudioWorklet engine
            if (needsPitchShift && !this.workletInitialized) {
              // First time enabling pitch shift - initialize worklet nodes
              await this.initializeWorkletMode();
            } else if (needsPitchShift && !this.isWorkletMode) {
              // Nodes exist but deactivated - reactivate
              this.isWorkletMode = true;
              this.updateWorkletPitch();
            } else if (!needsPitchShift && this.isWorkletMode) {
              // Pitch is 0 - deactivate (don't destroy)
              this.deactivateWorkletMode();
            } else if (needsPitchShift && this.isWorkletMode) {
              // Pitch changed but still in pitch mode - just update the parameter
              this.updateWorkletPitch();
            }
          } else {
            // Legacy SoundTouch engine
            if (needsPitchShift && !this.soundTouchInitialized) {
              // First time enabling pitch shift - initialize nodes
              await this.initializeSoundTouchMode();
            } else if (needsPitchShift && !this.isSoundTouchMode) {
              // Nodes exist but deactivated - reactivate
              await this.switchToPitchShiftMode(true);
            } else if (!needsPitchShift && this.isSoundTouchMode) {
              // Pitch is 0 - deactivate (don't destroy) SoundTouch
              this.deactivateSoundTouchMode();
            } else if (needsPitchShift && this.isSoundTouchMode) {
              // Pitch changed but still in pitch mode - just update the parameter
              this.updateSoundTouchPitch();
            }
          }
        } catch (error) {
          console.error('[StreamingPlayer] Failed to set pitch:', error);
          lastError = error;
          // Revert pitch on error
          this.pitchSemitones = oldPitch;
          
          // Safely deactivate current engine (don't destroy - might recover later)
          try {
            if (this.isSoundTouchMode && !this.isDisposed) {
              this.deactivateSoundTouchMode();
            }
            if (this.isWorkletMode && !this.isDisposed) {
              this.deactivateWorkletMode();
            }
          } catch (deactivateError) {
            console.warn('[StreamingPlayer] Error during pitch engine deactivation:', deactivateError);
          }

          // Ensure UI doesn't get stuck in a loading state
          this.isPitchShiftLoading = false;
          this.onPitchLoadingChangeCallback?.(false, 0);
        }
      }
      if (lastError) {
        // Propagate so the UI can revert the displayed pitch
        throw lastError instanceof Error ? lastError : new Error('Failed to apply pitch shift');
      }
    } finally {
      this.isSettingPitch = false;
    }
  }

  getPitch(): number {
    return this.pitchSemitones;
  }
  
  /**
   * Check if pitch shift mode is currently loading/initializing
   */
  isPitchLoading(): boolean {
    return this.isPitchShiftLoading;
  }

  // ============================================================================
  // SELECTIVE PITCH CONTROL API
  // ============================================================================

  /**
   * Get pitch settings for all tracks (category and whether pitch is enabled)
   */
  getTrackPitchSettings(): TrackPitchSettings[] {
    return this.tracks.map((track, index) => ({
      trackIndex: index,
      category: track.category,
      pitchEnabled: track.pitchEnabled,
    }));
  }

  /**
   * Set pitch enabled state for a specific track.
   * When disabled, the track will use normal streaming (no pitch processing).
   */
  setTrackPitchEnabled(trackIndex: number, enabled: boolean): void {
    const track = this.tracks[trackIndex];
    if (!track) return;
    
    const wasEnabled = track.pitchEnabled;
    track.pitchEnabled = enabled;
    
    // If we're currently in pitch mode and we changed a track's state, we need to update
    if (this.pitchSemitones !== 0 && wasEnabled !== enabled) {
      if (enabled) {
        // Need to add this track to pitch processing (will initialize on next pitch change)
        
      } else {
        // Remove this track from pitch processing
        
        // Disconnect its pitch shifter and reconnect to streaming
        this.disconnectTrackFromPitchShifter(trackIndex);
      }
    }
  }

  /**
   * Get count of tracks that have pitch enabled
   */
  getPitchEnabledTrackCount(): { enabled: number; total: number } {
    const enabled = this.tracks.filter(t => t.pitchEnabled).length;
    return { enabled, total: this.tracks.length };
  }

  /**
   * Disconnect a specific track from pitch shifting and restore streaming
   */
  private disconnectTrackFromPitchShifter(trackIndex: number): void {
    const track = this.tracks[trackIndex];
    if (!track) return;

    // Disconnect SoundTouch if active
    if (track.soundTouchShifter) {
      try {
        track.soundTouchShifter.disconnect();
        track.soundTouchShifter = null;
      } catch (e) {
        console.warn(`[StreamingPlayer] Track ${trackIndex}: Failed to disconnect SoundTouch:`, e);
      }
    }

    // Disconnect AudioWorklet if active
    if (track.workletPitchShifter) {
      try {
        track.workletPitchShifter.disconnect();
        track.workletPitchShifter.dispose();
        track.workletPitchShifter = null;
      } catch (e) {
        console.warn(`[StreamingPlayer] Track ${trackIndex}: Failed to disconnect worklet:`, e);
      }
    }

    // Reconnect MediaElementSource for streaming
    if (track.audioSource && track.gainNode) {
      try {
        track.audioSource.connect(track.gainNode);
      } catch (e) {
        // May already be connected
      }
    }

    // Resume audio element if we're playing
    if (this.isPlaying && track.audioElement) {
      track.audioElement.currentTime = this.getCurrentTime();
      track.audioElement.play().catch(() => {});
    }
  }

  // Callbacks
  onTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdateCallback = callback;
  }

  onReady(callback: () => void) {
    this.onReadyCallback = callback;
  }
  
  /**
   * Set callback for pitch loading state changes
   */
  onPitchLoadingChange(callback: (isLoading: boolean, progress: number) => void) {
    this.onPitchLoadingChangeCallback = callback;
  }

  private startTimeUpdate() {
    this.timeUpdateInterval = window.setInterval(() => {
      if (!this.isPlaying) return;

      if (this.isAnyTrackBuffering()) {
        // during buffering (stream mode) don't advance
        return;
      }

      const time = this.getCurrentTime();
      this.currentTime = time;
      this.onTimeUpdateCallback?.(time);

      if (time >= this.duration && this.duration > 0) {
        this.pause();
        this.onTimeUpdateCallback?.(this.duration);
      }
    }, 33);
  }

  private stopTimeUpdate() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = undefined;
    }
  }

  // Get current audio level for a track (0-1 range)
  getTrackLevel(trackIndex: number): number {
    const track = this.tracks[trackIndex];
    if (!track || !track.analyzerNode) return 0;
    
    // Don't require isPlaying - allow metering anytime audio flows
    // Check if audio element is actually playing
    if (!track.audioElement || track.audioElement.paused) return 0;

    const bufferLength = track.analyzerNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    track.analyzerNode.getByteTimeDomainData(dataArray);

    // Calculate peak level from time domain data
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      // Convert from 0-255 to -1 to 1 range (128 is center/silence)
      const amplitude = Math.abs((dataArray[i] - 128) / 128);
      if (amplitude > peak) {
        peak = amplitude;
      }
    }
    
    // Apply some gain to make meter more responsive and visible
    // Typical audio won't hit full scale, so boost for visual feedback
    return Math.min(1, peak * 2.5);
  }

  // Get levels for all tracks
  getAllTrackLevels(): number[] {
    return this.tracks.map((_, index) => this.getTrackLevel(index));
  }

  // Get master output level (stereo L/R)
  getMasterLevel(): { left: number; right: number } {
    if (!this.masterAnalyzer) return { left: 0, right: 0 };

    const bufferLength = this.masterAnalyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.masterAnalyzer.getByteTimeDomainData(dataArray);

    // Calculate peak level from time domain data
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      const amplitude = Math.abs((dataArray[i] - 128) / 128);
      if (amplitude > peak) {
        peak = amplitude;
      }
    }

    // Apply boost for visual feedback and return as stereo (simplified - same for L/R)
    const level = Math.min(1.5, peak * 2.5); // Allow > 1 to show potential clipping
    return { left: level, right: level };
  }

  // Get gain reduction amount from limiter (in dB)
  // Returns positive dB value representing how much the limiter is attenuating
  getGainReduction(): number {
    if (!this.masterLimiter) return 0;
    // DynamicsCompressorNode.reduction is a negative dB value
    return Math.abs(this.masterLimiter.reduction);
  }

  // Cleanup
  dispose() {
    this.isDisposed = true;
    this.stop();

    this.abortController?.abort();
    
    // Destroy pitch shift nodes properly
    this.destroySoundTouchNodes();
    this.destroyWorkletNodes();

    this.tracks.forEach(track => {
      if (track.audioElement) {
        track.audioElement.pause();
        track.audioElement.src = '';
      }
      if (track.localBlobUrl) {
        URL.revokeObjectURL(track.localBlobUrl);
      }
      try {
        track.gainNode.disconnect();
        track.panNode.disconnect();
        track.analyzerNode.disconnect();
      } catch {}
    });

    try {
      this.audioContext.close();
    } catch {}

    this.stopTimeUpdate();
    
  }
}
