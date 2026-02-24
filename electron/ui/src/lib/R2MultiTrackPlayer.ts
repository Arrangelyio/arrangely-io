/**
 * R2 MultiTrack Player
 * Optimized audio player using Cloudflare R2 + CDN
 * Features: parallel fetch, precomputed peaks, non-blocking decode
 */

import { r2AudioService, R2TrackData } from './r2AudioService';

export interface TrackConfig {
  name: string;
  color: string;
  filename: string;
  default_pan?: number;
  default_volume?: number;
  outputChannel?: number;
}

export interface TrackState {
  buffer: AudioBuffer | null;
  peaks: number[];
  name: string;
  loaded: boolean;
  error?: string;
}

export class R2MultiTrackPlayer {
  private audioContext: AudioContext;
  private channelMerger: ChannelMergerNode;
  private masterBus: GainNode;
  private mediaStreamDestination: MediaStreamAudioDestinationNode;
  private outputElement: HTMLAudioElement;
  
  private tracks: Array<{
    buffer: AudioBuffer | null;
    peaks: number[];
    source: AudioBufferSourceNode | null;
    gainNode: GainNode;
    panNode: StereoPannerNode;
    name: string;
    muted: boolean;
    solo: boolean;
    outputChannel: number;
    loaded: boolean;
  }>;
  
  private songId: string;
  private trackConfigs: TrackConfig[];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private duration: number = 0;
  private isDisposed: boolean = false;
  private animationFrameId?: number;
  private abortController: AbortController | null = null;
  private globalOutputDeviceId: string = 'default';
  
  // Callbacks
  private onTimeUpdateCallback?: (time: number) => void;
  private onReadyCallback?: () => void;
  private onTrackLoadedCallback?: (trackIndex: number, peaks: number[], duration: number) => void;
  private onTrackErrorCallback?: (trackIndex: number, error: string) => void;
  private onLoadProgressCallback?: (loaded: number, total: number) => void;

  constructor(
    trackConfigs: TrackConfig[],
    songId: string,
    options?: {
      onReady?: () => void;
      onTrackLoaded?: (trackIndex: number, peaks: number[], duration: number) => void;
      onTrackError?: (trackIndex: number, error: string) => void;
      onLoadProgress?: (loaded: number, total: number) => void;
    }
  ) {
    this.songId = songId;
    this.trackConfigs = trackConfigs;
    this.onReadyCallback = options?.onReady;
    this.onTrackLoadedCallback = options?.onTrackLoaded;
    this.onTrackErrorCallback = options?.onTrackError;
    this.onLoadProgressCallback = options?.onLoadProgress;

    // Initialize audio context
    this.audioContext = new AudioContext();
    this.channelMerger = this.audioContext.createChannelMerger(8);
    this.masterBus = this.audioContext.createGain();
    this.masterBus.connect(this.channelMerger, 0, 0);
    this.masterBus.connect(this.channelMerger, 0, 1);

    // Setup media stream for output device selection
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();
    this.channelMerger.connect(this.mediaStreamDestination);
    
    this.outputElement = new Audio();
    this.outputElement.autoplay = true;
    this.outputElement.srcObject = this.mediaStreamDestination.stream;

    // Initialize tracks
    this.tracks = trackConfigs.map((config, index) => ({
      buffer: null,
      peaks: [],
      source: null,
      gainNode: this.audioContext.createGain(),
      panNode: this.audioContext.createStereoPanner(),
      name: config.name,
      muted: false,
      solo: false,
      outputChannel: config.outputChannel ?? 0,
      loaded: false,
    }));

    // Set initial volumes and pans
    trackConfigs.forEach((config, index) => {
      if (config.default_volume !== undefined) {
        this.tracks[index].gainNode.gain.value = config.default_volume;
      }
      if (config.default_pan !== undefined) {
        this.tracks[index].panNode.pan.value = config.default_pan;
      }
    });

    // Start loading
    this.startLoading();
  }

