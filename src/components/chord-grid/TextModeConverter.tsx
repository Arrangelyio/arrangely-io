// Utility functions to convert between text mode and grid mode

interface ChordBar {
  id: string;
  chord: string;
  beats: number;
  comment?: string;
  timestamp?: number;
  melody?: {
    notAngka?: string;
  };
}

interface ChordSection {
  id: string;
  name: string;
  timeSignature: string;
  bars: ChordBar[];
  isExpanded: boolean;
  barCount: number;
  showMelody?: boolean;
  position?: number;
}

export class TextModeConverter {
  // Convert text to grid sections
  static textToSections(text: string): ChordSection[] {
    const lines = text.split('\n');
    const sections: ChordSection[] = [];
    let currentSection: ChordSection | null = null;
    let sectionCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;

      // Section titles (= Title or - Title), also handle (N) = Title format
      if (line.match(/^(\(\d+\)\s*)?[=-]\s*.+/)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const title = line.replace(/^(\(\d+\)\s*)?[=-]\s*/, '');
        currentSection = {
          id: sectionCounter.toString(),
          name: title,
          timeSignature: "4/4",
          bars: [],
          isExpanded: true,
          barCount: 0,
          position: sectionCounter - 1,
        };
        sectionCounter++;
        continue;
      }

      // Comments (lines starting with #) - store as comment-only bar
      if (line.startsWith('#')) {
        if (currentSection) {
          currentSection.bars.push({
            id: `${currentSection.id}-comment-${Date.now()}-${i}`,
            chord: "",
            beats: 0,
            comment: line.replace(/^#\s*/, ''),
          });
          currentSection.barCount = currentSection.bars.length;
        }
        continue;
      }

      // Process chord lines
      if (currentSection) {
        const bars = this.parseChordLine(line, currentSection.id);
        currentSection.bars.push(...bars);
        currentSection.barCount = currentSection.bars.length;
      } else {
        // Create default section if none exists
        currentSection = {
          id: "1",
          name: "Section 1",
          timeSignature: "4/4",
          bars: [],
          isExpanded: true,
          barCount: 0,
          position: 0,
        };
        const bars = this.parseChordLine(line, "1");
        currentSection.bars.push(...bars);
        currentSection.barCount = currentSection.bars.length;
      }
    }

    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : this.getDefaultSections();
  }

  // Convert grid sections to text
  static sectionsToText(sections: ChordSection[]): string {
    let text = "";

    for (const section of sections) {
      // Add section title
      text += `= ${section.name}\n`;

      // Group bars into lines (4 bars per line typically)
      const barsPerLine = 4;
      for (let i = 0; i < section.bars.length; i += barsPerLine) {
        const lineBars = section.bars.slice(i, i + barsPerLine);
        const chordLine = lineBars
          .map(bar => bar.chord || ".")
          .join(" ");
        text += chordLine + "\n";
      }

      text += "\n"; // Empty line between sections
    }

    return text.trim();
  }

