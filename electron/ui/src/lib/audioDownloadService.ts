/**
 * Audio Download Service
 * Manages pre-downloading and caching of audio tracks for offline use
 */

import { streamingCache } from './streamingAudioCache';
import { supabase } from './supabase';
import { r2AudioService } from './r2AudioService';

export interface DownloadProgress {
  songId: string;
  totalTracks: number;
  downloadedTracks: number;
  currentTrackIndex: number;
  currentTrackProgress: number;
  status: 'idle' | 'downloading' | 'complete' | 'error';
  error?: string;
}

export interface TrackDownloadStatus {
  trackIndex: number;
  status: 'pending' | 'downloading' | 'cached' | 'error';
  progress: number;
  cached: boolean;
}

class AudioDownloadService {
  private downloadQueue: Map<string, AbortController> = new Map();
  private progressCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

  /**
   * Check cache status for all tracks of a sequencer
   */
  async checkSongCacheStatus(sequencer: any): Promise<TrackDownloadStatus[]> {
    const tracks = sequencer.tracks || [];
    const songId = sequencer.song_id;

    

    const statuses: TrackDownloadStatus[] = await Promise.all(
      tracks.map(async (track: any, index: number) => {
        const cacheInfo = await streamingCache.checkEncryptedCache(songId, index);
        
        return {
          trackIndex: index,
          status: cacheInfo.complete ? 'cached' : 'pending',
          progress: cacheInfo.complete ? 100 : 0,
          cached: cacheInfo.complete
        } as TrackDownloadStatus;
      })
    );

    return statuses;
  }

  /**
   * Check if all tracks for a song are cached
   */
  async isSongFullyCached(sequencer: any): Promise<boolean> {
    const statuses = await this.checkSongCacheStatus(sequencer);
    return statuses.every(s => s.cached);
  }

  /**
   * Pre-download all tracks for a sequencer
   */
  async downloadSong(
    sequencer: any,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const songId = sequencer.song_id;
    const tracks = sequencer.tracks || [];

    // Cancel any existing download for this song
    if (this.downloadQueue.has(songId)) {
      this.downloadQueue.get(songId)?.abort();
    }

    const abortController = new AbortController();
    this.downloadQueue.set(songId, abortController);

    if (onProgress) {
      this.progressCallbacks.set(songId, onProgress);
    }

    const progress: DownloadProgress = {
      songId,
      totalTracks: tracks.length,
      downloadedTracks: 0,
      currentTrackIndex: 0,
      currentTrackProgress: 0,
      status: 'downloading'
    };

    try {
      onProgress?.(progress);
      
      // Check if tracks use R2 storage
      const hasR2Tracks = tracks.some((track: any) => track.r2_audio_key);
      let r2Urls: { trackIndex: number; audioUrl: string; peaksUrl: string }[] = [];
      
      if (hasR2Tracks) {
        
        try {
          const extensions = tracks.map((track: any) => {
            const ext = track.filename?.split('.').pop()?.toLowerCase();
            return ext || 'wav';
          });
          
          r2Urls = await r2AudioService.getTrackUrls(songId, tracks.length, extensions);
          
        } catch (error) {
          console.error('[AudioDownloadService] Failed to get R2 URLs, falling back to Supabase:', error);
        }
      }

      for (let i = 0; i < tracks.length; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const track = tracks[i];
        progress.currentTrackIndex = i;

        // Check if already cached
        const cacheInfo = await streamingCache.checkEncryptedCache(songId, i);
        if (cacheInfo.complete) {
          
          progress.downloadedTracks++;
          progress.currentTrackProgress = 100;
          onProgress?.(progress);
          continue;
        }

        // Build track URL - use R2 if available
        let publicUrl: string;
        const r2UrlData = r2Urls.find(u => u.trackIndex === i);
        
        if (r2UrlData && track.r2_audio_key) {
          publicUrl = r2UrlData.audioUrl;
          
        } else {
          const filePath = `${sequencer.storage_folder_path}/${track.filename}`;
          const { data } = supabase.storage
            .from('sequencer-files')
            .getPublicUrl(filePath);
          publicUrl = data.publicUrl;
          
        }

        // Download and cache track
        await streamingCache.streamTrackAndEncrypt(
          publicUrl,
          songId,
          i,
          (trackProgress) => {
            progress.currentTrackProgress = Math.floor(trackProgress.percentage * 100);
            onProgress?.(progress);
          }
        );

        progress.downloadedTracks++;
        progress.currentTrackProgress = 100;
        onProgress?.(progress);
      }

      progress.status = 'complete';
      onProgress?.(progress);
    } catch (error) {
      console.error('[Download] Error downloading song:', error);
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Download failed';
      onProgress?.(progress);
      throw error;
    } finally {
      this.downloadQueue.delete(songId);
      this.progressCallbacks.delete(songId);
    }
  }

  /**
   * Cancel an ongoing download
   */
  cancelDownload(songId: string): void {
    const controller = this.downloadQueue.get(songId);
    if (controller) {
      controller.abort();
      this.downloadQueue.delete(songId);
      this.progressCallbacks.delete(songId);
    }
  }

  /**
   * Check if a song is currently downloading
   */
  isDownloading(songId: string): boolean {
    return this.downloadQueue.has(songId);
  }

  /**
   * Clear cached tracks for a song
   */
  async clearSongCache(songId: string): Promise<void> {
    await streamingCache.clearSongCache(songId);
  }

  /**
   * Get cache statistics including storage location
   * Note: This reads directly from disk via Electron IPC
   */
  async getCacheInfo(): Promise<{ 
    songCount: number; 
    trackCount: number; 
    totalSize: number; 
    cachePath: string;
  }> {
    if (typeof window !== 'undefined' && window.electron?.streamingCache?.getCacheStats) {
      try {
        
        const stats = await window.electron.streamingCache.getCacheStats();
        
        
        if (stats.success) {
          return {
            songCount: stats.songCount || 0,
            trackCount: stats.trackCount || 0,
            totalSize: stats.totalSize || 0,
            cachePath: stats.cachePath || ''
          };
        } else {
          console.error('[AudioDownloadService] Cache stats failed:', stats.error);
        }
      } catch (error) {
        console.error('[AudioDownloadService] Failed to get cache stats:', error);
      }
    } else {
      
    }
    return { songCount: 0, trackCount: 0, totalSize: 0, cachePath: '' };
  }
}

export const audioDownloadService = new AudioDownloadService();
