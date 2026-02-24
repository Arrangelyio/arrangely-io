import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
    Menu,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminMenuPermissions } from "@/hooks/useAdminMenuPermissions";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  end?: boolean;
  children?: MenuItem[];
}

// Helper to flatten grouped menu items for permission/route checks
export const flattenMenuItems = (items: MenuItem[]): MenuItem[] => {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      result.push(...item.children);
    } else {
      result.push(item);
    }
  }
  return result;
};

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  menuItems: MenuItem[];
}

const AdminSidebar = ({ isOpen, onToggle, menuItems }: AdminSidebarProps) => {
  const { canAccessMenu, isSuperAdmin, loading } = useAdminMenuPermissions();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canShowItem = (item: MenuItem): boolean => {
    if (isSuperAdmin) return true;
    return canAccessMenu(item.id);
  };

  // Filter items: for groups, keep group if any child is accessible
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.children) {
      return item.children.some(canShowItem);
    }
    return canShowItem(item);
  });

  const renderSingleItem = (item: MenuItem) => (
    <NavLink
      key={item.id}
      to={item.path}
      end={item.path === "/admin-dashboard-secure-7f8e2a9c"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group text-sm",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-primary hover:bg-muted",
          !isOpen && "justify-center"
        )
      }
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {isOpen && <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  const renderGroup = (group: MenuItem) => {
    const visibleChildren = group.children!.filter(canShowItem);
    if (visibleChildren.length === 0) return null;

    const isGroupOpen = openGroups[group.id] ?? false;

    if (!isOpen) {
      // Collapsed sidebar: show only the group icon, no children
      return (
        <div key={group.id} className="relative group/menu">
          <button
            onClick={() => toggleGroup(group.id)}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
            title={group.label}
          >
            <group.icon className="h-4 w-4 flex-shrink-0" />
          </button>
        </div>
      );
    }

    return (
      <Collapsible
        key={group.id}
        open={isGroupOpen}
        onOpenChange={() => toggleGroup(group.id)}
      >
        <CollapsibleTrigger className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors text-sm">
          <group.icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate flex-1 text-left">{group.label}</span>
          {isGroupOpen ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 pl-3 border-l border-border space-y-0.5 mt-0.5">
            {visibleChildren.map((child) => (
              <NavLink
                key={child.id}
                to={child.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  )
                }
              >
                <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{child.label}</span>
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-50 flex flex-col",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        {isOpen && (
          <div>
            <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
            <p className="text-sm text-muted-foreground">Platform Management</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <nav className="p-3 space-y-1 overflow-y-auto flex-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        ) : (
          filteredMenuItems.map((item) =>
            item.children ? renderGroup(item) : renderSingleItem(item)
          )
        )}
      </nav>
    </div>
  );
};

export default AdminSidebar;
