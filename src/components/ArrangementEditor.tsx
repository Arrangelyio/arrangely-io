import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateSlug } from "@/utils/slugUtils";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Save,
    Eye,
    Share2,
    Download,
    Music,
    Trash2,
    Loader2,
} from "lucide-react";
import StepProgress from "./arrangement/StepProgress";
import SongDetailsStep from "./arrangement/SongDetailsStep";
import SectionsStep from "./arrangement/SectionsStep";
import ArrangementStep from "./arrangement/ArrangementStep";
import { useToast } from "@/hooks/use-toast";
import { transposeText } from "@/lib/transpose";
import { useUserRole } from "@/hooks/useUserRole";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { ValidationOverlay } from "./validation/ValidationOverlay";
// Remove import - using type assertions instead

interface Section {
    id: number;
    type: string;
    lyrics: string;
    chords: string;
    content: string;
}

interface MasterSection {
    lyrics: string;
    chords: string;
    timeSignature?: string;
}

interface MasterSections {
    [key: string]: MasterSection;
}

interface ImportedData {
    title: string;
    artist: string;
    key: string;
    tempo: number;
    timeSignature: string;
    masterSections: Record<string, { lyrics: string; chords: string }>;
    arrangementSections: Array<{
        id: number;
        type: string;
        lyrics: string;
        chords: string;
        content: string;
    }>;
    metadata: {
        confidence: number;
        duration: string;
        notes: string[];
        source: string;
    };
}

interface ArrangementEditorProps {
    importedData?: ImportedData | null;
    editingSongId?: string | null;
    fromRequestSongs?: boolean;
    requestId?: string | null;
}

