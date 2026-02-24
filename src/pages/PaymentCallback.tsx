import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isCapacitorIOS } from "@/hooks/useIsCapacitorIOS";

// Helper to get fallback redirect URL (home for iOS, pricing for others)
const getFallbackRedirect = () => isCapacitorIOS() ? "/" : "/pricing";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your payment...");

  useEffect(() => {
    const processCallback = async () => {
      const method = searchParams.get("method");
      const orderId = searchParams.get("order_id");
      const type = searchParams.get("type");

      

      if (method === "gopay" && type === "account_link") {
        // Handle GoPay account linking callback
        // Query the database to check the payment status
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error("User not authenticated");
          }

          // Poll for payment status (wait a bit for webhook to process)
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check if the payment was successful by querying the linked_payment_accounts table
          const { data: linkedAccount, error: queryError } = await supabase
            .from("linked_payment_accounts")
            .select("*")
            .eq("user_id", user.id)
            .eq("payment_method", "gopay")
            .eq("status", "linked")
            .maybeSingle();

          if (queryError) {
            console.error("Error querying linked account:", queryError);
            throw queryError;
          }

          if (linkedAccount && linkedAccount.account_id) {
            setStatus("success");
            setMessage("GoPay account successfully linked!");
            
            toast({
              title: "Success!",
              description: "Your GoPay account is now linked for recurring payments",
            });

            // Redirect to subscription page after 2 seconds
            setTimeout(() => {
              navigate(getFallbackRedirect());
            }, 2000);
          } else {
            setStatus("error");
            setMessage("GoPay account linking was cancelled or failed.");
            
            setTimeout(() => {
              navigate(getFallbackRedirect());
            }, 3000);
          }
        } catch (error) {
          console.error("Error checking GoPay account status:", error);
          setStatus("error");
          setMessage("Failed to verify GoPay account status. Please try again.");
          
          toast({
            title: "Error",
            description: "Failed to verify GoPay account status",
            variant: "destructive",
          });

          setTimeout(() => {
            navigate(getFallbackRedirect());
          }, 3000);
        }
      } else if (method === "gopay" && type === "subscription") {
        // Handle GoPay subscription payment callback
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error("User not authenticated");
          }

          // Poll for subscription status (wait a bit for webhook to process)
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Check if the subscription was created successfully
          const { data: subscription, error: queryError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (queryError) {
            console.error("Error querying subscription:", queryError);
            throw queryError;
          }

          if (subscription) {
            setStatus("success");
            setMessage("Payment successful! Activating your subscription...");
            
            setTimeout(() => {
              navigate("/subscription");
            }, 2000);
          } else {
            setStatus("error");
            setMessage("Payment was cancelled or failed.");
            
            setTimeout(() => {
              navigate(getFallbackRedirect());
            }, 3000);
          }
        } catch (error) {
          console.error("Error checking subscription status:", error);
          setStatus("error");
          setMessage("Failed to verify subscription status. Please try again.");
          
          setTimeout(() => {
            navigate(getFallbackRedirect());
          }, 3000);
        }
      } else {
        // Unknown callback type
        setStatus("error");
        setMessage("Invalid callback parameters.");
        
        setTimeout(() => {
          navigate(getFallbackRedirect());
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === "processing" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">Processing...</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}
            
            {status === "success" && (
              <>
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">Success!</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}
            
            {status === "error" && (
              <>
                <div className="rounded-full bg-red-100 p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Error</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
