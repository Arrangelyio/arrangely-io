import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Music,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  Calendar as CalendarIcon,
  Eye,
  Heart,
  Download,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import CustomerMetricsSection from "@/components/admin/CustomerMetricsSection";

interface AdminStats {
  grossRevenueSub: number; // Baru
  netRevenueSub: number; // Baru
  revenueLesson: number; // Baru
  totalUsers: number;
  totalSongs: number;
  pendingApplications: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscount: number;
  activeSubscriptions: number;
  totalViews: number;
  totalLikes: number;
  totalExports: number;
  recentUsers: Array<{
    display_name: string;
    created_at: string;
    role: string;
  }>;
  recentSongs: Array<{
    title: string;
    artist: string;
    created_at: string;
    is_public: boolean;
  }>;
  recentPayments: Array<{
    amount: number;
    status: string;
    created_at: string;
  }>;
  monthlyGrowth: {
    users: number;
    songs: number;
    revenue: number;
  };
}

interface CustomerMetrics {
  newCustomers: number;
  renewals: {
    total: number;
    onceRenewed: number;
    twiceRenewed: number;
    threeTimesRenewed: number;
    fourPlusRenewed: number;
  };
  churnedCustomers: number;
  subscriptionsByPlan: Array<{
    plan_name: string;
    billing_cycle: string;
    subscriber_count: number;
    total_revenue: number;
  }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats>({
    grossRevenueSub: 0,
    netRevenueSub: 0,
    revenueLesson: 0,
    totalUsers: 0,
    totalSongs: 0,
    pendingApplications: 0,
    grossRevenue: 0,
    netRevenue: 0,
    totalDiscount: 0,
    activeSubscriptions: 0,
    totalViews: 0,
    totalLikes: 0,
    totalExports: 0,
    recentUsers: [],
    recentSongs: [],
    recentPayments: [],
    monthlyGrowth: {
      users: 0,
      songs: 0,
      revenue: 0,
    },
  });
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics>({
    newCustomers: 0,
    renewals: {
      total: 0,
      onceRenewed: 0,
      twiceRenewed: 0,
      threeTimesRenewed: 0,
      fourPlusRenewed: 0,
    },
    churnedCustomers: 0,
    subscriptionsByPlan: [],
  });
  const [loading, setLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Quick filter functions
  const setThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(startOfMonth);
    setDateTo(endOfMonth);
  };

