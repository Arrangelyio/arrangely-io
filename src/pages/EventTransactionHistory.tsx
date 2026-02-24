import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CreditCard,
  Smartphone,
  Eye,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EventTransactionHistory() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [timers, setTimers] = useState<Record<string, number>>({});

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["event-transactions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          event:events (
            id,
            title,
            slug,
            banner_image_url,
            date
          )
        `
        )
        .eq("user_id", user.id)
        .eq("payment_type", "event")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "cancelled" })
        .eq("id", paymentId)
        .eq("payment_type", "event")
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        language === "id" ? "Pembayaran berhasil dibatalkan" : "Payment cancelled successfully"
      );
      queryClient.invalidateQueries({ queryKey: ["event-transactions"] });
    },
    onError: (error: any) => {
      console.error("Cancel error:", error);
      toast.error(language === "id" ? "Gagal membatalkan pembayaran" : "Failed to cancel payment");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
      case "settlement":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
      case "expired":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      paid: "default",
      settlement: "default",
      pending: "secondary",
      failed: "destructive",
      expired: "destructive",
      cancelled: "outline",
    };

    const labels: Record<string, string> = {
      paid: language === "id" ? "Berhasil" : "Paid",
      settlement: language === "id" ? "Berhasil" : "Settlement",
      pending: language === "id" ? "Menunggu" : "Pending",
      failed: language === "id" ? "Gagal" : "Failed",
      expired: language === "id" ? "Kadaluarsa" : "Expired",
      cancelled: language === "id" ? "Dibatalkan" : "Cancelled",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {labels[status] || status}
      </Badge>
    );
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return <Building2 className="h-4 w-4" />;
      case "gopay":
        return <Smartphone className="h-4 w-4" />;
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    const names: Record<string, string> = {
      bank_transfer: language === "id" ? "Transfer Bank" : "Bank Transfer",
      gopay: "GoPay",
      credit_card: language === "id" ? "Kartu Kredit" : "Credit Card",
    };
    return names[method] || method || "N/A";
  };

  const formatTimeLeft = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {language === "id" ? "Kembali" : "Back"}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {language === "id"
              ? "Riwayat Transaksi Event"
              : "Event Transaction History"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === "id"
              ? "Lihat dan kelola transaksi pembayaran event Anda"
              : "View and manage your event payment transactions"}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              {language === "id" ? "Memuat transaksi..." : "Loading transactions..."}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">
                {language === "id" ? "Belum ada transaksi" : "No transactions yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {language === "id"
                  ? "Mulai dengan mendaftar ke sebuah event"
                  : "Start by registering for an event"}
              </p>
              <Button onClick={() => navigate("/events")}>
                {language === "id" ? "Jelajahi Event" : "Browse Events"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-20 h-20">
                      {transaction.event?.banner_image_url ? (
                        <img
                          src={transaction.event.banner_image_url}
                          alt={transaction.event.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-lg line-clamp-1">
                            {transaction.event?.title || "Event"}
                          </h4>
                          {transaction.event?.date && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                transaction.event.date
                              ).toLocaleDateString(
                                language === "id" ? "id-ID" : "en-US",
                                {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(transaction.status)}
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {getPaymentIcon(transaction.payment_method)}
                          <span>
                            {getPaymentMethodName(transaction.payment_method)}
                          </span>
                        </div>
                        <div className="font-medium">
                          Rp {transaction.amount.toLocaleString("id-ID")}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString(
                            language === "id" ? "id-ID" : "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </div>

                      {transaction.id && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Order ID: {transaction.id.slice(0, 13)}
                        </p>
                      )}

                      {transaction.status === "pending" && timers[transaction.id] !== undefined && timers[transaction.id] > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-3">
                          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          <div className="flex flex-col">
                            <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                              {language === "id" ? "Waktu tersisa:" : "Time remaining:"}
                            </span>
                            <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                              {formatTimeLeft(timers[transaction.id])}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {transaction.status === "pending" ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                if (transaction.payment_method === "credit_card") {
                                  if (transaction.actions && transaction.actions.length > 0) {
                                    window.location.href = transaction.actions[0].url;
                                  } else {
                                    console.error("No actions available for credit card payment");
                                  }
                                } else {
                                  navigate(`/events/payment/${transaction.id}`);
                                }
                              }}
                            >
                              Pay
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={cancelPaymentMutation.isPending}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  {language === "id" ? "Batalkan" : "Cancel"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {language === "id"
                                      ? "Batalkan Pembayaran?"
                                      : "Cancel Payment?"}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === "id"
                                      ? "Apakah Anda yakin ingin membatalkan pembayaran ini? Anda harus membuat transaksi baru jika ingin mendaftar ke event ini."
                                      : "Are you sure you want to cancel this payment? You'll need to create a new transaction if you want to register for this event."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {language === "id" ? "Tidak" : "No, keep it"}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      cancelPaymentMutation.mutate(
                                        transaction.id
                                      )
                                    }
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {language === "id"
                                      ? "Ya, batalkan"
                                      : "Yes, cancel payment"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : transaction.status === "paid" ||
                          transaction.status === "settlement" ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              navigate(`/events/${transaction.event?.slug}`)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {language === "id" ? "Lihat Event" : "Go to Event"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/events/${transaction.event?.slug}`)
                            }
                          >
                            {language === "id" ? "Lihat Event" : "View Event"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
