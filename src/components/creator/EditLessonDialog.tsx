import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Info,
  Settings,
  DollarSign,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { z } from "zod";
import LearningOutcomesEditor from "./LearningOutcomesEditor";

const lessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be less than 2000 characters"),
  category: z.enum([
    "instrument",
    "theory",
    "production",
    "worship_leading",
    "songwriting",
  ]),
  subcategory: z.string().optional(),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced", "master"]),
  lesson_type: z.enum(["video", "live", "hybrid", "interactive"]),
  // duration_minutes: z.number().min(0).max(1000),
  price: z.number().min(0),
  is_free: z.boolean(),
  learning_outcomes: z.array(z.string()).optional(),
});

interface EditLessonDialogProps {
  lessonId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditLessonDialog({
  lessonId,
  open,
  onOpenChange,
}: EditLessonDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "instrument",
    subcategory: "",
    difficulty_level: "beginner",
    lesson_type: "video",
    // duration_minutes: 0,
    original_price: 0,
    price: 0,
    is_free: false,
    is_unlisted: false,
    learning_outcomes: [] as string[],
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && lessonId) {
      fetchLessonData();
    }
  }, [open, lessonId]);

  const fetchLessonData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "title, description, category, subcategory, difficulty_level, lesson_type, original_price, price, is_free, is_unlisted, cover_image_url, learning_outcomes"
        )
        .eq("id", lessonId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "instrument",
          subcategory: data.subcategory || "",
          difficulty_level: data.difficulty_level || "beginner",
          lesson_type: data.lesson_type || "video",
          // duration_minutes: data.duration_minutes,
          original_price: data.original_price,
          price: data.price,
          is_free: data.is_free || false,
          is_unlisted: data.is_unlisted || false,
          learning_outcomes: data.learning_outcomes || [],
        });
        setCurrentCoverUrl(data.cover_image_url);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load music lab data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    setCoverImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const updateLessonMutation = useMutation({
    mutationFn: async () => {
      // Validate form data
      const validatedData = lessonSchema.parse(formData);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let cover_image_url = currentCoverUrl;

      // Upload new cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("lesson-covers")
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("lesson-covers").getPublicUrl(fileName);

        cover_image_url = publicUrl;
      }

      // Update lesson
      const { error } = await supabase
        .from("lessons")
        .update({
          ...validatedData,
          cover_image_url,
          is_unlisted: formData.is_unlisted,
          original_price: formData.original_price,
          learning_outcomes: formData.learning_outcomes,
        })
        .eq("id", lessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-lessons"] });
      toast({
        title: "Success",
        description: "Music Lab updated successfully",
      });
      onOpenChange(false);
      // Reset form
      setCoverImage(null);
      setCoverPreview(null);
      setActiveTab("basic");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update music lab",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    try {
      lessonSchema.parse(formData);
      updateLessonMutation.mutate();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Music Lab Details</DialogTitle>
          <DialogDescription>
            Update your music lab information, thumbnail, pricing, and other
            details
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="gap-2">
                  <Info className="h-4 w-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="details" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="pricing" className="gap-2">
                  {/* <DollarSign className="h-4 w-4" /> */}
                  Cover & Pricing
                </TabsTrigger>
              </TabsList>

              {/* Basic Information */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Music Lab Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g., Beginner Piano Fundamentals"
                    required
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what students will learn..."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.description.length}/2000 characters
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={() => setActiveTab("details")}>
                    Next
                  </Button>
                </div>
              </TabsContent>

              {/* Details */}
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          category: value,
                        })
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instrument">Instrument</SelectItem>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="worship_leading">
                          Worship Leading
                        </SelectItem>
                        <SelectItem value="songwriting">Songwriting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subcategory">Subcategory</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          subcategory: value,
                        })
                      }
                    >
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keyboard">Keyboard</SelectItem>
                        <SelectItem value="drums">Drums</SelectItem>
                        <SelectItem value="bass">Bass</SelectItem>
                        <SelectItem value="guitar">Guitar</SelectItem>
                        <SelectItem value="saxophone">Saxophone</SelectItem>
                        <SelectItem value="vocal">Vocal</SelectItem>
                        <SelectItem value="piano">Piano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select
                      value={formData.difficulty_level}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          difficulty_level: value,
                        })
                      }
                    >
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate
                        </SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="master">Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Music Lab Type</Label>
                    <Select
                      value={formData.lesson_type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          lesson_type: value,
                        })
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="interactive">Interactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    {/* <Label htmlFor="duration">
                                            Duration (minutes)
                                        </Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="0"
                                            max="1000"
                                            value={formData.duration_minutes}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    duration_minutes: parseInt(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                        /> */}
                  </div>
                </div>

                <div className="pt-4">
                  <LearningOutcomesEditor
                    outcomes={formData.learning_outcomes}
                    onChange={(outcomes) =>
                      setFormData({
                        ...formData,
                        learning_outcomes: outcomes,
                      })
                    }
                  />
                </div>

                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("basic")}
                  >
                    Back
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("pricing")}>
                    Next
                  </Button>
                </div>
              </TabsContent>

              {/* Cover & Pricing */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="cover">Cover Image</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a new cover or keep the existing one
                  </p>
                  <div className="space-y-4">
                    {(coverPreview || currentCoverUrl) && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                        <img
                          src={coverPreview || currentCoverUrl || ""}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {!coverPreview && !currentCoverUrl && (
                      <div className="flex items-center justify-center w-full aspect-video rounded-lg border border-dashed bg-muted/50">
                        <div className="text-center">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No cover image
                          </p>
                        </div>
                      </div>
                    )}
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="is_free"
                      checked={formData.is_free}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_free: e.target.checked,
                          price: e.target.checked ? 0 : formData.price,
                        })
                      }
                      className="h-5 w-5 cursor-pointer"
                    />
                    <Label htmlFor="is_free" className="cursor-pointer">
                      Make this music lab free
                    </Label>
                  </div>

                  {!formData.is_free && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="original_price">
                          Original Price (Rp)
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Optional: Set the original price before discount
                        </p>
                        <Input
                          id="original_price"
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.original_price ?? ""}
                          onChange={(e) => {
                            let val = e.target.value;
                            val = val.replace(/^0+(?=\d)/, "");

                            setFormData({
                              ...formData,
                              original_price: val ? parseInt(val) : 0,
                            });
                          }}
                          placeholder="100000"
                        />
                      </div>

                      <div>
                        <Label htmlFor="price">
                          Price (Rp){" "}
                          {formData.original_price ? "(Discounted)" : ""}
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          {formData.original_price
                            ? "Set the discounted price students will pay"
                            : "Set a fair price for your music lab"}
                        </p>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.price ?? ""}
                          onChange={(e) => {
                            let val = e.target.value;

                            // remove leading zeros
                            val = val.replace(/^0+(?=\d)/, "");

                            setFormData({
                              ...formData,
                              price: val ? parseInt(val) : 0,
                            });
                          }}
                          placeholder="50000"
                        />
                      </div>

                      {formData.original_price &&
                        formData.price &&
                        formData.original_price > formData.price && (
                          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                              💰 Discount:{" "}
                              {Math.round(
                                (1 - formData.price / formData.original_price) *
                                  100
                              )}
                              % off
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 border rounded-lg mt-4">
                    <input
                      type="checkbox"
                      id="is_unlisted"
                      checked={formData.is_unlisted}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_unlisted: e.target.checked,
                        })
                      }
                      className="h-5 w-5 cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="is_unlisted" className="cursor-pointer">
                        Make this music lab unlisted
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Unlisted lessons can only be accessed via direct link
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("details")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLessonMutation.isPending}
                  >
                    {updateLessonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
