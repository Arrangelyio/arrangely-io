import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { checkRateLimit, createRateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit first
  const authHeader = req.headers.get('Authorization');
  const rateLimitResult = await checkRateLimit(req, 'categorize-songs', authHeader);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter);
  }

  
  
  
  

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    
    
    // Reset all "Other" categories back to null so they can be re-categorized
    const { error: resetError } = await supabase
      .from('songs')
      .update({ category: null })
      .eq('category', 'Other')
      .eq('is_public', true);

    if (resetError) {
      console.error('Error resetting Other categories:', resetError);
    } else {
      
    }
    
    // Get all songs that don't have categories yet
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select(`
        id,
        title,
        artist,
        theme,
        is_public,
        song_sections(lyrics, section_type)
      `)
      .is('category', null)
      .eq('is_public', true)
      .limit(50); // Process in batches

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      throw songsError;
    }

    if (!songs || songs.length === 0) {
      
      return new Response(JSON.stringify({ 
        message: 'No songs found without categories',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    

    const categories = await Promise.all(
      songs.map(async (song) => {
        try {
          
          
          // Combine all lyrics from sections
          const allLyrics = song.song_sections
            ?.map((section: any) => section.lyrics)
            .filter(Boolean)
            .join('\n') || '';

          const prompt = `
You are a music categorization expert. Analyze this song and categorize it into ONE of these specific categories:

AVAILABLE CATEGORIES:
- Worship: Christian/religious worship songs, praise & worship
- Wedding: Wedding ceremony songs, first dance, reception music  
- Romance: Love songs, romantic ballads, relationship songs
- Pop: Popular mainstream music, contemporary hits
- Rock: Rock, alternative, indie rock, hard rock
- Jazz: Jazz standards, smooth jazz, swing, bebop
- Folk: Folk music, acoustic, country, americana
- Blues: Blues, R&B, soul, rhythm and blues
- Classical: Classical music, instrumental, orchestral
- Cafe/Acoustic: Perfect for cafe settings, coffee shop music, acoustic
- Party: Upbeat party music, celebration songs, dance music
- Ballad: Slow emotional songs, ballads regardless of genre
- Children: Kids songs, nursery rhymes, lullabies
- Holiday: Christmas, seasonal, holiday music
- Gospel: Gospel, spiritual music, hymns

SONG TO ANALYZE:
Title: "${song.title}"
Artist: "${song.artist || 'Unknown'}"
Theme: "${song.theme || 'None'}"
Sample Lyrics: "${allLyrics.substring(0, 400)}${allLyrics.length > 400 ? '...' : ''}"

CATEGORIZATION RULES:
1. Look for religious/spiritual content → Worship or Gospel
2. Look for wedding/love themes → Wedding or Romance  
3. Look for children's content → Children
4. Look for holiday references → Holiday
5. Consider the musical style and lyrics together
6. If the song has religious praise/worship language, choose Worship
7. If unclear, choose the closest fitting category based on title and artist
8. NEVER respond with anything other than the exact category names listed above

Respond with ONLY the category name from the list above. No explanation, just the category name.`;

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a music categorization expert. You must respond only with the exact category name from the provided list. No explanations, no additional text.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.1,
              max_tokens: 20,
            }),
          });

          if (!response.ok) {
            console.error(`OpenAI API error for song ${song.id}:`, response.statusText);
            return { id: song.id, category: 'Pop' }; // Default fallback
          }

          const data = await response.json();
          const category = data.choices[0].message.content.trim();
          
          // Validate that the category is one of our allowed categories
          const validCategories = [
            'Worship', 'Wedding', 'Romance', 'Pop', 'Rock', 'Jazz', 'Folk', 
            'Blues', 'Classical', 'Cafe/Acoustic', 'Party', 'Ballad', 
            'Children', 'Holiday', 'Gospel'
          ];
          
          const cleanCategory = category.replace(/['"]/g, '').trim();
          const finalCategory = validCategories.includes(cleanCategory) ? cleanCategory : 'Pop';
          
          
          
          return { id: song.id, category: finalCategory };
        } catch (error) {
          console.error(`Error categorizing song ${song.id}:`, error);
          return { id: song.id, category: 'Pop' }; // Default fallback
        }
      })
    );

    // Update songs with their categories
    const updatePromises = categories.map(({ id, category }) =>
      supabase
        .from('songs')
        .update({ category })
        .eq('id', id)
    );

    await Promise.all(updatePromises);

    

    // Get category counts for response
    const categoryCounts = categories.reduce((acc: any, { category }) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return new Response(JSON.stringify({
      message: 'Songs categorized successfully',
      processed: categories.length,
      categories: categoryCounts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-songs function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to categorize songs',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});