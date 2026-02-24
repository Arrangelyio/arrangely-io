import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SecurityMonitoring() {
  const { data: incidents, refetch } = useQuery({
    queryKey: ["security-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_incidents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const { data: accessLogs } = useQuery({
    queryKey: ["content-access-recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_access_logs")
        .select(`
          *,
          lessons (title),
          profiles:user_id (display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const unresolvedIncidents = incidents?.filter((i) => !i.resolved).length || 0;
  const criticalIncidents = incidents?.filter((i) => i.severity === "critical" && !i.resolved).length || 0;

  const handleResolve = async (incidentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from("security_incidents")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq("id", incidentId);

    if (error) {
      toast.error("Failed to resolve incident");
    } else {
      toast.success("Incident resolved");
      refetch();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Security Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor content access, detect fraud, and protect creator content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{incidents?.length || 0}</div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unresolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-orange-500">
                {unresolvedIncidents}
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-500">
                {criticalIncidents}
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Content Views (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{accessLogs?.length || 0}</div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents && incidents.length > 0 ? (
                incidents.map((incident) => (
                  <TableRow key={incident.id}>
                    <TableCell className="font-medium">
                      {incident.incident_type}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {incident.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(incident.severity)}>
                        {incident.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{incident.user_id?.substring(0, 8)}...</TableCell>
                    <TableCell>
                      {format(new Date(incident.created_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      {incident.resolved ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!incident.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolve(incident.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No security incidents recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Content Access */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Content Access</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Music Lab</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessLogs && accessLogs.length > 0 ? (
                accessLogs.slice(0, 20).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.profiles?.display_name || "Unknown"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.lessons?.title || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.access_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ip_address || "N/A"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No access logs available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Guidelines */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Anti-Piracy Measures Active
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Dynamic Watermarks:</strong> All videos display user-specific
                watermarks with email/name and timestamp
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Access Logging:</strong> Every content view is logged with
                user ID, IP address, and timestamp
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Session Monitoring:</strong> Multiple concurrent sessions
                trigger automatic alerts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Download Prevention:</strong> Technical measures prevent
                direct video downloads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
              <span>
                <strong>Screenshot Detection:</strong> Unusual patterns trigger
                warnings and logging
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
