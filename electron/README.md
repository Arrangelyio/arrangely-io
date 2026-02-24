# Arrangely Desktop

Aplikasi desktop untuk memutar multi-track sequencer files dari Arrangely.

## Setup

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install UI dependencies
cd ui
npm install
cd ..
```

### Development

```bash
# Run in development mode
npm run dev
```

Ini akan menjalankan Vite dev server dan Electron secara bersamaan.

### Build

```bash
# Build for Windows
npm run build:win

# Build for Mac
npm run build:mac
```

## Struktur Database

Sequencer files disimpan di tabel `sequencer_files` dengan struktur:

- `id`: UUID
- `song_id`: Foreign key ke tabel songs
- `title`: Judul sequencer
- `tempo`: BPM
- `time_signature`: Time signature (contoh: "4/4")
- `sequencer_data`: JSONB berisi sections, markers, loops
- `storage_folder_path`: Path folder di Supabase Storage
- `tracks`: JSONB array berisi metadata track

### Contoh Track Metadata

```json
[
  {
    "name": "Drums",
    "filename": "drums.wav",
    "color": "#FF5733",
    "default_volume": 1.0,
    "default_pan": 0
  },
  {
    "name": "Bass",
    "filename": "bass.wav",
    "color": "#33FF57",
    "default_volume": 0.8,
    "default_pan": -0.2
  }
]
```

### Contoh Sequencer Data

```json
{
  "sections": [
    {
      "name": "Intro",
      "start_time": 0,
      "end_time": 16,
      "loop": false
    },
    {
      "name": "Verse 1",
      "start_time": 16,
      "end_time": 48,
      "loop": false
    }
  ],
  "markers": [
    {
      "name": "Hook",
      "time": 32
    }
  ]
}
```

## Storage Structure

Files WAV disimpan di bucket `sequencer-files` dengan struktur:

```
sequencer-files/
  └── {song_id}/
      └── {sequencer_id}/
          ├── drums.wav
          ├── bass.wav
          ├── pads.wav
          ├── lead.wav
          ├── click.wav
          └── cues.wav
```

## Fitur

- ✅ Multi-track playback yang synchronized
- ✅ Individual track controls (mute, solo, volume, pan)
- ✅ Waveform visualization per track
- ✅ Global transport controls (play, pause, stop)
- ✅ Timeline scrubber dengan section markers
- ✅ Auto-next section
- ✅ Song library dengan search
- ✅ Integration dengan Supabase database

## Tech Stack

- Electron
- React + TypeScript
- Vite
- Web Audio API
- WaveSurfer.js
- Tailwind CSS
- Supabase

export APPLE_ID="kevinsenjaya72@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="aerw-npzj-ufrz-rwrg"
export APPLE_TEAM_ID="Y8QWRBMMBY"