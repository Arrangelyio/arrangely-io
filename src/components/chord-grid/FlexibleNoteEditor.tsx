import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NoteSymbol, NoteType, NotationDisplay } from "./NoteSymbols";
import { X, Plus, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface FlexibleNote {
  type: NoteType;
  chord?: string;
  chordIndex?: number;
  tied?: boolean;
  dotted?: boolean;
  tieTo?: { bar: string; beat: string };
}

interface FlexibleNoteEditorProps {
  timeSignature: string;
  notes?: FlexibleNote[];
  onNotesChange: (notes: FlexibleNote[]) => void;
  availableChords?: string[];
  compact?: boolean;
}

// Komponen Reusable untuk Tie SVG agar kode lebih bersih
const TieCurve = () => (
  <div className="absolute -top-1 left-1/2 w-[210%] h-4 pointer-events-none z-10">
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      className="w-full h-full text-black dark:text-cyan-400 opacity-80"
    >
      <path
        d="M 0,15 C 25,0 75,0 100,15"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

const FlexibleNoteEditor: React.FC<FlexibleNoteEditorProps> = ({
  timeSignature,
  notes = [],
  onNotesChange,
  availableChords = [],
  compact = false,
}) => {
  const isMobile = useIsMobile();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<FlexibleNote>({
    type: "quarter",
    chord: availableChords[0] || "",
    chordIndex: availableChords.length > 0 ? 0 : undefined,
  });

  const beatsPerBar = parseInt(timeSignature.split("/")[0]) || 4;
  const denominator = parseInt(timeSignature.split("/")[1]) || 4;
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const getBeatValue = (noteType: NoteType, isDotted?: boolean): number => {
    let baseValue = 1;
    switch (noteType) {
      case "whole":
      case "whole_rest":
        baseValue = 4;
        break;
      case "half":
      case "half_rest":
        baseValue = 2;
        break;
      case "quarter":
      case "quarter_rest":
        baseValue = 1;
        break;
      case "eighth":
      case "eighth_rest":
        baseValue = 0.5;
        break;
      case "sixteenth":
        baseValue = 0.25;
        break;
      default:
        baseValue = 1;
    }
    const multiplier = denominator / 4;
    const finalBaseValue = baseValue * multiplier;
    return isDotted ? finalBaseValue * 1.5 : finalBaseValue;
  };

  const calculateUsedBeats = (): number => {
    return notes.reduce(
      (total, note) => total + getBeatValue(note.type, note.dotted),
      0,
    );
  };

  const getRemainingBeats = (): number => {
    return Math.max(0, beatsPerBar - calculateUsedBeats());
  };

  const canAddNote = (noteType: NoteType, isDotted?: boolean): boolean => {
    const noteValue = getBeatValue(noteType, isDotted);
    let currentUsedBeats = calculateUsedBeats();
    if (editingNoteIndex !== null && notes[editingNoteIndex]) {
      currentUsedBeats -= getBeatValue(
        notes[editingNoteIndex].type,
        notes[editingNoteIndex].dotted,
      );
    }
    return currentUsedBeats + noteValue <= beatsPerBar;
  };

  const basicNoteTypes: { value: NoteType; label: string; symbol: string }[] = [
    { value: "whole", label: "Whole", symbol: "○" },
    { value: "half", label: "Half", symbol: "𝅗𝅥" },
    { value: "quarter", label: "Quarter", symbol: "♩" },
    { value: "eighth", label: "Eighth", symbol: "♪" },
    { value: "sixteenth", label: "Sixteenth", symbol: "𝅘𝅥𝅯" },
  ];

  const handleAddNote = () => {
    if (!canAddNote(tempNote.type, tempNote.dotted)) {
      alert(`Cannot add note. It would exceed the bar limit.`);
      return;
    }
    const chordsArray = tempNote.chord ? parseChordString(tempNote.chord) : [];
    const newNote: FlexibleNote = {
      ...tempNote,
      chord: chordsArray.length > 0 ? chordsArray.join(" ") : undefined,
    };
    onNotesChange([...notes, newNote]);
    setTempNote({
      type: "quarter",
      chord: availableChords[0] || "",
      chordIndex: 0,
    });
    setIsAddModalOpen(false);
  };

  const handleEditNote = (index: number) => {
    setEditingNoteIndex(index);
    setTempNote({ ...notes[index] });
  };

  const handleSaveEdit = () => {
    if (editingNoteIndex !== null) {
      if (!canAddNote(tempNote.type, tempNote.dotted)) {
        alert(`Cannot save changes. Exceeds bar limit.`);
        return;
      }
      const chordsArray = tempNote.chord
        ? parseChordString(tempNote.chord)
        : [];
      const updatedNote: FlexibleNote = {
        ...tempNote,
        chord: chordsArray.length > 0 ? chordsArray.join(" ") : undefined,
      };
      const updatedNotes = [...notes];
      updatedNotes[editingNoteIndex] = updatedNote;
      onNotesChange(updatedNotes);
      setEditingNoteIndex(null);
    }
  };

  const removeNote = (index: number) => {
    const updatedNotes = notes.filter((_, i) => i !== index);
    onNotesChange(updatedNotes);
  };

  const updateTempNote = (field: keyof FlexibleNote, value: any) => {
    setTempNote((prev) => ({ ...prev, [field]: value }));
  };

  const parseChordString = (chordStr: string): string[] => {
    return chordStr.split(/\s+/).filter((chord) => chord.trim() !== "");
  };

  const formatChordDisplay = (chord: string): string => {
    return parseChordString(chord).join(" ");
  };

  const NoteEditorContent = ({
    title,
    onSave,
    onCancel,
  }: {
    title: string;
    onSave: () => void;
    onCancel: () => void;
  }) => (
    <div className="space-y-6 p-1">
      <div>
        <label className="text-sm font-medium mb-2 block">Select Chord</label>
        <Select
          value={tempNote.chordIndex?.toString() || ""}
          onValueChange={(value) => {
            const index = parseInt(value);
            setTempNote((prev) => ({
              ...prev,
              chord: availableChords[index],
              chordIndex: index,
            }));
          }}
        >
          <SelectTrigger className="w-full h-11 text-base">
            <SelectValue placeholder="Choose a chord..." />
          </SelectTrigger>
          <SelectContent>
            {availableChords.map((chord, idx) => (
              <SelectItem key={`${idx}-${chord}`} value={idx.toString()}>
                Posisi {idx + 1}: {chord}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Note Types</p>
        <div className="grid grid-cols-2 gap-2">
          {basicNoteTypes.map((option) => (
            <Button
              key={option.value}
              variant={tempNote.type === option.value ? "default" : "outline"}
              onClick={() => updateTempNote("type", option.value)}
              className="h-16 text-base flex-col"
            >
              <NoteSymbol type={option.value} size="lg" />
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => updateTempNote("tied", !tempNote.tied)}
        >
          <div className="space-y-0.5">
            <label className="text-base font-medium leading-none cursor-pointer">
              Add Tie
            </label>
            <p className="text-muted-foreground text-xs">
              Connects to the next note.
            </p>
          </div>
          <input
            type="checkbox"
            checked={tempNote.tied || false}
            readOnly
            className="h-5 w-5"
          />
        </div>

        <div
          className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
            !tempNote.dotted && !canAddNote(tempNote.type, true)
              ? "opacity-50 cursor-not-allowed bg-muted"
              : "hover:bg-accent/5"
          }`}
          onClick={() => {
            if (tempNote.dotted || canAddNote(tempNote.type, true)) {
              updateTempNote("dotted", !tempNote.dotted);
            }
          }}
        >
          <div className="space-y-0.5">
            <label className="text-base font-medium leading-none cursor-pointer">
              Dotted Note (.)
            </label>
            <p className="text-muted-foreground text-xs">
              Increases length by 50%.
            </p>
          </div>
          <input
            type="checkbox"
            checked={tempNote.dotted || false}
            readOnly
            className="h-5 w-5"
          />
        </div>
      </div>

      {/* Preview Section */}
      <div className="border-t pt-4">
        <span className="font-medium text-muted-foreground text-sm">
          Preview:
        </span>
        <div className="flex items-center gap-2 mt-2 p-3 border rounded bg-muted/20">
          <div className="relative flex items-center">
            <NoteSymbol type={tempNote.type} size="lg" />
            {tempNote.dotted && (
              <span className="text-2xl font-bold leading-none mb-1">.</span>
            )}
            {tempNote.tied && <TieCurve />}
          </div>
          {tempNote.chord && (
            <div className="flex flex-col ml-1">
              <span className="font-medium text-lg leading-none">
                {tempNote.chord}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Pos {tempNote.chordIndex! + 1}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex gap-2 ${
          isMobile ? "flex-col-reverse" : "justify-end"
        }`}
      >
        <Button
          variant="outline"
          onClick={onCancel}
          className={isMobile ? "h-11" : ""}
        >
          Cancel
        </Button>
        <Button onClick={onSave} className={isMobile ? "h-11" : ""}>
          {title.includes("Edit") ? "Save Changes" : "Add Note"}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={`space-y-3 ${compact ? "text-xs" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-muted-foreground text-sm">
            Notes & Rhythm
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {calculateUsedBeats()}/{beatsPerBar} beats used
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsAddModalOpen(true)}
          disabled={getRemainingBeats() === 0}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Note
        </Button>
      </div>

      {/* List Notasi */}
      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((note, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded hover:bg-accent/20"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex items-center">
                  <NoteSymbol type={note.type} size="sm" />
                  {note.dotted && <span className="font-bold">.</span>}
                  {note.tied && <TieCurve />}
                </div>
                {note.chord && (
                  <span className="font-medium text-sm">
                    {formatChordDisplay(note.chord)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditNote(index)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNote(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bar Preview Modern */}
      {notes.length > 0 && (
        <div className="border-t pt-2">
          <span className="text-xs text-muted-foreground">Bar Preview:</span>
          <div className="flex items-center gap-4 mt-2 flex-wrap min-h-[40px] px-2">
            {notes.map((note, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="relative flex items-center">
                  <NoteSymbol type={note.type} size="sm" />
                  {note.dotted && <span className="text-xs font-bold">.</span>}
                  {note.tied && <TieCurve />}
                </div>
                {note.chord && (
                  <span className="text-[10px] font-medium">
                    {formatChordDisplay(note.chord)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal logic remains for mobile/desktop triggers */}
      {isMobile ? (
        <Sheet open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <NoteEditorContent
              title="Add New Note"
              onSave={handleAddNote}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="max-w-lg">
            <NoteEditorContent
              title="Add New Note"
              onSave={handleAddNote}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Re-use Dialog for editing */}
      {editingNoteIndex !== null && (
        <Dialog open={true} onOpenChange={() => setEditingNoteIndex(null)}>
          <DialogContent className="max-w-lg">
            <NoteEditorContent
              title="Edit Note"
              onSave={handleSaveEdit}
              onCancel={() => setEditingNoteIndex(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FlexibleNoteEditor;
