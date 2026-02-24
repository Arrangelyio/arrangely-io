
-- Insert dummy sequencer data
INSERT INTO sequencer_files (song_id, title, tempo, time_signature, sequencer_data, storage_folder_path, tracks)
VALUES 
(
  '238d1a91-003c-47bd-9fd4-45d9ad007481',
  'Lagu Ke Dua - Full Arrangement',
  120,
  '4/4',
  '{
    "sections": [
      {"name": "Intro", "start_time": 0, "end_time": 16, "loop": false},
      {"name": "Verse 1", "start_time": 16, "end_time": 48, "loop": false},
      {"name": "Chorus", "start_time": 48, "end_time": 80, "loop": false},
      {"name": "Verse 2", "start_time": 80, "end_time": 112, "loop": false},
      {"name": "Bridge", "start_time": 112, "end_time": 144, "loop": false},
      {"name": "Outro", "start_time": 144, "end_time": 176, "loop": false}
    ],
    "markers": [
      {"name": "Hook", "time": 48},
      {"name": "Build Up", "time": 112}
    ]
  }'::jsonb,
  'sequencer-files/238d1a91-003c-47bd-9fd4-45d9ad007481',
  '[
    {"name": "Drums", "filename": "drums.wav", "color": "#FF5733", "default_volume": 1.0, "default_pan": 0},
    {"name": "Bass", "filename": "bass.wav", "color": "#33FF57", "default_volume": 0.8, "default_pan": -0.2},
    {"name": "Pads", "filename": "pads.wav", "color": "#3357FF", "default_volume": 0.6, "default_pan": 0.1},
    {"name": "Lead", "filename": "lead.wav", "color": "#FF33F5", "default_volume": 0.9, "default_pan": 0},
    {"name": "Click", "filename": "click.wav", "color": "#FFFF33", "default_volume": 0.5, "default_pan": 0},
    {"name": "Cues", "filename": "cues.wav", "color": "#33FFFF", "default_volume": 0.7, "default_pan": 0}
  ]'::jsonb
),
(
  'f9168533-8209-4809-b843-22d456a4da82',
  'Terbuang Dalam Waktu - Live Session',
  95,
  '4/4',
  '{
    "sections": [
      {"name": "Intro", "start_time": 0, "end_time": 12, "loop": false},
      {"name": "Verse 1", "start_time": 12, "end_time": 36, "loop": false},
      {"name": "Pre-Chorus", "start_time": 36, "end_time": 48, "loop": false},
      {"name": "Chorus", "start_time": 48, "end_time": 72, "loop": false},
      {"name": "Interlude", "start_time": 72, "end_time": 84, "loop": false},
      {"name": "Verse 2", "start_time": 84, "end_time": 108, "loop": false},
      {"name": "Final Chorus", "start_time": 108, "end_time": 144, "loop": false}
    ],
    "markers": [
      {"name": "Breakdown", "time": 72},
      {"name": "Final Hook", "time": 108}
    ]
  }'::jsonb,
  'sequencer-files/f9168533-8209-4809-b843-22d456a4da82',
  '[
    {"name": "Drums", "filename": "drums.wav", "color": "#E74C3C", "default_volume": 1.0, "default_pan": 0},
    {"name": "Bass", "filename": "bass.wav", "color": "#27AE60", "default_volume": 0.85, "default_pan": -0.1},
    {"name": "Guitar", "filename": "guitar.wav", "color": "#F39C12", "default_volume": 0.75, "default_pan": 0.2},
    {"name": "Vocals", "filename": "vocals.wav", "color": "#9B59B6", "default_volume": 1.0, "default_pan": 0},
    {"name": "Click", "filename": "click.wav", "color": "#95A5A6", "default_volume": 0.4, "default_pan": 0},
    {"name": "Cues", "filename": "cues.wav", "color": "#16A085", "default_volume": 0.6, "default_pan": 0}
  ]'::jsonb
);
