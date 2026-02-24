import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface YouTubeAudioCaptureProps {
  youtubePlayer: any;
  isPlaying: boolean;
  onAudioData: (audioData: Float32Array) => void;
  enabled: boolean;
}

const YouTubeAudioCapture = ({ 
  youtubePlayer, 
  isPlaying, 
  onAudioData, 
  enabled 
}: YouTubeAudioCaptureProps) => {
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const processAudio = useCallback(() => {
    if (!analyzerRef.current || !enabled) return;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const audioData = new Float32Array(bufferLength);
    analyzerRef.current.getFloatFrequencyData(audioData);
    
    onAudioData(audioData);
    
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(processAudio);
    }
  }, [onAudioData, enabled, isPlaying]);

  const initializeAudioCapture = useCallback(async () => {
    if (!youtubePlayer || isInitialized) return;

    try {
      
      
      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Due to CORS restrictions with YouTube iframes, we need to use screen capture
      // This prompts the user to select the YouTube tab for audio capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false // We only need audio
      });
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyzer
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 4096;
      analyzerRef.current.smoothingTimeConstant = 0.8;
      
      // Connect nodes
      sourceRef.current.connect(analyzerRef.current);
      
      setIsInitialized(true);
      
      
      toast({
        title: "Audio Capture Ready",
        description: "Select the YouTube tab when prompted to enable chord detection",
      });
    } catch (error) {
      console.error('Failed to initialize audio capture:', error);
      toast({
        title: "Audio Capture Setup",
        description: "Please allow screen sharing to capture YouTube audio for chord detection",
        variant: "destructive",
      });
    }
  }, [youtubePlayer, isInitialized, toast]);

  // Initialize audio capture when YouTube player is ready
  useEffect(() => {
    if (youtubePlayer && enabled && !isInitialized) {
      initializeAudioCapture();
    }
  }, [youtubePlayer, enabled, isInitialized, initializeAudioCapture]);

  // Start/stop audio processing based on playback state
  useEffect(() => {
    if (isInitialized && enabled) {
      if (isPlaying) {
        processAudio();
      } else if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, isInitialized, enabled, processAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default YouTubeAudioCapture;