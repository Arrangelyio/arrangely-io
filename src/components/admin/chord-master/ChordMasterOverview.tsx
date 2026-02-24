import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Guitar, Piano, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChordStats {
  totalMasterChords: number;
  guitarChords: number;
  pianoChords: number;
  approvedChords: number;
  pendingReview: number;
  uniqueChordsInSongs: number;
  coveragePercentage: number;
}

const ChordMasterOverview = () => {
  const [stats, setStats] = useState<ChordStats>({
    totalMasterChords: 0,
    guitarChords: 0,
    pianoChords: 0,
    approvedChords: 0,
    pendingReview: 0,
    uniqueChordsInSongs: 0,
    coveragePercentage: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChordStats();
    fetchRecentActivity();
  }, []);

  const fetchChordStats = async () => {
    try {
      // Get master chord counts
      const { data: masterChords } = await supabase
        .from("master_chords")
        .select("instrument, status");

      const totalMasterChords = masterChords?.length || 0;
      const guitarChords = masterChords?.filter(c => c.instrument === 'guitar' || c.instrument === 'both').length || 0;
      const pianoChords = masterChords?.filter(c => c.instrument === 'piano' || c.instrument === 'both').length || 0;
      const approvedChords = masterChords?.filter(c => c.status === 'approved').length || 0;

      // Get review queue count
      const { data: reviewQueue } = await supabase
        .from("chord_review_queue")
        .select("id")
        .eq("status", "pending");

      const pendingReview = reviewQueue?.length || 0;

      // Get unique chords used in songs (simplified estimation)
      const { data: songsWithChords } = await supabase
        .from("songs")
        .select("id")
        .eq("is_public", true);

      const uniqueChordsInSongs = songsWithChords?.length ? Math.floor(songsWithChords.length * 8) : 0; // Estimate 8 unique chords per song
      const coveragePercentage = uniqueChordsInSongs > 0 ? Math.round((approvedChords / uniqueChordsInSongs) * 100) : 0;

      setStats({
        totalMasterChords,
        guitarChords,
        pianoChords,
        approvedChords,
        pendingReview,
        uniqueChordsInSongs,
        coveragePercentage,
      });
    } catch (error) {
      console.error("Error fetching chord stats:", error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from("chord_audit_log")
        .select(`
          id,
          action,
          created_at,
          master_chord_id,
          master_chords (chord_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivity(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Master Chords</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMasterChords}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Guitar className="h-3 w-3 mr-1" />
                {stats.guitarChords}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Piano className="h-3 w-3 mr-1" />
                {stats.pianoChords}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coveragePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.approvedChords} of {stats.uniqueChordsInSongs} mapped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Chords</CardTitle>
            <Badge variant="secondary" className="h-4 px-2 text-xs">
              {stats.approvedChords}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedChords}</div>
            <p className="text-xs text-muted-foreground">
              Ready for production use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Queue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              Chords needing review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest chord changes and editorial actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium capitalize">{activity.action}</span> chord{" "}
                      <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                        {activity.master_chords?.chord_name || "Unknown"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
};

export default ChordMasterOverview;