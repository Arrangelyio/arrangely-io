import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ include subcategory in destructuring
    const { category, tier, count = 5, subcategory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Map category names to display names
    const categoryNames: Record<string, string> = {
      'instrument': 'Musical Instruments',
      'theory': 'Music Theory',
      'production': 'Music Production',
      'worship_leading': 'Worship Leading',
      'songwriting': 'Song Writing'
    };

    // Category examples (same as before)
    const categoryExamples: Record<string, any> = {
      'instrument': {
        'drums': {
          beginner: [
            "What is the correct way to hold drumsticks?",
            "Which part of the drum set keeps the steady beat?",
            "What is the function of the hi-hat in a basic drum groove?"
          ],
          intermediate: [
            "How do you properly tune a snare drum?",
            "What is the Moeller technique used for?",
            "How can you play ghost notes effectively?"
          ],
          advanced: [
            "How do you maintain even dynamics during double-stroke rolls?",
            "What drumming techniques are essential for jazz drummers?",
            "How do you adjust your grip for different drum styles?"
          ],
          master: [
            "How do professional drummers achieve consistent tone during live performance?",
            "What techniques enhance precision in complex polyrhythms?",
            "How do you adapt drumming style for studio vs live settings?"
          ]
        },
        'guitar': {
          beginner: ["Which string is the thickest on a guitar?", "What is a guitar pick used for?"],
          intermediate: ["What is the difference between alternate picking and economy picking?"],
          advanced: ["How do you use modes in guitar improvisation?"],
          master: ["How do you arrange chord voicings for solo guitar performance?"]
        },
        'bass': {
          beginner: ["What does a bass guitar primarily do in a band?"],
          intermediate: ["What is the function of walking bass lines?"],
          advanced: ["How do you use slap and pop techniques effectively?"],
          master: ["How do advanced bassists lock in rhythmically with drummers in complex meters?"]
        },
        'saxophone': {
          beginner: ["What is embouchure in saxophone playing?"],
          intermediate: ["How do you properly use vibrato on the saxophone?"],
          advanced: ["How do you adjust mouthpiece and reed for tone variation?"],
          master: ["How do you interpret altissimo notes in jazz improvisation?"]
        },
        'vocal': {
          beginner: ["What is diaphragm breathing?"],
          intermediate: ["How do you sing in tune with accompaniment?"],
          advanced: ["How do you control vibrato for stylistic effect?"],
          master: ["How do you maintain vocal health during frequent performances?"]
        },
        'piano': {
          beginner: ["Which hand usually plays the melody on the piano?"],
          intermediate: ["How do you play arpeggios smoothly?"],
          advanced: ["How do you use pedaling to shape musical phrasing?"],
          master: ["How do concert pianists prepare repertoire for performance?"]
        }
      },
      'theory': { /* ... unchanged ... */ },
      'production': { /* ... unchanged ... */ },
      'songwriting': { /* ... unchanged ... */ },
      'worship_leading': { /* ... unchanged ... */ }
    };

    // Determine which examples to use
    let examples;
    if (category === 'instrument' && subcategory) {
      // ✅ if instrument and subcategory specified
      examples = categoryExamples['instrument'][subcategory]?.[tier.toLowerCase()] || [];
    } else {
      examples = categoryExamples[category]?.[tier.toLowerCase()] || [];
    }
    const categoryName = subcategory
      ? `${subcategory.charAt(0).toUpperCase() + subcategory.slice(1)} (${categoryNames[category]})`
      : categoryNames[category] || category;

    const exampleText = Array.isArray(examples) ? examples.join('\n- ') : examples;

    // Prohibitions (same as before)
    const strictProhibitions: Record<string, string[]> = {
      'worship_leading': [
        'NO questions about playing instruments (guitar, piano, drums, saxophone, violin, etc.)',
        'NO questions about music theory (scales, chords, key signatures, intervals)',
        'NO questions about recording or production techniques',
        'NO questions about songwriting or composing',
        'NO questions about instrument maintenance or equipment',
        'ONLY questions about: leading worship services, managing worship teams, selecting songs, engaging congregation, spiritual leadership, service planning'
      ],
      'instrument': [
        'NO questions about worship leading or spiritual matters',
        'NO questions about recording or production',
        'NO questions about songwriting',
        'ONLY questions about: playing instruments, technique, fingering, posture, practice methods, instrument care'
      ],
      'theory': [ /* ... unchanged ... */ ],
      'production': [ /* ... unchanged ... */ ],
      'songwriting': [ /* ... unchanged ... */ ]
    };

    const prohibitionList = strictProhibitions[category] || [];
    const prohibitionText = prohibitionList.join('\n');

    // SYSTEM PROMPT
    const systemPrompt = `
You are a specialized ${categoryName} education expert. You MUST create quiz questions ONLY about ${categoryName}.

🚫 ABSOLUTE PROHIBITIONS:
${prohibitionText}

✅ EXAMPLES for ${tier.toUpperCase()}-LEVEL ${categoryName} QUESTIONS:
- ${exampleText}

🧩 CATEGORY CONTEXT: ${categoryName}

🎯 DIFFICULTY LEVEL - ${tier.toUpperCase()}:
${tier === 'beginner'
  ? 'Fundamental basics for new learners.'
  : tier === 'intermediate'
  ? 'Practical scenarios and moderate challenges.'
  : tier === 'advanced'
  ? 'Professional techniques and deeper understanding.'
  : 'Expert mastery and leadership-level questions.'}

📝 FORMAT REQUIREMENTS:
- Exactly ${count} multiple-choice questions
- Each with 4 options and 1 correct answer
- JSON array only (no markdown, no explanation)
`;

    const userPrompt = `Generate ${count} questions for ${tier}-level ${categoryName}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    const jsonText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const questions = JSON.parse(jsonText);

    const formatted = questions.map((q: any) => ({
      question: q.question,
      type: 'multiple_choice',
      options: q.options,
      correct_answer: q.correct_answer
    }));

    return new Response(JSON.stringify({ questions: formatted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in generate-quiz-questions:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
