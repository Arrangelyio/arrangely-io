import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Copy, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserRole } from "@/hooks/useUserRole";

interface Ticket {
  participant_name: string;
  participant_email: string;
  participant_phone: string;
  participant_ktp?: string;
}

interface EventRegistrationDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EventRegistrationDialog({
  event,
  open,
  onOpenChange,
}: EventRegistrationDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      participant_name: "",
      participant_email: "",
      participant_phone: "",
      participant_ktp: "",
    },
  ]);

  // Fetch user profile data and prefill first ticket
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && open) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email, phone")
            .eq("id", user.id)
            .single();

          if (profile) {
            const fullName = `${profile.first_name || ""} ${
              profile.last_name || ""
            }`.trim();
            setTickets([
              {
                participant_name: fullName || "",
                participant_email: profile.email || user.email || "",
                participant_phone: profile.phone || "",
                participant_ktp: "",
              },
            ]);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    };

    fetchUserProfile();
  }, [user, open]);

  const addTicket = () => {
    if (tickets.length >= (event.max_tickets_per_purchase || 10)) {
      toast({
        title: t("eventRegistration.maxTickets"),
        description: t("eventRegistration.maxTicketsDesc").replace(
          "{{max}}",
          String(event.max_tickets_per_purchase || 10)
        ),
        variant: "destructive",
      });
      return;
    }
    setTickets([
      ...tickets,
      {
        participant_name: "",
        participant_email: "",
        participant_phone: "",
        participant_ktp: "",
      },
    ]);
  };

  const removeTicket = (index: number) => {
    if (tickets.length === 1) return;
    const newTickets = tickets.filter((_, i) => i !== index);
    setTickets(newTickets);
  };

  const copyFromPrevious = (index: number) => {
    if (index === 0) return;
    const newTickets = [...tickets];
    const previousTicket = tickets[index - 1];
    newTickets[index] = {
      participant_name: previousTicket.participant_name,
      participant_email: "",
      participant_phone: "",
      participant_ktp: "",
    };
    setTickets(newTickets);
    toast({
      title: "Name copied",
      description: "Name copied from previous ticket. Please fill in the rest.",
    });
  };

  const updateTicket = (index: number, field: keyof Ticket, value: string) => {
    const newTickets = [...tickets];
    newTickets[index][field] = value;
    setTickets(newTickets);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all tickets
    const invalidTicket = tickets.find(
      (t) => !t.participant_name || !t.participant_email || !t.participant_phone
    );
    if (invalidTicket) {
      toast({
        title: t("eventRegistration.incomplete"),
        description: t("eventRegistration.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-event-payment",
        {
          body: {
            event_id: event.id,
            tickets,
            discount_code: discountCode || null,
          },
        }
      );

      if (error) throw error;

      // Open Midtrans Snap
      if (window.snap && data.snap_token) {
        window.snap.pay(data.snap_token, {
          onSuccess: () => {
            toast({
              title: "Payment successful!",
              description: "Your tickets have been confirmed.",
            });
            onOpenChange(false);
            window.location.reload();
          },
          onPending: () => {
            toast({
              title: "Payment pending",
              description: "Waiting for payment confirmation.",
            });
            onOpenChange(false);
          },
          onError: () => {
            toast({
              title: "Payment failed",
              description: "Please try again.",
              variant: "destructive",
            });
          },
          onClose: () => {
            
          },
        });
      } else {
        throw new Error("Payment gateway not available");
      }
    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = event.price * tickets.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("eventRegistration.title")} {event.title}
          </DialogTitle>
        </DialogHeader>

        {/* ID Requirement Notice */}
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            {t("eventRegistration.idNoticeTitle")}
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {t("eventRegistration.idNotice")}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {t("eventRegistration.ticketInfo")}
              </h3>
              {event.allow_multiple_tickets && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTicket}
                  disabled={
                    tickets.length >= (event.max_tickets_per_purchase || 10)
                  }
                  className="gap-2 transition-all hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  {t("eventRegistration.addTicket")}
                </Button>
              )}
            </div>

            {tickets.map((ticket, index) => (
              <Card
                key={index}
                className="p-6 space-y-4 bg-card hover:shadow-lg transition-all duration-300 border-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-lg text-foreground">
                    {t("eventRegistration.ticket")} {index + 1}
                  </h4>
                  <div className="flex gap-2">
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyFromPrevious(index)}
                        className="gap-2 text-xs"
                      >
                        <Copy className="w-3 h-3" />
                        {t("eventRegistration.copyPrevious")}
                      </Button>
                    )}
                    {tickets.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTicket(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`name-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("eventRegistration.fullName")} *
                    </Label>
                    <Input
                      id={`name-${index}`}
                      value={ticket.participant_name}
                      onChange={(e) =>
                        updateTicket(index, "participant_name", e.target.value)
                      }
                      required
                      className="transition-all focus:ring-2 focus:ring-primary"
                      placeholder="Arrangely"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`email-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("eventRegistration.email")} *
                    </Label>
                    <Input
                      id={`email-${index}`}
                      type="email"
                      value={ticket.participant_email}
                      onChange={(e) =>
                        updateTicket(index, "participant_email", e.target.value)
                      }
                      required
                      className="transition-all focus:ring-2 focus:ring-primary"
                      placeholder="info@arrangely.io"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`phone-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("eventRegistration.phoneNumber")} *
                    </Label>
                    <Input
                      id={`phone-${index}`}
                      type="tel"
                      value={ticket.participant_phone}
                      onChange={(e) =>
                        updateTicket(index, "participant_phone", e.target.value)
                      }
                      required
                      className="transition-all focus:ring-2 focus:ring-primary"
                      placeholder="08123456789"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`ktp-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("eventRegistration.idNumber")}
                    </Label>
                    <Input
                      id={`ktp-${index}`}
                      value={ticket.participant_ktp}
                      onChange={(e) =>
                        updateTicket(index, "participant_ktp", e.target.value)
                      }
                      className="transition-all focus:ring-2 focus:ring-primary"
                      placeholder="3201234567890001"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount" className="text-sm font-medium">
              {t("eventRegistration.discountCode")}
            </Label>
            <Input
              id="discount"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder={t("eventRegistration.enterCode")}
              className="transition-all focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="border-t pt-6 bg-muted/30 -mx-6 px-6 pb-6 rounded-b-lg">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-foreground">
                {t("eventRegistration.totalAmount")}:
              </span>
              <span className="text-3xl font-bold text-primary">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("eventRegistration.processing")}
                </>
              ) : (
                `${t("eventRegistration.register")} (${tickets.length} ${
                  tickets.length > 1
                    ? t("eventRegistration.tickets")
                    : t("eventRegistration.ticket_singular")
                })`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
