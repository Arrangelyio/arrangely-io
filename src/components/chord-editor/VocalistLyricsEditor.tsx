import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, Save, Eye } from "lucide-react";

interface VocalistLyricsEditorProps {
  sectionName: string;
  sectionType: string;
  currentLyrics: string;
  onSave: (lyrics: string) => void;
  onPreview: () => void;
}

const VocalistLyricsEditor: React.FC<VocalistLyricsEditorProps> = ({
  sectionName,
  sectionType,
  currentLyrics,
  onSave,
  onPreview,
}) => {
  const [lyrics, setLyrics] = useState(currentLyrics);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSave(lyrics);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLyrics(currentLyrics);
    setIsEditing(false);
  };

  const handlePreview = () => {
    onPreview();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="grid grid-cols-2 items-center gap-x-4 gap-y-3 sm:flex sm:justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">
              Vocalist Lyrics
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {sectionName || sectionType}
            </Badge>
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Lyrics
                </Button>
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Enter lyrics for vocalist...&#10;&#10;Example:&#10;Verse 1 lyrics here&#10;Second line of lyrics&#10;&#10;Chorus lyrics here&#10;Another line of chorus"
              className="min-h-[200px] resize-none"
            />
            <div className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> Add line breaks to separate verses and
              choruses. These lyrics will be displayed to vocalists during live
              performance.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {lyrics.trim() ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Current Lyrics:
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {lyrics}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No lyrics added yet</p>
                <p className="text-xs mt-1">
                  Click "Edit Lyrics" to add vocalist lyrics for this section
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VocalistLyricsEditor;
