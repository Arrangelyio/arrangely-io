import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeRecognizedText } from "@/utils/chordSymbolMapper";

interface RecognitionResult {
  text: string;
  timestamp: number;
}

export function useHandwritingRecognition() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionResult[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCanvasHash = useRef<string>("");
  const isRequestInFlight = useRef(false);

  const computeSimpleHash = (base64: string): string => {
    // Simple hash from first+last 100 chars to detect changes
    return base64.slice(0, 100) + base64.slice(-100);
  };

  const recognizeFromCanvas = useCallback(async (canvasBase64: string) => {
    // Skip if same canvas or request already in flight
    const hash = computeSimpleHash(canvasBase64);
    if (hash === lastCanvasHash.current || isRequestInFlight.current) return;

    lastCanvasHash.current = hash;
    isRequestInFlight.current = true;
    setIsProcessing(true);

    try {
      // Strip data URL prefix if present
      const base64Data = canvasBase64.replace(/^data:image\/\w+;base64,/, "");

      const { data, error } = await supabase.functions.invoke("analyze-chord-image", {
        body: { imageBase64: base64Data, mode: "handwriting" },
      });

      if (error) {
        console.error("Recognition error:", error);
        // Handle rate limit
        if (error.message?.includes("429") || error.message?.includes("Rate limit")) {
          toast({
            title: "Terlalu cepat",
            description: "Tunggu sebentar sebelum menulis lagi.",
            variant: "destructive",
          });
        } else if (error.message?.includes("402")) {
          toast({
            title: "Kredit habis",
            description: "Tambahkan kredit AI untuk melanjutkan.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.success && data.extractedText) {
        const normalizedText = normalizeRecognizedText(data.extractedText);
        const newResult: RecognitionResult = {
          text: normalizedText,
          timestamp: Date.now(),
        };
        setRecognizedText(normalizedText);
        setRecognitionHistory((prev) => [...prev, newResult]);
      }
    } catch (err) {
      console.error("Recognition failed:", err);
    } finally {
      setIsProcessing(false);
      isRequestInFlight.current = false;
    }
  }, [toast]);

  const scheduleRecognition = useCallback((getCanvasBase64: () => string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer (500ms idle)
    debounceTimer.current = setTimeout(() => {
      const base64 = getCanvasBase64();
      if (base64) {
        recognizeFromCanvas(base64);
      }
    }, 500);
  }, [recognizeFromCanvas]);

  const clearRecognition = useCallback(() => {
    setRecognizedText("");
    setRecognitionHistory([]);
    lastCanvasHash.current = "";
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  return {
    isProcessing,
    recognizedText,
    setRecognizedText,
    recognitionHistory,
    scheduleRecognition,
    clearRecognition,
  };
}
