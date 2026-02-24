import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Share2, Download, Award } from "lucide-react";
import { toast } from "sonner";

interface CertificateData {
  id: string;
  serial_number: string;
  certificate_url: string;
  created_at: string;
  user_id: string;
  lesson_id: string;
  profiles: {
    display_name: string;
  };
  lessons: {
    title: string;
    creator_id: string;
    profiles: {
      display_name: string;
    };
  };
}

export default function CertificateVerification() {
  const { serialNumber } = useParams<{ serialNumber: string }>();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificate();
  }, [serialNumber]);

  const fetchCertificate = async () => {
    if (!serialNumber) {
      setError("No certificate serial number provided");
      setLoading(false);
      return;
    }

    try {
      // Fetch certificate by serial number
      const { data: cert, error: fetchError } = await supabase
        .from("lesson_certificates")
        .select("*")
        .eq("serial_number", serialNumber.toUpperCase())
        .maybeSingle();

      if (fetchError || !cert) {
        setError("Certificate not found");
        setLoading(false);
        return;
      }

      // Fetch related profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", cert.user_id)
        .maybeSingle();

      // Fetch related lesson and creator
      const { data: lesson } = await supabase
        .from("lessons")
        .select(`
          title,
          creator_id,
          profiles:creator_id(display_name)
        `)
        .eq("id", cert.lesson_id)
        .maybeSingle();

      const combinedData: CertificateData = {
        ...cert,
        profiles: {
          display_name: profile?.display_name || "User",
        },
        lessons: {
          title: lesson?.title || "Unknown Music Lab",
          creator_id: lesson?.creator_id || "",
          profiles: {
            display_name: lesson?.profiles?.display_name || "Instructor",
          },
        },
      };

      setCertificate(combinedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching certificate:", err);
      setError("An unexpected error occurred while verifying certificate.");
      setLoading(false);
    }
  };

  const shareOnLinkedIn = () => {
    if (!certificate) return;
    const certificateUrl = `${window.location.origin}/certificate/verify/${certificate.serial_number}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}`;
    window.open(linkedInUrl, "_blank", "width=600,height=400");
    toast.success("Opening LinkedIn share dialog...");
  };

  const copyVerificationLink = () => {
    const link = `${window.location.origin}/certificate/verify/${serialNumber}`;
    navigator.clipboard.writeText(link);
    toast.success("Verification link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Verifying certificate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Certificate Not Found</CardTitle>
            <CardDescription>
              {error || "The certificate you're trying to verify doesn't exist or has been revoked."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/arrangely-music-lab">
              <Button>Browse Music Lab</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-12 px-4 mt-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Verification Status */}
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="mx-auto mb-4 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-900">
              Certificate Verified
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              This certificate is authentic and issued by Arrangely
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Certificate Details */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Certificate Details</CardTitle>
            </div>
            <CardDescription>Official completion certificate information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Recipient</p>
                <p className="text-lg font-semibold">{certificate.profiles?.display_name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Course Title</p>
                <p className="text-lg font-semibold">{certificate.lessons?.title}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Instructor</p>
                <p className="text-lg font-semibold">
                  {certificate.lessons?.profiles?.display_name || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Issue Date</p>
                <p className="text-lg font-semibold">
                  {new Date(certificate.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Serial Number</p>
              <Badge variant="outline" className="text-base px-4 py-2 font-mono">
                {certificate.serial_number}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button onClick={shareOnLinkedIn} className="flex-1 min-w-[200px]">
                <Share2 className="h-4 w-4 mr-2" />
                Share on LinkedIn
              </Button>

              <Button
                variant="outline"
                onClick={copyVerificationLink}
                className="flex-1 min-w-[200px]"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Verification Link
              </Button>

              {certificate.certificate_url && (
                <Button variant="outline" asChild className="flex-1 min-w-[200px]">
                  <a
                    href={certificate.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Certificate
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certificate Preview */}
        {certificate.certificate_url && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Certificate Preview</CardTitle>
              <CardDescription>View the official certificate document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[4/3] w-full bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={certificate.certificate_url}
                  className="w-full h-full"
                  title="Certificate Preview"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trust Badge */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-3 text-center">
              <Award className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-semibold text-purple-900">Verified by Arrangely</p>
                <p className="text-sm text-purple-700">
                  This certificate is officially issued and recorded in our system
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
