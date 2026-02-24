import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Shield, Users } from "lucide-react";
import { MenuItem } from "@/components/admin/AdminSidebar";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Music,
  FileText,
  Settings,
  BarChart3,
  Database,
  CreditCard,
  MessageSquare,
  Award,
  Wallet,
  Package,
  CalendarDays,
  Guitar,
  Mail,
  BookOpen,
  Bell,
} from "lucide-react";

// Define all available admin menus
const ALL_ADMIN_MENUS: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin-dashboard-secure-7f8e2a9c", end: true },
  { id: "users", label: "User Management", icon: UsersIcon, path: "/admin-dashboard-secure-7f8e2a9c/users" },
  { id: "creators", label: "Creator Applications", icon: FileText, path: "/admin-dashboard-secure-7f8e2a9c/creators" },
  { id: "song-creators", label: "Song Creators", icon: Music, path: "/admin-dashboard-secure-7f8e2a9c/song-creators" },
  { id: "creator-dashboard", label: "Creator Dashboard", icon: UsersIcon, path: "/admin-dashboard-secure-7f8e2a9c/creator-dashboard" },
  { id: "content", label: "Content Management", icon: Music, path: "/admin-dashboard-secure-7f8e2a9c/content" },
  { id: "song-reviews", label: "Song Reviews", icon: FileText, path: "/admin-dashboard-secure-7f8e2a9c/song-reviews" },
  { id: "request-songs", label: "Request Songs", icon: Music, path: "/admin-dashboard-secure-7f8e2a9c/request-songs" },
  { id: "chord-master", label: "Chord Master", icon: Guitar, path: "/admin-dashboard-secure-7f8e2a9c/chord-master" },
  { id: "lessons", label: "Lessons", icon: BookOpen, path: "/admin-dashboard-secure-7f8e2a9c/lessons" },
  { id: "lesson-sections", label: "Lesson Sections", icon: Package, path: "/admin-dashboard-secure-7f8e2a9c/lesson-sections" },
  { id: "tier-assessments", label: "Test Your Level", icon: Award, path: "/admin-dashboard-secure-7f8e2a9c/tier-assessments" },
  { id: "song-analytics", label: "Song Analytics", icon: Music, path: "/admin-dashboard-secure-7f8e2a9c/song-analytics" },
  { id: "comments", label: "Comments", icon: MessageSquare, path: "/admin-dashboard-secure-7f8e2a9c/comments" },
  { id: "events", label: "Events Management", icon: CalendarDays, path: "/admin-dashboard-secure-7f8e2a9c/events" },
  { id: "analytics", label: "Analytics & Reports", icon: BarChart3, path: "/admin-dashboard-secure-7f8e2a9c/analytics" },
  { id: "payments", label: "Subscription Payments", icon: CreditCard, path: "/admin-dashboard-secure-7f8e2a9c/payments" },
  { id: "event-payments", label: "Event Payments", icon: CreditCard, path: "/admin-dashboard-secure-7f8e2a9c/event-payments" },
  { id: "lesson-payments", label: "Lesson Payments", icon: CreditCard, path: "/admin-dashboard-secure-7f8e2a9c/lesson-payments" },
  { id: "subscription-plans", label: "Subscription Plans", icon: Package, path: "/admin-dashboard-secure-7f8e2a9c/subscription-plans" },
  { id: "creator-benefits", label: "Creator Benefits", icon: Award, path: "/admin-dashboard-secure-7f8e2a9c/creator-benefits" },
  { id: "platform-benefit-rules", label: "Global Benefit Rules", icon: Settings, path: "/admin-dashboard-secure-7f8e2a9c/platform-benefit-rules" },
  { id: "lesson-benefits", label: "Lesson Benefits", icon: Award, path: "/admin-dashboard-secure-7f8e2a9c/lesson-benefits" },
  { id: "discount-codes", label: "Discount Codes", icon: CreditCard, path: "/admin-dashboard-secure-7f8e2a9c/discount-codes" },
  { id: "withdrawals", label: "Withdrawals", icon: Wallet, path: "/admin-dashboard-secure-7f8e2a9c/withdrawals" },
  { id: "chat", label: "Chat Support", icon: MessageSquare, path: "/admin-dashboard-secure-7f8e2a9c/chat" },
  { id: "bulk-email", label: "Bulk Email", icon: Mail, path: "/admin-dashboard-secure-7f8e2a9c/bulk-email" },
  { id: "email-blasts", label: "Email Blasts", icon: Mail, path: "/admin-dashboard-secure-7f8e2a9c/email-blasts" },
  { id: "push-notifications", label: "Push Notifications", icon: Bell, path: "/admin-dashboard-secure-7f8e2a9c/push-notifications" },
  { id: "security", label: "Security", icon: Shield, path: "/admin-dashboard-secure-7f8e2a9c/security" },
  { id: "system", label: "System Health", icon: Database, path: "/admin-dashboard-secure-7f8e2a9c/system" },
  { id: "settings", label: "Settings", icon: Settings, path: "/admin-dashboard-secure-7f8e2a9c/settings" },
  { id: "role-management", label: "Role Management", icon: Shield, path: "/admin-dashboard-secure-7f8e2a9c/role-management" },
];

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system_role: boolean;
  created_at: string;
}

