import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface EditSongModalProps {
    isOpen: boolean;
    onClose: () => void;
    song: {
        id: string;
        title: string;
        artist: string | null;
        current_key: string;
        original_key: string;
        tempo: number | null;
        tags: string[] | null;
        is_public: boolean;
        created_at: string;
        updated_at: string;
        views_count: number;
        is_favorite: boolean;
        rating: number | null;
        folder_id: string | null;
        notes: string | null;
        time_signature: string;
        capo: number | null;
        last_viewed_at: string | null;
        original_creator_id?: string | null;
    } | null;
    onSave: (updatedSong: any) => void;
}

const EditSongModal = ({
    isOpen,
    onClose,
    song,
    onSave,
}: EditSongModalProps) => {
    const { isCreator } = useUserRole();
    const [formData, setFormData] = useState({
        title: song?.title || "",
        artist: song?.artist || "",
        current_key: song?.current_key || "",
        tempo: song?.tempo || 120,
        tags: song?.tags || [],
        is_public: song?.is_public || false,
    });
    const [newTag, setNewTag] = useState("");

    const keys = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
    ];
    const tagSuggestions = [
        "Traditional",
        "Modern",
        "Hymn",
        "Praise",
        "Worship",
        "Contemporary",
        "Upbeat",
        "Slow",
        "Energetic",
    ];

    const handleAddTag = () => {
        if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
            setFormData((prev) => ({
                ...prev,
                tags: [...prev.tags, newTag.trim()],
            }));
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData((prev) => ({
            ...prev,
            tags: prev.tags.filter((tag) => tag !== tagToRemove),
        }));
    };

    const handleSave = () => {
        if (song) {
            onSave({
                ...song,
                ...formData,
            });
            onClose();
        }
    };

    if (!song) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Song Arrangement</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Song Title</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            title: e.target.value,
                                        }))
                                    }
                                    placeholder="Enter song title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="artist">Artist</Label>
                                <Input
                                    id="artist"
                                    value={formData.artist}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            artist: e.target.value,
                                        }))
                                    }
                                    placeholder="Enter artist name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="key">Key</Label>
                                <Select
                                    value={formData.current_key}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            current_key: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select key" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {keys.map((key) => (
                                            <SelectItem key={key} value={key}>
                                                {key}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tempo">Tempo (BPM)</Label>
                                <Input
                                    id="tempo"
                                    type="number"
                                    value={formData.tempo}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Periksa jika nilai adalah string kosong, set null atau 0
                                        if (value === "") {
                                            setFormData((prev) => ({
                                                ...prev,
                                                tempo: null,
                                            }));
                                        } else {
                                            setFormData((prev) => ({
                                                ...prev,
                                                tempo: parseInt(value),
                                            }));
                                        }
                                    }}
                                    min="40"
                                    max="200"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visibility">Visibility</Label>
                                <Select
                                    value={
                                        formData.is_public
                                            ? "public"
                                            : "private"
                                    }
                                    onValueChange={(value) => {
                                        // Prevent setting to public if this is not an original arrangement
                                        if (
                                            value === "public" &&
                                            song.original_creator_id
                                        ) {
                                            return;
                                        }
                                        // Safeguard: Prevent creators from changing public songs to private
                                        if (
                                            value === "private" &&
                                            isCreator &&
                                            song.is_public
                                        ) {
                                            return;
                                        }
                                        setFormData((prev) => ({
                                            ...prev,
                                            is_public: value === "public",
                                        }));
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value="public"
                                            disabled={
                                                !!song.original_creator_id
                                            }
                                        >
                                            🌍 Public
                                        </SelectItem>
                                        <SelectItem 
                                            value="private"
                                            disabled={isCreator && song.is_public}
                                        >
                                            🔒 Private
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {song.original_creator_id && (
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Note:</strong> This is not your
                                        original arrangement, so it can only be
                                        saved as private.
                                    </p>
                                )}
                                {isCreator && song.is_public && (
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Note:</strong> As a Creator, you
                                        cannot change a public arrangement back
                                        to private once it has been published.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tags Section */}
                    <div className="space-y-4">
                        <Label>Tags</Label>

                        {/* Current Tags */}
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map((tag, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                >
                                    {tag}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </Badge>
                            ))}
                        </div>

                        {/* Add New Tag */}
                        <div className="flex gap-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Add a tag..."
                                onKeyPress={(e) =>
                                    e.key === "Enter" && handleAddTag()
                                }
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleAddTag}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Suggested Tags */}
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                                Suggested tags:
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {tagSuggestions
                                    .filter(
                                        (tag) => !formData.tags.includes(tag)
                                    )
                                    .map((tag) => (
                                        <Badge
                                            key={tag}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    tags: [...prev.tags, tag],
                                                }))
                                            }
                                        >
                                            + {tag}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Song Structure (Preview) */}
                    <div className="space-y-2">
                        <Label>Song Structure</Label>
                        <Textarea
                            placeholder="Verse 1 - Chorus - Verse 2 - Chorus - Bridge - Chorus (x2)"
                            className="min-h-[80px] resize-none"
                            readOnly
                            value="Verse 1 - Chorus - Verse 2 - Chorus - Bridge - Chorus (x2)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Song structure is automatically generated from your
                            arrangement. Edit in the Arrangement Editor.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditSongModal;
