import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Video, Star, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CloudflareVideoPlayer from "@/components/lessons/CloudflareVideoPlayer";

export default function PerformanceReviews() {
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: recordings, isLoading } = useQuery({
    queryKey: ["performance-recordings", currentUser?.id, filterStatus],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      let query = supabase
        .from("lesson_performance_recordings")
        .select(`
          *,
          lessons!inner (
            title,
            creator_id
          ),
          lesson_content (
            title
          )
        `)
        .eq("lessons.creator_id", currentUser.id)
        .order("submitted_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data: recordingsData, error } = await query;

      if (error) throw error;

      // Fetch profiles separately for each recording
      if (recordingsData && recordingsData.length > 0) {
        const userIds = [...new Set(recordingsData.map((r: any) => r.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        // Map profiles to recordings
        const profilesMap = new Map(
          profilesData?.map((p) => [p.user_id, p]) || []
        );

        return recordingsData.map((recording: any) => ({
          ...recording,
          profiles: profilesMap.get(recording.user_id) || null,
        }));
      }

      return recordingsData || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRecording) return;

      const { error } = await supabase
        .from("lesson_performance_recordings")
        .update({
          status: "reviewed",
          score,
          creator_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.id,
        })
        .eq("id", selectedRecording.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-recordings"] });
      toast.success("Review submitted successfully!");
      setSelectedRecording(null);
      setScore(0);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  const openReview = (recording: any) => {
    setSelectedRecording(recording);
    setScore(recording.score || 0);
    setNotes(recording.creator_notes || "");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Student Performance Reviews</h1>
        <p className="text-muted-foreground">
          Review and provide feedback on student performance recordings
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Label>Filter by Status</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recordings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings?.map((recording: any) => (
          <Card key={recording.id} className="overflow-hidden">
            <div className="relative aspect-video bg-black">
              {recording.video_url ? (
                <CloudflareVideoPlayer
                  videoUrl={recording.video_url}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No video available
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge
                  variant={
                    recording.status === "pending"
                      ? "default"
                      : recording.status === "reviewed"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {recording.status === "pending" ? "Pending" : "Reviewed"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-1">
                  {recording.lessons?.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {recording.lesson_content?.title}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {recording.profiles?.avatar_url ? (
                  <img
                    src={recording.profiles.avatar_url}
                    alt={recording.profiles.display_name}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted" />
                )}
                <span className="text-sm font-medium">
                  {recording.profiles?.display_name || "Unknown"}
                </span>
              </div>

              {recording.score !== null && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{recording.score}/100</span>
                </div>
              )}

              <Button
                className="w-full"
                size="sm"
                onClick={() => openReview(recording)}
              >
                {recording.status === "pending" ? "Review" : "View Details"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {recordings?.length === 0 && (
        <div className="text-center py-12">
          <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recordings found</p>
        </div>
      )}

      {/* Review Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Review Performance</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecording(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {selectedRecording.video_url ? (
                  <CloudflareVideoPlayer
                    videoUrl={selectedRecording.video_url}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    No video available
                  </div>
                )}
              </div>

              {/* Student Info */}
              <div>
                <Label>Student</Label>
                <p className="text-sm font-medium mt-1">
                  {selectedRecording.profiles?.display_name}
                </p>
              </div>

              {/* Lesson Info */}
              <div>
                <Label>Music Lab</Label>
                <p className="text-sm mt-1">{selectedRecording.lessons?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRecording.lesson_content?.title}
                </p>
              </div>

              {/* Score Input */}
              <div>
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Feedback Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  rows={6}
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}
                  className="flex-1"
                >
                  {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </Button>
                <Button
                  onClick={() => setSelectedRecording(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
