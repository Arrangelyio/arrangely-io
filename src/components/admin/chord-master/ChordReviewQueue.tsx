import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Check, X, Eye, Search, Plus, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChordEditor from "./ChordEditor";

interface ReviewQueueItem {
  id: string;
  chord_name: string;
  occurrence_count: number;
  sample_song_titles: string[];
  suggested_root_note: string | null;
  suggested_quality: string | null;
  ai_confidence: number | null;
  status: string;
  created_at: string;
}

interface MasterChord {
  id: string;
  chord_name: string;
  root_note: string;
  quality: string;
  instrument: string;
}

const ChordReviewQueue = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [masterChords, setMasterChords] = useState<MasterChord[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [chordEditorOpen, setChordEditorOpen] = useState(false);
  const [prefilledChordData, setPrefilledChordData] = useState<any>(null);

  useEffect(() => {
    fetchReviewQueue();
    fetchMasterChords();
  }, [statusFilter, searchTerm]);

  const fetchReviewQueue = async () => {
    try {
      const { data, error } = await supabase.rpc('get_chord_review_queue');
      if (error) throw error;
      
      let filteredData = data || [];
      
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(item => item.status === statusFilter);
      }
      
      if (searchTerm) {
        filteredData = filteredData.filter(item => 
          item.chord_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setItems(filteredData);
    } catch (error) {
      console.error("Error fetching review queue:", error);
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterChords = async () => {
    try {
      const { data, error } = await supabase
        .from("master_chords")
        .select("id, chord_name, root_note, quality, instrument")
        .eq("status", "approved")
        .order("chord_name");
      
      if (error) throw error;
      setMasterChords(data || []);
    } catch (error) {
      console.error("Error fetching master chords:", error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const handleMapToExisting = (item: ReviewQueueItem) => {
    setSelectedItem(item);
    setMappingDialogOpen(true);
  };

  const handleEditAndReview = (item: ReviewQueueItem) => {
    // Use the parsed data from the improved collection system
    const rootNote = item.suggested_root_note || item.chord_name.charAt(0);
    const quality = item.suggested_quality || "maj";
    
    setPrefilledChordData({
      chord_name: item.chord_name,
      root_note: rootNote,
      quality: quality,
      instrument: "both",
      status: "draft",
      reviewQueueItemId: item.id,
      originalChordName: item.chord_name // Keep track for updating references
    });
    setSelectedItem(item);
    setChordEditorOpen(true);
  };

  const handleCreateNew = (item: ReviewQueueItem) => {
    setPrefilledChordData({
      chord_name: item.chord_name,
      root_note: item.suggested_root_note || "C",
      quality: item.suggested_quality || "maj",
      instrument: "both",
      status: "draft"
    });
    setChordEditorOpen(true);
  };

  const handleIgnore = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("chord_review_queue")
        .update({ status: "ignored", resolution_notes: "Marked as typo/ignore" })
        .eq("id", itemId);
      
      if (error) throw error;
      toast.success("Item marked as ignored");
      fetchReviewQueue();
    } catch (error) {
      console.error("Error ignoring item:", error);
      toast.error("Failed to ignore item");
    }
  };

  const collectChordsFromSongs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('populate_chord_review_queue');
      if (error) throw error;
      
      toast.success(`Collected ${data} new chords from user songs`);
      fetchReviewQueue();
    } catch (error) {
      console.error("Error collecting chords:", error);
      toast.error("Failed to collect chords from songs");
    } finally {
      setLoading(false);
    }
  };

  const mapToMasterChord = async (masterChordId: string) => {
    if (!selectedItem) return;
    
    try {
      const { error } = await supabase
        .from("chord_review_queue")
        .update({ 
          mapped_to_master_id: masterChordId,
          status: "mapped",
          mapped_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", selectedItem.id);
      
      if (error) throw error;
      toast.success("Successfully mapped to master chord");
      setMappingDialogOpen(false);
      setSelectedItem(null);
      fetchReviewQueue();
    } catch (error) {
      console.error("Error mapping chord:", error);
      toast.error("Failed to map chord");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "mapped":
        return <Badge variant="secondary">Mapped</Badge>;
      case "ignored":
        return <Badge variant="destructive">Ignored</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? "secondary" : percentage >= 60 ? "outline" : "destructive";
    
    return <Badge variant={variant}>{percentage}%</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            Chord Review Queue
          </h2>
          <p className="text-muted-foreground">
            Unmapped chords found in user songs - {items.length} items pending review
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={collectChordsFromSongs}
            variant="outline"
            disabled={loading}
          >
            <Music className="h-4 w-4 mr-2" />
            Collect Chords from Songs
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Chord Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="mapped">Mapped</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                {selectedItems.length > 0 && (
                  <>
                    <Button variant="outline" size="sm">
                      Bulk Map ({selectedItems.length})
                    </Button>
                    <Button variant="outline" size="sm">
                      Bulk Ignore
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Queue Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.length === items.length && items.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Chord Text</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Sample Songs</TableHead>
              <TableHead>AI Suggestion</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-48">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading review queue...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Check className="h-8 w-8 text-green-500" />
                    <span className="text-muted-foreground">
                      No unmapped chords found - all good! 🎉
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary">
                    {item.chord_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.occurrence_count} songs</Badge>
                  </TableCell>
                  <TableCell>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View ({item.sample_song_titles?.length || 0})
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="space-y-2">
                          <h4 className="font-medium">Sample Songs:</h4>
                          <ul className="text-sm space-y-1">
                            {(item.sample_song_titles || []).map((title, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Music className="h-3 w-3" />
                                {title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell>
                    {item.suggested_root_note && item.suggested_quality ? (
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {item.suggested_root_note}{item.suggested_quality}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">No suggestion</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getConfidenceBadge(item.ai_confidence)}
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleEditAndReview(item)}
                        disabled={item.status !== 'pending'}
                      >
                        <Music className="h-4 w-4 mr-1" />
                        Edit & Review
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMapToExisting(item)}
                        disabled={item.status !== 'pending'}
                      >
                        <Search className="h-4 w-4 mr-1" />
                        Map
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleIgnore(item.id)}
                        disabled={item.status !== 'pending'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Map "{selectedItem?.chord_name}" to Master Chord</DialogTitle>
            <DialogDescription>
              Search and select an existing master chord to map this unmapped chord to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              placeholder="Search master chords..."
              className="w-full"
            />
            
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chord Name</TableHead>
                    <TableHead>Root</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterChords.map((chord) => (
                    <TableRow key={chord.id}>
                      <TableCell className="font-mono">{chord.chord_name}</TableCell>
                      <TableCell>{chord.root_note}</TableCell>
                      <TableCell>{chord.quality}</TableCell>
                      <TableCell>{chord.instrument}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          onClick={() => mapToMasterChord(chord.id)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chord Editor for Creating New */}
      <ChordEditor
        open={chordEditorOpen}
        onOpenChange={setChordEditorOpen}
        prefilledData={prefilledChordData}
        onSave={async (savedChordId, chordData) => {
          // Handle review queue item approval and update song references
          if (prefilledChordData && savedChordId) {
            // Check if this was opened from Edit & Review
            if (prefilledChordData.reviewQueueItemId) {
              await supabase
                .from("chord_review_queue")
                .update({ 
                  mapped_to_master_id: savedChordId,
                  status: "approved",
                  reviewed_by: (await supabase.auth.getUser()).data.user?.id,
                  reviewed_at: new Date().toISOString()
                })
                .eq("id", prefilledChordData.reviewQueueItemId);
              
              // Update chord references in songs if chord name changed
              if (prefilledChordData.originalChordName && chordData && 
                  prefilledChordData.originalChordName !== chordData.chord_name) {
                await supabase.rpc('update_chord_references_in_songs', {
                  old_chord_name: prefilledChordData.originalChordName,
                  new_chord_data: chordData
                });
              }
            } else {
              // Legacy create new behavior
              const reviewItem = items.find(item => 
                item.chord_name.toLowerCase() === prefilledChordData.chord_name.toLowerCase()
              );
              
              if (reviewItem) {
                await supabase
                  .from("chord_review_queue")
                  .update({ 
                    mapped_to_master_id: savedChordId,
                    status: "approved",
                    reviewed_by: (await supabase.auth.getUser()).data.user?.id,
                    reviewed_at: new Date().toISOString()
                  })
                  .eq("id", reviewItem.id);
              }
            }
          }
          
          fetchReviewQueue();
          setPrefilledChordData(null);
          setSelectedItem(null);
        }}
      />
    </div>
  );
};

export default ChordReviewQueue;