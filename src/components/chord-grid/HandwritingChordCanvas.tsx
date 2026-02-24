import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush } from "fabric";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useHandwritingRecognition } from "@/hooks/useHandwritingRecognition";
import { Loader2, Trash2, Undo2, Check, PenTool, Eraser } from "lucide-react";

interface HandwritingChordCanvasProps {
  onApply: (text: string) => void;
  onClose: () => void;
}

const GUIDE_LINE_SPACING = 60;
const GUIDE_LINE_COLOR = "rgba(0,0,0,0.08)";

const HandwritingChordCanvas: React.FC<HandwritingChordCanvasProps> = ({ onApply, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const {
    isProcessing,
    recognizedText,
    setRecognizedText,
    scheduleRecognition,
    clearRecognition,
  } = useHandwritingRecognition();

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.max(400, container.clientHeight);

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      isDrawingMode: true,
    });

    // Configure pen brush
    const brush = new PencilBrush(canvas);
    brush.color = "#1a1a1a";
    brush.width = 2.5;
    canvas.freeDrawingBrush = brush;

    fabricRef.current = canvas;
    setCanvasReady(true);

    // Draw guide lines
    drawGuideLines(canvas, width, height);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

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

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = fabricRef.current;
      if (!container || !canvas) return;

      const width = container.clientWidth;
      const height = Math.max(400, container.clientHeight);
      canvas.setDimensions({ width, height });
      drawGuideLines(canvas, width, height);
      canvas.renderAll();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const drawGuideLines = (canvas: FabricCanvas, width: number, height: number) => {
    // We draw guide lines directly on the background using the canvas context
    // This avoids adding them as objects that interfere with drawing
    const ctx = canvas.getContext();
    if (!ctx) return;

    // The guide lines are drawn after background but don't need to be fabric objects
    // We'll use the afterRender event
    canvas.on("after:render", () => {
      const ctx2d = canvas.getContext();
      if (!ctx2d) return;
      ctx2d.save();
      ctx2d.strokeStyle = GUIDE_LINE_COLOR;
      ctx2d.lineWidth = 1;
      for (let y = GUIDE_LINE_SPACING; y < height; y += GUIDE_LINE_SPACING) {
        ctx2d.beginPath();
        ctx2d.moveTo(0, y);
        ctx2d.lineTo(width, y);
        ctx2d.stroke();
      }
      ctx2d.restore();
    });
  };

  const handleClear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    clearRecognition();
  }, [clearRecognition]);

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
      <div className="flex items-center justify-between p-2 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-1">
          <PenTool className="h-4 w-4 text-muted-foreground mr-1" />
          <span className="text-sm font-medium text-foreground">Handwriting Mode</span>
          {isProcessing && (
            <div className="flex items-center gap-1 ml-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Reading...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-8 w-8 p-0">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 w-8 p-0">
            <Trash2 className="h-4 w-4" />
          </Button>
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

      {/* Split-screen: Canvas (top) + Preview (bottom) */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        <ResizablePanel defaultSize={65} minSize={30}>
          <div ref={containerRef} className="w-full h-full relative touch-none">
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
              placeholder="Write chord charts above with your stylus. Recognized chords will appear here..."
              className="flex-1 resize-none text-sm font-mono min-h-[80px]"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default HandwritingChordCanvas;
