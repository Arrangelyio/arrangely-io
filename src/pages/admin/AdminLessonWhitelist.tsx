import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  UserCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface WhitelistEntry {
  id: string;
  lesson_id: string;
  lesson_title: string;
  user_id: string;
  user_email: string;
  user_display_name: string;
  added_by: string;
  added_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
  total_count: number;
}

interface Lesson {
  id: string;
  title: string;
}

interface User {
  user_id: string;
  email: string;
  display_name: string;
}

const AdminLessonWhitelist = () => {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WhitelistEntry | null>(null);

  // Form state
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedLesson, setSelectedLesson] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [notes, setNotes] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_get_lesson_whitelist", {
        p_search: searchQuery.trim(),
        p_page: currentPage,
        p_limit: itemsPerPage,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setEntries([]);
        setTotalItems(0);
        return;
      }

      setTotalItems(Number(data[0].total_count || 0));
      setEntries(data);
    } catch (err) {
      console.error("Error fetching whitelist:", err);
      toast.error("Failed to fetch whitelist entries");
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase.rpc("admin_get_lessons_for_whitelist");
      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      console.error("Error fetching lessons:", err);
    }
  };

  const searchUsers = async (search: string) => {
    try {
      const { data, error } = await supabase.rpc("admin_search_users_for_whitelist", {
        p_search: search,
      });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Error searching users:", err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    if (addDialogOpen) {
      fetchLessons();
      searchUsers("");
    }
  }, [addDialogOpen]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (userSearch) {
        searchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleAdd = async () => {
    if (!selectedLesson || !selectedUser) {
      toast.error("Please select both a lesson and a user");
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc("admin_add_to_lesson_whitelist", {
        p_lesson_id: selectedLesson,
        p_user_id: selectedUser,
        p_notes: notes || null,
      });

      if (error) throw error;

      toast.success("User added to whitelist successfully");
      setAddDialogOpen(false);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      console.error("Error adding to whitelist:", err);
      toast.error(err.message || "Failed to add user to whitelist");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEntry) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc("admin_update_lesson_whitelist", {
        p_id: selectedEntry.id,
        p_notes: notes,
      });

      if (error) throw error;

      toast.success("Whitelist entry updated successfully");
      setEditDialogOpen(false);
      setSelectedEntry(null);
      resetForm();
      fetchEntries();
    } catch (err: any) {
      console.error("Error updating whitelist:", err);
      toast.error(err.message || "Failed to update whitelist entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntry) return;

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc("admin_delete_from_lesson_whitelist", {
        p_id: selectedEntry.id,
      });

      if (error) throw error;

      toast.success("User removed from whitelist successfully");
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (err: any) {
      console.error("Error deleting from whitelist:", err);
      toast.error(err.message || "Failed to remove user from whitelist");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedLesson("");
    setSelectedUser("");
    setNotes("");
    setUserSearch("");
  };

  const openEditDialog = (entry: WhitelistEntry) => {
    setSelectedEntry(entry);
    setNotes(entry.notes || "");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (entry: WhitelistEntry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lesson Whitelist</h1>
          <p className="text-muted-foreground">
            Manage pre-authorized access to lessons
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Whitelisted Users ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by lesson title or user name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No whitelist entries found
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Lesson</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {entry.user_display_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {entry.user_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {entry.lesson_title || "Unknown Lesson"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {entry.notes || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {entry.added_by_name || "System"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(entry.created_at)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(entry)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(entry)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to Whitelist</DialogTitle>
            <DialogDescription>
              Grant pre-authorized access to a lesson for a specific user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lesson</Label>
              <Select value={selectedLesson} onValueChange={setSelectedLesson}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Input
                placeholder="Search users by email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mb-2"
              />
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.display_name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about this whitelist entry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? "Adding..." : "Add to Whitelist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Whitelist Entry</DialogTitle>
            <DialogDescription>
              Update the notes for this whitelist entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Input
                value={`${selectedEntry?.user_display_name || ""} (${selectedEntry?.user_email || ""})`}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>Lesson</Label>
              <Input value={selectedEntry?.lesson_title || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about this whitelist entry..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Whitelist</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this user from the lesson whitelist?
              They will no longer have pre-authorized access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              <strong>User:</strong> {selectedEntry?.user_display_name} ({selectedEntry?.user_email})
            </p>
            <p className="text-sm">
              <strong>Lesson:</strong> {selectedEntry?.lesson_title}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLessonWhitelist;
