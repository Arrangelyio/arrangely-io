package app.lovable.handwriting;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mlkit.vision.digitalink.DigitalInkRecognition;
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel;
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier;
import com.google.mlkit.vision.digitalink.DigitalInkRecognizer;
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions;
import com.google.mlkit.vision.digitalink.Ink;
import com.google.mlkit.vision.digitalink.RecognitionResult;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.common.model.RemoteModelManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Capacitor plugin for Google ML Kit Digital Ink Recognition.
 *
 * Recognizes handwritten strokes (x, y, timestamp) into text on-device.
 * Model download is required on first use (~20MB per language).
 */
@CapacitorPlugin(name = "HandwritingRecognition")
public class HandwritingPlugin extends Plugin {

    private static final String TAG = "HandwritingPlugin";
    private DigitalInkRecognizer recognizer;
    private DigitalInkRecognitionModel currentModel;
    private final RemoteModelManager modelManager = RemoteModelManager.getInstance();

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String languageTag = call.getString("languageTag", "en");

        try {
            DigitalInkRecognitionModelIdentifier identifier =
                DigitalInkRecognitionModelIdentifier.fromLanguageTag(languageTag);

            if (identifier == null) {
                call.reject("No model found for language: " + languageTag);
                return;
            }

            currentModel = DigitalInkRecognitionModel.builder(identifier).build();

            DownloadConditions conditions = new DownloadConditions.Builder().build();

            modelManager.download(currentModel, conditions)
                .addOnSuccessListener(unused -> {
                    Log.i(TAG, "Model downloaded for: " + languageTag);

                    // Initialize recognizer after download
                    recognizer = DigitalInkRecognition.getClient(
                        DigitalInkRecognizerOptions.builder(currentModel).build()
                    );

                    JSObject result = new JSObject();
                    result.put("success", true);
                    call.resolve(result);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Model download failed", e);
                    call.reject("Model download failed: " + e.getMessage());
                });

        } catch (Exception e) {
            Log.e(TAG, "Error setting up model", e);
            call.reject("Error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getModelStatus(PluginCall call) {
        if (currentModel == null) {
            JSObject result = new JSObject();
            result.put("isDownloaded", false);
            result.put("isDownloading", false);
            result.put("progress", 0);
            call.resolve(result);
            return;
        }

        modelManager.isModelDownloaded(currentModel)
            .addOnSuccessListener(isDownloaded -> {
                JSObject result = new JSObject();
                result.put("isDownloaded", isDownloaded);
                result.put("isDownloading", false);
                result.put("progress", isDownloaded ? 100 : 0);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to check model status: " + e.getMessage());
            });
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        if (currentModel == null) {
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            return;
        }

        modelManager.deleteDownloadedModel(currentModel)
            .addOnSuccessListener(unused -> {
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            })
            .addOnFailureListener(e -> {
                call.reject("Failed to delete model: " + e.getMessage());
            });
    }

    @PluginMethod
    public void recognizeStrokes(PluginCall call) {
        if (recognizer == null) {
            call.reject("Recognizer not initialized. Call downloadModel() first.");
            return;
        }

        try {
            JSArray strokesArray = call.getArray("strokes");
            if (strokesArray == null || strokesArray.length() == 0) {
                call.reject("No strokes provided");
                return;
            }

            Ink.Builder inkBuilder = Ink.builder();

            for (int i = 0; i < strokesArray.length(); i++) {
                JSONObject strokeObj = strokesArray.getJSONObject(i);
                JSONArray points = strokeObj.getJSONArray("points");

                Ink.Stroke.Builder strokeBuilder = Ink.Stroke.builder();

                for (int j = 0; j < points.length(); j++) {
                    JSONObject point = points.getJSONObject(j);
                    float x = (float) point.getDouble("x");
                    float y = (float) point.getDouble("y");
                    long t = point.getLong("t");

                    strokeBuilder.addPoint(Ink.Point.create(x, y, t));
                }

                inkBuilder.addStroke(strokeBuilder.build());
            }

            Ink ink = inkBuilder.build();

            recognizer.recognize(ink)
                .addOnSuccessListener(result -> {
                    JSObject response = new JSObject();

                    if (result.getCandidates().isEmpty()) {
                        response.put("text", "");
                        response.put("alternatives", new JSArray());
                        response.put("confidence", 0);
                    } else {
                        response.put("text", result.getCandidates().get(0).getText());

                        JSArray alternatives = new JSArray();
                        for (int i = 1; i < Math.min(result.getCandidates().size(), 5); i++) {
                            alternatives.put(result.getCandidates().get(i).getText());
                        }
                        response.put("alternatives", alternatives);

                        // ML Kit Digital Ink doesn't provide confidence scores
                        response.put("confidence", -1);
                    }

                    call.resolve(response);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "Recognition failed", e);
                    call.reject("Recognition failed: " + e.getMessage());
                });

        } catch (JSONException e) {
            call.reject("Invalid stroke data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void recognizeImage(PluginCall call) {
        // Image-based recognition on native can delegate to the web fallback
        // or use a separate ML Kit Text Recognition model.
        // For now, reject and let the app handle it via the edge function.
        call.reject("recognizeImage on Android should use the edge function fallback.");
    }
}
