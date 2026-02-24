
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit3, Trash2, Plus, Minus, CornerDownLeft, Music } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import BarHitOverlay from '@/components/chord-grid/BarHitOverlay';
import HitNotesGrid from '@/components/chord-grid/HitNotesGrid';

interface ChordSheetSection {
  name: string;
  start_time: string;
  end_time: string;
  bars: number;
  bar_structure: string;
  rows?: number; // New property for vertical rows
  hits?: {
    subdivision: "1/4" | "1/8" | "1/16";
    markers: boolean[];
  };
}

interface HorizontalTimelineProps {
  sections: ChordSheetSection[];
  currentBarInfo: { sectionIndex: number; barIndex: number } | null;
  chords: Map<string, string>;
  onBarClick: (sectionIndex: number, barIndex: number, rowIndex?: number) => void;
  onSectionNameEdit: (sectionIndex: number, newName: string) => void;
  onSectionDelete: (sectionIndex: number) => void;
  onAddBarHorizontal: (sectionIndex: number) => void;
  onAddBarVertical: (sectionIndex: number) => void;
  onRemoveBar: (sectionIndex: number, isVertical?: boolean) => void;
  getCellKey: (sectionIndex: number, barIndex: number, beatIndex: number, rowIndex?: number) => string;
  timeSignature: string;
}

