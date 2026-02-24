import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Eye, Search, Calendar, User, BookOpen, MoreVertical, FileText } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const AdminLessons = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ["admin-lessons", searchQuery, statusFilter, currentPage],
    queryFn: async () => {
      let countQuery = supabase
        .from("lessons")
        .select("*", { count: "exact", head: true });

      if (statusFilter !== "all") {
        countQuery = countQuery.eq("status", statusFilter);
      }

      if (searchQuery) {
        countQuery = countQuery.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      const { count } = await countQuery;

      let query = supabase
        .from("lessons")
        .select(`
          *,
          profiles:creator_id (
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        );
      }

      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

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
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      setCurrentPage(1);
      toast({
        title: "Success",
        description: "Lesson status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lesson status",
        variant: "destructive",
      });
    },
  });

  const toggleUnlistedMutation = useMutation({
    mutationFn: async ({ lessonId, isUnlisted }: { lessonId: string; isUnlisted: boolean }) => {
      const { error } = await supabase
        .from("lessons")
        .update({ is_unlisted: !isUnlisted })
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-lessons"] });
      toast({
        title: "Success",
        description: "Lesson visibility updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lesson visibility",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      published: "default",
      draft: "secondary",
      archived: "destructive",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty: string) => {
    if (!difficulty) return null;
    
    const colors: Record<string, string> = {
      beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return (
      <Badge className={colors[difficulty] || colors.beginner}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lesson Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage all lessons created by creators
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search lessons by title or description..."
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
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lesson</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons && lessons.length > 0 ? (
                lessons.map((lesson: any) => (
                  <TableRow key={lesson.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {lesson.cover_image_url ? (
                          <img
                            src={lesson.cover_image_url}
                            alt={lesson.title}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{lesson.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {lesson.description}
                          </div>
                          {lesson.is_unlisted && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Unlisted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lesson.profiles?.avatar_url ? (
                          <img
                            src={lesson.profiles.avatar_url}
                            alt={lesson.profiles.display_name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <span className="text-sm">
                          {lesson.profiles?.display_name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lesson.category}</Badge>
                    </TableCell>
                    <TableCell>{getDifficultyBadge(lesson.difficulty)}</TableCell>
                    <TableCell>{getStatusBadge(lesson.status)}</TableCell>
                    <TableCell>
                      {lesson.enrollment_count || 0} enrolled
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lesson.created_at), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/arrangely-music-lab/${lesson.slug}`)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                            <DropdownMenuItem onClick={() => toggleUnlistedMutation.mutate({ lessonId: lesson.id, isUnlisted: lesson.is_unlisted })}>
                              <FileText className="h-4 w-4 mr-2" />
                              {lesson.is_unlisted ? "Make Listed" : "Make Unlisted"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "No lessons found matching your filters"
                        : "No lessons created yet"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {lessons && lessons.length > 0 && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
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
    </div>
  );
};

export default AdminLessons;
