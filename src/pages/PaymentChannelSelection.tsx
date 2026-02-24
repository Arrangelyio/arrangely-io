import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
    CreditCard,
    Smartphone,
    Building2,
    ArrowLeft,
    Clock,
    BookOpen,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// Extend Window interface for Midtrans Snap
declare global {
    interface Window {
        snap: any;
    }
}

export default function PaymentChannelSelection() {
    const { t } = useLanguage();
    const { slug } = useParams();
    const navigate = useNavigate();
    const [selectedChannel, setSelectedChannel] = useState<string>("gopay");
    const [selectedBank, setSelectedBank] = useState<string>("bca");
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: lesson, isLoading } = useQuery({
        queryKey: ["lesson", slug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("lessons")
                .select(
                    `
          *,
          profiles:creator_id (
            display_name,
            avatar_url
          )
        `
                )
                .eq("slug", slug)
                .eq("status", "published")
                .single();

            if (error) throw error;
            return data;
        },
    });

    const { data: currentUser } = useQuery({
        queryKey: ["user"],
        queryFn: async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            return user;
        },
    });

    const paymentChannels = [
        {
            id: "gopay",
            name: "QRIS",
            icon: Smartphone,
            description: "Scan QR code with e-wallet app",
            recommended: true,
        },
        {
            id: "va",
            name: "Bank Transfer (Virtual Account)",
            icon: Building2,
            description: "Transfer via Virtual Account",
        },
        {
            id: "credit_card",
            name: "Credit/Debit Card",
            icon: CreditCard,
            description: "Visa, Mastercard, JCB",
        },
    ];

    const bankOptions = [
        { id: "mandiri", name: "Mandiri" },
        { id: "bni", name: "BNI" },
        { id: "bri", name: "BRI" },
        { id: "permata", name: "Permata Bank" },
        { id: "cimb", name: "CIMB Niaga" },
        { id: "other", name: "Other Banks" },
    ];

    const handleSelectChannel = async () => {
        if (!selectedChannel) {
            toast.error("Please select a payment method");
            return;
        }

        if (!currentUser) {
            toast.error("Please login first");
            navigate("/auth");
            return;
        }

        setIsProcessing(true);

        try {
            const paymentMethod = selectedChannel;
            const paymentChannel =
                paymentMethod === "va" || paymentMethod === "bank_transfer"
                    ? "va"
                    : paymentMethod;

            const bank =
                paymentMethod === "va" || paymentMethod === "bank_transfer"
                    ? selectedBank
                    : undefined;

            const { data, error } = await supabase.functions.invoke(
                "create-midtrans-payment",
                {
                    body: {
                        lessonId: lesson.id, // FIX
                        amount: lesson.price,
                        description: lesson.title,
                        isLessonPayment: true,
                        paymentMethod: paymentMethod,
                        paymentChannel: paymentChannel,
                        selectedBank: bank,
                    },
                }
            );

            if (error) {
                if (
                    error.message?.includes("ACTIVE_TRANSACTION_EXISTS") ||
                    data?.error === "ACTIVE_TRANSACTION_EXISTS"
                ) {
                    toast.info("Redirecting to your active payment...", {
                        description: "You already have a pending transaction",
                    });

                    if (data?.orderId) {
                        setTimeout(() => {
                            navigate(
                                `/arrangely-music-lab/${slug}/payment/waiting/${data.orderId}`
                            );
                        }, 500);
                    }
                    return;
                }

                throw error;
            }

            // If Snap URL is provided (Core API disabled), redirect directly to Midtrans Snap
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }

            if (data.orderId) {
                toast.success("Payment created successfully");
                navigate(
                    `/arrangely-music-lab/${slug}/payment/waiting/${data.orderId}`
                );
            }
        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(error.message || "Failed to create payment");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="text-center">Lesson not found</div>
            </div>
        );
    }

    const { data: modules } = useQuery({
        queryKey: ["lesson-modules", lesson?.id, currentUser?.id],
        enabled: !!lesson?.id,
        queryFn: async () => {
            const { data, error } = await supabase.rpc(
                "get_secure_lesson_modules",
                {
                    p_lesson_id: lesson.id,
                }
            );

            if (error) throw error;
            return data;
        },
    });

    const totalDuration =
        modules?.reduce(
            (acc, module: any) =>
                acc +
                module.lesson_content.reduce(
                    (sum: number, content: any) =>
                        sum + (content.duration_minutes || 0),
                    0
                ),
            0
        ) || 0;

    return (
        <div className="container mt-20 mx-auto px-4 py-8 max-w-4xl">
            {/* Back Button */}
            <Button
                variant="ghost"
                onClick={() => navigate(`/arrangely-music-lab/${slug}`)}
                className="mb-6"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {/* Back to Lesson */}
                {t("paymentCourse.backTo")}
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment Channel Selection */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {/* Select Payment Method */}
                            {t("paymentCourse.select")}
                        </h1>
                        <p className="text-muted-foreground">
                            {/* Choose your preferred payment method to continue */}
                            {t("paymentCourse.choose")}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {paymentChannels.map((channel) => {
                            const Icon = channel.icon;
                            const isSelected = selectedChannel === channel.id;

                            return (
                                <div key={channel.id}>
                                    <Card
                                        className={`cursor-pointer transition-all ${
                                            isSelected
                                                ? "ring-2 ring-primary shadow-lg"
                                                : "hover:shadow-md"
                                        }`}
                                        onClick={() =>
                                            setSelectedChannel(channel.id)
                                        }
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted"
                                                    }`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">
                                                            {channel.name}
                                                        </h3>
                                                        {channel.recommended && (
                                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                                Recommended
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {channel.description}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        isSelected
                                                            ? "border-primary bg-primary"
                                                            : "border-muted-foreground"
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Bank selection for Virtual Account */}
                                    {channel.id === "va" && isSelected && (
                                        <Card className="mt-3 p-4 bg-muted/30">
                                            <Label className="text-sm font-medium mb-3 block">
                                                Select Bank
                                            </Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {bankOptions.map((bank) => (
                                                    <Card
                                                        key={bank.id}
                                                        className={`p-3 cursor-pointer transition-all hover:border-primary ${
                                                            selectedBank ===
                                                            bank.id
                                                                ? "border-primary bg-primary/5"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            setSelectedBank(
                                                                bank.id
                                                            )
                                                        }
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                                                    selectedBank ===
                                                                    bank.id
                                                                        ? "border-primary bg-primary"
                                                                        : "border-muted-foreground"
                                                                }`}
                                                            >
                                                                {selectedBank ===
                                                                    bank.id && (
                                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium">
                                                                {bank.name}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSelectChannel}
                        disabled={!selectedChannel || isProcessing}
                    >
                        {isProcessing
                            ? "Processing..."
                            : t("paymentCourse.buttonContinue")}
                    </Button>
                </div>

                {/* Order Summary */}
                <div>
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>
                                {/* Order Summary */}
                                {t("paymentCourse.order")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Lesson Info */}
                            <div className="space-y-3">
                                {lesson.cover_image_url && (
                                    <img
                                        src={lesson.cover_image_url}
                                        alt={lesson.title}
                                        className="w-full aspect-video object-cover rounded-lg"
                                    />
                                )}
                                <div>
                                    <h3 className="font-semibold line-clamp-2">
                                        {lesson.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        by {lesson.profiles?.display_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {/* {lesson.duration_minutes}min */}
                                            {totalDuration}m
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <BookOpen className="h-4 w-4" />
                                        <span className="capitalize">
                                            {lesson.difficulty_level}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Price */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {/* Price */}
                                        {t("paymentCourse.price")}
                                    </span>
                                    <span className="font-medium">
                                        Rp{" "}
                                        {lesson.price.toLocaleString("id-ID")}
                                    </span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-2xl font-bold">
                                        Rp{" "}
                                        {lesson.price.toLocaleString("id-ID")}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
