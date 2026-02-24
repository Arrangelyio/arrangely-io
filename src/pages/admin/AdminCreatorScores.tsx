import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, RefreshCw, Loader2, TrendingUp, 
  AlertTriangle, Ban, Shield, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";

interface CreatorScore {
  id: string;
  user_id: string;
  validation_score: number | null;
  community_score: number | null;
  total_score: number | null;
  status: string | null;
  total_publications: number | null;
  approved_publications: number | null;
  rejected_publications: number | null;
  total_ratings: number | null;
  average_rating: number | null;
  total_reports: number | null;
  confirmed_reports: number | null;
  warning_count: number | null;
  blocked_until: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    display_name: string | null;
    email: string | null;
    role: string | null;
  } | null;
}

const AdminCreatorScores = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all creator scores via edge function
  const { data: allScores = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-creator-scores"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-admin-creator-scores", {
        body: {},
        headers: { "Content-Type": "application/json" },
      });

      if (error) throw error;
      return (data?.scores || []) as CreatorScore[];
    },
  });

  // Stats from ALL scores
  const stats = {
    active: allScores.filter((s) => s.status === "active").length,
    warning: allScores.filter((s) => s.status === "warning").length,
    blocked: allScores.filter((s) => s.status === "blocked").length,
    suspended: allScores.filter((s) => s.status === "suspended").length,
    total: allScores.length,
  };

  // Filter by status tab
  const scores = activeTab === "all" 
    ? allScores 
    : allScores.filter((s) => s.status === activeTab);

  // Filter by search query
  const filteredScores = scores.filter((score) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      score.profiles?.display_name?.toLowerCase().includes(query) ||
      score.profiles?.email?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string | null) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      active: { variant: "default", icon: TrendingUp, label: "Active" },
      warning: { variant: "secondary", icon: AlertTriangle, label: "Warning" },
      blocked: { variant: "destructive", icon: Ban, label: "Blocked" },
      suspended: { variant: "destructive", icon: Shield, label: "Suspended" },
    };
    const { variant, icon: Icon, label } = config[status || "active"] || config.active;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    if (score >= 30) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Scores</h1>
          <p className="text-muted-foreground">View and monitor creator reputation scores</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold text-orange-500">{stats.blocked}</p>
              </div>
              <Ban className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold text-red-500">{stats.suspended}</p>
              </div>
              <Shield className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="warning">Warning ({stats.warning})</TabsTrigger>
          <TabsTrigger value="blocked">Blocked ({stats.blocked})</TabsTrigger>
          <TabsTrigger value="suspended">Suspended ({stats.suspended})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredScores.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No creator scores found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredScores.map((score) => (
                <Card key={score.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(score.status)}
                          {score.profiles?.role === "creator_arrangely" && (
                            <Badge variant="outline" className="border-purple-500 text-purple-600">
                              Creator
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg">
                          {score.profiles?.display_name || "Unknown"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {score.profiles?.email || "No email"}
                        </p>
                        
                        {/* Score Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Score</p>
                            <p className={`text-xl font-bold ${getScoreColor(score.total_score)}`}>
                              {score.total_score?.toFixed(1) ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Validation</p>
                            <p className="text-lg font-semibold">
                              {score.validation_score?.toFixed(1) ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Community</p>
                            <p className="text-lg font-semibold">
                              {score.community_score?.toFixed(1) ?? "N/A"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-lg font-semibold">
                              {score.average_rating?.toFixed(1) ?? "N/A"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({score.total_ratings ?? 0})
                            </span>
                          </div>
                        </div>

                        {/* Publication Stats */}
                        <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
                          <span>
                            Publications: {score.total_publications ?? 0} 
                            <span className="text-green-500 ml-1">
                              ({score.approved_publications ?? 0} approved)
                            </span>
                            <span className="text-red-500 ml-1">
                              ({score.rejected_publications ?? 0} rejected)
                            </span>
                          </span>
                          {(score.confirmed_reports ?? 0) > 0 && (
                            <span className="text-red-500">
                              {score.confirmed_reports} confirmed reports
                            </span>
                          )}
                        </div>

                        {score.suspension_reason && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                            <span className="font-medium text-red-500">Suspension Reason:</span>{" "}
                            {score.suspension_reason}
                          </div>
                        )}

                        {score.blocked_until && (
                          <div className="mt-2 text-sm text-orange-500">
                            Blocked until: {format(new Date(score.blocked_until), "MMM d, yyyy HH:mm")}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCreatorScores;
