import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TextModeConverter } from "./TextModeConverter";
import wholeRestImg from "@/assets/whole_rest.svg";
import halfRestImg from "@/assets/half_rest.svg";
import quarterRestImg from "@/assets/quarter_rest.svg";
import eighthRestImg from "@/assets/eighth_rest.svg";

interface ArrangementStylePreviewProps {
  textInput: string;
  songTitle?: string;
  artistName?: string;
  songKey?: string;
  tempo?: number;
  timeSignature?: string;
  className?: string;
}

interface ChordBar {
  id: string;
  chord: string;
  beats: number;
}

const restImages: Record<string, string> = {
  WR: wholeRestImg,
  HR: halfRestImg,
  QR: quarterRestImg,
  ER: eighthRestImg,
};

const ChordDisplay = ({ chord }: { chord: string | undefined }) => {
  if (!chord || chord === ".") return <span>&nbsp;</span>;

  const renderChordPart = (part: string) => {
    const match = part.match(/^([A-G])([#b]?)(.*)$/);
    if (match) {
      const [, baseNote, accidental, restOfChord] = match;
      const extMatch = restOfChord.match(/^([^0-9]*)(\d.*)$/);
      if (extMatch) {
        return (
          <>
            {baseNote}
            {accidental && <sup className="text-[90%] -top-[0.4em] relative">{accidental}</sup>}
            {extMatch[1]}
            <sup className="text-[80%] font-medium -top-[0.6em] relative">{extMatch[2]}</sup>
          </>
        );
      }
      return (
        <>
          {baseNote}
          {accidental && <sup className="text-[75%] -top-[0.4em] relative">{accidental}</sup>}
          {restOfChord}
        </>
      );
    }
    return <>{part}</>;
  };

  // Rest symbols
  const baseRestKey = chord.substring(0, 2);
  if (restImages[baseRestKey]) {
    const isDotted = chord.endsWith(".");
    return (
      <div className="flex items-center self-end">
        <img src={restImages[baseRestKey]} alt={chord} className="w-[1em] h-[1.5em] ml-1" />
        {isDotted && <span className="font-bold text-lg leading-none mb-1">.</span>}
      </div>
    );
  }

  // Simile mark
  if (chord === "%" || chord === "//" || chord === "/.") {
    return (
      <span className="text-3xl font-thin" style={{ fontFamily: "MuseJazzText" }}>
        {chord}
      </span>
    );
  }

  // Slash symbol (beat repeat)
  if (chord === "/") {
    return (
      <span className="relative flex items-center justify-center w-5 h-10">
        <svg height="25" width="20" className="opacity-95">
          <line x1="0" y1="25" x2="20" y2="0" stroke="currentColor" strokeWidth="5" />
        </svg>
      </span>
    );
  }

  // Slash chords like A/E
  if (chord.includes("/")) {
    const [mainChord, bassNote] = chord.split("/");
    return (
      <span className="inline-flex items-baseline gap-0 leading-none">
        <span className="font-bold">{renderChordPart(mainChord)}</span>
        <span className="font-bold opacity-70 mx-[-1px]">/</span>
        <span className="font-bold text-[0.75em]">{renderChordPart(bassNote)}</span>
      </span>
    );
  }

  return <>{renderChordPart(chord)}</>;
};

const renderBarContent = (bar: ChordBar) => {
  const trimmedChord = bar.chord?.trim();
  
  // Handle simile marks as full-bar symbols
  if (trimmedChord === "%" || trimmedChord === "//" || trimmedChord === "/.") {
    return (
      <div className="w-full flex items-center justify-center h-16 pt-2">
        <span className="text-foreground text-3xl font-thin" style={{ fontFamily: "MuseJazzText" }}>
          {trimmedChord}
        </span>
      </div>
    );
  }

  const chordBeats = bar.chord ? bar.chord.split(" ").filter(Boolean) : [];
  const numBeats = Math.max(chordBeats.length, 1);

  // Dynamic font sizing based on density
  const chordComplexities = chordBeats.map(c => {
    if (!c || c === ".") return 0;
    let x = c.length;
    if (c.includes("/")) x += 2;
    if (c.includes("add") || c.includes("sus") || c.includes("maj") || c.includes("dim")) x += 2;
    return x;
  });
  const maxComplexity = Math.max(...chordComplexities, 0);

  let regularFontSize: string;
  if (numBeats >= 5) regularFontSize = "text-xs sm:text-sm";
  else if (numBeats >= 4 || maxComplexity > 12) regularFontSize = "text-sm sm:text-base";
  else if (numBeats === 3) regularFontSize = "text-base sm:text-lg";
  else if (numBeats === 2) regularFontSize = "text-lg sm:text-xl";
  else regularFontSize = "text-xl sm:text-2xl";

  return (
    <div className="flex flex-col h-full justify-end">
      <div className="grid flex-grow" style={{ gridTemplateColumns: `repeat(${numBeats}, 1fr)` }}>
        {Array.from({ length: numBeats }).map((_, i) => {
          const displayChord = chordBeats[i];
          const isSlashChord = displayChord?.includes("/");
          const fontClass = regularFontSize;
          
          // Dot = beat repeat marker
          if (displayChord === ".") {
            return (
              <div
                key={i}
                className={`${fontClass} font-bold text-foreground flex items-baseline pl-2 pt-5`}
                style={{ fontFamily: "MuseJazzText", minHeight: "2.5rem" }}
              >
                <span className="text-2xl">.</span>
              </div>
            );
          }
          
          return (
            <div
              key={i}
              className={`${fontClass} font-bold text-foreground flex items-baseline pl-2 pt-5 relative`}
              style={{ fontFamily: "MuseJazzText", minHeight: "2.5rem" }}
            >
              <ChordDisplay chord={displayChord} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const renderBarLineSymbol = (symbol: string) => {
  const thinLine = "w-[2px] h-[0.9em] bg-current";
  const thickLine = "w-[7px] h-[0.9em] bg-current";

  if (symbol === ":||") {
    return (
      <span className="inline-flex items-center leading-none translate-y-[2px]">
        <span className="mr-[6px] text-[0.7em] font-bold">:</span>
        <div className={thinLine}></div>
        <div className={`${thickLine} ml-[3px]`}></div>
      </span>
    );
  }
  if (symbol === "||:") {
    return (
      <span className="inline-flex items-center leading-none translate-y-[2px]">
        <div className={thickLine}></div>
        <div className={`${thinLine} ml-[3px]`}></div>
        <span className="ml-[3px] text-[0.7em] font-bold">:</span>
      </span>
    );
  }
  return <span>{symbol}</span>;
};

export const ArrangementStylePreview: React.FC<ArrangementStylePreviewProps> = ({
  textInput,
  songTitle = "Untitled",
  artistName = "",
  songKey = "C",
  tempo = 120,
  timeSignature = "4/4",
  className,
}) => {
  const sections = TextModeConverter.textToSections(textInput);
  const barsPerLine = 4;

  return (
    <div className={`flex flex-col ${className || ""}`}>
      {/* Header */}
      <Card className="mb-4">
        <CardContent className="p-4 sm:p-6 text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-primary" style={{ fontFamily: "MuseJazzText" }}>
            {songTitle}
          </h1>
          {artistName && <p className="text-sm text-muted-foreground">{artistName}</p>}
          <div className="flex justify-center flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">Key: {songKey}</Badge>
            {tempo > 0 && <Badge variant="outline" className="text-xs">{tempo} BPM</Badge>}
            <Badge variant="outline" className="text-xs">{timeSignature}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          Start typing to see your chord sheet preview
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sectionIdx) => {
            const combinedLines: JSX.Element[] = [];

            for (let i = 0; i < section.bars.length; i += barsPerLine) {
              const lineBars = section.bars.slice(i, i + barsPerLine);
              const mutableLineBars: ChordBar[] = JSON.parse(JSON.stringify(lineBars));
              const barLineSymbols = new Array(mutableLineBars.length + 1).fill("|");

              // Parse barline symbols from chord text
              mutableLineBars.forEach((bar, index) => {
                if (bar.chord.startsWith("|:") || bar.chord.startsWith("||:")) {
                  barLineSymbols[index] = bar.chord.startsWith("||:") ? "||:" : "|:";
                  bar.chord = bar.chord.replace(/^\|{1,2}:\s*/, "").trim();
                }
                if (bar.chord.endsWith(":||") || bar.chord.endsWith("://")) {
                  barLineSymbols[index + 1] = ":||";
                  bar.chord = bar.chord.replace(/:\/{2}$|:\|{2}$/, "").trim();
                }
              });

              const isPartialLine = lineBars.length < barsPerLine;

              combinedLines.push(
                <div key={`line-${i}`} className="flex flex-row items-start min-w-0">
                  {mutableLineBars.map((bar, index) => (
                    <div
                      key={bar.id || `bar-${i}-${index}`}
                      className="flex items-stretch min-w-0"
                      style={{ flex: isPartialLine ? `0 0 ${100 / barsPerLine}%` : '1 1 0%' }}
                    >
                      {/* Barline */}
                      <div className="flex flex-col text-3xl leading-tight">
                        <span
                          className={`text-foreground font-thin text-6xl leading-none ${
                            barLineSymbols[index].includes(":") ? "tracking-[-0.1em]" : ""
                          }`}
                        >
                          {renderBarLineSymbol(barLineSymbols[index])}
                        </span>
                      </div>
                      {/* Bar content */}
                      <div className={`w-full min-w-0 overflow-hidden ${barLineSymbols[index].includes(":") ? "pl-2" : ""}`}>
                        {renderBarContent(bar)}
                      </div>
                    </div>
                  ))}
                  {/* Final barline */}
                  <div className="flex flex-col text-3xl leading-tight">
                    <span
                      className={`text-foreground font-thin text-6xl leading-none ${
                        barLineSymbols[mutableLineBars.length].includes(":") ? "tracking-[-0.1em]" : ""
                      }`}
                    >
                      {renderBarLineSymbol(barLineSymbols[mutableLineBars.length])}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={sectionIdx} className="space-y-2 p-2 sm:p-4 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {sectionIdx + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-primary border-b border-border pb-1 capitalize">
                    [{section.name}]
                  </h3>
                </div>
                <div className="pl-1 sm:pl-4 w-full">
                  {combinedLines}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArrangementStylePreview;
