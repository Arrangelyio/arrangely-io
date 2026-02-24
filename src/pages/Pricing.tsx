import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Check,
    Crown,
    Star,
    Zap,
    Gift,
    CreditCard,
    Smartphone,
    Settings,
    Repeat,
    CheckCircle,
    Loader2,
    Info,
    Plus,
    Sparkles,
    TrendingUp,
    ArrowRight,
    Users,
    Calendar,
    UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import TrialInfoModal from "@/components/payment/TrialInfoModal";
import SubscriptionManagementModal from "@/components/subscription/SubscriptionManagementModal";
import { useLanguage } from "@/contexts/LanguageContext";
import PaymentModal from "@/components/payment/PaymentModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
    isLinkingEnabled,
    isRecurringEnabled,
    getManualRecurringDaysBeforeExpiry,
} from "@/config/paymentMethods";
import { Capacitor } from "@capacitor/core";

const IS_TRIAL_ENABLED = false;

interface LinkedAccount {
    id: string;
    payment_method: "gopay" | "credit_card" | string;
    account_id: string;
    status: string;
    masked_number?: string;
    created_at: string;
}

const safeIDR = (val?: number | null) =>
    `Rp${(val ?? 0).toLocaleString("id-ID")}`;

const isProdHost = () => window.location.hostname === "arrangely.io";

const Pricing = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { toast } = useToast();

    // UI state
    const [activeTab, setActiveTab] = useState<
        "plans" | "payment" | "subscription"
    >("plans");
    const [isYearly, setIsYearly] = useState(false); // highlight yearly by default
    const [showMore, setShowMore] = useState(false);

    // Data state
    const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
    const [userSubscription, setUserSubscription] = useState<any>(null);
    const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Payment/linking state
    const [isLinking, setIsLinking] = useState(false);
    const [showGopayForm, setShowGopayForm] = useState(false);
    const [showCardForm, setShowCardForm] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");

    // Modals
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [isTrialInfoModalOpen, setIsTrialInfoModalOpen] = useState(false);
    const [trialInfo, setTrialInfo] = useState<any>(null);

    // Manual recurring state
    const [showManualRecurring, setShowManualRecurring] = useState(false);
    const [daysUntilExpiry, setDaysUntilExpiry] = useState<number | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    useEffect(() => {
        fetchPlansAndSubscription();
        loadLinkedAccounts();

        // URL params
        const params = new URLSearchParams(window.location.search);
        const voucher = params.get("voucher");
        const tabParam = params.get("tab");
        const status = params.get("status");
        const orderId = params.get("order_id");
        const transactionStatus = params.get("transaction_status");

        // Handle Midtrans payment callback - check if Creator Community payment was successful
        if (
            status === "check_payment" &&
            orderId &&
            transactionStatus === "settlement"
        ) {
            // Check if this was a Creator Community subscription
            const checkCreatorProPayment = async () => {
                try {
                    const { data: subscription } = await supabase
                        .from("subscriptions")
                        .select("*, subscription_plans(name)")
                        .eq("midtrans_order_id", orderId)
                        .single();

                    // @ts-ignore
                    if (
                        subscription?.subscription_plans?.name?.includes(
                            "Creator Pro",
                        ) ||
                        subscription?.subscription_plans?.name?.includes(
                            "Creator Community",
                        )
                    ) {
                        // Clear URL params and redirect to welcome page
                        window.history.replaceState(
                            {},
                            "",
                            window.location.pathname,
                        );
                        navigate("/creator-pro-welcome");
                        return;
                    }
                } catch (error) {
                    console.error(
                        "Error checking Creator Community payment:",
                        error,
                    );
                }
            };
            checkCreatorProPayment();
        }

        if (voucher) {
            localStorage.setItem("pending_voucher_code", voucher);
            params.delete("voucher");
            window.history.replaceState(
                {},
                "",
                `${window.location.pathname}?${params.toString()}`,
            );
        }
        if (
            tabParam === "payment" ||
            tabParam === "subscription" ||
            tabParam === "plans"
        ) {
            setActiveTab(tabParam as any);
        }

        // Auth
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) checkSubscriptionStatus();
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                checkSubscriptionStatus();
                loadLinkedAccounts();
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Check if manual recurring should be shown
    useEffect(() => {
        if (!userSubscription?.current_period_end) {
            setShowManualRecurring(false);
            setDaysUntilExpiry(null);
            return;
        }

        const currentPeriodEnd = new Date(userSubscription.current_period_end);
        const now = new Date();
        const diffTime = currentPeriodEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setDaysUntilExpiry(diffDays);

        // Check if we're within the threshold
        const threshold = getManualRecurringDaysBeforeExpiry();
        const isManualMode =
            !isRecurringEnabled("gopay") && !isRecurringEnabled("creditCard");

        setShowManualRecurring(
            isManualMode && diffDays <= threshold && diffDays >= 0,
        );
    }, [userSubscription]);

    const loadLinkedAccounts = async () => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("linked_payment_accounts")
                .select("*")
                .eq("is_production", isProdHost())
                .order("created_at", { ascending: false });

            if (error) throw error;
            setLinkedAccounts(data || []);
        } catch (e) {
            console.error("Error loading linked accounts:", e);
        }
    };

    const checkSubscriptionStatus = async () => {
        try {
            const { data, error } = await supabase.functions.invoke(
                "check-subscription",
            );
            if (error) return console.error("check-subscription error:", error);

            if (data.hasActiveSubscription) {
                setUserSubscription(data.subscription);
                if (data.isTrialing) {
                    const trialEnd = new Date(data.trialEnd);
                    const daysLeft = Math.ceil(
                        (trialEnd.getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24),
                    );
                    setTrialInfo({
                        isActive: true,
                        daysLeft,
                        endDate: data.trialEnd,
                        nextBillingDate: data.nextBillingDate,
                        hasUsedTrial: data.hasUsedTrial,
                        canStartTrial: data.canStartTrial,
                        hasSuccessfulPayment: data.hasSuccessfulPayment,
                        autoPaymentEnabled: data.autoPaymentEnabled,
                    });
                }
            } else {
                setUserSubscription(null);
                setTrialInfo({
                    isActive: false,
                    hasUsedTrial: data.hasUsedTrial,
                    canStartTrial: data.canStartTrial,
                    hasSuccessfulPayment: data.hasSuccessfulPayment,
                    trialExpired: data.trialExpired,
                });
            }
        } catch (e) {
            console.error("checkSubscriptionStatus failed:", e);
        }
    };

    const fetchPlansAndSubscription = async () => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const { data: plans, error: plansError } = await supabase
                .from("subscription_plans")
                .select("*")
                .eq("is_active", true)
                .order("price");

            if (plansError) throw plansError;
            setSubscriptionPlans(plans || []);

            if (session?.user) {
                const { data: sub } = await supabase
                    .from("subscriptions")
                    .select(
                        `*, subscription_plans ( name, price, interval_type )`,
                    )
                    .eq("user_id", session.user.id)
                    .in("status", ["active", "trialing"])
                    .single();

                if (sub) setUserSubscription(sub);
            }
        } catch (e) {
            console.error("fetchPlansAndSubscription failed:", e);
        } finally {
            setLoading(false);
        }
    };

    // ---------- Helpers ----------
    const formatCardNumber = (v: string) =>
        v
            .replace(/\s/g, "")
            .match(/.{1,4}/g)
            ?.join(" ") ?? v;
    const formatExpiry = (v: string) => {
        const cleaned = v.replace(/\D/g, "");
        return cleaned.length >= 2
            ? `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
            : cleaned;
    };
    const getAccountIcon = (m: string) =>
        m === "gopay" ? (
            <Smartphone className="h-5 w-5" />
        ) : (
            <CreditCard className="h-5 w-5" />
        );
    const getAccountDisplay = (a: LinkedAccount) =>
        a.payment_method === "gopay"
            ? a.masked_number || "GoPay Account"
            : a.masked_number || "•••• •••• •••• ••••";

    const isCurrentPlan = (plan: any) =>
        userSubscription?.plan_id === plan.id &&
        userSubscription?.status === "active";

    const filteredPlans = useMemo(() => {
        const base = subscriptionPlans.filter((p) => {
            // Exclude Creator Community/Pro from this list - it's rendered separately with special styling
            if (p.name === "Creator Pro" || p.name === "Creator Community")
                return false;

            return p.price === 0
                ? true
                : isYearly
                ? p.interval_type === "year"
                : p.interval_type === "month";
        });
        return base;
    }, [subscriptionPlans, isYearly]);

    const plans = filteredPlans.map((plan) => {
        const isYearlyPlan = plan.interval_type === "year";
        const monthlyPrice = isYearlyPlan
            ? Math.round(plan.price / 12)
            : plan.price;

        // Calculate yearly discount vs equivalent monthly plan
        let yearlyDiscount = 0;
        if (isYearlyPlan) {
            const monthlyPlan = subscriptionPlans.find(
                (p) =>
                    p.interval_type === "month" &&
                    p.library_limit === plan.library_limit,
            );
            if (monthlyPlan) {
                const monthlyTotal = monthlyPlan.price * 12;
                yearlyDiscount = Math.max(
                    0,
                    Math.round(
                        ((monthlyTotal - plan.price) / monthlyTotal) * 100,
                    ),
                );
            }
        }

        const originalPrice = plan.original_price ?? plan.price;
        const hasDiscount = originalPrice > plan.price;

        return {
            id: plan.id,
            name: plan.name.replace(" Premium", ""),
            price: safeIDR(plan.price),
            priceAmount: plan.price as number,
            originalPrice: originalPrice,
            originalPriceFormatted: safeIDR(originalPrice),
            hasDiscount,
            monthlyPrice: safeIDR(monthlyPrice),
            period:
                plan.price === 0
                    ? t("pricing.month")
                    : isYearlyPlan
                    ? t("pricing.year")
                    : t("pricing.month"),
            isYearly: isYearlyPlan,
            yearlyDiscount,
            description:
                plan.price === 0
                    ? t("pricing.descFree")
                    : t("pricing.descPlan"),
            icon: plan.price === 0 ? Star : Crown,
            features:
                plan.price === 0
                    ? [
                          t("pricing.viewAndUse"),
                          t("pricing.basicEditor"),
                          t("pricing.communitySupport"),
                          t("pricing.bassicChord"),
                      ]
                    : (() => {
                          const feat = plan.features || {}; // langsung ambil dari field plan.features
                          console.log(
                              "🔍 Parsed features for plan:",
                              plan.name,
                              feat,
                          );

                          const featureList: string[] = [];

                          // 🟢 Always include base line
                          featureList.push(t("pricing.everything"));

                          // 🔸 Library limit
                          if (feat.library) {
                              const libCount = parseInt(feat.library);
                              if (libCount <= 50)
                                  featureList.push(
                                      t("lang") === "id"
                                          ? "Maksimal 50 lagu komunitas di perpustakaan pribadi"
                                          : "Maximum 50 community songs in personal library",
                                  );
                              else if (libCount <= 100)
                                  featureList.push(t("pricing.max100"));
                              else if (libCount <= 600)
                                  featureList.push(t("pricing.max600"));
                              else if (libCount <= 1500)
                                  featureList.push(t("pricing.max1500"));
                              else featureList.push(t("pricing.personalSong"));
                          }

                          // 🔸 PDF Exports
                          if (feat.pdf_exports) {
                              if (feat.pdf_exports === "200")
                                  featureList.push(
                                      t("lang") === "id"
                                          ? "Ekspor hingga 200 file PDF"
                                          : "Export up to 200 PDF files",
                                  );
                              else if (feat.pdf_exports === "500")
                                  featureList.push(
                                      t("lang") === "id"
                                          ? "Ekspor hingga 500 file PDF"
                                          : "Export up to 500 PDF files",
                                  );
                              else if (feat.pdf_exports === "unlimited")
                                  featureList.push(t("pricing.pdfDownload"));
                          }

                          // 🔸 Arrangements (unlimited or capped)
                          if (feat.arrangements) {
                              if (feat.arrangements === "unlimited")
                                  featureList.push(
                                      t("lang") === "id"
                                          ? "Aransemen musik tanpa batas"
                                          : "Unlimited music arrangements",
                                  );
                              else
                                  featureList.push(
                                      t("lang") === "id"
                                          ? `Maksimal ${feat.arrangements} aransemen musik`
                                          : `Up to ${feat.arrangements} music arrangements`,
                                  );
                          }

                          // 🔸 Live preview
                          if (feat.live_preview)
                              featureList.push(t("pricing.livePerform"));

                          // 🔸 Setlist manager
                          if (feat.setlist_plan)
                              featureList.push(t("pricing.setlistManager"));

                          // 🔸 Priority support
                          if (feat.priority_support)
                              featureList.push(t("pricing.priority"));

                          // 🔸 Extra tools
                          featureList.push(t("pricing.autoStructure"));
                          featureList.push(t("pricing.trasnposeOption"));
                          featureList.push(t("pricing.customArr"));
                          featureList.push(t("pricing.personalSong"));

                          return featureList;
                      })(),

            // Only show "Most Popular" for Premium plan (price around 39000 monthly)
            popular: plan.name === "Premium Plan" && !isYearlyPlan,
            recommended: plan.name === "Premium Plan" && isYearlyPlan,
            badge:
                plan.name === "Premium Plan" && isYearlyPlan
                    ? "Best Value"
                    : plan.name === "Premium Plan"
                    ? "Most Popular"
                    : undefined,
        };
    });

    // ---------- Actions ----------
    const handleSubscribe = async (plan: any) => {
        if (!user) {
            toast({
                title: "Login Required",
                description: "Please login to subscribe to a plan",
                variant: "destructive",
            });
            navigate("/auth");
            return;
        }

        // Already on active sub
        if (userSubscription?.status === "active") {
            const currentPlan = subscriptionPlans.find(
                (p) => p.id === userSubscription.plan_id,
            );
            if (!currentPlan) {
                toast({
                    title: "Error",
                    description: "Could not find current subscription details.",
                    variant: "destructive",
                });
                return;
            }
            if (plan.price > currentPlan.price) {
                toast({
                    title: "Upgrade Plan",
                    description: "Continue to payment",
                });
                setSelectedPlan({ ...plan, withTrial: false });
                setIsPaymentModalOpen(true);
            } else if (plan.id !== currentPlan.id) {
                toast({
                    title: "Plan change scheduled",
                    description: "Downgrades apply at end of current cycle.",
                });
            } else {
                toast({
                    title: "Info",
                    description: "You’re already on this plan.",
                });
            }
            return;
        }

        // Fresh purchase
        if (plan.price === 0) {
            toast({
                title: "You're on the Free Plan!",
                description: "You can start creating now.",
            });
            return;
        }

        setSelectedPlan({ ...plan, withTrial: false });
        setIsPaymentModalOpen(true);
    };

    const handleLinkGopay = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toast({
                title: "Invalid Phone Number",
                description: "Please enter a valid phone number",
                variant: "destructive",
            });
            return;
        }
        setIsLinking(true);
        try {
            const { data, error } = await supabase.functions.invoke(
                "link-gopay-account",
                {
                    body: {
                        amount: 10000,
                        description: "GoPay Account Linking",
                        phone_number: phoneNumber,
                    },
                },
            );
            if (error) throw error;
            const target =
                data.deeplink_url || data.redirect_url || data.qr_code_url;
            if (target) window.location.href = target;
            else throw new Error("No authorization URL received");
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Failed to Link GoPay",
                description: e.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setIsLinking(false);
        }
    };

    const handleLinkCreditCard = async () => {
        if (!cardNumber || !cardExpiry || !cardCvv) {
            toast({
                title: "Invalid Card Details",
                description: "Please fill in all card details",
                variant: "destructive",
            });
            return;
        }
        setIsLinking(true);

        try {
            // Step 1: Get token using MidtransNew3ds
            const [expMonth, expYear] = cardExpiry.split("/");
            const cardData = {
                card_number: cardNumber.replace(/\s/g, ""),
                card_cvv: cardCvv,
                card_exp_month: (expMonth || "").trim(),
                card_exp_year: (() => {
                    const y = (expYear || "").trim();
                    return y.length === 2 ? `20${y}` : y; // support YY or YYYY
                })(),
            };

            // Get token from Midtrans
            const tokenPromise = new Promise<string>((resolve, reject) => {
                // @ts-ignore - MidtransNew3ds is loaded via script tag
                if (typeof MidtransNew3ds === "undefined") {
                    reject(new Error("Midtrans 3DS library not loaded"));
                    return;
                }

                try {
                    const options = {
                        onSuccess: (response: any) => {
                            resolve(response.token_id);
                        },
                        onFailure: (response: any) => {
                            console.error("Token failure:", response);
                            reject(
                                new Error(
                                    response.status_message ||
                                        "Failed to get card token",
                                ),
                            );
                        },
                    };

                    // @ts-ignore
                    MidtransNew3ds.getCardToken(cardData, options);
                } catch (error) {
                    console.error("Error calling getCardToken:", error);
                    reject(error);
                }
            });

            const tokenId = await tokenPromise;

            // Step 2: Send token to backend for One Click Initial Charge
            const { data, error } = await supabase.functions.invoke(
                "link-credit-card",
                {
                    body: {
                        token_id: tokenId,
                    },
                },
            );

            if (error) throw error;

            if (data.redirect_url) {
                // 3DS authentication required - use iframe popup

                // @ts-ignore - MidtransNew3ds and picoModal are loaded via script tags
                const modal = picoModal({
                    content: `<iframe frameborder="0" style="height:90vh; width:100%;" src="${data.redirect_url}"></iframe>`,
                    width: "75%",
                    closeButton: false,
                    overlayClose: false,
                    escCloses: false,
                }).show();

                const authOptions = {
                    performAuthentication: (url: string) => {},
                    onSuccess: async (response: any) => {
                        try {
                            modal.close();
                        } catch (e) {}

                        toast({
                            title: "Credit Card Linked",
                            description:
                                "Your credit card has been linked successfully",
                        });
                        setShowCardForm(false);
                        setCardNumber("");
                        setCardExpiry("");
                        setCardCvv("");
                        await loadLinkedAccounts();
                    },
                    onFailure: (response: any) => {
                        console.error("3DS authentication failure:", response);
                        try {
                            modal.close();
                        } catch (e) {}

                        toast({
                            title: "Authentication Failed",
                            description:
                                response.status_message ||
                                "3D Secure authentication failed",
                            variant: "destructive",
                        });
                    },
                    onPending: (response: any) => {
                        try {
                            modal.close();
                        } catch (e) {}

                        toast({
                            title: "Payment Pending",
                            description:
                                "Your payment is being processed. You'll be notified of the result.",
                        });
                    },
                };

                // @ts-ignore
                MidtransNew3ds.authenticate(data.redirect_url, authOptions);
            } else if (data.success) {
                toast({
                    title: "Credit Card Linked",
                    description:
                        "Your credit card has been linked successfully",
                });
                setShowCardForm(false);
                setCardNumber("");
                setCardExpiry("");
                setCardCvv("");
                await loadLinkedAccounts();
            } else {
                throw new Error(
                    "No authorization URL or success response received",
                );
            }
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Failed to Link Credit Card",
                description: e.message || "Please try again",
                variant: "destructive",
            });
        } finally {
            setIsLinking(false);
        }
    };

    const handleManualRecurring = async () => {
        if (!userSubscription || !user) {
            toast({
                title: "Error",
                description: "No active subscription found",
                variant: "destructive",
            });
            return;
        }

        setIsProcessingPayment(true);
        try {
            // Get the current plan details
            const currentPlan = subscriptionPlans.find(
                (p) => p.id === userSubscription.plan_id,
            );
            if (!currentPlan) {
                throw new Error("Current plan not found");
            }

            // Create a payment via create-midtrans-payment
            const { data, error } = await supabase.functions.invoke(
                "create-midtrans-payment",
                {
                    body: {
                        planId: currentPlan.id,
                        withTrial: false,
                        intervalType: currentPlan.interval_type,
                        userId: user.id,
                        userEmail: user.email,
                        paymentMethod: "one-time",
                        enableRecurring: false,
                    },
                },
            );

            if (error) throw error;

            if (data?.snapToken) {
                // @ts-ignore - Snap is loaded via script tag
                if (typeof window.snap !== "undefined") {
                    window.snap.pay(data.snapToken, {
                        onSuccess: async (result: any) => {
                            toast({
                                title: "Payment Successful",
                                description:
                                    "Your subscription has been renewed",
                            });
                            await fetchPlansAndSubscription();
                            await checkSubscriptionStatus();
                        },
                        onPending: (result: any) => {
                            toast({
                                title: "Payment Pending",
                                description: "Your payment is being processed",
                            });
                        },
                        onError: (result: any) => {
                            console.error("Payment error:", result);
                            toast({
                                title: "Payment Failed",
                                description: "Failed to process payment",
                                variant: "destructive",
                            });
                        },
                        onClose: () => {},
                    });
                } else {
                    throw new Error("Midtrans Snap not loaded");
                }
            } else {
                throw new Error("No snap token received");
            }
        } catch (error: any) {
            console.error("Error processing manual recurring payment:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to process payment",
                variant: "destructive",
            });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    if (loading) {
        return (
            <div
                className={`min-h-screen bg-gradient-sanctuary flex items-center justify-center 
        ${Capacitor.isNativePlatform() ? "pt-32" : "pt-16"}
      `}
            >
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div
            className={`min-h-screen bg-gradient-sanctuary 
    ${Capacitor.isNativePlatform() ? "pt-32" : "pt-16"}
    `}
        >
            <div className="container max-w-7xl mx-auto px-4 py-10">
                {/* Header */}
                <div className="text-center mb-10">
                    <Badge variant="secondary" className="mb-4">
                        <Zap className="h-4 w-4 mr-2" />
                        {t("pricing.title1")}
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-primary mb-3">
                        Subscription & Payments
                    </h1>
                    <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                        Manage your subscription, plans, and payment methods in
                        one place
                    </p>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v: any) => setActiveTab(v)}
                    className="w-full"
                >
                    <TabsList
                        className={`grid w-full max-w-xl mx-auto ${
                            (isLinkingEnabled("gopay") ||
                                isLinkingEnabled("creditCard")) &&
                            userSubscription
                                ? "grid-cols-3"
                                : userSubscription
                                ? "grid-cols-2"
                                : isLinkingEnabled("gopay") ||
                                  isLinkingEnabled("creditCard")
                                ? "grid-cols-2"
                                : "grid-cols-1"
                        } mb-8 rounded-2xl bg-white/60 backdrop-blur border shadow-sm`}
                    >
                        <TabsTrigger
                            value="plans"
                            className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
                        >
                            <Crown className="h-4 w-4" />
                            <span className="hidden sm:inline">Plans</span>
                        </TabsTrigger>
                        {(isLinkingEnabled("gopay") ||
                            isLinkingEnabled("creditCard")) && (
                            <TabsTrigger
                                value="payment"
                                className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"
                            >
                                <CreditCard className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Payment
                                </span>
                            </TabsTrigger>
                        )}
                        {userSubscription && (
                            <TabsTrigger
                                value="subscription"
                                className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white relative"
                            >
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline">Manage</span>
                                {/* Payment due indicator */}
                                {showManualRecurring && (
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                )}
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* PLANS */}
                    <TabsContent value="plans" className="space-y-8">
                        {/* Premium Active Subscription Banner */}
                        {userSubscription && (
                            <div className="max-w-3xl mx-auto">
                                <div className="relative rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 md:p-5 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                            <Crown className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">
                                                    You have an active
                                                    subscription
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="border-primary/40 text-primary"
                                                >
                                                    {userSubscription.status}
                                                </Badge>
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                                                <Info className="h-4 w-4" />
                                                {userSubscription.current_period_end && (
                                                    <span>
                                                        Expires:{" "}
                                                        <span className="font-medium text-foreground">
                                                            {format(
                                                                new Date(
                                                                    userSubscription.current_period_end,
                                                                ),
                                                                "dd MMM yyyy",
                                                            )}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {userSubscription?.midtrans_subscription_id &&
                                            userSubscription?.auto_payment_enabled && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setActiveTab(
                                                            "subscription",
                                                        )
                                                    }
                                                >
                                                    Manage
                                                </Button>
                                            )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Billing Toggle – highlight Yearly */}
                        <Card className="max-w-lg mx-auto border-2 border-primary/20 bg-white/70 backdrop-blur">
                            <CardContent className="pt-6">
                                <div className="relative p-2 rounded-xl bg-muted/40 grid grid-cols-2">
                                    <button
                                        onClick={() => setIsYearly(false)}
                                        className={`py-3 rounded-lg font-semibold transition-all ${
                                            !isYearly
                                                ? "bg-white shadow text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                        aria-pressed={!isYearly}
                                    >
                                        Monthly
                                        {!isYearly && (
                                            <div className="text-xs opacity-80">
                                                Flexible billing
                                            </div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setIsYearly(true)}
                                        className={`py-3 rounded-lg font-semibold transition-all relative ${
                                            isYearly
                                                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                        aria-pressed={isYearly}
                                    >
                                        Yearly
                                        {isYearly && (
                                            <div className="text-xs/relaxed opacity-90">
                                                ⭐ Best value
                                            </div>
                                        )}
                                        {isYearly && (
                                            <span className="absolute -top-3 -right-3">
                                                <Badge className="bg-amber-500 text-white shadow">
                                                    Save up to 40%
                                                </Badge>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plan Grid */}
                        {/* Plan Grid - mobile shows ~1.3 cards to encourage scrolling */}
                        <div className="flex sm:grid flex-nowrap sm:grid-cols-2 lg:grid-cols-4 pt-10 gap-3 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto sm:overflow-x-visible pb-12 snap-x snap-mandatory scrollbar-hide items-stretch -mx-4 pl-4">
                            {/* 1. MAPPING UNTUK PLANS BIASA (Free, Basic, Premium) */}
                            {plans.map((plan) => {
                                const Icon = plan.icon;
                                const highlight =
                                    plan.recommended || plan.popular;
                                const isCurrent = !!subscriptionPlans.find(
                                    (p) => p.id === plan.id && isCurrentPlan(p),
                                );

                                return (
                                    <div
                                        key={`${plan.id}-${
                                            plan.isYearly ? "y" : "m"
                                        }`}
                                        className="min-w-[75%] w-[75%] sm:min-w-0 sm:w-auto flex-shrink-0 snap-start"
                                    >
                                        <Card
                                            className={`h-full relative overflow-hidden transition-all duration-200 hover:shadow-xl flex flex-col ${
                                                highlight
                                                    ? "ring-2 ring-primary bg-white shadow-lg"
                                                    : "bg-white/90 hover:shadow-md"
                                            } rounded-2xl`}
                                        >
                                            {highlight && (
                                                <div className="absolute left-0 right-0 top-3 flex justify-center z-10">
                                                    <Badge className="bg-primary text-white shadow-md px-3 py-1 text-xs sm:text-sm rounded-full">
                                                        {plan.badge}
                                                    </Badge>
                                                </div>
                                            )}

                                            {plan.yearlyDiscount > 0 && (
                                                <div className="absolute top-3 right-3 z-10">
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-emerald-600 text-white text-xs sm:text-sm shadow-md px-3 py-1"
                                                    >
                                                        <Gift className="h-3 w-3 mr-1" />
                                                        Save{" "}
                                                        {plan.yearlyDiscount}%
                                                    </Badge>
                                                </div>
                                            )}

                                            <CardHeader className="text-center pt-10 sm:pt-12">
                                                <div
                                                    className={`mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-2xl w-fit ${
                                                        highlight
                                                            ? "bg-primary/10"
                                                            : "bg-muted"
                                                    }`}
                                                >
                                                    <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                                                </div>
                                                <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                                    {plan.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs text-muted-foreground px-2 min-h-[2.5rem]">
                                                    {plan.description}
                                                </CardDescription>

                                                <div className="mt-3 sm:mt-4 space-y-1">
                                                    {plan.isYearly &&
                                                        plan.priceAmount >
                                                            0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    plan.monthlyPrice
                                                                }
                                                                /month
                                                            </div>
                                                        )}
                                                    {plan.hasDiscount && (
                                                        <div className="text-sm text-muted-foreground line-through">
                                                            {
                                                                plan.originalPriceFormatted
                                                            }
                                                            /{plan.period}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                                                            {plan.price}
                                                        </span>
                                                        <span className="text-sm sm:text-base text-muted-foreground font-medium">
                                                            /{plan.period}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="px-3 sm:px-4 pb-5 sm:pb-6 flex-1 flex flex-col">
                                                <Button
                                                    className={`w-full mb-4 sm:mb-5 text-sm ${
                                                        highlight
                                                            ? "shadow-md"
                                                            : ""
                                                    }`}
                                                    variant={
                                                        highlight
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    onClick={() => {
                                                        const full =
                                                            subscriptionPlans.find(
                                                                (p) =>
                                                                    p.id ===
                                                                    plan.id,
                                                            );
                                                        if (full)
                                                            handleSubscribe(
                                                                full,
                                                            );
                                                    }}
                                                    disabled={isCurrent}
                                                >
                                                    {isCurrent
                                                        ? "Already Subscribed"
                                                        : plan.priceAmount === 0
                                                        ? "Already Free"
                                                        : "Subscribe Now"}
                                                </Button>

                                                <ul className="space-y-2">
                                                    {plan.features
                                                        .slice(
                                                            0,
                                                            showMore
                                                                ? undefined
                                                                : 4,
                                                        )
                                                        .map(
                                                            (
                                                                f: string,
                                                                i: number,
                                                            ) => (
                                                                <li
                                                                    key={i}
                                                                    className="flex items-start gap-2"
                                                                >
                                                                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                                    <span className="text-xs leading-relaxed">
                                                                        {f}
                                                                    </span>
                                                                </li>
                                                            ),
                                                        )}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })}

                            {/* 2. KHUSUS UNTUK CREATOR COMMUNITY PLAN */}
                            {(() => {
                                const creatorProPlan = subscriptionPlans.find(
                                    (p) =>
                                        (p.name === "Creator Pro" ||
                                            p.name === "Creator Community") &&
                                        p.interval_type ===
                                            (isYearly ? "year" : "month"),
                                );
                                const currentPrice =
                                    creatorProPlan?.price ??
                                    (isYearly ? 449000 : 49000);
                                const originalPrice =
                                    creatorProPlan?.original_price ??
                                    currentPrice;
                                const hasDiscount =
                                    originalPrice > currentPrice;
                                const earnPerAdd =
                                    creatorProPlan?.features
                                        ?.earn_per_library_add ?? 250;

                                const hasCreatorProSubscription =
                                    userSubscription &&
                                    (userSubscription.subscription_plans
                                        ?.name === "Creator Pro" ||
                                        userSubscription.subscription_plans
                                            ?.name === "Creator Community") &&
                                    (userSubscription.status === "active" ||
                                        userSubscription.status === "trialing");

                                return (
                                    <div className="min-w-[75%] w-[75%] sm:min-w-0 sm:w-auto flex-shrink-0 snap-start">
                                        <Card className="relative h-full overflow-hidden transition-all duration-200 hover:shadow-xl ring-2 ring-amber-500 bg-gradient-to-br from-amber-50 via-white to-orange-50/50 shadow-lg rounded-2xl flex flex-col">
                                            <div className="absolute left-0 right-0 top-3 flex justify-center z-10">
                                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md px-3 py-1 text-xs sm:text-sm rounded-full">
                                                    <Crown className="h-3 w-3 mr-1" />
                                                    {t("pricing.forCreators")}
                                                </Badge>
                                            </div>

                                            <CardHeader className="text-center pt-10 sm:pt-12 relative">
                                                <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-2xl w-fit bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                                                    <Crown className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600" />
                                                </div>
                                                <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                                    {t("pricing.creatorCommunityTitle")}
                                                </CardTitle>
                                                <CardDescription className="text-xs text-muted-foreground px-2 min-h-[2.5rem]">
                                                    {t("pricing.creatorCommunityDesc")}
                                                </CardDescription>

                                                <div className="mt-3 sm:mt-4 space-y-1">
                                                    {hasDiscount && (
                                                        <div className="text-sm text-muted-foreground line-through">
                                                            {safeIDR(
                                                                originalPrice,
                                                            )}
                                                            /
                                                            {isYearly
                                                                ? t(
                                                                      "pricing.year",
                                                                  )
                                                                : t(
                                                                      "pricing.month",
                                                                  )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-br from-amber-600 to-orange-500 bg-clip-text text-transparent">
                                                            {safeIDR(
                                                                currentPrice,
                                                            )}
                                                        </span>
                                                        <span className="text-sm sm:text-base text-muted-foreground font-medium">
                                                            /
                                                            {isYearly
                                                                ? t(
                                                                      "pricing.year",
                                                                  )
                                                                : t(
                                                                      "pricing.month",
                                                                  )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </CardHeader>

                                            <CardContent className="px-3 sm:px-4 pb-5 sm:pb-6 flex-1 flex flex-col">
                                                {hasCreatorProSubscription ? (
                                                    <Button
                                                        className="w-full mb-4 sm:mb-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white cursor-default"
                                                        disabled
                                                    >
                                                        {t("pricing.alreadySubscribed")}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        className="w-full mb-4 sm:mb-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                                                        onClick={() =>
                                                            creatorProPlan &&
                                                            handleSubscribe(
                                                                creatorProPlan,
                                                            )
                                                        }
                                                    >
                                                        {t("pricing.subscribeNow")}
                                                    </Button>
                                                )}

                                                <ul className="space-y-1.5 flex-1 text-left">
                                                    <li className="flex items-start gap-1.5">
                                                        <Users className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                                        <span className="text-[10px] sm:text-[11px] leading-snug">
                                                            <strong>{t("pricing.publishToCommunity")}</strong>
                                                            {" - "}
                                                            <span className="text-muted-foreground">{t("pricing.publishToCommunityDesc")}</span>
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-1.5">
                                                        <Calendar className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                                        <span className="text-[10px] sm:text-[11px] leading-snug">
                                                            <strong>{t("pricing.priorityEventAccess")}</strong>
                                                            {" - "}
                                                            <span className="text-muted-foreground">{t("pricing.priorityEventAccessDesc")}</span>
                                                        </span>
                                                    </li>
                                                    <li className="flex items-start gap-1.5">
                                                        <UserCircle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                                                        <span className="text-[10px] sm:text-[11px] leading-snug">
                                                            <strong>{t("pricing.creatorProfilePage")}</strong>
                                                            {" - "}
                                                            <span className="text-muted-foreground">{t("pricing.creatorProfilePageDesc")}</span>
                                                        </span>
                                                    </li>
                                                </ul>

                                                <div className="mt-4 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-amber-600 hover:bg-amber-50 text-xs w-full"
                                                        onClick={() =>
                                                            navigate(
                                                                "/creator-community",
                                                            )
                                                        }
                                                    >
                                                        <Info className="h-3.5 w-3.5 mr-1" />
                                                        {t("pricing.learnMore")}{" "}
                                                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })()}
                        </div>
                    </TabsContent>

                    {/* PAYMENT METHODS */}
                    <TabsContent
                        value="payment"
                        className="space-y-8 max-w-4xl mx-auto"
                    >
                        {/* Linked Accounts */}
                        <Card className="border border-primary/10 bg-gradient-to-br from-background to-primary/5 rounded-xl shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary font-semibold">
                                    <CreditCard className="h-5 w-5" />
                                    Linked Payment Methods
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    These payment methods are available for
                                    recurring payments
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {linkedAccounts.length > 0 ? (
                                    <div className="space-y-3">
                                        {linkedAccounts.map((a) => (
                                            <div
                                                key={a.id}
                                                className="flex items-center justify-between p-4 border border-primary/10 rounded-xl bg-background/60 backdrop-blur-sm hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        {getAccountIcon(
                                                            a.payment_method,
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {getAccountDisplay(
                                                                a,
                                                            )}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground capitalize">
                                                            {a.payment_method}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    className={`rounded-full px-3 py-1 text-xs ${
                                                        a.status === "linked"
                                                            ? "bg-green-500/10 text-green-700 border-green-500/20"
                                                            : "bg-gray-200 text-gray-600"
                                                    }`}
                                                >
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    {a.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        No payment methods linked yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Add Payment Method */}
                        <Card className="border border-primary/10 bg-gradient-to-br from-background to-primary/5 rounded-xl shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary font-semibold">
                                    <Plus className="h-5 w-5" />
                                    Add Payment Method
                                </CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Link a new payment method for recurring
                                    subscriptions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {!showGopayForm && !showCardForm && (
                                    <>
                                        {!isLinkingEnabled("gopay") &&
                                        !isLinkingEnabled("creditCard") ? (
                                            <div className="text-center py-12 space-y-3">
                                                <Settings className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                                                <p className="text-muted-foreground">
                                                    Payment method linking is
                                                    temporarily disabled.
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Please use one-time payments
                                                    for now.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {isLinkingEnabled("gopay") && (
                                                    <Button
                                                        className="h-auto py-6 flex-col gap-2 rounded-xl border border-primary/20 hover:bg-primary/10 transition-all"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (!user) {
                                                                toast({
                                                                    title: "Login Required",
                                                                    description:
                                                                        "Please login to link payment methods",
                                                                    variant:
                                                                        "destructive",
                                                                });
                                                                navigate(
                                                                    "/auth",
                                                                );
                                                                return;
                                                            }
                                                            setShowGopayForm(
                                                                true,
                                                            );
                                                            setShowCardForm(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <Smartphone className="h-6 w-6 text-primary" />
                                                        <span className="font-semibold">
                                                            GoPay
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Link your GoPay
                                                            account
                                                        </span>
                                                    </Button>
                                                )}

                                                {isLinkingEnabled(
                                                    "creditCard",
                                                ) && (
                                                    <Button
                                                        className="h-auto py-6 flex-col gap-2 rounded-xl border border-primary/20 hover:bg-primary/10 transition-all"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (!user) {
                                                                toast({
                                                                    title: "Login Required",
                                                                    description:
                                                                        "Please login to link payment methods",
                                                                    variant:
                                                                        "destructive",
                                                                });
                                                                navigate(
                                                                    "/auth",
                                                                );
                                                                return;
                                                            }
                                                            setShowCardForm(
                                                                true,
                                                            );
                                                            setShowGopayForm(
                                                                false,
                                                            );
                                                        }}
                                                    >
                                                        <CreditCard className="h-6 w-6 text-primary" />
                                                        <span className="font-semibold">
                                                            Credit Card
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Link your credit
                                                            card
                                                        </span>
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* GoPay Form */}
                                {showGopayForm && (
                                    <div className="p-6 border border-primary/10 bg-background/60 rounded-xl space-y-4">
                                        <div>
                                            <label
                                                htmlFor="phone"
                                                className="text-sm font-medium"
                                            >
                                                Phone Number
                                            </label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="08123456789"
                                                value={phoneNumber}
                                                onChange={(e) =>
                                                    setPhoneNumber(
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={isLinking}
                                                className="mt-1"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Enter your GoPay registered
                                                phone number
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleLinkGopay}
                                                disabled={isLinking}
                                                className="flex-1"
                                            >
                                                {isLinking ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    "Link GoPay"
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowGopayForm(false);
                                                    setPhoneNumber("");
                                                }}
                                                disabled={isLinking}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Credit Card Form */}
                                {showCardForm && (
                                    <div className="p-6 border border-primary/10 bg-background/60 rounded-xl space-y-4">
                                        <div>
                                            <label
                                                htmlFor="cardNumber"
                                                className="text-sm font-medium"
                                            >
                                                Card Number
                                            </label>
                                            <Input
                                                id="cardNumber"
                                                type="text"
                                                placeholder="1234 5678 9012 3456"
                                                value={cardNumber}
                                                onChange={(e) =>
                                                    setCardNumber(
                                                        formatCardNumber(
                                                            e.target.value,
                                                        ),
                                                    )
                                                }
                                                maxLength={19}
                                                disabled={isLinking}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label
                                                    htmlFor="expiry"
                                                    className="text-sm font-medium"
                                                >
                                                    Expiry (MM/YY)
                                                </label>
                                                <Input
                                                    id="expiry"
                                                    type="text"
                                                    placeholder="12/25"
                                                    value={cardExpiry}
                                                    onChange={(e) =>
                                                        setCardExpiry(
                                                            formatExpiry(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    maxLength={5}
                                                    disabled={isLinking}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label
                                                    htmlFor="cvv"
                                                    className="text-sm font-medium"
                                                >
                                                    CVV
                                                </label>
                                                <Input
                                                    id="cvv"
                                                    type="text"
                                                    placeholder="123"
                                                    value={cardCvv}
                                                    onChange={(e) =>
                                                        setCardCvv(
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                "",
                                                            ),
                                                        )
                                                    }
                                                    maxLength={3}
                                                    disabled={isLinking}
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleLinkCreditCard}
                                                disabled={isLinking}
                                                className="flex-1"
                                            >
                                                {isLinking ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : (
                                                    "Link Credit Card"
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setShowCardForm(false);
                                                    setCardNumber("");
                                                    setCardExpiry("");
                                                    setCardCvv("");
                                                }}
                                                disabled={isLinking}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MANAGE */}
                    {userSubscription && (
                        <TabsContent
                            value="subscription"
                            className="space-y-8 max-w-4xl mx-auto"
                        >
                            {/* Current Subscription */}
                            <Card className="border border-primary/10 bg-gradient-to-br from-background to-primary/5 rounded-xl shadow-sm">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <Crown className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold text-foreground">
                                                    {userSubscription
                                                        .subscription_plans
                                                        ?.name ||
                                                        "Current Plan"}
                                                </CardTitle>
                                                <CardDescription className="text-sm mt-1 text-muted-foreground">
                                                    {userSubscription.status ===
                                                    "trialing"
                                                        ? "Trial Subscription"
                                                        : "Active Subscription"}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        <Badge
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                userSubscription.status ===
                                                "active"
                                                    ? "bg-green-500/10 text-green-700 border-green-500/20"
                                                    : userSubscription.status ===
                                                      "trialing"
                                                    ? "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
                                                    : "bg-gray-200 text-gray-600"
                                            }`}
                                        >
                                            {userSubscription.status}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-5">
                                    <div className="grid gap-4">
                                        {/* Price - Only show if price exists */}
                                        {userSubscription.subscription_plans
                                            ?.price > 0 && (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">
                                                        Price
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {safeIDR(
                                                            userSubscription
                                                                .subscription_plans
                                                                ?.price,
                                                        )}{" "}
                                                        /{" "}
                                                        {userSubscription
                                                            .subscription_plans
                                                            ?.interval_type ===
                                                        "month"
                                                            ? "month"
                                                            : "year"}
                                                    </span>
                                                </div>

                                                <Separator className="my-1 opacity-50" />
                                            </>
                                        )}

                                        {/* Billing Info */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-muted-foreground block mb-1">
                                                    {userSubscription.auto_payment_enabled
                                                        ? "Next Billing Date"
                                                        : "Subscription Expires"}
                                                </span>
                                                <div className="font-medium text-foreground">
                                                    {userSubscription.next_billing_date
                                                        ? format(
                                                              new Date(
                                                                  userSubscription.next_billing_date,
                                                              ),
                                                              "dd MMM yyyy",
                                                          )
                                                        : format(
                                                              new Date(
                                                                  userSubscription.current_period_end,
                                                              ),
                                                              "dd MMM yyyy",
                                                          )}
                                                </div>
                                            </div>

                                            {/* Show Auto-renewal badge or Manual Mode badge */}
                                            {userSubscription.auto_payment_enabled ? (
                                                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-500/5 px-2 py-1 rounded-full">
                                                    <Repeat className="h-3 w-3" />
                                                    Auto-renewal Enabled
                                                </div>
                                            ) : (
                                                !isRecurringEnabled("gopay") &&
                                                !isRecurringEnabled(
                                                    "creditCard",
                                                ) && (
                                                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-500/5 px-2 py-1 rounded-full">
                                                        <Info className="h-3 w-3" />
                                                        Manual Mode
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {/* Recommended Plan Change */}
                                    <div className="mt-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="p-1.5 bg-primary/20 rounded-full">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-foreground text-sm">
                                                    Upgrade Your Experience
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Get more features with our
                                                    Premium plan - Save up to
                                                    20% with annual billing!
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            size="sm"
                                            onClick={() =>
                                                setActiveTab("plans")
                                            }
                                        >
                                            <TrendingUp className="h-4 w-4 mr-2" />
                                            View Available Plans
                                        </Button>
                                    </div>

                                    {/* Manage Button - Show for both auto and manual mode */}
                                    {isRecurringEnabled("gopay") && (
                                        <div className="pt-4 border-t border-primary/10">
                                            <Button
                                                variant="outline"
                                                className="w-full hover:bg-primary/10 transition-all"
                                                onClick={() =>
                                                    setShowManageModal(true)
                                                }
                                            >
                                                <Settings className="h-4 w-4 mr-2" />
                                                Manage Subscription
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Manual Recurring Alert - Show when within threshold */}
                            {showManualRecurring && (
                                <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 rounded-xl shadow-md">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-full">
                                                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1">
                                                <CardTitle className="text-base font-semibold text-amber-900 dark:text-amber-100">
                                                    Subscription Renewal
                                                    Required
                                                </CardTitle>
                                                <CardDescription className="text-sm mt-1 text-amber-700 dark:text-amber-200">
                                                    {daysUntilExpiry !== null &&
                                                    daysUntilExpiry <= 0
                                                        ? "Your subscription has expired. Renew now to continue accessing premium features."
                                                        : `Your subscription expires in ${daysUntilExpiry} ${
                                                              daysUntilExpiry ===
                                                              1
                                                                  ? "day"
                                                                  : "days"
                                                          }. Continue your subscription to maintain access.`}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            onClick={handleManualRecurring}
                                            disabled={isProcessingPayment}
                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-md"
                                            size="lg"
                                        >
                                            {isProcessingPayment ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard className="mr-2 h-4 w-4" />
                                                    Continue Payment
                                                </>
                                            )}
                                        </Button>
                                        {userSubscription.subscription_plans
                                            ?.price > 0 && (
                                            <p className="text-sm text-center mt-3 text-amber-700 dark:text-amber-200">
                                                Amount:{" "}
                                                {safeIDR(
                                                    userSubscription
                                                        .subscription_plans
                                                        ?.price,
                                                )}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Payment Method - Only show if linking is enabled */}
                            {(isLinkingEnabled("gopay") ||
                                isLinkingEnabled("creditCard")) && (
                                <Card className="border border-primary/10 bg-gradient-to-br from-background to-primary/5 rounded-xl shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-primary font-semibold">
                                            <CreditCard className="h-5 w-5" />
                                            Payment Method
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Your linked payment method for
                                            recurring charges
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {linkedAccounts.length > 0 ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 border border-primary/10 rounded-xl bg-background/60 backdrop-blur-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-primary/10 rounded-full">
                                                            {getAccountIcon(
                                                                linkedAccounts[0]
                                                                    .payment_method,
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {getAccountDisplay(
                                                                    linkedAccounts[0],
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground capitalize">
                                                                {
                                                                    linkedAccounts[0]
                                                                        .payment_method
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge className="rounded-full bg-green-500/10 text-green-700 border-green-500/20 px-3 py-1 text-xs">
                                                        <CheckCircle className="mr-1 h-3 w-3" />
                                                        Linked
                                                    </Badge>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setActiveTab("payment")
                                                    }
                                                    className="w-full hover:bg-primary/10 transition-all"
                                                >
                                                    Manage Payment Methods
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground mb-4">
                                                    No payment method linked yet
                                                </p>
                                                <Button
                                                    onClick={() =>
                                                        setActiveTab("payment")
                                                    }
                                                >
                                                    Add Payment Method
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    )}
                </Tabs>

                {selectedPlan && (
                    <PaymentModal
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        plan={selectedPlan}
                        onSuccess={() => {
                            fetchPlansAndSubscription();
                            checkSubscriptionStatus();
                            loadLinkedAccounts();
                            setIsPaymentModalOpen(false);

                            // Redirect to Creator Community welcome page if subscribing to Creator Community
                            if (
                                selectedPlan?.name === "Creator Pro" ||
                                selectedPlan?.name === "Creator Community"
                            ) {
                                navigate("/creator-pro-welcome");
                            }
                        }}
                    />
                )}

                <SubscriptionManagementModal
                    open={showManageModal}
                    onOpenChange={setShowManageModal}
                    subscriptionId={userSubscription?.midtrans_subscription_id}
                />

                {selectedPlan && trialInfo && (
                    <TrialInfoModal
                        isOpen={isTrialInfoModalOpen}
                        onClose={() => setIsTrialInfoModalOpen(false)}
                        plan={selectedPlan}
                        trialInfo={trialInfo}
                    />
                )}
            </div>
        </div>
    );
};

export default Pricing;
