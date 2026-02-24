import { supabase } from '@/integrations/supabase/client';
import { offlineDatabase, OfflineSetlist, OfflineSong, OfflineSongSection, OfflineArrangement } from './offlineDatabase';

export interface SetlistDownloadProgress {
  stage: 'fetching' | 'saving' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: SetlistDownloadProgress) => void;

class SetlistDownloadService {
  
  async downloadSetlist(
    setlistId: string, 
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<boolean> {
    try {
      

      // Initialize database if needed
      
      const dbReady = await offlineDatabase.initialize();
      

      if (!dbReady) {
        console.error('[SetlistDownload] Failed to initialize offline database');
        onProgress?.({ stage: 'error', progress: 0, message: 'Failed to initialize offline database' });
        return false;
      }

      onProgress?.({ stage: 'fetching', progress: 10, message: 'Fetching setlist data...' });

      // Fetch setlist from Supabase
      
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .select('*')
        .eq('id', setlistId)
        .single();

      console.log('[SetlistDownload] Setlist fetch result:', {
        hasData: !!setlistData,
        error: setlistError,
        setlistName: setlistData?.name,
        songIdsCount: setlistData?.song_ids?.length
      });

      if (setlistError || !setlistData) {
        console.error('[SetlistDownload] Setlist not found:', setlistError);
        onProgress?.({ stage: 'error', progress: 0, message: 'Setlist not found' });
        return false;
      }

      onProgress?.({ stage: 'fetching', progress: 20, message: 'Fetching songs...' });

      // Songs are stored in the song_ids array column of the setlist
      const songIds: string[] = (setlistData.song_ids as string[]) || [];
      

      if (songIds.length === 0) {
        console.warn('[SetlistDownload] Setlist has no songs');
        onProgress?.({ stage: 'error', progress: 0, message: 'Setlist has no songs' });
        return false;
      }

      // Create position mapping for songs (based on array index)
      const setlistSongs = songIds.map((songId, index) => ({
        song_id: songId,
        position: index
      }));
      

      onProgress?.({ stage: 'fetching', progress: 30, message: 'Fetching song details...' });

      // Fetch full song data
      
      const { data: songs, error: songDataError } = await supabase
        .from('songs')
        .select('*')
        .in('id', songIds);

      console.log('[SetlistDownload] Songs fetch result:', {
        songsCount: songs?.length,
        error: songDataError
      });

      if (songDataError || !songs) {
        console.error('[SetlistDownload] Failed to fetch song data:', songDataError);
        onProgress?.({ stage: 'error', progress: 0, message: 'Failed to fetch song data' });
        return false;
      }

      onProgress?.({ stage: 'fetching', progress: 50, message: 'Fetching song sections...' });

      // Fetch song sections with all required fields
      
      const { data: sections, error: sectionsError } = await supabase
        .from('song_sections')
        .select('id, song_id, name, lyrics, chords, bar_count, section_type, section_time_signature')
        .in('song_id', songIds);

      console.log('[SetlistDownload] Sections fetch result:', {
        sectionsCount: sections?.length,
        error: sectionsError
      });

      if (sectionsError) {
        console.error('[SetlistDownload] Failed to fetch song sections:', sectionsError);
        onProgress?.({ stage: 'error', progress: 0, message: 'Failed to fetch song sections' });
        return false;
      }

      onProgress?.({ stage: 'fetching', progress: 70, message: 'Fetching arrangements...' });

      // Fetch arrangements
      
      const { data: arrangements, error: arrangementsError } = await supabase
        .from('arrangements')
        .select('*')
        .in('song_id', songIds)
        .order('position');

      console.log('[SetlistDownload] Arrangements fetch result:', {
        arrangementsCount: arrangements?.length,
        error: arrangementsError
      });

      if (arrangementsError) {
        console.error('[SetlistDownload] Failed to fetch arrangements:', arrangementsError);
        onProgress?.({ stage: 'error', progress: 0, message: 'Failed to fetch arrangements' });
        return false;
      }

      onProgress?.({ stage: 'saving', progress: 80, message: 'Saving to offline storage...' });

      // Save to SQLite
      
      // Save setlist
      const offlineSetlist: OfflineSetlist = {
        id: setlistData.id,
        name: setlistData.name,
        date: setlistData.date,
        theme: setlistData.theme,
        user_id: setlistData.user_id,
        downloaded_at: new Date().toISOString(),
        songs_json: JSON.stringify(setlistSongs || [])
      };

      try {
        await offlineDatabase.saveSetlist(offlineSetlist);
        
      } catch (saveError) {
        console.error('[SetlistDownload] Error saving setlist:', saveError);
        throw saveError;
      }

      // Save songs
      
      for (const song of songs) {
        const offlineSong: OfflineSong = {
          id: song.id,
          title: song.title,
          artist: song.artist,
          youtube_link: song.youtube_link,
          youtube_thumbnail: song.youtube_thumbnail,
          key: song.current_key || song.key,
          bpm: song.tempo || song.bpm,
          time_signature: song.time_signature,
          default_transpose: song.default_transpose || 0,
          user_id: song.user_id,
          capo: song.capo
        };
        try {
          await offlineDatabase.saveSong(offlineSong);
          
        } catch (songError) {
          console.error('[SetlistDownload] Error saving song:', song.title, songError);
          throw songError;
        }
      }

      onProgress?.({ stage: 'saving', progress: 85, message: 'Saving sections...' });

      // Save sections with all data including lyrics and chords
      
      let sectionPosition = 0;
      for (const section of sections || []) {
        const offlineSection: OfflineSongSection = {
          id: section.id,
          song_id: section.song_id,
          name: section.name || section.section_type || 'Section',
          position: sectionPosition++,
          duration_bars: section.bar_count,
          color: null,
          lyrics: section.lyrics,
          chords: section.chords,
          section_type: section.section_type,
          section_time_signature: section.section_time_signature
        };
        try {
          await offlineDatabase.saveSongSection(offlineSection);
        } catch (sectionError) {
          console.error('[SetlistDownload] Error saving section:', section.id, sectionError);
          throw sectionError;
        }
      }
      

      onProgress?.({ stage: 'saving', progress: 95, message: 'Saving arrangements...' });

      // Save arrangements
      
      for (const arrangement of arrangements || []) {
        const offlineArrangement: OfflineArrangement = {
          id: arrangement.id,
          song_id: arrangement.song_id,
          section_id: arrangement.section_id,
          position: arrangement.position,
          repeat_count: arrangement.repeat_count,
          notes: arrangement.notes
        };
        try {
          await offlineDatabase.saveArrangement(offlineArrangement);
        } catch (arrError) {
          console.error('[SetlistDownload] Error saving arrangement:', arrangement.id, arrError);
          throw arrError;
        }
      }
      

      onProgress?.({ stage: 'complete', progress: 100, message: 'Download complete!' });
      
      return true;

    } catch (error) {
      console.error('[SetlistDownload] Error downloading setlist:', error);
      onProgress?.({ stage: 'error', progress: 0, message: `Download failed: ${error}` });
      return false;
    }
  }

  async deleteOfflineSetlist(setlistId: string): Promise<boolean> {
    try {
      await offlineDatabase.deleteSetlist(setlistId);
      return true;
    } catch (error) {
      console.error('Error deleting offline setlist:', error);
      return false;
    }
  }

  async getDownloadedSetlists(): Promise<OfflineSetlist[]> {
    try {
      await offlineDatabase.initialize();
      return await offlineDatabase.getAllSetlists();
    } catch (error) {
      console.error('Error getting downloaded setlists:', error);
      return [];
    }
  }

  async isSetlistDownloaded(setlistId: string): Promise<boolean> {
    try {
      await offlineDatabase.initialize();
      return await offlineDatabase.isSetlistDownloaded(setlistId);
    } catch (error) {
      return false;
    }
  }

  async getOfflineSetlistData(setlistId: string) {
    try {
      await offlineDatabase.initialize();
      return await offlineDatabase.getFullSetlistData(setlistId);
    } catch (error) {
      console.error('Error getting offline setlist data:', error);
      return null;
    }
  }
}

export const setlistDownloadService = new SetlistDownloadService();
