import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Shield } from "lucide-react";
import { toast } from "sonner";

interface ProtectedSheetMusicProps {
  fileUrl: string;
  userEmail?: string;
  userName?: string;
  pageCount?: number;
}

export default function ProtectedSheetMusic({
  fileUrl,
  userEmail,
  userName,
  pageCount = 1,
}: ProtectedSheetMusicProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);

  // Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-click is disabled to protect this content");
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common screenshot shortcuts
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) || // Chrome DevTools
        (e.metaKey && e.shiftKey && e.key === "3") || // Mac screenshot
        (e.metaKey && e.shiftKey && e.key === "4") || // Mac screenshot area
        (e.key === "PrintScreen") // Windows screenshot
      ) {
        e.preventDefault();
        toast.error("Screenshots are disabled for this content");
        return false;
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("contextmenu", handleContextMenu);
    }
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (canvas) {
        canvas.removeEventListener("contextmenu", handleContextMenu);
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Load and watermark the sheet music
  useEffect(() => {
    const loadSheetMusic = async () => {
      setIsLoading(true);
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = fileUrl;

        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Set canvas dimensions
          canvas.width = img.width;
          canvas.height = img.height;

          // Draw the image
          ctx.drawImage(img, 0, 0);

          // Add watermark overlay
          const watermarkText = userName || userEmail || "Protected Content";
          const watermarkCount = 8;

          ctx.save();
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = "#000000";
          ctx.font = "bold 48px Arial";
          ctx.textAlign = "center";

          // Draw multiple watermarks across the image
          for (let i = 0; i < watermarkCount; i++) {
            for (let j = 0; j < watermarkCount; j++) {
              const x = (canvas.width / watermarkCount) * i + canvas.width / (watermarkCount * 2);
              const y = (canvas.height / watermarkCount) * j + canvas.height / (watermarkCount * 2);
              
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(-45 * Math.PI / 180);
              ctx.fillText(watermarkText, 0, 0);
              ctx.restore();
            }
          }

          ctx.restore();
          setIsLoading(false);
        };

        img.onerror = () => {
          toast.error("Failed to load sheet music");
          setIsLoading(false);
        };
      } catch (error) {
        console.error("Error loading sheet music:", error);
        toast.error("Failed to load sheet music");
        setIsLoading(false);
      }
    };

    loadSheetMusic();
  }, [fileUrl, userName, userEmail, currentPage]);

  const handleZoomIn = () => {
    if (zoom < 200) setZoom(zoom + 25);
  };

  const handleZoomOut = () => {
    if (zoom > 50) setZoom(zoom - 25);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-background to-muted/20">
      {/* Protection Notice */}
      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">
          Protected Content - Screenshots and downloads are disabled
        </span>
      </div>

      {/* Sheet Music Display */}
      <div 
        className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
        style={{ 
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none"
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading sheet music...</p>
            </div>
          </div>
        )}

        <div className="overflow-auto max-h-[600px]">
          <canvas
            ref={canvasRef}
            className="mx-auto"
            style={{
              width: `${zoom}%`,
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage === pageCount}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Anti-piracy warning */}
      <div className="mt-4 p-2 bg-muted rounded text-center">
        <p className="text-xs text-muted-foreground">
          This content is protected by copyright. Unauthorized reproduction is prohibited.
        </p>
      </div>
    </Card>
  );
}
