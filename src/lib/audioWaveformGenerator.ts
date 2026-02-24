/**
 * Client-side audio waveform peak generator
 * Generates 1500 peaks from audio file for instant waveform visualization
 */

const PEAKS_COUNT = 1500;

export async function generateWaveformPeaks(audioFile: File): Promise<number[]> {
  const arrayBuffer = await audioFile.arrayBuffer();
  
  // Create audio context for decoding
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    
    // Downsample to PEAKS_COUNT peaks
    const peaks: number[] = [];
    const samplesPerPeak = Math.floor(channelData.length / PEAKS_COUNT);
    
    for (let i = 0; i < PEAKS_COUNT; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);
      
      let maxPeak = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > maxPeak) {
          maxPeak = abs;
        }
      }
      
      peaks.push(maxPeak);
    }
    
    return peaks;
  } finally {
    await audioContext.close();
  }
}

export function peaksToJson(peaks: number[]): Blob {
  return new Blob([JSON.stringify({ peaks })], { type: 'application/json' });
}
