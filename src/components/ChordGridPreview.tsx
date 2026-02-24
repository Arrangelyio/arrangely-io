import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DrawingCanvas from './DrawingCanvas';

interface ChordGridPreviewProps {
  song: {
    title: string;
    artist: string | null;
    current_key: string;
    tempo: number | null;
    time_signature: string;
    sections?: Array<{
      id: string;
      section_type: string;
      lyrics: string | null;
      chords: string | null;
      name: string | null;
      section_time_signature?: string | null;
    }>;
  };
  fontSize?: number;
  isDarkMode?: boolean;
  setlistId?: string;
  songId?: string;
  isOwner?: boolean;
  enableAnnotations?: boolean;
  onAnnotationsChange?: (annotations: any) => void;
}

const ChordGridPreview: React.FC<ChordGridPreviewProps> = ({ 
  song, 
  fontSize = 16, 
  isDarkMode = false,
  setlistId,
  songId,
  isOwner = false,
  enableAnnotations = false,
  onAnnotationsChange
}) => {
  // Parse chord grid data - handle both JSON and bar-separated formats
  const parseChordGrid = (chordsData: string | null) => {
    if (!chordsData) return null;
    
    // Try parsing as JSON first (new format)
    try {
      const data = JSON.parse(chordsData);
      return data;
    } catch {
      // Parse bar-separated format (e.g., "C | Am . G | F . G | C")
      return parsePipeSeparatedChords(chordsData);
    }
  };

  // Parse pipe-separated chord format into grid structure
  const parsePipeSeparatedChords = (chordsText: string) => {
    const bars = chordsText.split('|').map(bar => bar.trim()).filter(bar => bar);
    const beatsPerBar = parseInt(song.time_signature?.split('/')[0] || '4');
    
    const gridBars = bars.map(bar => {
      // Split by spaces and handle dots (.) as empty beats
      const beats = bar.split(/\s+/).filter(beat => beat);
      const barArray = Array(beatsPerBar).fill('');
      
      beats.forEach((beat, index) => {
        if (index < beatsPerBar && beat !== '.') {
          barArray[index] = beat;
        }
      });
      
      return barArray;
    });

    return { bars: gridBars, melody: '' };
  };

  const renderChordChart = (chords: string[], sectionName: string) => {
    const beatsPerBar = parseInt(song.time_signature?.split('/')[0] || '4');
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Badge 
            variant="secondary" 
            className="text-sm font-semibold bg-slate-600 text-white"
            style={{ fontSize: `${fontSize * 0.8}px` }}
          >
            {sectionName.toUpperCase()}
          </Badge>
        </div>

        <div className="border border-border rounded-lg p-4 bg-card/50">
          <div className="font-mono text-lg leading-relaxed whitespace-pre-wrap">
            {chords.map((bar, barIndex) => {
              const barChords = bar.split(/\s+/).filter(chord => chord && chord !== '.');
              const formattedBar = Array(beatsPerBar).fill('').map((_, beatIndex) => {
                const chord = barChords[beatIndex] || '';
                return chord.padEnd(8, ' '); // Pad for consistent spacing
              }).join('');
              
              return (
                <span key={barIndex} className="inline-block">
                  <span className="text-border">|</span>
                  <span className="text-primary font-bold mx-2" style={{ fontSize: `${fontSize}px` }}>
                    {formattedBar}
                  </span>
                  {barIndex === chords.length - 1 && <span className="text-border">|</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (section: any) => {
    const gridData = parseChordGrid(section.chords);
    if (!gridData) return null;

    const { bars = [], melody = '', musicalSigns = {} } = gridData;
    
    return (
      <div key={section.id} className="mb-8">
        {melody && (
          <div className="mb-4 p-3 bg-accent/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Melodi (not angka):</div>
            <div 
              className="font-mono text-lg font-medium"
              style={{ fontSize: `${fontSize}px` }}
            >
              {melody}
            </div>
          </div>
        )}

        <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Badge 
            variant="secondary" 
            className="text-sm font-semibold bg-slate-600 text-white"
            style={{ fontSize: `${fontSize * 0.8}px` }}
          >
            {section.section_time_signature 
              ? `${section.section_type.toUpperCase()} (${section.section_time_signature})`
              : section.section_type.toUpperCase()
            }
          </Badge>
          {section.name && section.name !== section.section_type && (
            <span 
              className="text-muted-foreground font-medium"
              style={{ fontSize: `${fontSize * 0.9}px` }}
            >
              {section.name}
            </span>
          )}
        </div>

          <div className="border border-border rounded-lg p-6 bg-card/50">
            <div className="font-mono text-2xl leading-relaxed">
              {bars.map((bar, barIndex) => {
                const barMusicalSigns = musicalSigns[barIndex];
                
                return (
                  <div key={barIndex} className="inline-block mr-1 relative">
                    {/* Note types above the bar */}
                    {bar.noteSymbol && (
                      <div className="absolute -top-12 left-0 right-0 flex justify-center items-center text-lg">
                        <span 
                          className="text-primary font-mono"
                          style={{ fontSize: `${fontSize * 1.1}px` }}
                          title="Note Type"
                        >
                          {bar.noteSymbol}
                        </span>
                      </div>
                    )}
                    
                    {/* Musical Signs above the bar */}
                    {barMusicalSigns && (
                      <div className="absolute -top-8 left-0 right-0 flex justify-center items-center gap-2 text-lg">
                        {barMusicalSigns.segno && (
                          <span 
                            className="text-orange-600 font-bold"
                            style={{ fontSize: `${fontSize * 1.3}px` }}
                            title="Segno"
                          >
                            𝄋
                          </span>
                        )}
                        {barMusicalSigns.coda && (
                          <span 
                            className="text-purple-600 font-bold"
                            style={{ fontSize: `${fontSize * 1.3}px` }}
                            title="Coda"
                          >
                            ⊕
                          </span>
                        )}
                        {barMusicalSigns.dsAlCoda && (
                          <span 
                            className="text-green-600 font-semibold text-sm"
                            style={{ fontSize: `${fontSize * 0.7}px` }}
                            title="D.S. al Coda"
                          >
                            D.S. al Coda
                          </span>
                        )}
                        {barMusicalSigns.firstEnding && (
                          <span 
                            className="text-blue-600 font-bold border-t-2 border-l-2 border-blue-600 px-1"
                            style={{ fontSize: `${fontSize * 0.8}px` }}
                            title="First Ending"
                          >
                            1.
                          </span>
                        )}
                        {barMusicalSigns.secondEnding && (
                          <span 
                            className="text-blue-600 font-bold border-t-2 border-l-2 border-blue-600 px-1"
                            style={{ fontSize: `${fontSize * 0.8}px` }}
                            title="Second Ending"
                          >
                            2.
                          </span>
                        )}
                      </div>
                    )}
                    
                    <span className="text-muted-foreground text-xl">|</span>
                    {bar.map((chord, beatIndex) => (
                      <span 
                        key={beatIndex}
                        className="inline-block w-16 text-center text-primary font-bold"
                        style={{ fontSize: `${fontSize * 1.2}px` }}
                      >
                        {chord || ''}
                      </span>
                    ))}
                    {barIndex === bars.length - 1 && (
                      <span className="text-muted-foreground text-xl">|</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'dark' : ''} relative`}>
      <div className="max-w-6xl mx-auto relative">
        {/* Drawing Canvas Overlay - positioned to cover the entire content area */}
        <DrawingCanvas
          setlistId={setlistId}
          songId={songId}
          sectionId={null} // null means "All Sections" mode
          isOwner={isOwner}
          isVisible={enableAnnotations}
          onAnnotationsChange={onAnnotationsChange}
          className="absolute inset-0 w-full h-full pointer-events-none"
          width={1152} // max-w-6xl is approximately 1152px
          height={3000} // taller height to cover all content
        />
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h1 
                className="font-bold text-primary mb-2"
                style={{ fontSize: `${fontSize * 2}px` }}
              >
                {song.title}
              </h1>
              {song.artist && (
                <p 
                  className="text-muted-foreground mb-4"
                  style={{ fontSize: `${fontSize * 1.2}px` }}
                >
                  {song.artist}
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Key:</span>
                  <Badge variant="outline">{song.current_key}</Badge>
                </div>
                {song.tempo && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tempo:</span>
                    <Badge variant="outline">{song.tempo} BPM</Badge>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Time:</span>
                  <Badge variant="outline">{song.time_signature}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chord Grid Sections */}
        <div className="space-y-6">
          {song.sections?.map(renderSection)}
        </div>

        {(!song.sections || song.sections.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No chord data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChordGridPreview;