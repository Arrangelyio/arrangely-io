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

// R2 public domain (configure in Cloudflare dashboard)
// Ensure it has https:// prefix
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

  // Query parameters for presigned URL
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  // Canonical request
  const canonicalRequest = [
    method,
    `/${R2_BUCKET_NAME}/${key}`,
    queryParams.toString(),
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // String to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(new TextEncoder().encode(canonicalRequest))
  ].join('\n');

  // Calculate signature
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

interface TrackUrlRequest {
  songId: string;
  trackIndex: number;
  includeAudio?: boolean;
  includePeaks?: boolean;
}

interface BatchUrlRequest {
  songId: string;
  trackCount: number;
  extensions?: string[];
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

    const body = await req.json();
    const { action } = body;

    // Handle batch URL generation for all tracks
    if (action === 'batch') {
      const { songId, trackCount, extensions }: BatchUrlRequest = body;
      
      if (!songId || !trackCount) {
        return new Response(
          JSON.stringify({ error: 'Missing songId or trackCount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      
      
      

      const urls = await Promise.all(
        Array.from({ length: trackCount }, async (_, i) => {
          // Use provided extension, default to m4a (most common after conversion), fallback wav
          const ext = extensions?.[i] || 'm4a';
          const audioKey = `${songId}/${i}.${ext}`;
          const peaksKey = `${songId}/${i}.peaks.json`;

          // If public domain is configured, use CDN URLs
          if (R2_PUBLIC_DOMAIN) {
            const audioUrl = `${R2_PUBLIC_DOMAIN}/${audioKey}`;
            const peaksUrl = `${R2_PUBLIC_DOMAIN}/${peaksKey}`;
            
            return {
              trackIndex: i,
              audioUrl,
              peaksUrl,
            };
          }

          // Otherwise generate presigned URLs (1 hour expiry)
          const [audioUrl, peaksUrl] = await Promise.all([
            generatePresignedUrl(audioKey, 3600),
            generatePresignedUrl(peaksKey, 3600),
          ]);
          
          

          return {
            trackIndex: i,
            audioUrl,
            peaksUrl,
          };
        })
      );

      return new Response(
        JSON.stringify({ success: true, urls }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle single track URL generation
    const { songId, trackIndex, includeAudio = true, includePeaks = true }: TrackUrlRequest = body;

    if (!songId || trackIndex === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing songId or trackIndex' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    const result: Record<string, unknown> = { trackIndex };

    // If public domain is configured, use CDN URLs (fastest)
    if (R2_PUBLIC_DOMAIN) {
      if (includeAudio) {
        // Default to m4a for single track requests (most common format after conversion)
        result.audioUrl = `${R2_PUBLIC_DOMAIN}/${songId}/${trackIndex}.m4a`;
      }
      if (includePeaks) {
        result.peaksUrl = `${R2_PUBLIC_DOMAIN}/${songId}/${trackIndex}.peaks.json`;
      }
    } else {
      // Generate presigned URLs (1 hour expiry)
      if (includeAudio) {
        result.audioUrl = await generatePresignedUrl(`${songId}/${trackIndex}.m4a`, 3600);
      }
      if (includePeaks) {
        result.peaksUrl = await generatePresignedUrl(`${songId}/${trackIndex}.peaks.json`, 3600);
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[R2 URL] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate R2 URL',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
