import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ChordDetectorProps {
  isPlaying: boolean;
  currentBarInfo: { sectionIndex: number; barIndex: number } | null;
  autoDetectionEnabled: boolean;
  onChordDetected: (chord: string, sectionIndex: number, barIndex: number) => void;
  audioSource?: HTMLAudioElement | HTMLVideoElement;
}

const ChordDetector = ({ 
  isPlaying, 
  currentBarInfo, 
  autoDetectionEnabled, 
  onChordDetected,
  audioSource 
}: ChordDetectorProps) => {
  const { toast } = useToast();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio analysis from YouTube player
  useEffect(() => {
    if (!autoDetectionEnabled || isInitialized) return;

    const initializeAudio = async () => {
      try {
        // Create audio context
        audioContextRef.current = new AudioContext();
        
        let source: AudioNode;
        
        if (audioSource) {
          // Use YouTube audio directly
          source = audioContextRef.current.createMediaElementSource(audioSource);
        } else {
          // Fallback to YouTube iframe audio (try to capture it)
          const youtubeFrame = document.querySelector('#youtube-player iframe') as HTMLIFrameElement;
          if (youtubeFrame) {
            // Create a media stream from the YouTube player
            try {
              const stream = (youtubeFrame.contentWindow as any)?.getAudioTracks?.() || 
                            await navigator.mediaDevices.getDisplayMedia({ 
                              audio: { 
                                sampleRate: 44100,
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false 
                              } 
                            });
              source = audioContextRef.current.createMediaStreamSource(stream);
            } catch {
              // Final fallback to microphone
              const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                  sampleRate: 44100,
                  echoCancellation: false,
                  noiseSuppression: false,
                  autoGainControl: false
                }
              });
              source = audioContextRef.current.createMediaStreamSource(stream);
              toast({
                title: "Using Microphone",
                description: "Could not access YouTube audio, using microphone input"
              });
            }
          } else {
            throw new Error('No audio source available');
          }
        }

        analyzerRef.current = audioContextRef.current.createAnalyser();
        analyzerRef.current.fftSize = 4096;
        analyzerRef.current.smoothingTimeConstant = 0.8;
        
        source.connect(analyzerRef.current);
        setIsInitialized(true);
        
        
        toast({
          title: "Chord Detection Active",
          description: "Real-time chord detection is now running"
        });
      } catch (error) {
        console.error('Failed to initialize chord detection:', error);
        toast({
          title: "Audio Access Required",
          description: "Please allow audio access for chord detection",
          variant: "destructive"
        });
      }
    };

    initializeAudio();

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [autoDetectionEnabled, isInitialized, audioSource]);

  // Start/stop detection based on playback state
  useEffect(() => {
    if (!isInitialized || !analyzerRef.current || !currentBarInfo) return;

    if (isPlaying && autoDetectionEnabled) {
      startChordDetection();
    } else {
      stopChordDetection();
    }

    return () => stopChordDetection();
  }, [isPlaying, autoDetectionEnabled, isInitialized, currentBarInfo]);

  const startChordDetection = () => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(() => {
      if (analyzerRef.current && currentBarInfo) {
        const chord = detectChord();
        if (chord) {
          
          onChordDetected(chord, currentBarInfo.sectionIndex, currentBarInfo.barIndex);
        }
      }
    }, 1000); // Detect every 1 second for faster response
  };

  const stopChordDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const detectChord = (): string | null => {
    if (!analyzerRef.current) return null;

    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyzerRef.current.getFloatFrequencyData(dataArray);

    // Simple chord detection using fundamental frequency analysis
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const fundamentals = findFundamentals(dataArray, sampleRate);
    
    if (fundamentals.length < 2) return null;

    return analyzeChordFromFundamentals(fundamentals);
  };

  const findFundamentals = (frequencyData: Float32Array, sampleRate: number): number[] => {
    const fundamentals: number[] = [];
    const binSize = sampleRate / (frequencyData.length * 2);
    
    // Look for peaks in frequency domain
    for (let i = 1; i < frequencyData.length - 1; i++) {
      const frequency = i * binSize;
      
      // Focus on musical frequency range (80Hz - 2000Hz)
      if (frequency < 80 || frequency > 2000) continue;
      
      // Peak detection
      if (frequencyData[i] > frequencyData[i-1] && 
          frequencyData[i] > frequencyData[i+1] && 
          frequencyData[i] > -50) { // Threshold for significant peaks
        fundamentals.push(frequency);
      }
    }
    
    return fundamentals.slice(0, 6); // Limit to top 6 fundamentals
  };

  const analyzeChordFromFundamentals = (fundamentals: number[]): string | null => {
    // Convert frequencies to note names
    const notes = fundamentals.map(freq => frequencyToNote(freq)).filter(Boolean);
    
    if (notes.length < 2) return null;

    // Simple chord recognition patterns
    const uniqueNotes = [...new Set(notes)];
    const chordPatterns = {
      'C': ['C', 'E', 'G'],
      'Dm': ['D', 'F', 'A'],
      'Em': ['E', 'G', 'B'],
      'F': ['F', 'A', 'C'],
      'G': ['G', 'B', 'D'],
      'Am': ['A', 'C', 'E'],
      'Bb': ['Bb', 'D', 'F'],
      'D': ['D', 'F#', 'A'],
      'A': ['A', 'C#', 'E'],
      'E': ['E', 'G#', 'B']
    };

    // Find best matching chord
    let bestMatch = '';
    let maxMatches = 0;

    for (const [chord, pattern] of Object.entries(chordPatterns)) {
      const matches = pattern.filter(note => uniqueNotes.includes(note)).length;
      if (matches > maxMatches && matches >= 2) {
        maxMatches = matches;
        bestMatch = chord;
      }
    }

    return bestMatch || null;
  };

  const frequencyToNote = (frequency: number): string | null => {
    const A4 = 440;
    const C0 = A4 * Math.pow(2, -4.75);
    
    if (frequency <= 0) return null;
    
    const h = Math.round(12 * Math.log2(frequency / C0));
    const octave = Math.floor(h / 12);
    const n = h % 12;
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    if (octave < 0 || octave > 9) return null;
    
    return noteNames[n];
  };

  return null; // This component doesn't render anything
};

export default ChordDetector;