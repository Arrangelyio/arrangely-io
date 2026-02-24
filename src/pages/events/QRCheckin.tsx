import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function QRCheckin() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const { user, role, loading } = useUserRole();
  const hostname =
  typeof window !== "undefined" ? window.location.hostname : "";

  const isProduction =
    hostname === "arrangely.io" ||
    hostname === "preview--chord-flow-worship-aid.lovable.app";

  const isStaging = hostname === "staging.arrangely.io";

  const baseUrl = isProduction
    ? "https://arrangely.io"
    : isStaging
    ? "https://staging.arrangely.io"
    : `http://${hostname || "localhost"}:3000`;

  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !qrToken) return;

    const processCheckin = async () => {
      try {
        // Role-based redirection
        if (role === 'admin') {
          // Redirect to admin check-in result page to show validation details
          navigate(`/events/checkin-result/${qrToken}`);
        } else {
          navigate('/events');
        }

      } catch (error) {
        console.error('Checkin processing error:', error);
        toast.error('An error occurred during check-in');
        navigate('/events');
      }
    };

    processCheckin();
  }, [qrToken, loading, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Processing check-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Validating QR code...</p>
      </div>
    </div>
  );
}