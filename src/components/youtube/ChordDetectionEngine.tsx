import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChordDetectionEngineProps {
  audioData: Float32Array | null;
  videoId: string;
  currentTime: number;
  detectionMethod: 'local' | 'backend';
  onChordDetected: (chord: string, timestamp: number, confidence: number) => void;
  enabled: boolean;
}

const ChordDetectionEngine = ({
  audioData,
  videoId,
  currentTime,
  detectionMethod,
  onChordDetected,
  enabled
}: ChordDetectionEngineProps) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const lastDetectionTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simple chord detection using frequency analysis
  const detectChordLocally = useCallback((frequencyData: Float32Array): { chord: string; confidence: number } | null => {
    const sampleRate = 24000;
    const fundamentals = findFundamentals(frequencyData, sampleRate);
    
    if (fundamentals.length < 2) return null;

    const chordResult = analyzeChordFromFundamentals(fundamentals);
    return chordResult;
  }, []);

  const findFundamentals = (frequencyData: Float32Array, sampleRate: number): number[] => {
    const fundamentals: number[] = [];
    const binSize = sampleRate / (frequencyData.length * 2);
    
    // Look for peaks in frequency domain (musical range 80Hz - 2000Hz)
    for (let i = 1; i < frequencyData.length - 1; i++) {
      const frequency = i * binSize;
      
      if (frequency < 80 || frequency > 2000) continue;
      
      // Peak detection with threshold
      if (frequencyData[i] > frequencyData[i-1] && 
          frequencyData[i] > frequencyData[i+1] && 
          frequencyData[i] > -40) { // Adjusted threshold
        fundamentals.push(frequency);
      }
    }
    
    return fundamentals.sort((a, b) => b - a).slice(0, 6); // Top 6 fundamentals
  };

  const analyzeChordFromFundamentals = (fundamentals: number[]): { chord: string; confidence: number } | null => {
    const notes = fundamentals.map(freq => frequencyToNote(freq)).filter(Boolean);
    
    if (notes.length < 2) return null;

    const uniqueNotes = [...new Set(notes)];
    const chordPatterns = {
      'C': { notes: ['C', 'E', 'G'], weight: 1.0 },
      'Dm': { notes: ['D', 'F', 'A'], weight: 1.0 },
      'Em': { notes: ['E', 'G', 'B'], weight: 1.0 },
      'F': { notes: ['F', 'A', 'C'], weight: 1.0 },
      'G': { notes: ['G', 'B', 'D'], weight: 1.0 },
      'Am': { notes: ['A', 'C', 'E'], weight: 1.0 },
      'Bb': { notes: ['Bb', 'D', 'F'], weight: 0.9 },
      'D': { notes: ['D', 'F#', 'A'], weight: 0.9 },
      'A': { notes: ['A', 'C#', 'E'], weight: 0.9 },
      'E': { notes: ['E', 'G#', 'B'], weight: 0.9 },
      'B': { notes: ['B', 'D#', 'F#'], weight: 0.8 },
      'F#': { notes: ['F#', 'A#', 'C#'], weight: 0.8 },
    };

    let bestMatch = '';
    let maxScore = 0;

    for (const [chord, pattern] of Object.entries(chordPatterns)) {
      const matches = pattern.notes.filter(note => uniqueNotes.includes(note)).length;
      const score = (matches / pattern.notes.length) * pattern.weight;
      
      if (score > maxScore && matches >= 2) {
        maxScore = score;
        bestMatch = chord;
      }
    }

    return bestMatch ? { chord: bestMatch, confidence: maxScore } : null;
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

  // Backend chord detection using AI
  const detectChordBackend = useCallback(async (audioData: Float32Array): Promise<{ chord: string; confidence: number } | null> => {
    try {
      setIsProcessing(true);
      
      // Convert Float32Array to base64 for transmission
      const int16Array = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      const uint8Array = new Uint8Array(int16Array.buffer);
      const base64Audio = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));

      const response = await supabase.functions.invoke('youtube-realtime-chords', {
        body: {
          action: 'detect_chord',
          audioData: base64Audio,
          timestamp: currentTime
        }
      });

      if (response.error) throw response.error;

      return response.data?.chord ? {
        chord: response.data.chord,
        confidence: response.data.confidence || 0.8
      } : null;
    } catch (error) {
      console.error('Backend chord detection failed:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [currentTime]);

  // Process audio data for chord detection
  const processAudioData = useCallback(async () => {
    if (!audioData || !enabled || isProcessing) return;

    // Throttle detection to every 1.5 seconds for more responsive detection
    const now = Date.now();
    if (now - lastDetectionTimeRef.current < 1500) return;

    lastDetectionTimeRef.current = now;

    try {
      let result: { chord: string; confidence: number } | null = null;

      if (detectionMethod === 'local') {
        result = detectChordLocally(audioData);
      } else {
        result = await detectChordBackend(audioData);
      }

      if (result && result.confidence > 0.5) { // Lower threshold for more detections
        
        
        // Store in Supabase
        const { error } = await supabase
          .from('chords')
          .insert({
            video_id: videoId,
            timestamp: currentTime,
            chord: result.chord,
            confidence: result.confidence,
            detection_method: detectionMethod
          });

        if (error) {
          console.error('Failed to store chord:', error);
        } else {
          onChordDetected(result.chord, currentTime, result.confidence);
        }
      }
    } catch (error) {
      console.error('Chord detection error:', error);
    }
  }, [audioData, enabled, isProcessing, detectionMethod, detectChordLocally, detectChordBackend, videoId, currentTime, onChordDetected]);

  // Process audio data when it changes
  useEffect(() => {
    if (audioData && enabled) {
      // Clear existing timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      // Debounce processing
      processingTimeoutRef.current = setTimeout(processAudioData, 100);
    }

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [audioData, enabled, processAudioData]);

  return null; // This component doesn't render anything
};

export default ChordDetectionEngine;