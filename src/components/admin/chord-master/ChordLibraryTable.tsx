import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, Plus, Edit, Copy, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ChordEditor from "./ChordEditor";
import QuickChordBuilder from "./QuickChordBuilder";

interface MasterChord {
  id: string;
  chord_name: string;
  root_note: string;
  quality: string;
  instrument: string;
  status: string;
  usage_count: number;
  updated_at: string;
  created_by: string;
}

const ChordLibraryTable = () => {
  const [chords, setChords] = useState<MasterChord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [selectedChords, setSelectedChords] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChordId, setEditingChordId] = useState<string | undefined>();
  const [quickBuilderOpen, setQuickBuilderOpen] = useState(false);
  const [prefilledChordName, setPrefilledChordName] = useState<string>("");

  useEffect(() => {
    fetchChords();
  }, [searchTerm, instrumentFilter, statusFilter, qualityFilter]);

  const fetchChords = async () => {
    try {
      let query = supabase
        .from("master_chords")
        .select(`
          *
        `)
        .order("chord_name");

      // Apply filters
      if (searchTerm) {
        query = query.ilike("chord_name", `%${searchTerm}%`);
      }
      if (instrumentFilter !== "all") {
        query = query.eq("instrument", instrumentFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (qualityFilter !== "all") {
        query = query.eq("quality", qualityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setChords(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching chords:", error);
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedChords(chords.map(chord => chord.id));
    } else {
      setSelectedChords([]);
    }
  };

  const handleSelectChord = (chordId: string, checked: boolean) => {
    if (checked) {
      setSelectedChords([...selectedChords, chordId]);
    } else {
      setSelectedChords(selectedChords.filter(id => id !== chordId));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="secondary">Approved</Badge>;
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "deprecated":
        return <Badge variant="destructive">Deprecated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInstrumentBadge = (instrument: string) => {
    switch (instrument) {
      case "guitar":
        return <Badge variant="outline">Guitar</Badge>;
      case "piano":
        return <Badge variant="outline">Piano</Badge>;
      case "both":
        return <Badge variant="secondary">Both</Badge>;
      default:
        return <Badge variant="outline">{instrument}</Badge>;
    }
  };

  const handleCreateChord = () => {
    setEditingChordId(undefined);
    setEditorOpen(true);
  };

  const handleEditChord = (chordId: string) => {
    setEditingChordId(chordId);
    setEditorOpen(true);
  };

  const handleEditorSave = () => {
    fetchChords(); // Refresh the list
  };

  const handleQuickChordCreate = (chordName: string) => {
    // Parse chord name into components for prefilling
    const rootMatch = chordName.match(/^([A-G][#b]?)/);
    const root = rootMatch ? rootMatch[1] : "C";
    const quality = chordName.replace(root, "") || "maj";
    
    setPrefilledChordName(chordName);
    setEditingChordId(undefined);
    setEditorOpen(true);
    setQuickBuilderOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Chord Library</h2>
          <p className="text-muted-foreground">
            Manage master chord shapes and voicings
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateChord}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chord
          </Button>
          <Button variant="outline" onClick={() => setQuickBuilderOpen(true)}>
            Quick Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chord names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Instrument</label>
              <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All instruments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instruments</SelectItem>
                  <SelectItem value="guitar">Guitar</SelectItem>
                  <SelectItem value="piano">Piano</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quality</label>
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All qualities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Qualities</SelectItem>
                  <SelectItem value="maj">Major</SelectItem>
                  <SelectItem value="min">Minor</SelectItem>
                  <SelectItem value="7">7th</SelectItem>
                  <SelectItem value="maj7">Major 7th</SelectItem>
                  <SelectItem value="min7">Minor 7th</SelectItem>
                  <SelectItem value="sus2">Sus2</SelectItem>
                  <SelectItem value="sus4">Sus4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedChords.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedChords.length} chords selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Bulk Approve
                </Button>
                <Button variant="outline" size="sm">
                  Bulk Deprecate
                </Button>
                <Button variant="destructive" size="sm">
                  Bulk Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chord Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedChords.length === chords.length && chords.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Chord Name</TableHead>
              <TableHead>Root</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading chords...
                </TableCell>
              </TableRow>
            ) : chords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No chords found
                </TableCell>
              </TableRow>
            ) : (
              chords.map((chord) => (
                <TableRow key={chord.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedChords.includes(chord.id)}
                      onCheckedChange={(checked) => handleSelectChord(chord.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {chord.chord_name}
                  </TableCell>
                  <TableCell>{chord.root_note}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{chord.quality}</Badge>
                  </TableCell>
                  <TableCell>{getInstrumentBadge(chord.instrument)}</TableCell>
                  <TableCell>{getStatusBadge(chord.status)}</TableCell>
                  <TableCell>{chord.usage_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(chord.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditChord(chord.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Chord Editor */}
      <ChordEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        chordId={editingChordId}
        prefilledData={prefilledChordName ? { chord_name: prefilledChordName } : undefined}
        onSave={handleEditorSave}
      />

      {/* Quick Chord Builder Dialog */}
      {quickBuilderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quick Chord Builder</h3>
              <Button variant="ghost" onClick={() => setQuickBuilderOpen(false)}>
                ×
              </Button>
            </div>
            <QuickChordBuilder
              onChordCreate={handleQuickChordCreate}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChordLibraryTable;