import { useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit3, Copy, Trash2, Plus, Music2, Type, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChordSuggestions from "./ChordSuggestions";
import AdvancedLyricsEditor from "./AdvancedLyricsEditor";
import { useLanguage } from "@/contexts/LanguageContext";

interface MasterSection {
    lyrics: string;
    chords: string;
    timeSignature?: string;
    key?: string;
}

interface MasterSections {
    [key: string]: MasterSection;
}

const AddSectionControls = ({
    onAddSection,
    quickSections,
    existingSections,
}: {
    onAddSection: (name: string) => void;
    quickSections: Array<{
        name: string;
        icon: React.ElementType;
        label: string;
    }>;
    existingSections: MasterSections;
}) => {
    const { t } = useLanguage();
    const [newSectionName, setNewSectionName] = useState("");

    const handleCreate = (name: string) => {
        if (name.trim()) {
            onAddSection(name.trim());
            setNewSectionName(""); // Kosongkan input setelah berhasil
        }
    };

    return (
        <Card className="border-dashed my-2 sm:my-4">
            <CardHeader className="px-2 sm:px-6 py-2 pb-1 sm:pb-4">
                <CardTitle className="text-xs sm:text-base text-primary">
                    {/* Quick Add Sections */}
                    {t("arrEditor.subsubtitle")}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-2 mb-2 sm:mb-4">
                    {quickSections.map(({ name, icon: Icon, label }) => (
                        <Button
                            key={name}
                            variant={
                                existingSections[name] ? "secondary" : "outline"
                            }
                            size="sm"
                            onClick={() => handleCreate(name)}
                            disabled={!!existingSections[name]}
                            className="h-auto py-1.5 sm:py-3 flex flex-col gap-0.5 sm:gap-1 text-xs px-1 sm:px-3"
                        >
                            <Icon className="h-2.5 w-2.5 sm:h-4 sm:w-4" />
                            {label}
                        </Button>
                    ))}
                </div>

                <Separator className="my-2 sm:my-4" />

                <div className="flex gap-1 sm:gap-2">
                    <Input
                        placeholder="Custom section name (e.g: Pre-Chorus)"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                handleCreate(newSectionName);
                            }
                        }}
                        className="flex-1 h-7 sm:h-10 text-xs sm:text-sm"
                    />
                    <Button
                        onClick={() => handleCreate(newSectionName)}
                        disabled={!newSectionName.trim()}
                        size="sm"
                        className="h-7 sm:h-10 px-2 sm:px-3"
                    >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                        <span className="hidden sm:inline">Add</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface SectionsStepProps {
    masterSections: MasterSections;
    updateMasterSection: (
        type: string,
        field: "lyrics" | "chords" | "timeSignature" | "key",
        value: string
    ) => void;
    deleteMasterSection: (type: string) => void;
    renameMasterSection: (oldName: string, newName: string) => void;
    currentKey: string;
    recentChords: string[];
    onRecentChordsChange: (chords: string[]) => void;
}