  private async startLoading() {
    this.abortController = new AbortController();
    const trackCount = this.trackConfigs.length;
    let loadedCount = 0;

    

    try {
      // Get file extensions from configs
      const extensions = this.trackConfigs.map(config => {
        const ext = config.filename.split('.').pop()?.toLowerCase();
        return ext || 'wav';
      });

      // Fetch all tracks in parallel
      const tracks = await r2AudioService.fetchAllTracks(
        this.songId,
        trackCount,
        extensions,
        (trackIndex, status, progress) => {
          
          
          if (status === 'peaks' && progress === 100) {
            // Peaks loaded - can show waveform immediately
          }
          
          if (status === 'complete') {
            loadedCount++;
            this.onLoadProgressCallback?.(loadedCount, trackCount);
          }
        },
        this.abortController.signal
      );

      if (this.isDisposed) return;

      // Decode audio buffers sequentially to prevent memory issues
      
      for (const trackData of tracks) {
        if (this.isDisposed) break;

        try {
          // Store peaks immediately (no decode needed)
          this.tracks[trackData.trackIndex].peaks = trackData.peaks;
          
          // Decode audio
          const audioBuffer = await this.decodeAudio(trackData.audioBuffer);
          
          if (this.isDisposed) break;
          
          this.tracks[trackData.trackIndex].buffer = audioBuffer;
          this.tracks[trackData.trackIndex].loaded = true;

          // Connect audio nodes
          const track = this.tracks[trackData.trackIndex];
          track.gainNode.connect(track.panNode);
          track.panNode.connect(this.channelMerger, 0, track.outputChannel);

          // Update duration
          if (audioBuffer.duration > this.duration) {
            this.duration = audioBuffer.duration;
          }

          // Notify callback
          this.onTrackLoadedCallback?.(
            trackData.trackIndex,
            trackData.peaks,
            audioBuffer.duration
          );

          // Small delay for GC
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[R2Player] Failed to decode track ${trackData.trackIndex}:`, error);
          this.onTrackErrorCallback?.(
            trackData.trackIndex,
            error instanceof Error ? error.message : 'Decode failed'
          );
        }
      }

      
      this.onReadyCallback?.();

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        
        return;
      }
      console.error('[R2Player] Loading failed:', error);
    }
  }

  private async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Clone buffer to avoid detached buffer issues
    const bufferCopy = arrayBuffer.slice(0);
    
    // Recreate context if closed
    if (this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    
    return await this.audioContext.decodeAudioData(bufferCopy);
  }

  // Playback controls
  play() {
    if (this.isPlaying) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const offset = this.pauseTime;
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;

    // Start all loaded tracks
    this.tracks.forEach((track, index) => {
      if (!track.buffer) {
        
        return;
      }

      track.source = this.audioContext.createBufferSource();
      track.source.buffer = track.buffer;
      track.source.connect(track.gainNode);
      track.source.start(0, offset);
    });

    this.startTimeUpdate();
  }

  pause() {
    if (!this.isPlaying) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;

    this.tracks.forEach(track => {
      if (track.source) {
        track.source.stop();
        track.source.disconnect();
        track.source = null;
      }
    });

    this.stopTimeUpdate();
  }

  stop() {
    this.pause();
    this.pauseTime = 0;
    this.startTime = 0;
    this.onTimeUpdateCallback?.(0);
  }

  seekTo(time: number) {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    
    this.pauseTime = Math.min(time, this.duration);
    this.onTimeUpdateCallback?.(this.pauseTime);
    
    if (wasPlaying) this.play();
  }

  // Track controls
  setTrackVolume(trackIndex: number, volume: number) {
    if (this.tracks[trackIndex]) {
      this.tracks[trackIndex].gainNode.gain.value = volume;
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
        track.gainNode.gain.value = track.solo ? 1 : 0;
      } else {
        track.gainNode.gain.value = track.muted ? 0 : 1;
      }
    });
  }

  /**
   * Set track output channel (Ableton-style routing).
   * - 0: Main (stereo, outputs to both channels 0 and 1)
   * - 1: Ext. 1/2 (stereo pair)
   * - 2: Ext. 1 (mono)
   * - 3: Ext. 2 (mono)
   * ... and so on
   */
  setTrackOutputChannel(trackIndex: number, channel: number) {
    const track = this.tracks[trackIndex];
    if (!track) return;
    
    track.outputChannel = channel;
    track.panNode.disconnect();
    
    if (channel === 0) {
      // Main: stereo output to channels 0 and 1
      track.panNode.connect(this.channelMerger, 0, 0);
      track.panNode.connect(this.channelMerger, 0, 1);
    } else {
      // External outputs following Ableton pattern
      const extIndex = channel - 1;
      const pairIndex = Math.floor(extIndex / 3);
      const optionInPair = extIndex % 3;
      const baseChannel = pairIndex * 2;
      
      if (optionInPair === 0) {
        // Stereo pair
        track.panNode.connect(this.channelMerger, 0, Math.min(baseChannel, 31));
        track.panNode.connect(this.channelMerger, 0, Math.min(baseChannel + 1, 31));
      } else if (optionInPair === 1) {
        // Mono left
        track.panNode.connect(this.channelMerger, 0, Math.min(baseChannel, 31));
      } else {
        // Mono right
        track.panNode.connect(this.channelMerger, 0, Math.min(baseChannel + 1, 31));
      }
    }
  }

  // Output device
  async setGlobalOutputDevice(deviceId: string) {
    try {
      if (typeof this.outputElement.setSinkId === 'function') {
        await this.outputElement.setSinkId(deviceId);
        this.globalOutputDeviceId = deviceId;
        try { await this.outputElement.play(); } catch {}
        
      }
    } catch (err) {
      console.error('[R2Player] Error setting output device:', err);
    }
  }

  getGlobalOutputDevice(): string {
    return this.globalOutputDeviceId;
  }

  // Getters
  getDuration(): number {
    return this.duration;
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  getTrackPeaks(trackIndex: number): number[] {
    return this.tracks[trackIndex]?.peaks || [];
  }

  getTrackState(trackIndex: number): TrackState | null {
    const track = this.tracks[trackIndex];
    if (!track) return null;
    return {
      buffer: track.buffer,
      peaks: track.peaks,
      name: track.name,
      loaded: track.loaded,
    };
  }

  isTrackLoaded(trackIndex: number): boolean {
    return this.tracks[trackIndex]?.loaded ?? false;
  }

  // Callbacks
  onTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdateCallback = callback;
  }

  onReady(callback: () => void) {
    this.onReadyCallback = callback;
  }

  private startTimeUpdate() {
    const update = () => {
      if (!this.isPlaying) return;

      const currentTime = this.audioContext.currentTime - this.startTime;
      this.onTimeUpdateCallback?.(currentTime);

      if (currentTime >= this.duration) {
        this.pause();
        this.onTimeUpdateCallback?.(this.duration);
      }
    };

    this.animationFrameId = window.setInterval(update, 33) as any;
  }

  private stopTimeUpdate() {
    if (this.animationFrameId) {
      clearInterval(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  // Cleanup
  dispose() {
    this.isDisposed = true;
    this.stop();

    // Abort any ongoing fetches
    this.abortController?.abort();

    // Disconnect all tracks
    this.tracks.forEach(track => {
      try {
        track.gainNode.disconnect();
        track.panNode.disconnect();
      } catch {}
    });

    // Close audio context
    try {
      this.audioContext.close();
    } catch {}

    // Cleanup output element
    try {
      this.outputElement.pause();
      this.outputElement.srcObject = null;
    } catch {}

    
  }
}
