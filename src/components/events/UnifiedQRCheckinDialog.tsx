import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Keyboard,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UnifiedQRCheckinDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ResultData = {
  status: "success" | "warning" | "failed";
  title: string;
  message: string;
  attendeeName?: string;
  attendeeEmail?: string;
  isVip?: boolean;
  ticketCategory?: string;
  ticketType?: string;
};

export function UnifiedQRCheckinDialog({
  eventId,
  open,
  onOpenChange,
  onSuccess,
}: UnifiedQRCheckinDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const scanningStopped = useRef(false);

  useEffect(() => {
    if (open && activeTab === "camera" && !isProcessing && !showResultDialog) {
      const timeoutId = setTimeout(() => {
        initializeScanner();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        cleanupScanner();
      };
    } else {
      cleanupScanner();
    }
  }, [open, activeTab, isProcessing, showResultDialog]);

  const initializeScanner = () => {
    const element = document.getElementById("qr-reader");
    if (!element) {
      setTimeout(initializeScanner, 100);
      return;
    }

    if (scanner) return;

    try {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          if (scanningStopped.current) return; // <-- ignore if paused
          handleScan(decodedText);
        },
        () => {}
      );

      setScanner(html5QrcodeScanner);
      scanningStopped.current = false;
    } catch (error) {
      console.error("Error initializing scanner:", error);
    }
  };

  const cleanupScanner = async () => {
    scanningStopped.current = true;
    if (scanner) {
      try {
        await scanner.clear();
      } catch (error) {
        console.error("Error clearing scanner:", error);
      }
      setScanner(null);
    }
  };

  const handleScan = async (qrData: string) => {
    if (isProcessing || scanningStopped.current) return;
    scanningStopped.current = true;
    setIsProcessing(true);
    cleanupScanner();

    try {
      let token = qrData;
      if (qrData.includes("token=")) {
        const urlParams = new URLSearchParams(qrData.split("?")[1]);
        token = urlParams.get("token") || qrData;
      }

      const { data, error } = await supabase.functions.invoke(
        "validate-qr-ticket",
        {
          body: { qrToken: token, eventId },
        }
      );

      // Tangani error 500 (server crash) atau network
      if (error) throw error;

      // Logika baru berdasarkan respons JSON
      if (data.success) {
        // --- KASUS SUKSES ---
        const attendeeName = data.attendee?.name;
        setResultData({
          status: "success",
          title: "Check-in Successful!",
          message: data.message || "Ticket validated successfully.",
          attendeeName: attendeeName,
          attendeeEmail: data.attendee?.email,
          isVip: data.attendee?.isVip,
          ticketCategory: data.attendee?.ticketCategory,
          ticketType: data.attendee?.ticketType,
        });
        toast({
          title: "Success",
          description: `${attendeeName} checked in successfully.`,
        });
        onSuccess?.();
      } else {
        // --- KASUS VALIDASI GAGAL (tapi server 200 OK) ---
        const attendeeName = data.attendee?.name;

        // ✅ INI LOGIKA BARU ANDA (WARNING KUNING)
        if (data.error === "Ticket already used" && data.checkInTime) {
          const checkInDate = new Date(data.checkInTime);
          const message = `Already checked in on ${checkInDate.toLocaleDateString()} at ${checkInDate.toLocaleTimeString()}`;
          setResultData({
            status: "warning",
            title: "Already Checked In",
            message: message,
            attendeeName: attendeeName, // Tampilkan data attendee
            attendeeEmail: data.attendee?.email,
            isVip: data.attendee?.isVip,
            ticketCategory: data.attendee?.ticketCategory,
            ticketType: data.attendee?.ticketType,
          });
          toast({
            title: "Ticket Already Used",
            description: `${attendeeName} - ${message}`,
          });
        } else {
          // --- KASUS GAGAL TOTAL (MERAH) ---
          const errorMessage = data.error || "Invalid QR Code";
          setResultData({
            status: "failed",
            title: "Check-in Failed",
            message: errorMessage,
          });
          toast({
            title: "Check-in Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
      setShowResultDialog(true);
    } catch (error: any) {
      // --- KASUS ERROR 500 / NETWORK ---
      console.error("Check-in error:", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      setResultData({
        status: "failed",
        title: "Error",
        message: errorMessage,
      });
      setShowResultDialog(true);
      toast({
        title: "Check-in Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode("");
    }
  };

  const handleCloseResultDialog = () => {
    setShowResultDialog(false);
    setResultData(null);
    setTimeout(() => {
      scanningStopped.current = true;
      if (activeTab === "camera" && open) {
        initializeScanner();
      }
    }, 300);
  };

  const handleMainDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      cleanupScanner();
    }
    onOpenChange(isOpen);
  };

  const ResultIcon = () => {
    if (!resultData) return null;
    switch (resultData.status) {
      case "success":
        return <CheckCircle2 className="w-16 h-16 text-green-600" />;
      case "warning":
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-16 h-16 text-red-600" />;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleMainDialogClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>QR Code Check-in</DialogTitle>
            <DialogDescription className="text-left">
              Scan a ticket QR code or enter the code manually.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera" className="gap-2">
                <Camera className="w-4 h-4" /> Camera
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Keyboard className="w-4 h-4" /> Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="space-y-4">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg text-muted-foreground">
                    Processing check-in...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">QR Code Scanner</h3>
                    <p className="text-sm text-muted-foreground">
                      Point your camera at a QR code to scan
                    </p>
                  </div>
                  <div id="qr-reader" className="w-full"></div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  <Keyboard className="w-16 h-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the QR code manually
                  </p>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter QR code or booking ID"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={handleManualSubmit}
                    disabled={!manualCode.trim() || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                        Processing...
                      </>
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ✅ Result Dialog - blocks scanner until closed */}
      <Dialog open={showResultDialog} onOpenChange={handleCloseResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <ResultIcon />
            <DialogTitle className="text-2xl font-bold">
              {resultData?.title}
            </DialogTitle>
            <DialogDescription>{resultData?.message}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {/* Tampilkan info attendee jika SUKSES atau WARNING */}
            {(resultData?.status === "success" ||
              resultData?.status === "warning") && (
              <div className="w-full space-y-4">
                {resultData.isVip && (
                  <div className="w-full text-center py-3 px-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500 rounded-lg">
                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">
                      ⭐ VIP Guest ⭐
                    </p>
                  </div>
                )}
                {resultData.attendeeName && (
                  <div className="w-full space-y-2 rounded-lg border bg-muted/50 p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Name:
                      </span>
                      <span className="font-medium">
                        {resultData.attendeeName}
                      </span>
                    </div>
                    {resultData.attendeeEmail && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Email:
                        </span>
                        <span className="font-medium text-sm">
                          {resultData.attendeeEmail}
                        </span>
                      </div>
                    )}
                    {resultData.ticketCategory && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Category:
                        </span>
                        <span className="font-medium text-sm">
                          {resultData.ticketCategory}
                        </span>
                      </div>
                    )}
                    {resultData.ticketType && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Type:
                        </span>
                        <span className="font-medium text-sm">
                          {resultData.ticketType}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleCloseResultDialog} className="w-full">
              Scan Another
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
