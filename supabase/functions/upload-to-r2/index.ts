import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? '';
const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID') ?? '';
const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') ?? '';
const R2_BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') ?? 'sequencer-tracks';

/**
 * Generate AWS Signature V4 for S3-compatible API
 */
async function signRequest(
  method: string,
  url: URL,
  headers: Headers,
  body: Uint8Array | string | null,
  accessKeyId: string,
  secretAccessKey: string,
  region: string = 'auto'
): Promise<Headers> {
  const service = 's3';
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  headers.set('x-amz-date', amzDate);
  headers.set('host', url.host);

  // Create canonical request
  const signedHeaders = Array.from(headers.keys())
    .filter(k => k.toLowerCase() !== 'authorization')
    .sort()
    .join(';');

  const canonicalHeaders = Array.from(headers.entries())
    .filter(([k]) => k.toLowerCase() !== 'authorization')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .join('\n') + '\n';

  // Hash the payload
  const payloadHash = body 
    ? await sha256Hex(typeof body === 'string' ? new TextEncoder().encode(body) : body)
    : await sha256Hex(new Uint8Array(0));
  
  headers.set('x-amz-content-sha256', payloadHash);

  const canonicalRequest = [
    method,
    url.pathname,
    url.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  // Create string to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest))
  ].join('\n');

  // Calculate signature
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretAccessKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  // Add authorization header
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  headers.set('Authorization', authorization);

  return headers;
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmacSha256(key, data);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Upload file to R2 using S3-compatible API
 */
async function uploadToR2(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`);
  
  const headers = new Headers({
    'Content-Type': contentType,
    'Content-Length': body.length.toString(),
    'Cache-Control': 'public, max-age=31536000',
  });

  const signedHeaders = await signRequest(
    'PUT',
    url,
    headers,
    body,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: signedHeaders,
    body: body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 upload failed: ${response.status} - ${text}`);
  }
}

/**
 * Downsample audio to ~1500 waveform peaks
 */
function extractWaveformPeaks(audioBuffer: ArrayBuffer, targetPeaks: number = 1500): number[] {
  const dataView = new DataView(audioBuffer);
  
  let samples: Float32Array;
  let sampleRate = 44100;
  let numChannels = 2;
  let bitsPerSample = 16;
  
  try {
    // Check for WAV header
    const riff = String.fromCharCode(dataView.getUint8(0), dataView.getUint8(1), dataView.getUint8(2), dataView.getUint8(3));
    
    if (riff === 'RIFF') {
      // Parse WAV header
      numChannels = dataView.getUint16(22, true);
      sampleRate = dataView.getUint32(24, true);
      bitsPerSample = dataView.getUint16(34, true);
      
      // Find data chunk
      let dataOffset = 44;
      for (let i = 36; i < Math.min(audioBuffer.byteLength - 8, 1000); i++) {
        const chunk = String.fromCharCode(
          dataView.getUint8(i), dataView.getUint8(i + 1),
          dataView.getUint8(i + 2), dataView.getUint8(i + 3)
        );
        if (chunk === 'data') {
          dataOffset = i + 8;
          break;
        }
      }
      
      const bytesPerSample = bitsPerSample / 8;
      const numSamples = Math.floor((audioBuffer.byteLength - dataOffset) / bytesPerSample / numChannels);
      samples = new Float32Array(numSamples);
      
      for (let i = 0; i < numSamples; i++) {
        const offset = dataOffset + i * bytesPerSample * numChannels;
        if (offset + bytesPerSample <= audioBuffer.byteLength) {
          let sample = 0;
          if (bitsPerSample === 16) {
            sample = dataView.getInt16(offset, true) / 32768;
          } else if (bitsPerSample === 24) {
            const b0 = dataView.getUint8(offset);
            const b1 = dataView.getUint8(offset + 1);
            const b2 = dataView.getInt8(offset + 2);
            sample = ((b2 << 16) | (b1 << 8) | b0) / 8388608;
          } else if (bitsPerSample === 32) {
            sample = dataView.getFloat32(offset, true);
          }
          samples[i] = sample;
        }
      }
    } else {
      // Not a WAV, treat as raw audio - generate synthetic peaks
      
      const totalBytes = audioBuffer.byteLength;
      samples = new Float32Array(totalBytes);
      for (let i = 0; i < totalBytes; i++) {
        samples[i] = (dataView.getUint8(i) - 128) / 128;
      }
    }
  } catch (e) {
    console.error('Error parsing audio:', e);
    samples = new Float32Array(audioBuffer.byteLength);
    for (let i = 0; i < audioBuffer.byteLength; i++) {
      samples[i] = (dataView.getUint8(i) - 128) / 128;
    }
  }
  
  // Downsample to target number of peaks
  const samplesPerPeak = Math.floor(samples.length / targetPeaks);
  const peaks: number[] = [];
  
  for (let i = 0; i < targetPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, samples.length);
    
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > max) max = abs;
    }
    peaks.push(Math.round(max * 1000) / 1000);
  }
  
  return peaks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const songId = formData.get('songId') as string;
    const trackIndex = formData.get('trackIndex') as string;
    const trackName = formData.get('trackName') as string;
    const audioFile = formData.get('audioFile') as File;

    if (!songId || trackIndex === null || !audioFile) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: songId, trackIndex, audioFile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    // Read file as ArrayBuffer
    const audioBuffer = await audioFile.arrayBuffer();
    
    // Extract file extension
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase() || 'wav';
    const audioKey = `${songId}/${trackIndex}.${fileExtension}`;
    const peaksKey = `${songId}/${trackIndex}.peaks.json`;

    // Generate waveform peaks
    
    const peaks = extractWaveformPeaks(audioBuffer);
    const peaksJson = JSON.stringify({ 
      peaks,
      trackName: trackName || `Track ${trackIndex}`,
      duration: peaks.length / 30,
      generatedAt: new Date().toISOString()
    });

    // Upload audio file to R2
    
    await uploadToR2(audioKey, new Uint8Array(audioBuffer), audioFile.type || 'audio/wav');

    // Upload peaks JSON to R2
    
    await uploadToR2(peaksKey, new TextEncoder().encode(peaksJson), 'application/json');

    

    return new Response(
      JSON.stringify({
        success: true,
        audioKey,
        peaksKey,
        trackIndex: parseInt(trackIndex),
        trackName: trackName || `Track ${trackIndex}`,
        fileSize: audioFile.size,
        peaksCount: peaks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[R2 Upload] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to upload to R2',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
