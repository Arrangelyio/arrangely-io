import { useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { AlertCircle, Lock, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";

interface SecurePdfViewerProps {
  pdfUrl: string;
  contentId: string;
  lessonId: string;
  userEmail?: string;
  userName?: string;
  onScrollToBottom?: () => void;
}

export default function SecurePdfViewer({
  pdfUrl,
  contentId,
  lessonId,
  userEmail,
  userName,
  onScrollToBottom,
}: SecurePdfViewerProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [securePdfUrl, setSecurePdfUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const viewerRef = useRef<HTMLDivElement | null>(null);

  // Configure pdf.js worker using matching version to package (5.4.296)
  GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.394/build/pdf.worker.min.mjs`;

  useEffect(() => {
    let createdBlobUrl: string | null = null;
    const getSecurePdf = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("Please login to access this content");
          return;
        }

        // 1) Get watermark and log access via JSON call (no shareable URL used)
        const { data, error: functionError } = await supabase.functions.invoke('secure-pdf', {
          body: { lessonId, contentId, pdfPath: pdfUrl },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (functionError) {
          console.error('Failed to get secure PDF:', functionError);
          setError(functionError.message || 'Failed to load PDF');
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You must be enrolled to access this content'
          });
          return;
        }

        setWatermarkText(data?.watermarkText ?? '');

        // 2) Stream the PDF bytes through the Edge Function requiring JWT, then display as a Blob URL
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/secure-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/pdf',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ lessonId, contentId, pdfPath: pdfUrl, stream: true }),
        });

        if (!resp.ok) {
          try {
            const errJson = await resp.json();
            setError(errJson?.error || 'Failed to load PDF');
          } catch {
            setError('Failed to load PDF');
          }
          return;
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        createdBlobUrl = blobUrl;
        setSecurePdfUrl(blobUrl);
        const ab = await blob.arrayBuffer();
        setPdfData(ab);
        setIsAuthorized(true);

      } catch (err) {
        console.error("Access verification failed:", err);
        setError("Failed to verify access");
      }
    };

    getSecurePdf();

    // Disable right-click and keyboard shortcuts
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const disableKeyboardShortcuts = (e: KeyboardEvent) => {
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.shiftKey && e.key === "S") ||
        (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) ||
        (e.ctrlKey && e.key === "p")
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableKeyboardShortcuts);

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableKeyboardShortcuts);
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [contentId, lessonId, pdfUrl, toast]);

  // Render PDF with pdf.js into canvases (no native viewer -> no print/download UI)
  useEffect(() => {
    const container = containerRef.current;
    if (!pdfData || !container) return;

    let cancelled = false;
    setIsRendering(true);
    container.innerHTML = "";

    (async () => {
      try {
        const pdf = await getDocument({ data: pdfData }).promise;
        const total = pdf.numPages;
        for (let i = 1; i <= total && !cancelled; i++) {
          const page = await pdf.getPage(i);
          const containerWidth = container.clientWidth || 800;
          const unscaled = page.getViewport({ scale: 1 });
          const scale = Math.min(2, containerWidth / unscaled.width); // fit width, cap scale
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = `${viewport.height}px`;
          canvas.style.display = 'block';

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          container.appendChild(canvas);

          const task = page.render({ canvasContext: ctx as any, viewport } as any);
          await (task as any).promise;
        }
      } catch (e) {
        console.error('PDF render failed', e);
        if (!cancelled) setError('Failed to render PDF');
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      container.innerHTML = '';
    };
  }, [pdfData]);

  // Handle scroll detection for auto-completion
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewer;
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
      
      if (scrolledToBottom && !hasReachedBottom) {
        setHasReachedBottom(true);
        onScrollToBottom?.();
      }
    };

    viewer.addEventListener('scroll', handleScroll);
    return () => viewer.removeEventListener('scroll', handleScroll);
  }, [hasReachedBottom, onScrollToBottom]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative select-none">
      {/* Watermark Overlays */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute top-4 left-4 text-foreground/30 text-xs font-mono bg-background/20 px-2 py-1 rounded">
          {watermarkText}
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground/10 text-2xl font-bold rotate-[-30deg]">
          {watermarkText}
        </div>
        <div className="absolute bottom-4 right-4 text-foreground/30 text-xs font-mono bg-background/20 px-2 py-1 rounded">
          {watermarkText}
        </div>
        <div className="absolute top-1/4 right-1/4 text-foreground/10 text-sm font-mono rotate-12">
          {watermarkText}
        </div>
        <div className="absolute bottom-1/3 left-1/4 text-foreground/10 text-sm font-mono rotate-[-15deg]">
          {watermarkText}
        </div>
      </div>

      {/* PDF Viewer */}
      <div 
        ref={viewerRef}
        className="bg-background rounded-lg overflow-auto relative min-h-[600px] max-h-[75vh]"
      >
        {pdfData ? (
          <div ref={containerRef} className="w-full" />
        ) : (
          <div className="flex items-center justify-center h-[600px]">
            <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
          </div>
        )}
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <FileText className="h-10 w-10 text-muted-foreground animate-pulse" />
          </div>
        )}
      </div>

      {/* Copyright Notice */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        <Lock className="h-3 w-3 inline mr-1" />
        This content is protected. Downloading, printing, or redistributing is prohibited.
      </div>
    </div>
  );
}