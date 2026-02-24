import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  Settings, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  X,
  Repeat,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CancelSubscriptionModal from "./CancelSubscriptionModal";
import { getManualRecurringDaysBeforeExpiry, isRecurringEnabled } from "@/config/paymentMethods";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

interface SubscriptionManagerProps {
  user: any;
  userSubscription: any;
  onRefresh?: () => void;
}

const SubscriptionManager = ({ user, userSubscription, onRefresh }: SubscriptionManagerProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [trialInfo, setTrialInfo] = useState<any>(null);
  const [showManualRecurring, setShowManualRecurring] = useState(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userSubscription?.is_trial) {
      const daysLeft = Math.ceil((new Date(userSubscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      setTrialInfo({
        isActive: true,
        daysLeft: Math.max(0, daysLeft),
        endDate: userSubscription.trial_end
      });
    }

    // Check if manual recurring should be shown (H-2 or less)
    if (userSubscription?.current_period_end && userSubscription.status === 'active') {
      const daysLeft = Math.ceil((new Date(userSubscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      setDaysUntilExpiry(daysLeft);
      const threshold = getManualRecurringDaysBeforeExpiry();
      setShowManualRecurring(daysLeft <= threshold && daysLeft >= 0);
    }
  }, [userSubscription]);

  const formatRupiah = (amount: number) => {
    return `Rp${amount.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long", 
      day: "numeric"
    });
  };

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { returnUrl: window.location.href }
      });

      if (error) throw error;

      // Open in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast({
        title: "Error",
        description: "Unable to open billing management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsLoading(true);
    try {
      // Trigger a refresh of subscription data
      if (onRefresh) {
        await onRefresh();
      }
      
      toast({
        title: "Status Updated",
        description: "Your subscription status has been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing status:", error);
      toast({
        title: "Error",
        description: "Unable to refresh status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRecurring = async () => {
    if (!userSubscription) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          plan_id: userSubscription.plan_id,
          payment_method: "snap",
          is_recurring_payment: true,
        },
      });

      if (error) throw error;

      if (data?.snap_token) {
        // @ts-ignore - Midtrans Snap is loaded via script tag
        window.snap.pay(data.snap_token, {
          onSuccess: function (result: any) {
            toast({
              title: "Payment Successful",
              description: "Your subscription has been renewed!",
            });
            if (onRefresh) onRefresh();
          },
          onPending: function (result: any) {
            toast({
              title: "Payment Pending",
              description: "Your payment is being processed.",
            });
          },
          onError: function (result: any) {
            toast({
              title: "Payment Failed",
              description: "There was an error processing your payment.",
              variant: "destructive",
            });
          },
          onClose: function () {
            setIsLoading(false);
          },
        });
      }
    } catch (error: any) {
      console.error("Error initiating manual recurring payment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate payment",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to view your subscription details.
        </AlertDescription>
      </Alert>
    );
  }

  const isFreePlan = !userSubscription || userSubscription.status !== 'active';
  const planName = userSubscription?.subscription_plans?.name || 'Free';
  const planPrice = userSubscription?.subscription_plans?.price || 0;
  const intervalType = userSubscription?.subscription_plans?.interval_type || 'month';
  const isManualMode = !isRecurringEnabled('gopay') && !isRecurringEnabled('creditCard');

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            {isFreePlan ? (
              <>
                <Crown className="h-5 w-5 text-muted-foreground" />
                Current Plan: Free
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-primary" />
                Current Plan: {planName}
              </>
            )}
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefreshStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Manual Subscription Mode Alert */}
          {!isFreePlan && isManualMode && (
            <Alert className="border-blue-500/20 bg-blue-500/10">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="font-medium">Manual Subscription Mode</p>
                <p className="text-sm mt-1">
                  You'll need to manually renew your subscription before it expires.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Plan Status */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            <Badge variant={isFreePlan ? "secondary" : "default"}>
              {isFreePlan ? "Free Plan" : 
               trialInfo?.isActive ? "Trial Active" : "Premium Active"}
            </Badge>
          </div>

          {/* Trial Information */}
          {trialInfo?.isActive && (
            <Alert className="border-warning bg-warning/10">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your free trial ends in {trialInfo.daysLeft} day{trialInfo.daysLeft !== 1 ? 's' : ''} 
                ({formatDate(trialInfo.endDate)})
              </AlertDescription>
            </Alert>
          )}

          {/* Pricing Information */}
          {!isFreePlan && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Price</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatRupiah(planPrice)}/{intervalType}
                  </span>
                </div>
                
                {userSubscription?.current_period_end && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Next billing date</span>
                    <span>{formatDate(userSubscription.current_period_end)}</span>
                  </div>
                )}

                {userSubscription?.cancel_at_period_end && (
                  <Alert className="border-destructive bg-destructive/10">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                      Your subscription will be canceled at the end of the current billing period 
                      ({formatDate(userSubscription.current_period_end)})
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {/* Continue Payment Alert - Manual Recurring */}
          {showManualRecurring && isManualMode && (
            <>
              <Separator />
              <Alert className="border-amber-500/20 bg-amber-500/10">
                <Repeat className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-medium text-amber-800">
                      Your subscription expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-amber-700">
                      Complete payment now to continue enjoying premium features without interruption.
                    </p>
                    <Button 
                      onClick={handleManualRecurring}
                      disabled={isLoading}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Repeat className="h-4 w-4 mr-2" />
                          Continue Payment
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Action Buttons */}
          <Separator />
          <div className="space-y-3">
            {!isFreePlan && (
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleManageBilling}
                  disabled={isLoading}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={isLoading || userSubscription?.cancel_at_period_end}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Cancel Plan
                </Button>
              </div>
            )}

            {isFreePlan && !isCapacitorIOS() && (
              <Button 
                className="w-full bg-gradient-worship hover:opacity-90"
                onClick={() => window.location.href = '/pricing'}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userSubscription ? (
              <div className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">
                    {trialInfo?.isActive ? "Trial Started" : "Subscription Activated"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(userSubscription.created_at)}
                  </p>
                </div>
                <Badge variant={trialInfo?.isActive ? "secondary" : "default"}>
                  {planName}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No subscription history available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription Modal */}
      {userSubscription && (
        <CancelSubscriptionModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          subscription={userSubscription}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};

export default SubscriptionManager;