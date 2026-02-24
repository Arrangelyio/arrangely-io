import { WebPlugin } from "@capacitor/core";
import type {
  HandwritingRecognitionPlugin,
  RecognizeStrokesOptions,
  RecognitionResult,
  RecognizeImageOptions,
  ModelStatus,
} from "./definitions";

/**
 * Web fallback implementation.
 *
 * Stroke-based recognition is not available on web — it delegates
 * to the existing Supabase Edge Function (analyze-chord-image)
 * which uses Gemini for image-based recognition.
 *
 * For integration, the app should call recognizeImage() on web
 * and recognizeStrokes() on native.
 */
export class HandwritingRecognitionWeb
  extends WebPlugin
  implements HandwritingRecognitionPlugin
{
  async isAvailable(): Promise<{ available: boolean }> {
    // Stroke-based ML Kit is not available on web
    return { available: false };
  }

  async downloadModel(_options: { languageTag?: string }): Promise<{ success: boolean }> {
    // No-op on web
    console.log("[HandwritingRecognition Web] downloadModel is a no-op on web");
    return { success: true };
  }

  async getModelStatus(_options: { languageTag?: string }): Promise<ModelStatus> {
    return {
      isDownloaded: false,
      isDownloading: false,
      progress: 0,
    };
  }

  async deleteModel(_options: { languageTag?: string }): Promise<{ success: boolean }> {
    return { success: true };
  }

  async recognizeStrokes(_options: RecognizeStrokesOptions): Promise<RecognitionResult> {
    throw this.createUnavailableError(
      "recognizeStrokes is not available on web. Use recognizeImage() instead."
    );
  }

  async recognizeImage(options: RecognizeImageOptions): Promise<RecognitionResult> {
    // Delegate to the Supabase Edge Function
    // The caller (useHandwritingRecognition hook) handles this directly,
    // but this method is here for completeness if someone calls the plugin directly.
    try {
      const { createClient } = await import("@supabase/supabase-js");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase configuration not found");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.functions.invoke(
        "analyze-chord-image",
        {
          body: {
            imageBase64: options.imageBase64,
            mode: options.mode,
          },
        }
      );

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data?.success && data.extractedText) {
        return {
          text: data.extractedText,
          alternatives: [],
          confidence: -1,
        };
      }

      return {
        text: "",
        alternatives: [],
        confidence: 0,
      };
    } catch (err) {
      console.error("[HandwritingRecognition Web] recognizeImage error:", err);
      throw err;
    }
  }

  private createUnavailableError(message: string): Error {
    const error = new Error(message);
    error.name = "UnavailableError";
    return error;
  }
}