  const setThisYear = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);
    setDateFrom(startOfYear);
    setDateTo(endOfYear);
  };

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleCategorizeSongs = async () => {
    if (isCategorizing) return;

    setIsCategorizing(true);
    try {
      
      const { data, error } = await supabase.functions.invoke(
        "categorize-songs"
      );

      
      

      if (error) {
        console.error("Supabase function error details:", error);
        toast({
          title: "Error",
          description: `Failed to categorize songs: ${
            error.message || "Please check console for details"
          }`,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        
        toast({
          title: "Success",
          description: `Successfully categorized ${data.processed || 0} songs!`,
        });
      }
    } catch (error) {
      console.error("Caught exception during categorization:", error);
      toast({
        title: "Error",
        description: `Exception occurred: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsCategorizing(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Prepare date range
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (dateFrom) {
          startDate = dateFrom.toISOString();
        }
        if (dateTo) {
          const endDateObj = new Date(dateTo);
          endDateObj.setHours(23, 59, 59, 999); // Include full end date
          endDate = endDateObj.toISOString();
        }

        // Use RPC functions for efficient data fetching
        const [
          userStatsResult,
          songStatsResult,
          revenueStatsResult,
          engagementStatsResult,
          recentActivityResult,
          customerMetricsResult,
        ] = await Promise.all([
          supabase.rpc("get_admin_user_stats", {
            start_date: startDate,
            end_date: endDate,
          }),
          supabase.rpc("get_admin_song_stats", {
            start_date: startDate,
            end_date: endDate,
          }),
          supabase.rpc("get_admin_revenue_stats", {
            start_date: startDate,
            end_date: endDate,
          }),
          supabase.rpc("get_admin_tunning_engagement_stats", {
            start_date: startDate,
            end_date: endDate,
          }),
          supabase.rpc("get_admin_recent_activity"),
          supabase.rpc("get_admin_customer_metrics", {
            start_date: startDate,
            end_date: endDate,
          }),
        ]);

        if (userStatsResult.error) throw userStatsResult.error;
        if (songStatsResult.error) throw songStatsResult.error;
        if (revenueStatsResult.error) throw revenueStatsResult.error;
        if (engagementStatsResult.error) throw engagementStatsResult.error;
        if (recentActivityResult.error) throw recentActivityResult.error;
        if (customerMetricsResult.error) throw customerMetricsResult.error;

        const userStats = userStatsResult.data?.[0];
        const songStats = songStatsResult.data?.[0];
        const revenueStats = revenueStatsResult.data?.[0];
        const engagementStats = engagementStatsResult.data?.[0];
        const recentActivity = recentActivityResult.data?.[0];
        const customerMetricsData = customerMetricsResult.data?.[0];

        setStats({
          grossRevenueSub: Number(revenueStats?.gross_revenue_sub || 0),
          netRevenueSub: Number(revenueStats?.net_revenue_sub || 0),
          revenueLesson: Number(revenueStats?.revenue_lesson || 0),
          totalUsers: Number(userStats?.total_users || 0),
          totalSongs: Number(songStats?.total_songs || 0),
          pendingApplications: Number(
            engagementStats?.pending_applications || 0
          ),
          grossRevenue: Number(revenueStats?.gross_revenue_total || 0),
          netRevenue: Number(revenueStats?.net_revenue_total || 0),
          totalDiscount: Number(revenueStats?.total_discount || 0),
          activeSubscriptions: Number(
            engagementStats?.active_subscriptions || 0
          ),
          totalViews: Number(songStats?.total_views || 0),
          totalLikes: Number(engagementStats?.total_likes || 0),
          totalExports: Number(engagementStats?.total_exports || 0),
          recentUsers: (recentActivity?.recent_users as any[]) || [],
          recentSongs: (recentActivity?.recent_songs as any[]) || [],
          recentPayments: (recentActivity?.recent_payments as any[]) || [],
          monthlyGrowth: {
            users: Number(userStats?.monthly_growth || 0),
            songs: Number(songStats?.monthly_growth || 0),
            revenue: Number(revenueStats?.monthly_revenue || 0),
          },
        });

        setCustomerMetrics({
          newCustomers: Number(customerMetricsData?.new_customers ?? 0),
          renewals: {
            total: Number(customerMetricsData?.total_renewals ?? 0),
            onceRenewed: Number(customerMetricsData?.once_renewed ?? 0),
            twiceRenewed: Number(customerMetricsData?.twice_renewed ?? 0),
            threeTimesRenewed: Number(
              customerMetricsData?.three_times_renewed ?? 0
            ),
            fourPlusRenewed: Number(
              customerMetricsData?.four_plus_renewed ?? 0
            ),
          },
          churnedCustomers: Number(customerMetricsData?.churned_customers ?? 0),
          // Jika mau mempertahankan nama "billing_cycle" di UI:
          subscriptionsByPlan: Array.isArray(
            customerMetricsData?.subscriptions_by_plan
          )
            ? customerMetricsData.subscriptions_by_plan.map((p: any) => ({
                plan_name: p.plan_name,
                billing_cycle: p.interval_type, // <— map nama kolom
                subscriber_count: Number(p.subscriber_count ?? 0),
                total_revenue: Number(p.total_revenue ?? 0),
              }))
            : [],
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [dateFrom, dateTo, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Platform statistics and key metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col gap-3">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={setThisMonth}
              className="text-xs"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setThisYear}
              className="text-xs"
            >
              This Year
            </Button>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateFilter}
                className="text-xs"
              >
                Clear Filter
              </Button>
            )}
          </div>

          {/* Date Pickers */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                +{stats.monthlyGrowth.users}
              </span>{" "}
              this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSongs.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                +{stats.monthlyGrowth.songs}
              </span>{" "}
              this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gross Total Revenue (Subscribe)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.grossRevenueSub)}
            </div>
            <p className="text-xs text-muted-foreground">Before discounts</p>
          </CardContent>
        </Card>

        {/* Card Net Revenue Subscribe */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Total Revenue (Subscribe)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.netRevenueSub)}
            </div>
            <p className="text-xs text-muted-foreground">
              After discounts & fees
            </p>
          </CardContent>
        </Card>

        {/* Card Total Revenue Lesson */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue (Lesson)
            </CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenueLesson)}
            </div>
            <p className="text-xs text-muted-foreground">
              One-time lesson purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Gross Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.grossRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Before discounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                {formatCurrency(stats.monthlyGrowth.revenue)}
              </span>{" "}
              this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Discount Used
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalDiscount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to paid orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.activeSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Song arrangement views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLikes.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Songs liked by users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalExports.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              PDF exports generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingApplications}
            </div>
            <p className="text-xs text-muted-foreground">
              Creator applications to review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Metrics */}
      <CustomerMetricsSection
        metrics={customerMetrics}
        loading={loading}
        dateRange={{ from: dateFrom, to: dateTo }}
      />

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentUsers.length > 0 ? (
              stats.recentUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {user.display_name || "Anonymous"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role || "user"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No recent users
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Recent Songs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentSongs.length > 0 ? (
              stats.recentSongs.map((song, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{song.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {song.artist}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(song.created_at)}
                    </p>
                  </div>
                  <Badge variant={song.is_public ? "default" : "secondary"}>
                    {song.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No recent songs
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.recentPayments.length > 0 ? (
              stats.recentPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      payment.status === "paid"
                        ? "default"
                        : payment.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {payment.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No recent payments
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate("/admin/creators")}
            >
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Review Applications</p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingApplications} pending
                </p>
              </div>
            </Card>
            <Card
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate("/admin/users")}
            >
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Manage Users</p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalUsers} total
                </p>
              </div>
            </Card>
            <Card
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate("/admin/song-analytics")}
            >
              <div className="text-center">
                <Music className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Song Analytics</p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalViews} views
                </p>
              </div>
            </Card>
            <Card
              className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate("/admin/payments")}
            >
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Payment History</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(stats.netRevenue)}
                </p>
              </div>
            </Card>
          </div>

          {/* AI Actions - Temporarily disabled */}
          {/* 
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">AI Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleCategorizeSongs}
                disabled={isCategorizing}
                variant="outline"
                className="h-auto p-4 flex items-center gap-3"
              >
                {isCategorizing ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
                <div className="text-left">
                  <p className="font-medium">
                    {isCategorizing ? "Categorizing Songs..." : "AI Categorize Songs"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Automatically categorize uncategorized songs
                  </p>
                </div>
              </Button>
            </div>
          </div>
          */}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
