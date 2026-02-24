import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit3, Plus, Minus, Trash2, Check, X } from 'lucide-react';

interface ChordSheetSection {
  name: string;
  start_time: string;
  end_time: string;
  bars: number;
  bar_structure: string;
}

interface SectionEditorProps {
  section: ChordSheetSection;
  sectionIndex: number;
  isCurrentSection: boolean;
  currentBarInfo: { sectionIndex: number; barIndex: number } | null;
  isPlaying: boolean;
  chords: Map<string, string>;
  onSectionUpdate: (sectionIndex: number, updates: Partial<ChordSheetSection>) => void;
  onSectionDelete: (sectionIndex: number) => void;
  onBarAdd: (sectionIndex: number) => void;
  onBarRemove: (sectionIndex: number) => void;
  onCellClick: (sectionIndex: number, barIndex: number, beatIndex: number, event: React.MouseEvent) => void;
  getCellKey: (sectionIndex: number, barIndex: number, beatIndex: number) => string;
  timeSignature: string;
}

const SectionEditor = ({
  section,
  sectionIndex,
  isCurrentSection,
  currentBarInfo,
  isPlaying,
  chords,
  onSectionUpdate,
  onSectionDelete,
  onBarAdd,
  onBarRemove,
  onCellClick,
  getCellKey,
  timeSignature
}: SectionEditorProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(section.name);

  const handleNameSave = () => {
    onSectionUpdate(sectionIndex, { name: editedName });
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(section.name);
    setIsEditingName(false);
  };

  const renderBeatsInBar = (barIndex: number) => {
    const beatsPerBar = parseInt(timeSignature.split('/')[0]) || 4;
    const isCurrentBar = currentBarInfo?.sectionIndex === sectionIndex && 
                         currentBarInfo?.barIndex === barIndex;
    
    return Array.from({ length: beatsPerBar }, (_, beatIndex) => {
      const key = getCellKey(sectionIndex, barIndex, beatIndex);
      const chord = chords.get(key);

      return (
        <div
          key={beatIndex}
          className={`
            flex items-center justify-center h-10 border border-border cursor-pointer
            transition-all duration-200 rounded-sm text-xs
            hover:bg-muted/50
            ${isCurrentBar && isPlaying ? 'bg-primary/20 border-primary animate-pulse' : ''}
            ${chord ? 'bg-accent/40 font-medium' : ''}
          `}
          onClick={(e) => onCellClick(sectionIndex, barIndex, beatIndex, e)}
        >
          {chord ? (
            <span className="font-semibold text-foreground">{chord}</span>
          ) : (
            <span className="text-muted-foreground">·</span>
          )}
        </div>
      );
    });
  };

  return (
    <Card className={`${isCurrentSection ? 'border-primary/50 shadow-md' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') handleNameCancel();
                  }}
                  className="flex-1 h-8"
                  autoFocus
                />
                <Button onClick={handleNameSave} size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Check className="w-4 h-4" />
                </Button>
                <Button onClick={handleNameCancel} size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold">{section.name}</h3>
                <Button
                  onClick={() => setIsEditingName(true)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{section.start_time} - {section.end_time}</span>
            <Badge variant="secondary">{section.bars} bars</Badge>
            
            {/* Bar Controls */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                onClick={() => onBarAdd(sectionIndex)}
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onBarRemove(sectionIndex)}
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
                disabled={section.bars <= 1}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onSectionDelete(sectionIndex)}
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0 ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1">
          {Array.from({ length: section.bars }, (_, barIndex) => (
            <div key={barIndex} className="flex items-center gap-2">
              <div className="w-8 text-xs text-muted-foreground text-center">
                {barIndex + 1}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1">
                {renderBeatsInBar(barIndex)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SectionEditor;