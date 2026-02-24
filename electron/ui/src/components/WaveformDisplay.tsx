import { useEffect, useRef, useCallback, memo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { audioDecoderQueue } from '../lib/audioDecoderQueue';

interface WaveformDisplayProps {
  url: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  songId?: string;
  trackIndex?: number;
}

// Memoized to prevent unnecessary re-renders
const WaveformDisplay = memo(function WaveformDisplay({ 
  url, 
  currentTime, 
  duration, 
  onSeek, 
  songId, 
  trackIndex = 0 
}: WaveformDisplayProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const isDestroyedRef = useRef(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!waveformRef.current || loadingRef.current) return;

    isDestroyedRef.current = false;
    loadingRef.current = true;

    // Create WaveSurfer with macOS-optimized settings
    wavesurferRef.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'hsl(215, 20%, 65%)',
      progressColor: 'transparent',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      interact: true,
      // macOS optimizations: reduce pixel ratio for less GPU work
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      // Reduce minPxPerSec to limit canvas redraws
      minPxPerSec: 50,
      // Disable auto-scroll to prevent layout thrashing
      autoScroll: false,
      // Use backend that's more efficient on macOS
      backend: 'WebAudio',
    });

    // Handle WaveSurfer errors gracefully - NO console.log in production
    wavesurferRef.current.on('error', (error: any) => {
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('aborted') || error?.name === 'AbortError') {
        return;
      }
      // Only warn in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Waveform] Error:', error);
      }
    });

    // Load audio from local cache using sequential decoder queue
    const loadAudio = async () => {
      if (isDestroyedRef.current || !wavesurferRef.current) return;

      try {
        // Load from local cache in Electron using queue
        if (songId && typeof window !== 'undefined' && window.electron?.streamingCache) {
          const { streamingCache } = await import('../lib/streamingAudioCache');
          const cacheInfo = await streamingCache.checkEncryptedCache(songId, trackIndex);
          
          if (isDestroyedRef.current) return;
          
          if (cacheInfo.exists && cacheInfo.complete) {
            // Use queue for sequential decoding (prevents memory crash)
            const audioBuffer = await audioDecoderQueue.decode(songId, trackIndex);
            
            if (isDestroyedRef.current || !wavesurferRef.current) return;
            
            wavesurferRef.current.loadDecodedBuffer(audioBuffer);
            loadingRef.current = false;
            return;
          }
          
          loadingRef.current = false;
          return;
        }

        // Non-Electron: load from URL
        if (!isDestroyedRef.current && wavesurferRef.current) {
          await wavesurferRef.current.load(url);
        }
        loadingRef.current = false;
      } catch (error: any) {
        loadingRef.current = false;
        const errorMessage = error?.message || String(error);
        if (
          error?.name === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('abort')
        ) {
          return;
        }
      }
    };

    loadAudio().catch(() => {
      loadingRef.current = false;
    });

    return () => {
      isDestroyedRef.current = true;
      loadingRef.current = false;
      
      // Destroy WaveSurfer safely
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (e) {}
        wavesurferRef.current = null;
      }
    };
  }, [url, songId, trackIndex]);

  // Memoized click handler to prevent recreation
  const handleClick = useCallback((progress: number) => {
    onSeek(progress * duration);
  }, [duration, onSeek]);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    wavesurferRef.current.on('click', handleClick);

    return () => {
      wavesurferRef.current?.un('click', handleClick);
    };
  }, [handleClick]);

  return (
    <div
      ref={waveformRef}
      className="cursor-pointer"
      style={{
        // macOS GPU layer optimization - force compositing
        willChange: 'transform',
        // Contain layout/paint to this element only
        contain: 'layout paint',
        // Prevent subpixel antialiasing issues on macOS
        WebkitFontSmoothing: 'antialiased',
      }}
    />
  );
});

export default WaveformDisplay;
