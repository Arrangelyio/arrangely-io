/**
 * Updated Streaming Audio Cache with R2 Support
 * Supports both Supabase Storage (legacy) and Cloudflare R2 (new)
 * 
 * Encryption is handled by Electron main process:
 * - Writes: Data encrypted with AES-256-GCM before saving to disk
 * - Reads: Data decrypted after reading from disk
 * - Files stored as .enc in audio-library folder (persists after app close)
 */

import { r2AudioService, TrackUrls } from './r2AudioService';

declare global {
  interface Window {
    electron?: {
      streamingCache: {
        checkCacheExists: (songId: string, trackNumber: number) => Promise<{ exists: boolean; complete: boolean }>;
        writeStreamChunk: (songId: string, trackNumber: number, chunk: number[], isComplete: boolean, extension?: string) => Promise<{ success: boolean; error?: string }>;
        readTrack: (songId: string, trackNumber: number) => Promise<{ success: boolean; data?: number[]; error?: string }>;
        deleteTrack: (songId: string, trackNumber: number) => Promise<{ success: boolean; error?: string }>;
        clearSongCache: (songId: string) => Promise<{ success: boolean; error?: string }>;
        getCacheStats: () => Promise<{ success: boolean; songCount?: number; trackCount?: number; totalSize?: number; cachePath?: string; error?: string }>;
        writePeaks: (songId: string, trackNumber: number, peaks: number[]) => Promise<{ success: boolean; error?: string }>;
        readPeaks: (songId: string, trackNumber: number) => Promise<{ success: boolean; peaks?: number[]; error?: string }>;
      };
    };
  }
}

interface StreamProgress {
  trackIndex: number;
  loaded: number;
  total: number;
  percentage: number;
  status: 'downloading' | 'encrypting' | 'complete' | 'error';
}

interface CachedTrackInfo {
  exists: boolean;
  complete: boolean;
  filePath?: string | null;
}

export class StreamingAudioCache {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electron?.streamingCache;
    
