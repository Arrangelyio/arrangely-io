/**
 * Cloudflare Worker for R2 Audio Upload
 * 
 * This worker handles large audio file uploads to Cloudflare R2 without timeout issues.
 * Deploy to: https://r2-upload.arrangely.workers.dev
 * 
 * Required bindings:
 * - R2_BUCKET: R2 bucket binding (sequencer-tracks)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key (for auth verification)
 * 
 * wrangler.toml configuration:
 * ```toml
 * name = "r2-upload"
 * main = "r2-upload-worker.js"
 * compatibility_date = "2024-01-01"
 * 
 * [[r2_buckets]]
 * binding = "R2_BUCKET"
 * bucket_name = "sequencer-tracks"
 * 
 * [vars]
 * SUPABASE_URL = "https://jowuhdfznveuopeqwzzd.supabase.co"
 * 
 * # Add SUPABASE_SERVICE_KEY as a secret:
 * # wrangler secret put SUPABASE_SERVICE_KEY
 * ```
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // Check R2 bucket binding
      if (!env.R2_BUCKET) {
        console.error('R2_BUCKET binding is not configured');
        return new Response(JSON.stringify({ 
          error: 'R2 bucket not configured. Please add [[r2_buckets]] binding in wrangler.toml',
          success: false,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify auth token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Missing authorization' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify token with Supabase
      const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY,
        },
      });

      if (!userResponse.ok) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse multipart form data
      const formData = await request.formData();
      const songId = formData.get('songId');
      const trackIndex = formData.get('trackIndex');
      const trackName = formData.get('trackName');
      const audioFile = formData.get('audioFile');
      // Allow explicit extension override for converted files
      const explicitExtension = formData.get('fileExtension');

      if (!songId || trackIndex === null || !audioFile) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get file extension - prefer explicit extension (for converted files), then from filename
      const fileName = audioFile.name || 'audio.wav';
      const extension = explicitExtension || fileName.split('.').pop()?.toLowerCase() || 'wav';
      
      // Determine content type based on actual extension
      const getContentType = (ext) => {
        switch (ext) {
          case 'mp3': return 'audio/mpeg';
          case 'm4a': return 'audio/mp4';
          case 'aac': return 'audio/aac';
          case 'webm': return 'audio/webm';
          case 'ogg': return 'audio/ogg';
          default: return 'audio/wav';
        }
      };
      
      // Generate R2 keys with correct extension
      const audioKey = `${songId}/${trackIndex}.${extension}`;
      const peaksKey = `${songId}/${trackIndex}.peaks.json`;

      

      // Read audio file as ArrayBuffer
      const audioBuffer = await audioFile.arrayBuffer();
      const audioBytes = new Uint8Array(audioBuffer);

      // Generate waveform peaks (only works well for WAV, for compressed formats we skip)
      const peaks = extension === 'wav' ? generateWaveformPeaks(audioBytes, extension) : [];

      // Upload audio to R2
      await env.R2_BUCKET.put(audioKey, audioBuffer, {
        httpMetadata: {
          contentType: getContentType(extension),
        },
        customMetadata: {
          trackName: trackName || `Track ${trackIndex}`,
          songId: songId,
          uploadedAt: new Date().toISOString(),
          originalExtension: extension,
        },
      });

      

      // Create peaks data
      const peaksData = {
        peaks: peaks,
        trackName: trackName || `Track ${trackIndex}`,
        duration: estimateDuration(audioBytes.length, extension),
        generatedAt: new Date().toISOString(),
      };

      // Upload peaks JSON to R2
      await env.R2_BUCKET.put(peaksKey, JSON.stringify(peaksData), {
        httpMetadata: {
          contentType: 'application/json',
        },
      });

      

      return new Response(JSON.stringify({
        success: true,
        audioKey,
        peaksKey,
        message: 'Upload successful',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Upload error:', error);
      return new Response(JSON.stringify({ 
        error: error.message || 'Upload failed',
        success: false,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Generate waveform peaks from audio data
 */
function generateWaveformPeaks(audioBytes, extension) {
  const PEAK_COUNT = 1500;
  const peaks = [];

  try {
    let samples;
    
    if (extension === 'wav') {
      // Parse WAV header
      const dataView = new DataView(audioBytes.buffer);
      
      // Find 'data' chunk
      let dataOffset = 12;
      let dataSize = 0;
      
      while (dataOffset < audioBytes.length - 8) {
        const chunkId = String.fromCharCode(
          audioBytes[dataOffset],
          audioBytes[dataOffset + 1],
          audioBytes[dataOffset + 2],
          audioBytes[dataOffset + 3]
        );
        const chunkSize = dataView.getUint32(dataOffset + 4, true);
        
        if (chunkId === 'data') {
          dataOffset += 8;
          dataSize = chunkSize;
          break;
        }
        dataOffset += 8 + chunkSize;
      }

      if (dataSize === 0) {
        // Fallback - assume standard WAV header
        dataOffset = 44;
        dataSize = audioBytes.length - 44;
      }

      // Read 16-bit samples
      const sampleCount = Math.floor(dataSize / 2);
      samples = new Float32Array(sampleCount);
      
      for (let i = 0; i < sampleCount && (dataOffset + i * 2 + 1) < audioBytes.length; i++) {
        const sample = dataView.getInt16(dataOffset + i * 2, true);
        samples[i] = sample / 32768;
      }
    } else {
      // For MP3, generate synthetic peaks based on byte values
      const sampleCount = Math.min(audioBytes.length, 100000);
      samples = new Float32Array(sampleCount);
      
      for (let i = 0; i < sampleCount; i++) {
        samples[i] = (audioBytes[i] - 128) / 128;
      }
    }

    // Downsample to PEAK_COUNT peaks
    const samplesPerPeak = Math.ceil(samples.length / PEAK_COUNT);
    
    for (let i = 0; i < PEAK_COUNT; i++) {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, samples.length);
      
      let max = 0;
      for (let j = start; j < end; j++) {
        const absVal = Math.abs(samples[j]);
        if (absVal > max) max = absVal;
      }
      
      peaks.push(Math.min(1, max));
    }

    return peaks;
  } catch (error) {
    console.error('Peak generation error:', error);
    // Return synthetic peaks
    return Array.from({ length: PEAK_COUNT }, () => Math.random() * 0.5 + 0.25);
  }
}

/**
 * Estimate audio duration from file size
 */
function estimateDuration(byteLength, extension) {
  if (extension === 'wav') {
    // Assume 44.1kHz, 16-bit, stereo
    const bytesPerSecond = 44100 * 2 * 2;
    return (byteLength - 44) / bytesPerSecond;
  } else {
    // Assume 128kbps MP3
    const bytesPerSecond = 128000 / 8;
    return byteLength / bytesPerSecond;
  }
}
