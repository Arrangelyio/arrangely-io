import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, FileText, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TextModeEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const TextModeEditor: React.FC<TextModeEditorProps> = ({
  value,
  onChange,
  className,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Apply syntax highlighting styles
  const applySyntaxHighlighting = () => {
    if (textareaRef.current) {
      // Basic syntax highlighting simulation through CSS classes
      const lines = value.split('\n');
      return lines.map((line, index) => {
        let className = '';
        
        // Section titles (starting with = or -)
        if (line.trim().match(/^[=-]\s*.+/)) {
          className = 'text-primary font-semibold';
        }
        // Chords (inside parentheses or common chord patterns)
        else if (line.match(/[CDEFGAB][#b]?[maj|min|m|7|9|sus|add|dim|aug]*/g)) {
          className = 'text-blue-600 dark:text-blue-400';
        }
        // Special symbols
        else if (line.match(/[%§r12348]/)) {
          className = 'text-orange-500 dark:text-orange-400';
        }
        // Comments (starting with #)
        else if (line.trim().startsWith('#')) {
          className = 'text-muted-foreground italic';
        }
        
        return { line, className, index };
      });
    }
    return [];
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with cheat sheet button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h3 className="text-sm font-medium">Text Mode Editor</h3>
        </div>
        
        <Dialog open={showCheatSheet} onOpenChange={setShowCheatSheet}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <HelpCircle className="h-3 w-3" />
              Cheat Sheet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chord Sheet Syntax Reference</DialogTitle>
              <DialogDescription>
                Quick reference for text mode chord sheet syntax
              </DialogDescription>
            </DialogHeader>
            <CheatSheetContent />
          </DialogContent>
        </Dialog>
      </div>

      {/* Text Editor */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            className="w-full h-full min-h-[400px] p-4 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-0 bg-transparent"
            placeholder={`Enter your chord sheet using syntax like:

= Intro
C Am F G
C Am F G

= Verse
(C) Am (F) G
(C) Am (F) G
% (repeat previous bar)

= Chorus  
F C Am G
F C Am G

Use symbols:
= Section titles
( ) Chord emphasis
% Repeat previous bar
r1 Repeat 1st bar
§ Segno
# Comments`}
            spellCheck={false}
          />
        </CardContent>
      </Card>

      {/* Syntax hints */}
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-xs">= Section</Badge>
        <Badge variant="outline" className="text-xs">( ) Emphasis</Badge>
        <Badge variant="outline" className="text-xs">% Repeat</Badge>
        <Badge variant="outline" className="text-xs"># Comment</Badge>
        <Badge variant="outline" className="text-xs">r1 Reprint</Badge>
        <Badge variant="outline" className="text-xs">§ Segno</Badge>
      </div>
    </div>
  );
};

const CheatSheetContent = () => {
  return (
    <Tabs defaultValue="sections" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="chords">Chords</TabsTrigger>
        <TabsTrigger value="symbols">Symbols</TabsTrigger>
        <TabsTrigger value="formatting">Formatting</TabsTrigger>
      </TabsList>
      
      <TabsContent value="sections" className="mt-4">
        <div className="space-y-4">
          <h4 className="font-semibold">Section Titles</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">= Intro</code>
              <span>Section delimiter with border box</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">- Verse</code>
              <span>Text line section title</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">: Ve rs e</code>
              <span>Literal text line (keeps spaces)</span>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="chords" className="mt-4">
        <div className="space-y-4">
          <h4 className="font-semibold">Chord Notation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">C F# Bb</code>
              <span>Major chords</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">C7 CMaj7 Cj7</code>
              <span>Dominant 7 / Major 7</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">Am AmA-α</code>
              <span>Minor chords</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">Dm7 Bm7b5</code>
              <span>Minor 7 / Half-diminished</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">B+ Ebalt</code>
              <span>Augmented / Altered</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">Dsus Dsus2 Dsus4</code>
              <span>Suspended chords</span>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="symbols" className="mt-4">
        <div className="space-y-4">
          <h4 className="font-semibold">Special Symbols</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">%</code>
              <span>Simile - single bar repeat</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">%%</code>
              <span>Simile - two bars repeat</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">r1</code>
              <span>Reprint previous bar</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">r2</code>
              <span>Reprint previous two bars</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">§</code>
              <span>Segno</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">G "annotation"</code>
              <span>Add text annotation to chord</span>
            </div>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="formatting" className="mt-4">
        <div className="space-y-4">
          <h4 className="font-semibold">Formatting & Layout</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">(A B)</code>
              <span>Repeat bars</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">(A B)x3 (A B)3x</code>
              <span>Repeat 3 times</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">(A B L C D2 E F)</code>
              <span>1st and 2nd ending</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">X X A B</code>
              <span>Indent bars using 'X'</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">+</code>
              <span>Start a new page</span>
            </div>
            <div className="flex justify-between">
              <code className="bg-muted px-2 py-1 rounded">2-4 A 3-4 B 5-4</code>
              <span>Add time signatures to bar</span>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default TextModeEditor;