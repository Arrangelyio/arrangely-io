/**
 * Mixer Preset Types
 * 
 * Defines the structure for saving and loading mixer presets including
 * track settings, click track, and cue track configurations.
 */

import { ClickSubdivision } from '../lib/ClickTrackEngine';
import { CueVoice } from '../lib/CueTrackEngine';

export interface TrackPresetSettings {
  trackIndex: number;
  trackName: string;
  volume: number; // 0-1
  muted: boolean;
  solo: boolean;
  pan: number; // -1 to 1
}

export interface ClickTrackPresetSettings {
  enabled: boolean;
  volume: number;
  tempo: number;
  subdivision: ClickSubdivision;
  startOffset: number; // Beat 1 Start (seconds)
}

export interface CueTrackPresetSettings {
  enabled: boolean;
  volume: number;
  voice: CueVoice;
}

export interface MixerPreset {
  id: string;
  userId: string;
  sequencerFileId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Track settings (per track)
  tracks: TrackPresetSettings[];
  
  // Master volume
  masterVolume: number;
  
  // Click track settings
  clickTrack: ClickTrackPresetSettings;
  
  // Cue track settings
  cueTrack: CueTrackPresetSettings;
}

export interface MixerPresetsState {
  presets: MixerPreset[];
  activePresetId: string | null;
  isLoading: boolean;
  error: string | null;
}

// Database row type (matches Supabase table structure)
export interface MixerPresetRow {
  id: string;
  user_id: string;
  sequencer_file_id: string;
  name: string;
  is_active: boolean;
  tracks: TrackPresetSettings[];
  master_volume: number;
  click_enabled: boolean;
  click_volume: number;
  click_tempo: number;
  click_subdivision: string;
  click_start_offset: number;
  cue_enabled: boolean;
  cue_volume: number;
  cue_voice: string;
  created_at: string;
  updated_at: string;
  is_production: boolean;
}

// Convert database row to application type
export function rowToPreset(row: MixerPresetRow): MixerPreset {
  return {
    id: row.id,
    userId: row.user_id,
    sequencerFileId: row.sequencer_file_id,
    name: row.name,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tracks: row.tracks,
    masterVolume: row.master_volume,
    clickTrack: {
      enabled: row.click_enabled,
      volume: row.click_volume,
      tempo: row.click_tempo,
      subdivision: row.click_subdivision as ClickSubdivision,
      startOffset: row.click_start_offset,
    },
    cueTrack: {
      enabled: row.cue_enabled,
      volume: row.cue_volume,
      voice: row.cue_voice as CueVoice,
    },
  };
}
