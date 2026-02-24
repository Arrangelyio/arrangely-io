import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Calendar,
  Clock,
  Scan
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TicketValidationResult {
  id: string;
  booking_id: string;
  attendee_name: string;
  attendee_email: string;
  qr_code: string;
  status: string;
  check_in_time?: string;
  event: {
    title: string;
    date: string;
    start_time: string;
    location: string;
  };
}

export default function QRValidationMobile() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [qrCode, setQrCode] = useState("");
  const [validationResult, setValidationResult] = useState<TicketValidationResult | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'used'>('idle');
  const [loading, setLoading] = useState(false);
  const [eventTitle, setEventTitle] = useState<string>("");

  useEffect(() => {
    if (eventId) {
      fetchEventTitle();
    }
  }, [eventId]);

  const fetchEventTitle = async () => {
    if (!eventId) return;
    try {
      const { data } = await supabase
        .from("events")
        .select("title")
        .eq("id", eventId)
        .single();
      
      if (data) setEventTitle(data.title);
    } catch (error) {
      console.error("Error fetching event:", error);
    }
  };

  const validateTicket = async (code: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('event_registrations')
        .select(`
          *,
          events(title, date, start_time, location)
        `)
        .eq('qr_code', code);

      // Filter by eventId if provided (for ushers)
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        setValidationStatus('invalid');
        setValidationResult(null);
        toast({
          title: "❌ Invalid QR Code",
          description: eventId 
            ? "QR code not found for this event or invalid"
            : "QR code not found or invalid",
          variant: "destructive"
        });
        return;
      }

      if (data.check_in_time) {
        setValidationStatus('used');
        setValidationResult(data);
        toast({
          title: "⚠️ Already Used",
          description: "This ticket has already been used for check-in",
          variant: "destructive"
        });
        return;
      }

      // Mark as checked in
      const { error: updateError } = await supabase
        .from('event_registrations')
        .update({ check_in_time: new Date().toISOString() })
        .eq('id', data.id);

      if (updateError) throw updateError;

      setValidationStatus('valid');
      setValidationResult({ ...data, check_in_time: new Date().toISOString() });
      
      toast({
        title: "✅ Valid Ticket",
        description: `Welcome ${data.attendee_name}! Checked in successfully.`,
      });

    } catch (error) {
      console.error('Error validating ticket:', error);
      setValidationStatus('invalid');
      toast({
        title: "Error",
        description: "Failed to validate QR code",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = () => {
    if (!qrCode.trim()) return;
    validateTicket(qrCode.trim());
  };

  const resetValidation = () => {
    setQrCode("");
    setValidationResult(null);
    setValidationStatus('idle');
  };

  const getStatusBadge = () => {
    switch (validationStatus) {
      case 'valid':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Invalid</Badge>;
      case 'used':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Already Used</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-8">
        {/* Header */}
        <div className="text-center">
          <QrCode className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-2xl font-bold">Ticket Validation</h1>
          {eventTitle ? (
            <p className="text-muted-foreground">
              Scanning for: <span className="font-semibold">{eventTitle}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Scan or enter QR code to validate event tickets</p>
          )}
        </div>

        {/* QR Code Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="qr-input">QR Code</Label>
              <Input
                id="qr-input"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Scan or manually enter QR code"
                className="font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleValidation}
                disabled={!qrCode.trim() || loading}
                className="flex-1"
              >
                {loading ? "Validating..." : "Validate Ticket"}
              </Button>
              <Button 
                variant="outline"
                onClick={resetValidation}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validationResult && (
          <Card className={`
            ${validationStatus === 'valid' ? 'border-green-500 bg-green-50' : ''}
            ${validationStatus === 'invalid' ? 'border-red-500 bg-red-50' : ''}
            ${validationStatus === 'used' ? 'border-yellow-500 bg-yellow-50' : ''}
          `}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Validation Result</CardTitle>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attendee Info */}
              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                <User className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">{validationResult.attendee_name}</p>
                  <p className="text-sm text-muted-foreground">{validationResult.attendee_email}</p>
                  <p className="text-xs text-muted-foreground">ID: {validationResult.booking_id}</p>
                </div>
              </div>

              {/* Event Info */}
              <div className="space-y-2 p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">{validationResult.event.title}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(validationResult.event.date), 'PPP')} at {validationResult.event.start_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{validationResult.event.location}</span>
                </div>
              </div>

              {/* Check-in Status */}
              {validationResult.check_in_time && (
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-sm font-medium text-green-700">
                    ✅ Checked in at {format(new Date(validationResult.check_in_time), 'PPp')}
                  </div>
                </div>
              )}

              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2 rounded text-center ${
                  validationResult.status === 'confirmed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Payment: {validationResult.status}
                </div>
                <div className={`p-2 rounded text-center ${
                  validationResult.check_in_time 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  Check-in: {validationResult.check_in_time ? 'Complete' : 'Pending'}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Scan the QR code from attendee's ticket</li>
              <li>• Or manually enter the QR code</li>
              <li>• Green = Valid ticket (new check-in)</li>
              <li>• Yellow = Already used (duplicate scan)</li>
              <li>• Red = Invalid or not found</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}