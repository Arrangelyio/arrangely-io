import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

interface MenuPermissionWithDetails {
  menu_id: string;
  can_access: boolean;
  detail_paths: string[];
}

export const useAdminMenuPermissions = () => {
  const { user, role } = useUserRole();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [detailPathMappings, setDetailPathMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [hasAnyPermissions, setHasAnyPermissions] = useState(false);
  const [accessibleMenus, setAccessibleMenus] = useState<string[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions({});
        setDetailPathMappings({});
        setHasAnyPermissions(false);
        setAccessibleMenus([]);
        setLoading(false);
        return;
      }

      // Super admins (role = 'admin' in profiles) have access to everything
      if (role === 'admin') {
        setPermissions({});
        setDetailPathMappings({});
        setHasAnyPermissions(true);
        setAccessibleMenus([]);
        setLoading(false);
        return;
      }

      // For support_admin and other roles, fetch permissions from database
      try {
        // Fetch menu permissions with detail paths for this user's assigned roles
        const { data, error } = await supabase.rpc('get_user_menu_permissions_with_details', {
          check_user_id: user.id
        });

        if (error) {
          console.error('Error fetching menu permissions:', error);
          setPermissions({});
          setDetailPathMappings({});
          setHasAnyPermissions(false);
          setAccessibleMenus([]);
        } else {
          const permMap: Record<string, boolean> = {};
          const detailMap: Record<string, string> = {};
          const permArray = data as MenuPermissionWithDetails[] || [];
          const accessibleList: string[] = [];
          
          permArray.forEach((p) => {
            permMap[p.menu_id] = p.can_access;
            if (p.can_access) {
              accessibleList.push(p.menu_id);
              // Map each detail path pattern to its parent menu_id
              if (p.detail_paths && p.detail_paths.length > 0) {
                p.detail_paths.forEach((pathPattern) => {
                  detailMap[pathPattern] = p.menu_id;
                });
              }
            }
          });
          
          // Check if user has at least one accessible menu
          const hasAccess = permArray.some((p) => p.can_access === true);
          
          setPermissions(permMap);
          setDetailPathMappings(detailMap);
          setHasAnyPermissions(hasAccess);
          setAccessibleMenus(accessibleList);
        }
      } catch (err) {
        console.error('Error in useAdminMenuPermissions:', err);
        setPermissions({});
        setDetailPathMappings({});
        setHasAnyPermissions(false);
        setAccessibleMenus([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user, role]);

  // Get menu_id from a path (checks for detail path patterns)
  const getMenuIdFromPath = (path: string): string | null => {
    // Check if path matches any detail path pattern
    for (const [pattern, menuId] of Object.entries(detailPathMappings)) {
      if (path.startsWith(pattern)) {
        return menuId;
      }
    }
    return null;
  };

  const canAccessMenu = (menuId: string): boolean => {
    // Super admins have access to all menus
    if (role === 'admin') return true;
    
    // Check specific permission
    return permissions[menuId] === true;
  };

  // Check if user can access a specific path (including detail pages)
  const canAccessPath = (path: string): boolean => {
    // Super admins have access to all paths
    if (role === 'admin') return true;
    
    // Check if this is a detail path and get its parent menu_id
    const parentMenuId = getMenuIdFromPath(path);
    if (parentMenuId) {
      return permissions[parentMenuId] === true;
    }
    
    return false;
  };

  const canAccessAdminDashboard = (): boolean => {
    // Super admins always have access
    if (role === 'admin') return true;
    
    // Other roles need at least one permission assigned
    return hasAnyPermissions;
  };

  // Get the first accessible menu ID for redirect
  const getFirstAccessibleMenuId = (): string | null => {
    if (role === 'admin') return null; // Admin can access all, no specific redirect needed
    if (accessibleMenus.length > 0) return accessibleMenus[0];
    return null;
  };

  return {
    permissions,
    detailPathMappings,
    loading,
    canAccessMenu,
    canAccessPath,
    getMenuIdFromPath,
    canAccessAdminDashboard,
    hasAnyPermissions,
    accessibleMenus,
    getFirstAccessibleMenuId,
    isSuperAdmin: role === 'admin'
  };
};
