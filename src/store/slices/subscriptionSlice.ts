import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval_type: string;
  interval_count: number;
  library_limit: number | null;
  features: Record<string, any> | null;
  is_active: boolean;
  is_production: boolean;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  trial_start: string | null;
  trial_end: string | null;
  is_trial: boolean | null;
  trial_expired: boolean | null;
  auto_payment_enabled: boolean | null;
  payment_failed_count: number | null;
  next_payment_attempt: string | null;
  last_payment_status: string | null;
  midtrans_subscription_id: string | null;
  retry_count: number | null;
  last_retry_at: string | null;
  is_production: boolean;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

interface UsageStats {
  youtube_imports_count: number;
  youtube_imports_limit: number;
  pdf_exports_count: number;
  pdf_exports_limit: number;
  library_count: number;
  library_limit: number;
}

interface SubscriptionState {
  plans: SubscriptionPlan[];
  currentSubscription: Subscription | null;
  usageStats: UsageStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  cacheTimeout: number;
}

const initialState: SubscriptionState = {
  plans: [],
  currentSubscription: null,
  usageStats: null,
  isLoading: false,
  error: null,
  lastFetch: null,
  cacheTimeout: 10 * 60 * 1000, // 10 minutes
};

// Async thunks
export const fetchSubscriptionPlans = createAsyncThunk(
  'subscription/fetchPlans',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { subscription: SubscriptionState };
      
      // Check cache validity
      const now = Date.now();
      if (state.subscription.lastFetch && 
          (now - state.subscription.lastFetch) < state.subscription.cacheTimeout &&
          state.subscription.plans.length > 0) {
        return {
          plans: state.subscription.plans,
          fromCache: true,
        };
      }

      const { data: plans, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_production', true)
        .order('price', { ascending: true });

      if (error) throw error;

      return {
        plans: plans || [],
        fromCache: false,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserSubscription = createAsyncThunk(
  'subscription/fetchUserSubscription',
  async (userId: string, { rejectWithValue }) => {
    try {
      // Fetch subscription with plan details and usage stats in parallel
      const [subscriptionResult, usageStatsResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`
            *,
            subscription_plans(*)
          `)
          .eq('user_id', userId)
          .eq('is_production', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Get usage statistics
        Promise.all([
          supabase.rpc('get_user_monthly_youtube_import_count', { user_id: userId }),
          supabase.rpc('get_user_monthly_export_count', { user_id: userId }),
          supabase
            .from('user_library_actions')
            .select('id', { count: 'exact' })
            .eq('user_id', userId)
            .eq('is_production', true),
        ])
      ]);

      if (subscriptionResult.error) throw subscriptionResult.error;

      const subscription = subscriptionResult.data ? {
        ...subscriptionResult.data,
        plan: subscriptionResult.data.subscription_plans,
      } : null;

      // Process usage stats
      const [youtubeImportsResult, pdfExportsResult, libraryResult] = usageStatsResult;
      
       const features = subscription?.plan?.features as any;
       const usageStats = {
         youtube_imports_count: youtubeImportsResult.data || 0,
         youtube_imports_limit: features?.youtube_imports_limit || 5,
         pdf_exports_count: pdfExportsResult.data || 0,
         pdf_exports_limit: features?.pdf_exports_limit || 10,
         library_count: libraryResult.count || 0,
         library_limit: subscription?.plan?.library_limit || 10,
       };

      return {
        subscription,
        usageStats,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createSubscription = createAsyncThunk(
  'subscription/createSubscription',
  async (params: { 
    userId: string; 
    planId: string; 
    paymentData?: Record<string, any> 
  }, { rejectWithValue }) => {
    try {
      const { userId, planId, paymentData } = params;

      const subscriptionData = {
        user_id: userId,
        plan_id: planId,
        status: 'pending',
        is_production: true,
        ...paymentData,
      };

      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionData)
        .select(`
          *,
          subscription_plans(*)
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        plan: data.subscription_plans,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateSubscription = createAsyncThunk(
  'subscription/updateSubscription',
  async (params: { 
    subscriptionId: string; 
    updates: Partial<Subscription> 
  }, { rejectWithValue }) => {
    try {
      const { subscriptionId, updates } = params;

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select(`
          *,
          subscription_plans(*)
        `)
        .single();

      if (error) throw error;

      return {
        ...data,
        plan: data.subscription_plans,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancelSubscription',
  async (params: {
    subscriptionId: string;
    reason?: string;
    feedback?: string;
    reasonCategory?: string;
  }, { rejectWithValue }) => {
    try {
      const { subscriptionId, reason, feedback, reasonCategory } = params;

      // Update subscription to cancel at period end
      const { data: subscription, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          status: 'cancelled',
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          subscription_plans(*)
        `)
        .single();

      if (updateError) throw updateError;

      // Create cancellation record if reason provided
      if (reason || feedback || reasonCategory) {
        const { error: cancellationError } = await supabase
          .from('subscription_cancellations')
          .insert({
            subscription_id: subscriptionId,
            user_id: subscription.user_id,
            reason,
            feedback,
            reason_category: reasonCategory,
            is_production: true,
          });

        if (cancellationError) {
          console.error('Error creating cancellation record:', cancellationError);
        }
      }

      return {
        ...subscription,
        plan: subscription.subscription_plans,
      };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCache: (state) => {
      state.plans = [];
      state.currentSubscription = null;
      state.usageStats = null;
      state.lastFetch = null;
    },
    updateUsageStats: (state, action: PayloadAction<Partial<UsageStats>>) => {
      if (state.usageStats) {
        state.usageStats = { ...state.usageStats, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionPlans.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
       .addCase(fetchSubscriptionPlans.fulfilled, (state, action) => {
         const { plans, fromCache } = action.payload;
         state.plans = plans as SubscriptionPlan[];
         state.isLoading = false;
         
         if (!fromCache) {
           state.lastFetch = Date.now();
         }
       })
      .addCase(fetchSubscriptionPlans.rejected, (state, action) => {
        state.error = action.payload as string;
        state.isLoading = false;
      })
       .addCase(fetchUserSubscription.fulfilled, (state, action) => {
         const { subscription, usageStats } = action.payload;
         state.currentSubscription = subscription as Subscription;
         state.usageStats = usageStats;
       })
       .addCase(createSubscription.fulfilled, (state, action) => {
         state.currentSubscription = action.payload as Subscription;
       })
       .addCase(updateSubscription.fulfilled, (state, action) => {
         state.currentSubscription = action.payload as Subscription;
       })
       .addCase(cancelSubscription.fulfilled, (state, action) => {
         state.currentSubscription = action.payload as Subscription;
       });
  },
});

export const { clearError, clearCache, updateUsageStats } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;