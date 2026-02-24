import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Plus,
    Settings,
    MapPin,
    Edit2,
    Trash2,
    Save,
    X,
    ChevronDown,
    Loader2,
    LayoutGrid,
    Layers,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import TrackControl from "./TrackControl";
import WaveformPeaksDisplay from "./WaveformPeaksDisplay";
import CombinedWaveformDisplay from "./CombinedWaveformDisplay";
import MixerStrip from "./MixerStrip";
import MasterStrip from "./MasterStrip";
import ClickTrackStrip from "./ClickTrackStrip";
import CueTrackStrip from "./CueTrackStrip";
import MixerPresetControls from "./MixerPresetControls";
import MIDIRecorder from "./MIDIRecorder";
import TimelineMarkers from "./TimelineMarkers";
import CountInSelector, { getCountInBeats } from "./CountInSelector";
import GridOverlay from "./GridOverlay";
import DownloadStatusPanel, { PlaybackMode } from "./DownloadStatusPanel";
import TrackDownloadIndicator from "./TrackDownloadIndicator";
import TempoControl from "./TempoControl";
import PitchControl, { PitchQualityMode } from "./PitchControl";
import AddMarkerDialog from "./AddMarkerDialog";
import ControlBarPanel from "./ControlBarPanel";
import SongInfoHeader from "./SongInfoHeader";
import ClickCuePanel, { ClickCuePanelRef } from "./ClickCuePanel";
import { ClickSubdivision } from "../lib/ClickTrackEngine";
import { CueVoice } from "../lib/CueTrackEngine";
import { supabase } from "../lib/supabase";
import { r2AudioService } from "../lib/r2AudioService";
import type { MIDIRecording } from "../lib/MIDIEngine";
import { useAudioDevices } from "../hooks/useAudioDevices";
import { useMixerPresets } from "../hooks/useMixerPresets";
import { useArrangementUndo, UndoableSection } from "../hooks/useArrangementUndo";
import { localDataStore } from "../lib/localDataStore";
import { getSectionBgColor } from "../lib/sectionColors";
import { TrackPresetSettings, ClickTrackPresetSettings, CueTrackPresetSettings } from "../types/mixerPreset";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { StreamingMultiTrackPlayer } from "../lib/StreamingMultiTrackPlayer";


interface DAWPlayerProps {
    sequencer: any;
    onBack: () => void;
    setlistId?: string;
    onLoadingChange?: (isLoading: boolean, progress: number) => void;
    offlineMode?: boolean;
}

