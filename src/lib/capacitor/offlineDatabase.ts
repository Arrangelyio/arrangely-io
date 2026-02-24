import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'arrangely_offline';

export interface OfflineSetlist {
  id: string;
  name: string;
  date: string;
  theme: string | null;
  user_id: string;
  downloaded_at: string;
  songs_json: string; // JSON array of song positions
}

export interface OfflineSong {
  id: string;
  title: string;
  artist: string | null;
  youtube_link: string | null;
  youtube_thumbnail: string | null;
  key: string | null;
  bpm: number | null;
  time_signature: string | null;
  default_transpose: number;
  user_id: string;
  capo: number | null;
}

export interface OfflineSongSection {
  id: string;
  song_id: string;
  name: string;
  position: number;
  duration_bars: number | null;
  color: string | null;
  lyrics: string | null;
  chords: string | null;
  section_type: string | null;
  section_time_signature: string | null;
}

export interface OfflineArrangement {
  id: string;
  song_id: string;
  section_id: string;
  position: number;
  repeat_count: number | null;
  notes: string | null;
}

export interface LiveStateCache {
  id: number;
  setlist_id: string;
  current_song_index: number;
  current_section_index: number;
  current_bar: number;
  transpose: number;
  updated_at: string;
}

class OfflineDatabaseService {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    console.log('[OfflineDB] initialize() called, isInitialized:', this.isInitialized);
    
    if (this.isInitialized && this.db) return true;
    
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    console.log('[OfflineDB] Platform:', platform, 'isNative:', isNative);

    if (!isNative) {
      console.warn('[OfflineDB] SQLite only available on native platforms. Current:', platform);
      return false;
    }

    try {
      // Reset state for clean init
      this.isInitialized = false;
      this.db = null;
      
      console.log('[OfflineDB] Creating SQLiteConnection...');
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      
      // Check connection consistency
      let retCC = false;
      let isConn = false;
      
      try {
        const ccResult = await this.sqlite.checkConnectionsConsistency();
        retCC = ccResult.result ?? false;
        console.log('[OfflineDB] checkConnectionsConsistency:', retCC);
      } catch (ccErr) {
        console.warn('[OfflineDB] checkConnectionsConsistency failed, proceeding:', ccErr);
      }
      
      try {
        const connResult = await this.sqlite.isConnection(DB_NAME, false);
        isConn = connResult.result ?? false;
        console.log('[OfflineDB] isConnection:', isConn);
      } catch (connErr) {
        console.warn('[OfflineDB] isConnection check failed, proceeding:', connErr);
      }

      if (retCC && isConn) {
        console.log('[OfflineDB] Retrieving existing connection...');
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        // Close any stale connection first
        if (isConn) {
          try {
            console.log('[OfflineDB] Closing stale connection before recreating...');
            await this.sqlite.closeConnection(DB_NAME, false);
          } catch (closeErr) {
            console.warn('[OfflineDB] Close stale connection failed (OK):', closeErr);
          }
        }
        console.log('[OfflineDB] Creating new connection...');
        this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
      }

      console.log('[OfflineDB] Opening database...');
      await this.db.open();

      console.log('[OfflineDB] Creating tables...');
      await this.createTables();

      this.isInitialized = true;
      console.log('[OfflineDB] ✅ Database initialized successfully');
      return true;
    } catch (error) {
      console.error('[OfflineDB] ❌ Failed to initialize database:', JSON.stringify(error, null, 2));
      console.error('[OfflineDB] Error details:', error instanceof Error ? error.message : String(error));
      // Reset state on failure
      this.db = null;
      this.isInitialized = false;
      return false;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Execute each statement individually to avoid multi-statement parsing issues
    const statements = [
      `CREATE TABLE IF NOT EXISTS setlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        theme TEXT,
        user_id TEXT NOT NULL,
        downloaded_at TEXT NOT NULL,
        songs_json TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        youtube_link TEXT,
        youtube_thumbnail TEXT,
        key TEXT,
        bpm INTEGER,
        time_signature TEXT,
        default_transpose INTEGER DEFAULT 0,
        user_id TEXT NOT NULL,
        capo INTEGER
      );`,
      `CREATE TABLE IF NOT EXISTS song_sections (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL,
        duration_bars INTEGER,
        color TEXT,
        lyrics TEXT,
        chords TEXT,
        section_type TEXT,
        section_time_signature TEXT,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS arrangements (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL,
        section_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        repeat_count INTEGER DEFAULT 1,
        notes TEXT,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES song_sections(id) ON DELETE CASCADE
      );`,
      `CREATE TABLE IF NOT EXISTS live_state_cache (
        id INTEGER PRIMARY KEY,
        setlist_id TEXT NOT NULL,
        current_song_index INTEGER DEFAULT 0,
        current_section_index INTEGER DEFAULT 0,
        current_bar INTEGER DEFAULT 0,
        transpose INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (setlist_id) REFERENCES setlists(id) ON DELETE CASCADE
      );`,
      `CREATE INDEX IF NOT EXISTS idx_song_sections_song_id ON song_sections(song_id);`,
      `CREATE INDEX IF NOT EXISTS idx_arrangements_song_id ON arrangements(song_id);`
    ];

    for (const sql of statements) {
      try {
        await this.db.execute(sql);
      } catch (err) {
        console.warn('[OfflineDB] Table creation statement failed (may already exist):', err);
      }
    }
    console.log('[OfflineDB] All tables created/verified');
  }

