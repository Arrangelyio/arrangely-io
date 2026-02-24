import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, ArrowLeft, Calendar, MapPin, Clock, User, Mail, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CheckinResult {
  success: boolean;
  message?: string;
  error?: string;
  attendee?: {
    name: string;
    email: string;
    bookingId: string;
  };
  event?: {
    title: string;
    date: string;
    location: string;
  };
  checkInTime?: string;
}

export default function AdminCheckinResult() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const isProduction = hostname === "arrangely.io" || hostname === "preview--chord-flow-worship-aid.lovable.app";
  const isStaging = hostname === "staging.arrangely.io";
  const baseUrl = isProduction
    ? "https://arrangely.io"
    : isStaging
    ? "https://staging.arrangely.io"
    : `http://${hostname || "localhost"}:3000`;

  useEffect(() => {
    if (!qrToken) return;

    const processCheckin = async () => {
      try {
        const qrTokenUrl = `${baseUrl}/events/checkin/${qrToken}`;
        const { data, error } = await supabase.functions.invoke('validate-qr-ticket', {
          body: { qrToken: qrTokenUrl }
        });

        if (error) {
          console.error('QR validation error:', error);
          setResult({
            success: false,
            error: 'Failed to validate QR code'
          });
        } else {
          setResult(data);
        }
      } catch (error) {
        console.error('Checkin processing error:', error);
        setResult({
          success: false,
          error: 'An error occurred during check-in'
        });
      } finally {
        setLoading(false);
      }
    };

    processCheckin();
  }, [qrToken, baseUrl]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating QR code...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">No Result</h1>
          <p className="text-muted-foreground mb-4">Unable to process the QR code</p>
          <Button onClick={() => navigate('/admin-dashboard-secure-7f8e2a9c/events')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin-dashboard-secure-7f8e2a9c/events')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {result.success ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {result.success ? 'Check-in Successful' : 'Check-in Failed'}
            </CardTitle>
            <Badge variant={result.success ? "default" : "destructive"} className="mx-auto">
              {result.success ? 'Validated' : 'Invalid'}
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {result.success && result.attendee && result.event ? (
              <>
                {/* Success Message */}
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    {result.message || 'Ticket validated successfully'}
                  </p>
                </div>

                {/* Attendee Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Attendee Information</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.attendee.name}</p>
                        <p className="text-sm text-muted-foreground">Name</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.attendee.email}</p>
                        <p className="text-sm text-muted-foreground">Email</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.attendee.bookingId}</p>
                        <p className="text-sm text-muted-foreground">Booking ID</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Event Information</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.event.title}</p>
                        <p className="text-sm text-muted-foreground">Event Title</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{formatDate(result.event.date)}</p>
                        <p className="text-sm text-muted-foreground">Date</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{result.event.location}</p>
                        <p className="text-sm text-muted-foreground">Location</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check-in Time */}
                {result.checkInTime && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Check-in Details</h3>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{formatDateTime(result.checkInTime)}</p>
                        <p className="text-sm text-muted-foreground">Check-in Time</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Error Message */}
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-red-800 dark:text-red-200 font-medium">
                    {result.error || 'Invalid QR code'}
                  </p>
                </div>

                {/* Show check-in time if ticket was already used */}
                {result.checkInTime && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Previous Check-in</h3>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{formatDateTime(result.checkInTime)}</p>
                        <p className="text-sm text-muted-foreground">Already checked in at</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}