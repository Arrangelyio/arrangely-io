/**
 * Filesystem-based storage for encrypted audio files
 * Stores encrypted audio files on Windows/macOS disk via Electron
 */

import { encryptAudio, decryptAudio } from './audioEncryption';

// Type declaration for Electron API
declare global {
  interface Window {
    electron?: {
      fs: {
        writeEncryptedAudio: (url: string, encryptedData: number[]) => Promise<{ success: boolean; filepath?: string; error?: string }>;
        readEncryptedAudio: (url: string) => Promise<{ success: boolean; data?: number[]; notFound?: boolean; error?: string }>;
        checkAudioExists: (url: string) => Promise<{ exists: boolean }>;
        deleteAudio: (url: string) => Promise<{ success: boolean; error?: string }>;
        clearAudioCache: () => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
      };
    };
  }
}

class AudioCacheFS {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== 'undefined' && !!window.electron?.fs;
    
    if (!this.isElectron) {
      console.warn('Electron filesystem API not available. Audio caching will not work.');
    }
  }

  /**
   * Download, encrypt, and cache audio file to disk
   */
  /**
   * Download, encrypt, and cache audio file to disk
   */
  async cacheAudio(url: string, audioData: ArrayBuffer): Promise<void> {
    if (!this.isElectron || !window.electron?.fs) {
      console.warn('Cannot cache audio: Electron FS not available');
      return;
    }

    try {
      
      const encryptedData = await encryptAudio(audioData);
      
      
      // For large files, use chunking to avoid IPC limits
      const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
      const uint8Array = new Uint8Array(encryptedData);
      
      if (encryptedData.byteLength > CHUNK_SIZE) {
        
        
        // Write in chunks - let main process handle filepath construction
        const totalChunks = Math.ceil(uint8Array.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, uint8Array.length);
          const chunk = Array.from(uint8Array.slice(start, end));
          
          const result = await (window.electron.fs as any).writeEncryptedAudioChunk(
            url,
            chunk, 
            i === 0 // isFirstChunk
          );
          
          if (!result.success) {
            throw new Error(result.error || `Failed to write chunk ${i}`);
          }
          
          
        }
        
        
      } else {
        // Small file - send directly
        const dataArray = Array.from(uint8Array);
        
        const result = await window.electron.fs.writeEncryptedAudio(url, dataArray);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to write encrypted audio to disk');
        }
        
        
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        
        return;
      }
      console.error('[Cache] Failed to cache audio:', error);
      // Don't throw - caching is not critical
    }
  }

  private getFilenameFromUrl(url: string): string {
    // Simple hash of URL for filename
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${Math.abs(hash).toString(16)}.encrypted`;
  }

  /**
   * Retrieve and decrypt cached audio from disk
   * Returns null if not cached
   */
  async getCachedAudio(url: string): Promise<ArrayBuffer | null> {
    if (!this.isElectron || !window.electron?.fs) {
      return null;
    }

    try {
      const result = await window.electron.fs.readEncryptedAudio(url);
      
      if (!result.success) {
        if (result.notFound) {
          return null;
        }
        throw new Error(result.error || 'Failed to read encrypted audio from disk');
      }

      if (!result.data || result.data.length === 0) {
        console.warn('Empty data received from cache');
        return null;
      }

      

      // Convert number array to ArrayBuffer properly
      const uint8Array = Uint8Array.from(result.data);
      const encryptedData = uint8Array.buffer.slice(
        uint8Array.byteOffset, 
        uint8Array.byteOffset + uint8Array.byteLength
      );
      
      
      
      // Decrypt in memory only - never write to disk
      const decrypted = await decryptAudio(encryptedData);
      
      
      
      return decrypted;
    } catch (error) {
      console.error('Failed to get cached audio:', error);
      return null;
    }
  }

  /**
   * Check if audio is cached on disk
   */
  async isCached(url: string): Promise<boolean> {
    if (!this.isElectron || !window.electron?.fs) {
      return false;
    }

    try {
      const result = await window.electron.fs.checkAudioExists(url);
      return result.exists;
    } catch (error) {
      console.error('Failed to check if audio is cached:', error);
      return false;
    }
  }

  /**
   * Delete a specific cached audio file
   */
  async deleteAudio(url: string): Promise<void> {
    if (!this.isElectron || !window.electron?.fs) {
      return;
    }

    try {
      const result = await window.electron.fs.deleteAudio(url);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete audio from disk');
      }
      
      
    } catch (error) {
      console.error('Failed to delete audio:', error);
      throw error;
    }
  }

  /**
   * Clear all cached audio files from disk
   */
  async clearCache(): Promise<void> {
    if (!this.isElectron || !window.electron?.fs) {
      return;
    }

    try {
      const result = await window.electron.fs.clearAudioCache();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear audio cache');
      }
      
      
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }
}

export const audioCache = new AudioCacheFS();
