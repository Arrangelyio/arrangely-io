import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Plus, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

interface LinkedAccount {
  id: string;
  payment_method: string;
  account_id: string;
  status: string;
  masked_number?: string;
  created_at: string;
}

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [showGopayForm, setShowGopayForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  useEffect(() => {
    loadLinkedAccounts();
  }, []);

  const loadLinkedAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("linked_payment_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinkedAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading linked accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkGopay = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("link-gopay-account", {
        body: {
          amount: 10000,
          description: "GoPay Account Linking",
          phone_number: phoneNumber,
        },
      });

      if (error) throw error;

      const targetUrl = data.deeplink_url || data.redirect_url || data.qr_code_url;
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error: any) {
      console.error("Error linking GoPay:", error);
      toast({
        title: "Failed to Link GoPay",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkCreditCard = async () => {
    if (!cardNumber || !cardExpiry || !cardCvv) {
      toast({
        title: "Invalid Card Details",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      const [expMonth, expYear] = cardExpiry.split("/");
      
      const { data, error } = await supabase.functions.invoke("link-credit-card", {
        body: {
          card_number: cardNumber.replace(/\s/g, ""),
          card_exp_month: expMonth.trim(),
          card_exp_year: `20${expYear.trim()}`,
          card_cvv: cardCvv,
        },
      });

      if (error) throw error;

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error: any) {
      console.error("Error linking credit card:", error);
      toast({
        title: "Failed to Link Credit Card",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const getAccountIcon = (method: string) => {
    return method === "gopay" ? <Smartphone className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />;
  };

  const getAccountDisplay = (account: LinkedAccount) => {
    if (account.payment_method === "gopay") {
      return account.masked_number || "GoPay Account";
    }
    return account.masked_number || "•••• •••• •••• ••••";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Payment Methods</h1>
            <p className="text-muted-foreground mt-2">
              Manage your payment methods for recurring subscriptions
            </p>
          </div>

          {/* Linked Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Linked Payment Methods</CardTitle>
              <CardDescription>
                These payment methods are available for recurring payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : linkedAccounts.length > 0 ? (
                <div className="space-y-3">
                  {linkedAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getAccountIcon(account.payment_method)}
                        <div>
                          <p className="font-medium">{getAccountDisplay(account)}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.payment_method}
                          </p>
                        </div>
                      </div>
                      <Badge variant={account.status === "linked" ? "default" : "secondary"}>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {account.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No payment methods linked yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Add New Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Add Payment Method</CardTitle>
              <CardDescription>
                Link a new payment method for recurring subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showGopayForm && !showCardForm ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    onClick={() => {
                      setShowGopayForm(true);
                      setShowCardForm(false);
                    }}
                  >
                    <Smartphone className="h-6 w-6" />
                    <span className="font-semibold">GoPay</span>
                    <span className="text-xs text-muted-foreground">Link your GoPay account</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-6 flex-col gap-2"
                    onClick={() => {
                      setShowCardForm(true);
                      setShowGopayForm(false);
                    }}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="font-semibold">Credit Card</span>
                    <span className="text-xs text-muted-foreground">Link your credit card</span>
                  </Button>
                </div>
              ) : null}

              {showGopayForm && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="08123456789"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isLinking}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your GoPay registered phone number
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleLinkGopay}
                      disabled={isLinking}
                      className="flex-1"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Link GoPay"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowGopayForm(false);
                        setPhoneNumber("");
                      }}
                      disabled={isLinking}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {showCardForm && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div>
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      maxLength={19}
                      disabled={isLinking}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                      <Input
                        id="expiry"
                        type="text"
                        placeholder="12/25"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        maxLength={5}
                        disabled={isLinking}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                        maxLength={3}
                        disabled={isLinking}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleLinkCreditCard}
                      disabled={isLinking}
                      className="flex-1"
                    >
                      {isLinking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Link Credit Card"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCardForm(false);
                        setCardNumber("");
                        setCardExpiry("");
                        setCardCvv("");
                      }}
                      disabled={isLinking}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {linkedAccounts.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Ready for Subscription</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your payment method is ready. You can now choose a subscription plan.
                    </p>
                    <Button
                      onClick={() => navigate("/membership")}
                      className="mt-4"
                    >
                      View Subscription Plans
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;
