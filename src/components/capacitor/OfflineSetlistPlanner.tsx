import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Loader2, ChevronUp, ChevronDown, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLivePerformance } from '@/hooks/useLivePerformance';
import { useSetlistDownload } from '@/hooks/useSetlistDownload';
import { MDServerInfo } from './MDServerInfo';
import { cn } from '@/lib/utils';

interface OfflineSetlistPlannerProps {
  setlistId: string;
  className?: string;
}

export const OfflineSetlistPlanner: React.FC<OfflineSetlistPlannerProps> = ({
  setlistId,
  className
}) => {
  const navigate = useNavigate();
  const { isSetlistDownloaded, getOfflineSetlistData } = useSetlistDownload();
  const {
    state,
    isConnected,
    isMD,
    startAsMD,
    disconnect,
    changeSong,
    changeSection,
    setTranspose,
    setPlaying
  } = useLivePerformance(setlistId);

  const [setlistData, setSetlistData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completedSongs, setCompletedSongs] = useState<Set<string>>(new Set());
  const [connectedDevices, setConnectedDevices] = useState(0);

  const isDownloaded = isSetlistDownloaded(setlistId);

  useEffect(() => {
    const loadData = async () => {
      
      if (isDownloaded) {
        const data = await getOfflineSetlistData(setlistId);
        
        setSetlistData(data);
      }
      setIsLoading(false);
    };
    loadData();
  }, [setlistId, isDownloaded, getOfflineSetlistData]);

  // Auto-start as MD when loaded
  useEffect(() => {
    if (setlistData && !isConnected) {
      
      startAsMD(0);
    }
  }, [setlistData, isConnected, startAsMD]);

  const toggleSongComplete = (songId: string) => {
    setCompletedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const handleBack = () => {
    disconnect();
    navigate('/offline-downloads');
  };

  const currentSongIndex = state?.currentSongIndex ?? 0;
  const currentSong = setlistData?.songs?.[currentSongIndex];
  const currentSectionIndex = state?.currentSectionIndex ?? 0;
  const transpose = state?.transpose ?? 0;

  // Get current section based on arrangements order
  const sortedArrangements = useMemo(() => {
    if (!currentSong?.arrangements) return [];
    return [...currentSong.arrangements].sort((a: any, b: any) => a.position - b.position);
  }, [currentSong?.arrangements]);

  const currentArrangement = sortedArrangements[currentSectionIndex];
  const currentSection = currentArrangement?.section || currentSong?.sections?.[currentSectionIndex];

  // Get display content (chords or lyrics)
  const displayContent = useMemo(() => {
    if (!currentSection) return { title: '', content: '' };
    
    const title = currentSection.name || currentSection.section_type || 'Section';
    const timeSignature = currentSection.section_time_signature;
    const fullTitle = timeSignature ? `${title} (${timeSignature})` : title;
    
    // Prefer chords if available, fallback to lyrics
    let content = currentSection.chords || currentSection.lyrics || '';
    
    return { title: fullTitle, content };
  }, [currentSection]);

  // Format content for display
  const formatContentLines = (content: string) => {
    if (!content) return [];
    
    // Check if it's JSON chord grid data
    if (content.startsWith('[') && content.endsWith(']')) {
      try {
        const chordData = JSON.parse(content);
        const bars = chordData.bars || chordData;
        // Extract chords from bars
        return bars
          .filter((bar: any) => bar.chord && bar.chord.trim() !== '')
          .map((bar: any) => bar.chord)
          .join(' | ')
          .split(' | ');
      } catch {
        // Not valid JSON, treat as text
      }
    }
    
    // Regular text content
    return content.split('\n').filter(line => line.trim() !== '');
  };

  const contentLines = formatContentLines(displayContent.content);

  // Navigation handlers
  const handlePrevSection = () => {
    if (currentSectionIndex > 0 && isMD) {
      changeSection(currentSectionIndex - 1);
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < sortedArrangements.length - 1 && isMD) {
      changeSection(currentSectionIndex + 1);
    }
  };

  const handlePrevSong = () => {
    if (currentSongIndex > 0 && isMD) {
      changeSong(currentSongIndex - 1);
    }
  };

  const handleNextSong = () => {
    if (currentSongIndex < (setlistData?.songs?.length || 1) - 1 && isMD) {
      changeSong(currentSongIndex + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isDownloaded || !setlistData) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary p-4">
        <Card className="border-amber-500/50">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              This setlist must be downloaded before entering Live Mode.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/offline-downloads')}>
              Go to Downloads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{setlistData?.setlist?.name}</h1>
              <p className="text-xs text-white/60">
                {setlistData?.setlist?.date} • {setlistData?.songs?.length} songs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
              {isMD ? 'Music Director' : 'Connected'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* MD Server Info - IP Section */}
        {isMD && (
          <MDServerInfo
            isActive={true}
            setlistId={setlistId}
            connectedDevices={connectedDevices}
          />
        )}

        {/* Progress */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Progress</span>
              <span className="text-sm text-white/70">
                {completedSongs.size} of {setlistData?.songs?.length || 0} completed
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedSongs.size / (setlistData?.songs?.length || 1)) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Current Song Header */}
        {currentSong && (
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">
                    Song {currentSongIndex + 1} of {setlistData?.songs?.length || 0}
                  </p>
                  <CardTitle className="text-xl">{currentSong.title}</CardTitle>
                  <p className="text-sm text-white/60">{currentSong.artist}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-white/20 mb-1">
                    Key: {currentSong.key || 'C'}
                  </Badge>
                  <p className="text-xs text-white/60">{currentSong.bpm || 120} BPM</p>
                  {currentSong.capo > 0 && (
                    <p className="text-xs text-amber-400">Capo: {currentSong.capo}</p>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Section Navigation Buttons */}
        {sortedArrangements.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                {sortedArrangements.map((arr: any, index: number) => {
                  const section = arr.section;
                  return (
                    <Button
                      key={arr.id}
                      variant={currentSectionIndex === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => isMD && changeSection(index)}
                      disabled={!isMD}
                      className={cn(
                        'text-xs',
                        currentSectionIndex === index 
                          ? 'bg-blue-500 text-white' 
                          : 'border-white/20 text-white/70 hover:bg-white/10'
                      )}
                    >
                      {section?.name || section?.section_type || `Section ${index + 1}`}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Chords/Lyrics Display */}
        <Card className="bg-white/5 border-white/10 min-h-[300px]">
          <CardHeader className="pb-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="border-blue-400/50 text-blue-400">
                  {displayContent.title}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevSection}
                  disabled={!isMD || currentSectionIndex === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="text-xs text-white/50">
                  {currentSectionIndex + 1}/{sortedArrangements.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNextSection}
                  disabled={!isMD || currentSectionIndex >= sortedArrangements.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {contentLines.length > 0 ? (
              <div className="space-y-3">
                {contentLines.map((line, index) => (
                  <p 
                    key={index}
                    className="text-lg md:text-xl lg:text-2xl text-white leading-relaxed whitespace-pre-wrap"
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/40 italic">No content available for this section</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transpose Control */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Transpose</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 border-white/20"
                  onClick={() => isMD && setTranspose(transpose - 1)}
                  disabled={!isMD}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-mono font-bold">{transpose}</span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 border-white/20"
                  onClick={() => isMD && setTranspose(transpose + 1)}
                  disabled={!isMD}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Song List */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/70">Setlist</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {setlistData?.songs?.map((song: any, idx: number) => (
                  <div
                    key={song.id}
                    className={cn(
                      'p-3 rounded-lg border transition-all cursor-pointer',
                      currentSongIndex === idx
                        ? 'bg-blue-500/20 border-blue-400/50'
                        : completedSongs.has(song.id)
                          ? 'bg-green-500/10 border-green-400/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                    onClick={() => isMD && changeSong(idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                        currentSongIndex === idx
                          ? 'bg-blue-500 text-white'
                          : completedSongs.has(song.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-white/20 text-white/70'
                      )}>
                        {completedSongs.has(song.id) ? <Check className="h-3 w-3" /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">{song.title}</p>
                      </div>
                      <Badge variant="outline" className="text-xs border-white/20">
                        {song.key || 'C'}
                      </Badge>
                      {currentSongIndex === idx && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Transport Controls */}
        {isMD && (
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-white/20"
              onClick={handlePrevSong}
              disabled={currentSongIndex === 0}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-blue-500 hover:bg-blue-600"
              onClick={() => setPlaying(!state?.isPlaying)}
            >
              {state?.isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 border-white/20"
              onClick={handleNextSong}
              disabled={currentSongIndex >= (setlistData?.songs?.length || 1) - 1}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Mark Complete Button */}
        {currentSong && (
          <Button
            variant={completedSongs.has(currentSong.id) ? 'secondary' : 'outline'}
            className="w-full"
            onClick={() => toggleSongComplete(currentSong.id)}
          >
            {completedSongs.has(currentSong.id) ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Completed
              </>
            ) : (
              'Mark as Complete'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
