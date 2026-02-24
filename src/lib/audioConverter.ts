/**
 * Client-side audio converter: WAV to M4A (AAC)
 * Uses Web Audio API + MediaRecorder for conversion
 */

export interface ConversionResult {
  file: File;
  originalSize: number;
  convertedSize: number;
  compressionRatio: number;
}

export async function convertWavToM4a(
  wavFile: File,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  const originalSize = wavFile.size;
  
  onProgress?.(5);
  
  // Read the WAV file as ArrayBuffer
  const arrayBuffer = await wavFile.arrayBuffer();
  
  onProgress?.(10);
  
  // Create audio context for decoding
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    onProgress?.(30);
    
    // Create an offline context for rendering
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Create buffer source and connect
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    // Render the audio
    const renderedBuffer = await offlineContext.startRendering();
    
    onProgress?.(50);
    
    // Convert to compressed format using MediaRecorder
    const { blob: compressedBlob, extension } = await encodeToCompressedFormat(renderedBuffer, onProgress);
    
    onProgress?.(90);
    
    // Create new file with correct extension based on actual format used
    const originalName = wavFile.name.replace(/\.(wav|mp3)$/i, '');
    const compressedFile = new File([compressedBlob], `${originalName}.${extension}`, {
      type: compressedBlob.type,
    });
    
    onProgress?.(100);
    
    return {
      file: compressedFile,
      originalSize,
      convertedSize: compressedFile.size,
      compressionRatio: originalSize / compressedFile.size,
    };
  } finally {
    await audioContext.close();
  }
}

async function encodeToCompressedFormat(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; extension: string }> {
  return new Promise((resolve, reject) => {
    // Create a new audio context for playback/recording
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a MediaStreamDestination
    const destination = audioContext.createMediaStreamDestination();
    
    // Create buffer source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    
    // Check for supported MIME types and determine extension
    const mimeConfigs = [
      { mimeType: 'audio/mp4', extension: 'm4a' },
      { mimeType: 'audio/aac', extension: 'aac' },
      { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
      { mimeType: 'audio/webm', extension: 'webm' },
      { mimeType: 'audio/ogg;codecs=opus', extension: 'ogg' },
    ];
    
    let selectedConfig = { mimeType: 'audio/webm', extension: 'webm' };
    for (const config of mimeConfigs) {
      if (MediaRecorder.isTypeSupported(config.mimeType)) {
        selectedConfig = config;
        break;
      }
    }
    
    
    
    // Create MediaRecorder with high quality settings
    const mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: selectedConfig.mimeType,
      audioBitsPerSecond: 128000, // 128kbps for good quality
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      await audioContext.close();
      const blob = new Blob(chunks, { type: selectedConfig.mimeType });
      resolve({ blob, extension: selectedConfig.extension });
    };
    
    mediaRecorder.onerror = (e) => {
      audioContext.close();
      reject(new Error('MediaRecorder error'));
    };
    
    // Start recording
    mediaRecorder.start();
    source.start();
    
    // Update progress during encoding
    const duration = audioBuffer.duration;
    const startTime = Date.now();
    
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(50 + (elapsed / duration) * 35, 85);
      onProgress?.(progress);
    }, 100);
    
    // Stop recording when audio ends
    source.onended = () => {
      clearInterval(progressInterval);
      mediaRecorder.stop();
    };
  });
}

/**
 * Check if the browser supports M4A encoding
 */
export function supportsM4aEncoding(): boolean {
  return MediaRecorder.isTypeSupported('audio/mp4') || 
         MediaRecorder.isTypeSupported('audio/aac');
}

/**
 * Get the best supported audio format
 */
export function getBestSupportedFormat(): { mimeType: string; extension: string } {
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return { mimeType: 'audio/mp4', extension: 'm4a' };
  }
  if (MediaRecorder.isTypeSupported('audio/aac')) {
    return { mimeType: 'audio/aac', extension: 'aac' };
  }
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    return { mimeType: 'audio/webm;codecs=opus', extension: 'webm' };
  }
  return { mimeType: 'audio/webm', extension: 'webm' };
}
