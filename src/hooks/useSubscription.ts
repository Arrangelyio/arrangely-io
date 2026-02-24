import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SubscriptionDetails {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  current_period_start: string;
  auto_payment_enabled: boolean;
  next_billing_date?: string;
  midtrans_subscription_id?: string;
  midtrans_subscription_status?: string;
  subscription_plans: {
    name: string;
    price: number;
    interval_type: string;
    features: any;
  };
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (
            name,
            price,
            interval_type,
            features
          )
        `)
        .eq("user_id", session.user.id)
        .in("status", ["active", "trialing", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setSubscription(data);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      toast({
        title: "Error",
        description: "Failed to fetch subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const manageSubscription = async (
    action: "disable" | "cancel" | "enable" | "update",
    updateData?: any
  ) => {
    if (!subscription?.midtrans_subscription_id) {
      toast({
        title: "Error",
        description: "No active subscription found",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-midtrans-subscription",
        {
          body: {
            action,
            subscription_id: subscription.midtrans_subscription_id,
            data: updateData,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: `Subscription ${action}d successfully`,
        });

        // Refresh subscription data
        await fetchSubscription();
        return { success: true };
      } else {
        throw new Error(`Failed to ${action} subscription`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing subscription:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} subscription`,
        variant: "destructive",
      });
      return { success: false };
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return {
    subscription,
    loading,
    refetch: fetchSubscription,
    manageSubscription,
  };
}
