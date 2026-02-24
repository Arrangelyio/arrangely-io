import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Gift, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: any;
  onSuccess?: () => void;
}

const CancelSubscriptionModal = ({ isOpen, onClose, subscription, onSuccess }: CancelSubscriptionModalProps) => {
  const [step, setStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [reason, setReason] = useState('');
  const [reasonCategory, setReasonCategory] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [offerAccepted, setOfferAccepted] = useState(false);
  const { toast } = useToast();

  const reasonOptions = [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'not_using', label: 'Not using enough features' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'other', label: 'Other' }
  ];

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

  const handleReasonSubmit = () => {
    if (!reasonCategory) {
      toast({
        title: "Please select a reason",
        description: "Help us understand why you're canceling",
        variant: "destructive",
      });
      return;
    }
    
    // Show special offer for certain reasons
    if (['too_expensive', 'not_using'].includes(reasonCategory)) {
      setStep('offer');
    } else {
      setStep('confirm');
    }
  };

  const handleOfferResponse = (accepted: boolean) => {
    setOfferAccepted(accepted);
    if (accepted) {
      // TODO: Apply discount code and redirect to payment
      toast({
        title: "Discount Applied!",
        description: "You've received 1 month free. Your subscription will continue.",
      });
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setStep('confirm');
    }
  };

  const handleCancelConfirm = async () => {
    setIsProcessing(true);
    try {
      // Record cancellation reason
      const { error: reasonError } = await supabase
        .from('subscription_cancellations')
        .insert({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          reason: reason,
          reason_category: reasonCategory,
          feedback: feedback,
          offered_discount: step === 'confirm' && ['too_expensive', 'not_using'].includes(reasonCategory),
          accepted_discount: offerAccepted
        });

      if (reasonError) {
        console.error('Error recording cancellation reason:', reasonError);
      }

      // Cancel subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          cancel_at_period_end: true,
          status: 'canceled'
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the current billing period. You'll keep access until then.",
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Unable to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setStep('reason');
    setReason('');
    setReasonCategory('');
    setFeedback('');
    setOfferAccepted(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            {step === 'reason' && "Help us understand why you're leaving"}
            {step === 'offer' && "Wait! We have a special offer for you"}
            {step === 'confirm' && "Are you sure you want to cancel?"}
          </DialogDescription>
        </DialogHeader>

        {step === 'reason' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-sm font-medium">Why are you canceling?</Label>
              <RadioGroup value={reasonCategory} onValueChange={setReasonCategory}>
                {reasonOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="text-sm cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm font-medium">
                Additional feedback (optional)
              </Label>
              <Textarea
                id="feedback"
                placeholder="Help us improve by sharing more details..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Keep Subscription
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReasonSubmit}
                className="flex-1"
              >
                Continue Cancellation
              </Button>
            </div>
          </div>
        )}

        {step === 'offer' && (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-2 p-3 bg-primary/10 rounded-full w-fit">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg text-primary">Special Offer Just for You!</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-primary">1 Month FREE</p>
                  <p className="text-sm text-muted-foreground">
                    Stay with us and get your next month absolutely free
                  </p>
                </div>
                
                <div className="bg-background rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Current Plan</span>
                    <span>{subscription.subscription_plans?.name}</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Your Discount</span>
                    <span>-{formatRupiah(subscription.subscription_plans?.price)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Next Bill (after free month)</span>
                    <span>{formatRupiah(subscription.subscription_plans?.price)}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => handleOfferResponse(false)}
                    className="flex-1"
                  >
                    No Thanks
                  </Button>
                  <Button 
                    onClick={() => handleOfferResponse(true)}
                    className="flex-1 bg-gradient-worship hover:opacity-90"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Accept Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold">Subscription Cancellation</h3>
                    <p className="text-sm text-muted-foreground">
                      Your subscription will be canceled but you'll keep access until:
                    </p>
                    <Badge variant="outline" className="text-base font-semibold">
                      {formatDate(subscription.current_period_end)}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <p><strong>What happens next:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>No more charges after current period</li>
                      <li>Access to premium features until {formatDate(subscription.current_period_end)}</li>
                      <li>Automatic switch to Free plan</li>
                      <li>Your arrangements will be saved</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Keep Subscription
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelConfirm}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? "Canceling..." : "Yes, Cancel"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CancelSubscriptionModal;