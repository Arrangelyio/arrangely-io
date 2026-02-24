import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";

interface LiveChordPreviewProps {
  textInput: string;
  songTitle?: string;
  artistName?: string;
  songKey?: string;
  tempo?: number;
  timeSignature?: string;
  className?: string;
}

interface ParsedSection {
  title: string;
  lines: string[];
  type: 'section' | 'chord_line' | 'annotation';
  timeSignature?: string;
}

export const LiveChordPreview: React.FC<LiveChordPreviewProps> = ({
  textInput,
  songTitle = "Untitled",
  artistName = "",
  songKey = "C",
  tempo = 120,
  timeSignature = "4/4",
  className,
}) => {
  const parseTextToSections = (text: string): ParsedSection[] => {
    const lines = text.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        if (currentSection) {
          currentSection.lines.push('');
        }
        continue;
      }

      // Section titles with different styles
      // = Section with border box
      if (trimmedLine.match(/^=\s*.+/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const sectionText = trimmedLine.replace(/^=\s*/, '');
        // Check for time signature in section title like "= Verse (3/4)"
        const timeSignatureMatch = sectionText.match(/^(.+?)\s*\(([234]\/[248])\)$/);
        const title = timeSignatureMatch ? timeSignatureMatch[1].trim() : sectionText;
        const timeSignature = timeSignatureMatch ? timeSignatureMatch[2] : undefined;
        
        currentSection = {
          title,
          lines: [],
          type: 'section',
          timeSignature
        };
        continue;
      }

      // - Section with line
      if (trimmedLine.match(/^-\s*.+/) && !trimmedLine.match(/^-(lc|cc|rc)\s/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const sectionText = trimmedLine.replace(/^-\s*/, '');
        // Check for time signature in section title like "- Verse (3/4)"
        const timeSignatureMatch = sectionText.match(/^(.+?)\s*\(([234]\/[248])\)$/);
        const title = timeSignatureMatch ? timeSignatureMatch[1].trim() : sectionText;
        const timeSignature = timeSignatureMatch ? timeSignatureMatch[2] : undefined;
        
        currentSection = {
          title,
          lines: [],
          type: 'section',
          timeSignature
        };
        continue;
      }

      // ; Section with border box (alternative)
      if (trimmedLine.match(/^;\s*.+/)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const sectionText = trimmedLine.replace(/^;\s*/, '');
        // Check for time signature in section title like "; Verse (3/4)"
        const timeSignatureMatch = sectionText.match(/^(.+?)\s*\(([234]\/[248])\)$/);
        const title = timeSignatureMatch ? timeSignatureMatch[1].trim() : sectionText;
        const timeSignature = timeSignatureMatch ? timeSignatureMatch[2] : undefined;
        
        currentSection = {
          title,
          lines: [],
          type: 'section',
          timeSignature
        };
        continue;
      }

      // Comments (starting with #)
      if (trimmedLine.startsWith('#')) {
        if (currentSection) {
          currentSection.lines.push(trimmedLine);
        }
        continue;
      }

      // Chord lines or other content
      if (currentSection) {
        currentSection.lines.push(trimmedLine);
      } else {
        // Create a default section if none exists
        currentSection = {
          title: 'Untitled Section',
          lines: [trimmedLine],
          type: 'section'
        };
      }
    }

    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const formatChordLine = (line: string): JSX.Element => {
    const processedLine = line.trim();
    
    // Handle three columns text
    if (processedLine.match(/^-(lc|cc|rc)\s/)) {
      const columnMatch = processedLine.match(/^-(lc|cc|rc)\s(.+)/);
      if (columnMatch) {
        const [, columnType, text] = columnMatch;
        const alignClass = columnType === 'lc' ? 'text-left' : columnType === 'cc' ? 'text-center' : 'text-right';
        return (
          <div className={`mb-2 ${alignClass}`}>
            <span className="text-foreground text-sm">{text}</span>
          </div>
        );
      }
    }

    // Handle special symbols and commands
    if (processedLine === '+') {
      return (
        <div className="flex items-center justify-center mb-2">
          <span className="text-accent font-bold">+ NEW PAGE</span>
        </div>
      );
    }

    // Handle time signatures like 2:4 A, 3:4 B
    if (processedLine.match(/^\d:\d\s/)) {
      const [timeSig, ...chords] = processedLine.split(/\s+/);
      return (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center px-2 h-8 border-2 border-primary bg-primary/10">
            <span className="text-primary font-bold text-sm">{timeSig}</span>
          </div>
          {chords.map((chord, idx) => (
            <div key={idx} className="flex items-center justify-center w-12 h-8 border border-foreground/60 bg-background">
              <span className="text-foreground font-semibold">{chord}</span>
            </div>
          ))}
        </div>
      );
    }

    // Parse chord line segments
    const segments = processedLine.split(/\s+/).filter(item => item.trim());
    
    return (
      <div className="flex items-center gap-1 mb-3">
        {/* Measure line prefix */}
        <div className="flex items-center justify-center w-4 h-8 border-r-2 border-foreground mr-2">
          <span className="text-foreground font-bold text-lg">|</span>
        </div>
        
        {segments.map((segment, index) => {
          // Handle repeat patterns with parentheses (C Am) and (C Am)x3
          if (segment.match(/^\([^)]+\)x?\d*$/)) {
            return (
              <div key={index} className="flex items-center justify-center px-2 h-8 border-2 border-primary bg-primary/10">
                <span className="text-primary font-semibold text-sm">{segment}</span>
              </div>
            );
          }

          // Handle repeat patterns with endings (C Am1 Dm2 G)
          if (segment.match(/^\([^)]*[12][^)]*\)$/)) {
            return (
              <div key={index} className="flex items-center justify-center px-2 h-8 border-2 border-accent bg-accent/10">
                <span className="text-accent font-semibold text-sm">{segment}</span>
              </div>
            );
          }

          // Handle simile marks
          if (segment === '%') {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-foreground/40 bg-muted/30">
                <span className="text-foreground font-bold text-lg">%</span>
              </div>
            );
          }

          if (segment === '%%') {
            return (
              <div key={index} className="flex items-center justify-center w-16 h-8 border border-foreground/40 bg-muted/30">
                <span className="text-foreground font-bold">%%</span>
              </div>
            );
          }

          // Handle reprint symbols %1, %2
          if (segment.match(/^%[12]$/)) {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-accent/50 bg-accent/20">
                <span className="text-accent font-semibold">{segment}</span>
              </div>
            );
          }

          // Handle rest symbols r1, r2, r4, r8, WR, HR, QR, ER
          if (segment.match(/^(r[1248]|WR|HR|QR|ER)$/)) {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-muted bg-muted/50">
                <span className="text-muted-foreground font-semibold">{segment}</span>
              </div>
            );
          }

          // Handle note type symbols WN, HN, QN, EN, SN
          if (segment.match(/^(WN|HN|QN|EN|SN)$/)) {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-primary/50 bg-primary/20">
                <span className="text-primary font-semibold">{segment}</span>
              </div>
            );
          }

          // Handle slash chords like C/G, A/C#, Bb/D
          if (segment.includes('/') && segment.match(/^[A-G][#b♯♭]?[^/]*\/[A-G][#b♯♭]?[#b♯♭]?$/)) {
            const [mainChord, bassNote] = segment.split('/');
            return (
              <div key={index} className="relative inline-flex items-center justify-center w-14 h-10 border border-foreground/60 bg-background overflow-visible">
                <span className="absolute top-0 left-1 text-foreground font-semibold text-xs leading-tight">{mainChord}</span>
                <span className="absolute inset-0 flex items-center justify-center text-foreground/40 font-light text-lg leading-none">/</span>
                <span className="absolute bottom-0 right-1 text-foreground font-semibold text-xs leading-tight">{bassNote}</span>
              </div>
            );
          }

          // Handle split bars with underscores A_B_C
          if (segment.includes('_')) {
            const splitChords = segment.split('_');
            return (
              <div key={index} className="flex items-center">
                {splitChords.map((chord, splitIdx) => (
                  <div key={splitIdx} className="flex items-center justify-center w-8 h-8 border-r border-foreground/40 bg-background last:border-r-0">
                    <span className="text-foreground font-semibold text-xs">{chord}</span>
                  </div>
                ))}
              </div>
            );
          }

          // Handle measure separators
          if (segment === '|') {
            return (
              <div key={index} className="flex items-center justify-center w-2 h-8">
                <span className="text-foreground font-bold text-xl">|</span>
              </div>
            );
          }

          // Handle special symbols § (segno), o (coda from), O (coda to)
          if (segment === '§') {
            return (
              <div key={index} className="flex items-center justify-center w-8 h-8 border border-accent/50 bg-accent/20 rounded-full">
                <span className="text-accent font-bold">§</span>
              </div>
            );
          }

          if (segment === 'o') {
            return (
              <div key={index} className="flex items-center justify-center w-8 h-8 border border-accent/50 bg-accent/20 rounded-full">
                <span className="text-accent font-bold">⌖</span>
              </div>
            );
          }

          if (segment === 'O') {
            return (
              <div key={index} className="flex items-center justify-center w-8 h-8 border-2 border-accent bg-accent/20 rounded-full">
                <span className="text-accent font-bold">⊙</span>
              </div>
            );
          }

          // Handle fermata G and variations
          if (segment.match(/^[A-G][#b♯♭]?[^,]*,{2,}$/)) {
            const chord = segment.replace(/,+$/, '');
            const commaCount = (segment.match(/,/g) || []).length;
            return (
              <div key={index} className="flex flex-col items-center justify-center w-12 h-8 border border-foreground/60 bg-background">
                <span className="text-foreground font-semibold text-sm">{chord}</span>
                <span className="text-accent text-xs">{"^".repeat(commaCount > 3 ? 1 : commaCount - 1)}</span>
              </div>
            );
          }

          // Handle ending notations 1., 2., D.C., D.S., Fine, Coda, Segno, and D.S. al Coda
          if (segment.match(/^(D\.C\.|D\.S\.|Fine|Coda|1\.|2\.|𝄋|⊕|D\.S\. al Coda)$/)) {
            return (
              <div key={index} className="flex items-center justify-center px-2 h-8 border border-accent/50 bg-accent/20 rounded">
                <span className="text-accent-foreground font-medium text-xs">{segment}</span>
              </div>
            );
          }

          // Handle optional chords in parentheses (A)
          if (segment.match(/^\([A-G][^)]*\)$/) && !segment.includes('x')) {
            const chord = segment.slice(1, -1);
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-dashed border-foreground/40 bg-muted/20">
                <span className="text-muted-foreground font-medium text-sm">{chord}</span>
              </div>
            );
          }

          // Handle indent bars X X A B
          if (segment === 'X') {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8">
                <span className="text-muted-foreground font-bold">X</span>
              </div>
            );
          }

          // Handle chord symbols with all variations
          const chordPattern = /^[A-G][#b♯♭]?(?:maj|min|m|dim|aug|sus|add|\+|-|°|ø|7|9|11|13|\d)*$/;
          if (chordPattern.test(segment)) {
            return (
              <div key={index} className="flex items-center justify-center w-12 h-8 border border-foreground/60 bg-background">
                <span className="text-foreground font-semibold text-sm">{segment}</span>
              </div>
            );
          }

          // Handle final endings and hat symbols ^
          if (segment === '^') {
            return (
              <div key={index} className="flex items-center justify-center w-8 h-8">
                <span className="text-accent font-bold text-lg">^</span>
              </div>
            );
          }

          // Handle other text annotations
          return (
            <div key={index} className="flex items-center justify-center px-1 h-8">
              <span className="text-muted-foreground text-sm">{segment}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (section: ParsedSection, index: number) => {
    // Check if first line has special annotations like "halftime feel"
    const firstLine = section.lines[0]?.trim();
    const hasAnnotation = firstLine && !firstLine.match(/^[CDEFGAB#b\s%_§\(\)x\d\/]/) && !firstLine.startsWith('#');
    
    return (
      <div key={index} className="mb-8">
        {/* Section header with modern styling */}
        <div className="flex items-center gap-3 mb-4">
          <div className="border border-foreground/40 px-2 py-1 bg-background">
            <span className="text-sm font-medium">
              {section.timeSignature 
                ? `${section.title} (${section.timeSignature})`
                : section.title
              }
            </span>
          </div>
          {hasAnnotation && (
            <span className="text-sm text-muted-foreground italic">{firstLine}</span>
          )}
        </div>

        {/* Section content */}
        <div className="space-y-2 pl-4">
          {section.lines.map((line, lineIndex) => {
            if (!line.trim()) {
              return <div key={lineIndex} className="h-2" />;
            }

            // Skip annotation line if it was displayed in header
            if (lineIndex === 0 && hasAnnotation) {
              return null;
            }

            // Handle comments
            if (line.trim().startsWith('#')) {
              return (
                <div key={lineIndex} className="text-muted-foreground italic text-sm mb-2">
                  {line}
                </div>
              );
            }

            // Handle chord lines
            return (
              <div key={lineIndex} className="mb-3">
                {formatChordLine(line)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const sections = parseTextToSections(textInput);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-4 w-4" />
        <h3 className="text-sm font-medium">Live Preview</h3>
      </div>

      {/* Preview Card */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold uppercase tracking-wide">{songTitle}</CardTitle>
              {artistName && (
                <div className="text-sm text-muted-foreground mt-1">{artistName}</div>
              )}
            </div>
            <div className="text-right text-sm">
              <div>Page № 1 of 2</div>
            </div>
          </div>
          <Separator className="mt-4" />
        </CardHeader>
        
        <CardContent className="overflow-y-auto max-h-[500px]">
          {sections.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="text-sm">Start typing to see your chord sheet preview</div>
              <div className="text-xs mt-2">Use = for sections, then add your chords on the next lines</div>
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map(renderSection)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveChordPreview;