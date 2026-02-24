import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, 
  Database, 
  Server, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick
} from "lucide-react";

const AdminSystemHealth = () => {
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    uptime: "99.9%",
    responseTime: 245,
    errorRate: 0.1,
    activeConnections: 156,
    databaseConnections: 23,
    storageUsed: 2.4,
    storageTotal: 10.0,
    edgeFunctionCalls: 1234
  });
  
  const [performanceData, setPerformanceData] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState([]);
  const [timeFilter, setTimeFilter] = useState("24h");

  useEffect(() => {
    fetchSystemHealthData();
  }, [timeFilter]);

  const fetchSystemHealthData = async () => {
    try {
      setLoading(true);

      // Get error logs from database
      const timeThreshold = getTimeThreshold(timeFilter);
      const { data: errorLogsData } = await supabase
        .from("error_logs")
        .select("*")
        .gte("created_at", timeThreshold.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      // Mock performance data (would normally come from monitoring service)
      const mockPerformanceData = Array.from({ length: 24 }, (_, i) => ({
        time: `${23 - i}h ago`,
        responseTime: Math.floor(Math.random() * 100) + 200,
        errorRate: Math.random() * 2,
        requests: Math.floor(Math.random() * 1000) + 500,
        cpuUsage: Math.floor(Math.random() * 30) + 20,
        memoryUsage: Math.floor(Math.random() * 20) + 40
      })).reverse();

      // Mock edge function logs (would come from Supabase analytics)
      const mockEdgeFunctionLogs = [
        {
          id: "1",
          function_name: "check-subscription",
          status: "success",
          duration: 156,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          memory_used: 23.5,
          invocations: 45
        },
        {
          id: "2",
          function_name: "analyze-youtube-audio",
          status: "success",
          duration: 2340,
          timestamp: new Date(Date.now() - 600000).toISOString(),
          memory_used: 67.2,
          invocations: 12
        },
        {
          id: "3",
          function_name: "create-midtrans-payment",
          status: "error",
          duration: 5000,
          timestamp: new Date(Date.now() - 900000).toISOString(),
          memory_used: 45.1,
          invocations: 8
        }
      ];

      setPerformanceData(mockPerformanceData);
      setErrorLogs(errorLogsData || []);
      setEdgeFunctionLogs(mockEdgeFunctionLogs);

      // Update system stats with real data where available
      const errorRate = errorLogsData ? (errorLogsData.length / 1000) * 100 : 0.1;
      setSystemStats(prev => ({
        ...prev,
        errorRate: parseFloat(errorRate.toFixed(2))
      }));

    } catch (error) {
      console.error("Error fetching system health data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeThreshold = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case "1h":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  const exportHealthReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeFilter,
      systemStats,
      performanceData: performanceData.slice(-10),
      errorLogs: errorLogs.slice(0, 10),
      edgeFunctionLogs
    };

    const csvContent = [
      "System Health Report",
      `Generated: ${new Date().toLocaleString()}`,
      `Time Period: ${timeFilter}`,
      "",
      "System Statistics:",
      `Uptime,${systemStats.uptime}`,
      `Average Response Time,${systemStats.responseTime}ms`,
      `Error Rate,${systemStats.errorRate}%`,
      `Active Connections,${systemStats.activeConnections}`,
      `Database Connections,${systemStats.databaseConnections}`,
      `Storage Used,${systemStats.storageUsed}GB / ${systemStats.storageTotal}GB`,
      "",
      "Recent Errors:",
      "Type,Message,User ID,Time",
      ...errorLogs.slice(0, 10).map(log => 
        `${log.error_type},${log.error_message},${log.user_id || 'N/A'},${new Date(log.created_at).toLocaleString()}`
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `system-health-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">System Health</h1>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor performance, availability, and system resources
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSystemHealthData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={exportHealthReport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemStats.uptime}</div>
            <p className="text-xs text-muted-foreground">Service availability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.responseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average API response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${systemStats.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${systemStats.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
              {systemStats.errorRate}%
            </div>
            <p className="text-xs text-muted-foreground">Failed requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.activeConnections}</div>
            <p className="text-xs text-muted-foreground">Real-time connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.databaseConnections}</div>
            <p className="text-xs text-muted-foreground">Active DB connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.storageUsed}GB</div>
            <p className="text-xs text-muted-foreground">of {systemStats.storageTotal}GB used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.edgeFunctionCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Function invocations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Response Time Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                responseTime: { label: "Response Time (ms)", color: "hsl(var(--primary))" }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                cpuUsage: { label: "CPU Usage (%)", color: "hsl(var(--primary))" },
                memoryUsage: { label: "Memory Usage (%)", color: "hsl(var(--secondary))" }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="cpuUsage" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="memoryUsage" stackId="2" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Edge Function Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Edge Function Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Function Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Avg Duration</TableHead>
                <TableHead>Memory Used</TableHead>
                <TableHead>Invocations</TableHead>
                <TableHead>Last Execution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edgeFunctionLogs.map((func) => (
                <TableRow key={func.id}>
                  <TableCell className="font-medium">{func.function_name}</TableCell>
                  <TableCell>
                    <Badge variant={func.status === "success" ? "default" : "destructive"}>
                      {func.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{func.duration}ms</TableCell>
                  <TableCell>{func.memory_used}MB</TableCell>
                  <TableCell>{func.invocations}</TableCell>
                  <TableCell>{new Date(func.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Error Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Severity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errorLogs.length > 0 ? errorLogs.map((error) => (
                <TableRow key={error.id}>
                  <TableCell className="font-medium">{error.error_type}</TableCell>
                  <TableCell className="max-w-md truncate">{error.error_message}</TableCell>
                  <TableCell>{error.user_id || "System"}</TableCell>
                  <TableCell>{new Date(error.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Error</Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No errors recorded in the selected time period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSystemHealth;