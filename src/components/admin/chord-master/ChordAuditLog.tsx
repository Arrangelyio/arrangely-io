import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  id: string;
  action: string;
  created_at: string;
  changed_fields: any;
  old_values: any;
  new_values: any;
  master_chord_id: string;
  master_chords?: {
    chord_name: string;
  };
  editor_id: string;
}

const ChordAuditLog = () => {
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    fetchAuditLog();
  }, [searchTerm, actionFilter]);

  const fetchAuditLog = async () => {
    try {
      let query = supabase
        .from("chord_audit_log")
        .select(`
          *,
          master_chords (chord_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = data || [];
      
      if (searchTerm) {
        filteredData = filteredData.filter(entry =>
          entry.master_chords?.chord_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.action.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setAuditEntries(filteredData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching audit log:", error);
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "insert":
        return <Badge variant="secondary">Created</Badge>;
      case "update":
        return <Badge variant="outline">Updated</Badge>;
      case "delete":
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatChangedFields = (changedFields: any) => {
    if (!changedFields || typeof changedFields !== 'object') return "No changes";
    
    const fields = Object.keys(changedFields);
    if (fields.length === 0) return "No changes";
    
    return fields.join(", ");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-muted-foreground">
          Track all changes made to chord entries
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chord names or actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Created</SelectItem>
                  <SelectItem value="UPDATE">Updated</SelectItem>
                  <SelectItem value="DELETE">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Chord</TableHead>
              <TableHead>Changed Fields</TableHead>
              <TableHead>Editor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading audit log...
                </TableCell>
              </TableRow>
            ) : auditEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No audit entries found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              auditEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm">
                    {new Date(entry.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>{getActionBadge(entry.action)}</TableCell>
                  <TableCell className="font-mono">
                    {entry.master_chords?.chord_name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatChangedFields(entry.changed_fields)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.editor_id?.substring(0, 8) || "System"}...
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {auditEntries.filter(e => e.action === "INSERT").length}
              </div>
              <p className="text-sm text-muted-foreground">Chords Created</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {auditEntries.filter(e => e.action === "UPDATE").length}
              </div>
              <p className="text-sm text-muted-foreground">Chords Updated</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {auditEntries.filter(e => e.action === "DELETE").length}
              </div>
              <p className="text-sm text-muted-foreground">Chords Deleted</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChordAuditLog;