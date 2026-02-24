import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    GripVertical,
    Music,
    ArrowLeft,
    Save,
    Copy,
    Trash2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChordBar {
    id: string;
    chord: string;
    beats: number;
    comment?: string;
    timestamp?: number;
    melody?: {
        notAngka?: string;
    };
    ending?: {
        type: "1" | "2";
        isStart?: boolean;
        isEnd?: boolean;
    };
}

interface ChordSection {
    id: string;
    name: string;
    timeSignature: string;
    bars: ChordBar[];
    isExpanded: boolean;
    barCount: number;
    showMelody?: boolean;
    position?: number;
}

interface SectionArrangementStepProps {
    sections: ChordSection[];
    availableSections?: ChordSection[]; // All sections from Step 2
    onSectionsReorder: (reorderedSections: ChordSection[]) => void;
    onBack: () => void;
    onSave: () => void;
    isSaving: boolean;
    songTitle: string;
    artistName: string;
    songKey: string;
}

const SectionArrangementStep: React.FC<SectionArrangementStepProps> = ({
    sections,
    availableSections = [],
    onSectionsReorder,
    onBack,
    onSave,
    isSaving,
    songTitle,
    artistName,
    songKey,
}) => {
    const { t } = useLanguage();
    const [localSections, setLocalSections] = useState<ChordSection[]>(
        sections.map((section, index) => ({
            ...section,
            position: index + 1,
        }))
    );

    const handleAddSection = (sectionToAdd: ChordSection) => {
        const newSection: ChordSection = {
            ...sectionToAdd,
            // Generate new section ID that will be created in song_sections table
            id: sectionToAdd.id,
            bars: sectionToAdd.bars.map((bar) => ({
                ...bar,
                id: crypto.randomUUID(), // Generate new IDs for bars (local state only)
            })),
        };

        const newSections = [...localSections, newSection];

        // Update positions
        const reorderedSections = newSections.map((section, index) => ({
            ...section,
            position: index + 1,
        }));

        setLocalSections(reorderedSections);
        onSectionsReorder(reorderedSections);
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(localSections);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update positions
        const reorderedSections = items.map((section, index) => ({
            ...section,
            position: index + 1,
        }));

        setLocalSections(reorderedSections);
        onSectionsReorder(reorderedSections);
    };

    const handleCopySection = (sectionIndex: number) => {
        const sectionToCopy = localSections[sectionIndex];
        const newSection: ChordSection = {
            ...sectionToCopy,
            // Generate new section ID that will be created in song_sections table
            id: sectionToCopy.id,
            bars: sectionToCopy.bars.map((bar) => ({
                ...bar,
                id: crypto.randomUUID(), // Generate new IDs for bars (local state only)
            })),
        };

        const newSections = [...localSections];
        newSections.splice(sectionIndex + 1, 0, newSection);

        // Update positions
        const reorderedSections = newSections.map((section, index) => ({
            ...section,
            position: index + 1,
        }));

        setLocalSections(reorderedSections);
        onSectionsReorder(reorderedSections);
    };

    const handleRemoveSection = (sectionIndex: number) => {
        const newSections = [...localSections];
        newSections.splice(sectionIndex, 1);

        // Update positions
        const reorderedSections = newSections.map((section, index) => ({
            ...section,
            position: index + 1,
        }));

        setLocalSections(reorderedSections);
        onSectionsReorder(reorderedSections);
    };

    const getChordPreview = (bars: ChordBar[]) => {
        return bars
            .slice(0, 4)
            .map((bar) => bar.chord || "-")
            .join(" | ");
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4 px-2 sm:px-0">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Music className="h-5 w-5" />
                        {/* Arrange Your Sections */}
                        {t("chordGrid.arrSection")}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                            {/* Drag and drop sections to arrange them in the order
                            you want them to appear in your arrangement. Click
                            the copy button to duplicate a section. */}
                            {t("chordGrid.arrSectionSub")}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span>
                                <strong>
                                    {/* Song: */}
                                    {t("chordGrid.song")}:
                                </strong>{" "}
                                {songTitle || "Untitled"}
                            </span>
                            {artistName && (
                                <span>
                                    <strong>Artist:</strong> {artistName}
                                </span>
                            )}
                            <span>
                                <strong>Key:</strong> {songKey}
                            </span>
                        </div>
                    </div>
                </CardHeader>

                {availableSections.length > 0 && (
                    <div className="px-6 pb-4 border-b">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-primary">
                                {/* 👆 Start building your arrangement: */}
                                {t("chordGrid.sub1")}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                            {/* Click the buttons below to add sections from Step 2 */}
                            {t("chordGrid.sub2")}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableSections.map((section) => (
                                <Button
                                    key={section.id}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddSection(section)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                                >
                                    + {section.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                <CardContent className="space-y-4">
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="sections">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-3"
                                >
                                    {localSections.map((section, index) => (
                                        <Draggable
                                            key={section.id}
                                            draggableId={section.id}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`
                                                        bg-background border rounded-lg p-4 transition-all duration-200
                                                        ${
                                                            snapshot.isDragging
                                                                ? "shadow-lg ring-2 ring-primary/20 scale-105"
                                                                : "hover:shadow-md hover:border-primary/20"
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="flex-shrink-0 p-2 rounded hover:bg-primary/10 cursor-grab active:cursor-grabbing"
                                                        >
                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                        </div>

                                                        <div className="flex-shrink-0">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                {index + 1}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="font-semibold text-sm capitalize truncate">
                                                                    {
                                                                        section.name
                                                                    }
                                                                </h3>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                        <span>
                                                                            {
                                                                                section
                                                                                    .bars
                                                                                    .length
                                                                            }{" "}
                                                                            bars
                                                                        </span>
                                                                        <span>
                                                                            •
                                                                        </span>
                                                                        <span>
                                                                            {
                                                                                section.timeSignature
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleCopySection(
                                                                                    index
                                                                                )
                                                                            }
                                                                            className="h-6 w-6 p-0 hover:bg-primary/10"
                                                                            title="Copy section"
                                                                        >
                                                                            <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleRemoveSection(
                                                                                    index
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                localSections.length <=
                                                                                1
                                                                            }
                                                                            className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title={
                                                                                localSections.length <=
                                                                                1
                                                                                    ? "Cannot remove the last section"
                                                                                    : "Remove section"
                                                                            }
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {section.bars
                                                                .length > 0 && (
                                                                <div className="mt-2">
                                                                    <div className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                                                                        {getChordPreview(
                                                                            section.bars
                                                                        )}
                                                                        {section
                                                                            .bars
                                                                            .length >
                                                                            4 &&
                                                                            " ..."}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {localSections.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>
                                No sections to arrange. Go back and create some
                                sections first.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={onBack}
                            disabled={isSaving}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Editor
                        </Button>

                        <Button
                            onClick={onSave}
                            disabled={localSections.length === 0 || isSaving}
                            className="flex items-center gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Arrangement"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SectionArrangementStep;