const SectionsStep = ({
    masterSections,
    updateMasterSection,
    deleteMasterSection,
    renameMasterSection,
    currentKey,
    recentChords,
    onRecentChordsChange,
}: SectionsStepProps) => {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [newSectionName, setNewSectionName] = useState("");
    const [editingSection, setEditingSection] = useState<string | null>(null); // Stores the original key of the section being edited
    const [editingSectionName, setEditingSectionName] = useState(""); // Stores the new name during editing
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
    const [activeField, setActiveField] = useState<{
        section: string;
        field: "lyrics" | "chords";
    } | null>(null);

    const ALL_KEYS = [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
    ];

    // Common section types with icons in the desired order
    const quickSections = [
        { name: "intro", icon: Music2, label: "Intro" },
        { name: "verse", icon: Type, label: "Verse" },
        { name: "chorus", icon: Hash, label: "Chorus" },
        { name: "bridge", icon: Music2, label: "Bridge" },
        { name: "interlude", icon: Music2, label: "Interlude" },
        { name: "coda", icon: Music2, label: "Coda" },
        { name: "outro", icon: Music2, label: "Outro" },
    ];

    const isMusicalSection = (sectionType: string) => {
        return [
            "intro",
            "outro",
            "interlude",
            "instrumental",
            "solo",
            "breakdown",
        ].some((musical) => sectionType.toLowerCase().includes(musical));
    };

    const isLyricalSection = (sectionType: string) => {
        return ["verse", "chorus", "bridge", "coda"].some((lyrical) =>
            sectionType.toLowerCase().includes(lyrical)
        );
    };

    const handleCreateSection = (sectionName: string) => {
        const normalizedName = sectionName.toLowerCase().replace(/\s+/g, "_");

        if (masterSections[normalizedName]) {
            toast({
                title: "Section Already Exists",
                description: `A section named "${sectionName}" already exists.`,
                variant: "destructive",
            });
            return;
        }

        updateMasterSection(normalizedName, "lyrics", "");
        updateMasterSection(normalizedName, "chords", "");
        updateMasterSection(normalizedName, "timeSignature", "");
        setNewSectionName("");

        toast({
            title: "Section Created",
            description: `"${sectionName}" section added successfully.`,
        });
    };

    const handleDuplicateSection = (originalType: string) => {
        const originalSection = masterSections[originalType];
        let counter = 2;
        let newType = `${originalType}_${counter}`;

        while (masterSections[newType]) {
            counter++;
            newType = `${originalType}_${counter}`;
        }

        updateMasterSection(newType, "lyrics", originalSection.lyrics);
        updateMasterSection(newType, "chords", originalSection.chords);
        updateMasterSection(
            newType,
            "timeSignature",
            originalSection.timeSignature || ""
        );
        updateMasterSection(newType, "key", originalSection.key || "");

        toast({
            title: "Section Duplicated",
            description: `Created "${newType}" from "${originalType}".`,
        });
    };

    const handleStartEditingSection = (type: string) => {
        setEditingSection(type);
        setEditingSectionName(getSectionDisplayName(type));
    };

    const handleSaveSectionName = (originalType: string) => {
        const trimmedNewName = editingSectionName.trim();
        if (!trimmedNewName) {
            toast({
                title: "Invalid Name",
                description: "Section name cannot be empty.",
                variant: "destructive",
            });
            return;
        }

        const normalizedNewName = trimmedNewName
            .toLowerCase()
            .replace(/\s+/g, "_");

        if (
            normalizedNewName !== originalType &&
            masterSections[normalizedNewName]
        ) {
            toast({
                title: "Section Already Exists",
                description: `A section named "${trimmedNewName}" already exists.`,
                variant: "destructive",
            });
            return;
        }

        if (normalizedNewName !== originalType) {
            // Create new section with old content
            updateMasterSection(
                normalizedNewName,
                "lyrics",
                masterSections[originalType].lyrics
            );
            updateMasterSection(
                normalizedNewName,
                "chords",
                masterSections[originalType].chords
            );
            updateMasterSection(
                normalizedNewName,
                "timeSignature",
                masterSections[originalType].timeSignature || ""
            );
            updateMasterSection(
                normalizedNewName,
                "key",
                masterSections[originalType].key || ""
            );
            // Delete old section
            deleteMasterSection(originalType);
            renameMasterSection(originalType, normalizedNewName);

            toast({
                title: "Section Renamed",
                description: `"${getSectionDisplayName(
                    originalType
                )}" renamed to "${trimmedNewName}".`,
            });
        }
        setEditingSection(null);
        setEditingSectionName("");
    };

    const handleCancelEditingSection = () => {
        setEditingSection(null);
        setEditingSectionName("");
    };

    const handleChordInsert = (chord: string) => {
        if (!activeField) return;

        const section = masterSections[activeField.section];
        if (!section) return;

        // Get current cursor position from the active textarea
        const textarea = document.querySelector(
            `[data-section="${activeField.section}"][data-field="${activeField.field}"]`
        ) as HTMLTextAreaElement;
        if (!textarea) return;

        const cursorPosition = textarea.selectionStart;
        const currentContent =
            activeField.field === "chords" ? section.chords : section.lyrics;
        const newContent =
            currentContent.slice(0, cursorPosition) +
            chord +
            " " +
            currentContent.slice(cursorPosition);

        updateMasterSection(activeField.section, activeField.field, newContent);

        // Restore cursor position after the inserted chord
        setTimeout(() => {
            if (textarea) {
                const newPosition = cursorPosition + chord.length + 1;
                textarea.setSelectionRange(newPosition, newPosition);
                textarea.focus();
            }
        }, 0);
    };

    const handleTextareaFocus = (
        section: string,
        field: "lyrics" | "chords"
    ) => {
        setActiveField({ section, field });
    };

    const getSectionDisplayName = (type: string) => {
        return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-2 sm:space-y-6 px-2 sm:px-0">
            {/* Header */}
            <Card>
                <CardHeader className="px-2 sm:px-6 py-2 sm:py-6">
                    <CardTitle className="text-base sm:text-xl text-primary flex items-center gap-2">
                        <Music2 className="h-3 w-3 sm:h-5 sm:w-5" />
                        {/* Create Song Sections */}
                        {t("arrEditor.title2")}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {/* Add sections, write lyrics, and include chords all in
                        one place. */}
                        {t("arrEditor.subtitle2")}
                    </p>
                </CardHeader>
            </Card>

            {/* Quick Create Sections */}

            {/* Existing Sections */}
            {Object.keys(masterSections).length > 0 ? (
                <div className="space-y-2 sm:space-y-4">
                    {Object.entries(masterSections).map(([type, section]) => (
                        <Card key={type} className="overflow-hidden">
                            <CardHeader className="px-2 sm:px-6 py-2 sm:py-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
                                        {editingSection === type ? (
                                            <Input
                                                value={editingSectionName}
                                                onChange={(e) =>
                                                    setEditingSectionName(
                                                        e.target.value
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleSaveSectionName(
                                                            type
                                                        );
                                                    } else if (
                                                        e.key === "Escape"
                                                    ) {
                                                        handleCancelEditingSection();
                                                    }
                                                }}
                                                className="h-7 sm:h-8 text-xs sm:text-sm flex-grow"
                                            />
                                        ) : (
                                            <Badge
                                                variant={
                                                    isMusicalSection(type)
                                                        ? "secondary"
                                                        : "default"
                                                }
                                                className="flex-shrink-0 text-xs cursor-pointer"
                                                onClick={() =>
                                                    handleStartEditingSection(
                                                        type
                                                    )
                                                }
                                            >
                                                {isMusicalSection(type) ? (
                                                    <Music2 className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                                ) : (
                                                    <Type className="h-2 w-2 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                                )}
                                                {getSectionDisplayName(type)}
                                                <Edit3 className="ml-1 h-2 w-2 sm:h-3 sm:w-3 text-muted-foreground" />
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-0.5 sm:gap-1">
                                        {editingSection === type ? (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleSaveSectionName(
                                                            type
                                                        )
                                                    }
                                                    className="h-5 w-5 sm:h-8 sm:w-8 p-0"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={
                                                        handleCancelEditingSection
                                                    }
                                                    className="h-5 w-5 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDuplicateSection(
                                                            type
                                                        )
                                                    }
                                                    className="h-5 w-5 sm:h-8 sm:w-8 p-0"
                                                >
                                                    <Copy className="h-2 w-2 sm:h-3 sm:w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setSectionToDelete(type)
                                                    }
                                                    className="h-5 w-5 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="px-2 sm:px-6 space-y-4">
                                {/* Bagian Baru: Key Dropdown */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 ml-4 mb-4">
                                    <div className="mb-4">
                                        <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
                                            {/* Key  */}
                                            {t("arrEditor.key")}
                                            {/* (Overrides song key) */}
                                            {/* {t("arrEditor.overide")} */}
                                        </label>
                                        <Select
                                            value={section.key || "default"} // Gunakan 'default' jika section.key kosong
                                            onValueChange={(value) => {
                                                updateMasterSection(
                                                    type,
                                                    "key",
                                                    value === "default"
                                                        ? ""
                                                        : value // Kirim string kosong jika kembali ke default
                                                );
                                            }}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-xs">
                                                <SelectValue placeholder="Select key..." />
                                            </SelectTrigger>
                                            <SelectContent className="z-50 bg-background border border-border">
                                                <SelectItem value="default">
                                                    Default ({currentKey})
                                                </SelectItem>
                                                <Separator className="my-1" />
                                                {ALL_KEYS.map((key) => (
                                                    <SelectItem
                                                        key={key}
                                                        value={key}
                                                    >
                                                        {key}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {/* Time Signature Field */}
                                    <div className="mb-4">
                                        <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
                                            Time Signature
                                        </label>
                                        <div className="flex gap-2">
                                            <Select
                                                value={
                                                    !section.timeSignature ||
                                                    section.timeSignature === ""
                                                        ? "none"
                                                        : [
                                                              "4/4",
                                                              "3/4",
                                                              "2/4",
                                                              "6/8",
                                                              "9/8",
                                                              "12/8",
                                                              "5/4",
                                                              "7/8",
                                                          ].includes(
                                                              section.timeSignature
                                                          )
                                                        ? section.timeSignature
                                                        : "custom"
                                                }
                                                onValueChange={(value) => {
                                                    if (value === "none") {
                                                        updateMasterSection(
                                                            type,
                                                            "timeSignature",
                                                            ""
                                                        );
                                                    } else if (
                                                        value === "custom"
                                                    ) {
                                                        // Don't change timeSignature here, let user input the custom value
                                                    } else {
                                                        updateMasterSection(
                                                            type,
                                                            "timeSignature",
                                                            value
                                                        );
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="w-32 h-8 text-xs">
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-50 bg-background border border-border">
                                                    <SelectItem value="none">
                                                        None
                                                    </SelectItem>
                                                    <SelectItem value="4/4">
                                                        4/4
                                                    </SelectItem>
                                                    <SelectItem value="3/4">
                                                        3/4
                                                    </SelectItem>
                                                    <SelectItem value="2/4">
                                                        2/4
                                                    </SelectItem>
                                                    <SelectItem value="6/8">
                                                        6/8
                                                    </SelectItem>
                                                    <SelectItem value="9/8">
                                                        9/8
                                                    </SelectItem>
                                                    <SelectItem value="12/8">
                                                        12/8
                                                    </SelectItem>
                                                    <SelectItem value="5/4">
                                                        5/4
                                                    </SelectItem>
                                                    <SelectItem value="7/8">
                                                        7/8
                                                    </SelectItem>
                                                    <SelectItem value="custom">
                                                        Custom
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {section.timeSignature &&
                                                ![
                                                    "4/4",
                                                    "3/4",
                                                    "2/4",
                                                    "6/8",
                                                    "9/8",
                                                    "12/8",
                                                    "5/4",
                                                    "7/8",
                                                    "",
                                                ].includes(
                                                    section.timeSignature
                                                ) && (
                                                    <Input
                                                        placeholder="e.g., 7/4"
                                                        value={
                                                            section.timeSignature ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            updateMasterSection(
                                                                type,
                                                                "timeSignature",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-20 h-8 text-xs"
                                                    />
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {isMusicalSection(type) ? (
                                    // Two-column layout for musical sections (intro, outro, interlude)
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                                        <div>
                                            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block">
                                                {/* Notes & Instructions */}
                                                {t("arrEditor.notes")}
                                            </label>
                                            <Textarea
                                                placeholder={t(
                                                    "arrEditor.placeNoted"
                                                )}
                                                value={section.lyrics}
                                                onChange={(e) =>
                                                    updateMasterSection(
                                                        type,
                                                        "lyrics",
                                                        e.target.value
                                                    )
                                                }
                                                onFocus={() =>
                                                    handleTextareaFocus(
                                                        type,
                                                        "lyrics"
                                                    )
                                                }
                                                className="min-h-[80px] sm:min-h-[120px] resize-y text-xs sm:text-sm"
                                                data-section={type}
                                                data-field="lyrics"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs sm:text-sm font-medium text-foreground mb-1 sm:mb-2 block flex items-center gap-2">
                                                {/* Chords */}
                                                {t("arrEditor.chords")}
                                                {activeField?.section ===
                                                    type &&
                                                    activeField?.field ===
                                                        "chords" && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] sm:text-xs"
                                                        >
                                                            Click chords above
                                                            to insert
                                                        </Badge>
                                                    )}
                                            </label>
                                            <Textarea
                                                placeholder={t(
                                                    "arrEditor.placeNoted2"
                                                )}
                                                value={section.chords}
                                                onChange={(e) =>
                                                    updateMasterSection(
                                                        type,
                                                        "chords",
                                                        e.target.value
                                                    )
                                                }
                                                onFocus={() =>
                                                    handleTextareaFocus(
                                                        type,
                                                        "chords"
                                                    )
                                                }
                                                className="min-h-[80px] sm:min-h-[120px] resize-y font-mono text-xs sm:text-sm"
                                                data-section={type}
                                                data-field="chords"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    // Advanced lyrics editor for lyrical sections (verse, chorus, bridge, coda)
                                    <AdvancedLyricsEditor
                                        value={section.lyrics}
                                        onChange={(value) =>
                                            updateMasterSection(
                                                type,
                                                "lyrics",
                                                value
                                            )
                                        }
                                        currentKey={section.key || currentKey}
                                        sectionType={getSectionDisplayName(
                                            type
                                        )}
                                        recentChords={recentChords}
                                        onRecentChordsChange={
                                            onRecentChordsChange
                                        }
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    <AddSectionControls
                        onAddSection={handleCreateSection}
                        quickSections={quickSections}
                        existingSections={masterSections}
                    />
                </div>
            ) : (
                <>
                    <AddSectionControls
                        onAddSection={handleCreateSection}
                        quickSections={quickSections}
                        existingSections={masterSections}
                    />
                </>
            )}

            {/* Empty State */}
            {Object.keys(masterSections).length === 0 && (
                <Card>
                    <CardContent className="text-center py-12">
                        <div className="text-6xl mb-4">🎵</div>
                        <h3 className="text-lg font-semibold text-primary mb-2">
                            No sections created yet
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Start by adding common sections like Verse, Chorus,
                            or Bridge
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Use the quick add buttons above to get started
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={!!sectionToDelete}
                onOpenChange={() => setSectionToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Section</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the "
                            {getSectionDisplayName(sectionToDelete || "")}"
                            section? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (sectionToDelete) {
                                    deleteMasterSection(sectionToDelete);
                                    setSectionToDelete(null);
                                    toast({
                                        title: "Section Deleted",
                                        description: `"${getSectionDisplayName(
                                            sectionToDelete
                                        )}" section has been removed.`,
                                    });
                                }
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SectionsStep;
