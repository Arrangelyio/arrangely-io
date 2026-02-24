import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, ArrowLeft, Settings, CreditCard, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import AutoPaymentSettings from "@/components/subscription/AutoPaymentSettings";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

const Subscription = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
    
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchSubscriptionData();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*, subscription_plans(*)")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();

        setUserSubscription(subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-sanctuary pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              <Crown className="h-4 w-4 mr-2" />
              Subscription Management
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-primary">
              Manage Your Plan
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              View and manage your subscription, billing, and plan details
            </p>
          </div>
        </div>

        {/* Subscription Manager */}
        <div className="max-w-2xl mx-auto space-y-6">
          <SubscriptionManager 
            user={user}
            userSubscription={userSubscription}
            onRefresh={fetchSubscriptionData}
          />

          {/* Auto Payment Settings - only show for active subscriptions */}
          {userSubscription && userSubscription.status === 'active' && (
            <AutoPaymentSettings 
              subscription={userSubscription}
              onUpdate={fetchSubscriptionData}
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="max-w-2xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/membership')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Membership Details
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/payment-methods')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Payment Methods
              </Button>
              {!isCapacitorIOS() && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/pricing')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  View All Plans
                </Button>
              )}
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/contact')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;