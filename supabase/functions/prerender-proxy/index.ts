import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Common crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'pinterest',
  'discordbot',
  'skypeuripreview',
  'googlebot',
  'bingbot',
  'applebot'
];
function isCrawler(userAgent = '') {
  const ua = userAgent.toLowerCase();
  const match = CRAWLER_USER_AGENTS.some((bot)=>ua.includes(bot));
  console.log('🧠 isCrawler check:', {
    ua,
    match
  });
  return match;
}
function sanitize(str = '') {
  return str.replace(/[<>"]/g, (c)=>({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[c]);
}
// ✅ Tambahkan fungsi extractYouTubeVideoId
function extractYouTubeVideoId(url) {
  if (!url) return '';
  const regExp = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match && match[1] && match[1].length === 11 ? match[1] : '';
}
/* ----------------------- EVENT HTML ----------------------- */ async function generateEventHTML(eventId, supabase) {
  
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  // Query sesuai tipe
  const query = supabase.from('events').select('*').eq(isUUID ? 'id' : 'slug', eventId).eq('visibility', 'public').single();
  const { data: event, error } = await query;
  if (error) console.error('❌ Supabase event query error:', error);
  if (!event) {
    
    return null;
  }
  const imageUrl = event.banner_image_url || 'https://arrangely.io/placeholder.svg';
  const description = sanitize(event.description?.substring(0, 160) || 'Join this exciting event on Arrangely.');
  console.log('✅ Event data fetched:', {
    title: event.title,
    imageUrl
  });
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(event.title)} - Arrangely</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="event" />
  <meta property="og:url" content="https://arrangely.io/events/${event.slug || event.id}" />
  <meta property="og:title" content="${sanitize(event.title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=https://arrangely.io/events/${event.slug || event.id}" />
</head>
<body>
  <h1>${sanitize(event.title)}</h1>
  <p>${description}</p>
</body>
</html>`;
}
/* ----------------------- SONG HTML ----------------------- */ async function generateSongHTML(songId, supabase) {
  
  // Ambil data lagu
  const { data: song, error: songError } = await supabase.from('songs').select('*').eq('id', songId).eq('is_public', true).single();
  if (songError || !song) {
    console.error('❌ Supabase song query error:', songError);
    return null;
  }
  // Ambil profile creator manual
  const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name, avatar_url').eq('user_id', song.user_id).single();
  if (profileError) {
    console.warn('⚠️ No profile found for user_id:', song.user_id);
  }
  // ✅ Ganti cara ambil thumbnail YouTube
  const videoId = extractYouTubeVideoId(song.youtube_link);
  const imageUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : song.youtube_thumbnail || 'https://arrangely.io/placeholder.svg';
  const artist = sanitize(profile?.display_name || song.artist || 'Unknown Artist');
  console.log('✅ Song data fetched:', {
    title: song.title,
    artist,
    imageUrl
  });
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(song.title)} by ${artist} - Arrangely</title>
  <meta name="description" content="View and learn ${song.title} by ${artist}." />
  <meta property="og:type" content="music.song" />
  <meta property="og:title" content="${sanitize(song.title)} by ${artist}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=https://arrangely.io/arrangement/${song.slug || song.id}" />
</head>
<body>
  <h1>${sanitize(song.title)}</h1>
  <p>by ${artist}</p>
</body>
</html>`;
}
/* ----------------------- CREATOR HTML ----------------------- */ async function generateCreatorHTML(slug, supabase) {
  
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('creator_slug', slug).single();
  if (error) console.error('❌ Supabase creator query error:', error);
  if (!profile) {
    
    return null;
  }
  console.log('✅ Creator data fetched:', {
    name: profile.display_name
  });
  const imageUrl = profile.avatar_url || 'https://arrangely.io/placeholder.svg';
  const bio = sanitize(profile.bio || `Check out ${profile.display_name}'s music arrangements`);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(profile.display_name)} - Music Arranger | Arrangely</title>
  <meta name="description" content="${bio}" />
  <meta property="og:title" content="${sanitize(profile.display_name)} - Music Arranger" />
  <meta property="og:description" content="${bio}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0;url=https://arrangely.io/creator/${slug}" />
</head>
<body>
  <h1>${sanitize(profile.display_name)}</h1>
  <p>${bio}</p>
</body>
</html>`;
}

/* ----------------------- LESSON HTML ----------------------- */
async function generateLessonHTML(lessonId, supabase) {
  

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lessonId);

  // Ambil lesson data
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*')
    .eq(isUUID ? 'id' : 'slug', lessonId)
    .eq('is_production', true)
    .eq('is_unlisted', false)
    .single();

  if (error || !lesson) {
    console.error("❌ Lesson not found:", error);
    return null;
  }

  // Fetch creator profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('user_id', lesson.creator_id)
    .single();

  const creator = sanitize(profile?.display_name || "Unknown Creator");

  const imageUrl =
    lesson.cover_image_url || profile?.avatar_url || "https://arrangely.io/placeholder.svg";

  const description = sanitize(
    lesson.description?.substring(0, 160) ||
    `Learn ${lesson.title} — A structured lesson by ${creator}.`
  );

  

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${sanitize(lesson.title)} - Lesson | Arrangely</title>
  <meta name="description" content="${description}" />

  <meta property="og:type" content="article" />
  <meta property="og:title" content="${sanitize(lesson.title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />

  <meta http-equiv="refresh" content="0;url=https://arrangely.io/arrangely-music-lab/${lesson.slug || lesson.id}" />
</head>
<body>
  <h1>${sanitize(lesson.title)}</h1>
  <p>By ${creator}</p>
  <p>${description}</p>
</body>
</html>`;
}



