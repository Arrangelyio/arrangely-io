import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  paymentInstructions,
  detectBankFromVA,
} from "@/data/paymentInstructions";
import { PaymentInstructionsAccordion } from "@/components/payment/PaymentInstructionsAccordion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EventPaymentWaiting() {
  const { t } = useLanguage();
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [eventFees, setEventFees] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [language] = useState<"en" | "id">("id"); // Default to Indonesian

  // const copyToClipboard = (text: string) => {
  //   navigator.clipboard.writeText(text);
  //   toast.success("Copied to clipboard!");
  // };
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  useEffect(() => {
    if (paymentId) setActivePaymentId(paymentId.trim());
  }, [paymentId]);

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["event-payment", activePaymentId],
    enabled: !!activePaymentId, // hanya jalan kalau paymentId sudah siap
    refetchOnWindowFocus: false,
    refetchInterval: false,
    queryFn: async () => {
      
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          biller_code,
          bill_key,
          event:events(
            id,
            title,
            slug,
            banner_image_url,
            start_time,
            use_core_api,
            admin_fee_amount,
            admin_fee_enabled,
            admin_fee_paid_by_customer,
            platform_fee_amount,
            platform_fee_enabled,
            platform_fee_paid_by_customer,
            vat_tax_percentage,
            vat_tax_enabled,
            vat_tax_paid_by_customer
          )
        `
        )
        .eq("id", activePaymentId)
        .eq("payment_type", "event")
        .maybeSingle();

      
      

      if (error) throw error;
      return data;
    },
  });

  // Kalkulasi rincian biaya (dihitung mundur)
  useEffect(() => {
    if (!payment?.event) return;

    const feesData = {
      adminFee: payment.event.admin_fee_amount || 0,
      adminFeeEnabled: payment.event.admin_fee_enabled ?? true,
      adminFeePaidByCustomer: payment.event.admin_fee_paid_by_customer ?? true,
      platformFee: payment.event.platform_fee_amount || 0,
      platformFeeEnabled: payment.event.platform_fee_enabled ?? true,
      platformFeePaidByCustomer:
        payment.event.platform_fee_paid_by_customer ?? true,
      vatTaxPercentage: payment.event.vat_tax_percentage || 0,
      vatTaxEnabled: payment.event.vat_tax_enabled ?? true,
      vatTaxPaidByCustomer: payment.event.vat_tax_paid_by_customer ?? true,
    };
    setEventFees(feesData);

    const grandTotal = payment.amount;

    const pf =
      feesData.platformFeeEnabled && feesData.platformFeePaidByCustomer
        ? feesData.platformFee
        : 0;
    const ap =
      feesData.adminFeeEnabled && feesData.adminFeePaidByCustomer
        ? feesData.adminFee / 100
        : 0;
    const vp =
      feesData.vatTaxEnabled && feesData.vatTaxPaidByCustomer
        ? feesData.vatTaxPercentage / 100
        : 0;

    // Aljabar: S = ((GT / (1 + VP)) - PF) / (1 + AP)
    let subtotal = 0;
    if (1 + ap > 0) {
      subtotal = (grandTotal / (1 + vp) - pf) / (1 + ap);
    }

    const adminFee = subtotal * ap;
    const platformFee = pf;
    const vatTax = (subtotal + adminFee + platformFee) * vp;

    setBreakdown({
      subtotal: subtotal,
      adminFee: adminFee,
      platformFee: platformFee,
      vatTax: vatTax,
    });
  }, [payment]);

  useEffect(() => {
    if (!payment?.expires_at) return;

    const timer = setInterval(() => {
      const expires = new Date(payment.expires_at);
      const now = new Date();
      const diff = Math.floor((expires.getTime() - now.getTime()) / 1000);
      const remaining = Math.max(diff, 0);
      setTimeLeft(remaining);

      if (remaining === 0 && payment.status === "pending") {
        refetch();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [payment, refetch]);

  useEffect(() => {
    if (!payment) return;

    if (payment.status === "paid" || payment.status === "settlement") {
      toast.success(
        "Payment successful! Tickets have been sent to your email."
      );
      setTimeout(() => {
        navigate(`/events?tab=tickets`);
      }, 1500);
    } else if (payment.status === "expired" || payment.status === "cancelled") {
      toast.error(
        `Payment ${payment.status}. Please create a new transaction.`
      );
      setTimeout(() => {
        navigate(`/events`);
      }, 2000);
    }
  }, [payment, navigate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await refetch();
      toast.success("Payment status updated");
    } catch {
      toast.error("Failed to check payment status");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!payment) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this payment?"
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: "cancelled" })
        .eq("id", payment.id)
        .eq("payment_type", "event");

      if (error) throw error;

      toast.success("Payment cancelled");
      navigate(`/events`);
    } catch (error) {
      toast.error("Failed to cancel payment");
    }
  };

  const handleOpenSnapCheckout = () => {
    const snapAction = payment.actions?.find((a: any) => a.name === "redirect");
    if (snapAction?.url) {
      window.open(snapAction.url, "_blank");
    } else {
      toast.error("Snap checkout URL not available");
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return Building2;
      case "gopay":
        return Smartphone;
      case "credit_card":
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getPaymentMethodName = (method: string, useCoreApi?: boolean) => {
    if (!useCoreApi) return "Midtrans Snap Checkout";
    switch (method) {
      case "bank_transfer":
        return "Bank Transfer (Virtual Account)";
      case "gopay":
        return "GoPay";
      case "credit_card":
        return "Credit/Debit Card";
      default:
        return method;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleCopyToClipboard = (text: string) => {
    if (!text) return;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        // Tampilkan notifikasi toast dari Sonner
        toast.success("Virtual Account number copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        toast.error("Failed to copy. Please copy manually.");
      });
  };

  if (isLoading)
    return (
      <div className="container mt-20 text-center">
        Loading payment details...
      </div>
    );

  if (!payment) {
    return (
      <div className="container mt-20 text-center">
        <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
        <p>Payment not found</p>
        <Button
          onClick={() => navigate(`/events`)} // <-- UBAH INI
          variant="outline"
          className="w-full border-gray-300 text-[#0A2A66] hover:bg-gray-100 font-semibold rounded-lg"
        >
          Back to Event
        </Button>
      </div>
    );
  }

  const event = payment.event;

  return (
    <div className="container mt-20 mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate(`/events?tab=transactions`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Event
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {payment.status === "paid" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Payment Successful
                    </>
                  ) : payment.status === "pending" ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      {/* Payment Pending */}
                      {t("paymentPending.title")}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Payment Failed
                    </>
                  )}
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {getPaymentMethodName(
                    payment.payment_method,
                    event?.use_core_api
                  )}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* {payment.status === "pending" && ( */}
              <>
                <div className="p-4 bg-yellow-50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">
                    {/* Complete your payment within: */}
                    {t("paymentPending.title2")}
                  </p>
                  <div className="flex items-center gap-2 text-2xl font-bold text-[#0A2A66]">
                    <Clock className="h-6 w-6" />
                    {formatTime(timeLeft)}
                  </div>
                </div>

                {event && !event.use_core_api ? (
                  <>
                    <div className="pt-4">
                      <Button
                        onClick={handleOpenSnapCheckout}
                        className="w-full h-12 bg-[#0A2A66] hover:bg-[#0A3A69] text-white font-semibold rounded-xl"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Continue to Midtrans Snap
                      </Button>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        You’ll be redirected to Midtrans Snap Checkout for
                        payment.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Mandiri Bill Payment - Company Code and Virtual Account */}
                    {payment.payment_code === "mandiri" &&
                      payment.biller_code &&
                      payment.bill_key && (
                        <div className="space-y-5">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {language === "id"
                              ? "Selesaikan pembayaran dari Mandiri ke nomor virtual account di bawah ini."
                              : "Complete your Mandiri payment using the virtual account details below."}
                          </p>

                          {/* Company Code */}
                          <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[#875D00] tracking-wide">
                                {language === "id"
                                  ? "Kode Perusahaan"
                                  : "Company Code"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyToClipboard(payment.biller_code)
                                }
                                className="h-7 px-2 hover:bg-[#F9B233]/10 text-[#875D00] text-xs"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                {language === "id" ? "Salin" : "Copy"}
                              </Button>
                            </div>
                            <div className="font-mono text-lg font-bold text-[#0A2A66] tracking-wider">
                              {payment.biller_code}
                            </div>
                          </div>

                          {/* Virtual Account Number */}
                          <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[#875D00] tracking-wide">
                                {language === "id"
                                  ? "Nomor Virtual Account"
                                  : "Virtual Account Number"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyToClipboard(payment.bill_key)
                                }
                                className="h-7 px-2 hover:bg-[#F9B233]/10 text-[#875D00] text-xs"
                              >
                                <Copy className="h-3.5 w-3.5 mr-1" />
                                {language === "id" ? "Salin" : "Copy"}
                              </Button>
                            </div>
                            <div className="font-mono text-lg font-bold text-[#0A2A66] tracking-wider">
                              {payment.bill_key}
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Regular VA Number for other banks */}
                    {payment.va_number &&
                      payment.payment_code !== "mandiri" && (
                        <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#875D00] tracking-wide">
                              {language === "id"
                                ? "Nomor Virtual Account"
                                : "Virtual Account Number"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopyToClipboard(payment.va_number)
                              }
                              className="h-7 px-2 hover:bg-[#F9B233]/10 text-[#875D00] text-xs"
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              {language === "id" ? "Salin" : "Copy"}
                            </Button>
                          </div>
                          <div className="font-mono text-lg font-bold text-[#0A2A66] tracking-wider">
                            {payment.va_number}
                          </div>
                        </div>
                      )}

                    {payment.qr_code_url && (
                      <div className="bg-[#F9B233]/20 border border-[#F9B233]/40 rounded-xl p-4 flex flex-col items-center gap-3 shadow-sm">
                        <span className="text-xs font-medium text-[#875D00]">
                          {language === "id"
                            ? "Scan kode QR di bawah dengan aplikasi GoPay"
                            : "Scan QR Code below using GoPay App"}
                        </span>
                        <img
                          src={payment.qr_code_url}
                          alt="GoPay QR Code"
                          className="w-40 h-40 rounded-lg border border-[#F9B233]/40"
                        />
                        {payment.deeplink_url && (
                          <Button
                            onClick={() =>
                              window.open(payment.deeplink_url, "_blank")
                            }
                            className="w-full bg-[#0A2A66] hover:bg-[#1E50D8] text-white font-semibold rounded-lg"
                          >
                            <Smartphone className="mr-2 h-4 w-4" />
                            {language === "id"
                              ? "Buka di Aplikasi GoPay"
                              : "Open in GoPay App"}
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center pt-4">
                  <span className="text-sm text-muted-foreground">
                    {/* Amount */}
                    {t("paymentPending.amount")}
                  </span>
                  <span className="text-lg font-bold">
                    Rp {payment.amount.toLocaleString("id-ID")}
                  </span>
                </div>

                {event.use_core_api && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleCheckStatus}
                      disabled={isCheckingStatus}
                    >
                      {isCheckingStatus ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {/* Check Payment Status */}
                          {t("paymentPending.check")}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCancelPayment}>
                      {/* Cancel */}
                      {t("paymentPending.cancel")}
                    </Button>
                  </div>
                )}
              </>
              {/* )} */}
            </CardContent>
          </Card>

          {/* How to Pay section — dynamic */}
          {/* {payment.status === "pending" && ( */}
          <>
            {!event.use_core_api ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "id"
                      ? "Cara Pembayaran dengan Midtrans Snap"
                      : "How to Pay with Midtrans Snap"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm">
                    {language === "id" ? (
                      <>
                        <li>1. Klik "Lanjut ke Midtrans Snap".</li>
                        <li>
                          2. Anda akan diarahkan ke halaman pembayaran aman
                          Midtrans.
                        </li>
                        <li>
                          3. Pilih metode pembayaran yang Anda inginkan (VA,
                          QRIS, GoPay, dll).
                        </li>
                        <li>
                          4. Selesaikan pembayaran dalam batas waktu yang
                          ditentukan.
                        </li>
                        <li>
                          5. Setelah pembayaran berhasil, tiket akan dikirim
                          secara otomatis.
                        </li>
                      </>
                    ) : (
                      <>
                        <li>1. Click "Continue to Midtrans Snap".</li>
                        <li>
                          2. You will be redirected to Midtrans secure payment
                          page.
                        </li>
                        <li>
                          3. Choose your preferred payment method (VA, QRIS,
                          GoPay, etc).
                        </li>
                        <li>4. Complete the payment within the time limit.</li>
                        <li>
                          5. Once payment is successful, your tickets will be
                          sent automatically.
                        </li>
                      </>
                    )}
                  </ol>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* HOW TO PAY SECTION */}
                {(() => {
                  const method = payment.payment_method;
                  const bankType = payment.payment_code || "bni";
                  const bankLabel = bankType.toUpperCase();

                  const instructions =
                    bankType !== "unknown" &&
                    paymentInstructions[language][bankType]
                      ? paymentInstructions[language][bankType]
                      : paymentInstructions[language].otherBanks;

                  // === 1️⃣ BANK TRANSFER & ECHANNEL ===
                  if (method === "bank_transfer" || method === "echannel") {
                    return (
                      <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-[#F9FAFB] border-b border-gray-200 p-5">
                          <CardTitle className="text-[#0A2A66] font-semibold text-lg flex items-center gap-2">
                            {language === "id"
                              ? `Cara Pembayaran VA ${bankLabel}`
                              : `How to Pay via Bank Transfer (${bankLabel})`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                          <div className="rounded-xl border border-gray-100 bg-[#FAFAFB] px-3 py-4 space-y-3 overflow-visible">
                            <PaymentInstructionsAccordion
                              instructions={{
                                sections: Object.values(instructions || {}),
                              }}
                              className="w-full"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  // === 2️⃣ GOPAY ===
                  if (method === "gopay") {
                    return (
                      <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-[#F9FAFB] border-b border-gray-200 p-5">
                          <CardTitle className="text-[#0A2A66] font-semibold text-lg flex items-center gap-2">
                            💳 {paymentInstructions[language].gopay.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                          <ol className="space-y-3 text-sm text-gray-700 leading-relaxed">
                            {paymentInstructions[language].gopay.steps.map(
                              (step, index) => (
                                <li
                                  key={index}
                                  className="p-3 rounded-lg bg-[#F9FAFB] hover:bg-[#F2F6FF] border border-gray-100 transition"
                                >
                                  <span className="font-semibold text-[#0A2A66] mr-2">
                                    {index + 1}.
                                  </span>
                                  {step}
                                </li>
                              )
                            )}
                          </ol>
                        </CardContent>
                      </Card>
                    );
                  }

                  // === 3️⃣ QRIS ===
                  if (method === "qris") {
                    return (
                      <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-[#F9FAFB] border-b border-gray-200 p-5">
                          <CardTitle className="text-[#0A2A66] font-semibold text-lg flex items-center gap-2">
                            📱 {paymentInstructions[language].qris.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                          <ol className="space-y-3 text-sm text-gray-700 leading-relaxed">
                            {paymentInstructions[language].qris.steps.map(
                              (step, index) => (
                                <li
                                  key={index}
                                  className="p-3 rounded-lg bg-[#F9FAFB] hover:bg-[#F2F6FF] border border-gray-100 transition"
                                >
                                  <span className="font-semibold text-[#0A2A66] mr-2">
                                    {index + 1}.
                                  </span>
                                  {step}
                                </li>
                              )
                            )}
                          </ol>
                        </CardContent>
                      </Card>
                    );
                  }

                  // === 4️⃣ CREDIT CARD ===
                  if (method === "credit_card") {
                    return (
                      <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <CardHeader className="bg-[#F9FAFB] border-b border-gray-200 p-5">
                          <CardTitle className="text-[#0A2A66] font-semibold text-lg flex items-center gap-2">
                            💳 {paymentInstructions[language].creditCard.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                          <ol className="space-y-3 text-sm text-gray-700 leading-relaxed">
                            {paymentInstructions[language].creditCard.steps.map(
                              (step, index) => (
                                <li
                                  key={index}
                                  className="p-3 rounded-lg bg-[#F9FAFB] hover:bg-[#F2F6FF] border border-gray-100 transition"
                                >
                                  <span className="font-semibold text-[#0A2A66] mr-2">
                                    {index + 1}.
                                  </span>
                                  {step}
                                </li>
                              )
                            )}
                          </ol>
                        </CardContent>
                      </Card>
                    );
                  }

                  // === 5️⃣ DEFAULT (OTHER BANKS) ===
                  return (
                    <Card className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <CardHeader className="bg-[#F9FAFB] border-b border-gray-200 p-5">
                        <CardTitle className="text-[#0A2A66] font-semibold text-lg flex items-center gap-2">
                          🏦{" "}
                          {language === "id"
                            ? "Cara Pembayaran Bank Lain"
                            : "How to Pay via Other Banks"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 bg-white">
                        <PaymentInstructionsAccordion
                          instructions={
                            paymentInstructions[language].otherBanks
                          }
                        />
                      </CardContent>
                    </Card>
                  );
                })()}
              </>
            )}
          </>
          {/* )} */}
        </div>

        {/* Right: Event Details */}
        {/* <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event?.banner_image_url && (
                <img
                  src={event.banner_image_url}
                  alt={event.title}
                  className="w-full aspect-video object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-semibold">{event?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.start_time).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div> */}
        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-[#0A2A66] text-white rounded-2xl shadow-lg sticky top-24">
            <h3 className="font-semibold mb-4 text-white">Order Summary</h3>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="font-semibold mb-1 text-white">
                  {event?.title}
                </h4>
              </div>

              {/* Rincian Biaya */}
              <div className="space-y-2 pt-2 border-t border-gray-600">
                {breakdown ? (
                  <>
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Ticket Subtotal</span>
                      <span className="text-white">
                        {formatPrice(breakdown.subtotal)}
                      </span>
                    </div>

                    {/* Admin Fee */}
                    {eventFees?.adminFeeEnabled &&
                      eventFees?.adminFeePaidByCustomer && (
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>Admin Fee</span>
                          <span className="text-white">
                            {formatPrice(breakdown.adminFee)}
                          </span>
                        </div>
                      )}

                    {/* Platform Fee */}
                    {eventFees?.platformFeeEnabled &&
                      eventFees?.platformFeePaidByCustomer && (
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>Platform Fee</span>
                          <span className="text-white">
                            {formatPrice(breakdown.platformFee)}
                          </span>
                        </div>
                      )}

                    {/* VAT Tax */}
                    {eventFees?.vatTaxEnabled &&
                      eventFees?.vatTaxPaidByCustomer && (
                        <div className="flex justify-between text-sm text-gray-300">
                          <span>VAT ({eventFees.vatTaxPercentage}%)</span>
                          <span className="text-white">
                            {formatPrice(breakdown.vatTax)}
                          </span>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>
                      {payment.ticket_count || 1}x Ticket
                      {payment.ticket_count > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Keseluruhan */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-600">
                <span>Total</span>
                <span>{formatPrice(payment.amount)}</span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="space-y-3">
              <Button
                onClick={handleCheckStatus}
                className="w-full bg-[#2E67F8] hover:bg-[#1E50D8] text-white font-semibold rounded-lg"
                size="lg"
                disabled={isCheckingStatus || payment.status !== "pending"}
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  // "Check Payment Status"
                  t("paymentPending.check")
                )}
              </Button>

              <Button
                onClick={() => navigate(`/events?tab=transactions`)}
                variant="outline"
                className="w-full border-gray-300 text-[#0A2A66] hover:bg-gray-100 font-semibold rounded-lg"
              >
                {t("paymentPending.back")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
