import { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, Music, Trash2, Play, ListMusic, X, Download } from "lucide-react";
import { supabase } from "../lib/supabase";

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const getDateInputValue = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
};

interface Setlist {
    id: string;
    name: string;
    date: string;
    theme?: string;
    songs: SetlistSong[];
    created_at: string;
}

interface SetlistSong {
    id: string;
    position: number;
    sequencer: any;
}

interface SetlistManagerProps {
    onSelectSetlist: (setlist: Setlist) => void;
    sequencers: any[];
    offlineMode?: boolean;
    initialSetlists?: Setlist[];
}

export default function SetlistManager({ onSelectSetlist, sequencers, offlineMode = false, initialSetlists = [] }: SetlistManagerProps) {
    const [setlists, setSetlists] = useState<Setlist[]>(initialSetlists || []);
    const [loading, setLoading] = useState(!offlineMode);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddSongsModal, setShowAddSongsModal] = useState(false);
    const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
    const [newSetlistName, setNewSetlistName] = useState("");
    const [newSetlistDate, setNewSetlistDate] = useState(getDateInputValue());
    const [newSetlistTheme, setNewSetlistTheme] = useState("");

    useEffect(() => {
        if (offlineMode) {
            setLoading(false);
            return;
        }
        loadSetlists();
    }, [offlineMode]);

    const loadSetlists = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch user's sequencer_enrollments to get enrolled sequencer_file_ids with tracks data
            const { data: enrollmentsData, error: enrollError } = await supabase
                .from('sequencer_enrollments')
                .select('sequencer_file_id, sequencer_files(id, song_id, tracks, songs(*))')
                .eq('user_id', user.id);

            if (enrollError) {
                console.error("Error fetching enrollments:", enrollError);
                return;
            }

            // Build a map of song_id -> sequencer data from user's enrollments
            const enrolledSequencerMap: Record<string, any> = {};
            const enrolledSongIds = new Set<string>();
            
            if (enrollmentsData) {
                enrollmentsData.forEach((enrollment: any) => {
                    const seqFile = enrollment.sequencer_files;
                    if (seqFile && seqFile.song_id) {
                        enrolledSongIds.add(seqFile.song_id);
                        enrolledSequencerMap[seqFile.song_id] = seqFile;
                    }
                });
            }

            // 2. Fetch setlists from Supabase
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

            // 3. Build setlists with songs populated - only include songs user has enrolled in
            const rehydrated: Setlist[] = setlistsData.map((setlist: any) => ({
                id: setlist.id,
                name: setlist.name,
                date: setlist.date,
                theme: setlist.theme || undefined,
                created_at: setlist.created_at,
                songs: (setlist.song_ids || [])
                    .filter((songId: string) => enrolledSongIds.has(songId)) // Only enrolled songs
                    .map((songId: string, idx: number) => ({
                        id: `${setlist.id}-${songId}`,
                        position: idx,
                        sequencer: enrolledSequencerMap[songId] || null
                    }))
                    .filter((song: any) => song.sequencer)
            }));

            setSetlists(rehydrated);
        } catch (error) {
            console.error("Error loading setlists:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveSetlistToSupabase = useCallback(async (setlist: Setlist) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const songIds = setlist.songs.map(song => song.sequencer?.song_id || song.sequencer?.id);
            
            await supabase
                .from('setlists')
                .update({ 
                    song_ids: songIds,
                    updated_at: new Date().toISOString()
                })
                .eq('id', setlist.id);
        } catch (error) {
            console.error("Error saving setlist to Supabase:", error);
        }
    }, []);

    const createSetlist = async () => {
        if (offlineMode) return;
        if (!newSetlistName.trim()) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: newSetlistData, error } = await supabase
                .from('setlists')
                .insert({
                    user_id: user.id,
                    name: newSetlistName.trim(),
                    date: newSetlistDate,
                    theme: newSetlistTheme.trim() || null,
                    song_ids: [],
                    is_public: false
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating setlist:", error);
                return;
            }

            const newSetlist: Setlist = {
                id: newSetlistData.id,
                name: newSetlistData.name,
                date: newSetlistData.date,
                theme: newSetlistData.theme || undefined,
                songs: [],
                created_at: newSetlistData.created_at
            };

            setSetlists([newSetlist, ...setlists]);
            setNewSetlistName("");
            setNewSetlistDate(getDateInputValue());
            setNewSetlistTheme("");
            setShowCreateModal(false);
        } catch (error) {
            console.error("Error creating setlist:", error);
        }
    };

    const deleteSetlist = async (setlistId: string) => {
        if (offlineMode) return;
        try {
            await supabase
                .from('setlists')
                .delete()
                .eq('id', setlistId);

            const updated = setlists.filter(s => s.id !== setlistId);
            setSetlists(updated);
        } catch (error) {
            console.error("Error deleting setlist:", error);
        }
    };

    const addSongToSetlist = async (sequencer: any) => {
        if (offlineMode) return;
        if (!selectedSetlist) return;

        const newSong: SetlistSong = {
            id: crypto.randomUUID(),
            position: selectedSetlist.songs.length,
            sequencer
        };

        const updatedSetlist = {
            ...selectedSetlist,
            songs: [...selectedSetlist.songs, newSong]
        };

        const updated = setlists.map(s => 
            s.id === selectedSetlist.id ? updatedSetlist : s
        );
        setSetlists(updated);
        setSelectedSetlist(updatedSetlist);
        
        // Save to Supabase
        await saveSetlistToSupabase(updatedSetlist);
    };

    const removeSongFromSetlist = async (setlistId: string, songId: string) => {
        if (offlineMode) return;
        const setlist = setlists.find(s => s.id === setlistId);
        if (!setlist) return;

        const updatedSongs = setlist.songs
            .filter(s => s.id !== songId)
            .map((s, idx) => ({ ...s, position: idx }));

        const updatedSetlist = { ...setlist, songs: updatedSongs };
        const updated = setlists.map(s => 
            s.id === setlistId ? updatedSetlist : s
        );
        setSetlists(updated);
        if (selectedSetlist?.id === setlistId) {
            setSelectedSetlist(updatedSetlist);
        }
        
        // Save to Supabase
        await saveSetlistToSupabase(updatedSetlist);
    };

    const openAddSongsModal = (setlist: Setlist) => {
        setSelectedSetlist(setlist);
        setShowAddSongsModal(true);
    };

    const getAvailableSongs = () => {
        if (!selectedSetlist) return sequencers;
        const usedIds = selectedSetlist.songs.map(s => s.sequencer.id);
        return sequencers.filter(seq => !usedIds.includes(seq.id));
    };

    return (
        <div className="h-full flex flex-col bg-[hsl(0,0%,14%)] animate-page-enter">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <ListMusic className="w-5 h-5 text-[hsl(145,65%,42%)]" />
                    <h2 className="text-lg font-semibold text-[hsl(0,0%,85%)]">Setlists</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            // placeholder offline downloads action
                        }}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5 
                            bg-[hsl(220,12%,18%)] text-[hsl(0,0%,85%)] 
                            rounded-md text-sm font-medium
                            hover:bg-[hsl(220,12%,24%)]
                            border border-[hsl(220,10%,28%)]
                            btn-interactive
                        "
                    >
                        <Download className="w-3.5 h-3.5" />
                        Offline Downloads
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="
                            flex items-center gap-1.5 px-3 py-1.5 
                            bg-[hsl(145,65%,35%)] text-white 
                            rounded-md text-sm font-medium
                            hover:bg-[hsl(145,65%,40%)]
                            btn-interactive
                        "
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Setlist
                    </button>
                </div>
            </div>

            {/* Setlists Grid */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center text-[hsl(0,0%,50%)] text-sm">
                    Loading...
                </div>
            ) : setlists.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[hsl(0,0%,45%)] gap-3 animate-item-enter">
                    <ListMusic className="w-10 h-10 opacity-40" />
                    <p className="text-sm">No setlists yet. Create one to get started!</p>
                </div>
            ) : (
                <div className="flex-1 overflow-auto scroll-smooth">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {setlists.map((setlist, index) => (
                            <div
                                key={setlist.id}
                                className={`
                                    bg-[hsl(0,0%,18%)] border border-[hsl(0,0%,22%)] rounded-lg p-3 group
                                    card-interactive
                                    hover:border-[hsl(0,0%,30%)]
                                    animate-item-enter stagger-${Math.min(index + 1, 8)}
                                `}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm text-[hsl(0,0%,85%)] truncate transition-colors duration-150 group-hover:text-white">{setlist.name}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-[hsl(0,0%,50%)]">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(setlist.date)}</span>
                                        </div>
                                        {setlist.theme && (
                                            <p className="text-xs text-[hsl(0,0%,45%)] mt-0.5 truncate">
                                                {setlist.theme}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSetlist(setlist.id);
                                        }}
                                        className="
                                            p-1.5 text-[hsl(0,0%,40%)] hover:text-[hsl(0,65%,55%)] 
                                            transition-all duration-200
                                            opacity-0 group-hover:opacity-100
                                            hover:scale-110 active:scale-95
                                        "
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-1.5 mb-2 text-xs text-[hsl(0,0%,50%)]">
                                    <Music className="w-3.5 h-3.5" />
                                    <span>{setlist.songs.length} songs</span>
                                </div>

                                {setlist.songs.length > 0 && (
                                    <div className="flex gap-1.5 mb-2 overflow-hidden">
                                        {setlist.songs.slice(0, 4).map((song, idx) => (
                                            <div
                                                key={song.id}
                                                className="
                                                    w-8 h-8 bg-[hsl(0,0%,12%)] rounded flex items-center justify-center 
                                                    text-[10px] font-medium text-[hsl(0,0%,60%)] border border-[hsl(0,0%,20%)]
                                                    transition-all duration-200
                                                    group-hover:border-[hsl(0,0%,30%)] group-hover:bg-[hsl(0,0%,16%)]
                                                "
                                                style={{ transitionDelay: `${idx * 30}ms` }}
                                                title={song.sequencer?.songs?.title || song.sequencer?.title}
                                            >
                                                {idx + 1}
                                            </div>
                                        ))}
                                        {setlist.songs.length > 4 && (
                                            <div className="w-8 h-8 bg-[hsl(0,0%,10%)] rounded flex items-center justify-center text-[10px] text-[hsl(0,0%,45%)] border border-[hsl(0,0%,18%)]">
                                                +{setlist.songs.length - 4}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openAddSongsModal(setlist)}
                                        className="
                                            flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 
                                            bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,25%)] 
                                            rounded-md text-xs text-[hsl(0,0%,65%)]
                                            hover:border-[hsl(0,0%,35%)] hover:text-[hsl(0,0%,80%)] 
                                            btn-interactive
                                        "
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Songs
                                    </button>
                                    {setlist.songs.length > 0 && (
                                        <button
                                            onClick={() => onSelectSetlist(setlist)}
                                            className="
                                                flex items-center justify-center gap-1.5 px-3 py-1.5 
                                                bg-[hsl(145,65%,35%)] text-white 
                                                rounded-md text-xs font-medium
                                                hover:bg-[hsl(145,65%,40%)]
                                                btn-interactive
                                            "
                                        >
                                            <Play className="w-3 h-3" />
                                            Play
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create Setlist Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-backdrop-enter">
                    <div className="bg-[hsl(0,0%,16%)] border border-[hsl(0,0%,22%)] rounded-xl p-5 w-full max-w-sm mx-4 animate-modal-enter">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-[hsl(0,0%,85%)]">Create New Setlist</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-[hsl(0,0%,22%)] rounded text-[hsl(0,0%,50%)] btn-interactive"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-medium text-[hsl(0,0%,50%)] mb-1 uppercase tracking-wide">Name</label>
                                <input
                                    type="text"
                                    value={newSetlistName}
                                    onChange={(e) => setNewSetlistName(e.target.value)}
                                    placeholder="e.g., Sunday Service"
                                    className="
                                        w-full px-3 py-2 
                                        bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,25%)] 
                                        rounded-lg text-sm text-[hsl(0,0%,85%)]
                                        placeholder:text-[hsl(0,0%,40%)]
                                        focus:outline-none focus:border-[hsl(145,65%,42%)]
                                        transition-all duration-150
                                    "
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-[hsl(0,0%,50%)] mb-1 uppercase tracking-wide">Date</label>
                                <input
                                    type="date"
                                    value={newSetlistDate}
                                    onChange={(e) => setNewSetlistDate(e.target.value)}
                                    className="
                                        w-full px-3 py-2 
                                        bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,25%)] 
                                        rounded-lg text-sm text-[hsl(0,0%,85%)]
                                        focus:outline-none focus:border-[hsl(145,65%,42%)]
                                        transition-all duration-150
                                    "
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-[hsl(0,0%,50%)] mb-1 uppercase tracking-wide">Theme (optional)</label>
                                <input
                                    type="text"
                                    value={newSetlistTheme}
                                    onChange={(e) => setNewSetlistTheme(e.target.value)}
                                    placeholder="e.g., Grace & Mercy"
                                    className="
                                        w-full px-3 py-2 
                                        bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,25%)] 
                                        rounded-lg text-sm text-[hsl(0,0%,85%)]
                                        placeholder:text-[hsl(0,0%,40%)]
                                        focus:outline-none focus:border-[hsl(145,65%,42%)]
                                        transition-all duration-150
                                    "
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="
                                        flex-1 px-3 py-2 
                                        border border-[hsl(0,0%,25%)] text-[hsl(0,0%,65%)]
                                        rounded-lg text-sm
                                        hover:bg-[hsl(0,0%,20%)]
                                        btn-interactive
                                    "
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createSetlist}
                                    disabled={!newSetlistName.trim()}
                                    className="
                                        flex-1 px-3 py-2 
                                        bg-[hsl(145,65%,35%)] text-white 
                                        rounded-lg text-sm font-medium
                                        hover:bg-[hsl(145,65%,40%)]
                                        disabled:opacity-40
                                        btn-interactive
                                    "
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Songs Modal */}
            {showAddSongsModal && selectedSetlist && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-backdrop-enter">
                    <div className="bg-[hsl(0,0%,16%)] border border-[hsl(0,0%,22%)] rounded-xl p-5 w-full max-w-xl mx-4 max-h-[80vh] flex flex-col animate-modal-enter">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold text-[hsl(0,0%,85%)]">Add Songs to {selectedSetlist.name}</h3>
                                <p className="text-xs text-[hsl(0,0%,50%)]">
                                    {selectedSetlist.songs.length} songs in setlist
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddSongsModal(false);
                                    setSelectedSetlist(null);
                                }}
                                className="p-1 hover:bg-[hsl(0,0%,22%)] rounded text-[hsl(0,0%,50%)] btn-interactive"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Current songs in setlist */}
                        {selectedSetlist.songs.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-[10px] font-medium mb-2 text-[hsl(0,0%,45%)] uppercase tracking-wide">Current Order</h4>
                                <div className="flex gap-1.5 overflow-x-auto pb-2 scroll-smooth">
                                    {selectedSetlist.songs.map((song, idx) => (
                                        <div
                                            key={song.id}
                                            className="
                                                flex-shrink-0 px-2 py-1 
                                                bg-[hsl(0,0%,20%)] border border-[hsl(0,0%,28%)] 
                                                rounded text-xs text-[hsl(0,0%,70%)]
                                                flex items-center gap-1.5
                                                transition-all duration-150
                                                hover:border-[hsl(0,0%,35%)] hover:bg-[hsl(0,0%,24%)]
                                            "
                                        >
                                            <span className="font-medium text-[hsl(0,0%,50%)]">{idx + 1}.</span>
                                            <span className="truncate max-w-[100px]">
                                                {song.sequencer?.songs?.title || song.sequencer?.title}
                                            </span>
                                            <button
                                                onClick={() => removeSongFromSetlist(selectedSetlist.id, song.id)}
                                                className="p-0.5 hover:text-[hsl(0,65%,55%)] transition-all duration-150 hover:scale-110 active:scale-95"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available songs */}
                        <div className="flex-1 overflow-auto scroll-smooth">
                            <h4 className="text-[10px] font-medium mb-2 text-[hsl(0,0%,45%)] uppercase tracking-wide">Available Songs</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {getAvailableSongs().map((seq, index) => (
                                    <div
                                        key={seq.id}
                                        className={`
                                            flex items-center justify-between 
                                            p-2.5 bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,22%)] 
                                            rounded-lg
                                            card-interactive
                                            hover:border-[hsl(0,0%,30%)]
                                            animate-item-enter stagger-${Math.min(index + 1, 8)}
                                        `}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[hsl(0,0%,80%)] truncate">
                                                {seq.songs?.title || seq.title}
                                            </p>
                                            <p className="text-xs text-[hsl(0,0%,50%)] truncate">
                                                {seq.songs?.artist || "Unknown"} • {seq.tempo} BPM
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => addSongToSetlist(seq)}
                                            className="
                                                p-1.5 bg-[hsl(145,65%,35%)] text-white 
                                                rounded hover:bg-[hsl(145,65%,40%)]
                                                btn-interactive
                                                hover:scale-110 active:scale-95
                                            "
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {getAvailableSongs().length === 0 && (
                                    <p className="text-center text-[hsl(0,0%,45%)] text-sm py-6">
                                        All songs have been added to this setlist
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[hsl(0,0%,22%)]">
                            <button
                                onClick={() => {
                                    setShowAddSongsModal(false);
                                    setSelectedSetlist(null);
                                }}
                                className="
                                    w-full px-3 py-2 
                                    bg-[hsl(0,0%,22%)] text-[hsl(0,0%,75%)] 
                                    rounded-lg text-sm font-medium
                                    hover:bg-[hsl(0,0%,28%)]
                                    btn-interactive
                                "
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}