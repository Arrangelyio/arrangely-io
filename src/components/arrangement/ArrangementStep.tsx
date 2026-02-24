import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Music2, FileDown, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TransposeModal from "../TransposeModal";
import { useLanguage } from "@/contexts/LanguageContext";
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
}
interface MasterSections {
    [key: string]: MasterSection;
}
interface ArrangementStepProps {
    masterSections: MasterSections;
    sections: Section[];
    addSectionFromMaster: (type: string) => void;
    removeSection: (id: number) => void;
    currentKey: string;
    songData: {
        title: string;
        artist: string;
    };
    onTranspose?: (newKey: string, preferSharps: boolean) => void;
    onLivePreview?: () => void;
    onExport?: () => void;
    onSave?: () => void;
}
const ArrangementStep = ({
    masterSections,
    sections,
    addSectionFromMaster,
    removeSection,
    currentKey,
    songData,
    onTranspose,
    onLivePreview,
    onExport,
    onSave,
}: ArrangementStepProps) => {
    const { t } = useLanguage();
    const { toast } = useToast();
    const [showTransposeModal, setShowTransposeModal] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    // Handle transpose
    const handleTranspose = () => {
        if (sections.length === 0) {
            toast({
                title: "Add Sections First",
                description:
                    "Please add sections to your arrangement before transposing. Click the +Intro, +Verse, or +Chorus buttons above.",
                variant: "destructive",
                duration: 1000,
            });
            return;
        }
        setShowTransposeModal(true);
    };

    // Handle preview
    const handlePreview = () => {
        if (sections.length === 0) {
            toast({
                title: "Add Sections First",
                description:
                    "Please add sections to your arrangement before previewing. Click the +Intro, +Verse, or +Chorus buttons above.",
                variant: "destructive",
                duration: 1000,
            });
            return;
        }

        if (onLivePreview) {
            onLivePreview();
        } else {
            const previewData = {
                songData,
                sections,
                currentKey,
            };
            
            toast({
                title: "Preview Mode",
                description: "Opening arrangement preview...",
            });
        }
    };

    // Handle save
    const handleSave = () => {
        if (sections.length === 0) {
            toast({
                title: "Add Sections First",
                description:
                    "Please add sections to your arrangement before saving. Click the +Intro, +Verse, or +Chorus buttons above.",
                variant: "destructive",
                duration: 1000,
            });
            return;
        }
        if (onSave) {
            onSave();
        }
    };

    // Handle PDF export
    const handlePDFExport = async () => {
        if (sections.length === 0) {
            toast({
                title: "Add Sections First",
                description:
                    "Please add sections to your arrangement before exporting. Click the +Intro, +Verse, or +Chorus buttons above.",
                variant: "destructive",
                duration: 1000,
            });
            return;
        }
        setIsGeneratingPDF(true);
        try {
            // Create a simple text-based PDF content
            const pdfContent = generatePDFContent();

            // Create blob and download
            const dataBlob = new Blob([pdfContent], {
                type: "text/plain",
            });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${songData.title || "arrangement"}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({
                title: "PDF Exported",
                description:
                    "Your arrangement has been downloaded as a text file.",
                duration: 1000,
            });
        } catch (error) {
            toast({
                title: "Export Failed",
                description: "There was an error exporting your arrangement.",
                variant: "destructive",
                duration: 1000,
            });
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    // Generate PDF content as text
    const generatePDFContent = () => {
        let content = `${songData.title || "Untitled Song"}\n`;
        if (songData.artist) content += `by ${songData.artist}\n`;
        content += `Key: ${currentKey}\n\n`;
        content += "=".repeat(50) + "\n\n";
        sections.forEach((section, index) => {
            const masterData = masterSections[section.type];
            content += `${index + 1}. ${section.type.toUpperCase()}\n`;
            content += "-".repeat(20) + "\n";
            if (masterData) {
                // Pastikan masterData ada
                if (isMusicalSection(section.type)) {
                    if (masterData.lyrics && masterData.lyrics.trim()) {
                        content += `Catatan: ${masterData.lyrics}\n`;
                    }
                    if (masterData.chords && masterData.chords.trim()) {
                        content += `Chord: ${masterData.chords}\n`;
                    }
                } else {
                    if (masterData.lyrics && masterData.lyrics.trim()) {
                        content += `${masterData.lyrics}\n`;
                    }
                }
            }
            content += "\n";
        });
        return content;
    };

    // Helper function to check if a section is musical (intro, outro, interlude)
    const isMusicalSection = (sectionType: string) => {
        return ["intro", "outro", "interlude", "instrumental"].some((musical) =>
            sectionType.toLowerCase().includes(musical)
        );
    };

    // Helper function to parse and display musical section data
    const parseMusicalSection = (chords: string) => {
        try {
            const data = JSON.parse(chords);
            return {
                chordProgression: data.chordProgression || "",
                instrumentCues: data.instrumentCues || "",
                barCount: data.barCount || 4,
            };
        } catch {
            return {
                chordProgression: chords,
                instrumentCues: "",
                barCount: 4,
            };
        }
    };

    // Helper function to format chord progression for better display
    const formatChordProgression = (progression: string) => {
        if (!progression) return "";

        // Replace dots with proper spacing and format bars
        return progression
            .split("\n")
            .map((line) => {
                // Handle bar notation like "| E . G#m . |"
                if (line.includes("|")) {
                    return line
                        .replace(/\s+/g, " ") // normalize spaces
                        .replace(/\.\s*/g, "  .  ") // add proper spacing around dots
                        .replace(/\|\s*/g, "| ") // add space after opening bar
                        .replace(/\s*\|/g, " |"); // add space before closing bar
                }
                return line;
            })
            .join("\n");
    };
    const renderSectionContent = (section: Section) => {
        const masterData = masterSections[section.type];

        if (!masterData) {
            return (
                <div className="text-destructive-foreground ...">
                    Error: Seksi master "{section.type}" tidak ditemukan.
                </div>
            );
        }

        if (isMusicalSection(section.type)) {
            // For musical sections (intro, outro, interlude) - show notes and chords
            return (
                <div className="space-y-3 text-sm">
                    {/* Notes/Instructions from Step 2 */}
                    {masterData.lyrics && masterData.lyrics.trim() && (
                        <div className="bg-muted/30 p-3 rounded border">
                            <div className="text-primary font-semibold mb-2 text-xs uppercase tracking-wide">
                                {/* Notes & Instructions */}
                                {t("arrEditor.notes")}
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {masterData.lyrics}
                            </div>
                        </div>
                    )}

                    {/* Chord Progression */}
                    {masterData.chords && masterData.chords.trim() && (
                        <div className="bg-accent/10 p-3 rounded border border-accent/20">
                            <div className="text-accent font-semibold mb-2 text-xs uppercase tracking-wide">
                                {/* Chord Progression */}
                                {t("arrEditor.chordPro")}
                            </div>
                            <pre
                                className="font-mono text-sm leading-relaxed text-accent/90 font-medium"
                                style={{
                                    fontFamily:
                                        'Monaco, Consolas, "Courier New", monospace',
                                    letterSpacing: "1px",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            >
                                {masterData.chords}
                            </pre>
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="capitalize bg-muted px-2 py-1 rounded">
                            {section.type} Section
                        </span>
                    </div>
                </div>
            );
        } else {
            // For lyrical sections (verse, chorus, bridge, coda) - show formatted lyrics with chords
            if (masterData.lyrics && masterData.lyrics.trim()) {
                return (
                    <div className="bg-background border rounded p-4">
                        <pre
                            className="m-0 font-mono text-sm leading-loose overflow-x-auto"
                            style={{
                                fontFamily:
                                    'Monaco, Consolas, "Courier New", monospace',
                                lineHeight: "1.9",
                                letterSpacing: "0.5px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            }}
                        >
                            {masterData.lyrics}
                        </pre>
                    </div>
                );
            } else {
                return (
                    <div className="text-muted-foreground italic text-sm bg-muted/20 p-3 rounded border-dashed border">
                        No content added yet
                        <br />
                        <span className="text-xs">
                            Go back to Step 2 to add lyrics and chords
                        </span>
                    </div>
                );
            }
        }
    };
    return (
        <div className="w-full max-w-4xl mx-auto space-y-2 sm:space-y-4 px-2 sm:px-0">
            <Card className="w-full">
                <CardHeader className="px-2 sm:px-6 py-2 sm:py-4">
                    <CardTitle className="text-primary text-base sm:text-base lg:text-lg">
                        Build Your Arrangement
                        {t("arrEditor.title3")}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        {/* Add sections to build your arrangement. */}
                        {t("arrEditor.subtitle3")}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-1 sm:gap-2 pt-1 sm:pt-3 border-t border-primary/20 mt-1 sm:mt-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-1.5 sm:p-3 -mx-1 sm:-mx-2 border border-primary/10 shadow-sm">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTranspose}
                            disabled={sections.length === 0}
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 h-6 sm:h-8 flex items-center gap-1 ${
                                sections.length === 0 ? "opacity-50" : ""
                            }`}
                        >
                            <Music2 className="h-2 w-2 sm:h-3 sm:w-3" />
                            Transpose
                        </Button>

                        {onLivePreview && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreview}
                                disabled={sections.length === 0}
                                className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 h-6 sm:h-8 flex items-center gap-1 ${
                                    sections.length === 0 ? "opacity-50" : ""
                                }`}
                            >
                                <Eye className="h-2 w-2 sm:h-3 sm:w-3" />
                                {/* Preview */}
                                {t("arrEditor.preview")}
                            </Button>
                        )}

                        {/* {onExport && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExport}
                                disabled={sections.length === 0}
                                className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 h-6 sm:h-8 flex items-center gap-1 ${
                                    sections.length === 0 ? "opacity-50" : ""
                                }`}
                            >
                                <FileDown className="h-2 w-2 sm:h-3 sm:w-3" />
                                Export
                            </Button>
                        )} */}

                        {onSave && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSave}
                                disabled={sections.length === 0}
                                className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 h-6 sm:h-8 flex items-center gap-1 ${
                                    sections.length === 0 ? "opacity-50" : ""
                                }`}
                            >
                                <Save className="h-2 w-2 sm:h-3 sm:w-3" />
                                {/* Save */}
                                {t("arrEditor.save")}
                            </Button>
                        )}
                    </div>

                    {/* Section Buttons - Highlighted when empty */}
                    <div
                        className={`flex flex-wrap gap-1 sm:gap-2 pt-1 sm:pt-3 ${
                            sections.length === 0
                                ? "p-1.5 sm:p-3 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border-2 border-dashed border-accent/30"
                                : ""
                        }`}
                    >
                        {sections.length === 0 && (
                            <div className="w-full mb-1 sm:mb-2">
                                <p className="text-xs sm:text-sm font-medium text-accent mb-0.5 sm:mb-1">
                                    👆 Start building your arrangement:
                                </p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                    Click the buttons below to add sections from
                                    Step 2
                                </p>
                            </div>
                        )}
                        {Object.entries(masterSections)
                            .filter(
                                ([_, data]) =>
                                    data.lyrics.trim() || data.chords.trim()
                            )
                            .map(([type]) => (
                                <Button
                                    key={type}
                                    variant={
                                        sections.length === 0
                                            ? "default"
                                            : "outline"
                                    }
                                    size="sm"
                                    onClick={() => addSectionFromMaster(type)}
                                    className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-0.5 h-6 sm:h-8 flex-shrink-0 capitalize ${
                                        sections.length === 0
                                            ? "bg-accent hover:bg-accent/90 text-accent-foreground animate-pulse shadow-md"
                                            : ""
                                    }`}
                                >
                                    + {type}
                                </Button>
                            ))}
                        {Object.entries(masterSections).filter(
                            ([_, data]) =>
                                data.lyrics.trim() || data.chords.trim()
                        ).length === 0 && (
                            <div className="text-xs sm:text-sm text-muted-foreground italic">
                                No sections available. Go back to Step 2 to
                                create sections first.
                            </div>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {sections.length > 0 && (
                <Card className="w-full">
                    <CardHeader className="px-2 sm:px-6 py-2 sm:py-4">
                        <CardTitle className="text-primary text-sm sm:text-base lg:text-lg">
                            {/* Arrangement Preview */}
                            {t("arrEditor.arrPreview")}
                        </CardTitle>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            {/* This is how your arrangement will look */}
                            {t("arrEditor.arrPreviewDesc")}
                        </p>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                        <div className="space-y-2 sm:space-y-6">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className="border border-border rounded-lg p-2 sm:p-4 bg-card"
                                >
                                    <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2">
                                        <div className="flex items-center gap-1.5 sm:gap-3">
                                            <div className="w-5 h-5 sm:w-8 sm:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                                                {index + 1}
                                            </div>
                                            <h3 className="font-bold text-primary text-sm sm:text-base capitalize flex-1 min-w-0">
                                                {section.type}
                                            </h3>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                removeSection(section.id)
                                            }
                                            className="text-destructive hover:text-destructive text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 h-5 sm:h-7 flex-shrink-0"
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                    <div className="overflow-hidden">
                                        {renderSectionContent(section)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {sections.length === 0 && (
                <Card className="w-full">
                    <CardContent className="text-center py-4 sm:py-12 px-2 sm:px-4">
                        <div className="text-3xl sm:text-6xl mb-2 sm:mb-4">
                            🎵
                        </div>
                        <p className="text-muted-foreground text-sm sm:text-base mb-1 sm:mb-3">
                            Your arrangement is empty
                        </p>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            Use the buttons above to add sections and build your
                            song arrangement
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Transpose Modal */}
            <TransposeModal
                isOpen={showTransposeModal}
                onClose={() => setShowTransposeModal(false)}
                currentKey={currentKey}
                onTranspose={(newKey, preferSharps) => {
                    if (onTranspose) {
                        onTranspose(newKey, preferSharps);
                    } else {
                        toast({
                            title: "Transpose Feature",
                            description: `Would transpose from ${currentKey} to ${newKey}. Feature coming soon!`,
                            duration: 1000,
                        });
                    }
                    setShowTransposeModal(false);
                }}
            />
        </div>
    );
};
export default ArrangementStep;
