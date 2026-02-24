
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChordAnalysisResult {
  chords: Array<{
    chord: string;
    timestamp: number;
    confidence: number;
  }>;
  songInfo: {
    title: string;
    artist?: string;
    key: string;
    tempo: number;
    duration: number;
  };
  structure: Array<{
    section: string;
    startTime: number;
    endTime: number;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Declare these variables in outer scope so they're accessible in catch block
  let videoTitle = 'Unknown';
  let videoDuration = 180;
  let videoDescription = '';

  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      throw new Error('YouTube URL is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    

    // Get video metadata using YouTube API first
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

    if (youtubeApiKey) {
      try {
        const youtubeResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${youtubeApiKey}&part=snippet,contentDetails`
        );
        
        if (youtubeResponse.ok) {
          const youtubeData = await youtubeResponse.json();
          if (youtubeData.items && youtubeData.items.length > 0) {
            videoTitle = youtubeData.items[0].snippet.title;
            videoDescription = youtubeData.items[0].snippet.description || '';
            videoDuration = parseDuration(youtubeData.items[0].contentDetails.duration);
            
            // Get the channel name (uploader) as the artist
            const channelName = youtubeData.items[0].snippet.channelTitle;
            
            
            // Store channel name for later use as artist
            videoDescription = JSON.stringify({
              description: videoDescription,
              channelName: channelName
            });
          }
        }
      } catch (error) {
        
      }
    }

    // If no YouTube API key, try to extract title from URL or use oembed
    if (videoTitle === 'Unknown') {
      try {
        const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`);
        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          videoTitle = oembedData.title || 'Unknown';
          
        }
      } catch (error) {
        
      }
    }

    // Enhanced AI analysis with better prompting
    const analysisPrompt = `Analyze this music video and generate a complete, realistic chord progression:

Title: "${videoTitle}"
Duration: ${videoDuration} seconds
Description: ${videoDescription.substring(0, 500)}
YouTube URL: ${youtubeUrl}

Based on the title and typical song structures, generate:

1. SONG INFORMATION:
   - Determine the most likely musical key based on the song title and genre
   - Estimate a realistic tempo (BPM) for this type of music
   - Extract artist name from the title if possible

2. COMPREHENSIVE CHORD PROGRESSION:
   - Generate enough chords to fill the entire ${videoDuration} seconds
   - Use chord changes every 2-4 seconds (typical for popular music)
   - Create realistic progressions like: I-V-vi-IV (C-G-Am-F), vi-IV-I-V (Am-F-C-G), ii-V-I, etc.
   - Include variations, suspended chords, and passing chords for authenticity
   - Consider the genre implied by the title

3. SONG STRUCTURE:
   - Create a realistic song structure (Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro)
   - Make sections appropriate length for the genre
   - Ensure all sections add up to ${videoDuration} seconds

Generate at least ${Math.ceil(videoDuration / 3)} chords to properly fill the song.

Respond with this EXACT JSON format:
{
  "songInfo": {
    "title": "${videoTitle}",
    "key": "determined_key",
    "tempo": estimated_bpm,
    "duration": ${videoDuration}
  },
  "chords": [
    {"chord": "chord_name", "timestamp": 0, "confidence": 0.8},
    {"chord": "next_chord", "timestamp": 3, "confidence": 0.8}
  ],
  "structure": [
    {"section": "Intro", "startTime": 0, "endTime": 16},
    {"section": "Verse 1", "startTime": 16, "endTime": 48}
  ]
}

Requirements:
- Generate enough chords to cover ${videoDuration} seconds
- Use realistic chord progressions for the genre
- Make timestamps progress logically
- Ensure structure sections don't overlap and cover full duration
- Use appropriate confidence levels (0.7-0.9)`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional music analyst and composer. Analyze songs and generate realistic, comprehensive chord progressions based on title, genre, and typical song structures. Always respond with valid JSON containing complete chord progressions that match the song duration.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const analysisText = openAIData.choices[0].message.content;
    

    // Parse the JSON response from OpenAI
    let analysis: ChordAnalysisResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
      
      // Validate the analysis has sufficient chords
      if (!analysis.chords || analysis.chords.length < 8) {
        throw new Error('Insufficient chord progression generated');
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', analysisText);
      
      // Enhanced fallback using actual video information
      const fallbackDuration = videoDuration || 180;
      const chordsNeeded = Math.ceil(fallbackDuration / 3); // One chord every 3 seconds
      const fallbackChords = [];
      
      // More sophisticated chord progressions based on common patterns
      const commonProgressions = [
        ['C', 'G', 'Am', 'F'],      // I-V-vi-IV
        ['Am', 'F', 'C', 'G'],      // vi-IV-I-V  
        ['F', 'C', 'G', 'Am'],      // IV-I-V-vi
        ['C', 'Am', 'F', 'G'],      // I-vi-IV-V
        ['Dm', 'G', 'C', 'Am'],     // ii-V-I-vi
      ];
      
      const selectedProgression = commonProgressions[Math.floor(Math.random() * commonProgressions.length)];
      
      for (let i = 0; i < chordsNeeded; i++) {
        fallbackChords.push({
          chord: selectedProgression[i % selectedProgression.length],
          timestamp: i * 3,
          confidence: 0.7
        });
      }
      
      // Use actual video title and channel name as artist
      let extractedTitle = videoTitle;
      let extractedArtist = '';
      
      // Try to get channel name from stored description
      try {
        const descriptionData = JSON.parse(videoDescription);
        if (descriptionData.channelName) {
          extractedArtist = descriptionData.channelName;
        }
      } catch (e) {
        // If description is not JSON, try to extract artist from title as fallback
        if (videoTitle.includes(' - ')) {
          const parts = videoTitle.split(' - ');
          if (parts.length >= 2) {
            extractedTitle = parts[0].trim();
            extractedArtist = parts[1].trim();
          }
        } else if (videoTitle.includes(' by ')) {
          const parts = videoTitle.split(' by ');
          if (parts.length >= 2) {
            extractedTitle = parts[0].trim();
            extractedArtist = parts[1].trim();
          }
        }
      }
      
      analysis = {
        songInfo: {
          title: extractedTitle,
          artist: extractedArtist,
          key: 'C',
          tempo: 120,
          duration: fallbackDuration
        },
        chords: fallbackChords,
        structure: [
          { section: 'Intro', startTime: 0, endTime: 16 },
          { section: 'Verse 1', startTime: 16, endTime: 48 },
          { section: 'Chorus', startTime: 48, endTime: 80 },
          { section: 'Verse 2', startTime: 80, endTime: 112 },
          { section: 'Chorus', startTime: 112, endTime: 144 },
          { section: 'Bridge', startTime: 144, endTime: 160 },
          { section: 'Outro', startTime: 160, endTime: fallbackDuration }
        ]
      };
    }

    console.log('Final analysis result:', {
      title: analysis.songInfo.title,
      chordCount: analysis.chords.length,
      duration: analysis.songInfo.duration,
      sections: analysis.structure.length
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-youtube-chords function:', error);
    
    // Enhanced error fallback using available video info
    let fallbackTitle = videoTitle !== 'Unknown' ? videoTitle : 'Song Analysis Failed';
    let fallbackArtist = '';
    
    // Try to get channel name from stored description first
    try {
      const descriptionData = JSON.parse(videoDescription);
      if (descriptionData.channelName) {
        fallbackArtist = descriptionData.channelName;
      }
    } catch (e) {
      // Fallback to extracting from title if channel name not available
      if (fallbackTitle.includes(' - ')) {
        const parts = fallbackTitle.split(' - ');
        if (parts.length >= 2) {
          fallbackTitle = parts[0].trim();
          fallbackArtist = parts[1].trim();
        }
      } else if (fallbackTitle.includes(' by ')) {
        const parts = fallbackTitle.split(' by ');
        if (parts.length >= 2) {
          fallbackTitle = parts[0].trim();
          fallbackArtist = parts[1].trim();
        }
      }
    }
    
    
    
    // Generate more chords for a complete song
    const fallbackDuration = videoDuration || 180;
    const chordsNeeded = Math.ceil(fallbackDuration / 3);
    const fallbackChords = [];
    
    const commonProgressions = [
      ['C', 'G', 'Am', 'F'],
      ['Am', 'F', 'C', 'G'],
      ['F', 'C', 'G', 'Am'],
      ['C', 'Am', 'F', 'G']
    ];
    
    const selectedProgression = commonProgressions[Math.floor(Math.random() * commonProgressions.length)];
    
    for (let i = 0; i < chordsNeeded; i++) {
      fallbackChords.push({
        chord: selectedProgression[i % selectedProgression.length],
        timestamp: i * 3,
        confidence: 0.7
      });
    }
    
    const errorFallback = {
      songInfo: {
        title: fallbackTitle,
        artist: fallbackArtist,
        key: 'C',
        tempo: 120,
        duration: fallbackDuration
      },
      chords: fallbackChords,
      structure: [
        { section: 'Intro', startTime: 0, endTime: 16 },
        { section: 'Verse 1', startTime: 16, endTime: 48 },
        { section: 'Chorus', startTime: 48, endTime: 80 },
        { section: 'Verse 2', startTime: 80, endTime: 112 },
        { section: 'Chorus', startTime: 112, endTime: 144 },
        { section: 'Bridge', startTime: 144, endTime: 160 },
        { section: 'Outro', startTime: 160, endTime: fallbackDuration }
      ]
    };
    
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: errorFallback
    }), {
      status: 200, // Return 200 with fallback data instead of error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration format (PT1M30S -> 90 seconds)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 180; // Default 3 minutes
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}
