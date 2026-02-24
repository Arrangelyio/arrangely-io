// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import GestureDetection from './GestureDetection';
import FeatureTour from './tour/FeatureTour';
import { Play, Pause, SkipBack, SkipForward, Minus, Plus } from 'lucide-react';

interface PerformanceSession {
  id: string;
  session_name: string;
  song_title: string;
  artist?: string;
  key: string;
  tempo: number;
  active_section: string;
  sections: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

const PerformanceController: React.FC = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<PerformanceSession | null>(null);
  const [gestureMode, setGestureMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'vocalist' | 'guitarist' | 'keyboardist' | 'bassist' | 'drummer' | null>(null);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('musical_role')
        .eq('user_id', user.id)
        .single();

      if (profile?.musical_role) {
        setUserRole(profile.musical_role as any);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const defaultSections = ['intro', 'verse', 'chorus', 'bridge', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];

  useEffect(() => {
    initializeSession();
    setupRealtimeSubscription();
    
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const initializeSession = async () => {
    try {
      setLoading(true);
      
      // Create a default session
      const { data: newSession, error } = await supabase
        .from('performance_sessions')
        .insert({
          session_name: 'Gesture Performance Session',
          song_title: 'Man In The Mirror',
          artist: 'Michael Jackson',
          key: 'G',
          tempo: 104,
          active_section: 'intro',
          sections: defaultSections,
          created_by: null // Allow anonymous sessions for gesture performance
        })
        .select()
        .single();

      if (error) throw error;
      
      // Convert sections from Json to string array if needed
      if (newSession.sections && typeof newSession.sections !== 'object') {
        newSession.sections = JSON.parse(newSession.sections as string);
      }
      
      setSession(newSession as PerformanceSession);
      toast({
        title: "Session Created",
        description: "Performance session is ready!",
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('performance-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'performance_sessions'
        },
        (payload) => {
          
          const updatedSession = payload.new as any;
          // Convert sections from Json to string array
          if (updatedSession.sections && typeof updatedSession.sections !== 'object') {
            updatedSession.sections = JSON.parse(updatedSession.sections);
          }
          setSession(updatedSession as PerformanceSession);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateSession = async (updates: Partial<PerformanceSession>) => {
    if (!session) {
      console.error('Cannot update session - no session available');
      return;
    }
    
    
    
    
    
    try {
      const { error } = await supabase
        .from('performance_sessions')
        .update(updates)
        .eq('id', session.id);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      
      
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive",
      });
    }
  };

  const changeSection = (direction: 'next' | 'previous') => {
    if (!session) {
      console.error('Cannot change section - no session available');
      return;
    }
    
    
    
    
    
    
    const currentIndex = session.sections.indexOf(session.active_section);
    
    
    let newIndex;
    
    if (direction === 'next') {
      newIndex = Math.min(currentIndex + 1, session.sections.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    
    
    const newSection = session.sections[newIndex];
    
    
    updateSession({ active_section: newSection });
  };

  const changeTempo = (delta: number) => {
    if (!session) return;
    
    const newTempo = Math.max(60, Math.min(200, session.tempo + delta));
    updateSession({ tempo: newTempo });
  };

  const handleGestureDetected = (gesture: string) => {
    
    
    
    
    switch (gesture) {
      case 'right-eye-blink':
        
        changeSection('next');
        toast({
          title: "Next Section",
          description: "Right eye blink detected",
        });
        break;
      case 'left-eye-blink':
        
        changeSection('previous');
        toast({
          title: "Previous Section",
          description: "Left eye blink detected",
        });
        break;
      case 'point-left':
        
        changeTempo(-5);
        toast({
          title: "Tempo Down",
          description: "Point left detected",
        });
        break;
      case 'point-right':
        
        changeTempo(5);
        toast({
          title: "Tempo Up",
          description: "Point right detected",
        });
        break;
      default:
        
    }
  };

  const handleSectionClick = (section: string) => {
    updateSession({ active_section: section });
  };

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading performance session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <FeatureTour userRole={userRole} />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Gesture Control Toggle */}
          <Card data-tour="gesture-control">
            <CardHeader>
              <CardTitle className="text-lg">Gesture Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={gestureMode} 
                  onCheckedChange={setGestureMode}
                  id="gesture-mode"
                />
                <label htmlFor="gesture-mode" className="text-sm font-medium">
                  {gestureMode ? 'ON' : 'OFF'}
                </label>
              </div>
              
              {gestureMode && (
                <GestureDetection 
                  onGestureDetected={handleGestureDetected}
                  isEnabled={gestureMode}
                />
              )}
            </CardContent>
          </Card>

          {/* Tempo Controls */}
          <Card data-tour="tempo-control">
            <CardHeader>
              <CardTitle className="text-lg">Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => changeTempo(-5)}
                  disabled={session.tempo <= 60}
                >
                  <Minus className="h-4 w-4" />
                  5
                </Button>
                <div className="text-2xl font-bold">{session.tempo}</div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => changeTempo(5)}
                  disabled={session.tempo >= 200}
                >
                  <Plus className="h-4 w-4" />
                  5
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">BPM</p>
            </CardContent>
          </Card>

          {/* Section Controls */}
          <Card data-tour="sections">
            <CardHeader>
              <CardTitle className="text-lg">Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {session.sections.map((section, index) => (
                  <Button
                    key={`${section}-${index}`}
                    variant={session.active_section === section ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSectionClick(section)}
                    className="capitalize"
                  >
                    {section}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Playback Controls */}
          <Card data-tour="playback">
            <CardHeader>
              <CardTitle className="text-lg">Playback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => changeSection('previous')}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => changeSection('next')}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Panel - Performance Display */}
        <div className="lg:col-span-3">
          <Card className="h-full" data-tour="main-display">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">{session.song_title}</CardTitle>
                  {session.artist && (
                    <p className="text-muted-foreground">{session.artist}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Badge variant="outline">Key: {session.key}</Badge>
                  <Badge variant="outline">{session.tempo} BPM</Badge>
                  <Badge variant="outline">4/4</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="text-center space-y-8">
                {/* Current Section Display */}
                <div className="py-16">
                  <h1 className="text-6xl font-bold capitalize text-primary mb-4">
                    {session.active_section}
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    Current Section
                  </p>
                </div>

                {/* Chord Progression Display */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Chord Progression</h3>
                  <div className="grid grid-cols-4 gap-4 text-lg font-mono">
                    <div className="p-4 border rounded-lg">G</div>
                    <div className="p-4 border rounded-lg">D/F#</div>
                    <div className="p-4 border rounded-lg">Em7</div>
                    <div className="p-4 border rounded-lg">D</div>
                  </div>
                </div>

                {/* Performance Notes */}
                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Performance Notes</h4>
                  <p className="text-sm text-muted-foreground">
                    {session.active_section === 'intro' && "Start with gentle strumming, build energy gradually"}
                    {session.active_section === 'verse' && "Keep it smooth and controlled, let the vocals shine"}
                    {session.active_section === 'chorus' && "Full energy! Drive the rhythm and emphasize the melody"}
                    {session.active_section === 'bridge' && "Dynamic shift - create contrast from the chorus"}
                    {session.active_section === 'outro' && "Gradual fade or strong finish - your choice!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PerformanceController;