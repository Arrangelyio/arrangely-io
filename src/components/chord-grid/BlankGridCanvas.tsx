import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useHandwritingRecognition } from "@/hooks/useHandwritingRecognition";
import {
  Loader2,
  Trash2,
  Undo2,
  Check,
  PenTool,
  Plus,
  ChevronDown,
  Eraser,
  Minus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type SectionDefinition,
  type GridLayoutConfig,
  calculateCanvasHeight,
  getGridLineCoordinates,
  calculateSectionLayouts,
} from "@/utils/canvasGridRegions";

interface BlankGridCanvasProps {
  onApply: (text: string) => void;
  onClose: () => void;
}

const SECTION_OPTIONS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Interlude",
  "Solo",
  "Outro",
];

const GRID_CONFIG: Partial<GridLayoutConfig> = {
  barsPerRow: 4,
  barHeight: 70,
  sectionLabelHeight: 32,
  sectionGap: 24,
  topPadding: 16,
  sidePadding: 24,
};

const GRID_LINE_COLOR = "rgba(0,0,0,0.12)";
const SECTION_LABEL_COLOR = "rgba(0,0,0,0.25)";

const BlankGridCanvas: React.FC<BlankGridCanvasProps> = ({ onApply, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [sections, setSections] = useState<SectionDefinition[]>([
    { name: "Intro", rows: 2 },
  ]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [penSize, setPenSize] = useState(2.5);
  const [eraserSize, setEraserSize] = useState(20);

  const {
    isProcessing,
    recognizedText,
    setRecognizedText,
    scheduleRecognition,
    clearRecognition,
  } = useHandwritingRecognition();

  const getCanvasWidth = useCallback(() => {
    return containerRef.current?.clientWidth || 800;
  }, []);

  // Draw grid lines and section labels on the canvas (non-fabric overlay)
  const drawGridOverlay = useCallback(
    (canvas: FabricCanvas, width: number) => {
      const config = { ...GRID_CONFIG, canvasWidth: width };
      const gridLines = getGridLineCoordinates(sections, config);
      const sectionLayouts = calculateSectionLayouts(sections, config);

      // Use after:render to draw grid on top of background but below strokes
      // We remove previous listeners first to avoid stacking
      canvas.off("after:render");
      canvas.on("after:render", () => {
        const ctx = canvas.getContext();
        if (!ctx) return;
        ctx.save();

        // Draw grid lines
        ctx.strokeStyle = GRID_LINE_COLOR;
        ctx.lineWidth = 1;
        for (const h of gridLines.horizontal) {
          ctx.beginPath();
          ctx.moveTo(h.x1, h.y);
          ctx.lineTo(h.x2, h.y);
          ctx.stroke();
        }
        for (const v of gridLines.vertical) {
          ctx.beginPath();
          ctx.moveTo(v.x, v.y1);
          ctx.lineTo(v.x, v.y2);
          ctx.stroke();
        }

        // Draw section labels
        ctx.fillStyle = SECTION_LABEL_COLOR;
        ctx.font = "14px sans-serif";
        ctx.textBaseline = "bottom";
        for (const layout of sectionLayouts) {
          ctx.fillText(layout.name, (config.sidePadding ?? 24), layout.startY - 6);
        }

        ctx.restore();
      });

      canvas.renderAll();
    },
    [sections]
  );

  // Initialize or re-initialize canvas when sections change
  useEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasRef.current;
    if (!container || !canvasEl) return;

    const width = container.clientWidth;
    const height = calculateCanvasHeight(sections, { ...GRID_CONFIG, canvasWidth: width });

    if (fabricRef.current) {
      // Resize existing canvas
      const canvas = fabricRef.current;
      canvas.setDimensions({ width, height });
      drawGridOverlay(canvas, width);
      return;
    }

    // First-time init
    const canvas = new FabricCanvas(canvasEl, {
      width,
      height,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    const brush = new PencilBrush(canvas);
    brush.color = "#1a1a1a";
    brush.width = 2.5;
    canvas.freeDrawingBrush = brush;

    fabricRef.current = canvas;
    setCanvasReady(true);
    drawGridOverlay(canvas, width);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw grid when sections change (without disposing canvas)
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvasReady) return;

    const width = getCanvasWidth();
    const height = calculateCanvasHeight(sections, { ...GRID_CONFIG, canvasWidth: width });
    canvas.setDimensions({ width, height });
    drawGridOverlay(canvas, width);
  }, [sections, canvasReady, drawGridOverlay, getCanvasWidth]);

  // Attach path:created listener for idle detection
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvasReady) return;

    const handlePathCreated = () => {
      scheduleRecognition(() => {
        if (!fabricRef.current) return "";
        return fabricRef.current.toDataURL({ format: "jpeg", quality: 0.7, multiplier: 1 });
      });
    };

    canvas.on("path:created", handlePathCreated);
    return () => {
      canvas.off("path:created", handlePathCreated);
    };
  }, [canvasReady, scheduleRecognition]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = fabricRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const height = calculateCanvasHeight(sections, { ...GRID_CONFIG, canvasWidth: width });
      canvas.setDimensions({ width, height });
      drawGridOverlay(canvas, width);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sections, drawGridOverlay]);

  const addSection = (name: string) => {
    setSections((prev) => [...prev, { name, rows: 1 }]);
  };

  const addRowToSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, rows: s.rows + 1 } : s))
    );
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  // Switch between pen and eraser
  const switchTool = useCallback((newTool: "pen" | "eraser") => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setTool(newTool);

    if (newTool === "eraser") {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = "#ffffff";
      brush.width = eraserSize;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = "#1a1a1a";
      brush.width = penSize;
      canvas.freeDrawingBrush = brush;
    }
  }, [penSize, eraserSize]);

  // Update brush size live
  const handlePenSizeChange = useCallback((value: number[]) => {
    const size = value[0];
    setPenSize(size);
    const canvas = fabricRef.current;
    if (canvas && tool === "pen" && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = size;
    }
  }, [tool]);

  const handleEraserSizeChange = useCallback((value: number[]) => {
    const size = value[0];
    setEraserSize(size);
    const canvas = fabricRef.current;
    if (canvas && tool === "eraser" && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = size;
    }
  }, [tool]);

  const removeRowFromSection = (index: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index && s.rows > 1 ? { ...s, rows: s.rows - 1 } : s))
    );
  };

  const handleClear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    drawGridOverlay(canvas, getCanvasWidth());
    clearRecognition();
  }, [clearRecognition, drawGridOverlay, getCanvasWidth]);

  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      canvas.remove(objects[objects.length - 1]);
      canvas.renderAll();
    }
  }, []);

  const handleApply = () => {
    if (recognizedText.trim()) {
      onApply(recognizedText);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-background rounded-lg border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Add Section dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add Section
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SECTION_OPTIONS.map((name) => (
                <DropdownMenuItem key={name} onClick={() => addSection(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Separator */}
          <div className="w-px h-6 bg-border" />

          {/* Pen / Eraser toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "pen" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => switchTool("pen")}
              >
                <PenTool className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={tool === "eraser" ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => switchTool("eraser")}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eraser</TooltipContent>
          </Tooltip>

          {/* Size slider */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {tool === "pen" ? "Size" : "Eraser"}
            </span>
            <Slider
              value={[tool === "pen" ? penSize : eraserSize]}
              onValueChange={tool === "pen" ? handlePenSizeChange : handleEraserSizeChange}
              min={tool === "pen" ? 1 : 8}
              max={tool === "pen" ? 8 : 50}
              step={0.5}
              className="w-20"
            />
            <span className="text-[10px] text-muted-foreground w-5 text-right">
              {tool === "pen" ? penSize : eraserSize}
            </span>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Reading...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 w-8 p-0">
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!recognizedText.trim()}
            className="h-8 ml-1"
          >
            <Check className="h-4 w-4 mr-1" />
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8">
            Close
          </Button>
        </div>
      </div>

      {/* Section management bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/10 overflow-x-auto flex-shrink-0">
        {sections.map((section, idx) => (
          <div key={idx} className="flex items-center gap-1 text-xs shrink-0">
            <span className="font-medium text-foreground">{section.name}</span>
            <span className="text-muted-foreground">({section.rows}r)</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => addRowToSection(idx)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add row</TooltipContent>
            </Tooltip>
            {section.rows > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeRowFromSection(idx)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove row</TooltipContent>
              </Tooltip>
            )}
            {sections.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSection(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove section</TooltipContent>
              </Tooltip>
            )}
            {idx < sections.length - 1 && (
              <span className="text-border mx-1">|</span>
            )}
          </div>
        ))}
      </div>

      {/* Split-screen: Canvas (top) + Preview (bottom) */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={65} minSize={30}>
          <div ref={containerRef} className="w-full h-full relative touch-none overflow-auto">
            <canvas ref={canvasRef} className="block" />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={20}>
          <div className="p-3 h-full flex flex-col">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              Recognized Chords
              {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            <Textarea
              value={recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              placeholder="Write chords in the grid boxes above. Recognized chords will appear here..."
              className="flex-1 resize-none text-sm font-mono min-h-[80px]"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default BlankGridCanvas;