interface MenuPermission {
  id: string;
  role_id: string;
  menu_id: string;
  can_access: boolean;
}

interface UserAdminRole {
  id: string;
  user_id: string;
  role_id: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  };
}

const AdminRoleManagement = () => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>({});
  const [roleUsers, setRoleUsers] = useState<UserAdminRole[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignUserOpen, setIsAssignUserOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_roles")
        .select("*")
        .eq("is_production", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error("Error fetching roles:", err);
      toast.error("Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from("admin_menu_permissions")
        .select("*")
        .eq("role_id", roleId)
        .eq("is_production", true);

      if (error) throw error;

      const permMap: Record<string, boolean> = {};
      (data || []).forEach((p) => {
        permMap[p.menu_id] = p.can_access;
      });
      setMenuPermissions(permMap);
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  };

  const fetchRoleUsers = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_admin_roles")
        .select(`
          *,
          profiles:user_id (display_name, email)
        `)
        .eq("role_id", roleId)
        .eq("is_production", true);

      if (error) throw error;
      setRoleUsers(data || []);
    } catch (err) {
      console.error("Error fetching role users:", err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
      fetchRoleUsers(selectedRole.id);
    }
  }, [selectedRole]);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("admin_roles")
        .insert({
          name: newRoleName,
          description: newRoleDescription || null,
          is_production: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Role created successfully");
      setIsCreateOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      fetchRoles();
    } catch (err: any) {
      console.error("Error creating role:", err);
      toast.error(err.message || "Failed to create role");
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;

    try {
      const { error } = await supabase
        .from("admin_roles")
        .update({
          name: newRoleName,
          description: newRoleDescription || null,
        })
        .eq("id", selectedRole.id);

      if (error) throw error;

      toast.success("Role updated successfully");
      setIsEditOpen(false);
      fetchRoles();
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast.error(err.message || "Failed to update role");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("admin_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast.success("Role deleted successfully");
      if (selectedRole?.id === roleId) {
        setSelectedRole(null);
      }
      fetchRoles();
    } catch (err: any) {
      console.error("Error deleting role:", err);
      toast.error(err.message || "Failed to delete role");
    }
  };

  const handleTogglePermission = async (menuId: string, enabled: boolean) => {
    if (!selectedRole) return;

    try {
      if (enabled) {
        // Upsert permission
        const { error } = await supabase
          .from("admin_menu_permissions")
          .upsert({
            role_id: selectedRole.id,
            menu_id: menuId,
            can_access: true,
            is_production: true,
          }, {
            onConflict: "role_id,menu_id"
          });

        if (error) throw error;
      } else {
        // Delete permission
        const { error } = await supabase
          .from("admin_menu_permissions")
          .delete()
          .eq("role_id", selectedRole.id)
          .eq("menu_id", menuId);

        if (error) throw error;
      }

      setMenuPermissions(prev => ({
        ...prev,
        [menuId]: enabled
      }));
    } catch (err) {
      console.error("Error toggling permission:", err);
      toast.error("Failed to update permission");
    }
  };

  const handleAssignUser = async () => {
    if (!selectedRole || !userEmail.trim()) {
      toast.error("Please enter a user email");
      return;
    }

    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", userEmail.trim())
        .single();

      if (profileError || !profiles) {
        toast.error("User not found with that email");
        return;
      }

      // Assign role
      const { error } = await supabase
        .from("user_admin_roles")
        .insert({
          user_id: profiles.user_id,
          role_id: selectedRole.id,
          is_production: true,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("User already has this role");
        } else {
          throw error;
        }
        return;
      }

      toast.success("User assigned to role successfully");
      setUserEmail("");
      setIsAssignUserOpen(false);
      fetchRoleUsers(selectedRole.id);
    } catch (err: any) {
      console.error("Error assigning user:", err);
      toast.error(err.message || "Failed to assign user");
    }
  };

  const handleRemoveUserFromRole = async (userRoleId: string) => {
    try {
      const { error } = await supabase
        .from("user_admin_roles")
        .delete()
        .eq("id", userRoleId);

      if (error) throw error;

      toast.success("User removed from role");
      if (selectedRole) {
        fetchRoleUsers(selectedRole.id);
      }
    } catch (err) {
      console.error("Error removing user:", err);
      toast.error("Failed to remove user");
    }
  };

  const openEditDialog = (role: AdminRole) => {
    setSelectedRole(role);
    setNewRoleName(role.name);
    setNewRoleDescription(role.description || "");
    setIsEditOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">
            Create and manage admin roles with custom menu permissions
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Content Manager"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role can do..."
                />
              </div>
              <Button onClick={handleCreateRole} className="w-full">
                Create Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRole?.id === role.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {role.name}
                      {role.is_system_role && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                  </div>
                  {!role.is_system_role && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(role);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the role and remove all
                              users from it. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRole(role.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {roles.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No roles created yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Permissions & Users */}
        <Card className="lg:col-span-2">
          {selectedRole ? (
            <>
              <CardHeader>
                <CardTitle>
                  {selectedRole.name} - Permissions & Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Menu Permissions */}
                <div>
                  <h3 className="font-semibold mb-3">Menu Access</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                    {ALL_ADMIN_MENUS.map((menu) => (
                      <div
                        key={menu.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <menu.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{menu.label}</span>
                        </div>
                        <Switch
                          checked={menuPermissions[menu.id] || false}
                          onCheckedChange={(checked) =>
                            handleTogglePermission(menu.id, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Users */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Assigned Users
                    </h3>
                    <Dialog open={isAssignUserOpen} onOpenChange={setIsAssignUserOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Assign User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign User to {selectedRole.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="userEmail">User Email</Label>
                            <Input
                              id="userEmail"
                              type="email"
                              value={userEmail}
                              onChange={(e) => setUserEmail(e.target.value)}
                              placeholder="user@example.com"
                            />
                          </div>
                          <Button onClick={handleAssignUser} className="w-full">
                            Assign User
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roleUsers.map((ur) => (
                        <TableRow key={ur.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {ur.profiles?.display_name || "Unknown"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {ur.profiles?.email || ""}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(ur.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUserFromRole(ur.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {roleUsers.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-muted-foreground"
                          >
                            No users assigned to this role
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                Select a role to view and manage its permissions
              </p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editRoleName">Role Name</Label>
              <Input
                id="editRoleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editRoleDescription">Description</Label>
              <Textarea
                id="editRoleDescription"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdateRole} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRoleManagement;
