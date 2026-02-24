import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  CreditCard,
  Smartphone,
  Building2,
  ArrowLeft,
  Ban,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export default function LessonTransactions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["lesson-transactions"],
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
          lessons:lesson_id (
            id,
            title,
            slug,
            cover_image_url,
            profiles:creator_id (
              display_name
            )
          )
        `
        )
        .eq("user_id", user.id)
        .not("lesson_id", "is", null)
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
        .eq("status", "pending");

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment cancelled successfully");
      queryClient.invalidateQueries({ queryKey: ["lesson-transactions"] });
    },
    onError: (error: any) => {
      console.error("Cancel error:", error);
      toast.error("Failed to cancel payment");
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      settlement: "default",
      pending: "secondary",
      failed: "destructive",
      expired: "destructive",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "va":
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
    switch (method) {
      case "va":
        return "Bank Transfer";
      case "gopay":
        return "GoPay";
      case "credit_card":
        return "Credit Card";
      default:
        return method;
    }
  };

  return (
    <>
      
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Music Lab Transaction History</CardTitle>
            <p className="text-sm text-muted-foreground">
              View and manage your music lab payment transactions
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                Loading transactions...
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start learning by enrolling in a music lab
                </p>
                <Button onClick={() => navigate("/arrangely-music-lab")}>
                  Browse Music Lab
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20 h-20">
                        {transaction.lessons?.cover_image_url ? (
                          <img
                            src={transaction.lessons.cover_image_url}
                            alt={transaction.lessons.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-semibold text-lg line-clamp-1">
                              {transaction.lessons?.title || "Music Lab"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              by {transaction.lessons?.profiles?.display_name || "Creator"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transaction.status)}
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mb-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {getPaymentIcon(transaction.payment_method)}
                            <span>{getPaymentMethodName(transaction.payment_method)}</span>
                          </div>
                          <div className="font-medium">
                            Rp {transaction.amount.toLocaleString("id-ID")}
                          </div>
                          <div className="text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        {transaction.midtrans_order_id && (
                          <p className="text-xs text-muted-foreground mb-3">
                            Order ID: {transaction.midtrans_order_id}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {transaction.status === "pending" ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/arrangely-music-lab/${transaction.lessons?.slug}/payment/waiting/${transaction.midtrans_order_id}`
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Payment
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={cancelPaymentMutation.isPending}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Payment?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to cancel this payment? You'll need to
                                      create a new transaction if you want to enroll in this music lab.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>No, keep it</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        cancelPaymentMutation.mutate(transaction.id)
                                      }
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Yes, cancel payment
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : transaction.status === "paid" || transaction.status === "settlement" ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/arrangely-music-lab/${transaction.lessons?.slug}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Go to Music Lab
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/arrangely-music-lab/${transaction.lessons?.slug}`)}
                            >
                              View Music Lab
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
    </>
  );
}
