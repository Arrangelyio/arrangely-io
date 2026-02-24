import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getIntendedUrl, clearIntendedUrl } from "@/utils/redirectUtils";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Setting up your account...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if this auth was initiated from a mobile app FIRST
        const mobileCallback = localStorage.getItem('mobileAuthCallback');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthCallback] Auth callback error:', error);
          navigate('/auth');
          return;
        }

        if (data.session) {
          if (mobileCallback) {
            // This auth was initiated from mobile app - redirect back with tokens

            setStatus("Redirecting back to app...");

            localStorage.removeItem('mobileAuthCallback');

            // Get the current session tokens
            const accessToken = data.session.access_token;
            const refreshToken = data.session.refresh_token;

            // Build the callback URL with tokens in the fragment
            // Ensure proper URL format for deep linking
            let callbackBase = mobileCallback;
            // Remove any existing fragment or query
            if (callbackBase.includes('#')) {
              callbackBase = callbackBase.split('#')[0];
            }
            if (callbackBase.includes('?')) {
              callbackBase = callbackBase.split('?')[0];
            }

            const callbackUrl = `${callbackBase}#access_token=${accessToken}&refresh_token=${refreshToken}&token_type=bearer`;


            // Use a small delay to ensure the redirect happens
            setTimeout(() => {
              window.location.href = callbackUrl;
            }, 100);
            return;
          }

          // Check if user has a profile and is onboarded
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();
          
          if (!profile) {
            // New user, redirect to profile setup
            navigate('/profile-setup');
          } else if (!profile.is_onboarded) {
            // User exists but hasn't completed onboarding
            navigate('/profile-setup');
          } else {
            // Existing onboarded user, check for intended redirect
            const intendedUrl = getIntendedUrl();
            clearIntendedUrl();
            if (intendedUrl) {
              window.location.href = intendedUrl;
            } else {
              navigate('/');
            }
          }
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error in auth callback:', error);
        navigate('/auth');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>{status}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
