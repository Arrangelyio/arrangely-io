#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(HandwritingPlugin, "HandwritingRecognition",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(downloadModel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getModelStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(deleteModel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(recognizeStrokes, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(recognizeImage, CAPPluginReturnPromise);
)
