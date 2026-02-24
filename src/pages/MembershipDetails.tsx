import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Calendar, ArrowLeft, Loader2, Crown, CheckCircle, Repeat, AlertCircle, Settings } from "lucide-react";
import { format } from "date-fns";
import SubscriptionManagementModal from "@/components/subscription/SubscriptionManagementModal";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  current_period_start: string;
  auto_payment_enabled: boolean;
  next_billing_date?: string;
  midtrans_subscription_id?: string;
  subscription_plans: {
    name: string;
    price: number;
    interval_type: string;
  };
}

interface LinkedAccount {
  id: string;
  payment_method: string;
  masked_number?: string;
  status: string;
}

const MembershipDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<LinkedAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    loadMembershipData();
  }, []);

  const loadMembershipData = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (
            name,
            price,
            interval_type
          )
        `)
        .eq("user_id", session.user.id)
        .in("status", ["active", "trialing"])
        .single();

      if (subError && subError.code !== "PGRST116") throw subError;
      setSubscription(subData);

      // Load linked payment account
      const { data: accountData, error: accountError } = await supabase
        .from("linked_payment_accounts")
        .select("*")
        .eq("status", "linked")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (accountError && accountError.code !== "PGRST116") {
        
      }
      setLinkedAccount(accountData);
    } catch (error: any) {
      console.error("Error loading membership:", error);
      toast({
        title: "Error",
        description: "Failed to load membership details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentMethodIcon = () => {
    if (!linkedAccount) return <CreditCard className="h-5 w-5" />;
    return linkedAccount.payment_method === "gopay" ? (
      <Smartphone className="h-5 w-5" />
    ) : (
      <CreditCard className="h-5 w-5" />
    );
  };

  const getPaymentMethodDisplay = () => {
    if (!linkedAccount) return "No payment method";
    if (linkedAccount.payment_method === "gopay") {
      return linkedAccount.masked_number || "GoPay Account";
    }
    return linkedAccount.masked_number || "•••• •••• •••• ••••";
  };

  const getPlanBadgeVariant = (planName: string) => {
    if (planName.toLowerCase().includes("premium")) return "default";
    return "secondary";
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes("premium")) {
      return <Crown className="h-5 w-5 text-primary" />;
    }
    return <CheckCircle className="h-5 w-5 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
              <p className="text-muted-foreground mb-6">
                You don't have an active subscription yet
              </p>
              {!isCapacitorIOS() && (
                <Button onClick={() => navigate("/pricing")}>
                  View Subscription Plans
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const planName = subscription.subscription_plans?.name || "Unknown Plan";
  const isBasic = planName.toLowerCase().includes("basic");
  const isPremium = planName.toLowerCase().includes("premium");

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Membership Details</h1>
            <p className="text-muted-foreground mt-2">
              Manage your subscription and payment information
            </p>
          </div>

          {/* Plan Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getPlanIcon(planName)}
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {planName}
                      <Badge variant={getPlanBadgeVariant(planName)}>
                        {subscription.status === "trialing" ? "Trial" : "Active"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {isPremium && "Unlimited access to all premium features"}
                      {isBasic && "Access to basic features and song library"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subscription Type</span>
                  <span className="font-medium">{planName}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    Rp {subscription.subscription_plans?.price.toLocaleString("id-ID")} /{" "}
                    {subscription.subscription_plans?.interval_type === "month" ? "month" : "year"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {subscription.auto_payment_enabled ? "Next Billing Date" : "Subscription Expires"}
                  </span>
                  <div className="text-right">
                    <div className="font-medium">
                      {subscription.next_billing_date 
                        ? format(new Date(subscription.next_billing_date), "dd MMM yyyy")
                        : format(new Date(subscription.current_period_end), "dd MMM yyyy")
                      }
                    </div>
                    {subscription.auto_payment_enabled && (
                      <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <Repeat className="h-3 w-3" />
                        Auto-renewal enabled
                      </div>
                    )}
                  </div>
                </div>
                {!subscription.auto_payment_enabled && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Auto-renewal is disabled. Your subscription will expire on {format(new Date(subscription.current_period_end), "dd MMM yyyy")}. 
                        Link a payment method to enable auto-renewal.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </div>
              
              {/* Manage Subscription Button */}
              {subscription.midtrans_subscription_id && subscription.auto_payment_enabled && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowManageModal(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Your linked payment method for recurring charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {linkedAccount ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getPaymentMethodIcon()}
                      <div>
                        <p className="font-medium">{getPaymentMethodDisplay()}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {linkedAccount.payment_method}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Linked
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/payment-methods")}
                    className="w-full"
                  >
                    Manage Payment Methods
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">
                    No payment method linked
                  </p>
                  <Button onClick={() => navigate("/payment-methods")}>
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Your Features</CardTitle>
              <CardDescription>
                What's included in your {isPremium ? "Premium" : "Basic"} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {isPremium ? (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Unlimited song library access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Premium arrangements and chords</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Advanced collaboration tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Priority customer support</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Access to basic song library</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Standard arrangements and chords</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <span>Basic collaboration features</span>
                    </li>
                  </>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Upgrade Option for Basic Users */}
          {isBasic && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Crown className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Upgrade to Premium</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Get unlimited access to all features and premium content
                    </p>
                    {!isCapacitorIOS() && (
                      <Button onClick={() => navigate("/pricing")} className="mt-4">
                        View Premium Plans
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        open={showManageModal}
        onOpenChange={setShowManageModal}
        subscriptionId={subscription?.midtrans_subscription_id}
      />
    </div>
  );
};

export default MembershipDetails;
