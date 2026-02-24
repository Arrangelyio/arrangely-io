import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Smartphone,
  Banknote,
  Percent,
  X,
  RefreshCw,
  CheckCircle2,
  Link,
  AlertTriangle,
  Repeat,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  isRecurringEnabled,
  isPaymentMethodEnabled,
} from "@/config/paymentMethods";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
    interval_type?: string;
    withTrial?: boolean;
  };
  onStartTrial?: () => Promise<void>;
}

const PaymentModal = ({
  isOpen,
  onClose,
  onSuccess,
  plan,
  onStartTrial,
}: PaymentModalProps) => {
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [showTrialInfo, setShowTrialInfo] = useState(plan.withTrial || false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [enableRecurring, setEnableRecurring] = useState(false);
  const { toast } = useToast();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isProductionEnv =
    hostname === "arrangely.io" || hostname === "www.arrangely.io";

  useEffect(() => {
    const handleMidtransEvent = (event: MessageEvent) => {
      // Snap Midtrans mengirimkan pesan lewat window message
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // Jika user klik finish/close tapi status masih pending
        if (
          data.transaction_status === "pending" ||
          data.transaction_status === "close"
        ) {
          toast({
            title: "Waiting for Payment",
            description:
              "Please complete your payment. You can check the status in the subscription tab.",
          });
          setPaymentIframeUrl(null); // Ini akan menutup iframe dan kembali ke tampilan Plan
          onClose(); // Menutup modal
        }

        // Jika benar-benar sukses
        if (data.transaction_status === "settlement") {
          onSuccess();
        }
      } catch (e) {
        // Abaikan jika pesan bukan dari Midtrans
      }
    };

    window.addEventListener("message", handleMidtransEvent);
    return () => window.removeEventListener("message", handleMidtransEvent);
  }, [isOpen]);

  // Auto-apply voucher code from localStorage when modal opens
  useEffect(() => {
    const pendingVoucher = localStorage.getItem("pending_voucher_code");
    if (pendingVoucher && !discountApplied) {
      setDiscountCode(pendingVoucher);
      // Auto-apply the voucher
      applyStoredVoucher(pendingVoucher, plan.interval_type);
      // Clear the stored voucher after applying
      localStorage.removeItem("pending_voucher_code");
    }

    // Load linked payment accounts when modal opens
    if (isOpen) {
      loadLinkedAccounts();
    }
  }, [isOpen]);

  const loadLinkedAccounts = async () => {
    setIsLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from("linked_payment_accounts")
        .select("*")
        .eq("is_production", isProductionEnv)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinkedAccounts(data || []);
    } catch (error) {
      console.error("Error loading linked accounts:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const applyStoredVoucher = async (
    voucherCode: string,
    intervalType: string
  ) => {
    setIsLoadingDiscount(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", voucherCode.trim())
        .eq("is_active", true)
        .gte("valid_until", new Date().toISOString())
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Voucher",
          description: "The voucher code is invalid or expired",
          variant: "destructive",
        });
        return;
      }

      // ✅ Cek max usage
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast({
          title: "Voucher Expired",
          description: "This voucher has reached its usage limit",
          variant: "destructive",
        });
        return;
      }

      // ✅ Cek billing_cycle (hanya kalau voucher punya spesifikasi billing_cycle)
      if (data.billing_cycle) {
        if (
          (intervalType === "month" && data.billing_cycle !== "monthly") ||
          (intervalType === "year" && data.billing_cycle !== "yearly")
        ) {
          toast({
            title: "Voucher Not Applicable",
            description: `This voucher is only valid for ${data.billing_cycle} plans`,
            variant: "destructive",
          });
          return;
        }
      }

      // ✅ Cek voucher khusus new customer
      if (data.is_new_customer) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: existingPayments, error: paymentError } = await supabase
            .from("payments")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .limit(1);

          if (paymentError) {
            console.error("Error checking payment history:", paymentError);
            toast({
              title: "Error",
              description: "Failed to validate voucher eligibility",
              variant: "destructive",
            });
            return;
          }

          if (existingPayments && existingPayments.length > 0) {
            toast({
              title: "Voucher Not Available",
              description: "This voucher is only available for new customers",
              variant: "destructive",
            });
            return;
          }
        }
      }

      setDiscountApplied(data);
      toast({
        title: "Voucher Applied!",
        description: `${data.discount_value}${
          data.discount_type === "percentage" ? "%" : ""
        } discount applied for ${data.billing_cycle || "all"} plan`,
      });
    } catch (error) {
      console.error("Error applying voucher:", error);
      toast({
        title: "Error",
        description: "Failed to apply voucher code",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDiscount(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return `Rp. ${amount.toLocaleString("id-ID")}`;
  };

  const finalAmount = plan.withTrial
    ? 0
    : discountApplied
    ? plan.price -
      (discountApplied.discount_type === "percentage"
        ? Math.floor((plan.price * discountApplied.discount_value) / 100)
        : discountApplied.discount_value)
    : plan.price;

  const discountAmount = plan.price - finalAmount;

  const handleApplyDiscountNew = async (
    voucherCode: string,
    intervalType: string
  ) => {
    setIsLoadingDiscount(true);
    setInlineError(null);
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", voucherCode.trim())
        .eq("is_active", true)
        .lte("valid_from", now)
        .gte("valid_until", now)
        .single();

      if (error || !data) {
        setInlineError("The voucher code is invalid or expired.");
        toast({
          title: "Invalid Voucher",
          description: "The voucher code from the link is invalid or expired",
          variant: "destructive",
        });
        return;
      }

      if (
        (intervalType === "month" && data.billing_cycle !== "monthly") ||
        (intervalType === "year" && data.billing_cycle !== "yearly")
      ) {
        setInlineError(
          `This voucher is for ${data.billing_cycle} plans. Please switch to the ${data.billing_cycle} plan to use it.`
        );
        // toast({
        //     title: "Voucher Not Applicable",
        //     description: `This voucher is only valid for ${data.billing_cycle} plans`,
        //     variant: "destructive",
        // });
        return;
      }

      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast({
          title: "Voucher Expired",
          description: "This voucher has reached its usage limit",
          variant: "destructive",
        });
        return;
      }

      if (data.is_new_customer) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: existingPayments, error: paymentError } = await supabase
            .from("payments")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "paid")
            .limit(1);

          if (paymentError) {
            console.error("Error checking payment history:", paymentError);
            toast({
              title: "Error",
              description: "Failed to validate voucher eligibility",
              variant: "destructive",
            });
            return;
          }

          if (existingPayments && existingPayments.length > 0) {
            toast({
              title: "Voucher Not Available",
              description: "This voucher is only available for new customers",
              variant: "destructive",
            });
            return;
          }
        }
      }

      setDiscountApplied(data);
      setInlineError(null);
      toast({
        title: "Voucher Applied!",
        description: `${data.discount_value}${
          data.discount_type === "percentage" ? "%" : ""
        } discount applied for ${data.billing_cycle} plan`,
      });
    } catch (error) {
      console.error("Error applying voucher:", error);
      setInlineError("Failed to apply voucher code. Please try again.");
      toast({
        title: "Error",
        description: "Failed to apply voucher code",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDiscount(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsLoadingDiscount(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.trim())
        .eq("is_active", true)
        .gte("valid_until", new Date().toISOString())
        .single();

      if (error || !data) {
        toast({
          title: "Invalid Code",
          description: "Discount code not found or expired",
          variant: "destructive",
        });
        return;
      }

      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        toast({
          title: "Quota Reached",
          description: "This discount code has reached its usage limit",
          variant: "destructive",
        });
        return;
      }

      if (data.is_new_customer) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: existingPayments, error: paymentError } = await supabase
            .from("payments")
            .select("id")
            .eq("user_id", user.id)
            .eq("discount_code_id", data.id)
            .eq("status", "paid")
            .limit(1);

          if (paymentError) {
            console.error("Error checking payment history:", paymentError);
            toast({
              title: "Error",
              description: "Failed to validate voucher eligibility",
              variant: "destructive",
            });
            return;
          }

          if (existingPayments && existingPayments.length > 0) {
            toast({
              title: "Voucher Not Available",
              description: "This voucher is only available for new customers",
              variant: "destructive",
            });
            return;
          }
        }
      }

      setDiscountApplied(data);
      toast({
        title: "Discount Applied!",
        description: `${data.discount_value}${
          data.discount_type === "percentage" ? "%" : ""
        } discount applied`,
      });
    } catch (error) {
      console.error("Error applying discount:", error);
      toast({
        title: "Error",
        description: "Failed to apply discount code",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDiscount(false);
    }
  };

  const handleShowPaymentOptions = () => {
    // If this is a free trial, start trial directly without showing payment options
    if (plan.withTrial) {
      handlePayment();
      return;
    }
    // When showing payment options, default to recurring enabled
    setEnableRecurring(true);
    setShowPaymentOptions(true);
  };

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    handlePayment(method);
  };

  const handlePayment = async (paymentMethod?: string) => {
    setIsProcessing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication Error",
          description:
            "You must be logged in to make a payment. Please log in again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // If this is a free trial, start trial directly without payment
      if (plan.withTrial) {
        const { data, error } = await supabase.functions.invoke(
          "start-free-trial",
          {
            body: {
              planId: plan.id,
            },
          }
        );

        if (error) {
          throw new Error(error.message || "Failed to start free trial");
        }

        onSuccess();

        toast({
          title: "🎉 Free Trial Started!",
          description: `You now have 7 days of free access to all premium features. Trial ends on ${new Date(
            data.trial_end
          ).toLocaleDateString("id-ID")}`,
        });

        onClose();
        return;
      }

      // ===== Handle GoPay Subscription Creation =====
      if (paymentMethod === "gopay") {
        setIsProcessing(true);

        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (!user) {
            toast({
              title: "Authentication Error",
              description:
                "You must be logged in to make a payment. Please log in again.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          // 🔍 Check if user already linked GoPay
          const linkedGoPay = linkedAccounts.find(
            (a) =>
              (a.status === "linked" || a.status === "active") &&
              a.payment_method === "gopay" &&
              a.account_id
          );

          // ✅ Already linked GoPay account — create subscription directly
          if (linkedGoPay) {
            const { data: subscriptionData, error: subscriptionError } =
              await supabase.functions.invoke("create-midtrans-subscription", {
                body: {
                  plan_id: plan.id,
                  payment_method: "gopay",
                  account_id: linkedGoPay.account_id,
                },
              });

            if (subscriptionError) {
              throw new Error(
                subscriptionError.message ||
                  "Failed to create GoPay subscription"
              );
            }

            toast({
              title: "✨ Subscription Created!",
              description: `Your GoPay subscription has been activated. Next billing: ${new Date(
                subscriptionData.next_billing_date
              ).toLocaleDateString("id-ID")}`,
            });

            onSuccess();
            onClose();
            setIsProcessing(false);
            return;
          }

          // 🚀 No linked account -> Start linking flow
          const phoneNumber = prompt(
            "Enter your GoPay phone number (e.g., 81234567890):"
          );
          if (!phoneNumber) {
            toast({
              title: "Phone Number Required",
              description:
                "Phone number is required to link your GoPay account.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const cleanPhone = phoneNumber.replace(/\D/g, "");
          if (cleanPhone.length < 9 || cleanPhone.length > 15) {
            toast({
              title: "Invalid Phone Number",
              description: "Please enter a valid phone number.",
              variant: "destructive",
            });
            setIsProcessing(false);
            return;
          }

          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;

          
          console.log("Payload:", {
            amount: 10000,
            description: "GoPay Account Linking",
            phone_number: cleanPhone,
          });

          const { data, error } = await supabase.functions.invoke(
            "link-gopay-account",
            {
              body: {
                amount: 10000,
                description: "GoPay Account Linking",
                phone_number: cleanPhone,
              },
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (error) throw error;

          

          // ✅ If account already linked (ENABLED)
          if (data?.account_id && !data?.redirect_url) {
            toast({
              title: "GoPay Account Linked!",
              description:
                "Your GoPay account is already linked and ready to use.",
            });
            await loadLinkedAccounts(); // refresh linked accounts
            setIsProcessing(false);
            return;
          }

          // ✅ If Midtrans returns deeplink/redirect
          if (data?.deeplink_url || data?.redirect_url || data?.qr_code_url) {
            toast({
              title: "Redirecting to GoPay",
              description:
                "Please complete the authorization in your GoPay app.",
            });
            window.location.href =
              data.deeplink_url || data.redirect_url || data.qr_code_url;
            return;
          }

          // ❌ If no link was found
          throw new Error(
            "Failed to get GoPay authorization URL. Please try again."
          );
        } catch (error: any) {
          console.error("🚨 GoPay linking error:", error);
          toast({
            title: "Linking Failed",
            description:
              error?.message ||
              "Unable to link GoPay account. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }

        return;
      }

      // ===== Handle Credit Card Subscription Creation =====
      if (paymentMethod === "credit_card") {
        // Use saved card token if available
        const savedCard = linkedAccounts.find(
          (a) =>
            (a.status === "linked" || a.status === "active") &&
            a.payment_method === "credit_card" &&
            a.saved_token_id &&
            a.is_production === isProductionEnv
        );

        if (!savedCard) {
          toast({
            title: "Save Card Required",
            description:
              "Please save your card first for auto-renewal, then try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        const { data: subscriptionData, error: subscriptionError } =
          await supabase.functions.invoke("create-midtrans-subscription", {
            body: {
              plan_id: plan.id,
              payment_method: "credit_card",
              saved_token_id: savedCard.saved_token_id,
            },
          });

        if (subscriptionError) {
          throw new Error(
            subscriptionError.message ||
              "Failed to create credit card subscription"
          );
        }

        toast({
          title: "✨ Subscription Created!",
          description: `Your credit card subscription has been activated. Next billing: ${new Date(
            subscriptionData.next_billing_date
          ).toLocaleDateString("id-ID")}`,
        });

        onSuccess();
        onClose();
        setIsProcessing(false);
        return;
      }

      // ===== Handle Recurring Subscriptions with Midtrans Subscription API =====
      if (enableRecurring && !paymentMethod) {
        // Check if user has a linked payment method
        const linkedAccount = linkedAccounts.find(
          (account) =>
            (account.status === "linked" || account.status === "active") &&
            (account.payment_method === "gopay" ||
              account.payment_method === "credit_card") &&
            account.is_production === isProductionEnv
        );

        if (!linkedAccount) {
          toast({
            title: "No Payment Method Linked",
            description:
              "Please link a payment method first to enable recurring payments.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        // Create Midtrans subscription
        const { data: subscriptionData, error: subscriptionError } =
          await supabase.functions.invoke("create-midtrans-subscription", {
            body: {
              plan_id: plan.id,
              payment_method: linkedAccount.payment_method,
              saved_token_id:
                linkedAccount.payment_method === "credit_card"
                  ? linkedAccount.saved_token_id
                  : null,
              account_id:
                linkedAccount.payment_method === "gopay"
                  ? linkedAccount.account_id
                  : null,
            },
          });

        if (subscriptionError) {
          throw new Error(
            subscriptionError.message || "Failed to create subscription"
          );
        }

        toast({
          title: "✨ Subscription Created!",
          description: `Your recurring subscription has been activated. Next billing: ${new Date(
            subscriptionData.next_billing_date
          ).toLocaleDateString("id-ID")}`,
        });

        onSuccess();
        onClose();
        setIsProcessing(false);
        return;
      }

      // ===== Handle Non-Recurring (One-Time) Payments =====

      // Handle regular payments
      const { data, error } = await supabase.functions.invoke(
        "create-midtrans-payment",
        {
          body: {
            planId: plan.id,
            discountId: discountApplied?.id,
            discountCode: discountApplied?.code,
            withTrial: false,
            intervalType: plan.interval_type || "month",
            userId: user.id,
            userEmail: user.email,
            paymentMethod: paymentMethod || "one-time",
            enableRecurring: enableRecurring,
          },
        }
      );

      if (error) {
        throw error;
      }

      // Set iframe URL to show payment in modal
      setPaymentIframeUrl(data.snapUrl);

      toast({
        title: "Payment Ready",
        description: "Complete your payment below",
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description:
          error.message || "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDiscount = () => {
    setInlineError(null);
    setDiscountApplied(null);
    setDiscountCode("");
  };

  const handleCloseModal = () => {
    setInlineError(null);
    setPaymentIframeUrl(null);
    setShowTrialInfo(plan.withTrial || false);
    setShowPaymentOptions(false);
    setSelectedPaymentMethod(null);
    setEnableRecurring(false);
    setDiscountApplied(null);
    setDiscountCode("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogContent
        hideCloseButton={!!paymentIframeUrl}
        className={
          paymentIframeUrl
            ? "p-0 max-w-lg h-[85vh] flex flex-col"
            : "max-w-md sm:max-w-lg w-[95vw] max-h-[90vh]"
        }
      >
        {paymentIframeUrl ? (
          // --- TAMPILAN IFRAME (BERSIH & PROFESIONAL) ---
          <>
            <div className="p-4 border-b flex justify-between items-center shrink-0">
              <DialogTitle className="text-lg">
                Complete Your Payment
              </DialogTitle>
              <Button
                variant="outline"
                onClick={() => setPaymentIframeUrl(null)}
                size="sm"
              >
                ← Back to Plan
              </Button>
            </div>
            <div className="flex-grow w-full">
              <iframe
                src={paymentIframeUrl}
                className="w-full h-full"
                frameBorder="0"
                title="Midtrans Payment"
              />
            </div>
          </>
        ) : (
          // --- TAMPILAN DETAIL PLAN ---
          <>
            <DialogHeader>
              <DialogTitle>
                {plan.withTrial
                  ? "Start Your Free Trial"
                  : `Subscribe to ${plan.name}`}
              </DialogTitle>
              <DialogDescription>
                {plan.withTrial
                  ? "Start your 7-day free trial. You can cancel anytime."
                  : "Complete your subscription to unlock all features."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-6 max-h-[70vh] overflow-y-auto p-1">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {plan.name} Plan
                    {plan.withTrial && (
                      <Badge variant="secondary" className="text-green-600">
                        7-Day Free Trial
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plan.withTrial && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">
                        🎉 Start your free trial now!
                      </p>
                      <p className="text-xs text-green-700">
                        Enjoy full premium access for 7 days. Cancel anytime.
                      </p>
                    </div>
                  )}
                  <div className="text-2xl font-bold text-primary mb-2">
                    {plan.withTrial ? (
                      <>
                        <span className="text-lg line-through text-muted-foreground mr-2">
                          {formatRupiah(plan.price)}
                        </span>
                        <span className="text-green-600">FREE</span>
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          for 7 days
                        </span>
                      </>
                    ) : (
                      <>
                        {formatRupiah(plan.price)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.interval_type || "month"}
                        </span>
                      </>
                    )}
                  </div>
                  {plan.withTrial && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Then {formatRupiah(plan.price)}/
                      {plan.interval_type || "month"}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mb-3">
                    {plan.description}
                  </p>
                  {/* <div className="space-y-1">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <div
                        key={index}
                        className="text-xs text-muted-foreground flex items-center gap-2"
                      >
                        <div className="w-1 h-1 bg-primary rounded-full" />
                        {feature}
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        + {plan.features.length - 3} more features
                      </div>
                    )}
                  </div> */}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Discount Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!discountApplied ? (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter discount code"
                          value={discountCode}
                          onChange={(e) =>
                            setDiscountCode(e.target.value.toUpperCase())
                          }
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleApplyDiscountNew(
                              discountCode,
                              plan.interval_type
                            )
                          }
                          disabled={!discountCode.trim() || isLoadingDiscount}
                          size="sm"
                        >
                          {isLoadingDiscount ? "..." : "Apply"}
                        </Button>
                      </div>
                      {inlineError && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <p>{inlineError}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-green-600">
                        {discountApplied.code} Applied
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveDiscount}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span
                      className={
                        plan.withTrial
                          ? "line-through text-muted-foreground"
                          : ""
                      }
                    >
                      {formatRupiah(plan.price)}
                    </span>
                  </div>
                  {discountApplied && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        Discount ({discountApplied.discount_value}
                        {discountApplied.discount_type === "percentage"
                          ? "%"
                          : ""}
                        )
                      </span>
                      <span>-{formatRupiah(discountAmount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatRupiah(finalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {!showPaymentOptions ? (
                <Button
                  onClick={() => {
                    if (isPaymentMethodEnabled("manualRecurring")) {
                      handlePaymentMethodSelect("one-time");
                    } else {
                      handleShowPaymentOptions();
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing
                    ? "Processing..."
                    : plan.withTrial
                    ? "Start Free Trial"
                    : `Continue to Payment - ${formatRupiah(finalAmount)}`}
                </Button>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-center mb-2">
                    Choose your payment preference
                  </h3>

                  {/* Recurring Payment Toggle */}
                  {(isRecurringEnabled("gopay") ||
                    isRecurringEnabled("creditCard")) && (
                    <Card className="bg-blue-50/50 border-blue-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                              <Repeat className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor="recurring-toggle"
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  Enable Recurring Payments
                                </label>
                                {enableRecurring && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-green-100 text-green-700"
                                  >
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Automatically renew your subscription for
                                uninterrupted access
                              </p>
                            </div>
                          </div>
                          <Switch
                            id="recurring-toggle"
                            checked={enableRecurring}
                            onCheckedChange={setEnableRecurring}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Show existing linked accounts */}
                  {linkedAccounts.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Linked Accounts
                      </h4>
                      {linkedAccounts.map((account) => (
                        <div key={account.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {account.payment_method === "gopay" ? (
                                <Smartphone className="h-4 w-4 text-blue-600" />
                              ) : (
                                <CreditCard className="h-4 w-4 text-green-600" />
                              )}
                              <div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                  {account.payment_method === "gopay"
                                    ? "GoPay"
                                    : "Card"}
                                  {account.status === "active" && (
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {account.status === "active"
                                    ? "Ready for payments"
                                    : account.status}
                                </div>
                                {account.masked_number && (
                                  <div className="text-xs text-muted-foreground">
                                    {account.masked_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Proceed button for recurring payments */}
                      {enableRecurring && (
                        <>
                          <Separator />
                          <Button
                            onClick={() => handlePayment()}
                            disabled={isProcessing}
                            className="w-full"
                            size="lg"
                          >
                            {isProcessing
                              ? "Creating Subscription..."
                              : "Proceed to Subscribe"}
                          </Button>
                        </>
                      )}

                      {!enableRecurring && <Separator />}
                    </div>
                  )}

                  <div className="grid gap-3">
                    {/* GoPay Subscription */}
                    {isRecurringEnabled("gopay") && (
                      <Button
                        onClick={() => handlePaymentMethodSelect("gopay")}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full p-3 sm:p-4 h-auto flex items-start gap-3 hover:bg-accent text-left"
                      >
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base flex items-center gap-2">
                            Subscribe with GoPay
                            {enableRecurring && (
                              <Badge variant="secondary" className="text-xs">
                                Recurring
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {enableRecurring
                              ? "Set up automatic recurring payments with GoPay"
                              : "Pay with GoPay"}
                          </div>
                        </div>
                      </Button>
                    )}

                    {/* Credit Card Subscription */}
                    {isRecurringEnabled("creditCard") && (
                      <Button
                        onClick={() => handlePaymentMethodSelect("credit_card")}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full p-3 sm:p-4 h-auto flex items-start gap-3 hover:bg-accent text-left"
                      >
                        <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base flex items-center gap-2">
                            Subscribe with Credit Card
                            {enableRecurring && (
                              <Badge variant="secondary" className="text-xs">
                                Recurring
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {enableRecurring
                              ? "Set up automatic recurring payments with credit card"
                              : "Pay with credit card"}
                          </div>
                        </div>
                      </Button>
                    )}

                    {/* One-Time Payment - Only show if recurring is NOT enabled */}
                    {!enableRecurring && (
                      <Button
                        onClick={() => handlePaymentMethodSelect("one-time")}
                        disabled={isProcessing}
                        variant="outline"
                        className="w-full p-3 sm:p-4 h-auto flex items-start gap-3 hover:bg-accent text-left"
                      >
                        <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm sm:text-base">
                            One-Time Payment
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Pay now with any method (Bank Transfer, QRIS,
                            E-Wallet)
                          </div>
                        </div>
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => setShowPaymentOptions(false)}
                    variant="ghost"
                    className="w-full text-sm mt-4"
                  >
                    ← Back to plan details
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center px-2">
                By continuing, you agree to our Terms of Service. Payment
                processed securely by Midtrans.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
