import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ChordSuggestions from "./ChordSuggestions";
import InteractiveChordEditor from "./InteractiveChordEditor";
import DetailedMusicalEditor from "./DetailedMusicalEditor";

interface MasterSection {
  lyrics: string;
  chords: string;
}

interface MasterSections {
  [key: string]: MasterSection;
}

interface ChordsStepProps {
  masterSections: MasterSections;
  updateMasterSection: (type: string, field: 'lyrics' | 'chords', value: string) => void;
  currentSectionIndex: number;
  setCurrentSectionIndex: (index: number) => void;
  currentKey: string;
}

const ChordsStep = ({ 
  masterSections, 
  updateMasterSection, 
  currentSectionIndex, 
  setCurrentSectionIndex, 
  currentKey 
}: ChordsStepProps) => {
  const { toast } = useToast();
  
  // Sections that are typically instrumental/musical (no lyrics)
  const musicalSections = ['intro', 'outro', 'interlude', 'instrumental'];
  
  // Helper function to check if a section is musical
  const isMusicalSection = (sectionType: string) => {
    return musicalSections.some(musical => sectionType.toLowerCase().includes(musical));
  };
  
  const allSections = Object.entries(masterSections);
  const currentSection = allSections[currentSectionIndex];
  
  if (!currentSection) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Step 3: Add Chords</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No sections found. Go back to Step 2 to add sections first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [sectionType, sectionData] = currentSection;

  const handleChordInsert = (chord: string) => {
    const textarea = document.getElementById('chord-editor') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = sectionData.chords;
      const newValue = currentValue.substring(0, start) + chord + ' ' + currentValue.substring(end);
      updateMasterSection(sectionType, 'chords', newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + chord.length + 1, start + chord.length + 1);
      }, 0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Key Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span>Step 3: Interactive Chord Placement - {sectionType.charAt(0).toUpperCase() + sectionType.slice(1)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentSectionIndex + 1} of {allSections.length}
            </div>
          </CardTitle>
          <p className="text-muted-foreground">
            {isMusicalSection(sectionType) 
              ? "Configure chords and instrument cues for this instrumental section." 
              : "Click on any word in the lyrics to place chords above it. No more manual spacing needed!"
            }
          </p>
        </CardHeader>
      </Card>

      {/* Quick Chord Suggestions - Only for lyrical sections */}
      {!isMusicalSection(sectionType) && (
        <ChordSuggestions currentKey={currentKey} onChordInsert={handleChordInsert} />
      )}

      {/* Editor - Different editors for different section types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary capitalize flex items-center gap-2">
            {sectionType} - {isMusicalSection(sectionType) ? 'Musical Structure Editor' : 'Interactive Chord & Lyric Editor'}
            {!isMusicalSection(sectionType) && (
              <div className="text-xs bg-accent px-2 py-1 rounded text-accent-foreground">
                ✨ NEW: Click words to add chords instantly!
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show DetailedMusicalEditor for instrumental sections, InteractiveChordEditor for lyrical sections */}
          {isMusicalSection(sectionType) ? (
            <DetailedMusicalEditor
              sectionType={sectionType}
              value={sectionData.chords}
              onChange={(value) => updateMasterSection(sectionType, 'chords', value)}
              currentKey={currentKey}
              referenceLyrics={sectionData.lyrics}
            />
          ) : (
            <InteractiveChordEditor
              value={sectionData.chords}
              onChange={(value) => updateMasterSection(sectionType, 'chords', value)}
              referenceLyrics={sectionData.lyrics}
              sectionType={sectionType}
              currentKey={currentKey}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t mt-6">
            <Button 
              variant="outline"
              onClick={() => setCurrentSectionIndex(Math.max(0, currentSectionIndex - 1))}
              disabled={currentSectionIndex === 0}
            >
              ← Previous Section
            </Button>
            
            <Button 
              onClick={() => {
                if (currentSectionIndex < allSections.length - 1) {
                  setCurrentSectionIndex(currentSectionIndex + 1);
                } else {
                  toast({
                    title: "Chords Added Successfully! 🎵",
                    description: "All sections completed! Ready for arrangement.",
                  });
                }
              }}
              className="bg-gradient-worship hover:opacity-90"
            >
              {currentSectionIndex < allSections.length - 1 ? 'Save & Next Section →' : 'Complete All Sections'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChordsStep;