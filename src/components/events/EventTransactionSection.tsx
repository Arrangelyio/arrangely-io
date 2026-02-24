import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  Smartphone,
} from "lucide-react";

export default function EventTransactionSection() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [timers, setTimers] = useState<Record<string, number>>({});
  const [visibleCount, setVisibleCount] = useState(5);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["event-payments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          event:events (
            id,
            title,
            slug,
            banner_image_url,
            date
          )
        `)
        .eq("user_id", user.id)
        .eq("payment_type", "event")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatus = (status: string) => {
    switch (status) {
      case "paid":
      case "settlement":
        return {
          label: language === "id" ? "Berhasil" : "Paid",
          color: "bg-green-50 text-green-700 border-green-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
        };
      case "pending":
        return {
          label: language === "id" ? "Menunggu" : "Pending",
          color: "bg-yellow-50 text-yellow-700 border-yellow-200",
          icon: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
        };
      default:
        return {
          label: language === "id" ? "Gagal" : "Failed",
          color: "bg-red-50 text-red-700 border-red-200",
          icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
        };
    }
  };

  const getPaymentIcon = (method: string) => {
    const icons: Record<string, JSX.Element> = {
      bank_transfer: <Building2 className="w-4 h-4 text-blue-500" />,
      gopay: <Smartphone className="w-4 h-4 text-sky-500" />,
      credit_card: <CreditCard className="w-4 h-4 text-purple-500" />,
      echannel: <Building2 className="w-4 h-4 text-gray-500" />,
    };
    return icons[method] || <CreditCard className="w-4 h-4 text-gray-400" />;
  };

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: language === "id" ? "Transfer Bank" : "Bank Transfer",
      gopay: "GoPay",
      credit_card: language === "id" ? "Kartu Kredit" : "Credit Card",
      echannel: "Mandiri Bill",
    };
    return labels[method] || "N/A";
  };

  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // countdown timer
  useEffect(() => {
    if (!transactions) return;

    const interval = setInterval(() => {
      const newTimers: Record<string, number> = {};
      transactions.forEach((tx) => {
        if (tx.status === "pending" && tx.expires_at) {
          const expiresAt = new Date(tx.expires_at).getTime();
          const now = Date.now();
          const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
          newTimers[tx.id] = secondsLeft;
        }
      });
      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [transactions]);

  // Infinite Scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && transactions && visibleCount < transactions.length) {
        setVisibleCount((prev) => prev + 5);
      }
    },
    [transactions, visibleCount]
  );

  useEffect(() => {
    const option = { root: null, rootMargin: "100px", threshold: 0 };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mb-4"></div>
        <p>{language === "id" ? "Memuat transaksi..." : "Loading transactions..."}</p>
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-20">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold">
          {language === "id" ? "Belum ada transaksi" : "No transactions yet"}
        </h3>
        <p className="text-gray-500 mb-6 text-sm">
          {language === "id"
            ? "Mulai dengan mendaftar ke event pilihan Anda"
            : "Start by registering for an event"}
        </p>
      </div>
    );
  }

  const visibleTransactions = transactions.slice(0, visibleCount);

  return (
    <div className="space-y-3 pb-16">
      {visibleTransactions.map((tx) => {
        const status = getStatus(tx.status);

        const handleCardClick = () => {
          if (tx.status === "pending") {
            if (tx.payment_method === "credit_card") {
              if (tx.actions && tx.actions.length > 0) {
                window.location.href = tx.actions[0].url;
              } else {
                console.error("No actions available for credit card payment");
              }
            } else {
              navigate(`/events/payment/${tx.id}`);
            }
          } else {
            navigate(`/events/${tx.event?.id}`);
          }
        };

        return (
          <div
            key={tx.id}
            onClick={handleCardClick}
            className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-3 w-full">
              <img
                src={tx.event?.banner_image_url || "/placeholder-event.jpg"}
                alt={tx.event?.title}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {tx.event?.title || "Event"}
                  </h4>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.color}`}
                  >
                    {status.icon}
                    {status.label}
                    {tx.status === "pending" && timers[tx.id] > 0 && (
                      <span className="ml-1 font-mono text-[10px] text-yellow-700">
                        {formatTimeLeft(timers[tx.id])}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {tx.event?.date &&
                    new Date(tx.event.date).toLocaleDateString(
                      language === "id" ? "id-ID" : "en-US",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    {getPaymentIcon(tx.payment_method)}
                    <span>{getPaymentLabel(tx.payment_method)}</span>
                  </div>
                  <span className="font-semibold text-sm text-gray-900">
                    Rp {tx.amount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loader */}
      <div ref={loaderRef} className="flex justify-center mt-6">
        {visibleCount < transactions.length ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm animate-pulse">
            <Clock className="w-4 h-4" />
            {language === "id"
              ? "Memuat transaksi berikutnya..."
              : "Loading more transactions..."}
          </div>
        ) : (
          <p className="text-gray-400 text-xs text-center">
            {language === "id"
              ? "Semua transaksi sudah ditampilkan."
              : "All transactions have been displayed."}
          </p>
        )}
      </div>
    </div>
  );
}
