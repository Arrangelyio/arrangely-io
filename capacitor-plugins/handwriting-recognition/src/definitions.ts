/**
 * TypeScript definitions for the Handwriting Recognition Capacitor Plugin.
 *
 * Uses Google ML Kit Digital Ink Recognition on native platforms
 * and falls back to Gemini/Tesseract on web.
 */

/** A single point in a handwriting stroke */
export interface StrokePoint {
  /** X coordinate in canvas pixels */
  x: number;
  /** Y coordinate in canvas pixels */
  y: number;
  /** Timestamp in milliseconds (performance.now() or Date.now()) */
  t: number;
}

/** A complete stroke (pen-down to pen-up) */
export interface Stroke {
  points: StrokePoint[];
}

/** Input for recognition: raw stroke data */
export interface RecognizeStrokesOptions {
  /** Array of strokes to recognize */
  strokes: Stroke[];
  /** 
   * BCP-47 language tag for the recognition model.
   * Default: "en" (English). Other examples: "id" (Indonesian), "ja" (Japanese).
   */
  languageTag?: string;
  /**
   * Optional pre-context string to improve recognition accuracy.
   * E.g., if the user is writing chords, pass "chord" as context.
   */
  preContext?: string;
}

/** Recognition result from ML Kit or web fallback */
export interface RecognitionResult {
  /** The top recognized text candidate */
  text: string;
  /** Alternative candidates (if available) */
  alternatives: string[];
  /** Confidence score 0-1 (if available, -1 if not supported) */
  confidence: number;
}

/** Input for image-based recognition (web fallback) */
export interface RecognizeImageOptions {
  /** Base64-encoded image data (JPEG or PNG, without data URL prefix) */
  imageBase64: string;
  /** Recognition mode */
  mode: "handwriting" | "photo";
}

/** Status of the ML Kit model download */
export interface ModelStatus {
  /** Whether the model is downloaded and ready */
  isDownloaded: boolean;
  /** Whether a download is currently in progress */
  isDownloading: boolean;
  /** Download progress 0-100 (if downloading) */
  progress: number;
}

export interface HandwritingRecognitionPlugin {
  /**
   * Check if native ML Kit recognition is available on this platform.
   * Returns false on web.
   */
  isAvailable(): Promise<{ available: boolean }>;

  /**
   * Download the ML Kit Digital Ink model for the specified language.
   * Must be called before recognizeStrokes() on first use.
   * No-op on web.
   */
  downloadModel(options: { languageTag?: string }): Promise<{ success: boolean }>;

  /**
   * Check the download status of the ML Kit model.
   */
  getModelStatus(options: { languageTag?: string }): Promise<ModelStatus>;

  /**
   * Delete a downloaded ML Kit model to free storage.
   */
  deleteModel(options: { languageTag?: string }): Promise<{ success: boolean }>;

  /**
   * Recognize handwriting from raw stroke data (native only).
   * On web, this throws — use recognizeImage() instead.
   */
  recognizeStrokes(options: RecognizeStrokesOptions): Promise<RecognitionResult>;

  /**
   * Recognize handwriting from an image (web fallback).
   * On native, this is also available as a secondary method.
   */
  recognizeImage(options: RecognizeImageOptions): Promise<RecognitionResult>;
}
