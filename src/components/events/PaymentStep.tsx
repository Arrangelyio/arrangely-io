import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Smartphone, Building2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface PaymentStepProps {
  event: any;
  selectedTickets: any[];
  personalInfo: any[];
  onBack: () => void;
  onClose: () => void;
}

export function PaymentStep({
  event,
  selectedTickets,
  personalInfo,
  onBack,
  onClose,
}: PaymentStepProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("gopay");
  const [selectedBank, setSelectedBank] = useState("bni");
  const [useCoreApi, setUseCoreApi] = useState(true);
  const [eventFees, setEventFees] = useState<{
    adminFee: number;
    adminFeeEnabled: boolean;
    adminFeePaidByCustomer: boolean;
    platformFee: number;
    platformFeeEnabled: boolean;
    platformFeePaidByCustomer: boolean;
    vatTaxPercentage: number;
    vatTaxEnabled: boolean;
    vatTaxPaidByCustomer: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchEventFees = async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "admin_fee_amount, admin_fee_enabled, admin_fee_paid_by_customer, platform_fee_amount, platform_fee_enabled, platform_fee_paid_by_customer, vat_tax_percentage, vat_tax_enabled, vat_tax_paid_by_customer, use_core_api"
        )
        .eq("id", event.id)
        .single();

      if (error) {
        console.error("Failed to fetch event fees:", error);
        // Use default fees if fetching fails
        setEventFees({
          adminFee: 10,
          adminFeeEnabled: true,
          adminFeePaidByCustomer: true,
          platformFee: 3000,
          platformFeeEnabled: true,
          platformFeePaidByCustomer: true,
          vatTaxPercentage: 11,
          vatTaxEnabled: true,
          vatTaxPaidByCustomer: true,
        });
      } else if (data) {
        setUseCoreApi(data.use_core_api ?? true);
        setEventFees({
          adminFee: data.admin_fee_amount || 0,
          adminFeeEnabled: data.admin_fee_enabled ?? true,
          adminFeePaidByCustomer: data.admin_fee_paid_by_customer ?? true,
          platformFee: data.platform_fee_amount || 0,
          platformFeeEnabled: data.platform_fee_enabled ?? true,
          platformFeePaidByCustomer: data.platform_fee_paid_by_customer ?? true,
          vatTaxPercentage: data.vat_tax_percentage || 0,
          vatTaxEnabled: data.vat_tax_enabled ?? true,
          vatTaxPaidByCustomer: data.vat_tax_paid_by_customer ?? true,
        });
      }
    };

    fetchEventFees();
  }, [event.id]);

  const paymentMethods = [
    {
      id: "gopay",
      name: "QRIS",
      description:
        language === "id"
          ? "Scan kode QR dengan aplikasi e-wallet"
          : "Scan QR code with e-wallet app",
      icon: Smartphone,
      recommended: true,
    },
    {
      id: "bank_transfer",
      name:
        language === "id"
          ? "Bank Transfer (Virtual Account)"
          : "Bank Transfer (Virtual Account)",
      description:
        language === "id"
          ? "Transfer melalui Virtual Account"
          : "Transfer via Virtual Account",
      icon: Building2,
    },
    {
      id: "credit_card",
      name: language === "id" ? "Kartu Kredit/Debit" : "Credit/Debit Card",
      description: "Visa, Mastercard, JCB",
      icon: CreditCard,
    },
  ];

  const bankOptions = [
    { id: "bni", name: "BNI" },
    { id: "bri", name: "BRI" },
    { id: "mandiri", name: "Mandiri" },
    { id: "permata", name: "Permata Bank" },
    { id: "cimb", name: "CIMB Niaga" },
    { id: "other", name: language === "id" ? "Bank Lainnya" : "Other Banks" },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTotalAmount = () => {
    return selectedTickets.reduce(
      (sum, ticket) => sum + ticket.category.price * ticket.quantity,
      0
    );
  };

  const getAdminFee = () => {
    if (
      !eventFees ||
      !eventFees.adminFeeEnabled ||
      !eventFees.adminFeePaidByCustomer
    ) {
      return 0;
    }
    // Calculate admin fee as percentage of ticket subtotal
    const ticketSubtotal = getTotalAmount();
    return Math.round((ticketSubtotal * eventFees.adminFee) / 100);
  };

  const getPlatformFee = () => {
    if (
      !eventFees ||
      !eventFees.platformFeeEnabled ||
      !eventFees.platformFeePaidByCustomer
    ) {
      return 0;
    }
    return eventFees.platformFee;
  };

  const getVatTax = () => {
    if (
      !eventFees ||
      !eventFees.vatTaxEnabled ||
      !eventFees.vatTaxPaidByCustomer
    ) {
      return 0;
    }
    const subtotal = getTotalAmount() + getAdminFee() + getPlatformFee();
    return Math.round((subtotal * eventFees.vatTaxPercentage) / 100);
  };

  const getGrandTotal = () => {
    return getTotalAmount() + getAdminFee() + getPlatformFee() + getVatTax();
  };

  // Check if event is free
  const isFreeEvent = getTotalAmount() === 0;

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Handle free event registration
      if (isFreeEvent) {
        const totalTicketsCount = selectedTickets.reduce(
          (sum, t) => sum + t.quantity,
          0
        );
        if (!personalInfo || personalInfo.length !== totalTicketsCount) {
          throw new Error(
            language === "id"
              ? "Data peserta tidak lengkap. Silakan kembali dan lengkapi informasi."
              : "Participant data is incomplete. Please go back and complete the information."
          );
        }

        const tickets = [];
        let ticketIndex = 0;
        for (const selectedTicket of selectedTickets) {
          for (let i = 0; i < selectedTicket.quantity; i++) {
            const personalData = personalInfo[ticketIndex];

            if (
              !personalData ||
              !personalData.participant_name ||
              !personalData.participant_email ||
              !personalData.participant_phone
            ) {
              throw new Error(
                language === "id"
                  ? `Data tiket ${
                      ticketIndex + 1
                    } tidak lengkap. Silakan kembali dan lengkapi semua informasi.`
                  : `Ticket ${
                      ticketIndex + 1
                    } data is incomplete. Please go back and complete all information.`
              );
            }

            tickets.push({
              ticket_category_id: selectedTicket.categoryId,
              participant_name: personalData.participant_name,
              participant_email: personalData.participant_email,
              participant_phone: personalData.participant_phone,
              participant_ktp: personalData.participant_ktp || null,
            });
            ticketIndex++;
          }
        }

        // Register for free event
        const { data, error } = await supabase.functions.invoke(
          "register-free-event",
          {
            body: {
              eventId: event.id,
              tickets,
            },
          }
        );

        if (error) throw error;

        toast({
          title:
            language === "id"
              ? "Pendaftaran Berhasil"
              : "Registration Successful",
          description:
            language === "id"
              ? "Tiket gratis Anda telah berhasil didaftarkan. Silakan cek email Anda."
              : "Your free ticket has been successfully registered. Please check your email.",
        });

        onClose();
        window.location.href = `/events?tab=tickets`;
        return;
      }
      // Validate personal info array length
      const totalTicketsCount = selectedTickets.reduce(
        (sum, t) => sum + t.quantity,
        0
      );
      if (!personalInfo || personalInfo.length !== totalTicketsCount) {
        throw new Error(
          language === "id"
            ? "Data peserta tidak lengkap. Silakan kembali dan lengkapi informasi."
            : "Participant data is incomplete. Please go back and complete the information."
        );
      }

      // Prepare tickets data
      const tickets = [];
      let ticketIndex = 0;
      for (const selectedTicket of selectedTickets) {
        for (let i = 0; i < selectedTicket.quantity; i++) {
          const personalData = personalInfo[ticketIndex];

          // Validate that personal data exists and has required fields
          if (
            !personalData ||
            !personalData.participant_name ||
            !personalData.participant_email ||
            !personalData.participant_phone
          ) {
            throw new Error(
              language === "id"
                ? `Data tiket ${
                    ticketIndex + 1
                  } tidak lengkap. Silakan kembali dan lengkapi semua informasi.`
                : `Ticket ${
                    ticketIndex + 1
                  } data is incomplete. Please go back and complete all information.`
            );
          }

          tickets.push({
            ticket_category_id: selectedTicket.categoryId,
            participant_name: personalData.participant_name,
            participant_email: personalData.participant_email,
            participant_phone: personalData.participant_phone,
            participant_ktp: personalData.participant_ktp || null,
          });
          ticketIndex++;
        }
      }

      // Call the edge function to create payment
      const { data, error } = await supabase.functions.invoke(
        "create-midtrans-payment",
        {
          body: {
            event_id: event.id,
            tickets,
            paymentMethod: selectedPaymentMethod,
            paymentChannel:
              selectedPaymentMethod === "bank_transfer"
                ? "va"
                : selectedPaymentMethod,
            selectedBank:
              selectedPaymentMethod === "bank_transfer"
                ? selectedBank
                : undefined,
          },
        }
      );

      if (error) {
        // Check if it's a duplicate payment error
        if (error.message?.includes("ACTIVE_TRANSACTION_EXISTS")) {
          const errorData =
            typeof error.context === "object" ? error.context : {};
          const paymentId = errorData.paymentId || data?.paymentId;

          toast({
            title:
              language === "id"
                ? "Transaksi Aktif Ditemukan"
                : "Active Transaction Found",
            description:
              language === "id"
                ? "Anda sudah memiliki transaksi aktif untuk event ini. Anda akan diarahkan ke halaman pembayaran."
                : "You already have an active transaction for this event. You'll be redirected to the payment page.",
          });

          // Close dialog and redirect to existing payment
          onClose();
          if (paymentId) {
            window.location.href = `/events/payment/${paymentId}`;
          }
          return;
        }
        throw error;
      }

      // If Snap URL is provided (Core API disabled), redirect directly to Midtrans Snap
      if (data.snapUrl) {
        onClose();
        window.location.href = data.snapUrl;
        return;
      }

      // Otherwise, redirect to payment waiting page (Core API enabled)
      onClose();
      window.location.href = `/events/payment/${data.payment_id}`;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title:
          language === "id"
            ? "Gagal membuat pembayaran"
            : "Failed to create payment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-[#0A2A66]">
      {/* Left side - Payment Method Selection, Secure Checkout, or Free Event Confirmation */}
      <div className="lg:col-span-2 space-y-6">
        {isFreeEvent ? (
          <Card className="p-8 bg-gradient-to-br from-blue-50 via-white to-blue-100 border border-blue-200 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="text-center space-y-5">
              {/* Icon area */}
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-md opacity-70"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-md">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-3xl font-extrabold text-[#0A2A66] mb-2 tracking-tight">
                  {language === "id" ? "Event Gratis" : "Free Event"}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {language === "id"
                    ? "Event ini gratis! Klik tombol di bawah untuk menyelesaikan pendaftaran."
                    : "This event is free! Click the button below to complete your registration."}
                </p>
              </div>

              {/* Info items */}
              <div className="pt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm rounded-full py-2 px-4 border border-blue-100 shadow-sm hover:shadow-md transition">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Tidak ada biaya"
                      : "No payment required"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm rounded-full py-2 px-4 border border-blue-100 shadow-sm hover:shadow-md transition">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Konfirmasi instan"
                      : "Instant confirmation"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm rounded-full py-2 px-4 border border-blue-100 shadow-sm hover:shadow-md transition">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Tiket dikirim ke email"
                      : "Ticket sent to email"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ) : useCoreApi ? (
          <>
            <div>
              <h3 className="text-2xl font-bold text-[#0A2A66] mb-2">
                {language === "id"
                  ? "Pilih Metode Pembayaran"
                  : "Select Payment Method"}
              </h3>
              <p className="text-gray-500">
                {language === "id"
                  ? "Pilih metode pembayaran pilihan Anda untuk melanjutkan"
                  : "Choose your preferred payment method to continue"}
              </p>
            </div>

            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={setSelectedPaymentMethod}
            >
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id}>
                    <Card
                      className={`p-5 border transition-all cursor-pointer rounded-2xl shadow-sm ${
                        selectedPaymentMethod === method.id
                          ? "border-[#2E67F8] bg-[#EFF6FF]"
                          : "border-gray-200 hover:bg-[#F9FAFB]"
                      }`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                            <method.icon
                              className={`w-6 h-6 ${
                                selectedPaymentMethod === method.id
                                  ? "text-[#2E67F8]"
                                  : "text-gray-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Label
                                htmlFor={method.id}
                                className="text-base font-semibold cursor-pointer text-[#0A2A66]"
                              >
                                {method.name}
                              </Label>
                              {method.recommended && (
                                <Badge
                                  variant="secondary"
                                  className="bg-[#2E67F8]/10 text-[#2E67F8] text-xs font-medium"
                                >
                                  {language === "id"
                                    ? "Rekomendasi"
                                    : "Recommended"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {method.description}
                            </p>
                          </div>
                        </div>
                        <RadioGroupItem value={method.id} id={method.id} />
                      </div>
                    </Card>

                    {/* Bank selection for Bank Transfer */}
                    {method.id === "bank_transfer" &&
                      selectedPaymentMethod === "bank_transfer" && (
                        <Card className="mt-3 p-4 bg-[#F9FAFB] border border-gray-200 rounded-xl">
                          <Label className="text-sm font-medium mb-3 block text-[#0A2A66]">
                            {language === "id" ? "Pilih Bank" : "Select Bank"}
                          </Label>
                          <RadioGroup
                            value={selectedBank}
                            onValueChange={setSelectedBank}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              {bankOptions.map((bank) => (
                                <Card
                                  key={bank.id}
                                  className={`p-3 cursor-pointer transition-all rounded-xl shadow-sm ${
                                    selectedBank === bank.id
                                      ? "border-[#2E67F8] bg-[#EFF6FF]"
                                      : "border-gray-200 hover:bg-[#F3F4F6]"
                                  }`}
                                  onClick={() => setSelectedBank(bank.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value={bank.id}
                                      id={bank.id}
                                      className="flex-shrink-0"
                                    />
                                    <Label
                                      htmlFor={bank.id}
                                      className="text-sm font-medium cursor-pointer text-[#0A2A66]"
                                    >
                                      {bank.name}
                                    </Label>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </RadioGroup>
                        </Card>
                      )}
                  </div>
                ))}
              </div>
            </RadioGroup>
          </>
        ) : (
          <Card className="p-8 bg-gradient-to-br from-[#EFF6FF] to-white border-[#2E67F8]/20 rounded-2xl shadow-lg">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#2E67F8]/10 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 text-[#2E67F8]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#0A2A66] mb-2">
                  {language === "id" ? "Pembayaran Aman" : "Secure Payment"}
                </h3>
                <p className="text-gray-600">
                  {language === "id"
                    ? "Anda akan diarahkan ke halaman pembayaran yang aman setelah melanjutkan"
                    : "You'll be redirected to a secure payment page after proceeding"}
                </p>
              </div>
              <div className="pt-4 space-y-2 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#2E67F8] rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Berbagai metode pembayaran tersedia"
                      : "Multiple payment methods available"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#2E67F8] rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Transaksi terenkripsi & aman"
                      : "Encrypted & secure transaction"}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#2E67F8] rounded-full"></div>
                  <span>
                    {language === "id"
                      ? "Pembayaran instan"
                      : "Instant payment confirmation"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Right side - Order Summary */}
      <div className="lg:col-span-1">
        <Card className="p-6 bg-[#0A2A66] text-white rounded-2xl shadow-lg sticky top-24">
          <h3 className="font-semibold mb-4 text-white">
            {language === "id" ? "Ringkasan Pesanan" : "Order Summary"}
          </h3>

          <div className="space-y-4 mb-6">
            <div>
              <h4 className="font-semibold mb-1 text-white">{event.title}</h4>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-600">
              {selectedTickets.map((ticket) => (
                <div
                  key={ticket.categoryId}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-300">
                    {ticket.category.name} x {ticket.quantity}
                  </span>
                  <span className="font-medium text-white">
                    {formatPrice(ticket.category.price * ticket.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm text-gray-300">
              <span>
                {language === "id" ? "Subtotal Tiket" : "Ticket Subtotal"}
              </span>
              <span className="text-white">
                {isFreeEvent ? (
                  <span className="text-green-400 font-bold">FREE</span>
                ) : (
                  formatPrice(getTotalAmount())
                )}
              </span>
            </div>

            {/* Admin Fee - Only show for paid events */}
            {!isFreeEvent &&
              eventFees?.adminFeeEnabled &&
              eventFees?.adminFeePaidByCustomer && (
                <div className="flex justify-between text-sm text-gray-300">
                  <span>{language === "id" ? "Biaya Admin" : "Admin Fee"}</span>
                  <span className="text-white">
                    {formatPrice(getAdminFee())}
                  </span>
                </div>
              )}

            {/* Platform Fee - Only show for paid events */}
            {!isFreeEvent &&
              eventFees?.platformFeeEnabled &&
              eventFees?.platformFeePaidByCustomer && (
                <div className="flex justify-between text-sm text-gray-300">
                  <span>
                    {language === "id" ? "Biaya Platform" : "Platform Fee"}
                  </span>
                  <span className="text-white">
                    {formatPrice(getPlatformFee())}
                  </span>
                </div>
              )}

            {/* VAT Tax - Only show for paid events */}
            {!isFreeEvent &&
              eventFees?.vatTaxEnabled &&
              eventFees?.vatTaxPaidByCustomer && (
                <div className="flex justify-between text-sm text-gray-300">
                  <span>
                    {language === "id"
                      ? `PPN (${eventFees.vatTaxPercentage}%)`
                      : `VAT (${eventFees.vatTaxPercentage}%)`}
                  </span>
                  <span className="text-white">{formatPrice(getVatTax())}</span>
                </div>
              )}

            <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-600">
              <span>Total</span>
              <span>
                {isFreeEvent ? (
                  <span className="text-green-400">FREE</span>
                ) : (
                  formatPrice(getGrandTotal())
                )}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handlePayment}
              className={`w-full font-semibold rounded-lg ${"bg-[#2E67F8] hover:bg-[#1E50D8]"} text-white`}
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "id" ? "Memproses..." : "Processing..."}
                </>
              ) : isFreeEvent ? (
                <>
                  {language === "id"
                    ? "Selesaikan Pendaftaran"
                    : "Complete Registration"}
                </>
              ) : (
                <>
                  {language === "id"
                    ? "Lanjutkan ke Pembayaran"
                    : "Continue to Payment"}
                </>
              )}
            </Button>

            <Button
              onClick={onBack}
              variant="outline"
              className="w-full border-gray-300 text-[#0A2A66] hover:bg-gray-100 font-semibold rounded-lg"
            >
              {language === "id"
                ? t("eventRegistration.back")
                : t("eventRegistration.back")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