/* ----------------------- SETLIST HTML ----------------------- */ async function generateSetlistHTML(setlistId, supabase) {
  
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(setlistId);
  const { data: setlist, error } = await supabase.from('setlists').select('*').eq(isUUID ? 'id' : 'slug', setlistId).single();
  if (error || !setlist) return null;
  const songIds = setlist.song_ids || [];
  let songs = [];
  if (songIds.length > 0) {
    const { data: songData } = await supabase.from('songs').select('id, title, artist').in('id', songIds);
    songs = songData || [];
  }
  const title = sanitize(setlist.name || 'Untitled Setlist');
  const theme = sanitize(setlist.theme || 'No theme');
  const date = setlist.date ? new Date(setlist.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'No date specified';
  const totalSongs = songs.length;
  const previewSongs = songs.slice(0, 3).map((s)=>s.title).join(', ');
  const description = sanitize(`${theme} · ${totalSongs} song${totalSongs !== 1 ? 's' : ''} · ${date}${previewSongs ? ` · ${previewSongs}${songs.length > 3 ? '…' : ''}` : ''}`);
  const songList = totalSongs ? `<ul>${songs.map((s, i)=>`<li>${i + 1}. ${sanitize(s.title)}${s.artist ? ` - ${sanitize(s.artist)}` : ''}</li>`).join('')}</ul>` : '<p>No songs in this setlist.</p>';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Setlist | Arrangely</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="music.playlist" />
  <meta property="og:url" content="https://arrangely.io/setlist/${setlist.slug || setlist.id}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://arrangely.io/placeholder.svg" />
  <meta http-equiv="refresh" content="0;url=https://arrangely.io/setlist/${setlist.slug || setlist.id}" />
</head>
<body>
  <h1>${title}</h1>
  <p><strong>Theme:</strong> ${theme}</p>
  <p><strong>Date:</strong> ${date}</p>
  <h2>Songs (${totalSongs})</h2>
  ${songList}
</body>
</html>`;
}
/* ----------------------- MAIN HANDLER ----------------------- */ Deno.serve(async (req)=>{
  
  const userAgent = req.headers.get('user-agent') || '';
  
  if (req.method === 'OPTIONS') {
    
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const bodyText = await req.text();
    
    const { type, id } = bodyText ? JSON.parse(bodyText) : {};
    console.log('🧩 Parsed body:', {
      type,
      id
    });
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let html = null;
    if (type === 'event') html = await generateEventHTML(id, supabase);
    else if (type === 'song' || type === 'arrangement') html = await generateSongHTML(id, supabase);
    else if (type === 'creator') html = await generateCreatorHTML(id, supabase);
    else if (type === 'setlist') html = await generateSetlistHTML(id, supabase);
    else if (type === 'lesson') html = await generateLessonHTML(id, supabase);
    if (!html) {
      
      return new Response(JSON.stringify({
        error: 'Content not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      },
      status: 200
    });
  } catch (err) {
    console.error('💥 Error in prerender-proxy:', err);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
