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

// R2 public domain with https:// prefix
const rawR2Domain = Deno.env.get('CLOUDFLARE_R2_PUBLIC_DOMAIN') ?? '';
const R2_PUBLIC_DOMAIN = rawR2Domain 
  ? (rawR2Domain.startsWith('http') ? rawR2Domain : `https://${rawR2Domain}`)
  : '';

/**
 * Generate AWS Signature V4 presigned URL
 */
async function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const service = 's3';
  const region = 'auto';
  const method = 'GET';
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${R2_BUCKET_NAME}/${key}`;
  
  const date = new Date();
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalRequest = [
    method,
    `/${R2_BUCKET_NAME}/${key}`,
    queryParams.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest))
  ].join('\n');

  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + R2_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = await hmacSha256Hex(kSigning, stringToSign);

  queryParams.set('X-Amz-Signature', signature);
  
  return `${endpoint}?${queryParams.toString()}`;
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

interface Track {
  name: string;
  color: string;
  filename?: string;
  r2_audio_key?: string;
  r2_peaks_key?: string;
  default_volume?: number;
  default_pan?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { sequencerFileId, action } = body;

    if (!sequencerFileId) {
      return new Response(
        JSON.stringify({ error: 'Missing sequencerFileId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch sequencer file with tracks data
    const { data: sequencerFile, error: fetchError } = await supabaseClient
      .from('sequencer_files')
      .select('id, title, tracks, storage_folder_path, tempo, time_signature')
      .eq('id', sequencerFileId)
      .single();

    if (fetchError || !sequencerFile) {
      console.error('[Sequencer Tracks] Error fetching sequencer file:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Sequencer file not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tracks = (sequencerFile.tracks as Track[]) || [];

    // Action: preview - return track names and colors only (for pre-purchase preview)
    if (action === 'preview') {
      
      
      const trackPreviews = tracks.map((track, index) => ({
        index,
        name: track.name,
        color: track.color,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          sequencerFileId,
          title: sequencerFile.title,
          tempo: sequencerFile.tempo,
          timeSignature: sequencerFile.time_signature,
          trackCount: tracks.length,
          tracks: trackPreviews,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: secure-urls - return full track data with secure URLs (requires enrollment)
    if (action === 'secure-urls') {
      // Verify user has purchased/enrolled in this sequencer file
      const { data: enrollment, error: enrollmentError } = await supabaseClient
        .from('sequencer_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('sequencer_file_id', sequencerFileId)
        .eq('is_production', true)
        .maybeSingle();

      if (enrollmentError || !enrollment) {
        
        return new Response(
          JSON.stringify({ error: 'Access denied. Please purchase this sequencer file first.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      

      // Generate secure URLs for each track
      const secureUrls = await Promise.all(
        tracks.map(async (track, index) => {
          const audioKey = track.r2_audio_key || `${sequencerFile.storage_folder_path}/${track.filename || `${index}.m4a`}`;
          const peaksKey = track.r2_peaks_key || `${sequencerFile.storage_folder_path}/${index}.peaks.json`;

          let audioUrl: string;
          let peaksUrl: string;

          if (R2_PUBLIC_DOMAIN) {
            // Use CDN URLs with time-based cache busting for security
            const cacheBuster = `?t=${Date.now()}`;
            audioUrl = `${R2_PUBLIC_DOMAIN}/${audioKey}${cacheBuster}`;
            peaksUrl = `${R2_PUBLIC_DOMAIN}/${peaksKey}${cacheBuster}`;
          } else {
            // Generate presigned URLs (15 min expiry for security)
            [audioUrl, peaksUrl] = await Promise.all([
              generatePresignedUrl(audioKey, 900),
              generatePresignedUrl(peaksKey, 900),
            ]);
          }

          return {
            index,
            name: track.name,
            color: track.color,
            defaultVolume: track.default_volume ?? 1,
            defaultPan: track.default_pan ?? 0,
            audioUrl,
            peaksUrl,
          };
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          sequencerFileId,
          title: sequencerFile.title,
          tempo: sequencerFile.tempo,
          timeSignature: sequencerFile.time_signature,
          trackCount: tracks.length,
          tracks: secureUrls,
          expiresIn: R2_PUBLIC_DOMAIN ? 3600 : 900, // CDN URLs valid longer
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "preview" or "secure-urls"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Sequencer Tracks] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
