import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { storeIntendedUrl, getIntendedUrl, clearIntendedUrl, requiresAuthOrOnboarding } from "@/utils/redirectUtils";


interface OnboardingGuardProps {
  children: React.ReactNode;
}

const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Routes that don't require onboarding
  const publicRoutes = ['/auth', '/auth-callback', '/privacy', '/terms', '/contact'];

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (!user) {
          setLoading(false);
          return;
        }

        // Check if user is onboarded
        // Check if user is onboarded - use any to bypass complex type issues
        const profileQuery = await supabase
          .from('profiles')
          .select('is_onboarded')
          .eq('user_id', user.id)
          .single();

        if (profileQuery.error) {
          console.error('Error fetching profile:', profileQuery.error);
          setIsOnboarded(false);
          return;
        }

        const onboardedStatus = (profileQuery.data as any)?.is_onboarded || false;
        setIsOnboarded(onboardedStatus);

        // Redirect logic
        const currentPath = location.pathname;
        
        if (!user && requiresAuthOrOnboarding(currentPath)) {
          // Store the intended URL before redirecting to auth
          storeIntendedUrl(currentPath);
          navigate('/auth');
        } else if (user && !onboardedStatus && requiresAuthOrOnboarding(currentPath)) {
          // User is authenticated but not onboarded, and accessing a protected route
          storeIntendedUrl(currentPath);
          navigate('/profile-setup');
        } else if (onboardedStatus && currentPath === '/profile-setup') {
          const intendedUrl = getIntendedUrl();
          window.location.href = intendedUrl || "/";
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          checkOnboardingStatus();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

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

  // Allow access to public routes
  if (publicRoutes.includes(location.pathname)) {
    return <>{children}</>;
  }

  // Block access if user is authenticated but not onboarded
  if (user && !isOnboarded) {
    return null; // Will redirect to profile-setup
  }

  return <>{children}</>;
};

export default OnboardingGuard;