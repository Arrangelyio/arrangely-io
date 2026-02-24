import { useState, useEffect } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import DAWPlayer from './components/DAWPlayer';
import SongLibrary from './components/SongLibrary';
import SetlistManager from './components/SetlistManager';
import SetlistPlayer from './components/SetlistPlayer';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import { localDataStore } from './lib/localDataStore';

interface Setlist {
  id: string;
  name: string;
  date: string;
  theme?: string;
  songs: { id: string; position: number; sequencer: any }[];
  created_at: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'library' | 'setlists' | 'player' | 'setlist-player'>('dashboard');
  const [selectedSequencer, setSelectedSequencer] = useState<any>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [sequencers, setSequencers] = useState<any[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState(false);

  useEffect(() => {
    const init = async () => {
      // If offline and cache exists, go straight to offline
      if (!navigator.onLine && localDataStore.hasAnyData()) {
        loadOfflineData();
        return;
      }

      // Check active session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (e) {
        console.warn('[App] Session fetch failed, using offline if available', e);
        if (localDataStore.hasAnyData()) {
          loadOfflineData();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load sequencers and setlists
  useEffect(() => {
    if (user && !offlineMode) {
      loadSequencers();
    }
  }, [user, offlineMode]);

  // Load setlists after sequencers are available for rehydration
  useEffect(() => {
    if (user && sequencers.length > 0 && !offlineMode) {
      loadSetlists();
    }
  }, [user, sequencers, offlineMode]);

  // Check offline cache availability
  useEffect(() => {
    setOfflineAvailable(localDataStore.hasAnyData());

    const handleOnlineChange = () => {
      if (!navigator.onLine && localDataStore.hasAnyData()) {
        loadOfflineData();
      }
    };

    window.addEventListener('offline', handleOnlineChange);
    return () => window.removeEventListener('offline', handleOnlineChange);
  }, []);

  const loadSetlists = async () => {
    try {
      if (!user || offlineMode) return;

      // Build a map of song_id -> sequencer data from user's enrolled sequencers
      const enrolledSequencerMap: Record<string, any> = {};
      const enrolledSongIds = new Set<string>();
      
      sequencers.forEach((seqFile: any) => {
        if (seqFile && seqFile.song_id) {
          enrolledSongIds.add(seqFile.song_id);
          enrolledSequencerMap[seqFile.song_id] = seqFile;
        }
      });

      // Fetch setlists from Supabase
      const { data: setlistsData, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching setlists:", error);
        return;
      }

      if (!setlistsData || setlistsData.length === 0) {
        setSetlists([]);
        return;
      }

      // Build setlists with songs populated - only include songs user has enrolled in
      const rehydrated: Setlist[] = setlistsData.map((setlist: any) => ({
        id: setlist.id,
        name: setlist.name,
        date: setlist.date,
        theme: setlist.theme || undefined,
        created_at: setlist.created_at,
        songs: (setlist.song_ids || [])
          .filter((songId: string) => enrolledSongIds.has(songId))
          .map((songId: string, idx: number) => ({
            id: `${setlist.id}-${songId}`,
            position: idx,
            sequencer: enrolledSequencerMap[songId] || null
          }))
          .filter((song: any) => song.sequencer)
      }));

      setSetlists(rehydrated);
      localDataStore.saveSetlists(rehydrated);
      setOfflineAvailable(true);
    } catch (error) {
      console.error("Error loading setlists:", error);
      // Fallback to cached if available
      const cached = localDataStore.loadSetlists();
      if (cached.length > 0) {
        setSetlists(cached as Setlist[]);
        setOfflineMode(true);
      }
    }
  };

  const loadSequencers = async () => {
    try {
      const { data, error } = await supabase
        .from("sequencer_enrollments")
        .select(`
          sequencer_file_id,
          sequencer_files (
            *,
            songs (
              title,
              artist,
              is_public,
              user_id,
              youtube_link,
              current_key
            )
          )
        `)
        .eq("user_id", user?.id)
        .eq("is_production", true)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;

      const sequencerFiles = data
        ?.map((enrollment) => enrollment.sequencer_files)
        .filter((file) => file !== null) || [];

      setSequencers(sequencerFiles);
      localDataStore.saveSequencers(sequencerFiles);
      setOfflineAvailable(true);
    } catch (error) {
      console.error("Error loading sequencers:", error);
      const cached = localDataStore.loadSequencers();
      if (cached.length > 0) {
        setSequencers(cached);
        setOfflineMode(true);
      }
    }
  };

  const loadOfflineData = () => {
    const cachedSequencers = localDataStore.loadSequencers();
    const cachedSetlists = localDataStore.loadSetlists();
    setSequencers(cachedSequencers);
    setSetlists(cachedSetlists);
    setOfflineMode(true);
    setOfflineAvailable(true);
    setCurrentView('dashboard');
    setUser(null);
    setLoading(false);
  };

  const handleOfflineContinue = () => {
    loadOfflineData();
  };

  const handleSelectSequencer = (sequencer: any) => {
    setSelectedSequencer(sequencer);
    setCurrentView('player');
  };

  const handleSelectSetlist = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setCurrentView('setlist-player');
  };

  const handleBackToLibrary = () => {
    setCurrentView('library');
    setSelectedSequencer(null);
    setSelectedSetlist(null);
  };

  const handleBackToSetlists = () => {
    setCurrentView('setlists');
    setSelectedSequencer(null);
    setSelectedSetlist(null);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedSequencer(null);
    setSelectedSetlist(null);
  };

  const handleLoginSuccess = () => {
    // Refresh session after login
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('library');
    setSelectedSequencer(null);
    setSelectedSetlist(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess}
        offlineAvailable={offlineAvailable}
        onOfflineContinue={handleOfflineContinue}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <TitleBar user={user} onLogout={handleLogout} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          onBackToLibrary={handleBackToLibrary}
          onBackToSetlists={handleBackToSetlists}
          onBackToDashboard={handleBackToDashboard}
        />
        <main className="flex-1 overflow-hidden">
          {currentView === 'dashboard' && (
            <Dashboard
              sequencers={sequencers}
              setlists={setlists}
              onViewAllSongs={() => setCurrentView('library')}
              onViewAllSetlists={() => setCurrentView('setlists')}
              onSelectSequencer={handleSelectSequencer}
              onSelectSetlist={handleSelectSetlist}
            />
          )}
          {currentView === 'library' && (
            <SongLibrary 
              onSelectSequencer={handleSelectSequencer} 
              offlineMode={offlineMode}
              initialSequencers={sequencers}
            />
          )}
          {currentView === 'setlists' && (
            <div className="h-full p-6">
              <SetlistManager 
                onSelectSetlist={handleSelectSetlist}
                sequencers={sequencers}
                offlineMode={offlineMode}
                initialSetlists={setlists}
              />
            </div>
          )}
          {currentView === 'player' && selectedSequencer && (
            <DAWPlayer 
              sequencer={selectedSequencer}
              onBack={handleBackToLibrary}
              offlineMode={offlineMode}
            />
          )}
          {currentView === 'setlist-player' && selectedSetlist && (
            <SetlistPlayer 
              setlist={selectedSetlist}
              onBack={handleBackToSetlists}
              offlineMode={offlineMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
