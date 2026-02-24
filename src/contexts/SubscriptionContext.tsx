import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  isTrialing: boolean;
  subscription: unknown;
  trialEnd?: string;
  nextBillingDate?: string;
  canStartTrial?: boolean;
  hasUsedTrial?: boolean;
  hasSuccessfulPayment?: boolean;
}

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  startFreeTrial: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Cache for subscription data
const subscriptionCache = {
  data: null as SubscriptionStatus | null,
  timestamp: 0,
  ttl: 2 * 60 * 1000, // 2 minutes cache
  userId: null as string | null,
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const { toast } = useToast();
  
  // Refs for optimization
  const lastFetchTime = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialLoad = useRef(true);

  const checkSubscription = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setSubscriptionStatus(null);
      setLoading(false);
      return;
    }

    const now = Date.now();
    const userId = user.id;

    // Check cache first (unless force refresh or user changed)
    if (!forceRefresh && 
        subscriptionCache.data && 
        subscriptionCache.userId === userId &&
        (now - subscriptionCache.timestamp) < subscriptionCache.ttl) {
      setSubscriptionStatus(subscriptionCache.data);
      setLoading(false);
      return;
    }

    // Prevent duplicate requests
    if (now - lastFetchTime.current < 1000) { // 1 second throttle
      return;
    }
    lastFetchTime.current = now;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        if (error.name !== 'AbortError') {
          console.error('Error checking subscription:', error);
          // Use cached data if available on error
          if (subscriptionCache.data && subscriptionCache.userId === userId) {
            setSubscriptionStatus(subscriptionCache.data);
          } else {
            setSubscriptionStatus({
              hasActiveSubscription: false,
              isTrialing: false,
              subscription: null
            });
          }
        }
        return;
      }

      // Update cache
      subscriptionCache.data = data;
      subscriptionCache.timestamp = now;
      subscriptionCache.userId = userId;

      setSubscriptionStatus(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error checking subscription status:', error);
        // Use cached data if available on error
        if (subscriptionCache.data && subscriptionCache.userId === userId) {
          setSubscriptionStatus(subscriptionCache.data);
        } else {
          setSubscriptionStatus({
            hasActiveSubscription: false,
            isTrialing: false,
            subscription: null
          });
        }
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [user]);

  const startFreeTrial = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to start a free trial",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('start-free-trial');

      if (error) {
        console.error('Error starting trial:', error);
        toast({
          title: "Error", 
          description: error.message || "Failed to start free trial",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "🎉 Free Trial Started!",
        description: `You now have 7 days of free access to all premium features. Trial ends on ${new Date(data.trial_end).toLocaleDateString('id-ID')}`,
      });

      // Force refresh subscription status and clear cache
      subscriptionCache.data = null;
      subscriptionCache.timestamp = 0;
      await checkSubscription(true);
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast({
        title: "Error",
        description: "Failed to start free trial. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast, checkSubscription]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscriptionStatus(null);
      setLoading(false);
      // Clear cache when user logs out
      subscriptionCache.data = null;
      subscriptionCache.timestamp = 0;
      subscriptionCache.userId = null;
    }
  }, [user, checkSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const value = {
    subscriptionStatus,
    loading,
    checkSubscription,
    startFreeTrial
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};