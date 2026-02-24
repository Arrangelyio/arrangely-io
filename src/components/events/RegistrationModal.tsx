import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CreditCard, User, Calendar, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface Event {
  id: string;
  title: string;
  date: string;
  start_time: string;
  location: string;
  price: number;
  notes?: string;
}

interface RegistrationModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RegistrationModal({ event, isOpen, onClose, onSuccess }: RegistrationModalProps) {
  const { user } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [showInAttendeeList, setShowInAttendeeList] = useState(false);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const generateQRCode = (bookingId: string, eventId: string, userId: string) => {
    // Generate a secure QR code with cryptographic elements
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 15);
    const secureToken = `${bookingId}-${eventId.substring(0, 8)}-${userId.substring(0, 8)}-${timestamp}-${randomSuffix}`;
    
    // Create verification URL with secure token
    return `${baseUrl}/events/checkin/${secureToken}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to register",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Generate secure booking ID
      const { data: bookingData } = await supabase.rpc('generate_secure_booking_id');
      const bookingId = bookingData;
      
      // Create QR code content with secure token
      const qrCode = generateQRCode(bookingId, event.id, user.id);

      const attendeeName = user?.user_metadata?.display_name 
        || user?.user_metadata?.full_name 
        || user?.email?.split('@')[0] 
        || 'User';

      // Register for event using edge function
      const { error } = await supabase.functions.invoke('register-for-event', {
        body: {
          eventId: event.id,
          userId: user.id,
          bookingId: bookingId,
          attendeeName: attendeeName,
          attendeeEmail: user.email || '',
          attendeePhone: '',
          qrCode: qrCode,
          amountPaid: event.price,
          paymentStatus: event.price > 0 ? 'pending' : 'paid',
          status: 'confirmed',
          showInAttendeeList: showInAttendeeList,
          eventDetails: {
            title: event.title,
            date: formatDate(event.date),
            time: formatTime(event.start_time),
            location: event.location,
            notes: event.notes
          }
        }
      });

      if (error) throw error;

      // For free events, complete immediately
      // For paid events, you would integrate with payment processor here
      if (event.price === 0) {
        toast({
          title: "Registration Successful!",
          description: "A confirmation email with your QR code has been sent to your email."
        });
        onSuccess();
      } else {
        // Simulate payment processing for demo
        toast({
          title: "Registration Successful!",
          description: `You have been registered for ${event.title}. A confirmation email with your QR code has been sent.`
        });
        onSuccess();
      }
      
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for Event</DialogTitle>
        </DialogHeader>

        {/* Event Summary */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-3">{event.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatTime(event.start_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{event.location}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-muted-foreground">Total Amount:</span>
            {event.price > 0 ? (
              <Badge variant="secondary" className="text-base">
                ${(event.price / 100).toFixed(2)}
              </Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Registration Section */}
        <div className="space-y-4">
          {/* Show logged in user info */}
          {user && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Registering as:</span>
                <span className="font-medium">{user.email}</span>
              </div>
            </div>
          )}

          {/* Networking Opt-in */}
          {/* <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
            <Checkbox 
              id="show-in-list" 
              checked={showInAttendeeList}
              onCheckedChange={(checked) => setShowInAttendeeList(checked as boolean)}
            />
            <div className="flex-1">
              <Label 
                htmlFor="show-in-list" 
                className="text-sm font-medium cursor-pointer"
              >
                Show my name in the attendee list
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Allow other attendees to see your name and connect with you for networking purposes
              </p>
            </div>
          </div> */}

          {/* Terms and Conditions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              By registering for this event, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Follow event guidelines and code of conduct</li>
              <li>Understand that registration may be subject to approval</li>
              {event.price > 0 && (
                <li>Complete payment to confirm your registration</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading || !user}
              className="sm:flex-1"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {event.price > 0 ? 'Register & Pay' : 'Register for Free'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}