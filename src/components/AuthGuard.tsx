import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { storeIntendedUrl, getIntendedUrl, clearIntendedUrl } from "@/utils/redirectUtils";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Completely skip AuthGuard logic on auth page
    if (window.location.pathname === "/auth") {
      setLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Redirect logic - never interfere with auth page
        if (requireAuth && !session && window.location.pathname !== "/auth") {
          storeIntendedUrl(window.location.href);
          navigate("/auth");
        }
        // Remove the redirect logic that was interfering with auth page
      }
    );

    // THEN check for existing session with timeout for Safari
    const checkSession = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 3000)
        );
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as { data: { session: Session | null } };
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Initial redirect logic - never interfere with auth page
        if (requireAuth && !session && window.location.pathname !== "/auth") {
          storeIntendedUrl(window.location.href);
          navigate("/auth");
        }
        // Remove the redirect logic that was interfering with auth page
      } catch (error) {
        console.error("AuthGuard session check error:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, requireAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !session) {
    return null; // Will redirect to auth
  }

  if (!requireAuth && session && window.location.pathname === "/auth") {
    return null; // Will redirect to homepage
  }

  return <>{children}</>;
};

export default AuthGuard;