const HorizontalTimeline = ({
  sections,
  currentBarInfo,
  chords,
  onBarClick,
  onSectionNameEdit,
  onSectionDelete,
  onAddBarHorizontal,
  onAddBarVertical,
  onRemoveBar,
  getCellKey,
  timeSignature
}: HorizontalTimelineProps) => {
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;

  const handleSectionNameEdit = (sectionIndex: number) => {
    setEditingSectionIndex(sectionIndex);
    setEditingSectionName(sections[sectionIndex].name);
  };

  const handleSectionNameSave = () => {
    if (editingSectionIndex !== null) {
      onSectionNameEdit(editingSectionIndex, editingSectionName);
      setEditingSectionIndex(null);
    }
  };

  const handleSectionNameCancel = () => {
    setEditingSectionIndex(null);
    setEditingSectionName('');
  };

  const getBarChords = (sectionIndex: number, barIndex: number, rowIndex: number = 0): string[] => {
    const barChords: string[] = [];
    for (let beatIndex = 0; beatIndex < beatsPerBar; beatIndex++) {
      const key = getCellKey(sectionIndex, barIndex, beatIndex, rowIndex);
      const chord = chords.get(key);
      if (chord) {
        barChords.push(chord);
      }
    }
    return barChords;
  };

  return (
    <div className="space-y-4 overflow-x-auto pb-4">
      {sections.map((section, sectionIndex) => {
        const rows = section.rows || 1;
        const barsPerRow = Math.ceil(section.bars / rows);
        
        return (
          <div 
            key={sectionIndex} 
            className="min-w-full"
            onMouseEnter={() => setHoveredSection(sectionIndex)}
            onMouseLeave={() => setHoveredSection(null)}
          >
            {/* Section Header - Enhanced Mobile Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sticky left-0 bg-background/95 backdrop-blur z-10 py-2 rounded-lg">
              {editingSectionIndex === sectionIndex ? (
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <Input
                    value={editingSectionName}
                    onChange={(e) => setEditingSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSectionNameSave();
                      if (e.key === 'Escape') handleSectionNameCancel();
                    }}
                    className={`h-8 text-sm flex-1 min-w-32 ${isMobile ? 'w-full' : 'max-w-48'}`}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSectionNameSave} size="sm" variant="outline" className="h-8 px-3 text-xs">
                      Save
                    </Button>
                    <Button onClick={handleSectionNameCancel} size="sm" variant="ghost" className="h-8 px-3 text-xs">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
                      {section.name}
                    </h3>
                    <Button
                      onClick={() => handleSectionNameEdit(sectionIndex)}
                      size="sm"
                      variant="ghost"
                      className={`p-1 ${isMobile ? 'h-6 w-6' : 'h-7 w-7'}`}
                    >
                      <Edit3 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                    </Button>
                    {sections.length > 1 && (
                      <Button
                        onClick={() => onSectionDelete(sectionIndex)}
                        size="sm"
                        variant="ghost"
                        className={`p-1 text-destructive hover:text-destructive ${isMobile ? 'h-6 w-6' : 'h-7 w-7'}`}
                      >
                        <Trash2 className={isMobile ? 'h-3 w-3' : 'h-4 w-4'} />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={`whitespace-nowrap ${isMobile ? 'text-xs px-2 py-0' : 'text-xs'}`}>
                      {section.start_time} - {section.end_time}
                    </Badge>
                    <Badge variant="outline" className={`whitespace-nowrap ${isMobile ? 'text-xs px-2 py-0' : 'text-xs'}`}>
                      {section.bars} bars • {rows} row{rows > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Improved Add/Remove Controls */}
                  {(hoveredSection === sectionIndex || isMobile) && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        onClick={() => onAddBarHorizontal(sectionIndex)}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                        title="Add bar horizontally"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Bar
                      </Button>
                      <Button
                        onClick={() => onAddBarVertical(sectionIndex)}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs hover:bg-secondary hover:text-secondary-foreground"
                        title="Add new row (Enter Bar)"
                      >
                        <CornerDownLeft className="h-3 w-3 mr-1" />
                        Enter Bar
                      </Button>
                      {section.bars > 1 && (
                        <Button
                          onClick={() => onRemoveBar(sectionIndex)}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs hover:bg-destructive hover:text-destructive-foreground"
                          title="Remove last bar"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bars Grid - Support for Multiple Rows */}
            <div className="space-y-3">
              {Array.from({ length: rows }, (_, rowIndex) => (
                <div key={rowIndex} className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground pb-2">
                  {Array.from({ length: barsPerRow }, (_, colIndex) => {
                    const barIndex = rowIndex * barsPerRow + colIndex;
                    if (barIndex >= section.bars) return null;

                    const isCurrentBar = currentBarInfo?.sectionIndex === sectionIndex && 
                                       currentBarInfo?.barIndex === barIndex;
                    const barChords = getBarChords(sectionIndex, barIndex, rowIndex);

                    return (
                      <Card
                        key={barIndex}
                        className={`
                          ${isMobile ? 'min-w-[90px] flex-shrink-0' : 'min-w-[120px]'} 
                          cursor-pointer transition-all duration-200 border-2 touch-manipulation hover:shadow-md group relative overflow-visible
                          ${isCurrentBar 
                            ? 'border-primary bg-primary/10 shadow-lg scale-105 ring-2 ring-primary/30' 
                            : 'border-border hover:border-primary/50 hover:bg-accent/5'
                          }
                        `}
                        onClick={() => onBarClick(sectionIndex, barIndex, rowIndex)}
                      >
                        {/* Hit Overlay */}
                        <BarHitOverlay 
                          timeSignature={timeSignature} 
                          hits={section.hits}
                          compact={isMobile}
                        />
                        
                        {/* Bar Controls - Show on Hover */}
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddBarHorizontal(sectionIndex);
                            }}
                            size="sm"
                            variant="secondary"
                            className="h-5 w-5 p-0 rounded-full shadow-md"
                            title="Add bar after this one"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {section.bars > 1 && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveBar(sectionIndex);
                              }}
                              size="sm"
                              variant="destructive"
                              className="h-5 w-5 p-0 rounded-full shadow-md"
                              title="Remove this bar"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        <div className={`p-3 ${isMobile ? 'p-2' : 'p-3'}`}>
                          {/* Bar Number */}
                          <div className={`text-muted-foreground mb-2 font-medium text-center ${isMobile ? 'text-xs mb-1' : 'text-sm mb-2'}`}>
                            Bar {barIndex + 1}
                            {rows > 1 && (
                              <span className="text-xs ml-1">
                                (R{rowIndex + 1})
                              </span>
                            )}
                          </div>
                          
                          {/* Chords Display */}
                          <div className={`flex flex-wrap gap-1 justify-center ${isMobile ? 'min-h-[32px]' : 'min-h-[40px]'}`}>
                            {barChords.length > 0 ? (
                              barChords.map((chord, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className={`font-medium ${isMobile ? 'text-xs px-1.5 py-0' : 'text-xs px-2'}`}
                                >
                                  {chord}
                                </Badge>
                              ))
                            ) : (
                              <div className={`text-muted-foreground/60 italic text-center flex items-center ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                + Tap to add
                              </div>
                            )}
                          </div>
                          
                          {/* Bar Structure */}
                          <div className={`mt-2 text-muted-foreground text-center truncate ${isMobile ? 'text-[10px] mt-1' : 'text-[10px] mt-2'}`}>
                            {section.bar_structure}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {/* Add Bar Button at End of Row */}
                  {rowIndex === rows - 1 && (
                    <Card className={`
                      ${isMobile ? 'min-w-[90px] flex-shrink-0' : 'min-w-[120px]'} 
                      border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 
                      cursor-pointer transition-all duration-200 flex items-center justify-center
                      hover:bg-accent/10
                    `}>
                      <div className="flex flex-col items-center gap-2 p-4">
                        <Button
                          onClick={() => onAddBarHorizontal(sectionIndex)}
                          size="sm"
                          variant="ghost"
                          className="flex flex-col items-center gap-1 h-auto p-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-xs">Add Bar</span>
                        </Button>
                        <Button
                          onClick={() => onAddBarVertical(sectionIndex)}
                          size="sm"
                          variant="ghost"
                          className="flex flex-col items-center gap-1 h-auto p-2"
                        >
                          <CornerDownLeft className="h-4 w-4" />
                          <span className="text-xs">Enter Bar</span>
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HorizontalTimeline;
