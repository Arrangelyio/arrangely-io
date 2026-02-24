import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Minus, Plus, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface TicketTypeSelectionProps {
  event: any;
  ticketTypes: any[];
  selectedTickets: any[];
  onTicketsChange: (tickets: any[]) => void;
  onNext: () => void;
}

export function TicketTypeSelection({
  event,
  ticketTypes,
  selectedTickets,
  onTicketsChange,
  onNext,
}: TicketTypeSelectionProps) {
  const { language } = useLanguage();
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {}
  );
  const [userPurchaseHistory, setUserPurchaseHistory] = useState<
    Record<string, number>
  >({});
  const [eventPurchaseTotal, setEventPurchaseTotal] = useState<number>(0);
  const isMobileView = useIsMobile();

  useEffect(() => {
    // Buka semua ticket type otomatis
    if (ticketTypes?.length > 0) {
      const allOpen: Record<string, boolean> = {};
      ticketTypes.forEach((type) => {
        allOpen[type.id] = true;
      });
      setExpandedTypes(allOpen);
    }
  }, [ticketTypes]);

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const categoryIds = ticketTypes.flatMap(
          (type) =>
            type.event_ticket_categories?.map((cat: any) => cat.id) || []
        );

        const { data: history, error } = await supabase
          .from("event_quota_transaction_history")
          .select("ticket_category_id, ticket_count, payment_id")
          .in("ticket_category_id", categoryIds)
          .eq("transaction_type", "purchase");

        if (error) throw error;

        if (history && history.length > 0) {
          const paymentIds = history.map((h) => h.payment_id).filter(Boolean);
          const { data: payments, error: paymentError } = await supabase
            .from("event_payments")
            .select("id")
            .in("id", paymentIds)
            .eq("user_id", user.id)
            .eq("status", "paid");

          if (paymentError) throw paymentError;

          const paidPaymentIds = new Set(payments?.map((p) => p.id) || []);
          const purchaseCount: Record<string, number> = {};
          let eventTotal = 0;

          history.forEach((h) => {
            if (h.payment_id && paidPaymentIds.has(h.payment_id)) {
              purchaseCount[h.ticket_category_id] =
                (purchaseCount[h.ticket_category_id] || 0) + h.ticket_count;
              eventTotal += h.ticket_count;
            }
          });

          setUserPurchaseHistory(purchaseCount);
          setEventPurchaseTotal(eventTotal);
        }
      } catch (error) {
        console.error("Error fetching purchase history:", error);
      }
    };

    fetchPurchaseHistory();
  }, [ticketTypes]);

  const toggleType = (typeId: string) => {
    setExpandedTypes((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  const updateQuantity = (
    categoryId: string,
    quantity: number,
    category: any
  ) => {
    const existing = selectedTickets.find((t) => t.categoryId === categoryId);
    if (quantity === 0) {
      onTicketsChange(
        selectedTickets.filter((t) => t.categoryId !== categoryId)
      );
    } else if (existing) {
      onTicketsChange(
        selectedTickets.map((t) =>
          t.categoryId === categoryId ? { ...t, quantity } : t
        )
      );
    } else {
      onTicketsChange([...selectedTickets, { categoryId, quantity, category }]);
    }
  };

  const getQuantity = (categoryId: string) => {
    return (
      selectedTickets.find((t) => t.categoryId === categoryId)?.quantity || 0
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryAvailability = (category: any) => {
    const now = new Date();

    if (!category.is_active) {
      return { available: false, reason: "inactive" };
    }

    if (category.remaining_quota !== null && category.remaining_quota <= 0) {
      return { available: false, reason: "sold_out" };
    }

    if (category.sale_start_date && new Date(category.sale_start_date) > now) {
      return { available: false, reason: "not_started" };
    }

    if (category.sale_end_date && new Date(category.sale_end_date) < now) {
      return { available: false, reason: "ended" };
    }

    return { available: true, reason: "available" };
  };


  const handleQuantityIncrease = (category: any, currentQuantity: number) => {
    const { available, reason } = getCategoryAvailability(category);

    if (!available) {
      let message = "";
      if (reason === "sold_out") {
        message =
          language === "id"
            ? "Tiket untuk kategori ini sudah habis terjual."
            : "Tickets for this category are sold out.";
      } else if (reason === "not_started") {
        message =
          language === "id"
            ? "Penjualan tiket belum dibuka."
            : "Ticket sales haven’t started yet.";
      } else if (reason === "ended") {
        message =
          language === "id"
            ? "Penjualan tiket sudah berakhir."
            : "Ticket sales have ended.";
      } else if (reason === "inactive") {
        message =
          language === "id"
            ? "Kategori tiket ini sedang tidak aktif."
            : "This ticket category is currently inactive.";
      } else {
        message =
          language === "id"
            ? "Tiket tidak tersedia."
            : "Ticket not available.";
      }

      toast.error(message);
      return;
    }

    const newQuantity = currentQuantity + 1;

    // --- VALIDASI BARU (CEK KUOTA TOTAL) ---
    if (
      category.remaining_quota !== null &&
      newQuantity > category.remaining_quota
    ) {
      toast.error(
        language === "id"
          ? `Hanya tersisa ${category.remaining_quota} tiket untuk kategori ini.`
          : `Only ${category.remaining_quota} tickets left for this category.`
      );
      return; // Hentikan penambahan
    }
    // --- AKHIR VALIDASI KUOTA ---

    // 1. Cek limit per KATEGORI (Per-User)
    const alreadyPurchasedForCategory = userPurchaseHistory[category.id] || 0;
    const newCategoryTotal = newQuantity + alreadyPurchasedForCategory;

    if (category.max_purchase && newCategoryTotal > category.max_purchase) {
      toast.error(
        language === "id"
          ? `Maks ${category.max_purchase} tiket per pengguna untuk kategori ini.`
          : `Max ${category.max_purchase} tickets per user for this category.`,
        {
          description:
            language === "id"
              ? `Anda sudah memiliki ${alreadyPurchasedForCategory} tiket.`
              : `You already have ${alreadyPurchasedForCategory} tickets.`,
        }
      );
      return;
    }

    // 2. Cek limit per EVENT (Per-User)
    const totalInCartCurrently = selectedTickets.reduce(
      (sum, t) => sum + t.quantity,
      0
    );
    const newEventTotal = totalInCartCurrently + 1 + eventPurchaseTotal;

    if (
      event.enable_max_purchase &&
      event.max_purchase &&
      newEventTotal > event.max_purchase
    ) {
      toast.error(
        language === "id"
          ? `Maks total ${event.max_purchase} tiket per pengguna untuk event ini.`
          : `Max total of ${event.max_purchase} tickets per user for this event.`,
        {
          // description:
          //   language === "id"
          //     ? `Anda sudah memiliki ${eventPurchaseTotal} tiket dan ${totalInCartCurrently} di keranjang.`
          //     : `You already have ${eventPurchaseTotal} tickets and ${totalInCartCurrently} in your cart.`,
        }
      );
      return;
    }

    // Jika lolos semua validasi
    updateQuantity(category.id, newQuantity, category);
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Ticket List */}
      <div className="lg:col-span-2 space-y-6">
        <div
          className={`relative w-full rounded-2xl overflow-hidden shadow-sm bg-gray-50 ${
            isMobileView ? "" : "max-w-[550px]"
          } mx-auto`}
        >
          <img
            src={event.stage_seating_image_url || event.banner_image_url}
            alt={event.title}
            className={`w-full ${
              isMobileView ? "max-h-[400px]" : "max-h-[280px]"
            } object-contain mx-auto transition-all duration-300`}
          />
        </div>

        <h2 className="text-2xl font-bold text-[#0A2A66]">{event.title}</h2>

        {ticketTypes.map((type) => (
          <Card
            key={type.id}
            className="bg-[#F9FAFB] border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggleType(type.id)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-100 transition-all"
            >
              <div className="text-left">
                <h3 className="font-semibold text-[#0A2A66] text-lg">
                  {type.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {type.event_ticket_categories?.length || 0} kategori • mulai{" "}
                  {formatPrice(
                    Math.min(
                      ...(type.event_ticket_categories?.map((c) => c.price) || [
                        0,
                      ])
                    )
                  )}
                </p>
              </div>
              {expandedTypes[type.id] ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {expandedTypes[type.id] && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-5 space-y-4 border-t border-gray-200"
              >
                {type.event_ticket_categories?.map((category) => {
                  const { available, reason } = getCategoryAvailability(category);
                  const quantity = getQuantity(category.id);

                  return (
                    <div
                      key={category.id}
                      className={`p-4 rounded-xl flex items-start justify-between ${
                        !available
                          ? "bg-gray-100 opacity-70"
                          : "bg-white hover:bg-[#EFF4FF] transition"
                      }`}
                    >
                      {/* LEFT SIDE: Info */}
                      <div>
                        <h4 className="font-medium text-[#0A2A66]">{category.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {category.description || ""}
                        </p>

                        {category.sale_end_date && (
                          <p className="text-xs text-[#2E67F8] mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {language === "id"
                              ? `Berakhir ${formatDistanceToNow(
                                  new Date(category.sale_end_date),
                                  { addSuffix: true, locale: idLocale }
                                )}`
                              : `Ends ${formatDistanceToNow(
                                  new Date(category.sale_end_date),
                                  { addSuffix: true, locale: enUS }
                                )}`}
                          </p>
                        )}

                        {/* 1. Remaining quota */}
                        {event.show_spots_left && (
                          <p className="text-xs font-medium text-red-500 mt-2">
                            {language === "id"
                              ? `Sisa ${category.remaining_quota ?? 0} tiket`
                              : `${category.remaining_quota ?? 0} tickets left`}
                          </p>
                        )}

                        {!event.show_spots_left &&
                          category.remaining_quota !== null &&
                          category.remaining_quota <= 10 && (
                            <p className="text-xs font-medium text-red-500 mt-2">
                              {language === "id"
                                ? `Sisa ${category.remaining_quota} tiket`
                                : `${category.remaining_quota} tickets left`}
                            </p>
                          )}

                        {/* 2. Max per user */}
                        {event.enable_max_purchase &&
                          event.max_purchase &&
                          event.max_purchase <= 10 && (
                            <p className="text-xs text-gray-500 mt-1">
                              (
                              {language === "id"
                                ? `Maks ${event.max_purchase} per pengguna`
                                : `Max ${event.max_purchase} per user`}
                              )
                            </p>
                          )}
                      </div>

                      {/* RIGHT SIDE: Price & actions */}
                      <div className="text-right">
                        <p className="font-semibold text-lg text-[#0A2A66]">
                          {formatPrice(category.price)}
                        </p>

                        {available ? (
                          <div className="flex items-center justify-end gap-3 mt-3">
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition"
                              onClick={() =>
                                updateQuantity(category.id, Math.max(0, quantity - 1), category)
                              }
                              disabled={quantity === 0}
                            >
                              <Minus className="w-4 h-4 text-gray-700" />
                            </button>
                            <span className="min-w-[24px] text-center font-medium text-[#0A2A66]">
                              {quantity}
                            </span>
                            <button
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2E67F8] hover:bg-[#1E50D8] transition"
                              onClick={() => handleQuantityIncrease(category, quantity)}
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-block mt-3 text-sm font-medium ${
                              reason === "sold_out"
                                ? "text-red-500"
                                : reason === "not_started"
                                ? "text-yellow-600"
                                : reason === "ended"
                                ? "text-gray-500"
                                : "text-gray-400"
                            }`}
                          >
                            {reason === "sold_out"
                              ? language === "id"
                                ? "Habis terjual"
                                : "Sold out"
                              : reason === "not_started"
                              ? language === "id"
                                ? "Belum dibuka"
                                : "Not yet available"
                              : reason === "ended"
                              ? language === "id"
                                ? "Penjualan ditutup"
                                : "Sales ended"
                              : language === "id"
                              ? "Tidak aktif"
                              : "Inactive"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <Card className="p-6 bg-[#0A2A66] text-white border border-[#0A2A66]/20 shadow-xl sticky top-24 rounded-2xl">
          <h3 className="font-semibold mb-4">
            {language === "id" ? "Ringkasan Pesanan" : "Order Summary"}
          </h3>

          {selectedTickets.length === 0 ? (
            <p className="text-sm text-gray-300 text-center py-10">
              {language === "id"
                ? "Belum ada tiket dipilih"
                : "No tickets selected"}
            </p>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {selectedTickets.map((ticket) => (
                  <div key={ticket.categoryId} className="text-sm">
                    <p className="font-medium text-white">
                      {ticket.category.name}
                    </p>
                    <p className="text-gray-300">
                      {ticket.quantity} × {formatPrice(ticket.category.price)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-4 mb-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>
                  {formatPrice(
                    selectedTickets.reduce(
                      (sum, t) => sum + t.category.price * t.quantity,
                      0
                    )
                  )}
                </span>
              </div>

              <Button
                onClick={onNext}
                className="w-full bg-[#2E67F8] hover:bg-[#1E50D8] text-white font-semibold rounded-lg"
                size="lg"
                disabled={selectedTickets.length === 0}
              >
                {language === "id" ? "Lanjutkan" : "Continue"}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
