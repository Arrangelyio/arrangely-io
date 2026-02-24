/**
 * useMixerPresets Hook
 * 
 * Manages saving and loading mixer presets to Supabase database.
 * Presets are stored per sequencer file using the sequencer_file_id.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  MixerPreset, 
  MixerPresetsState, 
  TrackPresetSettings, 
  ClickTrackPresetSettings, 
  CueTrackPresetSettings,
  MixerPresetRow,
  rowToPreset
} from '../types/mixerPreset';

export function useMixerPresets(sequencerFileId: string) {
  const [presetsState, setPresetsState] = useState<MixerPresetsState>({
    presets: [],
    activePresetId: null,
    isLoading: true,
    error: null,
  });

  // Load presets from database on mount
  useEffect(() => {
    let isMounted = true;

    async function loadPresets() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          setPresetsState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data, error } = await supabase
          .from('mixer_presets')
          .select('*')
          .eq('sequencer_file_id', sequencerFileId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Failed to load mixer presets:', error);
          if (isMounted) {
            setPresetsState(prev => ({ 
              ...prev, 
              isLoading: false, 
              error: error.message 
            }));
          }
          return;
        }

        if (isMounted) {
          const presets = (data as MixerPresetRow[]).map(rowToPreset);
          const activePreset = presets.find(p => p.isActive);
          setPresetsState({
            presets,
            activePresetId: activePreset?.id || null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Failed to load mixer presets:', error);
        if (isMounted) {
          setPresetsState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Failed to load presets' 
          }));
        }
      }
    }

    loadPresets();

    return () => {
      isMounted = false;
    };
  }, [sequencerFileId]);

  // Create a new preset
  const createPreset = useCallback(async (
    name: string,
    tracks: TrackPresetSettings[],
    masterVolume: number,
    clickTrack: ClickTrackPresetSettings,
    cueTrack: CueTrackPresetSettings
  ): Promise<MixerPreset | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      // First, set all other presets to inactive
      await supabase
        .from('mixer_presets')
        .update({ is_active: false })
        .eq('sequencer_file_id', sequencerFileId)
        .eq('user_id', user.id);

      const { data, error } = await supabase
        .from('mixer_presets')
        .insert({
          user_id: user.id,
          sequencer_file_id: sequencerFileId,
          name,
          is_active: true,
          tracks,
          master_volume: masterVolume,
          click_enabled: clickTrack.enabled,
          click_volume: clickTrack.volume,
          click_tempo: clickTrack.tempo,
          click_subdivision: clickTrack.subdivision,
          click_start_offset: clickTrack.startOffset,
          cue_enabled: cueTrack.enabled,
          cue_volume: cueTrack.volume,
          cue_voice: cueTrack.voice,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create preset:', error);
        setPresetsState(prev => ({ ...prev, error: error.message }));
        return null;
      }

      const newPreset = rowToPreset(data as MixerPresetRow);
      
      setPresetsState(prev => ({
        ...prev,
        presets: [...prev.presets.map(p => ({ ...p, isActive: false })), newPreset],
        activePresetId: newPreset.id,
        error: null,
      }));

      return newPreset;
    } catch (error) {
      console.error('Failed to create preset:', error);
      return null;
    }
  }, [sequencerFileId]);

  // Update an existing preset
  const updatePreset = useCallback(async (
    presetId: string,
    tracks: TrackPresetSettings[],
    masterVolume: number,
    clickTrack: ClickTrackPresetSettings,
    cueTrack: CueTrackPresetSettings
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('mixer_presets')
        .update({
          tracks,
          master_volume: masterVolume,
          click_enabled: clickTrack.enabled,
          click_volume: clickTrack.volume,
          click_tempo: clickTrack.tempo,
          click_subdivision: clickTrack.subdivision,
          click_start_offset: clickTrack.startOffset,
          cue_enabled: cueTrack.enabled,
          cue_volume: cueTrack.volume,
          cue_voice: cueTrack.voice,
        })
        .eq('id', presetId);

      if (error) {
        console.error('Failed to update preset:', error);
        setPresetsState(prev => ({ ...prev, error: error.message }));
        return false;
      }

      setPresetsState(prev => ({
        ...prev,
        presets: prev.presets.map(p => 
          p.id === presetId 
            ? { 
                ...p, 
                tracks, 
                masterVolume, 
                clickTrack, 
                cueTrack, 
                updatedAt: new Date().toISOString() 
              }
            : p
        ),
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to update preset:', error);
      return false;
    }
  }, []);

  // Delete a preset
  const deletePreset = useCallback(async (presetId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('mixer_presets')
        .delete()
        .eq('id', presetId);

      if (error) {
        console.error('Failed to delete preset:', error);
        setPresetsState(prev => ({ ...prev, error: error.message }));
        return false;
      }

      setPresetsState(prev => ({
        ...prev,
        presets: prev.presets.filter(p => p.id !== presetId),
        activePresetId: prev.activePresetId === presetId ? null : prev.activePresetId,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to delete preset:', error);
      return false;
    }
  }, []);

  // Rename a preset
  const renamePreset = useCallback(async (presetId: string, newName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('mixer_presets')
        .update({ name: newName })
        .eq('id', presetId);

      if (error) {
        console.error('Failed to rename preset:', error);
        setPresetsState(prev => ({ ...prev, error: error.message }));
        return false;
      }

      setPresetsState(prev => ({
        ...prev,
        presets: prev.presets.map(p =>
          p.id === presetId
            ? { ...p, name: newName, updatedAt: new Date().toISOString() }
            : p
        ),
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to rename preset:', error);
      return false;
    }
  }, []);

  // Set active preset
  const setActivePreset = useCallback(async (presetId: string | null): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Set all presets to inactive
      await supabase
        .from('mixer_presets')
        .update({ is_active: false })
        .eq('sequencer_file_id', sequencerFileId)
        .eq('user_id', user.id);

      // Set the selected preset to active
      if (presetId) {
        await supabase
          .from('mixer_presets')
          .update({ is_active: true })
          .eq('id', presetId);
      }

      setPresetsState(prev => ({
        ...prev,
        presets: prev.presets.map(p => ({
          ...p,
          isActive: p.id === presetId,
        })),
        activePresetId: presetId,
        error: null,
      }));

      return true;
    } catch (error) {
      console.error('Failed to set active preset:', error);
      return false;
    }
  }, [sequencerFileId]);

  // Get a preset by ID
  const getPreset = useCallback((presetId: string): MixerPreset | undefined => {
    return presetsState.presets.find(p => p.id === presetId);
  }, [presetsState.presets]);

  // Get the active preset
  const getActivePreset = useCallback((): MixerPreset | undefined => {
    if (!presetsState.activePresetId) return undefined;
    return presetsState.presets.find(p => p.id === presetsState.activePresetId);
  }, [presetsState]);

  return {
    presets: presetsState.presets,
    activePresetId: presetsState.activePresetId,
    isLoading: presetsState.isLoading,
    error: presetsState.error,
    createPreset,
    updatePreset,
    deletePreset,
    renamePreset,
    setActivePreset,
    getPreset,
    getActivePreset,
  };
}
