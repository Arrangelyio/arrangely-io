import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeChordSuggestionsProps {
  currentTime: number;
  songKey: string;
  onChordSuggestion: (chord: string) => void;
}

const RealtimeChordSuggestions = ({
  currentTime,
  songKey,
  onChordSuggestion
}: RealtimeChordSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [realtimeSuggestions, setRealtimeSuggestions] = useState<string[]>([]);

  // Get chord progressions based on key and time
  const getContextualSuggestions = (key: string, time: number): string[] => {
    const progressions: Record<string, string[][]> = {
      'C': [
        ['C', 'Am', 'F', 'G'], // I-vi-IV-V
        ['C', 'F', 'Am', 'G'], // I-IV-vi-V
        ['Am', 'F', 'C', 'G'], // vi-IV-I-V
        ['F', 'G', 'Am', 'F'], // IV-V-vi-IV
      ],
      'G': [
        ['G', 'Em', 'C', 'D'],
        ['G', 'C', 'Em', 'D'],
        ['Em', 'C', 'G', 'D'],
        ['C', 'D', 'Em', 'C'],
      ],
      'D': [
        ['D', 'Bm', 'G', 'A'],
        ['D', 'G', 'Bm', 'A'],
        ['Bm', 'G', 'D', 'A'],
        ['G', 'A', 'Bm', 'G'],
      ],
      'A': [
        ['A', 'F#m', 'D', 'E'],
        ['A', 'D', 'F#m', 'E'],
        ['F#m', 'D', 'A', 'E'],
        ['D', 'E', 'F#m', 'D'],
      ],
      'E': [
        ['E', 'C#m', 'A', 'B'],
        ['E', 'A', 'C#m', 'B'],
        ['C#m', 'A', 'E', 'B'],
        ['A', 'B', 'C#m', 'A'],
      ],
      'F': [
        ['F', 'Dm', 'Bb', 'C'],
        ['F', 'Bb', 'Dm', 'C'],
        ['Dm', 'Bb', 'F', 'C'],
        ['Bb', 'C', 'Dm', 'Bb'],
      ]
    };

    const keyProgressions = progressions[key] || progressions['C'];
    const timeIndex = Math.floor(time / 8) % keyProgressions.length; // Change every 8 seconds
    const progressionIndex = Math.floor(time / 2) % 4; // Change every 2 seconds within progression
    
    return keyProgressions[timeIndex] || keyProgressions[0];
  };

  // Update suggestions based on current time
  useEffect(() => {
    const contextualSuggestions = getContextualSuggestions(songKey, currentTime);
    setSuggestions(contextualSuggestions);
  }, [currentTime, songKey]);

  // Set up Supabase Realtime for collaborative chord suggestions
  useEffect(() => {
    const channel = supabase
      .channel('chord-suggestions')
      .on('broadcast', { event: 'chord-suggestion' }, (payload) => {
        if (payload.payload?.chord && payload.payload?.timestamp) {
          const now = Date.now();
          // Only show suggestions from the last 5 seconds
          if (now - payload.payload.timestamp < 5000) {
            setRealtimeSuggestions(prev => {
              const newSuggestions = [...prev, payload.payload.chord];
              // Keep only last 3 suggestions
              return newSuggestions.slice(-3);
            });
            
            // Clear suggestion after 3 seconds
            setTimeout(() => {
              setRealtimeSuggestions(prev => 
                prev.filter(chord => chord !== payload.payload.chord)
              );
            }, 3000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const broadcastChordSuggestion = (chord: string) => {
    supabase.channel('chord-suggestions').send({
      type: 'broadcast',
      event: 'chord-suggestion',
      payload: {
        chord,
        timestamp: Date.now()
      }
    });
  };

  const handleChordClick = (chord: string) => {
    onChordSuggestion(chord);
    broadcastChordSuggestion(chord);
  };

  return (
    <div className="space-y-3">
      {/* AI Contextual Suggestions */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4 text-primary" />
            Smart Suggestions
            <Badge variant="secondary" className="text-xs">Key of {songKey}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((chord, index) => (
              <Button
                key={`${chord}-${index}`}
                variant="outline"
                size="sm"
                onClick={() => handleChordClick(chord)}
                className={`h-8 px-3 text-xs transition-all ${
                  index === Math.floor(currentTime / 2) % suggestions.length
                    ? 'border-primary bg-primary/10'
                    : ''
                }`}
              >
                {chord}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Collaborative Suggestions */}
      {realtimeSuggestions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Live Suggestions
              <Badge variant="outline" className="text-xs border-orange-300">
                Collaborative
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {realtimeSuggestions.map((chord, index) => (
                <Button
                  key={`realtime-${chord}-${index}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChordClick(chord)}
                  className="h-8 px-3 text-xs border-orange-300 hover:bg-orange-100 animate-pulse"
                >
                  {chord}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealtimeChordSuggestions;
