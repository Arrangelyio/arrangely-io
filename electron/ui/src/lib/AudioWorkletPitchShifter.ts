/**
 * AudioWorklet-based Pitch Shifter
 * 
 * Modern replacement for ScriptProcessorNode-based pitch shifting.
 * Runs on a dedicated audio thread for improved stability and performance.
 * 
 * Features:
 * - Off-main-thread processing
 * - No ScriptProcessorNode deprecation warnings
 * - Stable even with rapid parameter changes
 * - Works with streaming audio (no need to decode full buffer)
 */

export class AudioWorkletPitchShifter {
  private audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private inputNode: GainNode;
  private outputNode: GainNode;
  private isReady: boolean = false;
  private pendingPitch: number | null = null;
  private pitchSemitones: number = 0;
  
  // Worklet loading state
  private static workletLoaded: boolean = false;
  private static workletLoadPromise: Promise<void> | null = null;
  
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    
    // Create input/output nodes for easy connection
    this.inputNode = audioContext.createGain();
    this.inputNode.gain.value = 1.0;
    
    this.outputNode = audioContext.createGain();
    this.outputNode.gain.value = 1.0;
  }
  
  /**
   * Load the AudioWorklet module (only once per context)
   */
  private async loadWorklet(): Promise<void> {
    if (AudioWorkletPitchShifter.workletLoaded) {
      return;
    }
    
    if (AudioWorkletPitchShifter.workletLoadPromise) {
      return AudioWorkletPitchShifter.workletLoadPromise;
    }
    
    AudioWorkletPitchShifter.workletLoadPromise = (async () => {
      try {
        // In Vite/Electron, public folder is served at root
        const workletUrl = new URL('/audio-worklets/pitch-shift-processor.js', window.location.origin).href;
        
        
        await this.audioContext.audioWorklet.addModule(workletUrl);
        
        AudioWorkletPitchShifter.workletLoaded = true;
        
      } catch (error) {
        console.error('[AudioWorkletPitchShifter] Failed to load worklet:', error);
        AudioWorkletPitchShifter.workletLoadPromise = null;
        throw error;
      }
    })();
    
    return AudioWorkletPitchShifter.workletLoadPromise;
  }
  
  /**
   * Initialize the pitch shifter worklet node
   */
  async initialize(): Promise<void> {
    if (this.isReady) return;
    
    try {
      await this.loadWorklet();
      
      // Create the worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-shift-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2], // Stereo output
      });
      
      // Listen for ready message
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'ready') {
          
          this.isReady = true;
          
          // Apply any pending pitch
          if (this.pendingPitch !== null) {
            this.setPitch(this.pendingPitch);
            this.pendingPitch = null;
          }
        }
      };
      
      // Connect: input -> worklet -> output
      this.inputNode.connect(this.workletNode);
      this.workletNode.connect(this.outputNode);
      
      
    } catch (error) {
      console.error('[AudioWorkletPitchShifter] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Get the input node for connecting audio sources
   */
  getInputNode(): GainNode {
    return this.inputNode;
  }
  
  /**
   * Get the output node for connecting to destination
   */
  getOutputNode(): GainNode {
    return this.outputNode;
  }
  
  /**
   * Connect an audio source to this pitch shifter
   */
  connectSource(source: AudioNode): void {
    source.connect(this.inputNode);
  }
  
  /**
   * Connect output to a destination
   */
  connectDestination(destination: AudioNode): void {
    this.outputNode.connect(destination);
  }
  
  /**
   * Disconnect from all nodes
   */
  disconnect(): void {
    try {
      this.inputNode.disconnect();
      this.outputNode.disconnect();
      if (this.workletNode) {
        this.workletNode.disconnect();
      }
    } catch (e) {
      // Ignore disconnect errors
    }
  }
  
  /**
   * Set pitch in semitones (-12 to +12)
   */
  setPitch(semitones: number): void {
    const clamped = Math.max(-12, Math.min(12, semitones));
    this.pitchSemitones = clamped;
    
    if (!this.isReady || !this.workletNode) {
      // Store for later when ready
      this.pendingPitch = clamped;
      return;
    }
    
    this.workletNode.port.postMessage({
      type: 'setPitch',
      semitones: clamped,
    });
  }
  
  /**
   * Get current pitch in semitones
   */
  getPitch(): number {
    return this.pitchSemitones;
  }
  
  /**
   * Set grain size for quality/latency tradeoff
   * Larger = better quality but more latency
   */
  setGrainSize(size: 512 | 1024 | 2048 | 4096): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'setGrainSize',
      size,
    });
  }
  
  /**
   * Reset internal buffers (useful after seeking)
   */
  reset(): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.postMessage({
      type: 'reset',
    });
  }
  
  /**
   * Check if the shifter is ready
   */
  isInitialized(): boolean {
    return this.isReady;
  }
  
  /**
   * Bypass the pitch shifter (connect input directly to output)
   */
  bypass(enabled: boolean): void {
    if (enabled) {
      // Disconnect worklet, connect input directly to output
      try {
        if (this.workletNode) {
          this.inputNode.disconnect(this.workletNode);
          this.workletNode.disconnect(this.outputNode);
        }
        this.inputNode.connect(this.outputNode);
      } catch (e) {
        // Ignore errors
      }
    } else {
      // Reconnect through worklet
      try {
        this.inputNode.disconnect(this.outputNode);
        if (this.workletNode) {
          this.inputNode.connect(this.workletNode);
          this.workletNode.connect(this.outputNode);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.disconnect();
    
    if (this.workletNode) {
      this.workletNode.port.close();
      this.workletNode = null;
    }
    
    this.isReady = false;
    
  }
  
  /**
   * Check if AudioWorklet is supported in this browser
   */
  static isSupported(): boolean {
    return typeof AudioWorkletNode !== 'undefined' && 
           typeof AudioContext !== 'undefined' &&
           'audioWorklet' in AudioContext.prototype;
  }
}

/**
 * Create a per-track pitch shifter that can be inserted into the audio chain
 */
export async function createTrackPitchShifter(
  audioContext: AudioContext
): Promise<AudioWorkletPitchShifter | null> {
  if (!AudioWorkletPitchShifter.isSupported()) {
    console.warn('[createTrackPitchShifter] AudioWorklet not supported');
    return null;
  }
  
  const shifter = new AudioWorkletPitchShifter(audioContext);
  
  try {
    await shifter.initialize();
    return shifter;
  } catch (error) {
    console.error('[createTrackPitchShifter] Failed to create shifter:', error);
    return null;
  }
}
