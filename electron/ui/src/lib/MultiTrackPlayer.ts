export class MultiTrackPlayer {
  private audioContext: AudioContext;
  private channelMerger: ChannelMergerNode;
  private globalOutputDeviceId: string = 'default';
  private masterBus: GainNode;  
  private tracks: Array<{
    buffer: AudioBuffer | null;
    source: AudioBufferSourceNode | null;
    audioElement: HTMLAudioElement | null;
    blobUrl?: string | null;
    useAudioElement?: boolean;
    gainNode: GainNode;
    panNode: StereoPannerNode;
    analyzerNode: AnalyserNode;
    url: string;
    muted: boolean;
    solo: boolean;
    outputChannel: number;
  }>;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private duration: number = 0;
  private onTimeUpdateCallback?: (time: number) => void;
  private onReadyCallback?: () => void;
  private onLoadProgressCallback?: (progress: number) => void;
  private onTrackProgressCallback?: (trackIndex: number, status: 'loading' | 'loaded' | 'error', progress?: number, error?: string) => void;
  private songId: string = '';
  private animationFrameId?: number;
  private outputElement: HTMLAudioElement;
  private mediaStreamDestination: MediaStreamAudioDestinationNode;
  private boundDeviceChangeHandler?: () => void;
  private onGlobalDeviceChangedCallback?: (deviceId: string) => void;
  private abortControllers: Map<number, AbortController> = new Map();
  private isDisposed: boolean = false;


 constructor(
    trackConfigs: any[], 
    songId: string,
    onLoadProgress?: (progress: number) => void,
    onTrackProgress?: (trackIndex: number, status: 'loading' | 'loaded' | 'error', progress?: number, error?: string) => void
  ) {
  this.songId = songId;
  this.onLoadProgressCallback = onLoadProgress;
  this.onTrackProgressCallback = onTrackProgress;

  // 1. Create context
  this.audioContext = new AudioContext();

  this.channelMerger = this.audioContext.createChannelMerger(8);

  // 3. Create Master Bus
  this.masterBus = this.audioContext.createGain();

  // Master bus → stereo L/R
  this.masterBus.connect(this.channelMerger, 0, 0); // Left
  this.masterBus.connect(this.channelMerger, 0, 1); // Right

  // 2. Create channel merger FIRST (before connecting)
  this.channelMerger = this.audioContext.createChannelMerger(8);

  // 3. Create media stream destination
  this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();

  // 4. Create audio element
  this.outputElement = new Audio();
  this.outputElement.autoplay = true;

  // 5. Connect WebAudio → MediaStream
  this.channelMerger.connect(this.mediaStreamDestination);

  // 6. Feed MediaStream into the audio element
  this.outputElement.srcObject = this.mediaStreamDestination.stream;

  // Attach devicechange handler and bind initial sink
  this.boundDeviceChangeHandler = this.handleDeviceChange.bind(this);
  try {
    navigator.mediaDevices.addEventListener('devicechange', this.boundDeviceChangeHandler);
  } catch (e) {
    console.warn('Failed to attach devicechange handler', e);
  }

  // Ensure initial sink is applied (including 'default')
  this.setGlobalOutputDevice(this.globalOutputDeviceId).catch(() => {});

  // 7. Initialize tracks with analyzer nodes for level metering
  this.tracks = trackConfigs.map(config => {
    const analyzerNode = this.audioContext.createAnalyser();
    analyzerNode.fftSize = 256;
    analyzerNode.smoothingTimeConstant = 0.8;
    return {
      buffer: null,
      source: null,
      gainNode: this.audioContext.createGain(),
      panNode: this.audioContext.createStereoPanner(),
      analyzerNode,
      url: config.url,
      muted: false,
      solo: false,
      outputChannel: config.outputChannel || 0
    };
  });

  // 8. Start progressive loading (don't wait for all tracks)
  this.startProgressiveLoading();
}


 async setGlobalOutputDevice(deviceId: string) {
  try {
    if (!this.outputElement) {
      console.warn("Output element not ready");
      return;
    }

    if (typeof this.outputElement.setSinkId !== "function") {
      console.warn("setSinkId is not supported in this browser/Electron build.");
      return;
    }

    await this.outputElement.setSinkId(deviceId);
    this.globalOutputDeviceId = deviceId;
    try { await this.outputElement.play(); } catch (_) {}

    
  } catch (err) {
    console.error("Error setting global audio output device:", err);
  }
}


  getGlobalOutputDevice(): string {
    return this.globalOutputDeviceId;
  }

  onGlobalOutputDeviceChanged(cb: (deviceId: string) => void) {
    this.onGlobalDeviceChangedCallback = cb;
  }

  private async handleDeviceChange() {
    try {
      const anyOutput: any = this.outputElement as any;
      if (typeof anyOutput.setSinkId !== 'function') return;

      if (this.globalOutputDeviceId === 'default') {
        await anyOutput.setSinkId('default');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices
        .filter((d) => d.kind === 'audiooutput')
        .map((d) => d.deviceId);

      if (!outputs.includes(this.globalOutputDeviceId)) {
        console.warn('Selected output device no longer available. Falling back to default.');
        await anyOutput.setSinkId('default');
        this.globalOutputDeviceId = 'default';
        this.onGlobalDeviceChangedCallback?.('default');
      } else {
        // Re-apply sink to ensure routing remains correct after hardware changes
        await anyOutput.setSinkId(this.globalOutputDeviceId);
      }
    } catch (e) {
      console.warn('Error handling devicechange:', e);
    }
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

  getTrackOutputChannel(trackIndex: number): number {
    return this.tracks[trackIndex]?.outputChannel || 0;
  }

  private async loadTrack(index: number): Promise<void> {
    const { streamingCache } = await import('./streamingAudioCache');
    const track = this.tracks[index];
    
    if (!track) {
      throw new Error(`Track ${index} not found`);
    }

    if (this.isDisposed) {
      throw new Error('Player is disposed');
    }

    // Create abort controller for this track
    const abortController = new AbortController();
    this.abortControllers.set(index, abortController);

    try {
      
      this.onTrackProgressCallback?.(index, 'loading', 0);
      
      // Use streaming cache with progress updates and abort signal
      const arrayBuffer = await streamingCache.loadOrStream(
        track.url,
        this.songId,
        index,
        (progress) => {
          // If loading from cache, show instant completion
          if (progress.status === 'complete' && progress.loaded === 0) {
            this.onTrackProgressCallback?.(index, 'loading', 70);
            
          } else {
            // Convert streaming progress to track progress
            const loadingProgress = Math.floor(progress.percentage * 70); // 0-70% for loading
            this.onTrackProgressCallback?.(index, 'loading', loadingProgress);
            
          }
        },
        abortController.signal
      );

      if (this.isDisposed) {
        throw new Error('Player disposed before decode');
      }

      // Decode audio buffer with memory management
      
      this.onTrackProgressCallback?.(index, 'loading', 80);
      
      // Clone the ArrayBuffer before decoding to avoid detached buffer issues
      const bufferCopy = arrayBuffer.slice(0);
      
      // Recreate AudioContext periodically to prevent memory buildup
      if (this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }
      
      track.buffer = await this.audioContext.decodeAudioData(bufferCopy);
      
      if (this.isDisposed) {
        throw new Error('Player disposed after decode');
      }

      
      
      // Allow GC time after decode
      await new Promise(resolve => setTimeout(resolve, 300));

      if (track.buffer.duration > this.duration) {
        this.duration = track.buffer.duration;
      }

      // Connect audio nodes with analyzer for level metering
      track.gainNode.connect(track.analyzerNode);
      track.analyzerNode.connect(track.panNode);
      track.panNode.connect(this.channelMerger, 0, track.outputChannel);

      // Track loaded successfully
      this.onTrackProgressCallback?.(index, 'loaded', 100);
      
    } catch (error) {
      // Handle abort gracefully - don't log as error
      if (error instanceof DOMException && error.name === 'AbortError') {
        
        return;
      }
      
      if (error instanceof Error && error.message === 'Player is disposed') {
        
        return;
      }

      console.error(`[Track ${index}] Error:`, error);
      this.onTrackProgressCallback?.(
        index, 
        'error', 
        0, 
        error instanceof Error ? error.message : 'Failed to load track'
      );
      throw error;
    } finally {
      // Clean up abort controller
      this.abortControllers.delete(index);
    }
  }

  private async startProgressiveLoading() {
    const totalTracks = this.tracks.length;
    let loadedCount = 0;

    // Load first 3 tracks immediately for quick start
    const priorityTracks = Math.min(3, totalTracks);
    
    

    // Load priority tracks first
    for (let i = 0; i < priorityTracks; i++) {
      try {
        await this.loadTrack(i);
        loadedCount++;
        this.onLoadProgressCallback?.(loadedCount / totalTracks);
      } catch (error) {
        console.error(`Error loading priority track ${i}:`, error);
        this.onTrackProgressCallback?.(i, 'error', 0, error instanceof Error ? error.message : 'Failed to load track');
        loadedCount++;
        this.onLoadProgressCallback?.(loadedCount / totalTracks);
      }
    }

    // Signal ready for playback with priority tracks
    
    this.onReadyCallback?.();

    // Load remaining tracks in background (one at a time to avoid overwhelming system)
    for (let i = priorityTracks; i < totalTracks; i++) {
      if (this.isDisposed) break;
      
      // Add delay between tracks to allow GC
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await this.loadTrack(i);
        loadedCount++;
        this.onLoadProgressCallback?.(loadedCount / totalTracks);
      } catch (error) {
        console.error(`Error loading background track ${i}:`, error);
        this.onTrackProgressCallback?.(i, 'error', 0, error instanceof Error ? error.message : 'Failed to load track');
        loadedCount++;
        this.onLoadProgressCallback?.(loadedCount / totalTracks);
      }
    }

    
  }

  async retryTrack(index: number): Promise<void> {
    try {
      await this.loadTrack(index);
    } catch (error) {
      console.error(`Failed to retry track ${index}:`, error);
      this.onTrackProgressCallback?.(index, 'error', 0, error instanceof Error ? error.message : 'Failed to load track');
      throw error;
    }
  }

  play() {
    if (this.isPlaying) return;

    // Ensure context is running (autoplay policies may start it suspended)
    try {
      if (this.audioContext.state === 'suspended') this.audioContext.resume();
    } catch (e) {
      console.warn('Error resuming audio context', e);
    }

    const offset = this.pauseTime;
    this.startTime = this.audioContext.currentTime - offset;
    this.isPlaying = true;

    // Play only loaded tracks (progressive loading allows partial playback)
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
    if (wasPlaying) {
      this.pause();
    }

    this.pauseTime = Math.min(time, this.duration);
    this.onTimeUpdateCallback?.(this.pauseTime);

    if (wasPlaying) {
      this.play();
    }
  }

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

    this.animationFrameId = window.setInterval(update, 33); // ~30 FPS
  }


  private stopTimeUpdate() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  getDuration(): number {
    return this.duration;
  }

  // Get current audio level for a track (0-1 range)
  getTrackLevel(trackIndex: number): number {
    const track = this.tracks[trackIndex];
    if (!track || !track.analyzerNode || !this.isPlaying) return 0;

    const dataArray = new Float32Array(track.analyzerNode.frequencyBinCount);
    track.analyzerNode.getFloatTimeDomainData(dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Convert to 0-1 range with some headroom
    return Math.min(1, rms * 3);
  }

  // Get levels for all tracks
  getAllTrackLevels(): number[] {
    return this.tracks.map((_, index) => this.getTrackLevel(index));
  }

  onReady(callback: () => void) {
    this.onReadyCallback = callback;
  }

  onTimeUpdate(callback: (time: number) => void) {
    this.onTimeUpdateCallback = callback;
  }

  dispose() {
    this.isDisposed = true;
    this.stop();

    // Abort all ongoing fetch requests
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (e) {
        console.warn('Error aborting fetch:', e);
      }
    });
    this.abortControllers.clear();

    // Remove devicechange handler
    if (this.boundDeviceChangeHandler) {
      try {
        navigator.mediaDevices.removeEventListener('devicechange', this.boundDeviceChangeHandler);
      } catch (e) {}
      this.boundDeviceChangeHandler = undefined;
    }

    this.tracks.forEach(track => {
      try {
        track.gainNode.disconnect();
        track.panNode.disconnect();
      } catch (e) {}
    });
    
    try {
      this.channelMerger.disconnect();
    } catch (e) {}
    
    try {
      this.audioContext.close();
    } catch (e) {}
    
    try {
      this.outputElement.pause();
    } catch (e) {}
    
    try {
      (this.outputElement as any).srcObject = null;
    } catch (e) {}
  }
}
