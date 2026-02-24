import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Plus, Settings, MoreVertical, Search, Trash2, Eye, FileText, Video, Edit, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreatorDashboard } from "./CreatorDashboardContext";
import ManageLessonContent from "@/pages/creator/ManageLessonContent";
import { useToast } from "@/hooks/use-toast";
import { CreatorIntroductionUpload } from "./CreatorIntroductionUpload";
import EditLessonDialog from "./EditLessonDialog";
import PerformanceReviews from "@/pages/creator/PerformanceReviews";

interface CreatorLessonsPanelProps {
  creatorProfile?: any;
}

export default function CreatorLessonsPanel({ creatorProfile }: CreatorLessonsPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedLessonId, setSelectedLessonId, setActiveTab } = useCreatorDashboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [introductionModalOpen, setIntroductionModalOpen] = useState(false);
  const [performanceReviewsModalOpen, setPerformanceReviewsModalOpen] = useState(false);
  const [editLessonId, setEditLessonId] = useState<string | null>(null);

  const { data: pendingCount } = useQuery({
    queryKey: ["pending-performance-reviews-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count } = await supabase
        .from("lesson_performance_recordings")
        .select("*, lessons!inner(creator_id)", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("lessons.creator_id", user.id);
      
      return count || 0;
    },
  });

  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ["creator-lessons", searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { lessons: [], total: 0 };
      
      let countQuery = supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", user.id);

      if (statusFilter !== "all") {
        countQuery = countQuery.eq("status", statusFilter);
      }

      if (searchQuery) {
        countQuery = countQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { count } = await countQuery;

      let query = supabase
        .from("lessons")
        .select("id, title, status, created_at, slug, cover_image_url, description")
        .eq("creator_id", user.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      query = query
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      const { data, error } = await query;
      if (error) throw error;
      return { lessons: data || [], total: count || 0 };
    },
  });

  const lessons = lessonsData?.lessons || [];
  const totalPages = Math.ceil((lessonsData?.total || 0) / itemsPerPage);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ lessonId, status }: { lessonId: string; status: string }) => {
      const { error } = await supabase
        .from("lessons")
        .update({ status })
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-lessons"] });
      setCurrentPage(1);
      toast({
        title: "Success",
        description: "Music Lab status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update music lab status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-lessons"] });
      setCurrentPage(1);
      toast({
        title: "Success",
        description: "Music Lab deleted successfully",
      });
      setDeleteDialogOpen(false);
      setLessonToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete music lab",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (lessonId: string) => {
    setLessonToDelete(lessonId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (lessonToDelete) {
      deleteMutation.mutate(lessonToDelete);
    }
  };

  // If a lesson is selected, show the content management view
  if (selectedLessonId) {
    return <ManageLessonContent lessonId={selectedLessonId} onBack={() => setSelectedLessonId(null)} />;
  }

  const hasIntroduction = creatorProfile?.introductionVideoUrl && creatorProfile?.introductionTitle;

  const handleCreateLesson = () => {
    if (!hasIntroduction) {
      toast({
        title: "Introduction Required",
        description: "Please set up your introduction video first before creating music lab.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab("create-lesson");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Your Music Labs</h2>
          <p className="text-sm text-muted-foreground">
            {hasIntroduction 
              ? "Create and manage your music lab from here"
              : "Upload your introduction video first to start creating music lab"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIntroductionModalOpen(true)} 
            variant="outline"
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            Introduction Video
          </Button>
          <Button 
            onClick={() => setPerformanceReviewsModalOpen(true)} 
            variant="outline"
            className="gap-2 relative"
          >
            <ClipboardCheck className="h-4 w-4" />
            Performance Reviews
            {pendingCount && pendingCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button 
            onClick={handleCreateLesson} 
            className="gap-2"
            disabled={!hasIntroduction}
          >
            <Plus className="h-4 w-4" />
            Create Music Lab
          </Button>
        </div>
      </div>

      {!hasIntroduction && (
        <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-2">
              <Video className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Introduction Video Required</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Before you can create music lab, you need to upload an introduction video. This video helps students get to know you and understand your teaching style.
              </p>
              <Button 
                onClick={() => setIntroductionModalOpen(true)} 
                variant="outline"
                size="sm"
                className="mt-3 gap-2 border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900"
              >
                <Video className="h-4 w-4" />
                Upload Introduction Video
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search music lab by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-4">
        {isLoading ? (
          <p className="text-muted-foreground">Loading music lab...</p>
        ) : lessons && lessons.length > 0 ? (
          <div className="grid gap-4">
            {lessons.map((lesson: any) => (
              <div key={lesson.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                {lesson.cover_image_url ? (
                  <img
                    src={lesson.cover_image_url}
                    alt={lesson.title}
                    className="h-20 w-20 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-20 w-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-lg truncate">{lesson.title}</div>
                  {lesson.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {lesson.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      lesson.status === "published" 
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}>
                      {lesson.status === "published" ? "Published" : "Draft"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lesson.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" /> Manage Content
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/arrangely-music-lab/${lesson.slug}`)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" /> View
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditLessonId(lesson.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      {lesson.status !== "published" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ lessonId: lesson.id, status: "published" })}>
                          <FileText className="h-4 w-4 mr-2" />
                          Publish
                        </DropdownMenuItem>
                      )}
                      {lesson.status !== "draft" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ lessonId: lesson.id, status: "draft" })}>
                          <FileText className="h-4 w-4 mr-2" />
                          Set as Draft
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDelete(lesson.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "No music lab found matching your filters"
                : hasIntroduction 
                  ? "You have no music lab yet."
                  : "Set up your introduction video above to start creating music lab."}
            </p>
            {hasIntroduction && (
              <Button onClick={handleCreateLesson} className="gap-2">
                <Plus className="h-4 w-4" /> Create your first music lab
              </Button>
            )}
          </div>
        )}
      </Card>

      {lessons && lessons.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, lessonsData?.total || 0)} of {lessonsData?.total || 0} lessons
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-9"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the music lab and all its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={introductionModalOpen} onOpenChange={setIntroductionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Introduction Video</DialogTitle>
            <DialogDescription>
              Upload or update your introduction video. This helps students get to know you before taking your music lab.
            </DialogDescription>
          </DialogHeader>
          {creatorProfile && (
            <CreatorIntroductionUpload
              userId={creatorProfile.userId}
              currentVideoUrl={creatorProfile.introductionVideoUrl}
              currentTitle={creatorProfile.introductionTitle}
              currentDescription={creatorProfile.introductionDescription}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
                setIntroductionModalOpen(false);
                toast({
                  title: "Success",
                  description: "Introduction video updated successfully",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={performanceReviewsModalOpen} onOpenChange={setPerformanceReviewsModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto" hideCloseButton>
          <PerformanceReviews />
        </DialogContent>
      </Dialog>

      {editLessonId && (
        <EditLessonDialog
          lessonId={editLessonId}
          open={!!editLessonId}
          onOpenChange={(open) => !open && setEditLessonId(null)}
        />
      )}
    </div>
  );
}
