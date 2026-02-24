import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Info, Settings, DollarSign, Check } from "lucide-react";
import LearningOutcomesEditor from "@/components/creator/LearningOutcomesEditor";

interface CreateLessonProps {
  onBack?: () => void;
  onSuccess?: (lessonId: string) => void;
}

export default function CreateLesson({
  onBack,
  onSuccess,
}: CreateLessonProps = {}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "instrument",
    subcategory: "",
    difficulty_level: "beginner",
    lesson_type: "video",
    // duration_minutes: 0,
    original_price: null,
    price: null,
    is_free: false,
    is_unlisted: false,
    learning_outcomes: [] as string[],
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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

  const canProceedToDetails = formData.title.trim().length > 0;
  const canProceedToPricing = canProceedToDetails;

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if user has introduction video set up
      const { data: profile } = await supabase
        .from("profiles")
        .select("introduction_video_url, introduction_title")
        .eq("user_id", user.id)
        .single();

      if (!profile?.introduction_video_url || !profile?.introduction_title) {
        throw new Error(
          "Please set up your introduction video first before creating lessons."
        );
      }

      let cover_image_url = null;

      // Upload cover image if provided
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

      // Create lesson
      const { data: lesson, error } = await supabase
        .from("lessons")
        .insert({
          ...formData,
          creator_id: user.id,
          cover_image_url,
          status: "draft",
          is_production: true,
          is_unlisted: formData.is_unlisted,
          original_price: formData.original_price,
          learning_outcomes: formData.learning_outcomes,
        })
        .select()
        .single();

      if (error) throw error;
      return lesson;
    },
    onSuccess: (lesson) => {
      toast.success("Lesson created! Now add modules and content.");
      if (onSuccess) {
        onSuccess(lesson.id);
      } else {
        navigate(`/creator/arrangely-music-lab/${lesson.id}/content`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create music lab");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a music lab title");
      return;
    }
    createLessonMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => (onBack ? onBack() : navigate("/creator-dashboard"))}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Music Lab</CardTitle>
          <p className="text-sm text-muted-foreground">
            Follow the steps below to create your music lab
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="basic" className="gap-2">
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Basic Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="gap-2"
                  disabled={!canProceedToDetails}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="pricing"
                  className="gap-2"
                  disabled={!canProceedToPricing}
                >
                  {/* <DollarSign className="h-4 w-4" /> */}
                  <span className="hidden sm:inline">Cover & Pricing</span>
                </TabsTrigger>
              </TabsList>

              {/* Step 1: Basic Information */}
              <TabsContent value="basic" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-base font-semibold">
                      Music Lab Title *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Choose a clear, descriptive title for your music lab
                    </p>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g., Beginner Piano Fundamentals"
                      className="text-base"
                      required
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-base font-semibold"
                    >
                      Description
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Describe what students will learn in this music lab
                    </p>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="In this music lab, you'll learn the fundamentals of piano playing, including proper hand positioning, basic scales, and simple melodies..."
                      rows={6}
                      className="text-base"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("details")}
                    disabled={!canProceedToDetails}
                  >
                    Next: Details
                  </Button>
                </div>
              </TabsContent>

              {/* Step 2: Details */}
              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="category" className="text-base font-semibold">
                      Category
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select the main category
                    </p>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          category: value,
                          subcategory: "", // reset kalau bukan instrument
                        })
                      }
                    >
                      <SelectTrigger id="category" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
                        <SelectItem value="instrument">Instrument</SelectItem>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="worship_leading">Worship Leading</SelectItem>
                        <SelectItem value="songwriting">Songwriting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.category === "instrument" && (
                    <div>
                      <Label htmlFor="subcategory" className="text-base font-semibold">
                        Subcategory
                      </Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Select the instrument or specialty
                      </p>
                      <Select
                        value={formData.subcategory}
                        onValueChange={(value) =>
                          setFormData({ ...formData, subcategory: value })
                        }
                      >
                        <SelectTrigger id="subcategory" className="bg-background">
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border">
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
                  )}

                  <div>
                    <Label
                      htmlFor="difficulty"
                      className="text-base font-semibold"
                    >
                      Difficulty Level
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Who is this music lab for?
                    </p>
                    <Select
                      value={formData.difficulty_level}
                      onValueChange={(value) =>
                        setFormData({ ...formData, difficulty_level: value })
                      }
                    >
                      <SelectTrigger id="difficulty" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
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
                    <Label htmlFor="type" className="text-base font-semibold">
                      Music Lab Type
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Format of delivery
                    </p>
                    <Select
                      value={formData.lesson_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, lesson_type: value })
                      }
                    >
                      <SelectTrigger id="type" className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border">
                        <SelectItem value="video">Video</SelectItem>
                        {/* <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="interactive">Interactive</SelectItem> */}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* <div>
                    <Label
                      htmlFor="duration"
                      className="text-base font-semibold"
                    >
                      Duration (minutes)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Estimated completion time
                    </p>
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="60"
                    />
                  </div> */}
                </div>

                <div className="pt-4">
                  <LearningOutcomesEditor
                    outcomes={formData.learning_outcomes}
                    onChange={(outcomes) =>
                      setFormData({ ...formData, learning_outcomes: outcomes })
                    }
                  />
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("basic")}
                  >
                    Back
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("pricing")}>
                    Next: Cover & Pricing
                  </Button>
                </div>
              </TabsContent>

              {/* Step 3: Cover & Pricing */}
              <TabsContent value="pricing" className="space-y-6">
                <div>
                  <Label htmlFor="cover" className="text-base font-semibold">
                    Cover Image
                  </Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload an attractive cover image (recommended: 1280x720px)
                  </p>
                  <div className="space-y-4">
                    {coverPreview && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
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

                <div className="space-y-4 pt-4">
                  <div>
                    <Label className="text-base font-semibold">Pricing</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Set the price for your music lab or make it free
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-4 border rounded-lg">
                    <input
                      type="checkbox"
                      id="is_free"
                      checked={formData.is_free}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_free: e.target.checked,
                          price: e.target.checked ? null : formData.price,
                        })
                      }
                      className="h-5 w-5 cursor-pointer"
                    />
                    <Label
                      htmlFor="is_free"
                      className="cursor-pointer text-base"
                    >
                      Make this music lab free for all students
                    </Label>
                  </div>

                  {!formData.is_free && (
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="original_price"
                          className="text-base font-semibold"
                        >
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
                          value={formData.original_price || ""}
                          onChange={(e) => {
                              let val = e.target.value;
                              val = val.replace(/^0+(?=\d)/, "");

                              setFormData({
                              ...formData,
                              original_price: val ? parseInt(val) : 0,
                              });
                          }}
                          placeholder="100000"
                          className="text-lg"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="price"
                          className="text-base font-semibold"
                        >
                          Price (Rp) {formData.original_price ? "(Discounted)" : ""}
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
                          value={formData.price || ""}
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
                          className="text-lg"
                        />
                      </div>

                      {formData.original_price && formData.price && formData.original_price > formData.price && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                            💰 Discount: {Math.round((1 - formData.price / formData.original_price) * 100)}% off
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 border rounded-lg">
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
                      <Label
                        htmlFor="is_unlisted"
                        className="cursor-pointer text-base"
                      >
                        Make this music lab unlisted
                      </Label>
                      <p className="text-sm text-muted-foreground">
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
                    disabled={createLessonMutation.isPending}
                    className="gap-2"
                  >
                    {createLessonMutation.isPending ? (
                      "Creating..."
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Create Music Lab
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
