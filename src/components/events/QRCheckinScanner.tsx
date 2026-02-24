import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QRCameraScanner } from "./QRCameraScanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QRCheckinScannerProps {
  eventId: string;
}

export function QRCheckinScanner({ eventId }: QRCheckinScannerProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  const handleScan = async (qrData: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setShowScanner(false);

    try {
      // Extract token from QR data
      let token = qrData;
      if (qrData.includes('token=')) {
        const urlParams = new URLSearchParams(qrData.split('?')[1]);
        token = urlParams.get('token') || qrData;
      }

      const { data, error } = await supabase.functions.invoke('validate-qr-ticket', {
        body: { qrToken: token },
      });

      if (error) throw error;

      // Show simple dialog
      setDialogMessage({
        success: data.success || false,
        message: data.success ? "Check-in Successful!" : (data.message || "Invalid QR Code"),
      });
      setShowDialog(true);

      if (data.success) {
        toast({
          title: "Success",
          description: `${data.attendeeName} checked in successfully.`,
        });
      }
    } catch (error: any) {
      console.error("Check-in error:", error);
      setDialogMessage({
        success: false,
        message: "Invalid QR Code",
      });
      setShowDialog(true);
      toast({
        title: "Check-in Failed",
        description: "Invalid QR Code",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setDialogMessage(null);
    setShowScanner(true);
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Processing check-in...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-2xl mx-auto">
        {showScanner && <QRCameraScanner onScan={handleScan} />}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {dialogMessage?.success ? "✓ Success" : "✗ Invalid"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-lg font-medium">
              {dialogMessage?.message}
            </p>
            <Button onClick={handleCloseDialog} className="w-full">
              Scan Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
