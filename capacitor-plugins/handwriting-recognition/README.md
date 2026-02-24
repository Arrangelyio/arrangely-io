# Capacitor Handwriting Recognition Plugin

On-device handwriting recognition using **Google ML Kit Digital Ink Recognition** for Capacitor apps.

## Features

- **Zero API cost**: All recognition happens on-device
- **Stroke-based**: Processes raw (x, y, timestamp) coordinates — not images
- **Fast**: Instant results after model download (~20MB one-time)
- **Offline**: Works without internet after initial model download
- **Web fallback**: Falls back to Gemini via Supabase Edge Function on web

## Platform Support

| Platform | Engine | Cost |
|----------|--------|------|
| Android  | ML Kit Digital Ink Recognition | Free |
| iOS      | ML Kit Digital Ink Recognition | Free |
| Web      | Supabase Edge Function (Gemini) | Per-request |

## Setup

### Android

The ML Kit dependency is already included in `build.gradle`. No additional setup needed.

### iOS

Add to your `ios/App/Podfile`:

```ruby
pod 'GoogleMLKit/DigitalInkRecognition', '~> 7.0'
```

Then run:
```bash
cd ios/App && pod install
```

After adding the pod, uncomment the ML Kit implementation code in `HandwritingPlugin.swift`.

## Usage

```typescript
import { HandwritingRecognition } from 'capacitor-handwriting-recognition';

// 1. Check availability
const { available } = await HandwritingRecognition.isAvailable();

// 2. Download model (first time only)
if (available) {
  await HandwritingRecognition.downloadModel({ languageTag: 'en' });
}

// 3. Recognize strokes
const result = await HandwritingRecognition.recognizeStrokes({
  strokes: [
    {
      points: [
        { x: 10, y: 20, t: 1000 },
        { x: 15, y: 25, t: 1010 },
        { x: 20, y: 30, t: 1020 },
      ]
    }
  ],
  languageTag: 'en',
});

console.log(result.text);         // "Am"
console.log(result.alternatives); // ["An", "Arm"]
```

## API

See `src/definitions.ts` for full TypeScript API documentation.