    if (!this.isElectron) {
      console.warn('Electron streaming cache API not available');
    }
  }

  /**
   * Check if cache exists for a specific track
   */
  async checkEncryptedCache(songId: string, trackNumber: number): Promise<CachedTrackInfo> {
    if (!this.isElectron || !window.electron?.streamingCache) {
      return { exists: false, complete: false };
    }

    try {
      const result = await window.electron.streamingCache.checkCacheExists(songId, trackNumber);
      return result;
    } catch (error) {
      console.error('Failed to check cache:', error);
      return { exists: false, complete: false };
    }
  }

  /**
   * Load from R2 and cache locally (new optimized path)
   */
  async loadFromR2AndCache(
    songId: string,
    trackIndex: number,
    audioUrl: string,
    peaksUrl: string,
    onProgress?: (progress: StreamProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<{ audioBuffer: ArrayBuffer; peaks: number[] }> {
    // Check local cache first
    const cacheInfo = await this.checkEncryptedCache(songId, trackIndex);
    
    if (cacheInfo.exists && cacheInfo.complete) {
      
      
      // Load cached audio
      const audioBuffer = await this.loadCachedTrack(songId, trackIndex);
      
      // Load cached peaks (or fetch if not cached)
      let peaks: number[] = [];
      if (window.electron?.streamingCache?.readPeaks) {
        const peaksResult = await window.electron.streamingCache.readPeaks(songId, trackIndex);
        if (peaksResult.success && peaksResult.peaks) {
          peaks = peaksResult.peaks;
        }
      }
      
      // If no cached peaks, fetch from R2
      if (peaks.length === 0) {
        try {
          const peaksData = await r2AudioService.fetchPeaks(peaksUrl, `${songId}-${trackIndex}`);
          peaks = peaksData.peaks;
          
          // Cache peaks locally
          if (window.electron?.streamingCache?.writePeaks) {
            await window.electron.streamingCache.writePeaks(songId, trackIndex, peaks);
          }
        } catch (e) {
          console.warn('Failed to fetch peaks:', e);
        }
      }
      
      onProgress?.({
        trackIndex,
        loaded: audioBuffer.byteLength,
        total: audioBuffer.byteLength,
        percentage: 1,
        status: 'complete',
      });
      
      return { audioBuffer, peaks };
    }

    // Download from R2
    
    
    // Fetch peaks first (small, fast)
    let peaks: number[] = [];
    try {
      const peaksData = await r2AudioService.fetchPeaks(peaksUrl, `${songId}-${trackIndex}`);
      peaks = peaksData.peaks;
    } catch (e) {
      console.warn('Failed to fetch peaks:', e);
    }

    // Fetch audio
    const audioBuffer = await r2AudioService.fetchAudio(
      audioUrl,
      (loaded, total) => {
        onProgress?.({
          trackIndex,
          loaded,
          total,
          percentage: loaded / total,
          status: 'downloading',
        });
      },
      abortSignal
    );

    // Cache locally
    if (this.isElectron && window.electron?.streamingCache) {
      try {
        // Extract extension from URL
        let ext = 'm4a';
        try {
          const urlPath = new URL(audioUrl).pathname;
          const extractedExt = urlPath.split('.').pop()?.toLowerCase();
          if (extractedExt && ['wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac'].includes(extractedExt)) {
            ext = extractedExt;
          }
        } catch {}

        
        
        // Write audio to cache
        const audioData = new Uint8Array(audioBuffer);
        const writeResult = await window.electron.streamingCache.writeStreamChunk(
          songId,
          trackIndex,
          Array.from(audioData),
          true,
          ext
        );

        if (!writeResult.success) {
          console.error(`[StreamingCache] Failed to write to cache: ${writeResult.error}`);
        } else {
          
        }

        // Write peaks to cache
        if (peaks.length > 0 && window.electron?.streamingCache?.writePeaks) {
          await window.electron.streamingCache.writePeaks(songId, trackIndex, peaks);
        }
      } catch (e) {
        console.error('[StreamingCache] Failed to cache locally:', e);
      }
    }

    onProgress?.({
      trackIndex,
      loaded: audioBuffer.byteLength,
      total: audioBuffer.byteLength,
      percentage: 1,
      status: 'complete',
    });

    return { audioBuffer, peaks };
  }

  /**
   * Stream track from URL (legacy Supabase path)
   */
  async streamTrackAndEncrypt(
    url: string,
    songId: string,
    trackNumber: number,
    onProgress?: (progress: StreamProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer> {
    try {
      
      
      const response = await fetch(url, { signal: abortSignal });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const reader = response.body?.getReader();
      
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        if (abortSignal?.aborted) {
          reader.cancel();
          throw new DOMException('Download aborted', 'AbortError');
        }

        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        const percentage = contentLength > 0 ? (receivedLength / contentLength) : 0;

        if (onProgress) {
          onProgress({
            trackIndex: trackNumber,
            loaded: receivedLength,
            total: contentLength,
            percentage,
            status: 'downloading'
          });
        }
      }

      // Combine all chunks
      const fullArray = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        fullArray.set(chunk, position);
        position += chunk.length;
      }

      const audioData = fullArray.buffer;

      // Save to disk
      if (this.isElectron && window.electron?.streamingCache) {
        let fileExtension = 'bin';

        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const ext = pathname.split('.').pop()?.toLowerCase();
          if (ext && ['wav', 'mp3', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
            fileExtension = ext;
          }
        } catch {}

        const writeResult = await window.electron.streamingCache.writeStreamChunk(
          songId,
          trackNumber,
          Array.from(fullArray),
          true,
          fileExtension
        );

        if (!writeResult.success) {
          console.error(`[StreamingCache] Write failed:`, writeResult.error);
        }

        if (onProgress) {
          onProgress({
            trackIndex: trackNumber,
            loaded: receivedLength,
            total: contentLength,
            percentage: 1,
            status: 'complete'
          });
        }
      }

      return audioData;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      console.error('Stream failed:', error);
      throw error;
    }
  }

  /**
   * Load cached track from disk (decryption handled by main process)
   */
  async loadCachedTrack(songId: string, trackNumber: number): Promise<ArrayBuffer> {
    if (!this.isElectron || !window.electron?.streamingCache) {
      throw new Error('Electron cache not available');
    }

    const result = await window.electron.streamingCache.readTrack(songId, trackNumber);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to read cached track');
    }

    // Data is already decrypted by main process
    const uint8Array = new Uint8Array(result.data);
    return uint8Array.buffer;
  }

  /**
   * Load track from cache or stream from network
   */
  async loadOrStream(
    url: string,
    songId: string,
    trackNumber: number,
    onProgress?: (progress: StreamProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer> {
    // Check if cached
    const cacheInfo = await this.checkEncryptedCache(songId, trackNumber);

    if (cacheInfo.exists && cacheInfo.complete) {
      
      
      if (onProgress) {
        onProgress({
          trackIndex: trackNumber,
          loaded: 0,
          total: 0,
          percentage: 1,
          status: 'complete'
        });
      }

      try {
        return await this.loadCachedTrack(songId, trackNumber);
      } catch (error) {
        console.error(`[StreamingCache] Failed to load cached track, re-downloading:`, error);
      }
    }

    return await this.streamTrackAndEncrypt(url, songId, trackNumber, onProgress, abortSignal);
  }

  /**
   * Delete specific track from cache
   */
  async deleteTrack(songId: string, trackNumber: number): Promise<void> {
    if (!this.isElectron || !window.electron?.streamingCache) return;
    await window.electron.streamingCache.deleteTrack(songId, trackNumber);
  }

  /**
   * Clear all cached tracks for a song
   */
  async clearSongCache(songId: string): Promise<void> {
    if (!this.isElectron || !window.electron?.streamingCache) return;
    await window.electron.streamingCache.clearSongCache(songId);
  }
}

export const streamingCache = new StreamingAudioCache();
