import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Download, Send } from "lucide-react";

interface EventCertificateManagerProps {
  eventId: string;
}

export function EventCertificateManager({ eventId }: EventCertificateManagerProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, [eventId]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from("event_certificates")
        .select(`
          *,
          event_registrations (
            attendee_name,
            attendee_email
          )
        `)
        .eq("event_id", eventId)
        .order("generated_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
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

  const generateAllCertificates = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificates", {
        body: { eventId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated ${data.count} certificates`,
      });

      fetchCertificates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Certificate Management</CardTitle>
          <CardDescription>
            Generate and manage certificates of attendance for checked-in participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateAllCertificates} disabled={generating} className="w-full">
            <Award className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate Certificates for All Attendees"}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading certificates...</div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No certificates generated yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{cert.event_registrations.attendee_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cert.event_registrations.attendee_email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Serial: {cert.serial_number}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
