// Singleton queue for sequential audio decoding to prevent memory crashes

type DecodeTask = {
  songId: string;
  trackIndex: number;
  resolve: (buffer: AudioBuffer) => void;
  reject: (error: Error) => void;
};

class AudioDecoderQueue {
  private queue: DecodeTask[] = [];
  private isProcessing = false;
  private audioContext: AudioContext | null = null;
  private decodedCount = 0;

  private getAudioContext(): AudioContext {
    // Create fresh context every few decodes to prevent memory buildup
    if (!this.audioContext || this.audioContext.state === 'closed' || this.decodedCount >= 3) {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try { this.audioContext.close(); } catch (e) {}
      }
      this.audioContext = new AudioContext();
      this.decodedCount = 0;
    }
    return this.audioContext;
  }

  async decode(songId: string, trackIndex: number): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.queue.push({ songId, trackIndex, resolve, reject });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift()!;

    try {
      
      
      // Read file via IPC
      const result = await window.electron.streamingCache.readTrack(task.songId, task.trackIndex);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read track');
      }

      // Convert to ArrayBuffer - create a copy and clear original
      const uint8Array = new Uint8Array(result.data);
      const arrayBuffer = uint8Array.buffer.slice(0);
      

      // Clear the IPC result to help GC
      result.data = null as any;

      // Decode audio
      const audioContext = this.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      this.decodedCount++;
      
      
      task.resolve(audioBuffer);
    } catch (error) {
      console.warn(`[DecoderQueue] Error:`, error);
      task.reject(error as Error);
    } finally {
      this.isProcessing = false;
      // Longer delay between decodes to allow GC to run
      setTimeout(() => this.processNext(), 500);
    }
  }

  clear() {
    this.queue = [];
  }
}

export const audioDecoderQueue = new AudioDecoderQueue();
