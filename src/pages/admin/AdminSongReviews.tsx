import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Music, Clock, CheckCircle2, XCircle, AlertTriangle, 
  Youtube, FileText, Guitar, Shield, Eye, ExternalLink, 
  Loader2, RefreshCw, Search
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Publication {
  id: string;
  song_id: string;
  user_id: string;
  status: string;
  validation_results: Record<string, any> | null;
  rejected_reason: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  songs: {
    id: string;
    title: string;
    artist: string;
    youtube_link: string | null;
    user_id: string;
    created_at: string;
  } | null;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
}

const AdminSongReviews = () => {
  const [selectedPublication, setSelectedPublication] = useState<Publication | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedReasonType, setSelectedReasonType] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending_review");

  // Predefined rejection reasons for consistency
  const rejectionReasonOptions = [
    { value: "invalid_youtube", label: "Invalid YouTube Link", description: "Link is private, deleted, or inaccessible" },
    { value: "wrong_youtube_category", label: "Wrong YouTube Category", description: "Video is not in 'Music' category" },
    { value: "incomplete_sections", label: "Incomplete Sections", description: "Less than 3 sections in arrangement" },
    { value: "invalid_chords", label: "Invalid/Missing Chords", description: "Chord coverage below 50%" },
    { value: "content_violation", label: "Content Violation", description: "SARA, profanity, or inappropriate content" },
    { value: "duplicate_content", label: "Duplicate Content", description: "Too similar to existing arrangement" },
    { value: "low_quality", label: "Low Quality", description: "Arrangement doesn't meet quality standards" },
    { value: "copyright_issue", label: "Copyright Issue", description: "Potential copyright infringement" },
    { value: "other", label: "Other", description: "Custom reason (specify below)" },
  ];
  const queryClient = useQueryClient();

  // Fetch ALL publications (not filtered by tab)
  const { data: allPublications = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-song-reviews"],
    queryFn: async () => {
      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("get-admin-publications", {
        body: {},
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (error) throw error;
      
      return (data?.publications || []) as Publication[];
    },
  });

  // Stats from ALL publications
  const stats = {
    pending: allPublications.filter((p) => p.status === "pending_review").length,
    approved: allPublications.filter((p) => p.status === "active").length,
    rejected: allPublications.filter((p) => p.status === "rejected").length,
    total: allPublications.length,
  };

  // Filter publications by active tab
  const publications = activeTab === "all" 
    ? allPublications 
    : allPublications.filter((p) => p.status === activeTab);

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ 
      publicationId, 
      action, 
      rejectionReason, 
      adminNotes 
    }: { 
      publicationId: string; 
      action: "approve" | "reject";
      rejectionReason?: string;
      adminNotes?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-review-publication", {
        body: { publicationId, action, rejectionReason, adminNotes }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.action === "approve" 
          ? "Song approved and published! 🎉" 
          : "Song rejected"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-song-reviews"] });
      setIsReviewDialogOpen(false);
      setSelectedPublication(null);
      setRejectionReason("");
      setSelectedReasonType("");
      setAdminNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to review publication");
    }
  });

  // Filter publications by search
  const filteredPublications = publications.filter((pub) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pub.songs?.title?.toLowerCase().includes(query) ||
      pub.songs?.artist?.toLowerCase().includes(query) ||
      pub.profiles?.display_name?.toLowerCase().includes(query) ||
      pub.profiles?.email?.toLowerCase().includes(query)
    );
  });

  const handleApprove = () => {
    if (!selectedPublication) return;
    reviewMutation.mutate({
      publicationId: selectedPublication.id,
      action: "approve",
      adminNotes: adminNotes || undefined
    });
  };

  const handleReject = () => {
    if (!selectedPublication) return;
    
    // Build the final rejection reason
    let finalReason = selectedReasonType;
    if (selectedReasonType === "other" && rejectionReason.trim()) {
      finalReason = rejectionReason.trim();
    } else if (selectedReasonType && rejectionReason.trim()) {
      // If both are provided, combine them
      finalReason = `${selectedReasonType}: ${rejectionReason.trim()}`;
    } else if (!selectedReasonType && !rejectionReason.trim()) {
      toast.error("Please select or provide a rejection reason");
      return;
    }
    
    reviewMutation.mutate({
      publicationId: selectedPublication.id,
      action: "reject",
      rejectionReason: finalReason,
      adminNotes: adminNotes || undefined
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      pending_review: { color: "bg-yellow-500", icon: Clock, label: "Pending Review" },
      active: { color: "bg-green-500", icon: CheckCircle2, label: "Approved" },
      rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
    };
    const { color, icon: Icon, label } = config[status] || { color: "bg-gray-500", icon: Clock, label: status };
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getValidationIcon = (passed: boolean | undefined) => {
    if (passed === undefined) return <Clock className="w-4 h-4 text-gray-400" />;
    return passed 
      ? <CheckCircle2 className="w-4 h-4 text-green-500" /> 
      : <XCircle className="w-4 h-4 text-red-500" />;
  };

  const renderValidationResults = (results: Record<string, any> | null) => {
    if (!results) return <p className="text-muted-foreground">No validation data</p>;

    return (
      <div className="space-y-4">
        {/* YouTube Validation */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              <span className="font-medium">YouTube Validation</span>
            </div>
            {getValidationIcon(results.youtube?.passed)}
          </div>
          {results.youtube?.videoId && (
            <p className="text-sm text-muted-foreground">
              Video ID: {results.youtube.videoId}
            </p>
          )}
          {results.youtube?.error && (
            <p className="text-sm text-red-500">{results.youtube.error}</p>
          )}
        </div>

        {/* Sections Validation */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Sections Validation</span>
            </div>
            {getValidationIcon(results.sections?.passed)}
          </div>
          {results.sections?.sectionCount !== undefined && (
            <p className="text-sm text-muted-foreground">
              Sections: {results.sections.sectionCount}
            </p>
          )}
          {results.sections?.error && (
            <p className="text-sm text-red-500">{results.sections.error}</p>
          )}
        </div>

        {/* Chords Validation */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Guitar className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Chords Validation</span>
            </div>
            {getValidationIcon(results.chords?.passed)}
          </div>
          {results.chords?.coverage !== undefined && (
            <p className="text-sm text-muted-foreground">
              Coverage: {results.chords.coverage}%
            </p>
          )}
          {results.chords?.error && (
            <p className="text-sm text-red-500">{results.chords.error}</p>
          )}
        </div>

        {/* Content Moderation */}
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <span className="font-medium">Content Moderation</span>
            </div>
            {getValidationIcon(results.content?.passed)}
          </div>
          {results.content?.flagged && (
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Flagged for Review</span>
            </div>
          )}
          {results.content?.confidence !== undefined && (
            <p className="text-sm text-muted-foreground">
              Confidence: {results.content.confidence}%
            </p>
          )}
          {results.content?.summary && (
            <p className="text-sm text-muted-foreground mt-1">{results.content.summary}</p>
          )}
          {results.content?.violations?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-red-500">Violations:</p>
              {results.content.violations.map((v: any, i: number) => (
                <div key={i} className="text-sm bg-red-50 dark:bg-red-900/20 rounded p-2">
                  <Badge variant={v.severity === 'high' ? 'destructive' : 'secondary'} className="mr-2">
                    {v.category} - {v.severity}
                  </Badge>
                  <span>{v.description}</span>
                </div>
              ))}
            </div>
          )}
          {results.content?.error && (
            <p className="text-sm text-red-500">{results.content.error}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Song Reviews</h1>
          <p className="text-muted-foreground">Review and approve song publications</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-green-500">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by song title, artist, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending_review">
            Pending Review ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="active">Approved ({stats.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPublications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No publications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPublications.map((pub) => (
                <Card key={pub.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(pub.status)}
                          {pub.validation_results?.content?.flagged && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg truncate">
                          {pub.songs?.title || "Unknown Title"}
                        </h3>
                        <p className="text-muted-foreground">
                          {pub.songs?.artist || "Unknown Artist"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>By: {pub.profiles?.display_name || pub.profiles?.email || "Unknown"}</span>
                          <span>•</span>
                          <span>Submitted: {format(new Date(pub.created_at), "MMM d, yyyy HH:mm")}</span>
                        </div>
                        {pub.songs?.youtube_link && (
                          <a
                            href={pub.songs.youtube_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-red-500 hover:underline mt-2"
                          >
                            <Youtube className="w-4 h-4" />
                            Watch on YouTube
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {pub.rejected_reason && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                            <span className="font-medium text-red-500">Rejection Reason:</span>{" "}
                            {pub.rejected_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPublication(pub);
                            setIsReviewDialogOpen(true);
                            setRejectionReason("");
                            setSelectedReasonType("");
                            setAdminNotes("");
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Publication</DialogTitle>
            <DialogDescription>
              Review the song details and validation results before making a decision.
            </DialogDescription>
          </DialogHeader>

          {selectedPublication && (
            <div className="space-y-6">
              {/* Song Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {selectedPublication.songs?.title}
                </h3>
                <p className="text-muted-foreground mb-2">
                  {selectedPublication.songs?.artist}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Creator: {selectedPublication.profiles?.display_name || selectedPublication.profiles?.email}
                  </span>
                  <span>
                    Submitted: {format(new Date(selectedPublication.created_at), "MMM d, yyyy")}
                  </span>
                </div>
                {selectedPublication.songs?.youtube_link && (
                  <a
                    href={selectedPublication.songs.youtube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-red-500 hover:underline mt-2"
                  >
                    <Youtube className="w-4 h-4" />
                    Watch on YouTube
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Validation Results */}
              <div>
                <h4 className="font-medium mb-3">Validation Results</h4>
                {renderValidationResults(selectedPublication.validation_results)}
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes (optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add internal notes about this review..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Rejection Reason (shown for pending items) */}
              {selectedPublication.status === "pending_review" && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="rejectionReasonType">Rejection Reason Type</Label>
                    <Select value={selectedReasonType} onValueChange={setSelectedReasonType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rejectionReasonOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rejectionReason">
                      Additional Details {selectedReasonType === "other" ? "(required)" : "(optional)"}
                    </Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder={selectedReasonType === "other" 
                        ? "Explain why the song is being rejected..." 
                        : "Add more specific details about the issue..."
                      }
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            {selectedPublication?.status === "pending_review" && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={reviewMutation.isPending || (!selectedReasonType && !rejectionReason.trim()) || (selectedReasonType === "other" && !rejectionReason.trim())}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={reviewMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSongReviews;
