import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    CheckCircle2,
    Copy,
    RefreshCw,
    ArrowLeft,
    AlertCircle,
    XCircle,
    CreditCard,
    Smartphone,
    Building2,
    Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PaymentInstructionsAccordion } from "@/components/payment/PaymentInstructionsAccordion";
import { paymentInstructions } from "@/data/paymentInstructions";

export default function PaymentWaiting() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(0);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const language = "id";

    const {
        data: payment,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["lesson-payment", orderId],
        enabled: !!orderId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("payments")
                .select(
                    `*, lessons:lesson_id(
            id, title, slug, cover_image_url, duration_minutes, difficulty_level,
            profiles:creator_id(display_name)
          )`
                )
                .eq("midtrans_order_id", orderId)
                .single();
            if (error) throw error;
            return data;
        },
    });

    useEffect(() => {
        if (!payment?.expires_at) return;
        const timer = setInterval(() => {
            const exp = new Date(payment.expires_at).getTime();
            const now = Date.now();
            setTimeLeft(Math.max(Math.floor((exp - now) / 1000), 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [payment]);

    useEffect(() => {
        if (!payment) return;
        if (payment.status === "paid" || payment.status === "settlement") {
            toast.success("Payment successful!");
            navigate(`/arrangely-music-lab/${payment.lessons?.slug}`);
        }
    }, [payment]);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const formatTime = (sec) => {
        const h = String(Math.floor(sec / 3600)).padStart(2, "0");
        const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const s = String(sec % 60).padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    const cancelMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("payments")
                .update({ status: "cancelled" }) // Mengubah status menjadi cancelled
                .eq("midtrans_order_id", orderId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.info("Payment cancelled");
            navigate(-1); // Kembali ke halaman sebelumnya setelah status terupdate
            // Atau bisa navigate ke halaman spesifik: navigate("/dashboard");
        },
        onError: (error) => {
            toast.error("Failed to cancel payment: " + error.message);
        },
    });

    const handleCheckStatus = async () => {
        setIsCheckingStatus(true);
        try {
            await refetch();
            toast.success("Payment status updated");
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const getPaymentIcon = (method) => {
        switch (method) {
            case "bank_transfer":
                return Building2;
            case "va":
                return Building2;
            case "gopay":
                return Smartphone;
            case "credit_card":
                return CreditCard;
            default:
                return CreditCard;
        }
    };

    const getPaymentMethodName = (method) => {
        switch (method) {
            case "va":
                return "Bank Transfer (VA)";
            case "bank_transfer":
                return "Bank Transfer";
            case "gopay":
                return "GoPay";
            case "credit_card":
                return "Credit/Debit Card";
            default:
                return method;
        }
    };

    if (isLoading) return <div className="container mt-20">Loading...</div>;
    if (!payment)
        return <div className="container mt-20">Payment not found</div>;

    const lesson = payment.lessons;
    const method = payment.payment_method;
    const bankType = payment.payment_code || "other";
    const bankLabel = bankType.toUpperCase();

    const instructions =
        paymentInstructions[language][bankType] ||
        paymentInstructions[language].otherBanks;

    return (
        <div className="container mt-20 mx-auto px-4 py-8 max-w-4xl">
            <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-6"
            >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {payment.status === "pending" ? (
                                        <>
                                            <AlertCircle className="h-5 w-5 text-yellow-500" />{" "}
                                            Pending
                                        </>
                                    ) : payment.status === "paid" ? (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />{" "}
                                            Paid
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-5 w-5 text-red-500" />{" "}
                                            Failed
                                        </>
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className="flex items-center gap-1"
                                >
                                    {(() => {
                                        const Icon = getPaymentIcon(method);
                                        return <Icon className="h-3 w-3" />;
                                    })()}
                                    {getPaymentMethodName(method)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {payment.status === "pending" && (
                                <>
                                    <div className="p-4 bg-yellow-50 rounded-lg">
                                        <p className="text-sm font-medium">
                                            Complete your payment within:
                                        </p>
                                        <div className="flex items-center gap-2 text-2xl font-bold text-[#0A2A66]">
                                            <Clock className="h-6 w-6" />
                                            {formatTime(timeLeft)}
                                        </div>
                                    </div>

                                    {/* Mandiri Bill Payment */}
                                    {payment.payment_code === "mandiri" &&
                                        payment.biller_code &&
                                        payment.bill_key && (
                                            <div className="space-y-5">
                                                <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-medium text-[#875D00]">
                                                            Company Code
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    payment.biller_code
                                                                )
                                                            }
                                                        >
                                                            <Copy className="h-3 w-3 mr-1" />{" "}
                                                            Copy
                                                        </Button>
                                                    </div>
                                                    <div className="font-mono text-lg font-bold text-[#0A2A66]">
                                                        {payment.biller_code}
                                                    </div>
                                                </div>

                                                <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-medium text-[#875D00]">
                                                            Bill Key
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    payment.bill_key
                                                                )
                                                            }
                                                        >
                                                            <Copy className="h-3 w-3 mr-1" />{" "}
                                                            Copy
                                                        </Button>
                                                    </div>
                                                    <div className="font-mono text-lg font-bold text-[#0A2A66]">
                                                        {payment.bill_key}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                    {/* Regular VA */}
                                    {payment.va_number &&
                                        payment.payment_code !== "mandiri" && (
                                            <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3">
                                                <div className="flex justify-between">
                                                    <span className="text-xs font-medium text-[#875D00]">
                                                        Virtual Account
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                payment.va_number
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3 mr-1" />{" "}
                                                        Copy
                                                    </Button>
                                                </div>
                                                <div className="font-mono text-lg font-bold text-[#0A2A66]">
                                                    {payment.va_number}
                                                </div>
                                            </div>
                                        )}

                                    {/* GoPay */}
                                    {payment.qr_code_url && (
                                        <div className="bg-[#F9B233]/20 border rounded-xl p-4 flex flex-col items-center gap-3">
                                            <span className="text-xs font-medium text-[#875D00]">
                                                Scan QR with GoPay
                                            </span>
                                            <img
                                                src={payment.qr_code_url}
                                                className="w-40 h-40"
                                            />
                                            {payment.deeplink_url && (
                                                <Button
                                                    className="w-full bg-[#0A2A66] text-white"
                                                    onClick={() =>
                                                        window.open(
                                                            payment.deeplink_url
                                                        )
                                                    }
                                                >
                                                    <Smartphone className="mr-2 h-4 w-4" />{" "}
                                                    Open GoPay
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {/* Amount */}
                                    <div className="flex justify-between pt-2">
                                        <span className="text-sm text-muted-foreground">
                                            Amount
                                        </span>
                                        <span className="text-lg font-bold">
                                            Rp{" "}
                                            {payment.amount.toLocaleString(
                                                "id-ID"
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1"
                                            onClick={handleCheckStatus}
                                            disabled={isCheckingStatus}
                                        >
                                            {isCheckingStatus ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                "Check Payment Status"
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() =>
                                                cancelMutation.mutate()
                                            } // Panggil mutation
                                            disabled={
                                                cancelMutation.isPending ||
                                                isCheckingStatus
                                            } // Disable saat loading
                                        >
                                            {cancelMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                                    Cancelling...
                                                </>
                                            ) : (
                                                "Cancel Payment"
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* HOW TO PAY */}
                            <Card className="border rounded-xl shadow-sm">
                                <CardHeader className="bg-[#F9FAFB] border-b p-5">
                                    <CardTitle className="text-[#0A2A66] font-semibold text-lg">
                                        How to Pay ({bankLabel})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <PaymentInstructionsAccordion
                                        instructions={{
                                            sections:
                                                Object.values(instructions),
                                        }}
                                    />
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT SUMMARY */}
                <div>
                    <Card className="p-6 bg-[#0A2A66] text-white rounded-2xl shadow-lg sticky top-24">
                        <h3 className="font-semibold mb-4">Lesson Summary</h3>
                        {lesson?.cover_image_url && (
                            <img
                                src={lesson.cover_image_url}
                                className="w-full rounded-lg mb-3"
                            />
                        )}
                        <h4 className="font-semibold">{lesson?.title}</h4>
                        <p className="text-sm text-gray-300 mb-4">
                            by {lesson?.profiles?.display_name}
                        </p>

                        <div className="flex justify-between border-t pt-3 mt-3">
                            <span>Total</span>
                            <span className="font-bold">
                                Rp {payment.amount.toLocaleString("id-ID")}
                            </span>
                        </div>

                        <Button
                            className="w-full bg-[#2E67F8] mt-4"
                            onClick={handleCheckStatus}
                            disabled={isCheckingStatus}
                        >
                            {isCheckingStatus ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                "Check Payment Status"
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full mt-2 bg-white text-[#0A2A66]"
                            onClick={() => navigate(-1)}
                        >
                            Back
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
