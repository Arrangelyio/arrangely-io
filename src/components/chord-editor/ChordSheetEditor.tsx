import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import HorizontalTimeline from './HorizontalTimeline';
import FloatingToolbar from './FloatingToolbar';
import BottomChordPopup from './BottomChordPopup';
import RealtimeChordSuggestions from './RealtimeChordSuggestions';
import ChordDetector from './ChordDetector';

interface ChordSheetSection {
  name: string;
  start_time: string;
  end_time: string;
  bars: number;
  bar_structure: string;
  rows?: number; // New property for vertical rows
}

interface ChordSheetData {
  tempo: number;
  time_signature: string;
  sections: ChordSheetSection[];
  metadata: {
    title: string;
    artist: string;
    key: string;
    duration: string;
    confidence: number;
  };
}

interface ChordSheetEditorProps {
  data: ChordSheetData;
  youtubeUrl?: string;
}

interface SelectedBar {
  sectionIndex: number;
  barIndex: number;
}

const ChordSheetEditor = ({ data: initialData, youtubeUrl }: ChordSheetEditorProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [chords, setChords] = useState<Map<string, string>>(new Map());
  const [currentBarInfo, setCurrentBarInfo] = useState<{sectionIndex: number, barIndex: number} | null>(null);
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [data, setData] = useState<ChordSheetData>(initialData);
  const [selectedBar, setSelectedBar] = useState<SelectedBar | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoChordDetection, setAutoChordDetection] = useState(true);
  const [totalBars, setTotalBars] = useState(0);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioAnalyzerRef = useRef<AnalyserNode | null>(null);

  // Common chord suggestions based on key
  const getChordSuggestions = (key: string): string[] => {
    const chordMap: Record<string, string[]> = {
      'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
      'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
      'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
      'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
      'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
      'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']
    };
    return chordMap[key] || chordMap['C'];
  };

  const chordSuggestions = getChordSuggestions(data.metadata.key);

  // Calculate total bars
  useEffect(() => {
    const total = data.sections.reduce((sum, section) => sum + section.bars, 0);
    setTotalBars(total);
  }, [data.sections]);

  // Handle auto-detected chords with automatic insertion
  const handleAutoChordDetected = (chord: string, sectionIndex: number, barIndex: number) => {
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    
    // Find first available beat in the bar for automatic insertion
    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
      const key = getCellKey(sectionIndex, barIndex, beatIndex);
      if (!chords.has(key)) {
        setChords(prev => new Map(prev.set(key, chord)));
        setHasUnsavedChanges(true);
        
        if (!isMobile) {
          toast({
            title: "Auto-detected Chord",
            description: `Added ${chord} to ${data.sections[sectionIndex]?.name || `Section ${sectionIndex + 1}`}, Bar ${barIndex + 1}`,
            duration: 2000
          });
        }
        break;
      }
    }
  };

  // YouTube Player Setup
  useEffect(() => {
    if (!youtubeUrl) return;

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);

    window.onYouTubeIframeAPIReady = () => {
      const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (!videoId) return;

      playerRef.current = new window.YT.Player('youtube-player', {
        height: isMobile ? '180' : '200',
        width: isMobile ? '320' : '356',
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: () => {
            toast({
              title: "Video Ready",
              description: isMobile ? "Tap bars to add chords!" : "Click on bars to add chords while playing!"
            });
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startTimeTracking();
            } else {
              setIsPlaying(false);
              stopTimeTracking();
            }
          }
        }
      });
    };

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [youtubeUrl, isMobile]);

  // MIDI Setup
  useEffect(() => {
    const setupMIDI = async () => {
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        const inputs = Array.from(midiAccess.inputs.values());
        
        if (inputs.length > 0) {
          setMidiEnabled(true);
          inputs.forEach(input => {
            input.onmidimessage = handleMIDIMessage;
          });
          if (!isMobile) {
            toast({
              title: "MIDI Connected",
              description: `Connected to ${inputs.length} MIDI device(s)`
            });
          }
        }
      } catch (error) {
        console.error('MIDI setup failed:', error);
      }
    };

    setupMIDI();
  }, [isMobile]);

  // Calculate current bar based on time and tempo - Fixed for dynamic bar changes
  const getCurrentBarInfo = (currentTime: number) => {
    const beatsPerMinute = data.tempo;
    const beatsPerSecond = beatsPerMinute / 60;
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    const secondsPerBar = beatsPerBar / beatsPerSecond;

    for (let sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex++) {
      const section = data.sections[sectionIndex];
      const [startMin, startSec] = section.start_time.split(':').map(Number);
      const [endMin, endSec] = section.end_time.split(':').map(Number);
      const startTime = startMin * 60 + startSec;
      const endTime = endMin * 60 + endSec;

      if (currentTime >= startTime && currentTime <= endTime) {
        const relativeTime = currentTime - startTime;
        const barIndex = Math.floor(relativeTime / secondsPerBar);
        return { sectionIndex, barIndex: Math.min(Math.max(barIndex, 0), section.bars - 1) };
      }
    }
    return null;
  };

  const startTimeTracking = () => {
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        setCurrentBarInfo(getCurrentBarInfo(time));
      }
    }, 100);
  };

  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Updated getCellKey to support row index
  const getCellKey = (sectionIndex: number, barIndex: number, beatIndex: number, rowIndex: number = 0): string => {
    return `${sectionIndex}-${barIndex}-${beatIndex}-${rowIndex}`;
  };

  const handleBarClick = (sectionIndex: number, barIndex: number) => {
    setSelectedBar({ sectionIndex, barIndex });
  };

  const handleChordAdd = (chord: string) => {
    if (!selectedBar) return;
    
    // Find next available beat in the bar
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
      const key = getCellKey(selectedBar.sectionIndex, selectedBar.barIndex, beatIndex);
      if (!chords.has(key)) {
        setChords(prev => new Map(prev.set(key, chord)));
        setHasUnsavedChanges(true);
        break;
      }
    }
  };

  const handleChordRemove = (chord: string) => {
    if (!selectedBar) return;
    
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
      const key = getCellKey(selectedBar.sectionIndex, selectedBar.barIndex, beatIndex);
      if (chords.get(key) === chord) {
        setChords(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        setHasUnsavedChanges(true);
        break;
      }
    }
  };

  const handleClearAllChords = () => {
    if (!selectedBar) return;
    
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    setChords(prev => {
      const newMap = new Map(prev);
      for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
        const key = getCellKey(selectedBar.sectionIndex, selectedBar.barIndex, beatIndex);
        newMap.delete(key);
      }
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  const getCurrentBarChords = (): string[] => {
    if (!selectedBar) return [];
    
    const beatsPerBar = parseInt(data.time_signature.split('/')[0]) || 4;
    const barChords: string[] = [];
    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
      const key = getCellKey(selectedBar.sectionIndex, selectedBar.barIndex, beatIndex);
      const chord = chords.get(key);
      if (chord) {
        barChords.push(chord);
      }
    }
    return barChords;
  };

  // Section management functions
  const handleSectionNameEdit = (sectionIndex: number, newName: string) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map((section, index) => 
        index === sectionIndex ? { ...section, name: newName } : section
      )
    }));
    setHasUnsavedChanges(true);
  };

  const handleSectionDelete = (sectionIndex: number) => {
    if (data.sections.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Must have at least one section"
      });
      return;
    }

    // Clear selected bar if it's in the section being deleted
    if (selectedBar?.sectionIndex === sectionIndex) {
      setSelectedBar(null);
    }

    setData(prev => ({
      ...prev,
      sections: prev.sections.filter((_, index) => index !== sectionIndex)
    }));
    
    // Clear chords for deleted section and reindex remaining sections
    setChords(prev => {
      const newMap = new Map();
      Array.from(prev.entries()).forEach(([key, value]) => {
        const [secIdx, barIdx, beatIdx] = key.split('-').map(Number);
        if (secIdx < sectionIndex) {
          // Keep sections before deleted one
          newMap.set(key, value);
        } else if (secIdx > sectionIndex) {
          // Reindex sections after deleted one
          const newKey = `${secIdx - 1}-${barIdx}-${beatIdx}`;
          newMap.set(newKey, value);
        }
        // Skip chords from deleted section
      });
      return newMap;
    });
    setHasUnsavedChanges(true);
  };

  // Enhanced bar management functions
  const handleAddBarHorizontal = (sectionIndex: number) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map((section, index) => 
        index === sectionIndex ? { ...section, bars: section.bars + 1 } : section
      )
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddBarVertical = (sectionIndex: number) => {
    setData(prev => ({
      ...prev,
      sections: prev.sections.map((section, index) => {
        if (index === sectionIndex) {
          const currentRows = section.rows || 1;
          const barsPerRow = Math.ceil(section.bars / currentRows);
          return { 
            ...section, 
            rows: currentRows + 1,
            bars: section.bars + barsPerRow // Add bars for the new row
          };
        }
        return section;
      })
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveBar = (sectionIndex: number, isVertical: boolean = false) => {
    const section = data.sections[sectionIndex];
    
    if (isVertical && section.rows && section.rows > 1) {
      // Remove a row
      const currentRows = section.rows;
      const barsPerRow = Math.ceil(section.bars / currentRows);
      
      setData(prev => ({
        ...prev,
        sections: prev.sections.map((s, index) => 
          index === sectionIndex ? { 
            ...s, 
            rows: currentRows - 1,
            bars: Math.max(1, s.bars - barsPerRow) // Remove bars from the last row
          } : s
        )
      }));

      // Clear chords for removed bars
      setChords(prev => {
        const newMap = new Map(prev);
        const startBarIndex = section.bars - barsPerRow;
        Array.from(newMap.keys()).forEach(key => {
          const [secIdx, barIdx] = key.split('-').map(Number);
          if (secIdx === sectionIndex && barIdx >= startBarIndex) {
            newMap.delete(key);
          }
        });
        return newMap;
      });
    } else {
      // Remove a bar horizontally
      if (section.bars <= 1) {
        toast({
          title: "Cannot Remove",
          description: "Section must have at least one bar"
        });
        return;
      }

      const barToRemove = section.bars - 1; // Remove last bar
      
      setData(prev => ({
        ...prev,
        sections: prev.sections.map((s, index) => 
          index === sectionIndex ? { ...s, bars: s.bars - 1 } : s
        )
      }));

      // Clear chords for removed bar
      setChords(prev => {
        const newMap = new Map(prev);
        Array.from(newMap.keys()).forEach(key => {
          if (key.startsWith(`${sectionIndex}-${barToRemove}-`)) {
            newMap.delete(key);
          }
        });
        return newMap;
      });

      // Adjust selected bar if needed
      if (selectedBar && selectedBar.sectionIndex === sectionIndex && selectedBar.barIndex >= section.bars - 1) {
        setSelectedBar(prev => prev ? { ...prev, barIndex: Math.max(0, section.bars - 2) } : null);
      }
    }
    
    setHasUnsavedChanges(true);
  };

  const handleAddSection = () => {
    const newSection: ChordSheetSection = {
      name: `Section ${data.sections.length + 1}`,
      start_time: "0:00",
      end_time: "0:10",
      bars: 4,
      bar_structure: "| . . . |"
    };

    setData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // TODO: Implement save to Supabase
    setHasUnsavedChanges(false);
    toast({
      title: "Changes Saved",
      description: "Your chord sheet has been saved successfully"
    });
  };

  // MIDI integration for real-time chord input
  const handleMIDIMessage = (message: any) => {
    const [status, note, velocity] = message.data;
    
    // Note on message (144) with velocity > 0
    if (status === 144 && velocity > 0 && selectedBar) {
      const chordName = midiNoteToChord(note);
      if (chordName) {
        handleChordAdd(chordName);
        if (!isMobile) {
          toast({
            title: "MIDI Chord Added",
            description: `Added ${chordName} via MIDI`
          });
        }
      }
    }
  };

  const midiNoteToChord = (note: number): string | null => {
    const noteMap = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const chordRoot = noteMap[note % 12];
    return chordRoot || null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Compact Header - Mobile Responsive */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-xl font-bold text-foreground truncate">{data.metadata.title}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{data.metadata.artist}</p>
            <p className="text-xs text-muted-foreground">Total bars: {totalBars}</p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{data.metadata.key}</Badge>
            <Badge variant="outline" className="text-xs">{data.tempo} BPM</Badge>
            <Badge variant="outline" className="text-xs">{data.time_signature}</Badge>
            {autoChordDetection && <Badge variant="secondary" className="text-xs">Auto-Detect</Badge>}
            {hasUnsavedChanges && <Badge variant="destructive" className="text-xs">Unsaved</Badge>}
          </div>
        </div>
      </div>

      {/* Video Player - Mobile Responsive */}
      {youtubeUrl && (
        <div className="p-3 sm:p-4 border-b">
          <div className="flex flex-col items-center gap-3">
            <div className="flex-shrink-0 w-full max-w-sm">
              <div id="youtube-player" className="w-full mx-auto"></div>
            </div>
            <div className="space-y-2 w-full max-w-sm">
              <div className="flex items-center gap-2 justify-center flex-wrap">
                <Button onClick={handlePlayPause} variant="outline" size={isMobile ? "sm" : "default"}>
                  {isPlaying ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button 
                  onClick={() => setAutoChordDetection(!autoChordDetection)} 
                  variant={autoChordDetection ? "default" : "outline"} 
                  size={isMobile ? "sm" : "default"}
                  className="text-xs sm:text-sm"
                >
                  Auto-Detect {autoChordDetection ? 'ON' : 'OFF'}
                </Button>
              </div>
              <RealtimeChordSuggestions
                currentTime={currentTime}
                songKey={data.metadata.key}
                onChordSuggestion={handleChordAdd}
              />
            </div>
          </div>
        </div>
      )}

      {/* Horizontal Timeline - Updated Props */}
      <div className="px-2 sm:px-4 py-3">
        <HorizontalTimeline
          sections={data.sections}
          currentBarInfo={currentBarInfo}
          chords={chords}
          onBarClick={handleBarClick}
          onSectionNameEdit={handleSectionNameEdit}
          onSectionDelete={handleSectionDelete}
          onAddBarHorizontal={handleAddBarHorizontal}
          onAddBarVertical={handleAddBarVertical}
          onRemoveBar={handleRemoveBar}
          getCellKey={getCellKey}
          timeSignature={data.time_signature}
        />
      </div>

      {/* Chord Detector Component */}
      <ChordDetector
        isPlaying={isPlaying}
        currentBarInfo={currentBarInfo}
        autoDetectionEnabled={autoChordDetection}
        onChordDetected={handleAutoChordDetected}
      />

      {/* Floating Toolbar - Updated Props */}
      <FloatingToolbar
        onAddBarHorizontal={() => selectedBar ? handleAddBarHorizontal(selectedBar.sectionIndex) : undefined}
        onAddBarVertical={() => selectedBar ? handleAddBarVertical(selectedBar.sectionIndex) : undefined}
        onRemoveBar={() => selectedBar ? handleRemoveBar(selectedBar.sectionIndex) : undefined}
        onAddSection={handleAddSection}
        onSave={handleSave}
        canRemoveBar={selectedBar !== null && data.sections[selectedBar.sectionIndex]?.bars > 1}
        isPlaying={isPlaying}
        currentTime={currentTime}
        midiEnabled={midiEnabled}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {/* Bottom Chord Popup - Mobile Responsive */}
      <BottomChordPopup
        isOpen={selectedBar !== null}
        sectionName={selectedBar ? data.sections[selectedBar.sectionIndex]?.name || '' : ''}
        barIndex={selectedBar?.barIndex || 0}
        currentChords={getCurrentBarChords()}
        chordSuggestions={chordSuggestions}
        midiEnabled={midiEnabled}
        onChordAdd={handleChordAdd}
        onChordRemove={handleChordRemove}
        onClearAll={handleClearAllChords}
        onClose={() => setSelectedBar(null)}
      />
    </div>
  );
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default ChordSheetEditor;
