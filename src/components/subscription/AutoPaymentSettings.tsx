import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AutoPaymentSettingsProps {
  subscription: any;
  onUpdate: () => void;
}

const AutoPaymentSettings = ({ subscription, onUpdate }: AutoPaymentSettingsProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleToggleAutoPayment = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ auto_payment_enabled: enabled })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Auto-payment Updated",
        description: enabled 
          ? "Auto-payment has been enabled for your subscription"
          : "Auto-payment has been disabled for your subscription",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-payment settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Auto-Payment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="auto-payment">Auto-renewal</Label>
            <p className="text-sm text-muted-foreground">
              Automatically renew your subscription when it expires
            </p>
          </div>
          <Switch
            id="auto-payment"
            checked={subscription.auto_payment_enabled}
            onCheckedChange={handleToggleAutoPayment}
            disabled={isUpdating}
          />
        </div>

        {subscription.auto_payment_enabled ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Auto-renewal is enabled. Your subscription will automatically renew on{" "}
              <span className="font-semibold">
                {subscription.current_period_end && formatDate(subscription.current_period_end)}
              </span>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Auto-renewal is disabled. Your subscription will expire on{" "}
              <span className="font-semibold">
                {subscription.current_period_end && formatDate(subscription.current_period_end)}
              </span>
              {" "}and you'll need to manually renew.
            </AlertDescription>
          </Alert>
        )}

        {subscription.payment_failed_count > 0 && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {subscription.payment_failed_count} payment attempt(s) have failed.
              {subscription.next_payment_attempt && (
                <>
                  {" "}Next retry: {formatDate(subscription.next_payment_attempt)}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 space-y-2">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your subscription automatically renews before expiration</li>
            <li>• You'll receive payment notifications via email</li>
            <li>• Failed payments will be retried up to 3 times</li>
            <li>• You can disable auto-renewal anytime</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoPaymentSettings;