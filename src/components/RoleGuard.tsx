// @ts-nocheck
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

const RoleGuard = ({ children, allowedRoles = [], requireAuth = true }: RoleGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (requireAuth) {
            navigate("/auth");
            return;
          } else {
            setHasAccess(true);
            setLoading(false);
            return;
          }
        }

        setUser(session.user);

        // Get user profile and role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_onboarded")
          .eq("user_id", session.user.id)
          .single();

        if (!profile?.is_onboarded) {
          navigate("/profile-setup");
          return;
        }

        const role = profile?.role || "user";
        setUserRole(role);

        // Check if user has required role
        if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
          setHasAccess(true);
        } else {
          // Redirect to unauthorized page or home
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking user access:", error);
        if (requireAuth) {
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    checkUserAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserAccess();
    });

    return () => subscription.unsubscribe();
  }, [allowedRoles, requireAuth, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
};

export default RoleGuard;