import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

export type UserRole = 'admin' | 'creator' | 'user' | 'support_admin';

// Global state to prevent multiple simultaneous session fetches
let globalSessionPromise: Promise<Session | null> | null = null;
let globalSessionCache: { session: Session | null; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds cache

// Safari-specific cache busting
const isSafari = () => {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

const clearSafariCaches = () => {
  if (isSafari()) {
    
    globalSessionCache = null;
    globalSessionPromise = null;
    // Clear any stale localStorage entries
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('arrangely')) {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              // Clear old session-related data
              if (parsed.expires_at && new Date(parsed.expires_at * 1000) < new Date()) {
                
                localStorage.removeItem(key);
              }
            } catch (e) {
              // Not JSON, skip
            }
          }
        }
      });
    } catch (error) {
      console.error('[useUserRole] Error clearing Safari caches:', error);
    }
  }
};


interface UseUserRoleReturn {
  user: User | null;
  role: UserRole | null;
  creatorType: string | null;
  loading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  isUser: boolean;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (routeRoles?: UserRole[]) => boolean;
}

export const useUserRole = (): UseUserRoleReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [creatorType, setCreatorType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const fetchUserProfile = async (currentUser: User) => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, permissions, creator_type")
          .eq("user_id", currentUser.id)
          .single();
        
        if (mounted) {
          if (profile) {
            setRole(profile.role || 'user');
            setCreatorType(profile.creator_type || null);
            setPermissions(
              typeof profile.permissions === 'object' && profile.permissions !== null 
                ? profile.permissions as Record<string, boolean> 
                : {}
            );
          } else {
            setRole('user');
            setCreatorType(null);
            setPermissions({});
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (mounted) {
          setRole('user');
          setCreatorType(null);
          setPermissions({});
        }
      }
    };

    const loadUserData = async (session: Session | null) => {
      
      
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        setCreatorType(null);
        setPermissions({});
      }
      
      if (mounted) {
        setLoading(false);
      }
      
      
    };

    // Singleton pattern for session fetching
    const getSessionSingleton = async (): Promise<Session | null> => {
      const now = Date.now();
      
      // Return cached result if still valid
      if (globalSessionCache && (now - globalSessionCache.timestamp < CACHE_DURATION)) {
        
        return globalSessionCache.session;
      }
      
      // Wait for existing request if in progress
      if (globalSessionPromise) {
        
        return await globalSessionPromise;
      }
      
      // Create new request
      
      globalSessionPromise = (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          // Cache the result
          globalSessionCache = { session, timestamp: now };
          
          
          return session;
        } finally {
          // Clear the promise so next request can start fresh
          globalSessionPromise = null;
        }
      })();
      
      return await globalSessionPromise;
    };

    // Initial load with singleton pattern to prevent multiple simultaneous fetches
    const initialize = async () => {
      

      // Fallback timeout supaya loading nggak stuck
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.warn("⚠️ Forcing loading=false due to timeout");
          setLoading(false);
        }
      }, 4000); // max 8 detik tunggu

      try {
        const session = await getSessionSingleton();
        

        await loadUserData(session);
        
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        if (mounted) {
          setLoading(false);
          setUser(null);
          setRole('user');
          setCreatorType(null);
        }
      } finally {
        clearTimeout(timeoutId); // bersihkan supaya nggak kepanggil setelah sukses
      }
    };


    // Prevent multiple initializations
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Clear Safari caches before initializing
      clearSafariCaches();
      initialize();
    }

    // Listen for auth changes - only handle token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear cache on any auth state change
      globalSessionCache = null;
      
      // Only handle token refresh silently, ignore all other events
      if (event === 'TOKEN_REFRESHED' && mounted && session?.user) {
        setUser(session.user);
      }
      // All other events (SIGNED_IN, SIGNED_OUT, etc.) are ignored
      // Initial auth state is handled by initialize() function
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (role === 'admin' || role === 'support_admin') return true;
    return permissions[permission] === true;
  };

  const canAccessRoute = (routeRoles?: UserRole[]): boolean => {
    if (!routeRoles || routeRoles.length === 0) return true;
    if (!role) return false;
    if (role === 'admin' || role === 'support_admin') return true;
    return routeRoles.includes(role);
  };

  return {
    user,
    role,
    creatorType,
    loading,
    isAdmin: role === 'admin',
    isCreator: role === 'creator',
    isUser: role === 'user',
    hasPermission,
    canAccessRoute
  };
};