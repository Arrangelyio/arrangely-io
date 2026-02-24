import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Music, BarChart3, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetailedMusicalData {
  chordProgression: string;
  instrumentCues: string;
  showAsBar: boolean;
  barCount: number;
}

interface DetailedMusicalEditorProps {
  sectionType: string;
  value: string; // This will be the JSON string stored in chords field
  onChange: (value: string) => void;
  currentKey: string;
  referenceLyrics: string; // The bar count data from lyrics field
}

const DetailedMusicalEditor = ({ sectionType, value, onChange, currentKey, referenceLyrics }: DetailedMusicalEditorProps) => {
  const { toast } = useToast();

  // Parse bar count from reference lyrics (Step 2 data)
  const getBarCountFromReference = (referenceData: string): number => {
    try {
      const parsed = JSON.parse(referenceData);
      return parsed.barCount || 4;
    } catch {
      return 4;
    }
  };

  const barCount = getBarCountFromReference(referenceLyrics);

  // Parse existing chord data or create default
  const parseData = (dataString: string): DetailedMusicalData => {
    if (!dataString.trim()) {
      return {
        chordProgression: '',
        instrumentCues: '',
        showAsBar: false,
        barCount: barCount
      };
    }

    try {
      const parsed = JSON.parse(dataString);
      return {
        chordProgression: parsed.chordProgression || '',
        instrumentCues: parsed.instrumentCues || '',
        showAsBar: parsed.showAsBar || false,
        barCount: barCount
      };
    } catch {
      // If it's old text data, treat it as chord progression
      return {
        chordProgression: dataString,
        instrumentCues: '',
        showAsBar: false,
        barCount: barCount
      };
    }
  };

  const [data, setData] = useState<DetailedMusicalData>(() => parseData(value));

  const updateData = (newData: DetailedMusicalData) => {
    const updatedData = { ...newData, barCount: barCount }; // Always use current bar count
    setData(updatedData);
    onChange(JSON.stringify(updatedData));
  };

  // Parse chord progression into bars (split by |) - keep all bars to preserve positions
  const parsedBars = data.chordProgression
    .split('|')
    .map(bar => bar.trim());

  // Quick chord presets based on section type and current key
  const getQuickPresets = () => {
    const presets = {
      intro: [
        `${currentKey} | G | Am | F`,
        `${currentKey} | Am | F | G`,
        `${currentKey} G | Am F | ${currentKey}`
      ],
      outro: [
        `${currentKey} | Am | F | G | ${currentKey}`,
        `Am | F | ${currentKey} | G | ${currentKey}`,
        `${currentKey} G | Am F | ${currentKey} | ${currentKey}`
      ],
      interlude: [
        `Am | F | ${currentKey} | G`,
        `${currentKey} | G Am | F | G`,
        `Am F | ${currentKey} G | Am | F`
      ]
    };

    const sectionKey = sectionType.toLowerCase().includes('intro') ? 'intro' :
                      sectionType.toLowerCase().includes('outro') ? 'outro' : 'interlude';
    
    return presets[sectionKey as keyof typeof presets] || presets.intro;
  };

  const loadPreset = (preset: string) => {
    updateData({ ...data, chordProgression: preset });
    toast({
      title: "Chord Progression Loaded! 🎵",
      description: `Applied: ${preset}`,
    });
  };

  // Generate individual bar inputs for bar view
  const generateBarInputs = () => {
    const bars = Array(barCount).fill('').map((_, index) => {
      return parsedBars[index] || '';
    });
    return bars;
  };

  const updateBarValue = (barIndex: number, value: string) => {
    const bars = generateBarInputs();
    bars[barIndex] = value;
    // Keep all bars up to the last non-empty bar to preserve positions
    let lastNonEmptyIndex = -1;
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i].trim().length > 0) {
        lastNonEmptyIndex = i;
        break;
      }
    }
    const relevantBars = bars.slice(0, lastNonEmptyIndex + 1);
    const newProgression = relevantBars.join(' | ');
    updateData({ ...data, chordProgression: newProgression });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary capitalize">
          <Music className="w-5 h-5" />
          {sectionType} - Detailed Chord Editing
          <Badge variant="secondary" className="ml-auto">
            {barCount} bars planned
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add chords and instrument cues for this {barCount}-bar {sectionType} section.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">🚀 Quick Chord Progressions</label>
          <div className="flex flex-wrap gap-2">
            {getQuickPresets().map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => loadPreset(preset)}
                className="text-xs font-mono"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Bar View Toggle */}
        <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/20">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span className="text-sm font-medium">Input Mode:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Free Text</span>
            <Switch
              checked={data.showAsBar}
              onCheckedChange={(checked) => updateData({ ...data, showAsBar: checked })}
            />
            <span className="text-xs text-muted-foreground">Bar Grid</span>
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        {/* Chord Input - Free Text Mode */}
        {!data.showAsBar && (
          <div>
            <label className="text-sm font-medium mb-2 block">🎼 Chord Progression (Free Text)</label>
            <Input
              value={data.chordProgression}
              onChange={(e) => updateData({ ...data, chordProgression: e.target.value })}
              placeholder={`${currentKey} | G | Am F | G ${currentKey} | Dm G`}
              className="font-mono text-sm"
              style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
            />
            <div className="text-xs text-muted-foreground mt-1">
              💡 Use | to separate bars. Use dots (.) for beats/rests: C . G . or Am F . .
            </div>
          </div>
        )}

        {/* Chord Input - Bar Grid Mode */}
        {data.showAsBar && (
          <div>
            <label className="text-sm font-medium mb-3 block">🎼 Chord Progression (Bar Grid)</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: barCount }, (_, index) => (
                <div key={index} className="space-y-1">
                  <div className="text-xs text-muted-foreground text-center font-medium">
                    Bar {index + 1}
                  </div>
                  <Input
                    value={generateBarInputs()[index]}
                    onChange={(e) => updateBarValue(index, e.target.value)}
                    placeholder={index === 0 ? `${currentKey} . . .` : "G . Am ."}
                    className="text-center font-mono font-bold text-primary border-2 border-primary/20 focus:border-primary/60 h-12"
                    style={{ fontFamily: 'Monaco, Consolas, "Courier New", monospace' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visual Chord Chart (always show when there are chords) */}
        {parsedBars.length > 0 && (
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <div className="text-sm font-medium mb-2">🎵 Visual Chord Chart:</div>
            <div className="font-mono text-sm flex items-center gap-2 flex-wrap">
              {parsedBars.map((bar, index) => (
                <span key={index} className="flex items-center">
                  <span className="border border-border px-3 py-1 rounded bg-background font-bold text-primary min-w-[60px] text-center">
                    {bar}
                  </span>
                  {index < parsedBars.length - 1 && (
                    <span className="mx-1 text-muted-foreground font-bold">|</span>
                  )}
                </span>
              ))}
            </div>
            {parsedBars.length !== barCount && (
              <div className="text-xs text-amber-600 mt-2">
                ⚠️ You have {parsedBars.length} bars filled, but planned for {barCount} bars
              </div>
            )}
          </div>
        )}

        {/* Instrument Cues */}
        <div>
          <label className="text-sm font-medium mb-2 block">🎸 Instrument Cues & Notes</label>
          <Textarea
            value={data.instrumentCues}
            onChange={(e) => updateData({ ...data, instrumentCues: e.target.value })}
            placeholder="e.g., Electric guitar melody, repeat 2x, soft pads only, build intensity..."
            className="min-h-[80px]"
          />
        </div>

        {/* Common Cue Presets */}
        <div>
          <label className="text-sm font-medium mb-2 block">📝 Quick Cue Presets</label>
          <div className="flex flex-wrap gap-2">
            {[
              "Electric guitar melody",
              "Soft pads only",
              "Repeat 2x", 
              "Build intensity",
              "Piano arpeggios",
              "No drums",
              "Fade out"
            ].map(preset => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => updateData({ 
                  ...data, 
                  instrumentCues: data.instrumentCues ? `${data.instrumentCues}, ${preset.toLowerCase()}` : preset.toLowerCase()
                })}
                className="text-xs"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Section Summary */}
        {(data.chordProgression || data.instrumentCues) && (
          <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
            <div className="text-sm font-semibold mb-2 text-primary">📋 Section Summary:</div>
            <div className="text-sm space-y-1">
              <div><strong>Planned Length:</strong> {barCount} bars</div>
              {data.chordProgression && (
                <div><strong>Progression:</strong> {data.chordProgression}</div>
              )}
              {parsedBars.length > 0 && (
                <div><strong>Filled Bars:</strong> {parsedBars.length} / {barCount}</div>
              )}
              {data.instrumentCues && (
                <div><strong>Cues:</strong> {data.instrumentCues}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetailedMusicalEditor;