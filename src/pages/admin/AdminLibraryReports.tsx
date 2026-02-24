import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Library,
  Users,
  DollarSign,
  AlertTriangle,
  Shield,
  RefreshCw,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface SummaryStats {
  totalAdds: number;
  thisMonthAdds: number;
  uniqueUsers: number;
  totalBenefitsPaid: number;
  activeAlerts: number;
}

interface FraudAlert {
  id: string;
  alert_type: string;
  user_id: string;
  creator_id: string;
  song_count: number;
  details: any;
  severity: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  user_name?: string;
  creator_name?: string;
}

interface CreatorEarning {
  creator_id: string;
  creator_name: string;
  creator_type: string;
  songs_published: number;
  library_adds: number;
  total_earnings: number;
}

interface UserCreatorPair {
  user_id: string;
  user_name: string;
  creator_id: string;
  creator_name: string;
  add_count: number;
  is_self_add: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  self_add: "Self Add",
  bulk_same_creator: "Bulk Same Creator",
  rapid_burst: "Rapid Burst",
  new_account_targeting: "New Account Targeting",
};

export default function AdminLibraryReports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [stats, setStats] = useState<SummaryStats>({
    totalAdds: 0,
    thisMonthAdds: 0,
    uniqueUsers: 0,
    totalBenefitsPaid: 0,
    activeAlerts: 0,
  });
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = useState<string>("unresolved");
  const [earnings, setEarnings] = useState<CreatorEarning[]>([]);
  const [earningsTab, setEarningsTab] = useState<string>("all");
  const [earningsDateRange, setEarningsDateRange] = useState<string>("all_time");
  const [globalDateRange, setGlobalDateRange] = useState<string>("all_time");
  const [suspiciousPairs, setSuspiciousPairs] = useState<UserCreatorPair[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadAlerts(), loadEarnings(), loadSuspiciousPairs()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadEarnings();
  }, [earningsDateRange]);

  useEffect(() => {
    loadStats();
  }, [globalDateRange]);

  const loadStats = async () => {
    try {
      const dateFilter = getDateRangeFilter(globalDateRange);

      // Total library adds
      let totalAddsQuery = supabase
        .from("user_library_actions")
        .select("*", { count: "exact", head: true })
        .eq("action_type", "add")
        .eq("is_production", true);
      if (dateFilter) {
        totalAddsQuery = totalAddsQuery.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }
      const { count: totalAdds } = await totalAddsQuery;

      // This month adds
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: thisMonthAdds } = await supabase
        .from("user_library_actions")
        .select("*", { count: "exact", head: true })
        .eq("action_type", "add")
        .eq("is_production", true)
        .gte("created_at", startOfMonth.toISOString());

      // Unique users
      let uniqueQuery = supabase
        .from("user_library_actions")
        .select("user_id")
        .eq("action_type", "add")
        .eq("is_production", true);
      if (dateFilter) {
        uniqueQuery = uniqueQuery.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }
      const { data: uniqueData } = await uniqueQuery;
      const uniqueUsers = new Set(uniqueData?.map((d) => d.user_id)).size;

      // Total benefits paid for library_add
      let benefitsQuery = supabase
        .from("creator_benefits")
        .select("amount")
        .eq("benefit_type", "library_add")
        .eq("is_production", true);
      if (dateFilter) {
        benefitsQuery = benefitsQuery.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }
      const { data: benefitsData } = await benefitsQuery;
      const totalBenefitsPaid = benefitsData?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      // Active fraud alerts
      const { count: activeAlerts } = await supabase
        .from("library_fraud_alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false)
        .eq("is_production", true);

      setStats({
        totalAdds: totalAdds || 0,
        thisMonthAdds: thisMonthAdds || 0,
        uniqueUsers,
        totalBenefitsPaid,
        activeAlerts: activeAlerts || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadAlerts = async () => {
    try {
      let query = supabase
        .from("library_fraud_alerts")
        .select("*")
        .eq("is_production", true)
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with user names
      if (data && data.length > 0) {
        const userIds = [...new Set([...data.map((a) => a.user_id), ...data.map((a) => a.creator_id)])];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, first_name, last_name")
          .in("user_id", userIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          nameMap[p.user_id] = p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
        });

        const enriched = data.map((alert) => ({
          ...alert,
          user_name: nameMap[alert.user_id] || "Unknown",
          creator_name: nameMap[alert.creator_id] || "Unknown",
        }));
        setAlerts(enriched);
      } else {
        setAlerts([]);
      }
    } catch (error) {
      console.error("Error loading alerts:", error);
    }
  };

  const getDateRangeFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      case "last_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { from: start.toISOString(), to: end.toISOString() };
      }
      case "last_3_months": {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      default:
        return null;
    }
  };

  const loadEarnings = async () => {
    try {
      let query = supabase
        .from("creator_benefits")
        .select("creator_id, amount, benefit_type, created_at")
        .eq("benefit_type", "library_add")
        .eq("is_production", true);

      const dateFilter = getDateRangeFilter(earningsDateRange);
      if (dateFilter) {
        query = query.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }

      const { data: benefits } = await query;

      if (!benefits || benefits.length === 0) {
        setEarnings([]);
        return;
      }

      // Aggregate by creator
      const creatorAgg: Record<string, { total: number; adds: number }> = {};
      benefits.forEach((b) => {
        if (!creatorAgg[b.creator_id]) creatorAgg[b.creator_id] = { total: 0, adds: 0 };
        creatorAgg[b.creator_id].total += b.amount || 0;
        creatorAgg[b.creator_id].adds++;
      });

      const creatorIds = Object.keys(creatorAgg);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name, creator_type")
        .in("user_id", creatorIds);

      // Count songs published per creator
      const { data: songCounts } = await supabase
        .from("songs")
        .select("user_id")
        .eq("is_public", true)
        .eq("is_production", true)
        .in("user_id", creatorIds);

      const songCountMap: Record<string, number> = {};
      songCounts?.forEach((s) => {
        songCountMap[s.user_id] = (songCountMap[s.user_id] || 0) + 1;
      });

      const profileMap: Record<string, { name: string; type: string }> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = {
          name: p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
          type: p.creator_type || "unknown",
        };
      });

      const earningsData: CreatorEarning[] = creatorIds
        .map((id) => ({
          creator_id: id,
          creator_name: profileMap[id]?.name || "Unknown",
          creator_type: profileMap[id]?.type || "unknown",
          songs_published: songCountMap[id] || 0,
          library_adds: creatorAgg[id].adds,
          total_earnings: creatorAgg[id].total,
        }))
        .sort((a, b) => b.total_earnings - a.total_earnings);

      setEarnings(earningsData);
    } catch (error) {
      console.error("Error loading earnings:", error);
    }
  };

  const loadSuspiciousPairs = async () => {
    try {
      const { data: actions } = await supabase
        .from("user_library_actions")
        .select("user_id, song_id")
        .eq("action_type", "add")
        .eq("is_production", true);

      if (!actions || actions.length === 0) {
        setSuspiciousPairs([]);
        return;
      }

      const songIds = [...new Set(actions.map((a) => a.song_id))];
      const { data: songs } = await supabase
        .from("songs")
        .select("id, user_id")
        .in("id", songIds);

      const songCreatorMap: Record<string, string> = {};
      songs?.forEach((s) => { songCreatorMap[s.id] = s.user_id; });

      // Group by user+creator
      const pairs: Record<string, { user_id: string; creator_id: string; count: number; is_self: boolean }> = {};
      for (const action of actions) {
        const creatorId = songCreatorMap[action.song_id];
        if (!creatorId) continue;
        const key = `${action.user_id}:${creatorId}`;
        if (!pairs[key]) {
          pairs[key] = { user_id: action.user_id, creator_id: creatorId, count: 0, is_self: action.user_id === creatorId };
        }
        pairs[key].count++;
      }

      // Only show pairs with 3+ adds, sorted by count desc
      const significantPairs = Object.values(pairs)
        .filter((p) => p.count >= 3)
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      if (significantPairs.length === 0) {
        setSuspiciousPairs([]);
        return;
      }

      const allUserIds = [...new Set([...significantPairs.map((p) => p.user_id), ...significantPairs.map((p) => p.creator_id)])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", allUserIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => {
        nameMap[p.user_id] = p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown";
      });

      setSuspiciousPairs(
        significantPairs.map((p) => ({
          user_id: p.user_id,
          user_name: nameMap[p.user_id] || "Unknown",
          creator_id: p.creator_id,
          creator_name: nameMap[p.creator_id] || "Unknown",
          add_count: p.count,
          is_self_add: p.is_self,
        }))
      );
    } catch (error) {
      console.error("Error loading suspicious pairs:", error);
    }
  };

  const runDetection = async () => {
    setDetecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("detect-library-fraud", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast({
        title: "Detection Complete",
        description: `Found: ${data.summary.self_add} self-adds, ${data.summary.bulk_same_creator} bulk, ${data.summary.rapid_burst} bursts, ${data.summary.new_account_targeting} new account. Skipped ${data.summary.skipped_duplicates} duplicates.`,
      });

      await loadAll();
    } catch (error: any) {
      console.error("Detection error:", error);
      toast({
        title: "Detection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("library_fraud_alerts")
        .update({
          is_resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast({ title: "Alert resolved" });
      await Promise.all([loadAlerts(), loadStats()]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter !== "all" && a.alert_type !== alertFilter) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (resolvedFilter === "unresolved" && a.is_resolved) return false;
    if (resolvedFilter === "resolved" && !a.is_resolved) return false;
    return true;
  });

  const filteredEarnings = earnings.filter((e) => {
    if (earningsTab === "all") return true;
    if (earningsTab === "professional") return e.creator_type === "creator_profesional";
    if (earningsTab === "community") return e.creator_type === "creator_pro" || e.creator_type === "creator_arrangely";
    return true;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Library Reports & Fraud Detection</h1>
          <p className="text-muted-foreground text-sm">
            Monitor library add activity and detect suspicious patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={globalDateRange} onValueChange={setGlobalDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runDetection} disabled={detecting}>
            {detecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Detection...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Run Fraud Detection
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Library Adds</CardTitle>
            <Library className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdds.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month: {stats.thisMonthAdds.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Distinct users who added songs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Benefits Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBenefitsPaid)}</div>
            <p className="text-xs text-muted-foreground">Library add benefits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Unresolved fraud alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Self-Adds</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {suspiciousPairs.filter((p) => p.is_self_add).length}
            </div>
            <p className="text-xs text-muted-foreground">Creators adding own songs</p>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Fraud Alerts
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => loadAlerts()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Alert type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="self_add">Self Add</SelectItem>
                <SelectItem value="bulk_same_creator">Bulk Same Creator</SelectItem>
                <SelectItem value="rapid_burst">Rapid Burst</SelectItem>
                <SelectItem value="new_account_targeting">New Account</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No fraud alerts found. Click "Run Fraud Detection" to scan for suspicious patterns.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Songs</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant="outline">{ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={alert.user_name}>
                      {alert.user_name}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate" title={alert.creator_name}>
                      {alert.creator_name}
                    </TableCell>
                    <TableCell>{alert.song_count}</TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_COLORS[alert.severity]}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(alert.created_at).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      {!alert.is_resolved ? (
                        <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      ) : (
                        <Badge variant="secondary">Resolved</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Creator Earnings Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Creator Earnings Leaderboard
            </CardTitle>
            <Select value={earningsDateRange} onValueChange={setEarningsDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_time">All Time</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                <SelectItem value="this_year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={earningsTab} onValueChange={setEarningsTab}>
            <TabsList>
              <TabsTrigger value="all">All Creators</TabsTrigger>
              <TabsTrigger value="professional">Creator Professional</TabsTrigger>
              <TabsTrigger value="community">Creator Community</TabsTrigger>
            </TabsList>
            <TabsContent value={earningsTab}>
              {filteredEarnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No earnings data found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Songs Published</TableHead>
                      <TableHead>Library Adds</TableHead>
                      <TableHead>Total Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEarnings.map((e, idx) => (
                      <TableRow key={e.creator_id}>
                        <TableCell className="font-bold">{idx + 1}</TableCell>
                        <TableCell>{e.creator_name}</TableCell>
                        <TableCell>
                          <Badge variant={e.creator_type === "creator_profesional" ? "default" : "secondary"}>
                            {e.creator_type === "creator_profesional" ? "Professional" : "Community"}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.songs_published}</TableCell>
                        <TableCell>{e.library_adds}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(e.total_earnings)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Suspicious Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Activity Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Top user-creator pairs by library add count (3+ adds shown)
          </p>
        </CardHeader>
        <CardContent>
          {suspiciousPairs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No suspicious patterns detected.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Add Count</TableHead>
                  <TableHead>Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousPairs.map((p, idx) => (
                  <TableRow key={idx} className={p.is_self_add ? "bg-destructive/10" : ""}>
                    <TableCell>{p.user_name}</TableCell>
                    <TableCell>{p.creator_name}</TableCell>
                    <TableCell className="font-bold">{p.add_count}</TableCell>
                    <TableCell>
                      {p.is_self_add ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          SELF-ADD
                        </Badge>
                      ) : p.add_count >= 10 ? (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          HIGH CONCENTRATION
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
