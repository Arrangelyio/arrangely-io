import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Copy, Edit2, GripVertical, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MusicalSectionEditor from "./MusicalSectionEditor";

interface MasterSection {
  lyrics: string;
  chords: string;
}

interface MasterSections {
  [key: string]: MasterSection;
}

interface LyricsStepProps {
  masterSections: MasterSections;
  updateMasterSection: (type: string, field: 'lyrics' | 'chords', value: string) => void;
  deleteMasterSection: (type: string) => void;
  currentKey?: string; // Add this to pass down the current key
}

const LyricsStep = ({ masterSections, updateMasterSection, deleteMasterSection, currentKey = 'C' }: LyricsStepProps) => {
  const { toast } = useToast();
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionType, setNewSectionType] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Common section templates for quick creation
  const sectionTemplates = [
    "verse", "chorus", "bridge", "intro", "outro", 
    "interlude", "pre-chorus", "tag", "instrumental"
  ];

  // Sections that are typically instrumental/musical (no lyrics)
  const musicalSections = ['intro', 'outro', 'interlude', 'instrumental'];

  // Helper function to check if a section is musical
  const isMusicalSection = (sectionType: string) => {
    return musicalSections.some(musical => sectionType.toLowerCase().includes(musical));
  };

  // Get all existing sections as array for better organization
  const existingSections = Object.entries(masterSections);

  const handleCreateSection = (sectionName: string) => {
    if (!sectionName.trim()) return;
    
    const baseName = sectionName.toLowerCase().trim();
    
    // Check if this base section type already exists, if so, create a numbered variant
    let finalSectionName = baseName;
    let counter = 1;
    
    // If the base name exists, find the next available number
    if (masterSections[baseName]) {
      counter = 2;
      while (masterSections[`${baseName}${counter}`]) {
        counter++;
      }
      finalSectionName = `${baseName}${counter}`;
    }

    updateMasterSection(finalSectionName, 'lyrics', '');
    updateMasterSection(finalSectionName, 'chords', '');
    
    toast({
      title: "Section Created! 🎵",
      description: `"${finalSectionName}" section has been added. Start adding lyrics now.`,
    });
    
    setNewSectionName("");
    setNewSectionType("");
    setShowAddDialog(false);
  };

  const handleCreateVariant = (baseSectionType: string) => {
    // Find the highest existing number for this section type
    const existingVariants = Object.keys(masterSections)
      .filter(key => key.startsWith(baseSectionType))
      .map(key => {
        const match = key.match(new RegExp(`^${baseSectionType}(\\d*)$`));
        return match ? (match[1] ? parseInt(match[1]) : 1) : 0;
      })
      .filter(num => num > 0);

    const nextNumber = existingVariants.length === 0 ? 2 : Math.max(...existingVariants) + 1;
    const variantName = `${baseSectionType}${nextNumber}`;

    handleCreateSection(variantName);
  };

  const handleDeleteSection = (sectionType: string) => {
    deleteMasterSection(sectionType);
    
    toast({
      title: "Section Deleted",
      description: `"${sectionType}" section has been removed.`,
    });
  };

  const handleRenameSection = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.toLowerCase().trim()) {
      setEditingSection(null);
      return;
    }

    const normalizedNewName = newName.toLowerCase().trim();
    
    if (masterSections[normalizedNewName]) {
      toast({
        title: "Name Already Exists",
        description: `"${newName}" already exists. Choose a different name.`,
        variant: "destructive"
      });
      return;
    }

    // Copy data to new name
    const sectionData = masterSections[oldName];
    updateMasterSection(normalizedNewName, 'lyrics', sectionData.lyrics);
    updateMasterSection(normalizedNewName, 'chords', sectionData.chords);
    
    // Remove old section
    handleDeleteSection(oldName);
    
    setEditingSection(null);
    toast({
      title: "Section Renamed",
      description: `Renamed "${oldName}" to "${normalizedNewName}"`,
    });
  };

  const handleDuplicateSection = (sectionType: string) => {
    const baseName = sectionType.replace(/\d+$/, ''); // Remove existing numbers
    const existingData = masterSections[sectionType];
    
    handleCreateVariant(baseName);
    
    // Copy the lyrics after a brief delay to ensure the section exists
    setTimeout(() => {
      const variants = Object.keys(masterSections).filter(key => key.startsWith(baseName));
      const newestVariant = variants[variants.length - 1];
      updateMasterSection(newestVariant, 'lyrics', existingData.lyrics);
    }, 100);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Step 2: Create & Organize Song Sections</CardTitle>
          <p className="text-muted-foreground">
            Build your song structure by creating sections like verses, choruses, bridges, etc. 
            You can create multiple variants (Verse 1, Verse 2) and organize them as needed.
          </p>
        </CardHeader>
      </Card>

      {/* Quick Create Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🚀 Quick Create Common Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {sectionTemplates.map(template => (
              <Button
                key={template}
                variant="outline"
                size="sm"
                onClick={() => handleCreateSection(template)}
                className="capitalize"
              >
                <Plus className="w-3 h-3 mr-1" />
                {template}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Section Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            ✨ Create Custom Section
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Custom Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Section Name</label>
                    <Input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="e.g., Pre-Chorus, Tag, Special Bridge..."
                      className="mt-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateSection(newSectionName)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handleCreateSection(newSectionName)}
                      disabled={!newSectionName.trim()}
                    >
                      Create Section
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Existing Sections - Vertical List Layout */}
      {existingSections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">📝 Your Song Structure</h3>
            <Badge variant="secondary">{existingSections.length} sections</Badge>
          </div>
          
          {/* Vertical list layout - better for song flow */}
          <div className="space-y-3">
            {existingSections.map(([type, data], index) => (
              <Card key={type} className="relative group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Section Number for Song Order */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        {editingSection === type ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameSection(type, editingName)}
                            onKeyPress={(e) => e.key === 'Enter' && handleRenameSection(type, editingName)}
                            className="text-base font-semibold border-primary w-40"
                            autoFocus
                          />
                        ) : (
                          <CardTitle 
                            className="text-primary capitalize cursor-pointer hover:text-primary/80 text-base"
                            onClick={() => {
                              setEditingSection(type);
                              setEditingName(type);
                            }}
                          >
                            {type}
                            <Edit2 className="w-3 h-3 ml-1 inline opacity-0 group-hover:opacity-50" />
                          </CardTitle>
                        )}
                        
                        {/* Section Type Badge */}
                        <Badge variant={isMusicalSection(type) ? "default" : "secondary"} className="text-xs">
                          {isMusicalSection(type) ? "Musical" : "Lyrics"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateSection(type)}
                        className="h-7 w-7 p-0"
                        title="Create variant (e.g., Verse 2)"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSection(type)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        title="Delete section"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {/* Static height content area - truncated text with expand on hover */}
                  <div className="h-32 overflow-hidden relative">
                    {/* Show simple notes input for instrumental sections, Textarea for lyrical sections */}
                    {isMusicalSection(type) ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Music className="w-4 h-4" />
                          Musical Section - Add simple notes or instructions
                        </div>
                        <Textarea
                          value={(() => {
                            try {
                              const parsed = JSON.parse(data.lyrics);
                              return parsed.notes || '';
                            } catch {
                              return data.lyrics;
                            }
                          })()}
                          onChange={(e) => {
                            // Store as simple text with default musical properties
                            const musicalData = {
                              barCount: 4,
                              timeSignature: '4/4',
                              notes: e.target.value
                            };
                            updateMasterSection(type, 'lyrics', JSON.stringify(musicalData));
                          }}
                          placeholder={`Add notes for ${type}...\n\nExamples:\n• "Acoustic guitar intro - 4 bars"\n• "Piano outro with fade"\n• "Instrumental break - drums only"`}
                          className="h-20 resize-none text-sm border border-border/30 rounded-md p-2 focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    ) : (
                      <>
                        <Textarea
                          value={data.lyrics}
                          onChange={(e) => updateMasterSection(type, 'lyrics', e.target.value)}
                          placeholder={`Enter ${type} lyrics here...\n\nExample:\nVerse lines here\nWith multiple lines\nOf beautiful lyrics`}
                          className="h-28 resize-none text-sm border-0 p-0 focus:ring-0 bg-transparent"
                        />
                      </>
                    )}
                  </div>
                  
                  {/* Content summary at bottom */}
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    {isMusicalSection(type) ? (
                      <span>
                        {(() => {
                          try {
                            const parsed = JSON.parse(data.lyrics);
                            return `${parsed.barCount || 4} bars • ${parsed.timeSignature || '4/4'}`;
                          } catch {
                            return "Musical section";
                          }
                        })()}
                      </span>
                    ) : data.lyrics.trim() ? (
                      <span>
                        {data.lyrics.split('\n').filter(line => line.trim()).length} lines • 
                        {data.lyrics.trim().split(/\s+/).length} words
                      </span>
                    ) : (
                      <span className="text-amber-600">No content yet</span>
                    )}
                    
                    <span className="text-xs text-muted-foreground">
                      Click to edit
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {existingSections.length === 0 && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="text-lg font-semibold mb-2">No sections created yet</h3>
              <p className="text-sm mb-4">Start by creating common sections like verse and chorus above</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LyricsStep;