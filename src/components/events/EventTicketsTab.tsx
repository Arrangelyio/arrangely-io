import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale, enUS } from "date-fns/locale";
import { TicketSelectionFlow } from "./TicketSelectionFlow";

interface EventTicketsTabProps {
  event: any;
}

export function EventTicketsTab({ event }: EventTicketsTabProps) {
  const { t, language } = useLanguage();
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTicketFlow, setShowTicketFlow] = useState(false);
  const [userTotalPurchases, setUserTotalPurchases] = useState(0);
  const [hasUserTicket, setHasUserTicket] = useState(false);

  useEffect(() => {
    fetchTicketTypes();
    fetchUserPurchases();
  }, [event.id]);

  const fetchTicketTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("event_ticket_types")
        .select(`
          *,
          event_ticket_categories (
            id,
            name,
            price,
            is_active,
            sale_start_date,
            sale_end_date,
            remaining_quota,
            max_purchase
          )
        `)
        .eq("event_id", event.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTicketTypes(data || []);
    } catch (error) {
      console.error("Error fetching ticket types:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPurchases = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userPayments, error: paymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .in("status", ["paid"]);

      if (paymentError) throw paymentError;

      if (!userPayments || userPayments.length === 0) {
        setUserTotalPurchases(0);
        setHasUserTicket(false);
        return;
      }

      const paymentIds = userPayments.map((p) => p.id);

      // 2️⃣ Ambil total ticket_count dari event_quota_transaction_history berdasarkan payment_id
      const { data: transactions, error: transactionError } = await supabase
        .from("event_quota_transaction_history")
        .select("ticket_count")
        .in("payment_id", paymentIds)
        .eq("transaction_type", "used");

      if (transactionError) throw transactionError;

      // 3️⃣ Hitung total semua tiket dari semua transaksi
      const totalTickets =
        transactions?.reduce((sum, t) => sum + (t.ticket_count || 0), 0) || 0;

      // 4️⃣ Simpan hasil
      setUserTotalPurchases(totalTickets);
      setHasUserTicket(totalTickets > 0);
    } catch (error) {
      console.error("Error fetching user purchases:", error);
    }
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === "id" ? "id-ID" : "en-US", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryStatus = (category: any) => {
    const now = new Date();
    
    if (!category.is_active) {
      return { 
        status: "inactive", 
        label: language === "id" ? "Tidak Aktif" : "Inactive",
        variant: "outline" as const
      };
    }
    
    if (category.sale_start_date && new Date(category.sale_start_date) > now) {
      return { 
        status: "not_started", 
        label: language === "id" ? "Penjualan Belum Dimulai" : "Sale Not Started",
        variant: "outline" as const
      };
    }
    
    if (category.sale_end_date && new Date(category.sale_end_date) < now) {
      return { 
        status: "ended", 
        label: language === "id" ? "Penjualan Berakhir" : "Sale Ended",
        variant: "destructive" as const
      };
    }
    
    if (category.remaining_quota !== null && category.remaining_quota <= 0) {
      return { 
        status: "sold_out", 
        label: language === "id" ? "Habis Terjual" : "Sold Out",
        variant: "destructive" as const
      };
    }
    
    return { 
      status: "available", 
      label: language === "id" ? "Tersedia" : "Available",
      variant: "default" as const
    };
  };

  const getSaleTimeInfo = (category: any) => {
    const now = new Date();
    
    if (category.sale_start_date && new Date(category.sale_start_date) > now) {
      const startDate = new Date(category.sale_start_date);
      return language === "id" 
        ? `Penjualan dimulai ${formatDistanceToNow(startDate, { addSuffix: true, locale: idLocale })}`
        : `Sale starts ${formatDistanceToNow(startDate, { addSuffix: true, locale: enUS })}`;
    }
    
    if (category.sale_end_date) {
      const endDate = new Date(category.sale_end_date);
      if (endDate > now) {
        return language === "id"
          ? `Penjualan berakhir ${formatDistanceToNow(endDate, { addSuffix: true, locale: idLocale })}`
          : `Sale ends ${formatDistanceToNow(endDate, { addSuffix: true, locale: enUS })}`;
      }
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-2" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  const isMaxPurchaseReached = 
    event.enable_max_purchase && 
    event.max_purchase && 
    userTotalPurchases >= event.max_purchase;

  const getButtonLabel = () => {
    if (hasUserTicket) {
      return language === "id" ? "Lihat Tiket Saya" : "View My Ticket";
    }
    return language === "id" ? "Beli Tiket" : "Buy Ticket";
  };

  const handleButtonClick = () => {
    if (hasUserTicket) {
      // Navigate to tickets page or show user's tickets
      window.location.href = "/events?tab=tickets";
    } else {
      setShowTicketFlow(true);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {ticketTypes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {language === "id" ? "Belum ada tiket tersedia" : "No tickets available yet"}
            </p>
          </div>
        ) : (
          ticketTypes.map((type) => (
            <div key={type.id}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{type.name}</h3>
                <div className="flex flex-col items-end gap-2">
                  <Button 
                    onClick={handleButtonClick}
                    disabled={isMaxPurchaseReached && !hasUserTicket}
                  >
                    {getButtonLabel()}
                  </Button>
                  {isMaxPurchaseReached && !hasUserTicket && (
                    <p className="text-xs text-destructive">
                      {language === "id" 
                        ? `Batas pembelian tercapai (${event.max_purchase} tiket)`
                        : `Purchase limit reached (${event.max_purchase} tickets)`}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {type.event_ticket_categories?.map((category: any) => {
                  const statusInfo = getCategoryStatus(category);
                  const saleTimeInfo = getSaleTimeInfo(category);
                  const isAvailable = statusInfo.status === "available";

                  return (
                    <Card
                      key={category.id}
                      className={`p-4 ${!isAvailable ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-base">
                              {category.name}
                            </h4>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          {saleTimeInfo && (
                            <p className="text-xs text-muted-foreground">
                              {saleTimeInfo}
                            </p>
                          )}
                          
                          {/* {category.remaining_quota !== null && isAvailable && (
                            <p className="text-xs text-muted-foreground">
                              {language === "id" 
                                ? `Tersisa ${category.remaining_quota} tiket`
                                : `${category.remaining_quota} tickets left`}
                            </p>
                          )} */}
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatPrice(category.price)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <TicketSelectionFlow
        event={event}
        open={showTicketFlow}
        onOpenChange={setShowTicketFlow}
      />
    </>
  );
}