export default function DAWPlayer({ sequencer, onBack, setlistId, onLoadingChange, offlineMode = false }: DAWPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [tracks, setTracks] = useState<any[]>([]);
    const [currentSection, setCurrentSection] = useState<any>(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isLoadingTracks, setIsLoadingTracks] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [trackDownloadStatuses, setTrackDownloadStatuses] = useState<TrackDownloadStatus[]>([]);
    const [isAllCached, setIsAllCached] = useState(false);
    const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('download');
    const [showLoadingDetails, setShowLoadingDetails] = useState(false);
    const [trackOutputChannels, setTrackOutputChannels] = useState<number[]>([]);
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferingTracks, setBufferingTracks] = useState<number[]>([]);
    const [editingMarker, setEditingMarker] = useState<any>(null);
    const [showAddMarker, setShowAddMarker] = useState(false);
    const [countInValue, setCountInValue] = useState<string>('none');
    const [isCountingIn, setIsCountingIn] = useState(false);
    const [countInDisplay, setCountInDisplay] = useState<string | null>(null);
    const [pendingSeekTime, setPendingSeekTime] = useState<number | null>(null);
    const [timelineZoom, setTimelineZoom] = useState(1); // Default to min horizontal zoom
    const [timelineScrollLeft, setTimelineScrollLeft] = useState(0);
    const [viewMode, setViewMode] = useState<'waveform' | 'mixer'>('mixer');
    const [mixerCollapsed, setMixerCollapsed] = useState(false);
    const [showClickStrip, setShowClickStrip] = useState(true);
    const [showCueStrip, setShowCueStrip] = useState(true);
    const [showMasterStrip, setShowMasterStrip] = useState(true);
    const [compactMode, setCompactMode] = useState(false);
    // Initialize tempo based on song's actual tempo (sequencer.tempo / BASE_BPM of 120)
    const [tempo, setTempo] = useState(() => (sequencer?.tempo || 120) / 120);
    const [pitch, setPitch] = useState(0);
    const [pitchQualityMode, setPitchQualityMode] = useState<PitchQualityMode>('high');
    const [formantPreservation, setFormantPreservation] = useState(false);
    const [isPitchLoading, setIsPitchLoading] = useState(false);
    const [pitchLoadingProgress, setPitchLoadingProgress] = useState(0);
    const [trackPitchSettings, setTrackPitchSettings] = useState<Record<number, boolean>>({});
    
    // Click track state (independent from song tempo)
    const [clickTempo, setClickTempo] = useState(() => sequencer?.tempo || 120);
    const [clickEnabled, setClickEnabled] = useState(false);
    const [clickVolume, setClickVolume] = useState(0.5);
    const [clickSubdivision, setClickSubdivision] = useState<ClickSubdivision>('1/4');
    const [clickStartOffset, setClickStartOffset] = useState(0); // When beat 1 starts in the song
    
    // Cue track state
    const [cueEnabled, setCueEnabled] = useState(false);
    const [cueVolume, setCueVolume] = useState(0.7);
    const [cueVoice, setCueVoice] = useState<CueVoice>('female');
    
    // Click and Cue output channel state
    const [clickOutputChannel, setClickOutputChannel] = useState(0);
    const [cueOutputChannel, setCueOutputChannel] = useState(0);
    
    const [trackLevels, setTrackLevels] = useState<number[]>([]);
    const [masterVolume, setMasterVolume] = useState(1.0);
    const [masterLevel, setMasterLevel] = useState({ left: 0, right: 0 });
    const [gainReduction, setGainReduction] = useState(0);
    const [selectedSection, setSelectedSection] = useState<any>(null);
    const [timelineContainerWidth, setTimelineContainerWidth] = useState(800);
    const [waveformVerticalZoom, setWaveformVerticalZoom] = useState(8); // Default to max vertical zoom
    const [waveformHeight, setWaveformHeight] = useState(100); // Dynamic waveform height (60-200px)
    const arrangementIdRef = useRef<string | null>(null);
    const [songSlug, setSongSlug] = useState<string | null>(null);
    const countInIntervalRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const levelAnimationRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const clickCuePanelRef = useRef<ClickCuePanelRef>(null);

    const [availableSongSections, setAvailableSongSections] = useState<any[]>(
        []
    );
    const [userSections, setUserSections] = useState<any[]>([]);
    const currentSectionRef = useRef<any>(null);
    const supabaseChannelRef = useRef<any>(null);
    const isPlayingRef = useRef<boolean>(false);
    const userSectionsRef = useRef<any[]>([]);
    
    // Undo/Redo for arrangement sections
    const {
        recordDelete,
        popUndo,
        canUndo,
    } = useArrangementUndo();

    // keep refs in sync with state
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        userSectionsRef.current = userSections;
    }, [userSections]);
    const [markerForm, setMarkerForm] = useState({
        name: "",
        start_time: 0,
        end_time: 0,
        section_id: "", // Add section_id to link to song_sections
    });
    const playerRef = useRef<StreamingMultiTrackPlayer | null>(null);

    // Coalesce rapid pitch slider updates to prevent overlapping SoundTouch operations
    // (Electron can hard-crash under heavy ScriptProcessor churn even without console errors).
    const pitchApplyTimeoutRef = useRef<number | null>(null);
    const pendingPitchRef = useRef<number | null>(null);
    const isApplyingPitchRef = useRef(false);
    const { outputDevices, selectedDeviceId, selectDevice, isLoading, maxOutputChannels } =
        useAudioDevices();
    
    // Mixer presets hook - uses sequencer.id (sequencer_file_id)
    const {
        presets: mixerPresets,
        activePresetId,
        isLoading: isLoadingPresets,
        createPreset,
        updatePreset,
        deletePreset,
        renamePreset,
        setActivePreset,
        getPreset,
    } = useMixerPresets(sequencer.id);
    
    const [globalOutputDevice, setGlobalOutputDevice] = useState<string>('default');
    const isInitializingRef = useRef(false);
    const hasInitializedRef = useRef(false);
    const hasAutoLoadedPresetRef = useRef(false);
    const wheelRafRef = useRef<number | null>(null);
    const pendingWheelRef = useRef<{ zoomFactor?: number; scrollDelta?: number }>({});
    const timelineZoomRef = useRef(1);
    const pendingAutoPlayRef = useRef(false);
    const handleTrackUpdate = useCallback(
        (trackIndex: number, updates: any) => {
            if (!playerRef.current) return;

            setTracks((prev) => {
                const existing = prev[trackIndex];
                const nextValue = { ...existing, ...updates };
                if (existing === nextValue) return prev;
                const next = [...prev];
                next[trackIndex] = nextValue;
                return next;
            });

            if (updates.volume !== undefined) {
                playerRef.current.setTrackVolume(trackIndex, updates.volume);
            }
            if (updates.pan !== undefined) {
                playerRef.current.setTrackPan(trackIndex, updates.pan);
            }
            if (updates.muted !== undefined) {
                playerRef.current.setTrackMute(trackIndex, updates.muted);
            }
            if (updates.solo !== undefined) {
                playerRef.current.setTrackSolo(trackIndex, updates.solo);
            }
        },
        []
    );

    // Handle mixer track drag and drop reordering
    const handleMixerDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;
        
        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;
        
        if (sourceIndex === destIndex) return;

        // Reorder tracks array
        setTracks(prev => {
            const newTracks = [...prev];
            const [removed] = newTracks.splice(sourceIndex, 1);
            newTracks.splice(destIndex, 0, removed);
            return newTracks;
        });

        // Reorder track output channels
        setTrackOutputChannels(prev => {
            const newChannels = [...prev];
            const [removed] = newChannels.splice(sourceIndex, 1);
            newChannels.splice(destIndex, 0, removed);
            return newChannels;
        });

        // Reorder track levels
        setTrackLevels(prev => {
            const newLevels = [...prev];
            const [removed] = newLevels.splice(sourceIndex, 1);
            newLevels.splice(destIndex, 0, removed);
            return newLevels;
        });

        // Notify the player about the track reorder if needed
        if (playerRef.current?.reorderTracks) {
            playerRef.current.reorderTracks(sourceIndex, destIndex);
        }
    }, []);

    // Preset save/load handlers
    const handleSavePreset = useCallback((name: string) => {
        const trackSettings: TrackPresetSettings[] = tracks.map((track, index) => ({
            trackIndex: index,
            trackName: track.name || track.filename || `Track ${index + 1}`,
            volume: track.volume ?? 1,
            muted: track.muted ?? false,
            solo: track.solo ?? false,
            pan: track.pan ?? 0,
        }));

        const clickSettings: ClickTrackPresetSettings = {
            enabled: clickEnabled,
            volume: clickVolume,
            tempo: clickTempo,
            subdivision: clickSubdivision,
            startOffset: clickStartOffset,
        };

        const cueSettings: CueTrackPresetSettings = {
            enabled: cueEnabled,
            volume: cueVolume,
            voice: cueVoice,
        };

        createPreset(name, trackSettings, masterVolume, clickSettings, cueSettings);
    }, [tracks, clickEnabled, clickVolume, clickTempo, clickSubdivision, clickStartOffset, cueEnabled, cueVolume, cueVoice, masterVolume, createPreset]);

    const handleLoadPreset = useCallback((presetId: string) => {
        const preset = getPreset(presetId);
        if (!preset) return;

        // Apply track settings
        preset.tracks.forEach((trackPreset) => {
            const trackIndex = trackPreset.trackIndex;
            if (trackIndex < tracks.length) {
                handleTrackUpdate(trackIndex, {
                    volume: trackPreset.volume,
                    muted: trackPreset.muted,
                    solo: trackPreset.solo,
                    pan: trackPreset.pan,
                });
            }
        });

        // Apply master volume
        setMasterVolume(preset.masterVolume);
        if (playerRef.current) {
            playerRef.current.setMasterVolume(preset.masterVolume);
        }

        // Apply click track settings
        setClickEnabled(preset.clickTrack.enabled);
        setClickVolume(preset.clickTrack.volume);
        setClickTempo(preset.clickTrack.tempo);
        setClickSubdivision(preset.clickTrack.subdivision);
        setClickStartOffset(preset.clickTrack.startOffset);

        // Apply cue track settings
        setCueEnabled(preset.cueTrack.enabled);
        setCueVolume(preset.cueTrack.volume);
        setCueVoice(preset.cueTrack.voice);

        setActivePreset(presetId);
    }, [getPreset, tracks.length, handleTrackUpdate, setActivePreset]);

    const handleUpdatePreset = useCallback((presetId: string) => {
        const trackSettings: TrackPresetSettings[] = tracks.map((track, index) => ({
            trackIndex: index,
            trackName: track.name || track.filename || `Track ${index + 1}`,
            volume: track.volume ?? 1,
            muted: track.muted ?? false,
            solo: track.solo ?? false,
            pan: track.pan ?? 0,
        }));

        const clickSettings: ClickTrackPresetSettings = {
            enabled: clickEnabled,
            volume: clickVolume,
            tempo: clickTempo,
            subdivision: clickSubdivision,
            startOffset: clickStartOffset,
        };

        const cueSettings: CueTrackPresetSettings = {
            enabled: cueEnabled,
            volume: cueVolume,
            voice: cueVoice,
        };

        updatePreset(presetId, trackSettings, masterVolume, clickSettings, cueSettings);
    }, [tracks, clickEnabled, clickVolume, clickTempo, clickSubdivision, clickStartOffset, cueEnabled, cueVolume, cueVoice, masterVolume, updatePreset]);

    useEffect(() => {
        timelineZoomRef.current = timelineZoom;
    }, [timelineZoom]);

    // Auto-load active preset when presets finish loading and tracks are ready
    useEffect(() => {
        if (!isLoadingPresets && activePresetId && tracks.length > 0 && !isLoadingTracks && !hasAutoLoadedPresetRef.current) {
            
            hasAutoLoadedPresetRef.current = true;
            handleLoadPreset(activePresetId);
        }
    }, [isLoadingPresets, activePresetId, tracks.length, isLoadingTracks, handleLoadPreset]);

    const computeOverallProgress = useCallback((statuses: TrackDownloadStatus[]) => {
        if (!statuses || statuses.length === 0) return 0;
        const total = statuses.reduce((sum, s) => sum + (s.progress || 0), 0);
        return total / statuses.length;
    }, []);

    // Safety: if progress hits 100% but isLoadingTracks not cleared (e.g., onReady missed), clear it.
    useEffect(() => {
        if (!isLoadingTracks) return;

        const trackCount = tracks.length || trackDownloadStatuses.length;
        const anyTracks = trackCount > 0;
        const anyDownloading = trackDownloadStatuses.some(
            (s) => s.status === 'downloading' || s.status === 'pending' || s.status === 'streaming'
        );
        const allCached = anyTracks &&
            trackDownloadStatuses.length > 0 &&
            trackDownloadStatuses.every((s) => (s.status === 'cached' || s.progress >= 100));

        // If setlist mode, keep overlay until all tracks done (and inform parent)
        if (setlistId && onLoadingChange) {
            if (!anyDownloading && (loadingProgress >= 99 || allCached)) {
                setIsLoadingTracks(false);
                setLoadingProgress(100);
                onLoadingChange(false, 100);
            }
            return;
        }

        // Non-setlist: only hide when nothing downloading and progress is done
        if (!anyDownloading && (loadingProgress >= 99 || allCached)) {
            setIsLoadingTracks(false);
            setLoadingProgress(100);
        }
    }, [isLoadingTracks, loadingProgress, trackDownloadStatuses, tracks.length, setlistId, onLoadingChange]);

    // Expose loading state changes to parent (e.g., setlist overlay)
    useEffect(() => {
        onLoadingChange?.(isLoadingTracks, loadingProgress);
    }, [isLoadingTracks, loadingProgress, onLoadingChange]);

    // Ensure parent overlay is cleared when unmounting
    useEffect(() => {
        return () => {
            onLoadingChange?.(false, 0);
        };
    }, [onLoadingChange]);

    useEffect(() => {
        const loadSlug = async () => {
            if (offlineMode) {
                const fallback = sequencer?.songs?.slug || sequencer?.slug || sequencer.song_id;
                setSongSlug(fallback || sequencer.song_id);
                return;
            }

            const { data, error } = await supabase
                .from("songs")
                .select("slug")
                .eq("id", sequencer.song_id)
                .single();

            if (data?.slug) {
                setSongSlug(data.slug);
            } else {
                console.error("Slug not found for song_id:", sequencer.song_id, error);
                setSongSlug(sequencer.song_id);
            }
        };

        loadSlug();
    }, [sequencer.song_id, sequencer?.songs?.slug, sequencer?.slug, offlineMode]);

    useEffect(() => {
        if (!songSlug) return; // WAIT until slug loaded

        // Prevent multiple initializations
        if (isInitializingRef.current || hasInitializedRef.current) {
            return;
        }

        if (!supabaseChannelRef.current) {
            // Use setlist channel when in setlist mode, otherwise use song channel
            const channelId = setlistId 
                ? `setlist-performance-${setlistId}`
                : `live-preview-${songSlug}`;
            
            supabaseChannelRef.current = supabase.channel(channelId);
            supabaseChannelRef.current.subscribe((status: string) => {
                
            });
        }

        initializeSectionsFromSong();
        initializeTracks();

        return () => {
            if (levelAnimationRef.current) {
                cancelAnimationFrame(levelAnimationRef.current);
            }
            if (playerRef.current) {
                playerRef.current.dispose();
                playerRef.current = null;
            }

            if (supabaseChannelRef.current) {
                try {
                    supabase.removeChannel(supabaseChannelRef.current);
                } catch (e) {}
                supabaseChannelRef.current = null;
            }

            // Clean up count-in interval
            if (countInIntervalRef.current) {
                clearInterval(countInIntervalRef.current);
                countInIntervalRef.current = null;
            }

            // Clean up audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }

            // Reset initialization flags on cleanup
            isInitializingRef.current = false;
            hasInitializedRef.current = false;
        };
    }, [songSlug]); // depends on slug, NOT sequencer

    // Level metering animation loop
    useEffect(() => {
        if (!isPlaying || !playerRef.current) {
            setTrackLevels([]);
            setMasterLevel({ left: 0, right: 0 });
            setGainReduction(0);
            return;
        }

        const updateLevels = () => {
            if (playerRef.current && isPlaying) {
                const levels = playerRef.current.getAllTrackLevels();
                // Avoid state churn if same
                setTrackLevels(prev => (prev === levels ? prev : levels));
                
                // Get master level from engine's analyzer (more accurate)
                if (typeof playerRef.current.getMasterLevel === 'function') {
                    const masterLvl = playerRef.current.getMasterLevel();
                    setMasterLevel(prev => (
                        prev.left === masterLvl.left && prev.right === masterLvl.right
                            ? prev
                            : masterLvl
                    ));
                } else if (levels.length > 0) {
                    // Fallback: calculate from track levels
                    const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
                    const nextMaster = { 
                        left: avgLevel * masterVolume, 
                        right: avgLevel * masterVolume 
                    };
                    setMasterLevel(prev => (
                        prev.left === nextMaster.left && prev.right === nextMaster.right
                            ? prev
                            : nextMaster
                    ));
                }
                
                // Get gain reduction from limiter
                if (typeof playerRef.current.getGainReduction === 'function') {
                    const gr = playerRef.current.getGainReduction();
                    setGainReduction(prev => Math.abs(prev - gr) > 0.1 ? gr : prev);
                }
                
                levelAnimationRef.current = requestAnimationFrame(updateLevels);
            }
        };

        levelAnimationRef.current = requestAnimationFrame(updateLevels);

        return () => {
            if (levelAnimationRef.current) {
                cancelAnimationFrame(levelAnimationRef.current);
            }
        };
    }, [isPlaying, masterVolume]);

    // Wheel event listener with passive: false to allow preventDefault
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const isZoom = e.ctrlKey || e.metaKey;
            if (isZoom) {
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                pendingWheelRef.current.zoomFactor =
                    (pendingWheelRef.current.zoomFactor ?? 1) * delta;
            } else {
                const scrollDelta = e.shiftKey
                    ? e.deltaY
                    : Math.abs(e.deltaX) > 0
                        ? e.deltaX
                        : e.deltaY;
                if (Math.abs(scrollDelta) > 0.5) {
                    pendingWheelRef.current.scrollDelta =
                        (pendingWheelRef.current.scrollDelta ?? 0) + scrollDelta;
                }
            }

            if (!wheelRafRef.current) {
                wheelRafRef.current = requestAnimationFrame(() => {
                    wheelRafRef.current = null;

                    const { zoomFactor = 1, scrollDelta = 0 } = pendingWheelRef.current;
                    pendingWheelRef.current = {};

                    if (zoomFactor !== 1) {
                        setTimelineZoom((prev) => {
                            const next = prev * zoomFactor;
                            return Math.max(1, Math.min(16, next));
                        });
                    }

                    if (Math.abs(scrollDelta) > 0.5) {
                        setTimelineScrollLeft((prev) => {
                            const cWidth = container.offsetWidth || 0;
                            const totalWidth = cWidth * timelineZoomRef.current;
                            const maxScroll = Math.max(0, totalWidth - cWidth);
                            const next = prev + scrollDelta;
                            return Math.max(0, Math.min(maxScroll, next));
                        });
                    }
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
            if (wheelRafRef.current) {
                cancelAnimationFrame(wheelRafRef.current);
                wheelRafRef.current = null;
            }
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input/textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Undo: Ctrl+Z (Windows) or Cmd+Z (Mac)
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    handlePlayPause();
                    break;
                case 'Enter':
                case 'NumpadEnter':
                    e.preventDefault();
                    handleStop();
                    break;
                case 'Backspace':
                case 'Delete':
                    e.preventDefault();
                    if (selectedSection) {
                        handleDeleteMarker(selectedSection);
                        setSelectedSection(null);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, selectedSection, canUndo]);

    const getColorForSectionType = (type: string): string => {
        return getSectionBgColor(type);
    };

    // Helper to ensure sections always have colors mapped
    const mapSectionsWithColors = (sections: any[]): any[] => {
        return sections.map((s: any) => ({
            ...s,
            color: s.color || getSectionBgColor(s.section_type || s.name || ''),
        }));
    };

    const initializeSectionsFromSong = async () => {
        try {
            if (offlineMode) {
                const cached = localDataStore.loadSongSections(sequencer.song_id);
                if (cached.length > 0) {
                    setAvailableSongSections(cached);
                    setUserSections(cached);
                }
                return;
            }

            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: songSections, error: songSectionsError } =
                await supabase
                    .from("song_sections")
                    .select("id, name, section_type")
                    .eq("song_id", sequencer.song_id)
                    .eq("is_production", true)
                    .order("created_at", { ascending: true });

            if (songSectionsError) {
                console.error(
                    "Error loading song sections:",
                    songSectionsError
                );
                return;
            }

            if (songSections) {
                setAvailableSongSections(songSections);
            }

            if (user) {
                const { data: fetchedUserSections, error: userSectionsError } =
                    await supabase
                        .from("sequencer_user_sections")
                        .select(
                            "id, song_section_id, start_time, end_time, song_sections(name, section_type)"
                        )
                        .eq("user_id", user.id)
                        .eq("sequencer_file_id", sequencer.id)
                        .order("start_time", { ascending: true });

                if (userSectionsError) {
                    console.error(
                        "Error loading user sections:",
                        userSectionsError
                    );
                    setUserSections(mapSectionsWithColors(songSections || []));
                    return;
                }

                if (fetchedUserSections && fetchedUserSections.length > 0) {
                    const sections = fetchedUserSections.map((us: any) => ({
                        id: us.song_section_id,
                        dbId: us.id,
                        name: us.song_sections?.name || "Section",
                        start_time: Number(us.start_time ?? 0),
                        end_time: Number(us.end_time ?? 0),
                        color: getColorForSectionType(
                            us.song_sections?.section_type || us.song_sections?.name || ""
                        ),
                    }));
                    setUserSections(sections);
                    localDataStore.saveSongSections(sequencer.song_id, sections);
                } else {
                    setUserSections(mapSectionsWithColors(songSections || []));
                    localDataStore.saveSongSections(sequencer.song_id, mapSectionsWithColors(songSections || []));
                }
            } else {
                setUserSections(mapSectionsWithColors(songSections || []));
                localDataStore.saveSongSections(sequencer.song_id, mapSectionsWithColors(songSections || []));
            }
        } catch (error) {
            console.error("Error initializing sections from song:", error);
        }
    };


    const initializeTracks = async () => {
        // Prevent multiple simultaneous initializations
        if (isInitializingRef.current || hasInitializedRef.current) {
            return;
        }

        isInitializingRef.current = true;

        try {
            setIsLoadingTracks(true);
            setLoadingProgress(0);

            const trackData = sequencer.tracks || [];
            
            // Check if tracks use R2 storage (have r2_audio_key)
            const hasR2Tracks = trackData.some((track: any) => track.r2_audio_key);
            
            let r2Urls: { trackIndex: number; audioUrl: string; peaksUrl: string }[] = [];
            if (hasR2Tracks) {
                
                try {
                    // Get file extensions from tracks
                    const extensions = trackData.map((track: any) => {
                        const ext = track.filename?.split('.').pop()?.toLowerCase();
                        return ext || 'wav';
                    });
                    
                    r2Urls = await r2AudioService.getTrackUrls(
                        sequencer.song_id,
                        trackData.length,
                        extensions
                    );
                    
                } catch (error) {
                    console.error('[DAWPlayer] Failed to get R2 URLs, falling back to Supabase:', error);
                }
            }

            // Fetch peaks.json for all tracks in parallel (small JSONs, fast - for waveform display)
            
            const allPeaks: { trackIndex: number; peaks: number[]; duration: number }[] = [];
            for (const urlData of r2Urls) {
                try {
                    const peaksData = await r2AudioService.fetchPeaks(urlData.peaksUrl, `${sequencer.song_id}-${urlData.trackIndex}`);
                    allPeaks.push({
                        trackIndex: urlData.trackIndex,
                        peaks: peaksData.peaks || [],
                        duration: peaksData.duration || 0,
                    });
                } catch (error) {
                    console.warn(`[DAWPlayer] Failed to fetch peaks for track ${urlData.trackIndex}:`, error);
                    allPeaks.push({ trackIndex: urlData.trackIndex, peaks: [], duration: 0 });
                }
            }
            
            
            // Build track configs for streaming player
            const loadedTracks = trackData.map((track: any, index: number) => {
                const r2UrlData = r2Urls.find(u => u.trackIndex === index);
                const peaksData = allPeaks.find(p => p.trackIndex === index);
                
                let audioUrl: string;
                let peaksUrl: string = r2UrlData?.peaksUrl || '';
                
                if (r2UrlData && track.r2_audio_key) {
                    audioUrl = r2UrlData.audioUrl;
                    
                } else {
                    const filePath = `${sequencer.storage_folder_path}/${track.filename}`;
                    const { data: { publicUrl } } = supabase.storage
                        .from("sequencer-files")
                        .getPublicUrl(filePath);
                    audioUrl = publicUrl;
                    
                }

                return {
                    ...track,
                    audioUrl,
                    peaksUrl,
                    peaks: peaksData?.peaks || [],
                    peaksDuration: peaksData?.duration || 0,
                    volume: track.default_volume || 1,
                    pan: track.default_pan || 0,
                    muted: false,
                    solo: false,
                };
            });

            setTracks(loadedTracks);

            // Initialize download statuses
            const initialStatuses = loadedTracks.map((_: any, index: number) => ({
                trackIndex: index,
                status: 'pending' as const,
                progress: 0,
            }));
            setTrackDownloadStatuses(initialStatuses);
            setLoadingProgress(computeOverallProgress(initialStatuses));

            // Create streaming player (no full decode - uses HTMLAudioElement streaming)
            playerRef.current = new StreamingMultiTrackPlayer(
                loadedTracks.map((t: any) => ({
                    name: t.name || t.filename,
                    filename: t.filename,
                    r2_audio_key: t.r2_audio_key,
                    audioUrl: t.audioUrl,
                    peaksUrl: t.peaksUrl,
                    default_volume: t.default_volume,
                    default_pan: t.default_pan,
                    outputChannel: t.outputChannel,
                    color: t.color,
                })),
                sequencer.song_id,
                {
                    onReady: () => {
                        setIsLoadingTracks(false);
                        setLoadingProgress(100);
                        if (pendingAutoPlayRef.current) {
                            pendingAutoPlayRef.current = false;
                            playerRef.current?.play();
                            setIsPlaying(true);
                        }

                        // Apply saved global output device
                        const savedGlobalDevice = localStorage.getItem('audioOutputDevice_global') || 'default';
                        playerRef.current?.setGlobalOutputDevice(savedGlobalDevice);
                        setGlobalOutputDevice(savedGlobalDevice);

                        // Apply saved output channels per track and initialize state
                        const initialChannels = loadedTracks.map((_: any, index: number) => {
                            const savedChannel = localStorage.getItem(`audioOutputChannel_track_${index}`);
                            const channel = savedChannel ? parseInt(savedChannel) : 0;
                            if (savedChannel) {
                                playerRef.current?.setTrackOutputChannel(index, channel);
                            }
                            return channel;
                        });
                        setTrackOutputChannels(initialChannels);

                        hasInitializedRef.current = true;
                        isInitializingRef.current = false;
                    },
                    onTrackStatus: (status) => {
                        setTrackDownloadStatuses(prev => {
                            const updated = [...prev];
                            updated[status.trackIndex] = status;
                            setLoadingProgress(computeOverallProgress(updated));
                            return updated;
                        });
                    },
                    onAllCached: () => {
                        setIsAllCached(true);
                        
                    },
                    onDuration: (dur) => {
                        setDuration(dur);
                    },
                    onBufferingChange: (buffering, tracks) => {
                        setIsBuffering(buffering);
                        setBufferingTracks(tracks);
                        if (buffering) {
                            
                        }
                    },
                }
            );

            playerRef.current.onTimeUpdate((time) => {
                setCurrentTime(time);
                handleTimeUpdate(time);
            });
            
            // Register pitch loading callback
            playerRef.current.onPitchLoadingChange((loading, progress) => {
                setIsPitchLoading(loading);
                setPitchLoadingProgress(progress);
            });

            // Prime audio context for faster start (best effort)
            try {
                playerRef.current?.resume?.();
            } catch (e) {
                // ignore
            }
        } catch (error) {
            console.error("Error initializing tracks:", error);
            setIsLoadingTracks(false);
            isInitializingRef.current = false;
        }
    };

    const lastSectionCheckTimeRef = useRef(0);

    const handleTimeUpdate = (time: number) => {
        const t = Number(time);

        const now = Date.now();
        if (now - lastSectionCheckTimeRef.current < 500) return;
        lastSectionCheckTimeRef.current = now;

        // Use ref to get latest userSections value (avoid closure issue)
        const currentUserSections = userSectionsRef.current;
        if (!currentUserSections || currentUserSections.length === 0) return;

        const nextSection = currentUserSections.find((s) => {
            const start = s.start_time;
            const end = s.end_time;
            return t >= start && t <= end;
        });

        if (!nextSection) return;

        const hasChangedSection =
            currentSectionRef.current?.id !== nextSection.id;

        // SELALU update dulu
        if (hasChangedSection) {
            currentSectionRef.current = nextSection;
            setCurrentSection(nextSection);

            (async () => {
                const { data } = await supabase
                    .from("arrangements")
                    .select("id")
                    .eq("section_id", nextSection.id)
                    .maybeSingle();

                arrangementIdRef.current = data?.id || null;

                
                supabaseChannelRef.current?.send({
                    type: "broadcast",
                    event: "section-change",
                    payload: {
                        sectionId: nextSection.id,
                        arrangementId: arrangementIdRef.current,
                        isPlaying,
                        songId: sequencer.song_id,
                        setlistId: setlistId || null,
                        showAllSections: false,
                    },
                }).then(() => {
                    
                }).catch((err: any) => {
                    console.error(`[DAWPlayer] section-change broadcast failed:`, err);
                });
            })();
        }
    };


    const handleSectionClick = async (section: any) => {
        handleSeek(section.start_time);

        // update state local
        currentSectionRef.current = section;
        setCurrentSection(section);

        // fetch arrangementId
        const { data } = await supabase
            .from("arrangements")
            .select("id")
            .eq("section_id", section.id)
            .maybeSingle();

        arrangementIdRef.current = data?.id || null;

        // 🔥 broadcast same event as time update
        
        supabaseChannelRef.current?.send({
            type: "broadcast",
            event: "section-change",
            payload: {
                sectionId: section.id,
                arrangementId: arrangementIdRef.current,
                isPlaying: isPlayingRef.current,
                songId: sequencer.song_id,
                setlistId: setlistId || null,
                showAllSections: false,
            },
        }).then(() => {
            
        }).catch((err: any) => {
            console.error(`[DAWPlayer] section-change broadcast on click failed:`, err);
        });
    };

    const handleEditMarker = (section: any) => {
        setEditingMarker(section);
        setMarkerForm({
            name: section.name || "",
            start_time: section.start_time || 0,
            end_time: section.end_time || 0,
            section_id: section.id || "", // Include the section_id
        });
    };

    // Default section cycle order
    const SECTION_CYCLE_ORDER = ['Intro', 'Verse', 'Chorus', 'Pre-Chorus', 'Bridge', 'Instrumental', 'Solo', 'Outro'];

    const handleAddMarker = async () => {
        
        // Directly add a 30-second marker appended after the last existing marker (fallback: current playhead)
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                return;
            }

            // Determine next section name based on cycle order
            const currentCount = userSectionsRef.current.length;
            const cycleIndex = currentCount % SECTION_CYCLE_ORDER.length;
            const sectionName = SECTION_CYCLE_ORDER[cycleIndex];

            // Find matching section from availableSongSections if exists
            const matchingSection = availableSongSections.find(
                (s) =>
                    s.name?.toLowerCase() === sectionName.toLowerCase() ||
                    s.section_type?.toLowerCase() === sectionName.toLowerCase()
            );

            const lastEnd = userSectionsRef.current.length
                ? Math.max(...userSectionsRef.current.map((s) => Number(s.end_time) || 0))
                : currentTime;

            const startTime = Math.max(0, Math.min(duration || Infinity, lastEnd));
            const endTime = Math.min(duration || Infinity, startTime + 30); // 30 seconds default


            // Insert new marker directly to database
            const { data: inserted, error } = await supabase
                .from("sequencer_user_sections")
                .insert({
                    user_id: user.id,
                    sequencer_file_id: sequencer.id,
                    song_section_id: matchingSection?.id || null,
                    start_time: startTime,
                    end_time: endTime,
                    is_production: true,
                })
                .select("id")
                .single();

            if (error) throw error;

            // Add to local state immediately (keep sorted by start_time)
            setUserSections((prev) =>
                [...prev,
                    {
                        id: matchingSection?.id || `section-${Date.now()}`,
                        dbId: inserted.id,
                        name: matchingSection?.name || sectionName,
                        start_time: startTime,
                        end_time: endTime,
                        color: getColorForSectionType(matchingSection?.section_type || sectionName.toLowerCase()),
                    },
                ].sort((a, b) => a.start_time - b.start_time)
            );

            
        } catch (error) {
            console.error("Error adding marker:", error);
        }
    };

    // Handle inline rename of section (from double-click)
    const handleSectionRename = useCallback(async (section: any, newName: string) => {
        if (!newName.trim() || newName === section.name) return;
        
        try {
            // Update local state immediately
            setUserSections((prev) =>
                prev.map((s) =>
                    s.dbId === section.dbId
                        ? { ...s, name: newName, color: getColorForSectionType(newName.toLowerCase()) }
                        : s
                )
            );
            
        } catch (error) {
            console.error("Error renaming section:", error);
        }
    }, []);

    // Local state update only (for smooth dragging without DB calls)
    const handleSectionUpdateLocal = useCallback((section: any, updates: any) => {
        // Update local state only - no DB call
        setUserSections((prev) =>
            prev.map((s) =>
                s.id === section.id ? { ...s, ...updates } : s
            )
        );
    }, []);

    // Save to database (called on drag end)
    const handleSectionUpdateEnd = useCallback(async (section: any, updates: any) => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            // Update the sequencer_user_sections record
            const { error } = await supabase
                .from("sequencer_user_sections")
                .update({
                    start_time: updates.start_time,
                    end_time: updates.end_time,
                })
                .eq("id", section.dbId)
                .eq("user_id", user.id)
                .eq("is_production", true);

            if (error) throw error;
            
        } catch (error) {
            console.error("Error saving section:", error);
        }
    }, []);

    // Combined handler for non-drag updates (still used for other cases)
    const handleSectionUpdate = useCallback(async (section: any, updates: any) => {
        handleSectionUpdateLocal(section, updates);
        await handleSectionUpdateEnd(section, updates);
    }, [handleSectionUpdateLocal, handleSectionUpdateEnd]);

    const handleTimelineDoubleClick = (e: React.MouseEvent, rect: DOMRect) => {
        const x = e.clientX - rect.left;
        const progress = x / rect.width;
        const time = progress * duration;

        setShowAddMarker(true);
        setMarkerForm({
            name: `Section ${
                (sequencer.sequencer_data?.sections?.length || 0) + 1
            }`,
            start_time: Math.max(0, time - 5),
            end_time: Math.min(duration, time + 25),
            section_id: "", // Will be selected from available sections
        });
    };

    const handleSaveMarker = async () => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                return;
            }

            const selectedSection = availableSongSections.find(
                (s) => s.id === markerForm.section_id
            );

            if (editingMarker) {
                // Update existing marker in database
                const { error } = await supabase
                    .from("sequencer_user_sections")
                    .update({
                        song_section_id: markerForm.section_id,
                        start_time: markerForm.start_time,
                        end_time: markerForm.end_time,
                    })
                    .eq("id", editingMarker.dbId)
                    .eq("user_id", user.id)
                    .eq("is_production", true);

                if (error) throw error;

                // Update local state
                setUserSections((prev) =>
                    prev.map((s) =>
                        s.dbId === editingMarker.dbId
                            ? {
                                  ...s,
                                  id: markerForm.section_id,
                                  name: selectedSection?.name || "Section",
                                  start_time: markerForm.start_time,
                                  end_time: markerForm.end_time,
                                  color: getColorForSectionType(
                                      selectedSection?.section_type || ""
                                  ),
                              }
                            : s
                    )
                );
            } else {
                // Insert new marker in database
                if (!markerForm.section_id) {
                    console.error("Please select a section");
                    return;
                }

                const { data: inserted, error } = await supabase
                    .from("sequencer_user_sections")
                    .insert({
                        user_id: user.id,
                        sequencer_file_id: sequencer.id,
                        song_section_id: markerForm.section_id,
                        start_time: markerForm.start_time,
                        end_time: markerForm.end_time,
                        is_production: true,
                    })
                    .select("id")
                    .single();

                if (error) throw error;

                // Add to local state
                setUserSections((prev) => [
                    ...prev,
                    {
                        id: markerForm.section_id,
                        dbId: inserted.id,
                        name: selectedSection?.name || "Section",
                        start_time: markerForm.start_time,
                        end_time: markerForm.end_time,
                        color: getColorForSectionType(
                            selectedSection?.section_type || ""
                        ),
                    },
                ]);
            }

            setEditingMarker(null);
            setShowAddMarker(false);
        } catch (error) {
            console.error("Error saving marker:", error);
        }
    };

    const handleDeleteMarker = async (sectionIdOrObject: any) => {
        try {
            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                return;
            }

            // Handle both section object and section ID
            const section = typeof sectionIdOrObject === 'string' 
                ? userSections.find(s => s.id === sectionIdOrObject)
                : sectionIdOrObject;

            if (!section || !section.dbId) {
                console.error("Section not found or missing dbId");
                return;
            }

            // Record deletion for undo before deleting
            recordDelete({
                id: section.id,
                dbId: section.dbId,
                name: section.name,
                start_time: section.start_time,
                end_time: section.end_time,
                color: section.color,
                song_section_id: section.id,
            });

            // Delete from database using the dbId
            const { error } = await supabase
                .from("sequencer_user_sections")
                .delete()
                .eq("id", section.dbId)
                .eq("user_id", user.id)
                .eq("is_production", true);

            if (error) throw error;

            // Update local state
            setUserSections((prev) =>
                prev.filter((s) => s.dbId !== section.dbId)
            );
        } catch (error) {
            console.error("Error deleting marker:", error);
        }
    };

    // Undo handler - restores the last deleted section
    const handleUndo = async () => {
        const action = popUndo();
        if (!action) return;

        if (action.type === 'delete') {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                    console.error("No user logged in for undo");
                    return;
                }

                const section = action.section;

                // Re-insert the section into the database
                const { data: newSection, error } = await supabase
                    .from("sequencer_user_sections")
                    .insert({
                        user_id: user.id,
                        sequencer_file_id: sequencer.id,
                        song_section_id: section.song_section_id || section.id,
                        start_time: section.start_time,
                        end_time: section.end_time,
                        is_production: true,
                    })
                    .select("id, song_section_id, start_time, end_time")
                    .single();

                if (error) {
                    console.error("Error restoring section:", error);
                    return;
                }

                // Restore to local state with new dbId
                const restoredSection = {
                    id: section.song_section_id || section.id,
                    dbId: newSection.id,
                    name: section.name,
                    start_time: Number(section.start_time),
                    end_time: Number(section.end_time),
                    color: section.color || getColorForSectionType(section.name),
                };

                setUserSections((prev) => 
                    [...prev, restoredSection].sort((a, b) => a.start_time - b.start_time)
                );

                
            } catch (error) {
                console.error("Error during undo:", error);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingMarker(null);
        setShowAddMarker(false);
    };

    const playClickSound = useCallback((accent: boolean = false) => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = accent ? 1200 : 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }, []);

    const startCountIn = useCallback((onComplete?: () => void) => {
        const countInBeats = getCountInBeats(countInValue);
        
        if (!playerRef.current || countInBeats === 0) {
            // No count-in, execute immediately
            if (onComplete) {
                onComplete();
            } else {
                playerRef.current?.play();
                setIsPlaying(true);
            }
            return;
        }
        // Use actual current tempo (base tempo * tempo multiplier)
        const currentTempo = (sequencer.tempo || 120) * tempo;
        const secondsPerBeat = 60 / currentTempo;
        const totalClicks = Math.ceil(countInBeats);
        const clickInterval = (countInBeats / totalClicks) * secondsPerBeat * 1000;
        
        setIsCountingIn(true);
        setPendingSeekTime(null);
        let currentClick = 0;

        // Play first click immediately
        playClickSound(true);
        setCountInDisplay(`${totalClicks}`);
        currentClick++;

        countInIntervalRef.current = window.setInterval(() => {
            if (currentClick >= totalClicks) {
                // Count-in complete
                if (countInIntervalRef.current) {
                    clearInterval(countInIntervalRef.current);
                    countInIntervalRef.current = null;
                }
                setIsCountingIn(false);
                setCountInDisplay(null);
                
                if (onComplete) {
                    onComplete();
                } else {
                    playerRef.current?.play();
                    setIsPlaying(true);
                }
                return;
            }

            const remaining = totalClicks - currentClick;
            playClickSound(currentClick % 4 === 0);
            setCountInDisplay(`${remaining}`);
            currentClick++;
        }, clickInterval);
    }, [countInValue, sequencer.tempo, tempo, playClickSound]);

    // Seek with count-in - counts in while playing continues, then jumps
    const seekWithCountIn = useCallback((targetTime: number) => {
        const countInBeats = getCountInBeats(countInValue);
        
        if (countInBeats === 0 || !isPlaying) {
            // No count-in or not playing, seek immediately
            if (playerRef.current) {
                playerRef.current.seekTo(targetTime);
                setCurrentTime(targetTime);
            }
            return;
        }

        // Cancel any existing count-in before starting a new one
        if (countInIntervalRef.current) {
            clearInterval(countInIntervalRef.current);
            countInIntervalRef.current = null;
        }

        // Store pending seek and start count-in
        setPendingSeekTime(targetTime);
        // Use actual current tempo (base tempo * tempo multiplier)
        const currentTempo = (sequencer.tempo || 120) * tempo;
        const secondsPerBeat = 60 / currentTempo;
        const totalClicks = Math.ceil(countInBeats);
        const clickInterval = (countInBeats / totalClicks) * secondsPerBeat * 1000;
        
        setIsCountingIn(true);
        let currentClick = 0;

        // Play first click immediately
        playClickSound(true);
        setCountInDisplay(`${totalClicks}`);
        currentClick++;

        countInIntervalRef.current = window.setInterval(() => {
            if (currentClick >= totalClicks) {
                // Count-in complete, now seek
                if (countInIntervalRef.current) {
                    clearInterval(countInIntervalRef.current);
                    countInIntervalRef.current = null;
                }
                setIsCountingIn(false);
                setCountInDisplay(null);
                setPendingSeekTime(null);
                
                // Now perform the actual seek - do NOT stop playback
                if (playerRef.current) {
                    playerRef.current.seekTo(targetTime);
                    setCurrentTime(targetTime);
                }
                return;
            }

            const remaining = totalClicks - currentClick;
            playClickSound(currentClick % 4 === 0);
            setCountInDisplay(`${remaining}`);
            currentClick++;
        }, clickInterval);
    }, [countInValue, sequencer.tempo, tempo, playClickSound, isPlaying]);

    const handlePlayPause = (withCountIn: boolean = false) => {
        if (!playerRef.current) {
            pendingAutoPlayRef.current = true;
            initializeTracks();
            return;
        }

        // Gate: if any track not cached/ready, block play
        const anyNotReady = trackDownloadStatuses.some(
            (s) => s.status === 'pending' || s.status === 'downloading' || s.status === 'streaming'
        );
        if (anyNotReady) {
            alert("Tracks are still loading. Please wait until caching completes.");
            return;
        }

        if (isPlaying || isCountingIn) {
            // Stop count-in if active
            if (countInIntervalRef.current) {
                clearInterval(countInIntervalRef.current);
                countInIntervalRef.current = null;
            }
            setIsCountingIn(false);
            setCountInDisplay(null);
            setPendingSeekTime(null);
            playerRef.current.pause();
            setIsPlaying(false);
        } else {
            // Ensure audio context resumed before start
            try {
                playerRef.current?.resume?.();
            } catch (e) {
                // ignore
            }
            // Only use count-in if explicitly requested AND count-in is set
            if (withCountIn && countInValue !== 'none') {
                startCountIn();
            } else {
                // Play immediately without count-in
                playerRef.current.play(0.08);
                setIsPlaying(true);
            }
        }
    };

    const handleStop = () => {
        if (!playerRef.current) return;
        playerRef.current.stop();
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleSeek = (time: number) => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(time);
        setCurrentTime(time);
    };

    const handleGlobalOutputDeviceChange = async (deviceId: string) => {
        if (!playerRef.current) return;
        await playerRef.current.setGlobalOutputDevice(deviceId);
        setGlobalOutputDevice(deviceId);
        localStorage.setItem('audioOutputDevice_global', deviceId);
    };

    const handleTrackOutputChannelChange = useCallback(
        (trackIndex: number, channel: number) => {
            if (!playerRef.current) return;
            playerRef.current.setTrackOutputChannel(trackIndex, channel);
            setTrackOutputChannels((prev) => {
                if (prev[trackIndex] === channel) return prev;
                const next = [...prev];
                next[trackIndex] = channel;
                return next;
            });
            localStorage.setItem(
                `audioOutputChannel_track_${trackIndex}`,
                channel.toString()
            );
        },
        []
    );

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleTempoChange = (rate: number) => {
        if (!playerRef.current) return;
        playerRef.current.setTempo(rate);
        setTempo(rate);
    };

    const applyPendingPitch = useCallback(async () => {
        if (!playerRef.current) return;
        if (isApplyingPitchRef.current) return;

        isApplyingPitchRef.current = true;
        try {
            while (pendingPitchRef.current !== null) {
                const target = pendingPitchRef.current;
                pendingPitchRef.current = null;

                const previousEnginePitch = playerRef.current.getPitch();
                try {
                    await playerRef.current.setPitch(target);
                    // Snap UI to whatever the engine actually applied
                    setPitch(playerRef.current.getPitch());
                } catch (error) {
                    console.error('[DAWPlayer] Failed to set pitch:', error);
                    // Revert UI to the last known engine-applied pitch
                    setPitch(previousEnginePitch);
                }
            }
        } finally {
            isApplyingPitchRef.current = false;
        }
    }, []);

    const handlePitchChange = useCallback((semitones: number) => {
        // Update UI immediately for responsiveness
        setPitch(semitones);
        pendingPitchRef.current = semitones;

        // Debounce engine updates while dragging
        if (pitchApplyTimeoutRef.current) {
            window.clearTimeout(pitchApplyTimeoutRef.current);
        }
        pitchApplyTimeoutRef.current = window.setTimeout(() => {
            pitchApplyTimeoutRef.current = null;
            void applyPendingPitch();
        }, 90);
    }, [applyPendingPitch]);

    useEffect(() => {
        return () => {
            if (pitchApplyTimeoutRef.current) {
                window.clearTimeout(pitchApplyTimeoutRef.current);
                pitchApplyTimeoutRef.current = null;
            }
            pendingPitchRef.current = null;
        };
    }, []);

    const handlePitchQualityModeChange = (mode: PitchQualityMode) => {
        if (!playerRef.current) return;
        playerRef.current.setPitchQualityMode(mode);
        setPitchQualityMode(mode);
    };

    const handleFormantPreservationChange = (enabled: boolean) => {
        if (!playerRef.current) return;
        playerRef.current.setFormantPreservation(enabled);
        setFormantPreservation(enabled);
    };

    const handleMasterVolumeChange = (volume: number) => {
        if (!playerRef.current) return;
        playerRef.current.setMasterVolume(volume);
        setMasterVolume(volume);
    };

    const handleRecordingComplete = async (
        recording: MIDIRecording,
        audioBlob?: Blob
    ) => {

        if (audioBlob && sequencer?.storage_folder_path && sequencer?.id) {
            try {
                const fileName = `recorded_${Date.now()}.wav`;
                const filePath = `${sequencer.storage_folder_path}/${fileName}`;

                // Upload audio file to Supabase storage
                const { error: uploadError } = await supabase.storage
                    .from("song_files")
                    .upload(filePath, audioBlob, {
                        contentType: "audio/wav",
                        upsert: false,
                    });

                if (uploadError) {
                    console.error(
                        "Error uploading recorded audio:",
                        uploadError
                    );
                    alert("Failed to upload recording: " + uploadError.message);
                    return;
                }

                // Add new track to the sequencer
                const newTrack = {
                    name: `Recorded Track ${tracks.length + 1}`,
                    filename: fileName,
                    color: "#FF6B6B",
                    default_volume: 0.8,
                    default_pan: 0,
                };

                const updatedTracks = [...(sequencer.tracks || []), newTrack];

                // Update sequencer tracks in database
                const { error: updateError } = await supabase
                    .from("sequencer_files")
                    .update({ tracks: updatedTracks })
                    .eq("id", sequencer.id);

                if (updateError) {
                    console.error("Error updating tracks:", updateError);
                    alert("Failed to update database: " + updateError.message);
                    return;
                }

                // Reload tracks
                await initializeTracks();
                alert("Recording saved successfully!");
            } catch (error) {
                console.error("Error in handleRecordingComplete:", error);
                alert("An error occurred while saving the recording");
            }
        } else {
            console.error("Missing required data:", {
                hasBlob: !!audioBlob,
                storagePath: sequencer?.storage_folder_path,
                sequencerId: sequencer?.id,
            });
        }

        setShowRecorder(false);
    };

    // Render the main content (header, transport, control bar, waveform)
    const renderMainContent = () => (
        <>
            {/* Single-line header with song info + transport controls */}
            <SongInfoHeader
                timeSignature={sequencer.time_signature || '4/4'}
                currentTime={currentTime}
                duration={duration}
                currentSection={currentSection}
                songTitle={setlistId ? undefined : sequencer.title}
                isPlaying={isPlaying}
                loadingProgress={loadingProgress}
                isLoading={trackDownloadStatuses.some(s => s.status === 'downloading' || s.status === 'pending' || s.status === 'streaming')}
            >
                {/* Transport Controls - inline */}
                <div className="flex items-center gap-1 ml-2">
                    <button
                        onClick={handleStop}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handlePlayPause}
                        disabled={isCountingIn || isPitchLoading}
                        className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                            isPitchLoading
                                ? "bg-yellow-500/50 text-yellow-900"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        {isCountingIn ? (
                            <span className="text-sm font-bold">{countInDisplay}</span>
                        ) : isPitchLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-4 h-4" />
                        ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                        )}
                    </button>
                    <button
                        onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>
                </div>

                {/* Count-in */}
                <CountInSelector 
                    value={countInValue} 
                    onChange={setCountInValue}
                    onPlayWithCountIn={() => handlePlayPause(true)}
                    disabled={isCountingIn}
                    isPlaying={isPlaying}
                />

                {/* Tempo Control */}
                <TempoControl
                    tempo={tempo}
                    onTempoChange={handleTempoChange}
                    disabled={isCountingIn}
                />

                {/* Pitch Control */}
                <PitchControl
                    pitch={pitch}
                    onPitchChange={handlePitchChange}
                    qualityMode={pitchQualityMode}
                    onQualityModeChange={handlePitchQualityModeChange}
                    formantPreservation={formantPreservation}
                    onFormantPreservationChange={handleFormantPreservationChange}
                    isLoading={isPitchLoading}
                    loadingProgress={pitchLoadingProgress}
                    disabled={isCountingIn}
                />

                {/* Click & Cue Track Panel */}
                <ClickCuePanel
                    ref={clickCuePanelRef}
                    songTempo={Math.round((sequencer.tempo || 120) * tempo)}
                    clickTempo={clickTempo}
                    onClickTempoChange={setClickTempo}
                    timeSignature={sequencer.time_signature || '4/4'}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    sections={userSections}
                    startOffset={clickStartOffset}
                    onStartOffsetChange={setClickStartOffset}
                    clickEnabled={clickEnabled}
                    onClickEnabledChange={setClickEnabled}
                    clickVolume={clickVolume}
                    onClickVolumeChange={setClickVolume}
                    clickSubdivision={clickSubdivision}
                    onClickSubdivisionChange={setClickSubdivision}
                    cueEnabled={cueEnabled}
                    onCueEnabledChange={setCueEnabled}
                    cueVolume={cueVolume}
                    onCueVolumeChange={setCueVolume}
                    cueVoice={cueVoice}
                    onCueVoiceChange={setCueVoice}
                />

                {/* Divider */}
                <div className="w-px h-5 bg-border mx-1" />

                {/* View Mode Toggle */}
                <div className="flex items-center gap-0.5 bg-muted rounded p-0.5">
                    <button
                        onClick={() => setViewMode('waveform')}
                        className={`p-1 rounded transition-colors ${
                            viewMode === 'waveform' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Waveform View"
                    >
                        <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setViewMode('mixer')}
                        className={`p-1 rounded transition-colors ${
                            viewMode === 'mixer' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Mixer View"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                </div>

                {isBuffering && isPlaying && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-[10px] font-medium">Buffering</span>
                    </div>
                )}

                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 bg-muted rounded px-1 py-0.5">
                    <button
                        onClick={() => setTimelineZoom(prev => Math.max(1, prev / 1.5))}
                        className="p-0.5 rounded hover:bg-background transition-colors"
                        title="Zoom out"
                    >
                        <ZoomOut className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <input
                        type="range"
                        min="1"
                        max="16"
                        step="0.5"
                        value={timelineZoom}
                        onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                        className="w-14 h-1 bg-border rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none 
                          [&::-webkit-slider-thumb]:w-2 
                          [&::-webkit-slider-thumb]:h-2 
                          [&::-webkit-slider-thumb]:rounded-full 
                          [&::-webkit-slider-thumb]:bg-foreground"
                    />
                    <button
                        onClick={() => setTimelineZoom(prev => Math.min(16, prev * 1.5))}
                        className="p-0.5 rounded hover:bg-background transition-colors"
                        title="Zoom in"
                    >
                        <ZoomIn className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <div className="w-px h-3 bg-border mx-0.5" />
                    <button
                        onClick={() => setWaveformHeight(prev => Math.max(40, prev - 20))}
                        className="p-0.5 rounded hover:bg-background transition-colors"
                        title="Decrease waveform height"
                    >
                        <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12h16" />
                          <path d="M8 8h8M8 16h8" strokeWidth="1.5" />
                        </svg>
                    </button>
                    <input
                        type="range"
                        min="40"
                        max="200"
                        step="10"
                        value={waveformHeight}
                        onChange={(e) => setWaveformHeight(parseInt(e.target.value))}
                        className="w-12 h-1 bg-border rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none 
                          [&::-webkit-slider-thumb]:w-2 
                          [&::-webkit-slider-thumb]:h-2 
                          [&::-webkit-slider-thumb]:rounded-full 
                          [&::-webkit-slider-thumb]:bg-foreground"
                        title={`Waveform height: ${waveformHeight}px`}
                    />
                    <button
                        onClick={() => setWaveformHeight(prev => Math.min(200, prev + 20))}
                        className="p-0.5 rounded hover:bg-background transition-colors"
                        title="Increase waveform height"
                    >
                        <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12h16" />
                          <path d="M6 6h12M6 18h12" strokeWidth="1.5" />
                        </svg>
                    </button>
                </div>
            </SongInfoHeader>

            {/* Control Bar Panel */}
            <div className="bg-secondary border-b border-border px-3 py-1 shrink-0 relative z-30">

                {/* Control Bar Panel - Logic Pro style */}
                <div>
                    <ControlBarPanel
                        duration={duration}
                        tempo={Math.round((sequencer.tempo || 120) * tempo)}
                        timeSignature={sequencer.time_signature || '4/4'}
                        currentTime={currentTime}
                        sections={userSections}
                        currentSection={currentSection}
                        selectedSection={selectedSection}
                        onSectionClick={(section) => {
                            if (isPlaying && countInValue !== 'none') {
                                seekWithCountIn(section.start_time);
                            } else {
                                handleSectionClick(section);
                            }
                        }}
                        onSectionSelect={setSelectedSection}
                        onSectionUpdate={handleSectionUpdateLocal}
                        onSectionUpdateEnd={handleSectionUpdateEnd}
                        onSectionDelete={handleDeleteMarker}
                        onSectionEdit={handleEditMarker}
                        onSectionRename={handleSectionRename}
                        onAddSection={handleAddMarker}
                        onSeek={(time) => {
                            if (isPlaying && countInValue !== 'none') {
                                seekWithCountIn(time);
                            } else {
                                handleSeek(time);
                            }
                        }}
                        externalZoom={timelineZoom}
                        externalScrollLeft={timelineScrollLeft}
                        onZoomChange={setTimelineZoom}
                        onScrollChange={setTimelineScrollLeft}
                        externalContainerWidth={timelineContainerWidth}
                        onContainerWidthChange={setTimelineContainerWidth}
                    />
                </div>

                {/* Combined Waveform Display - clean layout without action panel */}
                <div 
                    className="relative"
                    ref={(el) => {
                        if (el && containerRef.current !== el) {
                            containerRef.current = el;
                        }
                    }}
                >
                    {/* Waveform Area - Full width */}
                    <div className="w-full bg-muted/30 cursor-pointer relative overflow-hidden rounded-lg">
                        <CombinedWaveformDisplay
                            trackPeaks={tracks.map(t => t.peaks || [])}
                            currentTime={currentTime}
                            duration={duration}
                            onSeek={(time) => {
                                if (isPlaying && countInValue !== 'none') {
                                    seekWithCountIn(time);
                                } else {
                                    handleSeek(time);
                                }
                            }}
                            height={waveformHeight}
                            zoom={timelineZoom}
                            scrollLeft={timelineScrollLeft}
                            containerWidth={timelineContainerWidth}
                            verticalZoom={waveformVerticalZoom}
                            // Section overlay props
                            sections={userSections}
                            currentSection={currentSection}
                            onSectionClick={(section) => {
                                if (isPlaying && countInValue !== 'none') {
                                    seekWithCountIn(section.start_time);
                                } else {
                                    handleSectionClick(section);
                                }
                            }}
                            onAddSection={handleAddMarker}
                            onRemoveSection={handleDeleteMarker}
                            onSectionOptions={handleEditMarker}
                            showSectionOverlay={true}
                        />

                        {/* Pending seek indicator */}
                        {pendingSeekTime !== null && (() => {
                            const containerW = 1;
                            const totalW = containerW * timelineZoom;
                            const visibleStartRatio = timelineScrollLeft / (duration * 100 * timelineZoom);
                            const visibleEndRatio = (timelineScrollLeft + containerW) / (duration * 100 * timelineZoom);
                            const seekRatio = pendingSeekTime / duration;
                            
                            if (seekRatio >= visibleStartRatio && seekRatio <= visibleEndRatio) {
                                const seekX = ((seekRatio - visibleStartRatio) / (visibleEndRatio - visibleStartRatio)) * 100;
                                return (
                                    <div
                                        className="absolute inset-y-0 w-0.5 bg-yellow-500/70 pointer-events-none z-20 animate-pulse"
                                        style={{ left: `${seekX}%` }}
                                    >
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-yellow-500 animate-ping" />
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            </div>
        </>
    );

    // Render the mixer panel content
    const renderMixerPanel = () => (
        <div className="h-full bg-[hsl(0,0%,14%)] flex flex-col">
            {/* Mixer Header */}
            <div className="flex items-center px-3 py-1 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Mixer</span>
                    <span className="text-xs text-muted-foreground/60">({tracks.length} tracks)</span>
                </div>
                
                {/* Preset Controls - aligned left after mixer label */}
                <MixerPresetControls
                    presets={mixerPresets}
                    activePresetId={activePresetId}
                    onSavePreset={handleSavePreset}
                    onLoadPreset={handleLoadPreset}
                    onUpdatePreset={handleUpdatePreset}
                    onDeletePreset={deletePreset}
                    onRenamePreset={renamePreset}
                    className="ml-4"
                />
                
                {/* Strip Visibility Toggles */}
                <div className="flex items-center gap-1 ml-4 border-l border-border/50 pl-4">
                    <button
                        onClick={() => setShowClickStrip(!showClickStrip)}
                        className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                            showClickStrip 
                                ? "bg-primary/20 text-primary border border-primary/40" 
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                        )}
                    >
                        Click
                    </button>
                    <button
                        onClick={() => setShowCueStrip(!showCueStrip)}
                        className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                            showCueStrip 
                                ? "bg-primary/20 text-primary border border-primary/40" 
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                        )}
                    >
                        Cue
                    </button>
                    <button
                        onClick={() => setShowMasterStrip(!showMasterStrip)}
                        className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                            showMasterStrip 
                                ? "bg-primary/20 text-primary border border-primary/40" 
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                        )}
                    >
                        Master
                    </button>
                </div>
                
                {/* Compact Mode Toggle */}
                <div className="flex items-center gap-2 ml-4 border-l border-border/50 pl-4">
                    <button
                        onClick={() => setCompactMode(!compactMode)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md transition-all",
                            compactMode 
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" 
                                : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
                        )}
                        title={compactMode ? "Switch to comfortable layout" : "Switch to compact layout"}
                    >
                        <Layers className="w-3 h-3" />
                        {compactMode ? 'Compact' : 'Comfortable'}
                    </button>
                </div>
            </div>
            
            {/* Mode/Output Row */}
            {!isLoadingTracks && trackDownloadStatuses.length > 0 && (
                <div className="bg-secondary border-b border-border px-3 py-1 shrink-0">
                    <div className="flex items-center gap-6">
                        {/* Mode Selector */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Mode</span>
                            <DownloadStatusPanel
                                trackStatuses={trackDownloadStatuses}
                                trackNames={tracks.map((t: any) => t.name || t.filename || 'Track')}
                                className="!p-0 !bg-transparent !border-0 !mb-0"
                                playbackMode={playbackMode}
                                onPlaybackModeChange={(mode) => {
                                    setPlaybackMode(mode);
                                    playerRef.current?.setMode(mode);
                                }}
                                onRetryTrack={(trackIndex) => playerRef.current?.retryFailedDownload(trackIndex)}
                                onRetryAllFailed={() => playerRef.current?.retryAllFailed()}
                                onStopDownload={() => playerRef.current?.pauseDownloads()}
                                isDownloading={trackDownloadStatuses.some(s => s.status === 'downloading')}
                                compact
                            />
                        </div>
                        
                        {/* Global Output Device - pushed to right */}
                        <div className="flex items-center gap-3 ml-auto">
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Output</span>
                            <select
                                value={globalOutputDevice}
                                onChange={(e) => handleGlobalOutputDeviceChange(e.target.value)}
                                className="min-w-[200px] px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isLoading || isLoadingTracks}
                            >
                                <option value="default">Default</option>
                                {outputDevices.map((device) => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Mixer Content - with drag and drop */}
            <div className={cn("flex-1 overflow-x-auto overflow-y-auto", compactMode ? "p-1" : "p-2")}>
                <DragDropContext onDragEnd={handleMixerDragEnd}>
                    <div className={cn("flex justify-start items-start min-w-max", compactMode ? "gap-1" : "gap-2")}>
                        {/* Click Track Strip - Far left */}
                        {showClickStrip && (
                            <ClickTrackStrip
                                enabled={clickEnabled}
                                onToggle={() => setClickEnabled(!clickEnabled)}
                                volume={clickVolume}
                                onVolumeChange={setClickVolume}
                                subdivision={clickSubdivision}
                                onSubdivisionChange={setClickSubdivision}
                                clickTempo={clickTempo}
                                onClickTempoChange={setClickTempo}
                                songTempo={Math.round((sequencer.tempo || 120) * tempo)}
                                startOffset={clickStartOffset}
                                onStartOffsetChange={setClickStartOffset}
                                selectedOutputChannel={clickOutputChannel}
                                onOutputChannelChange={setClickOutputChannel}
                                maxChannels={maxOutputChannels}
                                compact={compactMode}
                            />
                        )}
                        
                        {/* Cue Track Strip - After Click */}
                        {showCueStrip && (
                            <CueTrackStrip
                                enabled={cueEnabled}
                                onToggle={() => setCueEnabled(!cueEnabled)}
                                volume={cueVolume}
                                onVolumeChange={setCueVolume}
                                voice={cueVoice}
                                onVoiceChange={setCueVoice}
                                selectedOutputChannel={cueOutputChannel}
                                onOutputChannelChange={setCueOutputChannel}
                                maxChannels={maxOutputChannels}
                                compact={compactMode}
                            />
                        )}
                        
                        {/* Divider after utility strips - only show if any utility strip visible */}
                        {(showClickStrip || showCueStrip) && showMasterStrip && (
                            <div className={cn("w-px h-full bg-[hsl(220,10%,25%)]", compactMode ? "min-h-[120px] mx-0.5" : "min-h-[160px] mx-1")} />
                        )}
                        
                        {/* Master Strip */}
                        {showMasterStrip && (
                            <MasterStrip
                                volume={masterVolume}
                                onVolumeChange={handleMasterVolumeChange}
                                leftLevel={masterLevel.left}
                                rightLevel={masterLevel.right}
                                gainReduction={gainReduction}
                                compact={compactMode}
                            />
                        )}
                        
                        {/* Divider before track strips - only show if any control strip visible */}
                        {(showClickStrip || showCueStrip || showMasterStrip) && (
                            <div className={cn("w-px h-full bg-[hsl(220,10%,22%)]", compactMode ? "min-h-[120px] mx-0.5" : "min-h-[160px] mx-1")} />
                        )}
                        
                        <Droppable droppableId="mixer-tracks" direction="horizontal">
                            {(provided) => (
                                <div 
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="flex gap-2"
                                >
                                    {tracks.map((track, index) => (
                                        <Draggable 
                                            key={track.id || `track-${index}`} 
                                            draggableId={track.id || `track-${index}`} 
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className="animate-item-enter"
                                                    style={{ 
                                                        ...provided.draggableProps.style,
                                                        animationDelay: `${index * 50}ms` 
                                                    }}
                                                >
                                                    <MixerStrip
                                                        track={track}
                                                        onUpdate={(updates) => handleTrackUpdate(index, updates)}
                                                        trackIndex={index}
                                                        selectedOutputChannel={trackOutputChannels[index] ?? 0}
                                                        onOutputChannelChange={(channel) => handleTrackOutputChannelChange(index, channel)}
                                                        maxChannels={maxOutputChannels}
                                                        level={trackLevels[index] ?? 0}
                                                        isDragging={snapshot.isDragging}
                                                        dragHandleProps={provided.dragHandleProps}
                                                        compact={compactMode}
                                                        pitchEnabled={trackPitchSettings[index] ?? true}
                                                        showPitchToggle={pitch !== 0}
                                                        onPitchEnabledChange={(enabled) => {
                                                            setTrackPitchSettings(prev => ({ ...prev, [index]: enabled }));
                                                            playerRef.current?.setTrackPitchEnabled(index, enabled);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </DragDropContext>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-background relative">
            {isLoadingTracks && (
                <div className="absolute inset-0 z-[80] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center px-6 gap-4">
                    <div className="bg-[hsl(0,0%,12%)] border border-[hsl(0,0%,22%)] rounded-xl p-5 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-3 justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-sm font-medium text-[hsl(0,0%,85%)]">
                                Preparing tracks...
                            </span>
                        </div>
                        <div className="w-full bg-[hsl(0,0%,16%)] rounded-full h-2 overflow-hidden border border-[hsl(0,0%,22%)]">
                            <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${Math.round(loadingProgress)}%` }}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 text-center">
                            {Math.round(loadingProgress)}% ready
                        </div>
                        {trackDownloadStatuses.length > 0 && (
                            <div className="mt-3 text-[11px] text-muted-foreground/80 text-center">
                                Caching multitracks locally. Please wait...
                            </div>
                        )}
                    </div>
                </div>
            )}
            {viewMode === 'waveform' ? (
                /* Waveform View - Standard layout */
                <>
                    {renderMainContent()}
                    
                    {/* Main Content Area - Waveform tracks */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col relative">
                                {isLoadingTracks && (
                                    <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center z-50 gap-4 p-8">
                                        <div className="max-w-2xl w-full space-y-4">
                                            <div className="bg-secondary border border-border rounded-lg p-6">
                                                <div className="flex items-center gap-3 mb-4 justify-center">
                                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                    <span className="text-sm font-medium">
                                                        Loading tracks...
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${loadingProgress}%` }}
                                                    />
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-2 text-center">
                                                    {Math.round(loadingProgress)}%
                                                </div>

                                                {/* Per-Track Download Status */}
                                                <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                                                    {trackDownloadStatuses.map((status, index) => (
                                                        <TrackDownloadIndicator
                                                            key={index}
                                                            status={status.status}
                                                            progress={status.progress}
                                                            trackName={tracks[index]?.name || tracks[index]?.filename || `Track ${index + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 overflow-auto p-6">
                                    {/* Download Status Panel */}
                                    {!isLoadingTracks && trackDownloadStatuses.length > 0 && (
                                        <DownloadStatusPanel
                                            trackStatuses={trackDownloadStatuses}
                                            trackNames={tracks.map((t: any) => t.name || t.filename || 'Track')}
                                            className="mb-4"
                                            playbackMode={playbackMode}
                                            onPlaybackModeChange={(mode) => {
                                                setPlaybackMode(mode);
                                                playerRef.current?.setMode(mode);
                                            }}
                                            onRetryTrack={(trackIndex) => playerRef.current?.retryFailedDownload(trackIndex)}
                                            onRetryAllFailed={() => playerRef.current?.retryAllFailed()}
                                            onStopDownload={() => playerRef.current?.pauseDownloads()}
                                            isDownloading={trackDownloadStatuses.some(s => s.status === 'downloading')}
                                        />
                                    )}

                                    {/* Global Audio Output Device Selector */}
                                    <div className="mb-4 p-4 bg-secondary rounded-lg border border-border">
                                        <label className="text-sm font-medium block mb-2">
                                            Global Audio Output Device
                                        </label>
                                        <select
                                            value={globalOutputDevice}
                                            onChange={(e) => handleGlobalOutputDeviceChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            disabled={isLoading || isLoadingTracks}
                                        >
                                            <option value="default">Default</option>
                                            {outputDevices.map((device) => (
                                                <option key={device.deviceId} value={device.deviceId}>
                                                    {device.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            This output device will be used for all tracks. Each track can still select its own output channel.
                                        </p>
                                    </div>

                                    {/* Waveform View */}
                                    <div className="space-y-4 relative">
                                        {/* Grid overlay for entire tracks area */}
                                        <div className="absolute inset-0 pointer-events-none z-0">
                                            <GridOverlay 
                                                duration={duration} 
                                                tempo={sequencer.tempo || 120} 
                                                timeSignature={sequencer.time_signature || '4/4'} 
                                            />
                                        </div>
                                        
                                        {tracks.map((track, index) => (
                                            <div
                                                key={index}
                                                className="bg-secondary rounded-lg border border-border overflow-hidden relative z-10"
                                            >
                                                <TrackControl
                                                    track={track}
                                                    onUpdate={(updates) =>
                                                        handleTrackUpdate(index, updates)
                                                    }
                                                    selectedOutputChannel={trackOutputChannels[index] ?? 0}
                                                    onOutputChannelChange={(channel) =>
                                                        handleTrackOutputChannelChange(
                                                            index,
                                                            channel
                                                        )
                                                    }
                                                    maxChannels={maxOutputChannels}
                                                />
                                                <div className="relative">
                                                    <WaveformPeaksDisplay
                                                        peaks={track.peaks || []}
                                                        currentTime={currentTime}
                                                        duration={duration || track.peaksDuration || 0}
                                                        onSeek={handleSeek}
                                                        color={track.color || 'hsl(215, 20%, 65%)'}
                                                        progressColor={track.color || 'hsl(215, 70%, 50%)'}
                                                        height={60}
                                                    />
                                                    {/* Playhead overlay for each track */}
                                                    <div
                                                        className="absolute inset-y-0 w-0.5 bg-primary pointer-events-none transition-all duration-75 ease-linear"
                                                        style={{
                                                            left: `${
                                                                duration
                                                                    ? (currentTime / duration) *
                                                                      100
                                                                    : 0
                                                            }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Mixer View - Improved layout with waveform clearly visible above mixer */
                <ResizablePanelGroup direction="vertical" className="flex-1">
                    {/* Top Panel - All main content (header, transport, control bar, waveform) */}
                    <ResizablePanel defaultSize={30} minSize={15}>
                        <div className="h-full flex flex-col overflow-hidden">
                            {renderMainContent()}
                        </div>
                    </ResizablePanel>
                    
                    {/* Resize Handle */}
                    <ResizableHandle 
                        withHandle 
                        className="bg-[hsl(0,0%,20%)] hover:bg-primary/50 transition-colors data-[panel-group-direction=vertical]:h-1"
                    />
                    
                    {/* Bottom Panel - Mixer */}
                    <ResizablePanel defaultSize={70} minSize={20}>
                        {renderMixerPanel()}
                    </ResizablePanel>
                </ResizablePanelGroup>
            )}

            {/* Edit/Add Marker Modal */}
            <AddMarkerDialog
                isOpen={!!editingMarker || showAddMarker}
                isEditing={!!editingMarker}
                markerForm={markerForm}
                setMarkerForm={setMarkerForm}
                availableSongSections={availableSongSections}
                onSave={handleSaveMarker}
                onCancel={handleCancelEdit}
                currentTime={currentTime}
                duration={duration}
            />
        </div>
    );
}
