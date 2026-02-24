
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChordGridPreview from "@/components/ChordGridPreview";

interface Section {
  id: number;
  type: string;
  content: string;
  chords: string;
  lyrics: string;
  timeSignature?: string;
  section_time_signature?: string;
}

interface PreviewModeProps {
  songData: {
    title: string;
    artist: string;
    key: string;
    tempo: string;
    theme?: string;
    current_key?: string;
    time_signature?: string;
    sections?: Array<{
      id: string;
      section_type: string;
      lyrics: string | null;
      chords: string | null;
      name: string | null;
    }>;
  };
  sections: Section[];
  onClose: () => void;
}

const PreviewMode = ({ songData, sections, onClose }: PreviewModeProps) => {
  const [fontSize, setFontSize] = useState("text-sm");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Check if this is a chord grid song
  const isChordGridSong = songData?.theme === "chord_grid";

  // Helper function to check if a section is musical (intro, outro, interlude)
  const isMusicalSection = (sectionType: string) => {
    return ['intro', 'outro', 'interlude', 'instrumental'].some(musical => 
      sectionType.toLowerCase().includes(musical)
    );
  };

  // Helper function to parse and display musical section data
  const parseMusicalSection = (chords: string) => {
    try {
      const data = JSON.parse(chords);
      return {
        chordProgression: data.chordProgression || '',
        instrumentCues: data.instrumentCues || '',
        barCount: data.barCount || 4
      };
    } catch {
      return { chordProgression: chords, instrumentCues: '', barCount: 4 };
    }
  };

  // Scroll to specific section
  const scrollToSection = (sectionType: string) => {
    const element = sectionRefs.current[sectionType];
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center'
      });
      setActiveSection(sectionType);
      // Remove active state after animation
      setTimeout(() => setActiveSection(null), 2000);
    }
  };

  const formatContent = (section: Section) => {
    // Check if this is a musical section (intro, outro, interlude)
    if (isMusicalSection(section.type)) {
      const musicalData = parseMusicalSection(section.chords);
      
      return (
        <div className="space-y-2 pl-2 sm:pl-4">
          {musicalData.chordProgression && (
            <div className="break-words">
              <span className="text-primary font-semibold text-xs sm:text-sm">Chords: </span>
              <span className="font-mono text-blue-600 font-bold text-xs sm:text-sm">{musicalData.chordProgression}</span>
            </div>
          )}
          {musicalData.instrumentCues && (
            <div className="break-words">
              <span className="text-primary font-semibold text-xs sm:text-sm">Cues: </span>
              <span className="italic text-muted-foreground text-xs sm:text-sm">{musicalData.instrumentCues}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {musicalData.barCount} bars
          </div>
        </div>
      );
    }

    // For lyrical sections - use the properly formatted chords content from Step 3
    const content = section.chords || section.content || section.lyrics;
    
    if (!content) return <div className="text-muted-foreground italic text-sm">No content</div>;
    
    const lines = content.split('\n');
    const formattedLines = [];
    
    // The chord editor stores content as: chord line, lyric line, chord line, lyric line...
    // We need to preserve this exact positioning for proper alignment
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isEvenLine = i % 2 === 0;
      
      if (line.trim() === '') {
        // Empty line - add spacing
        formattedLines.push(<div key={`space-${i}`} className="h-1" />);
      } else if (isEvenLine) {
        // Even lines (0, 2, 4...) are chord lines in the editor format
        // Style them as chords with blue color
        formattedLines.push(
          <div key={`chord-${i}`} className="chord-line mb-1">
            <pre className="font-mono text-xs sm:text-sm font-bold text-blue-600 leading-tight whitespace-pre overflow-x-auto" style={{
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              letterSpacing: '0.3px',
              margin: 0,
              padding: 0,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {line}
            </pre>
          </div>
        );
      } else {
        // Odd lines (1, 3, 5...) are lyric lines 
        // Style them as lyrics with normal color and spacing
        formattedLines.push(
          <div key={`lyric-${i}`} className="lyric-line mb-3">
            <pre className="font-mono text-xs sm:text-sm text-foreground leading-tight whitespace-pre overflow-x-auto" style={{
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              letterSpacing: '0.3px',
              margin: 0,
              padding: 0,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
              {line}
            </pre>
          </div>
        );
      }
    }
    
    return <div className="formatted-content overflow-hidden">{formattedLines}</div>;
  };

  // Get unique section types for navigation
  const uniqueSectionTypes = [...new Set(sections.map(s => s.type))];

  // Convert fontSize string to number for ChordGridPreview
  const getFontSizeNumber = (fontSize: string) => {
    switch (fontSize) {
      case "text-xs": return 12;
      case "text-sm": return 14;
      case "text-base": return 16;
      default: return 14;
    }
  };

  // If it's a chord grid song, use the specialized component
  if (isChordGridSong) {
    const chordGridSongData = {
      title: songData.title,
      artist: songData.artist,
      current_key: songData.current_key || songData.key,
      tempo: parseInt(songData.tempo) || null,
      time_signature: songData.time_signature || "4/4",
      sections: songData.sections || []
    };

    return (
      <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-black' : 'bg-white'} overflow-y-auto`}>
        {/* Simple Header for Chord Grid */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-2 sm:p-4">
          <div className="flex justify-between items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold text-primary truncate">{songData.title}</h1>
            
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFontSize(fontSize === "text-xs" ? "text-sm" : fontSize === "text-sm" ? "text-base" : "text-xs")}
                className="text-xs px-2 py-1 h-7"
              >
                {fontSize === "text-xs" ? "A" : fontSize === "text-sm" ? "A+" : "A++"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-xs px-2 py-1 h-7"
              >
                {isDarkMode ? "☀️" : "🌙"}
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                size="sm"
                className="text-xs px-2 py-1 h-7"
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        {/* Chord Grid Content */}
        <div className="flex-1">
          <ChordGridPreview 
            song={chordGridSongData} 
            fontSize={getFontSizeNumber(fontSize)} 
            isDarkMode={isDarkMode} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-black' : 'bg-white'} overflow-y-auto`}>
      {/* Header Controls */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b p-2 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <h1 className="text-base sm:text-xl font-bold text-primary truncate">{songData.title}</h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFontSize(fontSize === "text-xs" ? "text-sm" : fontSize === "text-sm" ? "text-base" : "text-xs")}
              className="text-xs px-2 py-1 h-7"
            >
              {fontSize === "text-xs" ? "A" : fontSize === "text-sm" ? "A+" : "A++"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-xs px-2 py-1 h-7"
            >
              {isDarkMode ? "☀️" : "🌙"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              size="sm"
              className="text-xs px-2 py-1 h-7"
            >
              Close
            </Button>
          </div>
        </div>

        {/* Section Navigation Shortcuts */}
        {uniqueSectionTypes.length > 1 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t overflow-x-auto">
            <span className="text-xs text-muted-foreground flex items-center mr-2 flex-shrink-0">Jump:</span>
            {uniqueSectionTypes.map((type) => (
              <Button
                key={type}
                variant={activeSection === type ? "default" : "outline"}
                size="sm"
                onClick={() => scrollToSection(type)}
                className="text-xs px-2 py-1 h-6 flex-shrink-0"
              >
                {type}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`w-full max-w-4xl mx-auto p-3 sm:p-6 ${fontSize}`}>
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-2">{songData.title}</h1>
          {songData.artist && <p className="text-sm sm:text-lg text-muted-foreground mb-3">{songData.artist}</p>}
          
          {/* Key and BPM moved under artist */}
          <div className="flex justify-center gap-2 sm:gap-4 mb-4">
            <Badge variant="outline" className="text-xs sm:text-sm">Key: {songData.key}</Badge>
            <Badge variant="outline" className="text-xs sm:text-sm">{songData.tempo} BPM</Badge>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {sections.map((section) => (
            <div 
              key={section.id} 
              className={`space-y-2 p-3 sm:p-4 rounded-lg transition-all duration-500 overflow-hidden ${
                activeSection === section.type ? 'bg-primary/10 border-2 border-primary' : 'border border-border'
              }`}
              ref={(el) => (sectionRefs.current[section.type] = el)}
            >
              <h3 className="text-sm sm:text-lg font-semibold text-primary border-b border-border pb-1">
                [{section.type}]{(section.timeSignature || section.section_time_signature) ? ` (${section.timeSignature || section.section_time_signature})` : ''}
              </h3>
              <div className="pl-2 sm:pl-4 overflow-hidden">
                {formatContent(section)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewMode;
