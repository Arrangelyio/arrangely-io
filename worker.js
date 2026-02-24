// Cloudflare Worker for Prerender.io integration with Supabase Edge Function
// This worker detects social media crawlers and serves pre-rendered HTML

const CRAWLER_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkShare',
  'W3C_Validator',
  'whatsapp',
  'telegrambot'
];

const SUPABASE_URL = 'https://api.arrangely.io';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtc2V5cmNveGJ3aHp0dnZpdmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzM0MzksImV4cCI6MjA3NDMwOTQzOX0.gbU9MmiwsVbrEz6ehY7KJnWrURmA1tKBxFlJXAmNmgA';
const ORIGIN_URL = 'https://arrangely.io';

function isCrawler(userAgent) {
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot));
}

function parseUrl(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Match patterns: /event/{slug}, /song/{slug}, /creator/{slug}
  const eventMatch = pathname.match(/^\/events\/([^\/]+)/);
  const songMatch = pathname.match(/^\/song\/([^\/]+)/);
  const arrangementMatch = pathname.match(/^\/arrangement\/([^\/]+)/);
  const creatorMatch = pathname.match(/^\/creator\/([^\/]+)/);
  const setlistMatch = pathname.match(/^\/setlist-performance\/([^\/]+)/);
  const lessonMatch = pathname.match(/^\/arrangely-music-lab\/([^\/]+)/);

  if (eventMatch) {
    return { type: 'event', id: eventMatch[1] };
  } else if (songMatch) {
    return { type: 'song', id: songMatch[1] };
  } else if (creatorMatch) {
    return { type: 'creator', id: creatorMatch[1] };
  } else if (arrangementMatch) {
    return { type: 'arrangement', id: arrangementMatch[1] };
  } else if (setlistMatch) {
    return { type: 'setlist', id: setlistMatch[1] };
  } else if (lessonMatch) {
    return { type: 'lesson', id: lessonMatch[1] };
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('User-Agent') || '';

    // Skip prerendering for static assets
    if (url.pathname.match(/\.(js|css|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot|json|xml)$/i)) {
      return fetch(new Request(ORIGIN_URL + url.pathname + url.search, request));
    }

    // Check if request is from a crawler
    if (!isCrawler(userAgent)) {
      // Not a crawler, pass through to the origin
      return fetch(new Request(ORIGIN_URL + url.pathname + url.search, request));
    }

    // Parse the URL to extract type and ID
    const parsed = parseUrl(request.url);

    if (!parsed) {
      // URL doesn't match any prerender patterns, pass through
      return fetch(new Request(ORIGIN_URL + url.pathname + url.search, request));
    }

    // Call Supabase Edge Function for prerendering
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/prerender-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            type: parsed.type,
            id: parsed.id
          })
        }
      );

      if (response.ok) {
        const html = await response.text();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
            'X-Prerendered': 'true'
          }
        });
      } else {
        console.error('Prerender edge function error:', response.status);
        // Fallback to origin
        return fetch(new Request(ORIGIN_URL + url.pathname + url.search, request));
      }
    } catch (error) {
      console.error('Error calling prerender edge function:', error);
      // Fallback to origin
      return fetch(new Request(ORIGIN_URL + url.pathname + url.search, request));
    }
  }
};
