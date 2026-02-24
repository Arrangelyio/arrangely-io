import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Volume2, 
  ChevronLeft,
  Maximize,
  SkipBack,
  SkipForward
} from "lucide-react";
import Navigation from "@/components/ui/navigation";

interface PracticeModeProps {
  songTitle?: string;
  artist?: string;
}

const PracticeMode = ({ 
  songTitle = "Amazing Grace", 
  artist = "John Newton" 
}: PracticeModeProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(240); // 4 minutes
  const [clickTrackEnabled, setClickTrackEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState([100]);
  const [volume, setVolume] = useState([80]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownValue, setCountdownValue] = useState(4);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [currentSection, setCurrentSection] = useState("Verse 1");

  const intervalRef = useRef<NodeJS.Timeout>();

  // Enhanced arrangement with proper formatting for musical sections
  const arrangement = [
    {
      section: "Intro",
      chords: JSON.stringify({
        chordProgression: "| G . C/G . |\n| G . C/G . |\n| G . C . |\n| Em . F . |",
        instrumentCues: "Guitar arpeggios, soft entry",
        barCount: 4
      }),
      lyrics: "",
      timestamp: 0
    },
    {
      section: "Verse 1",
      chords: "G       G7        C         G\nAmazing grace, how sweet the sound\nG       G7        C         G\nThat saved a wretch like me",
      lyrics: "Amazing grace, how sweet the sound\nThat saved a wretch like me",
      timestamp: 8
    },
    {
      section: "Verse 2",
      chords: "G       G7        C         G\nI once was lost, but now am found\nG       G7        C         G\nWas blind but now I see",
      lyrics: "I once was lost, but now am found\nWas blind but now I see",
      timestamp: 32
    },
    {
      section: "Chorus",
      chords: "C       G         D         G\n'Twas grace that taught my heart to fear\nC       G         D         G\nAnd grace my fears relieved",
      lyrics: "'Twas grace that taught my heart to fear\nAnd grace my fears relieved",
      timestamp: 56
    },
    {
      section: "Interlude",
      chords: JSON.stringify({
        chordProgression: "| Em . C . |\n| G/B . D . |\n| Em . C . |\n| G/B . D . E |",
        instrumentCues: "Building intensity, full band",
        barCount: 4
      }),
      lyrics: "",
      timestamp: 80
    },
    {
      section: "Bridge",
      chords: "Em      C         G         D\nHow precious did that grace appear\nEm      C         G         D\nThe hour I first believed",
      lyrics: "How precious did that grace appear\nThe hour I first believed",
      timestamp: 104
    },
    {
      section: "Outro",
      chords: JSON.stringify({
        chordProgression: "| G . . . |\n| C . . . |\n| G . . . |\n| . . . . |",
        instrumentCues: "Slow fade, acoustic guitar only",
        barCount: 4
      }),
      lyrics: "",
      timestamp: 128
    }
  ];

  const startCountdown = () => {
    setCountdownActive(true);
    setCountdownValue(4);
    
    const countdownInterval = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setCountdownActive(false);
          setIsPlaying(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const togglePlayPause = () => {
    if (!isPlaying && !countdownActive) {
      startCountdown();
    } else {
      setIsPlaying(!isPlaying);
      setCountdownActive(false);
    }
  };

  const resetSong = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCountdownActive(false);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, duration]);

  // Update current section based on timestamp
  useEffect(() => {
    const current = arrangement.find((section, index) => {
      const nextSection = arrangement[index + 1];
      return currentTime >= section.timestamp && 
             (!nextSection || currentTime < nextSection.timestamp);
    });
    if (current) {
      setCurrentSection(current.section);
    }
  }, [currentTime]);

  const getCurrentSection = () => {
    return arrangement.find(section => section.section === currentSection);
  };

  const formatSectionContent = (section: any) => {
    if (!section) return null;

    // Check if this is a musical section (intro, outro, interlude)
    const isMusicalSection = ['intro', 'outro', 'interlude', 'instrumental'].some(type => 
      section.section.toLowerCase().includes(type)
    );

    // Handle JSON chord progressions for musical sections
    if (section.chords && section.chords.startsWith('{') && section.chords.endsWith('}')) {
      try {
        const parsedContent = JSON.parse(section.chords);
        if (parsedContent.chordProgression) {
          const formattedProgression = parsedContent.chordProgression
            .split('\n')
            .map(line => {
              // Handle bar notation like "| E . G#m . |"
              if (line.includes('|')) {
                return line
                  .replace(/\s+/g, ' ') // normalize spaces
                  .replace(/\.\s*/g, '  .  ') // add proper spacing around dots
                  .replace(/\|\s*/g, '| ') // add space after opening bar
                  .replace(/\s*\|/g, ' |'); // add space before closing bar
              }
              return line;
            })
            .join('\n');

          return (
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                <div className="text-primary text-sm font-semibold mb-2 uppercase tracking-wide">
                  Chord Progression
                </div>
                <pre className="font-mono text-lg font-bold text-primary leading-relaxed whitespace-pre-wrap" style={{
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  letterSpacing: '2px'
                }}>
                  {formattedProgression}
                </pre>
              </div>
              {parsedContent.instrumentCues && (
                <div className="bg-muted/30 p-3 rounded border">
                  <div className="text-muted-foreground text-sm font-semibold mb-1 uppercase tracking-wide">
                    Instrument Cues
                  </div>
                  <p className="italic text-sm text-muted-foreground">
                    {parsedContent.instrumentCues}
                  </p>
                </div>
              )}
              {parsedContent.barCount && (
                <div className="text-center">
                  <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm">
                    {parsedContent.barCount} bars
                  </span>
                </div>
              )}
            </div>
          );
        }
      } catch (e) {
        // Continue with regular text processing
      }
    }

    // For musical sections without JSON, format chord progressions properly
    if (isMusicalSection && section.chords) {
      const formattedContent = section.chords
        .split('\n')
        .map(line => {
          // Handle bar notation like "| E . G#m . |"
          if (line.includes('|')) {
            return line
              .replace(/\s+/g, ' ') // normalize spaces
              .replace(/\.\s*/g, '  .  ') // add proper spacing around dots
              .replace(/\|\s*/g, '| ') // add space after opening bar
              .replace(/\s*\|/g, ' |'); // add space before closing bar
          }
          return line;
        })
        .join('\n');

      return (
        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
          <div className="text-primary text-sm font-semibold mb-2 uppercase tracking-wide">
            {section.section} - Chord Progression
          </div>
          <pre className="font-mono text-lg font-bold text-primary leading-relaxed whitespace-pre-wrap" style={{
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            letterSpacing: '2px'
          }}>
            {formattedContent}
          </pre>
        </div>
      );
    }

    // Regular chord and lyric sections
    if (section.chords && section.lyrics) {
      return (
        <div className="space-y-2">
          <div className="bg-muted/30 p-4 rounded">
            <pre className="font-mono text-lg leading-relaxed whitespace-pre-line" style={{
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              letterSpacing: '0.5px'
            }}>
              {section.chords}
            </pre>
          </div>
        </div>
      );
    }

    return (
      <div className="text-muted-foreground italic">
        No content available
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Exit Fullscreen
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bold">{songTitle}</h1>
              <p className="text-muted-foreground">{artist}</p>
            </div>
            <div className="w-32" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {countdownActive ? (
            <div className="text-center">
              <div className="text-8xl font-bold text-primary mb-4">
                {countdownValue}
              </div>
              <p className="text-xl text-muted-foreground">Get ready...</p>
            </div>
          ) : (
            <div className="max-w-4xl w-full">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-6 capitalize">{currentSection}</h2>
              </div>
              
              <div className="text-center">
                {formatSectionContent(getCurrentSection())}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={resetSong}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              onClick={togglePlayPause}
              className="px-8"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4 max-w-md mx-auto">
            <Progress value={(currentTime / duration) * 100} className="mb-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" asChild>
              <a href="/library" className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to Library
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{songTitle}</h1>
              <p className="text-muted-foreground">{artist}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Practice Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Countdown Overlay */}
              {countdownActive && (
                <Card className="p-8 text-center border-2 border-primary">
                  <div className="text-6xl font-bold text-primary mb-4">
                    {countdownValue}
                  </div>
                  <p className="text-lg">Get ready to play...</p>
                </Card>
              )}

              {/* Current Section Display */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl capitalize">{currentSection}</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Maximize className="h-4 w-4 mr-2" />
                      Fullscreen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {formatSectionContent(getCurrentSection())}
                </CardContent>
              </Card>

              {/* Audio Controls */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button variant="outline" onClick={resetSong}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="lg" 
                        onClick={togglePlayPause}
                        className="px-8"
                      >
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </Button>
                      <Button variant="outline">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={(currentTime / duration) * 100} />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Practice Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Click Track</label>
                      <Switch 
                        checked={clickTrackEnabled}
                        onCheckedChange={setClickTrackEnabled}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enable metronome click
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Playback Speed</label>
                    <Slider
                      value={playbackSpeed}
                      onValueChange={setPlaybackSpeed}
                      max={150}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {playbackSpeed[0]}% speed
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <label className="text-sm font-medium">Volume</label>
                    </div>
                    <Slider
                      value={volume}
                      onValueChange={setVolume}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Loop Section</label>
                      <Switch 
                        checked={loopEnabled}
                        onCheckedChange={setLoopEnabled}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Repeat current section
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Song Structure */}
              <Card>
                <CardHeader>
                  <CardTitle>Song Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {arrangement.map((section, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          section.section === currentSection
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                        onClick={() => setCurrentTime(section.timestamp)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{section.section}</span>
                          <span className="text-xs opacity-70">
                            {formatTime(section.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;