const ArrangementEditor = ({
    importedData,
    editingSongId,
    fromRequestSongs = false,
    requestId = null,
}: ArrangementEditorProps) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { isUser } = useUserRole();

    // LocalStorage key for this arrangement session
    const STORAGE_KEY = `arrangement_draft_${
        editingSongId || requestId || "new"
    }`;

    // Helper functions for localStorage
    const loadFromStorage = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error("Error loading from localStorage:", error);
        }
        return null;
    };

    const saveToStorage = (data: any) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error("Error saving to localStorage:", error);
        }
    };

    const clearStorage = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Error clearing localStorage:", error);
        }
    };

    // Initialize state from localStorage or imported data
    const initializeState = () => {
        const stored = loadFromStorage();

        // If we have stored data and no imported data (page refresh scenario)
        if (stored && !editingSongId) {
            return {
                currentStep: stored.currentStep || 1,
                songData: stored.songData || {},
                masterSections: stored.masterSections || {},
                sections: stored.sections || [],
            };
        }

        // Default initialization with imported data
        return {
            currentStep: 1,
            songData: {
                title: importedData?.title || "",
                artist: importedData?.artist || "",
                key: importedData?.key || "C",
                tempo: importedData?.tempo?.toString() || "120",
                timeSignature: importedData?.timeSignature || "4/4",
                tags: "",
                serviceDate: "",
                youtubeLink: "",
                visibility: "private",
                sequencerDriveLink: "",
                sequencerPrice: "0",
                originalCreatorId: null as string | null,
                contributionType: "transcription",
            },
            masterSections:
                importedData?.masterSections &&
                Object.keys(importedData.masterSections).length > 0
                    ? importedData.masterSections
                    : importedData?.arrangementSections &&
                      importedData.arrangementSections.length > 0
                    ? (() => {
                          const sections: MasterSections = {};
                          importedData.arrangementSections.forEach(
                              (section) => {
                                  const sectionKey = section.type
                                      .toLowerCase()
                                      .replace(/\s+/g, "_");
                                  if (!sections[sectionKey]) {
                                      sections[sectionKey] = {
                                          lyrics: section.lyrics || "",
                                          chords: section.chords || "",
                                          timeSignature: "",
                                      };
                                  }
                              }
                          );
                          return sections;
                      })()
                    : {},
            sections: importedData?.arrangementSections || [],
        };
    };

    const initialState = initializeState();

    const [currentStep, setCurrentStep] = useState(initialState.currentStep);
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [isEditMode, setIsEditMode] = useState(!!editingSongId);
    const [songData, setSongData] = useState(initialState.songData);
    const [masterSections, setMasterSections] = useState<MasterSections>(
        initialState.masterSections
    );
    const [isSaving, setIsSaving] = useState(false); // Tambahkan ini
    const [sections, setSections] = useState<Section[]>(initialState.sections);
    
    // Validation overlay state
    const [showValidationOverlay, setShowValidationOverlay] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        allPassed: boolean;
        results?: Record<string, { passed: boolean; error?: string }>;
    } | null>(null);
    const [pendingSongId, setPendingSongId] = useState<string | null>(null);
    const [pendingRedirectTo, setPendingRedirectTo] = useState<string | null>(null);

    const [recentChords, setRecentChords] = useState<string[]>([]);

    // Show notification and skip to appropriate step based on imported data
    useEffect(() => {
        // Don't skip steps when coming from Request Songs flow - always start at step 1
        if (importedData && !editingSongId && !fromRequestSongs) {
            const hasStructure =
                importedData.arrangementSections &&
                importedData.arrangementSections.length > 0;
            const hasMasterSections =
                importedData.masterSections &&
                Object.keys(importedData.masterSections).length > 0;

            toast({
                title: "Analysis Data Loaded",
                description: `Successfully imported "${
                    importedData.title
                }" with ${
                    importedData.arrangementSections?.length || 0
                } sections (${
                    importedData.metadata?.confidence || 0
                }% confidence)`,
                duration: 1000,
            });

            // Skip to appropriate step based on available data
            if (hasStructure || hasMasterSections) {
                setCurrentStep(3); // Skip to arrangement step
            } else if (importedData.title && importedData.artist) {
                setCurrentStep(2); // Skip to sections step
            }
        }
    }, [importedData, editingSongId, fromRequestSongs, toast]);

    useEffect(() => {
        // Definisikan fungsi async di dalam untuk mengambil data
        const fetchSongForEditing = async () => {
            // Jika tidak ada ID lagu untuk diedit, hentikan fungsi
            if (!editingSongId) return;

            try {
                // Impor klien Supabase
                const { supabase } = await import(
                    "@/integrations/supabase/client"
                );

                // 1. Ambil detail lagu utama dari tabel 'songs'
                const { data: song, error: songError } = await supabase
                    .from("songs")
                    .select("*")
                    .eq("id", editingSongId)
                    .single();

                // Tangani jika ada error atau lagu tidak ditemukan
                if (songError) throw songError;
                if (!song) {
                    toast({
                        title: "Error",
                        description: "Song not found.",
                        variant: "destructive",
                        duration: 1000,
                    });
                    navigate("/"); // Arahkan kembali ke home jika lagu tidak ada
                    return;
                }

                // 2. Perbarui state `songData` dengan data yang ada dari database
                if (!song) {
                    throw new Error("Song not found");
                }

                setSongData({
                    title: (song as any).title || "",
                    artist: (song as any).artist || "",
                    key: (song as any).current_key || "C",
                    slug: (song as any).slug,
                    tempo: (song as any).tempo?.toString() || "120",
                    timeSignature: (song as any).time_signature || "4/4",
                    tags: (song as any).tags?.join(", ") || "",
                    serviceDate: "", // Anda bisa memuat ini juga jika disimpan di DB
                    youtubeLink: (song as any).youtube_link || "",
                    // SOLUSI UTAMA: Set visibilitas berdasarkan data `is_public`
                    visibility: (song as any).is_public ? "public" : "private",
                    sequencerDriveLink:
                        (song as any).sequencer_drive_link || "",
                    sequencerPrice: (song as any).sequencer_price
                        ? (song as any).sequencer_price.toString()
                        : "0",
                    originalCreatorId:
                        (song as any).original_creator_id || null,
                    contributionType:
                        (song as any).contribution_type || "transcription",
                });

                // 3. Ambil semua 'master sections' dari tabel 'song_sections'
                const {
                    data: fetchedMasterSections,
                    error: masterSectionsError,
                } = await supabase
                    .from("song_sections")
                    .select("*")
                    .eq("song_id", editingSongId)
                    .order("id", { ascending: true });

                if (masterSectionsError) throw masterSectionsError;

                // Ubah array data menjadi objek yang sesuai dengan state `masterSections`
                const masterSectionsObject: MasterSections = {};
                fetchedMasterSections?.forEach((s: any) => {
                    masterSectionsObject[s.section_type] = {
                        lyrics: s.lyrics || "",
                        chords: s.chords || "",
                        timeSignature: s.section_time_signature || "",
                    };
                });
                setMasterSections(masterSectionsObject);

                // 4. Ambil urutan aransemen dari tabel 'arrangements'
                // Kita juga mengambil data terkait dari 'song_sections' menggunakan join
                const { data: fetchedArrangement, error: arrangementError } =
                    await supabase
                        .from("arrangements")
                        .select(
                            `
                position,
                section_id,
                song_sections!inner ( * )
            `
                        )
                        .eq("song_id", editingSongId)
                        .order("position", { ascending: true });

                if (arrangementError) throw arrangementError;

                // B. Ambil semua Song Sections (termasuk yang mungkin belum masuk ke arrangement/timeline)
                const { data: allSections, error: sectionsError } =
                    await supabase
                        .from("song_sections")
                        .select("*")
                        .eq("song_id", editingSongId);

                if (sectionsError) throw sectionsError;

                // [!code ++] LOGIKA SORTING BERDASARKAN POSISI ARRANGEMENT
                if (allSections) {
                    // 1. Buat Map: Section ID -> Posisi Pertama Muncul
                    const positionMap = new Map();
                    fetchedArrangement?.forEach((arr: any) => {
                        // Kita hanya butuh posisi pertama kali muncul
                        if (!positionMap.has(arr.section_id)) {
                            positionMap.set(arr.section_id, arr.position);
                        }
                    });

                    // 2. Sort Master Sections berdasarkan posisi tersebut
                    allSections.sort((a: any, b: any) => {
                        // Ambil posisi. Jika tidak ada di arrangement, kasih nilai besar (9999) biar di bawah
                        const posA = positionMap.get(a.id) ?? 9999;
                        const posB = positionMap.get(b.id) ?? 9999;

                        // Jika posisinya beda, urutkan berdasarkan posisi (kecil ke besar)
                        if (posA !== posB) return posA - posB;

                        // [FALLBACK] Jika sama-sama tidak punya posisi (Unused sections),
                        // atau posisi sama (mustahil), gunakan Logika Musik sebagai cadangan
                        const getWeight = (type: string) => {
                            const t = type.toLowerCase();
                            if (t.includes("intro")) return 1;
                            if (t.includes("verse")) return 2;
                            if (t.includes("chorus")) return 3;
                            if (t.includes("bridge")) return 4;
                            if (t.includes("interlude")) return 5;
                            if (t.includes("inst")) return 6;
                            if (t.includes("outro")) return 10;
                            return 8;
                        };
                        return (
                            getWeight(a.section_type) -
                            getWeight(b.section_type)
                        );
                    });

                    // 3. Masukkan ke State Master Sections (Object akan merender sesuai urutan insertion array di atas)
                    const masterSectionsObject: MasterSections = {};
                    allSections.forEach((s: any) => {
                        masterSectionsObject[s.section_type] = {
                            lyrics: s.lyrics || "",
                            chords: s.chords || "",
                            timeSignature: s.section_time_signature || "",
                        };
                    });
                    setMasterSections(masterSectionsObject);
                }

                // [!code ++] STEP 4: Set State Arrangement (Timeline)
                // Kita bisa reuse data 'fetchedArrangement' yang sudah diambil di atas
                const arrangementSections: Section[] =
                    fetchedArrangement?.map((a: any, index) => ({
                        id: index + 1,
                        type: a.song_sections?.section_type || "",
                        lyrics: a.song_sections?.lyrics || "",
                        chords: a.song_sections?.chords || "",
                        // Gunakan notes dari arrangement, fallback ke lyrics master
                        content: a.notes || a.song_sections?.lyrics || "",
                    })) || [];

                setSections(arrangementSections);

                // 5. Beri feedback ke pengguna dan atur UI
                setCurrentStep(1);
                toast({
                    title: "Editing Mode 📝",
                    description: `Successfully loaded "${
                        (song as any).title
                    }" for editing.`,
                    duration: 1000,
                });
            } catch (error) {
                console.error("Failed to fetch song for editing:", error);
                toast({
                    title: "Failed to load song",
                    description:
                        "There was an error loading the song data. Please try again.",
                    variant: "destructive",
                    duration: 1000,
                });
            }
        };

        // Panggil fungsi yang sudah kita definisikan
        fetchSongForEditing();

        // Dependency array: Hook ini akan berjalan kembali jika salah satu dari nilai ini berubah.
    }, [editingSongId, navigate, toast]);

    // Auto-save to localStorage whenever state changes (but not for edit mode)
    useEffect(() => {
        if (!editingSongId) {
            const dataToSave = {
                currentStep,
                songData,
                masterSections,
                sections,
                requestId,
                timestamp: Date.now(),
            };
            saveToStorage(dataToSave);
        }
    }, [
        currentStep,
        songData,
        masterSections,
        sections,
        requestId,
        editingSongId,
    ]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            if (!editingSongId) {
                const dataToSave = {
                    currentStep,
                    songData,
                    masterSections,
                    sections,
                    requestId,
                    timestamp: Date.now(),
                };
                saveToStorage(dataToSave);
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [
        currentStep,
        songData,
        masterSections,
        sections,
        requestId,
        editingSongId,
    ]);

    // Show restoration notification if data was loaded from localStorage
    useEffect(() => {
        const stored = loadFromStorage();
        if (stored && !importedData && !editingSongId) {
            const savedTime = new Date(stored.timestamp).toLocaleTimeString();
            toast({
                title: "Draft Restored",
                description: `Your arrangement draft from ${savedTime} has been restored. Continue where you left off!`,
                duration: 1000,
            });
        }
    }, []);

    const updateMasterSection = (
        type: string,
        field: "lyrics" | "chords" | "timeSignature",
        value: string
    ) => {
        setMasterSections((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value,
            },
        }));
    };

    const deleteMasterSection = (type: string) => {
        setMasterSections((prev) => {
            const newSections = { ...prev };
            delete newSections[type];
            return newSections;
        });
    };

    const addSectionFromMaster = (type: string) => {
        const masterSection = masterSections[type];
        if (
            masterSection &&
            (masterSection.lyrics.trim() || masterSection.chords.trim())
        ) {
            const newSection: Section = {
                id: Date.now(),
                type,
                lyrics: masterSection.lyrics,
                chords: masterSection.chords,
                content: masterSection.lyrics,
            };
            setSections([...sections, newSection]);
        }
    };

    const removeSection = (id: number) => {
        setSections(sections.filter((section) => section.id !== id));
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 1:
                return "Song Information";
            case 2:
                return "Sections & Content";
            case 3:
                return "Arrangement";
            default:
                return "";
        }
    };

    const handleSave = async (redirectTo?: string) => {
        // Check if arrangement is empty
        if (sections.length === 0) {
            toast({
                title: "Add Sections First",
                description:
                    "Please add sections to your arrangement before saving. Go to Step 3 and click the +Intro, +Verse, or +Chorus buttons.",
                variant: "destructive",
                duration: 1000,
            });
            return;
        }
        if (isSaving) return;

        setIsSaving(true);

        try {
            const { supabase } = await import("@/integrations/supabase/client");

            // Check if user is authenticated
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to save your arrangement.",
                    variant: "destructive",
                    duration: 1000,
                });
                return;
            }

            if (!isEditMode && !editingSongId) {
                const { data: canAdd } = await supabase.rpc(
                    "validate_arrangement_limit",
                    {
                        user_id_param: user.id,
                    }
                );

                if (!canAdd) {
                    toast({
                        title: "Limit Reached",
                        description:
                            "Arrangement limit reached. Upgrade your subscription for more space",
                        variant: "destructive",
                    });
                    return;
                }
            }

            // Helper function to normalize section type for comparison
            const normalizeSectionType = (type: string) => {
                return type
                    .toLowerCase()
                    .replace(/\s+/g, "")
                    .replace(/\d+/g, "");
            };

            let savedSong;

            if (isEditMode && editingSongId) {
                const isActuallyPublic = songData.visibility === "public";
                // Update existing song
                const { data: updatedSong, error: updateError } = await supabase
                    .from("songs")
                    .update({
                        title: songData.title || "Untitled Song",
                        artist: songData.artist || null,
                        current_key: songData.key as any,
                        original_key: songData.key as any,
                        tempo: parseInt(songData.tempo) || 120,
                        time_signature: songData.timeSignature as any,
                        slug: songData.slug,
                        tags: songData.tags
                            ? songData.tags.split(",").map((tag) => tag.trim())
                            : null,
                        notes:
                            importedData?.metadata?.notes?.join("\n") || null,
                        // IMPORTANT: Always save as private initially if user wants public
                        // Validation will set is_public = true if it passes
                        // is_public: false,
                        is_public: isActuallyPublic,
                        youtube_link: songData.youtubeLink || null,
                        sequencer_drive_link:
                            songData.sequencerDriveLink || null,
                        sequencer_price: songData.sequencerPrice
                            ? parseInt(songData.sequencerPrice)
                            : 0,
                        contribution_type: songData.contributionType,
                    })
                    .eq("id", editingSongId)
                    .eq("user_id", user.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                savedSong = updatedSong as any;

                // Delete existing sections and arrangements for this song
                const deleteArrangements = await supabase
                    .from("arrangements")
                    .delete()
                    .eq("song_id", editingSongId);
                await supabase
                    .from("song_sections")
                    .delete()
                    .eq("song_id", editingSongId);
            } else {
                // Get user profile for creator_type
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("creator_type, display_name")
                    .eq("user_id", user.id)
                    .single();

                // Determine created_sign based on creator_type
                let createdSign = "Arrangely"; // default
                if (
                    ((profile as any)?.creator_type === "creator_professional" || (profile as any)?.creator_type === "creator_pro") &&
                    (profile as any)?.display_name
                ) {
                    createdSign = (profile as any).display_name;
                }

                // Create new song
                const { data: newSong, error: songError } = await supabase
                    .from("songs")
                    .insert({
                        title: songData.title || "Untitled Song",
                        artist: songData.artist || null,
                        current_key: songData.key as any,
                        original_key: songData.key as any,
                        tempo: parseInt(songData.tempo) || 120,
                        time_signature: songData.timeSignature as any,
                        tags: songData.tags
                            ? songData.tags.split(",").map((tag) => tag.trim())
                            : null,
                        notes:
                            importedData?.metadata?.notes?.join("\n") || null,
                        user_id: user.id,
                        created_sign: createdSign,
                        // IMPORTANT: Always save as private initially if user wants public
                        // Validation will set is_public = true if it passes
                        is_public: false,
                        youtube_link: songData.youtubeLink || null,
                        sequencer_drive_link:
                            songData.sequencerDriveLink || null,
                        sequencer_price: songData.sequencerPrice
                            ? parseInt(songData.sequencerPrice)
                            : 0,
                        contribution_type: songData.contributionType,
                    })
                    .select()
                    .single();

                if (songError) throw songError;
                savedSong = newSong;
            }

            // Save song sections (from step 2)
            if (Object.keys(masterSections).length > 0) {
                const sectionsToInsert = Object.entries(masterSections).map(
                    ([type, section]) => ({
                        song_id: savedSong.id,
                        section_type: type, // Keep original dynamic type
                        lyrics: section.lyrics || null,
                        chords: section.chords || null,
                        section_time_signature: section.timeSignature || null,
                        name:
                            type.charAt(0).toUpperCase() +
                            type.slice(1).replace(/_/g, " "),
                    })
                );

                const { error: sectionsError } = await supabase
                    .from("song_sections")
                    .insert(sectionsToInsert);

                if (sectionsError) throw sectionsError;
            }

            // Save arrangement (from step 3)
            if (sections.length > 0) {
                // Get the master section IDs we just created
                const { data: masterSectionsData } = await supabase
                    .from("song_sections")
                    .select("id, section_type, name")
                    .eq("song_id", savedSong.id);

                // Create specific sections for each arrangement item that might be variations
                const sectionsToCreate = [];
                const arrangementMappings = [];

                for (let i = 0; i < sections.length; i++) {
                    const section = sections[i];

                    // Check if this is a unique section name that needs its own database entry
                    const sectionName =
                        section.type.charAt(0).toUpperCase() +
                        section.type.slice(1).replace(/_/g, " ");
                    const isUniqueSection = !masterSectionsData?.some(
                        (ms: any) =>
                            ms.name?.toLowerCase() ===
                                sectionName.toLowerCase() &&
                            ms.section_type === section.type
                    );

                    if (isUniqueSection && masterSections[section.type]) {
                        // Create a new section for this specific arrangement item
                        sectionsToCreate.push({
                            song_id: savedSong.id,
                            section_type: section.type, // Keep original dynamic type
                            lyrics: masterSections[section.type].lyrics || null,
                            chords: masterSections[section.type].chords || null,
                            name: sectionName,
                        });

                        arrangementMappings.push({
                            position: i + 1,
                            sectionType: section.type,
                            sectionName: sectionName,
                            needsNewSection: true,
                            notes: section.content || null,
                        });
                    } else {
                        // Use existing master section - match by original section_type
                        const matchingSection = masterSectionsData?.find(
                            (s: any) => s.section_type === section.type
                        );

                        arrangementMappings.push({
                            position: i + 1,
                            sectionId: (matchingSection as any)?.id,
                            needsNewSection: false,
                            notes: section.content || null,
                        });
                    }
                }

                // Insert new sections if needed
                let newSections = [];
                if (sectionsToCreate.length > 0) {
                    const { data: createdSections, error: newSectionsError } =
                        await supabase
                            .from("song_sections")
                            .insert(sectionsToCreate)
                            .select("id, section_type, name");

                    if (newSectionsError) throw newSectionsError;
                    newSections = createdSections || [];
                }

                // Create arrangements with proper section mapping
                const arrangementsToInsert = arrangementMappings.map(
                    (mapping) => {
                        let sectionId = mapping.sectionId;

                        if (mapping.needsNewSection) {
                            // Find the newly created section for this mapping
                            const newSection = newSections.find(
                                (ns) =>
                                    ns.section_type === mapping.sectionType &&
                                    ns.name === mapping.sectionName
                            );
                            sectionId = newSection?.id;
                        }

                        return {
                            song_id: savedSong.id,
                            section_id: sectionId,
                            position: mapping.position,
                            notes: mapping.notes,
                            repeat_count: 1,
                        };
                    }
                );

                const { error: arrangementsError } = await supabase
                    .from("arrangements")
                    .insert(arrangementsToInsert);

                if (arrangementsError) throw arrangementsError;
            }

            // Log activity
            await supabase.from("song_activity").insert({
                user_id: user.id,
                song_id: savedSong.id,
                activity_type: "created",
            });

            // Clear localStorage draft since arrangement was saved successfully
            clearStorage();

            // If user wants to publish (visibility = public), trigger validation workflow
            const wantsToPublish = !isUser && songData.visibility === "public";
            
            if (wantsToPublish) {
                // Show the beautiful validation overlay
                setValidationResult(null);
                setShowValidationOverlay(true);
                setPendingSongId(savedSong.id);
                setPendingRedirectTo(redirectTo);

                try {
                    // Check for existing publication (might be rejected and needs re-validation)
                    const { data: existingPub } = await supabase
                        .from('creator_pro_publications')
                        .select('id, status')
                        .eq('song_id', savedSong.id)
                        .single();

                    let publicationId: string | null = null;

                    if (existingPub) {
                        // If rejected, reset for re-validation
                        if (existingPub.status === 'rejected') {
                            await supabase
                                .from('creator_pro_publications')
                                .update({
                                    status: 'pending_review',
                                    rejected_reason: null,
                                    validation_results: null,
                                    review_notes: null,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existingPub.id);

                            // Delete old validation queue entries
                            await supabase
                                .from('content_validation_queue')
                                .delete()
                                .eq('publication_id', existingPub.id);

                            publicationId = existingPub.id;
                        } else {
                            // Already pending_review or active, close overlay and show toast
                            setShowValidationOverlay(false);
                            toast({
                                title: "Arrangement Saved",
                                description: "Changes saved. Publication is already in review.",
                                duration: 3000,
                            });
                            
                            // Navigate after saving
                            if (redirectTo === "livePreview") {
                                navigate(`/live-preview/${savedSong.id}/${savedSong.slug}`);
                            } else {
                                navigate(`/arrangement/${savedSong.id}/${savedSong.slug}`);
                            }
                            return savedSong.id;
                        }
                    } else {
                        // Create new publication record
                        const { data: publication, error: pubError } = await supabase
                            .from('creator_pro_publications')
                            .insert({
                                user_id: user.id,
                                song_id: savedSong.id,
                                status: 'pending_review'
                            })
                            .select()
                            .single();

                        if (pubError) {
                            throw pubError;
                        }
                        publicationId = publication?.id || null;
                    }

                    if (publicationId) {
                        // Create validation queue entries
                        const validationTypes = ['youtube', 'sections', 'chords', 'content'];
                        await supabase
                            .from('content_validation_queue')
                            .insert(validationTypes.map(type => ({
                                publication_id: publicationId,
                                song_id: savedSong.id,
                                validation_type: type,
                                status: 'pending'
                            })));

                        // Trigger validation edge function
                        const { data: validationData, error: funcError } = await supabase.functions.invoke('validate-song-publication', {
                            body: { publicationId: publicationId, songId: savedSong.id }
                        });

                        if (funcError) {
                            console.error('Validation function error:', funcError);
                            setShowValidationOverlay(false);
                            toast({
                                title: "Validation service unavailable",
                                description: "Your arrangement was saved but publication review is delayed.",
                                variant: "destructive",
                                duration: 5000,
                            });
                        } else {
                            // Set the validation result to show in overlay
                            setValidationResult({
                                allPassed: validationData?.allPassed ?? false,
                                results: validationData?.results || {}
                            });
                        }
                    }
                } catch (pubError) {
                    console.error('Publication error:', pubError);
                    setShowValidationOverlay(false);
                    toast({
                        title: "Arrangement saved",
                        description: "Saved as private. Publication validation failed.",
                        variant: "destructive",
                        duration: 3000,
                    });
                }
                
                return savedSong.id;
            } else {
                toast({
                    title: "Arrangement Saved Successfully!",
                    description: `"${savedSong.title}" has been added to your library.`,
                    duration: 1000,
                });
            }

            // Check redirect destination
            if (redirectTo === "livePreview") {
                // Redirect to live preview page
                navigate(`/live-preview/${savedSong.id}/${savedSong.slug}`);
            } else {
                // Redirect to song details page
                navigate(`/arrangement/${savedSong.id}/${savedSong.slug}`);
            }

            return savedSong.id;
        } catch (error) {
            console.error("Save error:", error);
            toast({
                title: "Save Failed",
                description:
                    "There was an error saving your arrangement. Please try again.",
                variant: "destructive",
                duration: 1000,
            });
        } finally {
            // Selalu hentikan loader, baik sukses maupun gagal
            setIsSaving(false);
        }
    };

    const handleLivePreview = async () => {
        try {
            const { supabase } = await import("@/integrations/supabase/client");

            // Check if user is authenticated
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to use live preview.",
                    variant: "destructive",
                    duration: 1000,
                });
                return;
            }

            // Save the arrangement first and get the song ID
            const songId = await handleSave("livePreview");
        } catch (error) {
            console.error("Live preview error:", error);
            toast({
                title: "Preview Failed",
                description:
                    "There was an error opening live preview. Please try again.",
                variant: "destructive",
                duration: 1000,
            });
        }
    };

    // Handle transpose functionality for all sections
    const handleTranspose = (newKey: string, preferSharps: boolean) => {
        const oldKey = songData.key;

        // Update song key
        setSongData((prev) => ({ ...prev, key: newKey }));

        // Transpose all master sections
        const transposedMasterSections: MasterSections = {};
        Object.entries(masterSections).forEach(([type, section]) => {
            transposedMasterSections[type] = {
                lyrics: transposeText(
                    section.lyrics,
                    oldKey,
                    newKey,
                    preferSharps // Menggunakan nilai yang benar
                ),
                chords: transposeText(
                    section.chords,
                    oldKey,
                    newKey,
                    preferSharps // Menggunakan nilai yang benar
                ),
                timeSignature: section.timeSignature || "",
            };
        });
        setMasterSections(transposedMasterSections);

        // Transpose all arrangement sections
        const transposedSections = sections.map((section) => ({
            ...section,
            lyrics: transposeText(section.lyrics, oldKey, newKey, preferSharps),
            chords: transposeText(section.chords, oldKey, newKey, preferSharps),
            content: transposeText(
                section.content,
                oldKey,
                newKey,
                preferSharps
            ),
        }));
        setSections(transposedSections);

        toast({
            title: "Transpose Complete",
            description: `Successfully transposed from ${oldKey} to ${newKey}. All sections updated.`,
            duration: 1000,
        });
    };

    const handleExport = () => {
        const exportData = {
            songData,
            masterSections,
            sections,
            exportedAt: new Date().toISOString(),
            metadata: importedData?.metadata,
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${songData.title || "arrangement"}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Arrangement Exported",
            description: "Your arrangement has been downloaded as a JSON file.",
            duration: 1000,
        });
    };

    const handleClearDraft = () => {
        clearStorage();
        // Reset to initial state
        setCurrentStep(1);
        setSongData({
            title: "",
            artist: "",
            key: "C",
            tempo: "120",
            timeSignature: "4/4",
            tags: "",
            serviceDate: "",
            youtubeLink: "",
            visibility: "private",
            sequencerDriveLink: "",
            sequencerPrice: "0",
            originalCreatorId: null,
        });
        setMasterSections({});
        setSections([]);

        toast({
            title: "Draft Cleared",
            description:
                "Your arrangement draft has been cleared. Starting fresh!",
            duration: 1000,
        });
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <SongDetailsStep
                        songData={songData}
                        setSongData={setSongData}
                        fromRequestSongs={fromRequestSongs}
                    />
                );
            case 2:
                return (
                    <SectionsStep
                        masterSections={masterSections}
                        updateMasterSection={updateMasterSection}
                        deleteMasterSection={deleteMasterSection}
                        renameMasterSection={renameMasterSection}
                        currentKey={songData.key}
                        recentChords={recentChords}
                        onRecentChordsChange={setRecentChords}
                    />
                );
            case 3:
                return (
                    <ArrangementStep
                        masterSections={masterSections}
                        sections={sections}
                        addSectionFromMaster={addSectionFromMaster}
                        removeSection={removeSection}
                        currentKey={songData.key}
                        songData={songData}
                        onTranspose={handleTranspose}
                        onLivePreview={handleLivePreview}
                        onExport={handleExport}
                        onSave={() => handleSave()}
                    />
                );
            default:
                return null;
        }
    };

    const renameMasterSection = (oldName: string, newName: string) => {
        setMasterSections((prev) => {
            const newMaster = { ...prev };
            const sectionData = newMaster[oldName];
            if (sectionData) {
                delete newMaster[oldName];
                newMaster[newName] = sectionData;
            }
            return newMaster;
        });

        setSections((prevSections) =>
            prevSections.map((section) =>
                section.type === oldName
                    ? { ...section, type: newName }
                    : section
            )
        );
    };

    return (
        <div className="min-h-screen bg-gradient-sanctuary pt-28 sm:pt-24 pb-8 sm:pb-10">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        {/* Hide Back to Home link in mobile view */}
                        {/* {!new URLSearchParams(window.location.search).get(
                            "isMobile"
                        ) && (
                            <Link to="/">
                                <Button variant="outline" className="mb-4">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Home
                                </Button>
                            </Link>
                        )} */}

                        {/* Clear Draft Button - Only show for new arrangements with saved data */}
                        {!editingSongId &&
                            !importedData &&
                            loadFromStorage() && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearDraft}
                                    className="mb-4 text-destructive hover:text-destructive border-destructive hover:border-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear Draft
                                </Button>
                            )}

                        {/* {isEditMode && (
                            <div className="flex items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    className="animate-pulse"
                                >
                                    <Music className="h-3 w-3 mr-1" />
                                    Edit Mode
                                </Badge>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditMode(false)}
                                    size="sm"
                                >
                                    Exit Edit Mode
                                </Button>
                            </div>
                        )} */}
                    </div>

                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 mt-2 break-words px-2 leading-tight">
                            {songData.title || "New Arrangement"}
                            {isEditMode && (
                                <span className="text-lg ml-2 text-muted-foreground inline-block">
                                    (Editing)
                                </span>
                            )}
                        </h1>
                        {songData.artist && (
                            <p className="text-muted-foreground">
                                by {songData.artist}
                            </p>
                        )}
                        {importedData?.metadata && (
                            <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                <p>
                                    {isEditMode
                                        ? "Editing Existing Song"
                                        : "Imported Analysis"}{" "}
                                    •{importedData.metadata.duration} •
                                    {importedData.metadata.confidence}%
                                    confidence
                                </p>
                                <p className="text-xs">
                                    Master Sections:{" "}
                                    {Object.keys(masterSections).length} |
                                    Arrangement: {sections.length} sections
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <StepProgress
                    currentStep={currentStep}
                    totalSteps={3}
                    getStepTitle={getStepTitle}
                />

                {/* Main Content */}
                <div className="mt-8">{renderStepContent()}</div>

                {/* Navigation */}
                <Card className="mt-8 shadow-lg">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex justify-between items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setCurrentStep(Math.max(1, currentStep - 1))
                                }
                                disabled={currentStep === 1}
                            >
                                Previous
                            </Button>

                            <div className="text-sm text-muted-foreground">
                                Step {currentStep} of 3
                            </div>

                            {currentStep === 3 ? (
                                <Button
                                    onClick={() => handleSave()}
                                    disabled={sections.length === 0 || isSaving}
                                    className={`bg-gradient-worship hover:opacity-90 ${
                                        sections.length === 0 || isSaving
                                            ? "opacity-50 cursor-not-allowed"
                                            : ""
                                    }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {isEditMode
                                                ? "Updating..."
                                                : "Saving..."}
                                        </>
                                    ) : (
                                        <>
                                            {!isEditMode && (
                                                <Save className="h-4 w-4 mr-2" />
                                            )}
                                            {isEditMode ? "Update" : "Save"}
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() =>
                                        setCurrentStep(
                                            Math.min(3, currentStep + 1)
                                        )
                                    }
                                    disabled={currentStep === 3}
                                    className="bg-gradient-worship hover:opacity-90"
                                >
                                    Next
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* AI Validation Overlay */}
            <ValidationOverlay 
                isOpen={showValidationOverlay}
                validationResult={validationResult}
                onComplete={(success) => {
                    setShowValidationOverlay(false);
                    
                    // Navigate after validation completes
                    if (pendingSongId) {
                        const slug = songData.slug || generateSlug(songData.title);
                        if (pendingRedirectTo === "livePreview") {
                            navigate(`/live-preview/${pendingSongId}/${slug}`);
                        } else {
                            navigate(`/arrangement/${pendingSongId}/${slug}`);
                        }
                    }
                    
                    // Reset pending state
                    setPendingSongId(null);
                    setPendingRedirectTo(null);
                }}
            />
        </div>
    );
};

export default ArrangementEditor;
