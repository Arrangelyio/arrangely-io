/**
 * R2 Audio Service
 * Handles fetching audio and peaks from Cloudflare R2 via CDN
 * Supports parallel fetch, precomputed peaks, and local caching
 */

import { supabase } from './supabase';

export interface TrackUrls {
  trackIndex: number;
  audioUrl: string;
  peaksUrl: string;
}

export interface PeaksData {
  peaks: number[];
  trackName: string;
  duration: number;
  generatedAt: string;
}

export interface R2TrackData {
  trackIndex: number;
  audioBuffer: ArrayBuffer;
  peaks: number[];
  trackName: string;
  duration: number;
}

class R2AudioService {
  private urlCache: Map<string, TrackUrls[]> = new Map();
  private peaksCache: Map<string, PeaksData> = new Map();
  
  /**
   * Get signed URLs for all tracks of a song
   */
  async getTrackUrls(songId: string, trackCount: number, extensions?: string[]): Promise<TrackUrls[]> {
    const cacheKey = `${songId}-${trackCount}`;
    
    // Check cache first
    const cached = this.urlCache.get(cacheKey);
    if (cached) {
      
      return cached;
    }

    

    try {
      const { data, error } = await supabase.functions.invoke('get-r2-url', {
        body: {
          action: 'batch',
          songId,
          trackCount,
          extensions,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to get R2 URLs');

      const urls = data.urls as TrackUrls[];
      
      // Cache for 30 minutes (URLs expire in 1 hour)
      this.urlCache.set(cacheKey, urls);
      setTimeout(() => this.urlCache.delete(cacheKey), 30 * 60 * 1000);

      return urls;
    } catch (error) {
      console.error('[R2Audio] Error getting track URLs:', error);
      throw error;
    }
  }

  /**
   * Fetch precomputed peaks for a track (fast, small JSON)
   * Checks local Electron cache first before fetching from R2
   */
  async fetchPeaks(peaksUrl: string, cacheKey: string): Promise<PeaksData> {
    // Check in-memory cache
    const cached = this.peaksCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check local Electron disk cache first
    if (typeof window !== 'undefined' && window.electron?.streamingCache?.readPeaks) {
      const [songId, trackIndexStr] = cacheKey.split('-');
      const trackIndex = parseInt(trackIndexStr, 10);
      
      if (songId && !isNaN(trackIndex)) {
        try {
          const localResult = await window.electron.streamingCache.readPeaks(songId, trackIndex);
          if (localResult.success && localResult.peaks && localResult.peaks.length > 0) {
            
            const peaksData: PeaksData = {
              peaks: localResult.peaks,
              trackName: `Track ${trackIndex}`,
              duration: 0,
              generatedAt: '',
            };
            this.peaksCache.set(cacheKey, peaksData);
            return peaksData;
          }
        } catch (e) {
          
        }
      }
    }

    

    const response = await fetch(peaksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch peaks: ${response.status}`);
    }

    const peaksData = await response.json() as PeaksData;
    
    // Cache peaks in memory (they never change)
    this.peaksCache.set(cacheKey, peaksData);

    // Also cache to local disk for future sessions
    if (typeof window !== 'undefined' && window.electron?.streamingCache?.writePeaks) {
      const [songId, trackIndexStr] = cacheKey.split('-');
      const trackIndex = parseInt(trackIndexStr, 10);
      if (songId && !isNaN(trackIndex)) {
        window.electron.streamingCache.writePeaks(songId, trackIndex, peaksData.peaks).catch(() => {});
      }
    }

    return peaksData;
  }

  /**
   * Fetch audio buffer from R2 CDN
   */
  async fetchAudio(
    audioUrl: string, 
    onProgress?: (loaded: number, total: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ArrayBuffer> {
    

    const response = await fetch(audioUrl, { signal: abortSignal });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const reader = response.body?.getReader();
    
    if (!reader) {
      // Fallback for browsers that don't support streaming
      return await response.arrayBuffer();
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

      if (onProgress && contentLength > 0) {
        onProgress(receivedLength, contentLength);
      }
    }

    // Combine chunks
    const audioBuffer = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      audioBuffer.set(chunk, position);
      position += chunk.length;
    }

    return audioBuffer.buffer;
  }

  /**
   * Parallel fetch all tracks with peaks (optimized loading)
   */
  async fetchAllTracks(
    songId: string,
    trackCount: number,
    extensions?: string[],
    onTrackProgress?: (trackIndex: number, status: 'peaks' | 'audio' | 'complete', progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<R2TrackData[]> {
    

    // Get all URLs first
    const urls = await this.getTrackUrls(songId, trackCount, extensions);

    // Fetch all peaks in parallel (small JSONs, very fast)
    
    const peaksResults = await Promise.all(
      urls.map(async (url) => {
        onTrackProgress?.(url.trackIndex, 'peaks', 0);
        try {
          const peaks = await this.fetchPeaks(url.peaksUrl, `${songId}-${url.trackIndex}`);
          onTrackProgress?.(url.trackIndex, 'peaks', 100);
          return { trackIndex: url.trackIndex, peaks };
        } catch (error) {
          console.warn(`[R2Audio] Failed to fetch peaks for track ${url.trackIndex}:`, error);
          return { trackIndex: url.trackIndex, peaks: null };
        }
      })
    );

    // Fetch all audio in parallel (larger files, CDN-cached)
    
    const audioResults = await Promise.all(
      urls.map(async (url) => {
        onTrackProgress?.(url.trackIndex, 'audio', 0);
        try {
          const audioBuffer = await this.fetchAudio(
            url.audioUrl,
            (loaded, total) => {
              const progress = Math.floor((loaded / total) * 100);
              onTrackProgress?.(url.trackIndex, 'audio', progress);
            },
            abortSignal
          );
          onTrackProgress?.(url.trackIndex, 'complete', 100);
          return { trackIndex: url.trackIndex, audioBuffer };
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          console.error(`[R2Audio] Failed to fetch audio for track ${url.trackIndex}:`, error);
          return { trackIndex: url.trackIndex, audioBuffer: null };
        }
      })
    );

    // Combine results
    const tracks: R2TrackData[] = [];
    for (let i = 0; i < trackCount; i++) {
      const peaksResult = peaksResults.find(p => p.trackIndex === i);
      const audioResult = audioResults.find(a => a.trackIndex === i);

      if (audioResult?.audioBuffer) {
        tracks.push({
          trackIndex: i,
          audioBuffer: audioResult.audioBuffer,
          peaks: peaksResult?.peaks?.peaks || [],
          trackName: peaksResult?.peaks?.trackName || `Track ${i}`,
          duration: peaksResult?.peaks?.duration || 0,
        });
      }
    }

    
    return tracks;
  }

  /**
   * Clear URL cache (useful when URLs might have expired)
   */
  clearCache() {
    this.urlCache.clear();
  }
}

export const r2AudioService = new R2AudioService();
