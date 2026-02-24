import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminSidebar, { MenuItem, flattenMenuItems } from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import { useAdminMenuPermissions } from "@/hooks/useAdminMenuPermissions";
import { ShieldX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  menuItems: MenuItem[];
}

const AdminLayout = ({ menuItems }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { loading, canAccessMenu, canAccessAdminDashboard, hasAnyPermissions, accessibleMenus, isSuperAdmin } = useAdminMenuPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  // Flatten grouped items for route/permission checks
  const flatItems = useMemo(() => flattenMenuItems(menuItems), [menuItems]);

  // Determine the base path from first flat item
  const basePath = useMemo(() => {
    if (flatItems.length > 0) {
      const firstPath = flatItems[0].path;
      const segments = firstPath.split('/').filter(Boolean);
      return `/${segments[0]}`;
    }
    return '';
  }, [flatItems]);

  // Get current menu ID from path
  const currentMenuId = useMemo(() => {
    const path = location.pathname;
    
    // Check if on base path (index route) - this means dashboard
    if (path === basePath || path === `${basePath}/`) {
      return 'dashboard'; // Default dashboard menu
    }
    
    // Find the most specific matching menu item (longest path match)
    const sortedItems = [...flatItems].sort((a, b) => b.path.length - a.path.length);
    const matchingItem = sortedItems.find(item => {
      return path === item.path || path.startsWith(item.path + '/');
    });
    
    return matchingItem?.id || null;
  }, [location.pathname, flatItems, basePath]);

  // Check if we're on base path and need to redirect
  const isOnBasePath = location.pathname === basePath || location.pathname === `${basePath}/`;
  const shouldRedirect = !loading && isOnBasePath && !isSuperAdmin && hasAnyPermissions && !accessibleMenus.includes('dashboard');

  // Redirect to first accessible menu when on base path
  useEffect(() => {
    if (loading) return;
    
    const isOnBasePath = location.pathname === basePath || location.pathname === `${basePath}/`;
    
    if (!isOnBasePath) return;

    // Super admins: if dashboard is first menu, stay there; otherwise redirect to first menu
    if (isSuperAdmin) {
      // For super admin, dashboard is accessible, no redirect needed if on index
      return;
    }

    // Support admins: redirect to first accessible menu
    if (hasAnyPermissions && accessibleMenus.length > 0) {
      // Check if dashboard is accessible
      if (accessibleMenus.includes('dashboard')) {
        return; // Dashboard is accessible, stay on index
      }
      
      // Find first accessible menu and redirect
      const firstAccessibleMenu = flatItems.find(item => accessibleMenus.includes(item.id));
      if (firstAccessibleMenu) {
        navigate(firstAccessibleMenu.path, { replace: true });
      }
    }
  }, [loading, isSuperAdmin, accessibleMenus, hasAnyPermissions, flatItems, basePath, location.pathname, navigate]);

  // Show loading state or redirect pending
  if (loading || shouldRedirect) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{shouldRedirect ? 'Redirecting...' : 'Checking permissions...'}</p>
        </div>
      </div>
    );
  }

  // Show access restricted if user has no permissions at all
  if (!canAccessAdminDashboard()) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="bg-destructive/10 p-4 rounded-full w-fit mx-auto mb-6">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the Admin Dashboard. Please contact your administrator to request access.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Check if user can access the current menu (for direct URL access prevention)
  const canAccessCurrentPage = (): boolean => {
    if (isSuperAdmin) return true;
    if (!currentMenuId) return false;
    return canAccessMenu(currentMenuId);
  };

  // Render content - either show access restricted for specific page or outlet
  const renderContent = () => {
    if (!canAccessCurrentPage()) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="bg-destructive/10 rounded-full p-4 w-fit mx-auto mb-4">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this section. Contact your administrator to request access.
            </p>
            {hasAnyPermissions && accessibleMenus.length > 0 && (
              <Button
                onClick={() => {
                  const firstAccessibleMenu = flatItems.find(item => accessibleMenus.includes(item.id));
                  if (firstAccessibleMenu) {
                    navigate(firstAccessibleMenu.path);
                  }
                }}
              >
                Go to Available Section
              </Button>
            )}
          </div>
        </div>
      );
    }

    return <Outlet />;
  };

  return (
    <div className="min-h-screen bg-gradient-sanctuary">
      <div className="flex">
        <AdminSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          menuItems={menuItems}
        />

        <div
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          <AdminHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <main className="p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
