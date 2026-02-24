
UPDATE sequencer_files 
SET tracks = '[
  {"name": "CLICK", "filename": "click.wav", "color": "#95A5A6", "default_volume": 0.4, "default_pan": 0},
  {"name": "CUE", "filename": "cue.wav", "color": "#16A085", "default_volume": 0.6, "default_pan": 0},
  {"name": "Dist Guitar Bus", "filename": "dist_guitar_bus.wav", "color": "#E67E22", "default_volume": 0.85, "default_pan": 0.1},
  {"name": "master", "filename": "master.wav", "color": "#34495E", "default_volume": 1.0, "default_pan": 0},
  {"name": "Percussion Bus", "filename": "percussion_bus.wav", "color": "#E74C3C", "default_volume": 0.9, "default_pan": -0.1},
  {"name": "REVERB", "filename": "reverb.wav", "color": "#3498DB", "default_volume": 0.7, "default_pan": 0},
  {"name": "Strings Bus", "filename": "strings_bus.wav", "color": "#9B59B6", "default_volume": 0.8, "default_pan": 0.2},
  {"name": "Singletrack", "filename": "singletrack.wav", "color": "#27AE60", "default_volume": 1.0, "default_pan": 0}
]'::jsonb,
updated_at = now()
WHERE title = 'Terbuang Dalam Waktu - Live Session';
