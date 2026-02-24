import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Camera,
  Wand2,
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Eye,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRecognizedText, extractMetadata } from "@/utils/chordSymbolMapper";
import { handwritingToGrid } from "@/utils/handwritingToGrid";
import { ArrangementStylePreview } from "@/components/chord-grid/ArrangementStylePreview";

type Step = "upload" | "processing" | "preview" | "details";

interface SongMetadata {
  title: string;
  artist: string;
  songKey: string;
  tempo: number;
  timeSignature: string;
}

interface ImageChordImportProps {
  onApply: (text: string, metadata: SongMetadata) => void;
  onClose: () => void;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "processing", label: "Recognize" },
  { key: "preview", label: "Preview" },
  { key: "details", label: "Details" },
];

const KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F",
  "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
];

const ImageChordImport: React.FC<ImageChordImportProps> = ({
  onApply,
  onClose,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add section numbers like ① ② to "= Section" lines
  const addSectionNumbers = (text: string): string => {
    let count = 0;
    return text.split('\n').map(line => {
      if (line.trim().match(/^=\s*.+/)) {
        count++;
        return `(${count}) ${line.trim()}`;
      }
      return line;
    }).join('\n');
  };

  // Strip section numbers when user edits
  const stripSectionNumbers = (text: string): string => {
    return text.split('\n').map(line => {
      return line.replace(/^\(\d+\)\s*/, '');
    }).join('\n');
  };

  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [uploadMode, setUploadMode] = useState<"image" | "text">("image");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [editableText, setEditableText] = useState("");
  const [metadata, setMetadata] = useState<SongMetadata>({
    title: "",
    artist: "",
    songKey: "C",
    tempo: 120,
    timeSignature: "4/4",
  });

  const handleFileSelect = useCallback(async (file: File) => {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!file.type.startsWith("image/") && !isPdf) {
      toast({ title: "Invalid file", description: "Please select an image or PDF file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    if (isPdf) {
      try {
        // Import pdfjs and set up worker via Vite worker import
        const pdfjs = await import("pdfjs-dist");
        // Create worker from the worker file using Vite's ?worker&url pattern
        const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
        const worker = new PdfWorker();
        pdfjs.GlobalWorkerOptions.workerPort = worker;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        const dataUrl = canvas.toDataURL("image/png");
        setImagePreview(dataUrl);
        const blob = await (await fetch(dataUrl)).blob();
        const imgFile = new File([blob], file.name.replace(/\.pdf$/i, ".png"), { type: "image/png" });
        setImageFile(imgFile);
        if (pdf.numPages > 1) {
          toast({ title: "Multi-page PDF", description: `Only the first page is processed. This PDF has ${pdf.numPages} pages.` });
        }
        worker.terminate();
      } catch (err) {
        console.error("PDF processing error:", err);
        toast({ title: "PDF Error", description: "Failed to process PDF file.", variant: "destructive" });
      }
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  /** Process AI response: extract metadata, normalize, and set state */
  const processAIResponse = (rawText: string) => {
    const normalized = normalizeRecognizedText(rawText);
    const { title, key, tempo, timeSignature, chordText } = extractMetadata(normalized);

    setRecognizedText(chordText);
    setEditableText(chordText);

    setMetadata((prev) => ({
      ...prev,
      ...(title ? { title } : {}),
      ...(key ? { songKey: key } : {}),
      ...(tempo ? { tempo } : {}),
      ...(timeSignature ? { timeSignature } : {}),
    }));
  };

  const handleRecognize = async () => {
    if (uploadMode === "image" && !imageFile) return;
    if (uploadMode === "text" && !pasteText.trim()) {
      toast({ title: "No text", description: "Please paste some chord chart text.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProcessingStage(0);
    setElapsedSeconds(0);
    setCurrentStep("processing");

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Simulate stage progression
    const stageTimers = [
      setTimeout(() => setProcessingStage(1), 1500),
      setTimeout(() => setProcessingStage(2), 4000),
      setTimeout(() => setProcessingStage(3), 8000),
    ];
    try {
      let body: any;

      if (uploadMode === "text") {
        body = { mode: "text", textContent: pasteText };
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(imageFile!);
        });
        body = { imageBase64: base64, mode: "photo" };
      }

      // Call edge function via Supabase client
      const { data, error: fnError } = await supabase.functions.invoke("analyze-chord-image", {
        body,
      });

      console.log("Edge function response:", { data, fnError: fnError?.message });

      // supabase.functions.invoke returns the error body as `data` on non-2xx
      // Check both data and fnError for error signals
      if (fnError) {
        const errMsg = fnError.message || JSON.stringify(data) || "Recognition failed";
        const dataErr = data?.error || "";
        console.error("Function error:", errMsg, "data:", data);
        if (errMsg.includes("429") || dataErr.includes("429") || data?.retryAfter) throw new Error("429");
        if (errMsg.includes("402") || errMsg.includes("credits") || dataErr.includes("402") || dataErr.includes("credits")) throw new Error("402");
        if (errMsg.includes("503") || dataErr.includes("unavailable")) throw new Error("503");
        throw new Error(dataErr || errMsg);
      }

      if (data && !data.success) {
        const errMsg = data.error || "Recognition failed";
        console.error("AI error:", errMsg);
        if (errMsg.includes("402") || errMsg.includes("credits")) throw new Error("402");
        if (errMsg.includes("429")) throw new Error("429");
        if (errMsg.includes("503") || errMsg.includes("unavailable")) throw new Error("503");
        throw new Error(errMsg);
      }

      const extractedText = data?.extractedText || "";
      console.log("AI response extractedText:", extractedText.substring(0, 200));

      if (!extractedText.trim()) {
        throw new Error("AI returned empty result. Please try again.");
      }

      processAIResponse(extractedText);

      setCurrentStep("preview");
      toast({ title: "Recognition Complete!", description: "Review the detected chords below." });
    } catch (error: any) {
      console.error("Recognition error:", error);
      
      if (error?.message?.includes("429") || error?.status === 429) {
        toast({ title: "Rate Limited", description: "Please wait a moment and try again.", variant: "destructive" });
      } else if (error?.message?.includes("402") || error?.status === 402) {
        toast({ title: "Credits Exhausted", description: "Please add credits to continue.", variant: "destructive" });
      } else if (error?.message?.includes("503") || error?.message?.includes("unavailable")) {
        toast({ title: "AI Temporarily Unavailable", description: "The AI service is busy. Please try again in a moment.", variant: "destructive" });
      } else {
        toast({ title: "Recognition Failed", description: error.message || "Could not recognize chords.", variant: "destructive" });
      }
      setCurrentStep("upload");
    } finally {
      setIsProcessing(false);
      stageTimers.forEach(clearTimeout);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  };

  const handleApply = () => {
    if (!editableText.trim()) {
      toast({ title: "No chords", description: "No chord data to apply.", variant: "destructive" });
      return;
    }
    onApply(editableText, metadata);
  };

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    i < stepIndex
                      ? "bg-primary text-primary-foreground"
                      : i === stepIndex
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${
                    i === stepIndex ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 ${i < stepIndex ? "bg-primary" : "bg-border"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Upload */}
        {currentStep === "upload" && (
          <div className="flex flex-col items-center gap-6 max-w-lg mx-auto py-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-2">Import Chord Chart</h2>
              <p className="text-sm text-muted-foreground">
                Upload an image or paste text from your chord chart. AI will recognize and structure it.
              </p>
            </div>

            {/* Upload / Paste Toggle */}
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "image" | "text")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Image
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Paste Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-4">
                {!imagePreview ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/3] max-h-[300px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground text-sm">Tap to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC, PDF • Max 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                      <img
                        src={imagePreview}
                        alt="Chord chart preview"
                        className="w-full max-h-[300px] object-contain"
                      />
                      <Badge className="absolute top-2 right-2 bg-background/80 text-foreground text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {imageFile?.name}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="flex-1"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Change Image
                      </Button>
                      <Button size="sm" onClick={handleRecognize} className="flex-1">
                        <Wand2 className="h-3.5 w-3.5 mr-1" />
                        Recognize Chords
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </TabsContent>

              <TabsContent value="text" className="mt-4 space-y-3">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Paste your chord chart text here...

Example:
Intro
| Gm9 | Am7 | Gm7 | Am7 |

Verse
| FΔ | FΔ | Am7 | Am7 |
| BbΔ | BbΔ | Am7 Gm7 | Dm9 |`}
                  className="font-mono text-sm min-h-[250px] resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleRecognize}
                  disabled={!pasteText.trim()}
                  className="w-full"
                >
                  <Wand2 className="h-3.5 w-3.5 mr-1" />
                  Normalize & Preview
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 2: Processing */}
        {currentStep === "processing" && (
          <div className="flex flex-col items-center justify-center gap-6 py-12 max-w-sm mx-auto">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {uploadMode === "text" ? "Normalizing chord chart..." : "Analyzing chord chart..."}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Elapsed: {elapsedSeconds}s
              </p>
            </div>

            {/* Stage indicators */}
            <div className="w-full space-y-2.5">
              {[
                { label: uploadMode === "text" ? "Parsing text input" : "Preparing image", icon: "📄" },
                { label: "Sending to AI engine", icon: "🚀" },
                { label: "Recognizing chords & sections", icon: "🎵" },
                { label: "Structuring output", icon: "✅" },
              ].map((stage, i) => {
                const isActive = processingStage === i;
                const isDone = processingStage > i;
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isActive ? "bg-primary/10 border border-primary/20" : isDone ? "opacity-60" : "opacity-30"
                  }`}>
                    {isDone ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-sm ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {stage.icon} {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Typically takes 5–15 seconds depending on complexity
            </p>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === "preview" && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Review & Edit</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep("details")}
              >
                Continue
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Editable text */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Recognized Text</Label>
                  <Badge variant="secondary" className="text-xs">Editable</Badge>
                </div>
                <Textarea
                  value={addSectionNumbers(editableText)}
                  onChange={(e) => setEditableText(stripSectionNumbers(e.target.value))}
                  className="font-mono text-sm min-h-[350px] resize-none"
                  placeholder="Recognized chord text will appear here..."
                />
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Live Preview</Label>
                </div>
                <div className="border border-border rounded-md overflow-hidden h-[350px] overflow-y-auto">
                  <ArrangementStylePreview
                    textInput={editableText}
                    songTitle={metadata.title || "Untitled"}
                    artistName={metadata.artist}
                    songKey={metadata.songKey}
                    tempo={metadata.tempo}
                    timeSignature={metadata.timeSignature}
                  />
                </div>
              </div>
            </div>

            {/* Uploaded image reference */}
            {imagePreview && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  View original image
                </summary>
                <div className="mt-2 rounded-lg border border-border overflow-hidden">
                  <img src={imagePreview} alt="Original" className="w-full max-h-[200px] object-contain bg-muted/20" />
                </div>
              </details>
            )}
          </div>
        )}

        {/* Step 4: Details */}
        {currentStep === "details" && (
          <div className="space-y-6 max-w-2xl mx-auto py-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">Song Details</h3>
              <p className="text-sm text-muted-foreground">Fill in the song information before saving.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="song-title">Song Title *</Label>
                <Input
                  id="song-title"
                  value={metadata.title}
                  onChange={(e) => setMetadata((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Let's Stay Together"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={metadata.artist}
                  onChange={(e) => setMetadata((p) => ({ ...p, artist: e.target.value }))}
                  placeholder="e.g. Al Green"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Select
                    value={metadata.songKey}
                    onValueChange={(v) => setMetadata((p) => ({ ...p, songKey: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KEYS.map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo</Label>
                  <Input
                    id="tempo"
                    type="number"
                    value={metadata.tempo}
                    onChange={(e) => setMetadata((p) => ({ ...p, tempo: parseInt(e.target.value) || 120 }))}
                    min={40}
                    max={300}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Sig.</Label>
                  <Select
                    value={metadata.timeSignature}
                    onValueChange={(v) => setMetadata((p) => ({ ...p, timeSignature: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8"].map((ts) => (
                        <SelectItem key={ts} value={ts}>{ts}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Preview summary */}
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Preview</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto rounded border border-border">
                  <ArrangementStylePreview
                    textInput={editableText}
                    songTitle={metadata.title || "Untitled"}
                    artistName={metadata.artist}
                    songKey={metadata.songKey}
                    tempo={metadata.tempo}
                    timeSignature={metadata.timeSignature}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("preview")} className="flex-1">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Back
              </Button>
              <Button onClick={handleApply} className="flex-1" disabled={!metadata.title.trim()}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Apply to Grid
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageChordImport;
