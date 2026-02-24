/**
 * AudioWorklet-based Pitch Shift Processor v2
 * 
 * Uses improved Granular PSOLA synthesis with:
 * - Catmull-Rom cubic interpolation for high-quality resampling
 * - Smaller grain size (1024 samples) for lower latency
 * - Pre-filled output buffer to prevent underruns
 * - Post-resample windowing for smooth crossfades
 * - Gain-compensated overlap-add
 * 
 * Optimized for ±3 semitones with minimal artifacts.
 */

class PitchShiftProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Pitch ratio: 2^(semitones/12). 1.0 = no shift
    this.pitchRatio = 1.0;
    this.pitchSemitones = 0;
    
    // Optimized grain parameters for low latency + quality
    this.grainSize = 1024;  // ~23ms at 44.1kHz (reduced from 2048)
    this.hopSize = 256;     // 75% overlap for smooth transitions
    this.overlapFactor = this.grainSize / this.hopSize; // 4x overlap
    
    // Gain normalization for overlap-add
    this.normalization = 1.0 / Math.sqrt(this.overlapFactor);
    
    // Circular input buffer (4x grain size for safety)
    this.inputBuffer = new Float32Array(this.grainSize * 4);
    this.inputWritePos = 0;
    this.inputReadPos = 0;
    this.samplesAvailable = 0;
    
    // Output buffer for overlap-add (larger for pitch-down scenarios)
    this.outputBuffer = new Float32Array(this.grainSize * 8);
    this.outputWritePos = 0;
    this.outputReadPos = 0;
    this.outputSamplesAvailable = 0;
    
    // Pre-fill threshold - don't start output until buffer is primed
    this.minOutputSamples = this.grainSize;
    this.outputBufferReady = false;
    
    // Analysis window (Hann) - for extracting grains
    this.analysisWindow = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.analysisWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.grainSize - 1)));
    }
    
    // Synthesis window - created dynamically based on output grain size
    this.synthesisWindow = new Float32Array(this.grainSize * 2);
    this.updateSynthesisWindow(this.grainSize);
    
    // Grain buffers
    this.grainBuffer = new Float32Array(this.grainSize);
    this.resampledGrain = new Float32Array(this.grainSize * 2);
    
    // Phase tracking for grain scheduling
    this.inputPhase = 0;
    
    // Message handling for parameter updates
    this.port.onmessage = (event) => {
      if (event.data.type === 'setPitch') {
        this.pitchSemitones = event.data.semitones;
        this.pitchRatio = Math.pow(2, this.pitchSemitones / 12);
      } else if (event.data.type === 'setGrainSize') {
        this.updateGrainSize(event.data.size);
      } else if (event.data.type === 'reset') {
        this.reset();
      }
    };
    
    // Notify that processor is ready
    this.port.postMessage({ type: 'ready' });
  }
  
  /**
   * Create synthesis window for a given output grain size
   */
  updateSynthesisWindow(size) {
    for (let i = 0; i < size; i++) {
      this.synthesisWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
  }
  
  updateGrainSize(size) {
    const validSizes = [512, 1024, 2048, 4096];
    if (!validSizes.includes(size)) return;
    
    this.grainSize = size;
    this.hopSize = size / 4;
    this.overlapFactor = this.grainSize / this.hopSize;
    this.normalization = 1.0 / Math.sqrt(this.overlapFactor);
    this.minOutputSamples = this.grainSize;
    
    // Recreate buffers
    this.inputBuffer = new Float32Array(this.grainSize * 4);
    this.outputBuffer = new Float32Array(this.grainSize * 8);
    this.grainBuffer = new Float32Array(this.grainSize);
    this.resampledGrain = new Float32Array(this.grainSize * 2);
    
    // Recreate windows
    this.analysisWindow = new Float32Array(this.grainSize);
    for (let i = 0; i < this.grainSize; i++) {
      this.analysisWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.grainSize - 1)));
    }
    this.synthesisWindow = new Float32Array(this.grainSize * 2);
    this.updateSynthesisWindow(this.grainSize);
    
    this.reset();
  }
  
  reset() {
    this.inputBuffer.fill(0);
    this.outputBuffer.fill(0);
    this.inputWritePos = 0;
    this.inputReadPos = 0;
    this.samplesAvailable = 0;
    this.outputWritePos = 0;
    this.outputReadPos = 0;
    this.outputSamplesAvailable = 0;
    this.outputBufferReady = false;
    this.inputPhase = 0;
  }
  
  /**
   * Catmull-Rom cubic interpolation for high-quality resampling.
   * Much smoother than linear interpolation, reduces aliasing artifacts.
   */
  cubicInterpolate(y0, y1, y2, y3, t) {
    const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c = -0.5 * y0 + 0.5 * y2;
    const d = y1;
    return a * t * t * t + b * t * t + c * t + d;
  }
  
  /**
   * Resample a grain using cubic interpolation.
   * Returns the number of output samples.
   */
  resampleGrainCubic(input, output, inputLen, ratio) {
    const outputLen = Math.floor(inputLen / ratio);
    
    for (let i = 0; i < outputLen; i++) {
      const srcPos = i * ratio;
      const srcIndex = Math.floor(srcPos);
      const frac = srcPos - srcIndex;
      
      // Get 4 surrounding samples for cubic interpolation
      const i0 = Math.max(0, srcIndex - 1);
      const i1 = srcIndex;
      const i2 = Math.min(inputLen - 1, srcIndex + 1);
      const i3 = Math.min(inputLen - 1, srcIndex + 2);
      
      if (i1 < inputLen) {
        output[i] = this.cubicInterpolate(
          input[i0],
          input[i1],
          input[i2],
          input[i3],
          frac
        );
      } else {
        output[i] = 0;
      }
    }
    
    return outputLen;
  }
  
  /**
   * Process a single grain: extract, resample, window, overlap-add
   */
  processGrain() {
    const inBufLen = this.inputBuffer.length;
    const outBufLen = this.outputBuffer.length;
    
    // Step 1: Extract grain from input buffer (with analysis window)
    for (let i = 0; i < this.grainSize; i++) {
      const readPos = (this.inputReadPos + i) % inBufLen;
      this.grainBuffer[i] = this.inputBuffer[readPos] * this.analysisWindow[i];
    }
    
    // Advance input read position by analysis hop
    this.inputReadPos = (this.inputReadPos + this.hopSize) % inBufLen;
    this.samplesAvailable -= this.hopSize;
    
    // Step 2: Resample with cubic interpolation
    const resampledLen = this.resampleGrainCubic(
      this.grainBuffer,
      this.resampledGrain,
      this.grainSize,
      this.pitchRatio
    );
    
    // Step 3: Apply synthesis window to resampled grain
    // Update synthesis window if size changed significantly
    if (resampledLen > 0) {
      this.updateSynthesisWindow(resampledLen);
      for (let i = 0; i < resampledLen; i++) {
        this.resampledGrain[i] *= this.synthesisWindow[i] * this.normalization;
      }
    }
    
    // Step 4: Overlap-add to output buffer
    for (let i = 0; i < resampledLen; i++) {
      const writePos = (this.outputWritePos + i) % outBufLen;
      this.outputBuffer[writePos] += this.resampledGrain[i];
    }
    
    // Calculate synthesis hop size (adjusted for time-scale preservation)
    const synthesisHopSize = this.hopSize; // Keep time constant
    
    // Advance output write position
    this.outputWritePos = (this.outputWritePos + synthesisHopSize) % outBufLen;
    this.outputSamplesAvailable += synthesisHopSize;
    
    // Check if output buffer is primed
    if (!this.outputBufferReady && this.outputSamplesAvailable >= this.minOutputSamples) {
      this.outputBufferReady = true;
    }
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    
    // Handle no input
    if (!input || input.length === 0 || !input[0]) {
      return true;
    }
    
    const inputChannel = input[0];
    const outputChannel = output[0];
    const blockSize = inputChannel.length; // Usually 128 samples
    
    // If pitch ratio is 1 (no shift), pass through directly
    if (Math.abs(this.pitchRatio - 1.0) < 0.001) {
      for (let ch = 0; ch < output.length; ch++) {
        if (input[ch] && output[ch]) {
          output[ch].set(input[ch]);
        }
      }
      return true;
    }
    
    const inBufLen = this.inputBuffer.length;
    const outBufLen = this.outputBuffer.length;
    
    // Write input samples to circular buffer
    for (let i = 0; i < blockSize; i++) {
      this.inputBuffer[this.inputWritePos] = inputChannel[i];
      this.inputWritePos = (this.inputWritePos + 1) % inBufLen;
      this.samplesAvailable++;
    }
    
    // Process grains when we have enough input samples
    while (this.samplesAvailable >= this.grainSize) {
      this.processGrain();
    }
    
    // Read from output buffer (only when buffer is primed)
    for (let i = 0; i < blockSize; i++) {
      if (this.outputBufferReady && this.outputSamplesAvailable > 0) {
        outputChannel[i] = this.outputBuffer[this.outputReadPos];
        this.outputBuffer[this.outputReadPos] = 0; // Clear after reading
        this.outputReadPos = (this.outputReadPos + 1) % outBufLen;
        this.outputSamplesAvailable--;
      } else {
        // During initial buffer priming, output silence
        outputChannel[i] = 0;
      }
    }
    
    // Copy to other channels (stereo)
    for (let ch = 1; ch < output.length; ch++) {
      if (output[ch]) {
        output[ch].set(outputChannel);
      }
    }
    
    return true;
  }
}

registerProcessor('pitch-shift-processor', PitchShiftProcessor);
