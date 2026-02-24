import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Crown, 
  Download, 
  Zap, 
  Users, 
  Calendar,
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Close any open modals by navigating to homepage
    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, 3000); // Auto redirect after 3 seconds

    return () => clearTimeout(timer);
  }, [navigate]);

  useEffect(() => {
    // Fetch user's subscription after payment
    const fetchSubscription = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: userSubscription } = await supabase
            .from("subscriptions")
            .select("*, subscription_plans(*)")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .maybeSingle();

          setSubscription(userSubscription);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const formatRupiah = (amount: number) => {
    return `Rp${amount.toLocaleString("id-ID")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-sanctuary flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary mb-2">
            Payment Successful!
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            Welcome to Arrangely Premium! Your subscription is now active.
          </p>
          
          {subscription && (
            <Badge variant="default" className="mt-4 text-base px-4 py-2">
              <Crown className="h-4 w-4 mr-2" />
              {subscription.subscription_plans?.name} Plan Active
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Premium Features */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Premium Access</h3>
              <p className="text-sm text-muted-foreground text-center">
                Unlimited access to all premium arrangements and content
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Unlimited Downloads</h3>
              <p className="text-sm text-muted-foreground text-center">
                Download PDFs and chord charts without limits
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Powered Tools</h3>
              <p className="text-sm text-muted-foreground text-center">
                Access to advanced features and auto-arrangements
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Collaboration</h3>
              <p className="text-sm text-muted-foreground text-center">
                Share and collaborate on arrangements with your team
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              onClick={() => navigate("/")}
              className="flex-1 bg-gradient-worship hover:opacity-90"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Homepage
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need help? <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/contact")}>Contact our support team</Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;