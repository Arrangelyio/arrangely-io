import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Grid, PenTool, Camera } from "lucide-react";

interface GridTemplateSelectorProps {
  onSelectTemplate: () => void;
  onSelectBlank: () => void;
  onSelectImageUpload?: () => void;
}

const GridTemplateSelector: React.FC<GridTemplateSelectorProps> = ({
  onSelectTemplate,
  onSelectBlank,
  onSelectImageUpload,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-foreground mb-2">
          How do you want to start?
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Choose a template to build your chord grid with the editor, or start with a blank canvas to handwrite everything.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {/* Template option */}
        <Card
          className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all hover:shadow-md group"
          onClick={onSelectTemplate}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Grid className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground text-sm">Use Template</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Build with keyboard &amp; mouse. Add sections, type chords, configure settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Image option */}
        <Card
          className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all hover:shadow-md group"
          onClick={onSelectImageUpload}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground text-sm">Upload Image</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Take a photo of a chord chart &amp; let AI recognize it automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Blank canvas option */}
        <Card
          className="cursor-pointer border-2 border-border hover:border-primary/50 transition-all hover:shadow-md group"
          onClick={onSelectBlank}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 px-4 gap-3">
            <div className="h-14 w-14 rounded-xl bg-accent/30 flex items-center justify-center group-hover:bg-accent/50 transition-colors">
              <PenTool className="h-7 w-7 text-accent-foreground" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground text-sm">Blank Canvas</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Handwrite chords on grid paper with your stylus. Best for iPad &amp; tablets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GridTemplateSelector;