  // Parse a line of chords into bars
  private static parseChordLine(line: string, sectionId: string): ChordBar[] {
    const bars: ChordBar[] = [];
    
    // Handle special symbols first
    if (line.trim() === '%' || line.trim() === '%%') {
      bars.push({
        id: `${sectionId}-${Date.now()}`,
        chord: line.trim(),
        beats: 4,
        comment: "Repeat previous bar"
      });
      return bars;
    }

    if (line.match(/^r[12]$/)) {
      const match = line.match(/r([12])/);
      if (match) {
        bars.push({
          id: `${sectionId}-${Date.now()}`,
          chord: `r${match[1]}`,
          beats: 4,
          comment: `Repeat previous ${match[1]} bar(s)`
        });
      }
      return bars;
    }

    // Check if line contains | bar separators
    const hasPipes = line.includes('|');
    
    if (hasPipes) {
      // Split by | and process each bar segment
      const segments = line.split('|').map(s => s.trim().replace(/\s+/g, ' ')).filter(s => s.length > 0);
      
      segments.forEach((segment, segIdx) => {
        // Handle repeat patterns within segments
        const repeatMatch = segment.match(/^\((.+)\)x?(\d*)$/);
        if (repeatMatch) {
          const innerBars = repeatMatch[1].split('|').map(s => s.trim()).filter(s => s);
          const count = parseInt(repeatMatch[2]) || 1;
          for (let r = 0; r < count; r++) {
            innerBars.forEach((ib, ibIdx) => {
              bars.push({
                id: `${sectionId}-${Date.now()}-${segIdx}-${r}-${ibIdx}`,
                chord: ib.trim(),
                beats: 4,
              });
            });
          }
          return;
        }
        
        // Each segment between pipes is one bar — keep its content as-is
        bars.push({
          id: `${sectionId}-${Date.now()}-${segIdx}`,
          chord: segment,
          beats: 4,
        });
      });
    } else {
      // No pipes — fallback to old parsing logic
      
      // Handle repeat patterns like (C Am F G)x3
      const repeatPattern = /\(([^)]+)\)x?(\d*)/g;
      let match;
      let remaining = line;
      while ((match = repeatPattern.exec(line)) !== null) {
        const chordsInRepeat = match[1].split(/\s+/).filter(c => c.trim());
        const repeatCount = parseInt(match[2]) || 1;
        
        for (let rep = 0; rep < repeatCount; rep++) {
          chordsInRepeat.forEach((chord, index) => {
            bars.push({
              id: `${sectionId}-${Date.now()}-${rep}-${index}`,
              chord: chord.trim(),
              beats: 4,
            });
          });
        }
        remaining = remaining.replace(match[0], '');
      }

      // Parse remaining tokens — each non-dot token starts a new bar
      const tokens = remaining.split(/\s+/).filter(t => t.trim());
      
      let i = 0;
      while (i < tokens.length) {
        const token = tokens[i];
        if (!token || token.match(/^[()x\d]+$/)) { i++; continue; }
        if (token === '.') { i++; continue; }

        let barChord = token;
        let j = i + 1;
        while (j < tokens.length && tokens[j] === '.') {
          barChord += ' ' + tokens[j];
          j++;
          // Check if next token is a chord (split bar)
          if (j < tokens.length && tokens[j] !== '.' && !tokens[j].match(/^[()x\d]+$/)) {
            barChord += ' ' + tokens[j];
            j++;
            // Continue collecting trailing dots
            while (j < tokens.length && tokens[j] === '.') {
              barChord += ' ' + tokens[j];
              j++;
            }
          }
        }

        bars.push({
          id: `${sectionId}-${Date.now()}-${i}`,
          chord: barChord,
          beats: 4,
        });

        i = j;
      }
    }

    if (bars.length === 0) {
      bars.push({
        id: `${sectionId}-${Date.now()}`,
        chord: "",
        beats: 4,
      });
    }

    return bars;
  }

  // Get default sections when no content
  private static getDefaultSections(): ChordSection[] {
    return [
      {
        id: "1",
        name: "Intro",
        timeSignature: "4/4",
        bars: [
          { id: "1-1", chord: "", beats: 4 },
          { id: "1-2", chord: "", beats: 4 },
          { id: "1-3", chord: "", beats: 4 },
          { id: "1-4", chord: "", beats: 4 },
        ],
        isExpanded: true,
        barCount: 4,
        position: 0,
      },
    ];
  }

  // Validate text input for common syntax errors
  static validateTextInput(text: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = text.split('\n');

    let hasSections = false;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;

      // Check for section headers
      if (trimmedLine.match(/^[=-]\s*.+/)) {
        hasSections = true;
        continue;
      }

      // Check for invalid chord patterns
      const invalidChords = trimmedLine.match(/[^A-Gb#\s()%r\d\-="':;,.\s]/g);
      if (invalidChords && !trimmedLine.startsWith('#')) {
        errors.push(`Line ${lineNumber}: Potentially invalid characters: ${invalidChords.join(', ')}`);
      }

      // Check for unmatched parentheses
      const openParens = (trimmedLine.match(/\(/g) || []).length;
      const closeParens = (trimmedLine.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push(`Line ${lineNumber}: Unmatched parentheses`);
      }
    }

    // Warn if no sections found
    if (!hasSections && text.trim()) {
      errors.push('No section headers found. Use "= Section Name" to create sections.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default TextModeConverter;