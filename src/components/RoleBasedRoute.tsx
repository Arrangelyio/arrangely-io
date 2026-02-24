import { useUserRole, UserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ComingSoon from "./ComingSoon";
import { storeIntendedUrl } from "@/utils/redirectUtils";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackTitle?: string;
  fallbackDescription?: string;
  requireAuth?: boolean;
}

const RoleBasedRoute = ({ 
  children, 
  allowedRoles = [],
  fallbackTitle = "Access Restricted",
  fallbackDescription = "This feature is not available for your current role.",
  requireAuth = true 
}: RoleBasedRouteProps) => {
  const { user, role, loading, canAccessRoute } = useUserRole();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t("common.checkingAccess")}</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    storeIntendedUrl(window.location.href);
    window.location.href = "/auth"; // atau navigate("/auth") untuk SPA
    return null;
  }

  // Check role-based access
  if (!canAccessRoute(allowedRoles)) {
    return (
      <ComingSoon 
        title={fallbackTitle}
        description={fallbackDescription}
      />
    );
  }

  return <>{children}</>;
};

export default RoleBasedRoute;