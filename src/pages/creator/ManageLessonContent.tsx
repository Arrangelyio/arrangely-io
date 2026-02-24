import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    Plus,
    ArrowLeft,
    Video,
    FileText,
    Music,
    Trash2,
    GripVertical,
    BookOpen,
    Settings,
    Pencil,
    CheckCircle,
    ArrowUp,
    ArrowDown,
} from "lucide-react";
import VideoPreview from "@/components/creator/VideoPreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoUploadRecorderWithTUS from "@/components/creator/VideoUploadRecorderWithTUS";
import ExerciseBuilder from "@/components/creator/ExerciseBuilder";
import ResourceUploader from "@/components/creator/ResourceUploader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ManageLessonContentProps {
    lessonId?: string;
    onBack?: () => void;
}

export default function ManageLessonContent({
    lessonId: propLessonId,
    onBack,
}: ManageLessonContentProps = {}) {
    const { lessonId: paramLessonId } = useParams();
    const navigate = useNavigate();
    const lessonId = propLessonId || paramLessonId;
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [openModuleDialog, setOpenModuleDialog] = useState(false);
    const [openContentDialog, setOpenContentDialog] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState<string>("");
    const [editingContentId, setEditingContentId] = useState<string | null>(
        null
    );
    const [moduleForm, setModuleForm] = useState({
        title: "",
        description: "",
    });
    const [contentForm, setContentForm] = useState<{
        title: string;
        content_type: "video" | "exercise" | "resource";
        video_url: string;
        resource_url?: string;
        duration_minutes: number;
        is_preview: boolean;
        exercise_data?: any;
    }>({
        title: "",
        content_type: "video",
        video_url: "",
        resource_url: "",
        duration_minutes: null,
        is_preview: false,
    });
    const [showVideoUpload, setShowVideoUpload] = useState(false);
    const [showExerciseBuilder, setShowExerciseBuilder] = useState(false);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

    // Fetch lesson details
    const { data: lesson } = useQuery({
        queryKey: ["lesson", lessonId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select("*")
                .eq("id", lessonId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const updateModuleMutation = useMutation({
        mutationFn: async ({
            id,
            title,
            description,
        }: {
            id: string;
            title: string;
            description: string;
        }) => {
            const { data, error } = await supabase
                .from("lesson_modules")
                .update({
                    title,
                    description,
                })
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Module updated successfully" });
            setModuleForm({ title: "", description: "" });
            setEditingModuleId(null);
            setOpenModuleDialog(false);
        },
    });

    // Fetch modules and content
    const { data: modules } = useQuery({
        queryKey: ["lesson-modules", lessonId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lesson_modules")
                .select(
                    `
          *,
          lesson_content (*)
        `
                )
                .eq("lesson_id", lessonId)
                .order("order_index", { ascending: true }) // Urutkan Modules
                .order("order_index", {
                    foreignTable: "lesson_content",
                    ascending: true,
                }); // Urutkan Content di dalamnya

            if (error) throw error;
            return data;
        },
    });

    // Create module mutation
    const createModuleMutation = useMutation({
        mutationFn: async (newModule: {
            title: string;
            description: string;
        }) => {
            const maxOrder = modules?.length || 0;
            const { data, error } = await supabase
                .from("lesson_modules")
                .insert({
                    lesson_id: lessonId!,
                    title: newModule.title,
                    description: newModule.description,
                    order_index: maxOrder,
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Module created successfully" });
            setModuleForm({ title: "", description: "" });
            setOpenModuleDialog(false);
        },
    });

    // Create content mutation
    const createContentMutation = useMutation({
        mutationFn: async (newContent: any) => {
            // Verify user is authenticated
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("You must be logged in to create content");
            }

            const module = modules?.find((m) => m.id === selectedModuleId);
            const maxOrder = module?.lesson_content?.length || 0;

            // Verify the module belongs to a lesson owned by this creator
            const { data: moduleData, error: moduleError } = await supabase
                .from("lesson_modules")
                .select("lesson_id, lessons!inner(creator_id)")
                .eq("id", selectedModuleId)
                .single();

            if (moduleError) {
                console.error("Module verification error:", moduleError);
                throw new Error("Failed to verify module ownership");
            }

            if (!moduleData || moduleData.lessons.creator_id !== user.id) {
                throw new Error(
                    "You don't have permission to add content to this module"
                );
            }

            // First create the lesson_content record
            const { data: contentData, error: contentError } = await supabase
                .from("lesson_content")
                .insert({
                    module_id: selectedModuleId,
                    title: newContent.title,
                    content_type: newContent.content_type,
                    video_url: newContent.video_url,
                    resource_url: newContent.resource_url,
                    duration_minutes: newContent.duration_minutes,
                    is_preview: newContent.is_preview,
                    order_index: maxOrder,
                })
                .select()
                .single();

            if (contentError) {
                console.error("Content creation error:", contentError);
                throw contentError;
            }

            // If content_type is exercise, create the interactive_exercises record linked to this content
            if (
                newContent.content_type === "exercise" &&
                newContent.exercise_data
            ) {
                const { error: exerciseError } = await supabase
                    .from("interactive_exercises")
                    .insert({
                        content_id: contentData.id,
                        exercise_type: newContent.exercise_data.exercise_type,
                        exercise_data:
                            newContent.exercise_data.exercise_data || {},
                        difficulty: newContent.exercise_data.difficulty || 1,
                        completion_criteria: newContent.exercise_data
                            .completion_criteria || { min_accuracy: 70 },
                    })
                    .select()
                    .single();

                if (exerciseError) throw exerciseError;
            }

            return contentData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Content added successfully" });
            setContentForm({
                title: "",
                content_type: "video",
                video_url: "",
                resource_url: "",
                duration_minutes: 0,
                is_preview: false,
            });
            setOpenContentDialog(false);
        },
    });

    // Delete module mutation
    const deleteModuleMutation = useMutation({
        mutationFn: async (moduleId: string) => {
            const { error } = await supabase
                .from("lesson_modules")
                .delete()
                .eq("id", moduleId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Module deleted" });
        },
    });

    const reorderContentMutation = useMutation({
        mutationFn: async (items: { id: string; order_index: number }[]) => {
            const updates = items.map(async (item) => {
                const { error } = await supabase
                    .from("lesson_content")
                    .update({ order_index: item.order_index })
                    .eq("id", item.id);

                if (error) throw error;
            });

            // Tunggu semua update selesai secara eksplisit
            await Promise.all(updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
        },
        onError: (error) => {
            toast({
                title: "Error reordering content",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleMoveContent = (
        moduleId: string,
        currentIndex: number,
        direction: "up" | "down"
    ) => {
        const module = modules?.find((m: any) => m.id === moduleId);
        if (!module || !module.lesson_content) return;

        const contentList = [...module.lesson_content];
        const targetIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;

        // Validasi agar tidak out of bound
        if (targetIndex < 0 || targetIndex >= contentList.length) return;

        const currentItem = contentList[currentIndex];
        const targetItem = contentList[targetIndex];

        // Swap order_index value
        // Asumsi: data dari DB sudah ada order_index, jika null gunakan index array
        const currentOrder = currentItem.order_index ?? currentIndex;
        const targetOrder = targetItem.order_index ?? targetIndex;

        reorderContentMutation.mutate([
            { id: currentItem.id, order_index: targetOrder },
            { id: targetItem.id, order_index: currentOrder },
        ]);
    };

    // Update content mutation
    const updateContentMutation = useMutation({
        mutationFn: async ({
            contentId,
            updates,
        }: {
            contentId: string;
            updates: any;
        }) => {
            // Update the lesson_content record
            const { data, error } = await supabase
                .from("lesson_content")
                .update({
                    title: updates.title,
                    content_type: updates.content_type,
                    video_url: updates.video_url,
                    resource_url: updates.resource_url,
                    duration_minutes: updates.duration_minutes,
                    is_preview: updates.is_preview,
                })
                .eq("id", contentId)
                .select()
                .single();

            if (error) throw error;

            // If it's an exercise update, also update the interactive_exercises record
            if (updates.content_type === "exercise" && updates.exercise_data) {
                // First check if an exercise record exists
                const { data: existingExercise } = await supabase
                    .from("interactive_exercises")
                    .select("id")
                    .eq("content_id", contentId)
                    .single();

                if (existingExercise) {
                    // Update existing exercise
                    const { error: exerciseError } = await supabase
                        .from("interactive_exercises")
                        .update({
                            exercise_type: updates.exercise_data.exercise_type,
                            exercise_data:
                                updates.exercise_data.exercise_data || {},
                            difficulty: updates.exercise_data.difficulty || 1,
                            completion_criteria: updates.exercise_data
                                .completion_criteria || { min_accuracy: 70 },
                        })
                        .eq("content_id", contentId);

                    if (exerciseError) throw exerciseError;
                } else {
                    // Create new exercise record
                    const { error: exerciseError } = await supabase
                        .from("interactive_exercises")
                        .insert({
                            content_id: contentId,
                            exercise_type: updates.exercise_data.exercise_type,
                            exercise_data:
                                updates.exercise_data.exercise_data || {},
                            difficulty: updates.exercise_data.difficulty || 1,
                            completion_criteria: updates.exercise_data
                                .completion_criteria || { min_accuracy: 70 },
                        });

                    if (exerciseError) throw exerciseError;
                }
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Content updated successfully" });
            setContentForm({
                title: "",
                content_type: "video",
                video_url: "",
                resource_url: "",
                duration_minutes: 0,
                is_preview: false,
            });
            setEditingContentId(null);
            setOpenContentDialog(false);
        },
    });

    // Delete content mutation
    const deleteContentMutation = useMutation({
        mutationFn: async (contentId: string) => {
            const { error } = await supabase
                .from("lesson_content")
                .delete()
                .eq("id", contentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["lesson-modules", lessonId],
            });
            toast({ title: "Content deleted" });
        },
    });

    const getContentIcon = (type: string) => {
        switch (type) {
            case "video":
                return <Video className="h-4 w-4" />;
            case "exercise":
                return <BookOpen className="h-4 w-4" />;
            case "resource":
                return <FileText className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Button
                        variant="ghost"
                        onClick={() =>
                            onBack ? onBack() : navigate("/creator-dashboard")
                        }
                        className="mb-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to {onBack ? "Lessons" : "Dashboard"}
                    </Button>
                    <h1 className="text-3xl font-bold">{lesson?.title}</h1>
                    <p className="text-muted-foreground">
                        Manage lesson content
                    </p>
                </div>

                <Dialog
                    open={openModuleDialog}
                    onOpenChange={(open) => {
                        setOpenModuleDialog(open);
                        // Reset form jika dialog ditutup
                        if (!open) {
                            setModuleForm({ title: "", description: "" });
                            setEditingModuleId(null);
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            onClick={() => {
                                setModuleForm({ title: "", description: "" });
                                setEditingModuleId(null);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Module
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            {/* Ubah Title secara dinamis */}
                            <DialogTitle>
                                {editingModuleId
                                    ? "Edit Module"
                                    : "Create New Module"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Module Title</Label>
                                <Input
                                    value={moduleForm.title}
                                    onChange={(e) =>
                                        setModuleForm({
                                            ...moduleForm,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="e.g., Introduction to Guitar"
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={moduleForm.description}
                                    onChange={(e) =>
                                        setModuleForm({
                                            ...moduleForm,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Brief description of this module"
                                />
                            </div>
                            <Button
                                onClick={() => {
                                    if (editingModuleId) {
                                        // Panggil Update Mutation
                                        updateModuleMutation.mutate({
                                            id: editingModuleId,
                                            ...moduleForm,
                                        });
                                    } else {
                                        // Panggil Create Mutation
                                        createModuleMutation.mutate(moduleForm);
                                    }
                                }}
                                disabled={
                                    !moduleForm.title ||
                                    createModuleMutation.isPending ||
                                    updateModuleMutation.isPending
                                }
                                className="w-full"
                            >
                                {/* Ubah teks tombol secara dinamis */}
                                {editingModuleId
                                    ? updateModuleMutation.isPending
                                        ? "Saving..."
                                        : "Save Changes"
                                    : createModuleMutation.isPending
                                    ? "Creating..."
                                    : "Create Module"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Modules List */}
            <div className="space-y-6">
                {modules?.length === 0 && (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground mb-4">
                            No modules yet. Start by creating your first module.
                        </p>
                        <Button onClick={() => setOpenModuleDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Module
                        </Button>
                    </Card>
                )}

                {modules?.map((module: any, idx: number) => (
                    <Card key={module.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                                <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {idx + 1}. {module.title}
                                    </h3>
                                    {module.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {module.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedModuleId(module.id);
                                        setOpenContentDialog(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Content
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingModuleId(module.id);
                                        setModuleForm({
                                            title: module.title,
                                            description:
                                                module.description || "",
                                        });
                                        setOpenModuleDialog(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        deleteModuleMutation.mutate(module.id)
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Content Items */}
                        <div className="space-y-2 pl-8">
                            {module.lesson_content?.map(
                                (content: any, index: number) => (
                                    <div
                                        key={content.id}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-5 w-5"
                                                    // Now 'index' is defined
                                                    disabled={
                                                        index === 0 ||
                                                        reorderContentMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        handleMoveContent(
                                                            module.id,
                                                            index,
                                                            "up"
                                                        )
                                                    }
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-5 w-5"
                                                    // Now 'index' is defined
                                                    disabled={
                                                        index ===
                                                            module
                                                                .lesson_content
                                                                .length -
                                                                1 ||
                                                        reorderContentMutation.isPending
                                                    }
                                                    onClick={() =>
                                                        handleMoveContent(
                                                            module.id,
                                                            index,
                                                            "down"
                                                        )
                                                    }
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            {getContentIcon(
                                                content.content_type
                                            )}
                                            <div>
                                                <p className="font-medium">
                                                    {content.title}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>
                                                        {content.content_type}
                                                    </span>
                                                    {content.duration_minutes >
                                                        0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span>
                                                                {
                                                                    content.duration_minutes
                                                                }{" "}
                                                                min
                                                            </span>
                                                        </>
                                                    )}
                                                    {content.is_preview && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-primary">
                                                                Preview
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                    setEditingContentId(
                                                        content.id
                                                    );
                                                    setSelectedModuleId(
                                                        module.id
                                                    );

                                                    // If it's an exercise, fetch the exercise data
                                                    let exerciseData =
                                                        undefined;
                                                    if (
                                                        content.content_type ===
                                                        "exercise"
                                                    ) {
                                                        const { data } =
                                                            await supabase
                                                                .from(
                                                                    "interactive_exercises"
                                                                )
                                                                .select("*")
                                                                .eq(
                                                                    "content_id",
                                                                    content.id
                                                                )
                                                                .single();

                                                        if (data) {
                                                            exerciseData = {
                                                                exercise_type:
                                                                    data.exercise_type,
                                                                exercise_data:
                                                                    data.exercise_data,
                                                                difficulty:
                                                                    data.difficulty,
                                                                completion_criteria:
                                                                    data.completion_criteria,
                                                            };
                                                        }
                                                    }

                                                    setContentForm({
                                                        title: content.title,
                                                        content_type:
                                                            content.content_type,
                                                        video_url:
                                                            content.video_url ||
                                                            "",
                                                        resource_url:
                                                            content.resource_url ||
                                                            "",
                                                        duration_minutes:
                                                            content.duration_minutes ||
                                                            0,
                                                        is_preview:
                                                            content.is_preview ||
                                                            false,
                                                        exercise_data:
                                                            exerciseData,
                                                    });
                                                    setOpenContentDialog(true);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    deleteContentMutation.mutate(
                                                        content.id
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            )}
                            {(!module.lesson_content ||
                                module.lesson_content.length === 0) && (
                                <p className="text-sm text-muted-foreground py-2">
                                    No content yet. Click "Add Content" to get
                                    started.
                                </p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Add Content Dialog */}
            <Dialog
                open={openContentDialog}
                onOpenChange={(open) => {
                    setOpenContentDialog(open);
                    if (!open) {
                        setEditingContentId(null);
                        setContentForm({
                            title: "",
                            content_type: "video",
                            video_url: "",
                            resource_url: "",
                            duration_minutes: 0,
                            is_preview: false,
                        });
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {editingContentId
                                ? "Edit Content"
                                : "Add New Content"}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {editingContentId
                                ? "Update your lesson content"
                                : "Create engaging content for your students"}
                        </p>
                    </DialogHeader>
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="content">
                                Content Details
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Basic Info */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div>
                                <Label className="text-base font-semibold">
                                    Content Title
                                </Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Give this content a clear, descriptive title
                                </p>
                                <Input
                                    value={contentForm.title}
                                    onChange={(e) =>
                                        setContentForm({
                                            ...contentForm,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="e.g., Introduction Video"
                                    className="text-base"
                                />
                            </div>

                            <div>
                                <Label className="text-base font-semibold">
                                    Content Type
                                </Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Choose the type of content you want to add
                                </p>
                                <Select
                                    value={contentForm.content_type}
                                    onValueChange={(value: any) =>
                                        setContentForm({
                                            ...contentForm,
                                            content_type: value,
                                        })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="video">
                                            <div className="flex items-center gap-2">
                                                <Video className="h-4 w-4" />
                                                <span>Video Music Lab</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="exercise">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4" />
                                                <span>
                                                    Interactive Exercise
                                                </span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="resource">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span>Resource/Document</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-base font-semibold">
                                    Duration (minutes)
                                </Label>
                                <p className="text-sm text-muted-foreground mb-2">
                                    Estimated time to complete this content
                                </p>
                                <Input
                                    type="number"
                                    value={contentForm.duration_minutes}
                                    onChange={(e) =>
                                        setContentForm({
                                            ...contentForm,
                                            duration_minutes:
                                                parseInt(e.target.value) || 0,
                                        })
                                    }
                                    placeholder="15"
                                />
                            </div>

                            {/* LOGIC: Hanya tampilkan Free Preview jika content_type adalah 'video' */}
                            {contentForm.content_type === "video" && (
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <Label className="text-base font-semibold">
                                            Free Preview
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow students to access this
                                            content for free
                                        </p>
                                    </div>
                                    <Switch
                                        checked={contentForm.is_preview}
                                        onCheckedChange={(checked) =>
                                            setContentForm({
                                                ...contentForm,
                                                is_preview: checked,
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 2: Content Details */}
                        <TabsContent
                            value="content"
                            className="space-y-4 mt-4 max-h-[calc(90vh-16rem)] overflow-y-auto pr-2"
                        >
                            {contentForm.content_type === "video" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-semibold">
                                            Video Source
                                        </Label>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Add a video URL or upload/record
                                            your own
                                        </p>
                                    </div>

                                    {/* Video Preview Section --> Diubah menjadi Status Upload */}
                                    {contentForm.video_url &&
                                        !showVideoUpload && (
                                            <div className="space-y-3 border rounded-lg p-4 bg-muted/50">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-medium">
                                                        Current Video
                                                    </Label>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            setContentForm({
                                                                ...contentForm,
                                                                video_url: "",
                                                                duration_minutes: 0,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>

                                                {/* GANTI <VideoPreview> DENGAN BLOK INI */}
                                                <div className="flex items-center p-4 bg-background rounded-lg border border-green-200 dark:border-green-800">
                                                    <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                                                    <div>
                                                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                                            Video Uploaded
                                                            Successfully
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Video sedang
                                                            diproses dan akan
                                                            segera tersedia.
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* --- AKHIR PERUBAHAN --- */}
                                            </div>
                                        )}

                                    {!showVideoUpload &&
                                        !contentForm.video_url && (
                                            <div className="space-y-3">
                                                <div>
                                                    <Label>Video URL</Label>
                                                    <Input
                                                        value={
                                                            contentForm.video_url
                                                        }
                                                        onChange={(e) =>
                                                            setContentForm({
                                                                ...contentForm,
                                                                video_url:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="https://youtube.com/watch?v=..."
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <span className="w-full border-t" />
                                                    </div>
                                                    <div className="relative flex justify-center text-xs uppercase">
                                                        <span className="bg-background px-2 text-muted-foreground">
                                                            Or
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setShowVideoUpload(true)
                                                    }
                                                    className="w-full"
                                                >
                                                    <Video className="h-4 w-4 mr-2" />
                                                    Upload or Record Video
                                                </Button>
                                            </div>
                                        )}

                                    {showVideoUpload && (
                                        <div>
                                            <VideoUploadRecorderWithTUS
                                                lessonId={lessonId!}
                                                onVideoUploaded={(
                                                    url,
                                                    duration
                                                ) => {
                                                    setContentForm({
                                                        ...contentForm,
                                                        video_url: url,
                                                        duration_minutes:
                                                            duration,
                                                    });
                                                    setShowVideoUpload(false);
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setShowVideoUpload(false)
                                                }
                                                className="w-full mt-2"
                                            >
                                                Cancel Upload
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {contentForm.content_type === "exercise" && (
                                <div className="space-y-4">
                                    {!showExerciseBuilder ? (
                                        <div>
                                            <div className="mb-4">
                                                <Label className="text-base font-semibold">
                                                    Interactive Exercise
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Create quizzes, performance
                                                    tasks, or ear training
                                                    exercises
                                                </p>
                                            </div>
                                            {contentForm.exercise_data ? (
                                                <div className="border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium">
                                                                Exercise
                                                                configured
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Type:{" "}
                                                                {
                                                                    contentForm
                                                                        .exercise_data
                                                                        .exercise_type
                                                                }{" "}
                                                                • Difficulty:{" "}
                                                                {
                                                                    contentForm
                                                                        .exercise_data
                                                                        .difficulty
                                                                }
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                setShowExerciseBuilder(
                                                                    true
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setShowExerciseBuilder(
                                                            true
                                                        )
                                                    }
                                                    className="w-full h-20"
                                                >
                                                    <BookOpen className="h-5 w-5 mr-2" />
                                                    Build Interactive Exercise
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <ExerciseBuilder
                                                initialData={
                                                    contentForm.exercise_data
                                                }
                                                category={lesson?.category}
                                                tier={lesson?.difficulty_level}
                                                subcategory={
                                                    lesson?.subcategory
                                                }
                                                onSave={(exerciseData) => {
                                                    setContentForm({
                                                        ...contentForm,
                                                        exercise_data:
                                                            exerciseData,
                                                    });
                                                    setShowExerciseBuilder(
                                                        false
                                                    );
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() =>
                                                    setShowExerciseBuilder(
                                                        false
                                                    )
                                                }
                                                className="w-full mt-2"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {contentForm.content_type === "resource" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-base font-semibold">
                                            Resource Content
                                        </Label>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Add documents, PDFs, or other
                                            learning materials
                                        </p>
                                    </div>
                                    <ResourceUploader
                                        lessonId={lessonId!}
                                        onResourceUploaded={(url) =>
                                            setContentForm({
                                                ...contentForm,
                                                resource_url: url,
                                            })
                                        }
                                        currentResourceUrl={
                                            contentForm.resource_url
                                        }
                                    />
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOpenContentDialog(false);
                                setShowVideoUpload(false);
                                setShowExerciseBuilder(false);
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        {!showExerciseBuilder && !showVideoUpload && (
                            <Button
                                onClick={() => {
                                    if (editingContentId) {
                                        updateContentMutation.mutate({
                                            contentId: editingContentId,
                                            updates: contentForm,
                                        });
                                    } else {
                                        createContentMutation.mutate(
                                            contentForm
                                        );
                                    }
                                }}
                                disabled={
                                    !contentForm.title ||
                                    (editingContentId
                                        ? updateContentMutation.isPending
                                        : createContentMutation.isPending) ||
                                    (contentForm.content_type === "video" &&
                                        !contentForm.video_url) ||
                                    (contentForm.content_type === "exercise" &&
                                        !contentForm.exercise_data) ||
                                    (contentForm.content_type === "resource" &&
                                        !contentForm.resource_url)
                                }
                                className="flex-1"
                            >
                                {editingContentId
                                    ? updateContentMutation.isPending
                                        ? "Updating..."
                                        : "Update Content"
                                    : createContentMutation.isPending
                                    ? "Adding..."
                                    : "Add Content"}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
