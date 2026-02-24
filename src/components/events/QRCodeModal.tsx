import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useLanguage } from "@/contexts/LanguageContext";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: {
    booking_id: string;
    qr_code: string;
    ticket_number: string;
    attendee_name: string;
    attendee_email?: string;
    event_title: string;
    event_date: string;
    event_location: string;
    status: string;
    check_in_time?: string | null;
    is_vip?: boolean;
    ticket_category_name?: string;
    ticket_type_name?: string;
  };
}

export function QRCodeModal({ isOpen, onClose, ticketData }: QRCodeModalProps) {
  const { t } = useLanguage();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen && ticketData.qr_code) {
      generateQRCode();
    }
  }, [isOpen, ticketData.qr_code]);

  const generateQRCode = async () => {
    try {
      // Use exact same settings as register-for-event edge function
      const qrDataUrl = await QRCode.toDataURL(ticketData.ticket_number, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadTicket = async () => {
    if (!qrCodeDataUrl) return;

    try {
      // Create a canvas to draw the complete ticket
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size (ticket dimensions)
      canvas.width = 600;
      canvas.height = 800;

      // Background - VIP gets gradient background
      if (ticketData.is_vip) {
        // VIP Gradient background
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width,
          canvas.height
        );
        gradient.addColorStop(0, "#fef3c7");
        gradient.addColorStop(0.5, "#fde68a");
        gradient.addColorStop(1, "#fbbf24");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // VIP Border
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      } else {
        // Regular background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Regular Border
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      }

      // Title
      ctx.fillStyle = ticketData.is_vip ? "#92400e" : "#1f2937";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      const titleText = ticketData.is_vip ? "VIP EVENT TICKET" : "EVENT TICKET";
      ctx.fillText(titleText, canvas.width / 2, 60);

      // Event details
      ctx.font = "bold 20px Arial";
      ctx.fillText(ticketData.event_title, canvas.width / 2, 120);

      ctx.font = "16px Arial";
      ctx.fillStyle = "#6b7280";
      ctx.fillText(formatDate(ticketData.event_date), canvas.width / 2, 150);
      ctx.fillText(ticketData.event_location, canvas.width / 2, 180);

      // Status badge
      ctx.fillStyle = ticketData.status === "confirmed" ? "#10b981" : "#6b7280";
      ctx.font = "bold 14px Arial";
      const statusText = ticketData.status.toUpperCase();
      const statusWidth = ctx.measureText(statusText).width;
      ctx.fillRect(
        canvas.width / 2 - statusWidth / 2 - 10,
        195,
        statusWidth + 20,
        25
      );
      ctx.fillStyle = "#ffffff";
      ctx.fillText(statusText, canvas.width / 2, 212);

      // QR Code
      const qrImg = new Image();
      qrImg.onload = () => {
        const qrSize = 200;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 250;

        // QR code background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Ticket details
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(50, 500, canvas.width - 100, 150);
        ctx.strokeStyle = "#e2e8f0";
        ctx.strokeRect(50, 500, canvas.width - 100, 150);

        ctx.fillStyle = "#374151";
        ctx.font = "14px Arial";
        ctx.textAlign = "left";
        ctx.fillText("Booking ID:", 70, 530);
        ctx.fillText("Attendee:", 70, 560);
        ctx.fillText(`Category:`, 70, 590);
        ctx.fillText(`Type:`, 70, 615);
        ctx.fillText(`Email:`, 70, 640);

        ctx.font = "bold 14px Arial";
        ctx.fillText(ticketData.booking_id, 180, 530);
        ctx.fillText(ticketData.attendee_name, 180, 560);
        ctx.fillText(ticketData.ticket_category_name, 180, 590);
        ctx.fillText(ticketData.ticket_type_name, 180, 615);
        ctx.fillText(ticketData.attendee_email, 180, 640);

        // Security notice
        ctx.fillStyle = "#fef3c7";
        ctx.fillRect(50, 680, canvas.width - 100, 80);
        ctx.strokeStyle = "#f59e0b";
        ctx.strokeRect(50, 680, canvas.width - 100, 80);

        ctx.fillStyle = "#92400e";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("SECURITY NOTICE", canvas.width / 2, 705);

        ctx.font = "10px Arial";
        ctx.fillText(
          "This QR code is unique to your ticket.",
          canvas.width / 2,
          725
        );
        ctx.fillText("Do not share with others.", canvas.width / 2, 740);

        // Download the complete ticket
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `ticket-${ticketData.booking_id}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            toast({
              title: "Downloaded!",
              description: "Complete ticket saved to your device",
            });
          }
        });
      };

      qrImg.src = qrCodeDataUrl;
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Error",
        description: "Failed to create ticket image",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {/* Event Ticket - QR Code */}
            {t("myTicket.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div
            className={`text-center space-y-2 ${
              ticketData.is_vip
                ? "bg-gradient-to-br from-yellow-50 via-yellow-100 to-yellow-200 p-4 rounded-lg border-2 border-yellow-300"
                : ""
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <h3 className="font-semibold">{ticketData.event_title}</h3>
              {ticketData.is_vip && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 shadow-md">
                  ✨ VIP ✨
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(ticketData.event_date)}
            </p>
            <p className="text-sm text-muted-foreground">
              {ticketData.event_location}
            </p>
            <Badge
              variant={
                ticketData.status === "confirmed"
                  ? "default"
                  : ticketData.status === "checked_in"
                  ? "default"
                  : "secondary"
              }
            >
              {ticketData.status === "checked_in"
                ? "CHECKED IN"
                : ticketData.status.toUpperCase()}
            </Badge>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {qrCodeDataUrl ? (
              <div
                className={`border rounded-lg p-4 ${
                  ticketData.is_vip
                    ? "bg-gradient-to-br from-yellow-50 to-white border-yellow-300 shadow-lg"
                    : "bg-white"
                }`}
              >
                <img
                  src={qrCodeDataUrl}
                  alt="Event Ticket QR Code"
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-muted">
                <span className="text-muted-foreground">
                  Generating QR code...
                </span>
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div
            className={`rounded-lg p-4 space-y-2 ${
              ticketData.is_vip
                ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200"
                : "bg-muted/50"
            }`}
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-mono">{ticketData.booking_id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {/* Attendee: */}
                {t("myTicket.attendee")}
              </span>
              <div className="flex items-center gap-2">
                <span>{ticketData.attendee_name}</span>
                {ticketData.is_vip && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                  >
                    VIP
                  </Badge>
                )}
              </div>
            </div>
            {ticketData.ticket_category_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {/* Ticket Category: */}
                  {t("myTicket.category")}
                </span>
                <span>{ticketData.ticket_category_name}</span>
              </div>
            )}

            {ticketData.ticket_type_name && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {/* Ticket Type: */}
                  {t("myTicket.type")}
                </span>
                <span>{ticketData.ticket_type_name}</span>
              </div>
            )}

            {ticketData.attendee_email && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email:</span>
                <span>{ticketData.attendee_email}</span>
              </div>
            )}

            {ticketData.check_in_time && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Check-in Time:</span>
                <span className="text-green-600 font-medium">
                  {new Date(ticketData.check_in_time).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              {/* <strong>Security Notice:</strong> This QR code is unique to your
              ticket. Do not share it with others. Present this code at the
              event entrance for verification. */}
              {t("myTicket.security")}
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={downloadTicket}
              className="px-8"
              disabled={!qrCodeDataUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              {/* Download Ticket */}
              {t("myTicket.download")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
