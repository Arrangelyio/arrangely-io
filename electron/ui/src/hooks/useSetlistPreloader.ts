/**
 * Setlist Preloader Hook
 * Preloads all songs in a setlist asynchronously for smoother playback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { r2AudioService } from '../lib/r2AudioService';
import { streamingCache } from '../lib/streamingAudioCache';

export interface SongLoadStatus {
  songId: string;
  sequencerId: string;
  title: string;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  progress: number;
  trackCount: number;
  loadedTracks: number;
}

export interface UseSetlistPreloaderResult {
  songStatuses: SongLoadStatus[];
  isPreloading: boolean;
  isComplete: boolean;
  overallProgress: number;
  preloadSong: (sequencer: any) => Promise<void>;
  preloadAll: () => Promise<void>;
}

export function useSetlistPreloader(
  songs: { id: string; position: number; sequencer: any }[]
): UseSetlistPreloaderResult {
  const [songStatuses, setSongStatuses] = useState<SongLoadStatus[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize song statuses when songs change
  useEffect(() => {
    const initialStatuses: SongLoadStatus[] = songs.map(song => ({
      songId: song.sequencer?.song_id || song.id,
      sequencerId: song.sequencer?.id || song.id,
      title: song.sequencer?.title || song.sequencer?.songs?.title || 'Unknown',
      status: 'pending',
      progress: 0,
      trackCount: song.sequencer?.tracks?.length || 0,
      loadedTracks: 0,
    }));
    setSongStatuses(initialStatuses);
  }, [songs]);

  // Check which songs are already cached
  useEffect(() => {
    const checkCachedSongs = async () => {
      const updatedStatuses = await Promise.all(
        songs.map(async (song) => {
          const songId = song.sequencer?.song_id;
          const trackCount = song.sequencer?.tracks?.length || 0;
          
          if (!songId || trackCount === 0) {
            return {
              songId: song.sequencer?.song_id || song.id,
              sequencerId: song.sequencer?.id || song.id,
              title: song.sequencer?.title || song.sequencer?.songs?.title || 'Unknown',
              status: 'pending' as const,
              progress: 0,
              trackCount,
              loadedTracks: 0,
            };
          }

          // Check cache for each track
          let loadedTracks = 0;
          for (let i = 0; i < trackCount; i++) {
            const cacheInfo = await streamingCache.checkEncryptedCache(songId, i);
            if (cacheInfo.exists && cacheInfo.complete) {
              loadedTracks++;
            }
          }

          const isFullyLoaded = loadedTracks === trackCount;
          
          return {
            songId,
            sequencerId: song.sequencer?.id || song.id,
            title: song.sequencer?.title || song.sequencer?.songs?.title || 'Unknown',
            status: isFullyLoaded ? 'loaded' as const : 'pending' as const,
            progress: isFullyLoaded ? 100 : (loadedTracks / trackCount) * 100,
            trackCount,
            loadedTracks,
          };
        })
      );
      
      setSongStatuses(updatedStatuses);
    };

    if (songs.length > 0) {
      checkCachedSongs();
    }
  }, [songs]);

  const preloadSong = useCallback(async (sequencer: any) => {
    if (!sequencer?.song_id || !sequencer?.tracks?.length) return;

    const songId = sequencer.song_id;
    const trackCount = sequencer.tracks.length;

    // Update status to loading
    setSongStatuses(prev => prev.map(s => 
      s.songId === songId ? { ...s, status: 'loading' as const } : s
    ));

    try {
      // Get R2 URLs for all tracks
      const extensions = sequencer.tracks.map((track: any) => {
        const ext = track.filename?.split('.').pop()?.toLowerCase();
        return ext || 'wav';
      });

      const r2Urls = await r2AudioService.getTrackUrls(songId, trackCount, extensions);

      // Download each track
      for (let i = 0; i < trackCount; i++) {
        const urlData = r2Urls.find(u => u.trackIndex === i);
        if (!urlData) continue;

        // Check if already cached
        const cacheInfo = await streamingCache.checkEncryptedCache(songId, i);
        if (cacheInfo.exists && cacheInfo.complete) {
          setSongStatuses(prev => prev.map(s => 
            s.songId === songId ? { 
              ...s, 
              loadedTracks: s.loadedTracks + 1,
              progress: ((s.loadedTracks + 1) / s.trackCount) * 100
            } : s
          ));
          continue;
        }

        // Download and cache
        await streamingCache.loadFromR2AndCache(
          songId,
          i,
          urlData.audioUrl,
          urlData.peaksUrl,
          (progress) => {
            setSongStatuses(prev => prev.map(s => {
              if (s.songId !== songId) return s;
              const baseProgress = (s.loadedTracks / s.trackCount) * 100;
              const trackProgress = (progress.percentage * 100) / s.trackCount;
              return { ...s, progress: baseProgress + trackProgress };
            }));
          },
          abortControllerRef.current?.signal
        );

        // Update loaded tracks count
        setSongStatuses(prev => prev.map(s => 
          s.songId === songId ? { 
            ...s, 
            loadedTracks: s.loadedTracks + 1,
            progress: ((s.loadedTracks + 1) / s.trackCount) * 100
          } : s
        ));
      }

      // Mark as loaded
      setSongStatuses(prev => prev.map(s => 
        s.songId === songId ? { ...s, status: 'loaded' as const, progress: 100 } : s
      ));
    } catch (error) {
      console.error(`[SetlistPreloader] Error preloading song ${songId}:`, error);
      setSongStatuses(prev => prev.map(s => 
        s.songId === songId ? { ...s, status: 'error' as const } : s
      ));
    }
  }, []);

  const preloadAll = useCallback(async () => {
    setIsPreloading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Preload songs in order (first song has priority)
      for (const song of songs) {
        if (abortControllerRef.current?.signal.aborted) break;
        
        const status = songStatuses.find(s => s.songId === song.sequencer?.song_id);
        if (status?.status === 'loaded') continue;

        await preloadSong(song.sequencer);
      }
    } finally {
      setIsPreloading(false);
    }
  }, [songs, songStatuses, preloadSong]);

  // Calculate overall progress and completion
  const overallProgress = songStatuses.length > 0
    ? songStatuses.reduce((sum, s) => sum + s.progress, 0) / songStatuses.length
    : 0;

  const isComplete = songStatuses.length > 0 && 
    songStatuses.every(s => s.status === 'loaded');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    songStatuses,
    isPreloading,
    isComplete,
    overallProgress,
    preloadSong,
    preloadAll,
  };
}
