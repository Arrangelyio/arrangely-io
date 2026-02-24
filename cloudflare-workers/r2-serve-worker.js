/**
 * Cloudflare Worker to serve R2 audio files with CORS headers
 * 
 * Deploy this worker and configure it to handle requests to sequencer.arrangely.io
 * 
 * Required bindings in wrangler.toml:
 * [[r2_buckets]]
 * binding = "R2_BUCKET"
 * bucket_name = "sequencer-tracks"
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Only allow GET and HEAD
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    // Remove leading slash to get the R2 key
    const key = url.pathname.slice(1);

    if (!key) {
      return new Response('Not Found', { 
        status: 404,
        headers: CORS_HEADERS,
      });
    }

    

    try {
      // Check if R2 bucket is bound
      if (!env.R2_BUCKET) {
        console.error('[R2 Serve] R2_BUCKET binding is not configured');
        return new Response('R2 bucket not configured', { 
          status: 500,
          headers: CORS_HEADERS,
        });
      }

      // Handle Range requests for audio streaming
      const range = request.headers.get('Range');
      
      const object = await env.R2_BUCKET.get(key, {
        range: range ? parseRange(range) : undefined,
      });

      if (!object) {
        
        return new Response('Not Found', { 
          status: 404,
          headers: CORS_HEADERS,
        });
      }

      // Determine content type
      let contentType = object.httpMetadata?.contentType || 'application/octet-stream';
      if (key.endsWith('.wav')) {
        contentType = 'audio/wav';
      } else if (key.endsWith('.mp3')) {
        contentType = 'audio/mpeg';
      } else if (key.endsWith('.json')) {
        contentType = 'application/json';
      }

      // Build response headers
      const headers = new Headers({
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'ETag': object.httpEtag,
      });

      // Add content length
      if (object.size !== undefined) {
        headers.set('Content-Length', object.size.toString());
      }

      // Handle partial content response
      if (range && object.range) {
        const { offset, length } = object.range;
        headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
        headers.set('Content-Length', length.toString());
        
        return new Response(object.body, {
          status: 206,
          headers,
        });
      }

      return new Response(object.body, {
        status: 200,
        headers,
      });

    } catch (error) {
      console.error(`[R2 Serve] Error fetching ${key}:`, error);
      return new Response(`Error: ${error.message}`, { 
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  },
};

/**
 * Parse HTTP Range header
 */
function parseRange(rangeHeader) {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return undefined;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : undefined;

  if (end !== undefined) {
    return { offset: start, length: end - start + 1 };
  }
  
  return { offset: start };
}
