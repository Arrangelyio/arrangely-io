import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download } from "lucide-react";

interface AttendeeCertificatesProps {
  eventId: string;
  userId: string;
}

export function AttendeeCertificates({ eventId, userId }: AttendeeCertificatesProps) {
  const { toast } = useToast();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificate();
  }, [eventId, userId]);

  const fetchCertificate = async () => {
    try {
      // Get user's registration
      const { data: registration, error: regError } = await supabase
        .from("event_registrations")
        .select("id, check_in_time, certificate_url")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (regError) throw regError;

      if (!registration) {
        setLoading(false);
        return;
      }

      // If checked in, get certificate
      if (registration.check_in_time) {
        const { data: certData, error: certError } = await supabase
          .from("event_certificates")
          .select("*")
          .eq("registration_id", registration.id)
          .maybeSingle();

        if (certError) throw certError;
        setCertificate(certData);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (certificate?.certificate_url) {
      window.open(certificate.certificate_url, "_blank");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading certificates...</div>;
  }

  if (!certificate) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Your certificate will be available after you check in at the event.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Your Certificate
        </CardTitle>
        <CardDescription>
          Download your certificate of attendance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/50">
          <p className="text-sm font-medium mb-2">Serial Number:</p>
          <p className="font-mono text-sm">{certificate.serial_number}</p>
        </div>
        <Button onClick={handleDownload} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          Download Certificate
        </Button>
      </CardContent>
    </Card>
  );
}
