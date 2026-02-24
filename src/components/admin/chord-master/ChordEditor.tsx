import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChordMetadataForm from "./ChordMetadataForm";
import GuitarVoicingEditor from "./GuitarVoicingEditor";
import PianoVoicingEditor from "./PianoVoicingEditor";
import {
    generateChordName,
    calculateChordFormula,
    calculateChordNotes,
    validateChordNotes,
    parseFormulaString,
    formulaToString,
} from "@/lib/chordTheory";
import ValidationAlert from "./ValidationAlert";

interface ChordData {
    id?: string;
    chord_name: string;
    root_note: string;
    quality: string;
    bass_note?: string;
    instrument: "guitar" | "piano" | "both";
    status: "draft" | "approved" | "deprecated";
    enharmonics: string[];
    guitar_fingering: (number | "x")[];
    guitar_chord_shape: string;
    guitar_difficulty: number;
    piano_notes: string[];
    piano_fingering: string;
    piano_hand: "left" | "right" | "both";
    notes: string;
    usage_count: number;
    formula?: string;
}

interface ChordEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chordId?: string;
    prefilledData?: Partial<ChordData>;
    onSave?: (savedChordId?: string, chordData?: ChordData) => void;
}

const ChordEditor = ({
    open,
    onOpenChange,
    chordId,
    prefilledData,
    onSave,
}: ChordEditorProps) => {
    const [chordData, setChordData] = useState<ChordData>({
        chord_name: "",
        root_note: "C",
        quality: "maj",
        bass_note: undefined,
        instrument: "both",
        status: "draft",
        enharmonics: [],
        guitar_fingering: [0, 0, 0, 0, 0, 0],
        guitar_chord_shape: "",
        guitar_difficulty: 1,
        piano_notes: [],
        piano_fingering: "",
        piano_hand: "both",
        notes: "",
        usage_count: 0,
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(
        null
    );

    useEffect(() => {
        if (chordId && open) {
            fetchChordData();
        } else if (!chordId && open) {
            // Reset form for new chord or apply prefilled data
            const newChordData = {
                chord_name: prefilledData?.chord_name || "",
                root_note: prefilledData?.root_note || "C",
                quality: prefilledData?.quality || "maj",
                bass_note: prefilledData?.bass_note || undefined,
                instrument: prefilledData?.instrument || "both",
                status: prefilledData?.status || "draft",
                enharmonics: [],
                guitar_fingering: [0, 0, 0, 0, 0, 0],
                guitar_chord_shape: "",
                guitar_difficulty: 1,
                piano_notes: [],
                piano_fingering: "",
                piano_hand: "both" as const,
                notes: "",
                usage_count: 0,
            };
            setChordData(newChordData);
        }
    }, [chordId, open]);

    // Auto-generate chord name when root, quality, or bass note changes
    useEffect(() => {
        if (chordData.root_note && chordData.quality) {
            let generatedName = chordData.chord_name;

            // Add bass note for slash chords
            if (
                chordData.bass_note &&
                chordData.bass_note !== chordData.root_note
            ) {
                generatedName += `/${chordData.bass_note}`;
            }

            // Use custom formula if available, otherwise use quality formula
            let formula, notes;
            if (chordData.formula) {
                // Use custom formula
                const intervals = parseFormulaString(chordData.formula);
                notes = calculateChordNotes(chordData.root_note, intervals);
                formula = chordData.formula;
            } else {
                // Use default quality formula
                const intervalFormula = calculateChordFormula(
                    chordData.quality
                );
                notes = calculateChordNotes(
                    chordData.root_note,
                    intervalFormula
                );
                formula = formulaToString(intervalFormula);
            }

            setChordData((prev) => ({
                ...prev,
                chord_name: generatedName,
                notes: notes.join(", "),
                formula: formula,
            }));

            // Check for duplicates
            checkForDuplicates(
                chordData.root_note,
                chordData.quality,
                chordData.instrument
            );
        }
    }, [
        chordData.root_note,
        chordData.quality,
        chordData.bass_note,
        chordData.instrument,
        chordData.formula,
    ]);

    const checkForDuplicates = async (
        rootNote: string,
        quality: string,
        instrument: string
    ) => {
        try {
            const { data, error } = await supabase
                .from("master_chords")
                .select("id, chord_name")
                .eq("root_note", rootNote)
                .eq("quality", quality)
                .eq("instrument", instrument)
                .neq("status", "deprecated")
                .neq("id", chordId || "");

            if (error) throw error;

            if (data && data.length > 0) {
                const chordName = (data[0] as any).chord_name;
                setDuplicateWarning(
                    `Similar chord "${chordName}" already exists`
                );
            } else {
                setDuplicateWarning(null);
            }
        } catch (error) {
            console.error("Error checking duplicates:", error);
        }
    };

    const fetchChordData = async () => {
        if (!chordId) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("master_chords")
                .select("*")
                .eq("id", chordId)
                .single();

            if (error) throw error;
            if (data) {
                const record = data as any;
                const parsedFingering = (record.guitar_fingering || []).map((f: any) =>
                    f === "x" ? "x" : parseInt(f, 10)
                );
                setChordData({
                    id: record.id,
                    chord_name: record.chord_name || "",
                    root_note: record.root_note || "C",
                    quality: record.quality || "maj",
                    bass_note: record.bass_note || undefined,
                    instrument: record.instrument || "both",
                    status: record.status || "draft",
                    enharmonics: record.enharmonics || [],
                    guitar_fingering: parsedFingering.length
                    ? parsedFingering
                    : [0, 0, 0, 0, 0, 0],
                    guitar_chord_shape: record.guitar_chord_shape || "",
                    guitar_difficulty: record.guitar_difficulty || 1,
                    piano_notes: record.piano_notes || [],
                    piano_fingering: record.piano_fingering || "",
                    piano_hand:
                        (record.piano_hand as "left" | "right" | "both") ||
                        "both",
                    notes: record.notes || "",
                    usage_count: record.usage_count || 0,
                    formula: record.formula || "",
                });
            }
        } catch (error) {
            console.error("Error fetching chord:", error);
            toast.error("Failed to load chord data");
        } finally {
            setLoading(false);
        }
    };

    const validateChord = () => {
        const errors = [];

        // Basic validation
        if (!chordData.chord_name.trim()) {
            errors.push("Chord name is required");
        }

        if (!chordData.root_note) {
            errors.push("Root note is required");
        }

        if (!chordData.quality) {
            errors.push("Quality is required");
        }

        // Validate voicing notes against chord formula
        if (
            chordData.guitar_fingering.some(
                (f) => typeof f === "number" && f > 0
            ) ||
            chordData.piano_notes.length > 0
        ) {
            const validation = validateChordNotes(
                chordData.root_note,
                chordData.quality,
                chordData.piano_notes.concat(
                    chordData.guitar_fingering.map(
                        (_, index) => `String${index}`
                    )
                )
            );

            if (!validation.isValid && validation.extraNotes.length > 0) {
                errors.push(
                    `Warning: Voicing contains notes outside chord formula: ${validation.extraNotes.join(
                        ", "
                    )}`
                );
            }
        }

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSave = async (approve = false) => {
        // if (!validateChord() && !approve) {
        //     toast.error("Please fix validation errors before saving");
        //     return;
        // }

        setSaving(true);
        try {
            const saveData = {
                ...chordData,
                status: approve ? "approved" : chordData.status,
                updated_at: new Date().toISOString(),
            };

            let result;
            if (chordId) {
                result = await supabase
                    .from("master_chords")
                    .update(saveData)
                    .eq("id", chordId)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from("master_chords")
                    .insert(saveData)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            const savedChordId = chordId || result.data?.id;
            toast.success(
                approve
                    ? "Chord approved successfully"
                    : "Chord saved successfully"
            );
            onSave?.(savedChordId, chordData);
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving chord:", error);
            const errorMessage = error.message || "Failed to save chord";
            if (
                errorMessage.includes("Duplicate chord") ||
                errorMessage.includes("Enharmonic equivalent")
            ) {
                toast.error(`Duplicate chord: ${errorMessage}`);
            } else {
                toast.error("Failed to save chord");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleKeyboardShortcut = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "s") {
                e.preventDefault();
                handleSave();
            } else if (e.shiftKey && e.key === "A") {
                e.preventDefault();
                handleSave(true);
            }
        }
    };

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", handleKeyboardShortcut);
            return () =>
                document.removeEventListener("keydown", handleKeyboardShortcut);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[95vh] w-[98vw] overflow-hidden flex flex-col">
                <DialogHeader className="pb-1 flex-shrink-0">
                    <DialogTitle className="text-base">
                        {chordId ? "Edit Chord" : "Create New Chord"}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        {chordId
                            ? "Modify chord metadata and voicings"
                            : "Add a new master chord with voicings"}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-muted-foreground">
                            Loading chord data...
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Validation Alerts */}
                        {duplicateWarning && (
                            <ValidationAlert
                                type="warning"
                                title="Duplicate Warning"
                                message={duplicateWarning}
                                className="mb-2 flex-shrink-0"
                            />
                        )}

                        {validationErrors.length > 0 && (
                            <ValidationAlert
                                type="error"
                                title="Validation Errors"
                                message={validationErrors.join("; ")}
                                className="mb-2 flex-shrink-0"
                            />
                        )}

                        {/* Main Content with Tabs */}
                        <Tabs
                            defaultValue="basic"
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <TabsList className="grid w-full max-w-md grid-cols-3 mb-2 flex-shrink-0">
                                <TabsTrigger
                                    value="basic"
                                    className="py-2 text-xs"
                                >
                                    Basic Info
                                </TabsTrigger>
                                <TabsTrigger
                                    value="guitar"
                                    className="py-2 text-xs"
                                >
                                    Guitar
                                </TabsTrigger>
                                <TabsTrigger
                                    value="piano"
                                    className="py-2 text-xs"
                                >
                                    Piano
                                </TabsTrigger>
                            </TabsList>

                            {/* Basic Chord Information Tab */}
                            <TabsContent
                                value="basic"
                                className="flex-1 min-h-0 overflow-y-auto"
                            >
                                <div className="bg-muted/30 p-4 rounded-lg h-full overflow-y-auto">
                                    <h3 className="text-lg font-semibold mb-3">
                                        Basic Chord Information
                                    </h3>
                                    <div className="max-h-full">
                                        <ChordMetadataForm
                                            chordData={chordData}
                                            onChange={(updatedMetadata) => {
                                                setChordData((prev) => ({
                                                    ...prev,
                                                    ...updatedMetadata,
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Guitar Voicing Tab */}
                            <TabsContent
                                value="guitar"
                                className="flex-1 min-h-0"
                            >
                                <div className="bg-card/50 rounded-lg p-3 h-full overflow-y-auto">
                                    <h3 className="text-lg font-semibold mb-3">
                                        Guitar Voicing
                                    </h3>
                                    <div className="max-h-full">
                                        <GuitarVoicingEditor
                                            chordData={chordData}
                                            onChange={(updatedChord) =>
                                                setChordData(updatedChord)
                                            }
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Piano Voicing Tab */}
                            <TabsContent
                                value="piano"
                                className="flex-1 min-h-0"
                            >
                                <div className="bg-card/50 rounded-lg p-3 h-full overflow-y-auto">
                                    <h3 className="text-lg font-semibold mb-3">
                                        Piano Voicing
                                    </h3>
                                    <div className="max-h-full">
                                        <PianoVoicingEditor
                                            chordData={chordData}
                                            onChange={(updatedChord) =>
                                                setChordData(updatedChord)
                                            }
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Compact Footer Actions */}
                        <div className="flex justify-between items-center pt-2 mt-2 border-t flex-shrink-0">
                            <div className="text-xs text-muted-foreground">
                                <kbd className="px-2 py-1 bg-muted rounded text-xs">
                                    Ctrl+S
                                </kbd>{" "}
                                Save •{" "}
                                <kbd className="px-2 py-1 bg-muted rounded text-xs">
                                    Shift+A
                                </kbd>{" "}
                                Approve
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={saving}
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleSave()}
                                    disabled={saving}
                                    size="sm"
                                >
                                    <Save className="h-3 w-3 mr-1" />
                                    {saving ? "Saving..." : "Save Draft"}
                                </Button>
                                <Button
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                    size="sm"
                                    className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
                                >
                                    <Check className="h-3 w-3 mr-1" />
                                    Approve
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ChordEditor;
