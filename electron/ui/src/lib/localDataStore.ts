const KEYS = {
  sequencers: 'offline:sequencers',
  setlists: 'offline:setlists',
  songSections: 'offline:songSections', // map songId -> sections array
};

type StoredValue<T> = T | null;

function safeParse<T>(value: string | null): StoredValue<T> {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.warn('[localDataStore] Failed to parse cached value', e);
    return null;
  }
}

export const localDataStore = {
  saveSequencers(data: any[]) {
    try {
      localStorage.setItem(KEYS.sequencers, JSON.stringify(data || []));
    } catch (e) {
      console.warn('[localDataStore] saveSequencers failed', e);
    }
  },
  loadSequencers(): any[] {
    return safeParse<any[]>(localStorage.getItem(KEYS.sequencers)) || [];
  },

  saveSetlists(data: any[]) {
    try {
      localStorage.setItem(KEYS.setlists, JSON.stringify(data || []));
    } catch (e) {
      console.warn('[localDataStore] saveSetlists failed', e);
    }
  },
  loadSetlists(): any[] {
    return safeParse<any[]>(localStorage.getItem(KEYS.setlists)) || [];
  },

  saveSongSections(songId: string, sections: any[]) {
    if (!songId) return;
    try {
      const current = safeParse<Record<string, any[]>>(localStorage.getItem(KEYS.songSections)) || {};
      current[songId] = sections || [];
      localStorage.setItem(KEYS.songSections, JSON.stringify(current));
    } catch (e) {
      console.warn('[localDataStore] saveSongSections failed', e);
    }
  },
  loadSongSections(songId: string): any[] {
    if (!songId) return [];
    const map = safeParse<Record<string, any[]>>(localStorage.getItem(KEYS.songSections)) || {};
    return map[songId] || [];
  },

  hasAnyData(): boolean {
    try {
      const seq = this.loadSequencers();
      const setlists = this.loadSetlists();
      return (seq?.length ?? 0) > 0 || (setlists?.length ?? 0) > 0;
    } catch {
      return false;
    }
  },
};

