import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  MoreHorizontal,
  UserPlus,
  Shield,
  ChevronLeft,
  ChevronRight,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  phone_number?: string;
  role: string;
  creator_type: string;
  musical_role: string;
  created_at: string;
  is_onboarded: boolean;
  // public_songs_count: number;
  // private_songs_count: number;
  subscription?: {
    status: string;
    current_period_end?: string;
    trial_end?: string;
    trial_start?: string;
    is_trial?: boolean;
  };
  public_songs_count: number;
  private_songs_count: number;
  library_adds_count: number;
}

type UserRole = "admin" | "creator" | "user";
type CreatorType = "creator_arrangely" | "creator_professional";

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // <- ini yang dikirim ke server
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data: usersData, error } = await supabase.rpc(
        "get_revamp_admin_users_with_emails",
        {
          search_term: searchQuery.trim(),
          page: currentPage,
          limit_count: itemsPerPage,
        }
      );

      if (error) throw error;

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        setTotalItems(0);
        return;
      }

      // ambil total_count dari baris pertama (semua baris punya nilai sama)
      setTotalItems(Number(usersData[0].total_count || 0));

      const usersWithData = usersData.map((user) => ({
        id: user.profile_id,
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
        phone_number: user.phone_number,
        role: user.role,
        creator_type: user.creator_type,
        musical_role: user.musical_role,
        created_at: user.created_at,
        is_onboarded: user.is_onboarded,
        // public_songs_count: 0,
        // private_songs_count: 0,
        public_songs_count: user.published_songs_count || 0,
        private_songs_count: user.private_songs_count || 0,
        library_adds_count: user.library_adds_count || 0,
      }));

      setUsers(usersWithData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data hanya kalau page atau searchQuery berubah
  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const updatePayload: {
        role: UserRole;
        creator_type?: CreatorType | null;
      } = { role: newRole };

      if (newRole === "creator")
        updatePayload.creator_type = "creator_arrangely";
      else updatePayload.creator_type = null;

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("user_id", userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const updateCreatorType = async (
    userId: string,
    newCreatorType: "creator_arrangely" | "creator_professional"
  ) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ creator_type: newCreatorType })
        .eq("user_id", userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error("Error updating creator type:", error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "creator":
        return "default";
      default:
        return "secondary";
    }
  };

  const getCreatorTypeBadgeVariant = (creatorType: string) => {
    switch (creatorType) {
      case "creator_professional":
        return "default";
      case "creator_arrangely":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users and their permissions
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users ({totalItems})</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Creator Type</TableHead>
                <TableHead className="text-center">Private Songs</TableHead>
                <TableHead className="text-center">Library Adds</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {/* 1. Display Name */}
                  <TableCell className="font-medium">
                    {user.display_name || "No name"}
                  </TableCell>

                  {/* 2. Email */}
                  <TableCell>{user.email}</TableCell>

                  {/* 3. Phone */}
                  <TableCell>{user.phone_number || "-"}</TableCell>

                  {/* 4. Role */}
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>

                  {/* 5. Creator Type */}
                  <TableCell>
                    <Badge
                      variant={getCreatorTypeBadgeVariant(user.creator_type)}
                    >
                      {user.creator_type || "N/A"}
                    </Badge>
                  </TableCell>

                  {/* 6. Private Songs - Data hitungan pertama */}
                  <TableCell className="text-center">
                    <Badge variant="outline">{user.private_songs_count}</Badge>
                  </TableCell>

                  {/* 7. Library Adds - Data hitungan kedua */}
                  <TableCell className="text-center">
                    <Badge variant="outline">{user.library_adds_count}</Badge>
                  </TableCell>

                  {/* 8. Published - Data hitungan ketiga */}
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 hover:bg-green-100"
                    >
                      {user.public_songs_count}
                    </Badge>
                  </TableCell>

                  {/* 9. Status */}
                  <TableCell>
                    <Badge
                      variant={user.is_onboarded ? "default" : "secondary"}
                    >
                      {user.is_onboarded ? "Active" : "Pending"}
                    </Badge>
                  </TableCell>

                  {/* 10. Joined */}
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>

                  {/* 11. Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateUserRole(user.user_id, "admin")}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateUserRole(user.user_id, "creator")
                          }
                        >
                          Make Creator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateUserRole(user.user_id, "user")}
                        >
                          Make User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            updateCreatorType(
                              user.user_id,
                              "creator_professional"
                            )
                          }
                          disabled={user.role !== "creator"}
                        >
                          Professional Creator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            updateCreatorType(user.user_id, "creator_arrangely")
                          }
                          disabled={user.role !== "creator"}
                        >
                          Arrangely Creator
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>

            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