  // Setlist operations
  async saveSetlist(setlist: OfflineSetlist): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO setlists (id, name, date, theme, user_id, downloaded_at, songs_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      setlist.id,
      setlist.name,
      setlist.date,
      setlist.theme,
      setlist.user_id,
      setlist.downloaded_at,
      setlist.songs_json
    ]);
  }

  async getSetlist(id: string): Promise<OfflineSetlist | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM setlists WHERE id = ?', [id]);
    return result.values?.[0] || null;
  }

  async getAllSetlists(): Promise<OfflineSetlist[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM setlists ORDER BY downloaded_at DESC');
    return result.values || [];
  }

  async deleteSetlist(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('DELETE FROM setlists WHERE id = ?', [id]);
  }

  async isSetlistDownloaded(id: string): Promise<boolean> {
    const setlist = await this.getSetlist(id);
    return setlist !== null;
  }

  // Song operations
  async saveSong(song: OfflineSong): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO songs (id, title, artist, youtube_link, youtube_thumbnail, key, bpm, time_signature, default_transpose, user_id, capo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      song.id,
      song.title,
      song.artist,
      song.youtube_link,
      song.youtube_thumbnail,
      song.key,
      song.bpm,
      song.time_signature,
      song.default_transpose,
      song.user_id,
      song.capo
    ]);
  }

  async getSong(id: string): Promise<OfflineSong | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM songs WHERE id = ?', [id]);
    return result.values?.[0] || null;
  }

  async getAllSongs(): Promise<OfflineSong[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM songs ORDER BY title');
    return result.values || [];
  }

  async getSongsForSetlist(songIds: string[]): Promise<OfflineSong[]> {
    if (!this.db || songIds.length === 0) return [];

    const placeholders = songIds.map(() => '?').join(',');
    const result = await this.db.query(
      `SELECT * FROM songs WHERE id IN (${placeholders})`,
      songIds
    );
    return result.values || [];
  }

  // Song sections operations
  async saveSongSection(section: OfflineSongSection): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO song_sections (id, song_id, name, position, duration_bars, color, lyrics, chords, section_type, section_time_signature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      section.id,
      section.song_id,
      section.name,
      section.position,
      section.duration_bars,
      section.color,
      section.lyrics,
      section.chords,
      section.section_type,
      section.section_time_signature
    ]);
  }

  async getSongSections(songId: string): Promise<OfflineSongSection[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      'SELECT * FROM song_sections WHERE song_id = ? ORDER BY position',
      [songId]
    );
    return result.values || [];
  }

  async getSectionsForSongs(songIds: string[]): Promise<OfflineSongSection[]> {
    if (!this.db || songIds.length === 0) return [];

    const placeholders = songIds.map(() => '?').join(',');
    const result = await this.db.query(
      `SELECT * FROM song_sections WHERE song_id IN (${placeholders}) ORDER BY position`,
      songIds
    );
    return result.values || [];
  }

  // Arrangements operations
  async saveArrangement(arrangement: OfflineArrangement): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO arrangements (id, song_id, section_id, position, repeat_count, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      arrangement.id,
      arrangement.song_id,
      arrangement.section_id,
      arrangement.position,
      arrangement.repeat_count,
      arrangement.notes
    ]);
  }

  async getArrangements(songId: string): Promise<OfflineArrangement[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      'SELECT * FROM arrangements WHERE song_id = ? ORDER BY position',
      [songId]
    );
    return result.values || [];
  }

  async getArrangementsForSongs(songIds: string[]): Promise<OfflineArrangement[]> {
    if (!this.db || songIds.length === 0) return [];

    const placeholders = songIds.map(() => '?').join(',');
    const result = await this.db.query(
      `SELECT * FROM arrangements WHERE song_id IN (${placeholders}) ORDER BY position`,
      songIds
    );
    return result.values || [];
  }

  // Live state cache operations
  async saveLiveState(state: Omit<LiveStateCache, 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO live_state_cache (id, setlist_id, current_song_index, current_section_index, current_bar, transpose, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.run(sql, [
      state.setlist_id,
      state.current_song_index,
      state.current_section_index,
      state.current_bar,
      state.transpose,
      state.updated_at
    ]);
  }

  async getLiveState(): Promise<LiveStateCache | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM live_state_cache WHERE id = 1');
    return result.values?.[0] || null;
  }

  async clearLiveState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('DELETE FROM live_state_cache');
  }

  // Full setlist data retrieval (for live mode)
  async getFullSetlistData(setlistId: string) {
    const setlist = await this.getSetlist(setlistId);
    if (!setlist) return null;

    const songPositions = JSON.parse(setlist.songs_json) as Array<{ song_id: string; position: number }>;
    const songIds = songPositions.map(sp => sp.song_id);

    const [songs, sections, arrangements] = await Promise.all([
      this.getSongsForSetlist(songIds),
      this.getSectionsForSongs(songIds),
      this.getArrangementsForSongs(songIds)
    ]);

    // Map songs with their sections and arrangements, maintaining order
    const songsWithData = songPositions.map(sp => {
      const song = songs.find(s => s.id === sp.song_id);
      if (!song) return null;

      const songSections = sections.filter(sec => sec.song_id === song.id);
      const songArrangements = arrangements.filter(arr => arr.song_id === song.id);

      // Map arrangements with their section data
      const arrangementsWithSections = songArrangements.map(arr => {
        const section = songSections.find(s => s.id === arr.section_id);
        return {
          ...arr,
          section: section ? {
            id: section.id,
            section_type: section.section_type,
            name: section.name,
            section_time_signature: section.section_time_signature,
            lyrics: section.lyrics,
            chords: section.chords
          } : null
        };
      });

      return {
        ...song,
        position: sp.position,
        sections: songSections,
        arrangements: arrangementsWithSections
      };
    }).filter(Boolean);

    return {
      setlist,
      songs: songsWithData
    };
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    if (this.sqlite) {
      await this.sqlite.closeConnection(DB_NAME, false);
    }
    this.isInitialized = false;
  }

  // Check if database is ready
  isReady(): boolean {
    return this.isInitialized;
  }
}

export const offlineDatabase = new OfflineDatabaseService();
