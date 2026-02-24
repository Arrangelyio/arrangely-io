import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Settings, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SectionSetting {
  id: string;
  section_key: string;
  is_visible: boolean;
  display_order: number;
}

interface FeaturedLesson {
  id: string;
  lesson_id: string;
  section_key: string;
  display_order: number;
  lesson?: {
    title: string;
    slug: string;
  };
}

export const LessonSectionManager = () => {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string>("featured_courses");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");

  // Fetch section settings
  const { data: sectionSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["lesson-section-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_section_settings")
        .select("*")
        .order("display_order");
      
      if (error) throw error;
      return data as SectionSetting[];
    },
  });

  // Fetch featured lessons
  const { data: featuredLessons, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_lessons")
        .select(`
          *,
          lesson:lessons(title, slug)
        `)
        .order("display_order");
      
      if (error) throw error;
      return data as FeaturedLesson[];
    },
  });

  // Fetch all published lessons
  const { data: allLessons } = useQuery({
    queryKey: ["all-lessons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("id, title, slug")
        .eq("status", "published")
        .eq("is_production", true)
        .order("title");
      
      if (error) throw error;
      return data;
    },
  });

  // Toggle section visibility
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("lesson_section_settings")
        .update({ is_visible })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-section-settings"] });
      toast.success("Section visibility updated");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Add featured lesson
  const addFeaturedLesson = useMutation({
    mutationFn: async () => {
      if (!selectedLessonId) return;
      
      const maxOrder = featuredLessons
        ?.filter(l => l.section_key === selectedSection)
        .reduce((max, l) => Math.max(max, l.display_order), 0) || 0;

      const { error } = await supabase
        .from("featured_lessons")
        .insert({
          lesson_id: selectedLessonId,
          section_key: selectedSection,
          display_order: maxOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-lessons"] });
      setSelectedLessonId("");
      toast.success("Lesson added to featured section");
    },
    onError: (error) => {
      toast.error(`Failed to add lesson: ${error.message}`);
    },
  });

  // Remove featured lesson
  const removeFeaturedLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("featured_lessons")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured-lessons"] });
      toast.success("Lesson removed from featured section");
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const getSectionTitle = (key: string) => {
    switch(key) {
      case "master_musical_journey": return "Master Your Musical Journey";
      case "featured_courses": return "Featured Courses";
      default: return key;
    }
  };

  if (loadingSettings) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Lesson Section Management</CardTitle>
          </div>
          <CardDescription>
            Control which sections are visible on the Lessons page and manage featured content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Visibility Controls */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Section Visibility</h3>
            {sectionSettings?.map((setting) => (
              <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {setting.is_visible ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor={setting.id} className="text-base cursor-pointer">
                      {getSectionTitle(setting.section_key)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Order: {setting.display_order}
                    </p>
                  </div>
                </div>
                <Switch
                  id={setting.id}
                  checked={setting.is_visible}
                  onCheckedChange={(checked) => 
                    toggleVisibility.mutate({ id: setting.id, is_visible: checked })
                  }
                />
              </div>
            ))}
          </div>

          {/* Featured Lessons Management */}
          <div className="space-y-4 pt-6 border-t">
            <h3 className="font-semibold text-sm">Manage Featured Lessons</h3>
            
            {/* Add Lesson Form */}
            <div className="flex gap-3">
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_musical_journey">Master Your Musical Journey</SelectItem>
                  <SelectItem value="featured_courses">Featured Courses</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select lesson to feature" />
                </SelectTrigger>
                <SelectContent>
                  {allLessons?.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => addFeaturedLesson.mutate()}
                disabled={!selectedLessonId || addFeaturedLesson.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Featured Lessons by Section */}
            <div className="space-y-4">
              {["master_musical_journey", "featured_courses"].map((sectionKey) => {
                const lessons = featuredLessons?.filter(l => l.section_key === sectionKey) || [];
                
                return (
                  <div key={sectionKey} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {getSectionTitle(sectionKey)}
                    </h4>
                    {lessons.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No lessons featured in this section</p>
                    ) : (
                      <div className="grid gap-2">
                        {lessons.map((featured, idx) => (
                          <div key={featured.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                              <span className="text-sm">{featured.lesson?.title || "Unknown Lesson"}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFeaturedLesson.mutate(featured.id)}
                              disabled={removeFeaturedLesson.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};