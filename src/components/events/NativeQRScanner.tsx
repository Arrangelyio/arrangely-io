import { useEffect, useState } from "react";
import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { useCapacitor } from "@/hooks/useCapacitor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NativeQRScannerProps {
  eventId: string;
  onSuccess?: () => void;
}

export default function NativeQRScanner({ eventId, onSuccess }: NativeQRScannerProps) {
  const { isNative } = useCapacitor();
  const [isScanning, setIsScanning] = useState(false);
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    success: boolean;
    message: string;
    attendee?: any;
  }>({ open: false, success: false, message: "" });

  useEffect(() => {
    if (!isNative) return;

    const checkPermissions = async () => {
      const { camera } = await BarcodeScanner.checkPermissions();
      if (camera !== "granted") {
        await BarcodeScanner.requestPermissions();
      }
    };

    checkPermissions();

    return () => {
      if (isScanning) {
        BarcodeScanner.stopScan();
      }
    };
  }, [isNative, isScanning]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      
      // Start scanning - this returns when a barcode is detected
      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      setIsScanning(false);

      if (result.barcodes && result.barcodes.length > 0) {
        const barcode = result.barcodes[0];
        
        await handleScan(barcode.displayValue);
      }
    } catch (error) {
      console.error("Error starting scan:", error);
      toast.error("Failed to start camera");
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    setIsScanning(false);
  };

  const handleScan = async (qrData: string) => {
    try {
      

      // Extract token from QR data
      let token = qrData;
      const urlMatch = qrData.match(/\/qr\/([^/?]+)/);
      if (urlMatch) {
        token = urlMatch[1];
      }

      // Call validation edge function
      const { data, error } = await supabase.functions.invoke(
        "validate-qr-ticket",
        {
          body: { qrToken: token, eventId },
        }
      );

      if (error) throw error;

      if (data.success) {
        setResultDialog({
          open: true,
          success: true,
          message: "Check-in successful!",
          attendee: data.attendee,
        });
        toast.success("Check-in successful!");
        onSuccess?.();
      } else {
        setResultDialog({
          open: true,
          success: false,
          message: data.message || "Check-in failed",
        });
        toast.error(data.message || "Check-in failed");
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setResultDialog({
        open: true,
        success: false,
        message: "Failed to process QR code",
      });
      toast.error("Failed to process QR code");
    }
  };

  if (!isNative) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Button onClick={startScan} className="w-full" size="sm">
        <Camera className="mr-2 h-5 w-5" />
        Start QR Scanner
      </Button>

      <Dialog open={resultDialog.open} onOpenChange={(open) => setResultDialog({ ...resultDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resultDialog.success ? "✅ Check-in Successful" : "❌ Check-in Failed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>{resultDialog.message}</p>
            {resultDialog.attendee && (
              <div className="space-y-2">
                <p><strong>Name:</strong> {resultDialog.attendee.name}</p>
                <p><strong>Email:</strong> {resultDialog.attendee.email}</p>
              </div>
            )}
            <Button onClick={() => setResultDialog({ ...resultDialog, open: false })} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
