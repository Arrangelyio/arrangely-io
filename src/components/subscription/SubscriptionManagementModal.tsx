import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  CreditCard,
  Calendar,
  RefreshCw,
  XCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

interface SubscriptionDetails {
  id: string;
  name: string;
  amount: string;
  currency: string;
  status: string;
  payment_type: string;
  schedule: {
    interval: number;
    interval_unit: string;
    current_interval: number;
    start_time: string;
    next_execution_at: string;
    previous_execution_at?: string;
  };
  customer_details: {
    first_name: string;
    last_name?: string;
    email: string;
    phone?: string;
  };
  transaction_ids?: string[];
  metadata?: any;
}

interface SubscriptionManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId?: string;
}

export default function SubscriptionManagementModal({
  open,
  onOpenChange,
  subscriptionId,
}: SubscriptionManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<SubscriptionDetails | null>(null);
  const { toast } = useToast();

  const fetchSubscriptionDetails = async () => {
    if (!subscriptionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-midtrans-subscription",
        {
          body: {
            action: "get",
            subscription_id: subscriptionId,
          },
        }
      );

      if (error) throw error;

      if (data?.success && data?.data) {
        setDetails(data.data);
      } else {
        throw new Error("Failed to fetch subscription details");
      }
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "disable" | "cancel" | "enable") => {
    if (!subscriptionId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-midtrans-subscription",
        {
          body: {
            action,
            subscription_id: subscriptionId,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: `Subscription ${action}d successfully`,
        });

        await fetchSubscriptionDetails();
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && subscriptionId && !details) {
      fetchSubscriptionDetails();
    }
  }, [open, subscriptionId]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: "default",
      disabled: "secondary",
      cancelled: "destructive",
      pending: "outline",
    };

    const colors: Record<string, string> = {
      active: "bg-green-500/10 text-green-700 border-green-500/30",
      disabled: "bg-gray-200 text-gray-600 border-gray-300",
      cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
      pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    };

    return (
      <Badge
        className={`px-3 py-1.5 text-sm rounded-full border ${colors[status] || ""}`}
        variant={variants[status] || "outline"}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
      minimumFractionDigits: 0,
    }).format(parseInt(amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-gradient-to-b from-background to-primary/5 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Manage Subscription
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View, pause, or cancel your active recurring subscription
          </DialogDescription>
        </DialogHeader>

        {loading && !details ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : details ? (
          <div className="space-y-6 mt-4">
            {/* 🟢 Status Card */}
            <Card className="border border-primary/20 bg-primary/5 rounded-xl shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Subscription Status
                </CardTitle>
                {getStatusBadge(details.status)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Amount</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(details.amount, details.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Payment Method</p>
                    <div className="flex items-center gap-2 font-medium capitalize">
                      <CreditCard className="h-4 w-4 text-primary" />
                      {details.payment_type}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Billing Interval</p>
                    <p className="font-medium">
                      Every {details.schedule.interval}{" "}
                      {details.schedule.interval_unit}
                      {details.schedule.interval > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Current Cycle</p>
                    <p className="font-medium">
                      #{details.schedule.current_interval}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🗓️ Billing Schedule */}
            <Card className="border border-primary/10 bg-background/70 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Billing Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Next Billing Date</p>
                  <p className="font-medium text-primary">
                    {format(new Date(details.schedule.next_execution_at), "dd MMM yyyy")}
                  </p>
                </div>
                {details.schedule.previous_execution_at && (
                  <div>
                    <p className="text-muted-foreground mb-1">Last Billing Date</p>
                    <p className="font-medium">
                      {format(new Date(details.schedule.previous_execution_at), "dd MMM yyyy")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-1">Started On</p>
                  <p className="font-medium">
                    {format(new Date(details.schedule.start_time), "dd MMM yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 💳 Transaction History */}
            {details.transaction_ids && details.transaction_ids.length > 0 && (
              <Card className="border border-primary/10 bg-background/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {details.transaction_ids.length} payment
                    {details.transaction_ids.length !== 1 ? "s" : ""} processed
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ⚙️ Actions */}
            <div className="flex flex-wrap gap-3 justify-end pt-4">
              {details.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    className="border-primary/30 hover:bg-primary/10 transition-all"
                    onClick={() => handleAction("disable")}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Pause
                  </Button>
                  <Button
                    variant="destructive"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:brightness-110"
                    onClick={() => handleAction("cancel")}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel
                  </Button>
                </>
              )}

              {details.status === "disabled" && (
                <Button
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                  onClick={() => handleAction("enable")}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Resume
                </Button>
              )}

              <Button
                variant="outline"
                className="hover:bg-primary/10 transition-all"
                onClick={fetchSubscriptionDetails}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No subscription details available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
