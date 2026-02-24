import { useRef, useEffect } from "react";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface CertificatePreviewProps {
  template: {
    background_image_url?: string | null;
    participant_name_x: number;
    participant_name_y: number;
    participant_name_size: number;
    participant_name_color: string;
    lesson_title_x: number;
    lesson_title_y: number;
    lesson_title_size: number;
    lesson_title_color: string;
    creator_name_x: number;
    creator_name_y: number;
    creator_name_size: number;
    creator_name_color: string;
  };
  sampleData?: {
    participantName?: string;
    lessonTitle?: string;
    creatorName?: string;
    completionDate?: string;
  };
  width?: number;
  height?: number;
}

// Helper function to load image for PDF
function loadImageForPDF(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function CertificatePreview({
  template,
  sampleData = {
    participantName: "Arrangely",
    lessonTitle: "Advanced Piano Techniques",
    creatorName: "Jane Smith",
    completionDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  },
  width = 800,
  height = 600,
}: CertificatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // If there's a background image, load and draw it
    if (template.background_image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawCertificateContent();
      };
      img.onerror = () => {
        // If image fails to load, just draw content on white background with borders
        drawDefaultBorders();
        drawCertificateContent();
      };
      // Handle both absolute URLs and relative paths
      img.src = template.background_image_url.startsWith('http') 
        ? template.background_image_url 
        : template.background_image_url;
    } else {
      drawDefaultBorders();
      drawCertificateContent();
    }

    function drawDefaultBorders() {
      if (!ctx) return;
      const scale = canvas.width / 297;
      
      // Draw border decorations
      ctx.strokeStyle = "#64C8B4";
      ctx.lineWidth = 2;
      ctx.strokeRect(10 * scale, 10 * scale, (277 * scale), (190 * scale));
      ctx.strokeRect(12 * scale, 12 * scale, (273 * scale), (186 * scale));
    }

    function drawCertificateContent() {
      if (!ctx) return;

      // Scale factor from PDF coordinates to canvas (297mm width = 800px)
      const scale = canvas.width / 297;

      // Draw certificate number (top right)
      ctx.font = `${10 * scale}px Helvetica`;
      ctx.fillStyle = "#969696";
      ctx.textAlign = "right";
      ctx.fillText("CERT-XXXXXXXX-XXXXXXXX", 275 * scale, 20 * scale);

      // Draw "CERTIFICATE" title
      ctx.font = `bold ${48 * scale}px Helvetica`;
      ctx.fillStyle = "#505050";
      ctx.textAlign = "center";
      ctx.fillText("CERTIFICATE", 148 * scale, 45 * scale);

      // Draw "OF COMPLETION" subtitle
      ctx.font = `${12 * scale}px Helvetica`;
      ctx.fillStyle = "#646464";
      ctx.fillText("OF COMPLETION", 148 * scale, 55 * scale);

      // Draw "PRESENTED TO" text
      ctx.font = `${11 * scale}px Helvetica`;
      ctx.fillStyle = "#646464";
      ctx.fillText("PRESENTED TO", 148 * scale, 70 * scale);

      // Draw participant name with template settings
      const participantX = (template.participant_name_x / 2.83) * scale;
      const participantY = (template.participant_name_y / 2.83) * scale;
      ctx.font = `bold ${(template.participant_name_size / 2.83) * scale}px Helvetica`;
      ctx.fillStyle = template.participant_name_color;
      ctx.fillText(sampleData.participantName || "PARTICIPANT NAME", participantX, participantY);

      // Draw decorative line under name
      ctx.strokeStyle = "#64C8B4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(60 * scale, 90 * scale);
      ctx.lineTo(236 * scale, 90 * scale);
      ctx.stroke();

      // Draw "FOR SUCCESSFULLY COMPLETING"
      ctx.font = `${11 * scale}px Helvetica`;
      ctx.fillStyle = "#646464";
      ctx.fillText("FOR SUCCESSFULLY COMPLETING", 148 * scale, 102 * scale);

      // Draw lesson title with template settings
      const lessonX = (template.lesson_title_x / 2.83) * scale;
      const lessonY = (template.lesson_title_y / 2.83) * scale;
      ctx.font = `bold ${(template.lesson_title_size / 2.83) * scale}px Helvetica`;
      ctx.fillStyle = template.lesson_title_color;
      
      // Handle multi-line text for long titles
      const lessonTitle = sampleData.lessonTitle || "LESSON TITLE";
      const maxWidth = 180 * scale;
      const words = lessonTitle.split(" ");
      let line = "";
      let y = lessonY;
      const lineHeight = 8 * scale;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, lessonX, y);
          line = words[i] + " ";
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, lessonX, y);

      // Draw completion date
      const detailsY = y + 10 * scale;
      ctx.font = `${12 * scale}px Helvetica`;
      ctx.fillStyle = "#505050";
      ctx.fillText(sampleData.completionDate || "January 1, 2025", 148 * scale, detailsY);

      // Draw creator name with template settings
      const creatorX = (template.creator_name_x / 2.83) * scale;
      const creatorY = (template.creator_name_y / 2.83) * scale;
      ctx.font = `${(template.creator_name_size / 2.83) * scale}px Helvetica`;
      ctx.fillStyle = template.creator_name_color;
      ctx.fillText(
        `Instructor: ${sampleData.creatorName || "Instructor Name"}`,
        creatorX,
        creatorY
      );

      // Draw QR code placeholder in bottom right
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(260 * scale, 175 * scale, 25 * scale, 25 * scale);
      ctx.fillStyle = "#666666";
      ctx.font = `${6 * scale}px Helvetica`;
      ctx.textAlign = "center";
      ctx.fillText("QR", 272.5 * scale, 190 * scale);
      ctx.fillText("Code", 272.5 * scale, 197 * scale);
    }
  }, [template, sampleData, width, height]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border rounded-lg shadow-lg bg-white"
        style={{ aspectRatio: "4/3" }}
      />
    </div>
  );
}

export async function generatePreviewPDF(
  template: CertificatePreviewProps["template"],
  sampleData: CertificatePreviewProps["sampleData"]
): Promise<Blob> {
  const data = {
    participantName: sampleData?.participantName || "Arrangely",
    lessonTitle: sampleData?.lessonTitle || "Advanced Piano Techniques",
    creatorName: sampleData?.creatorName || "Jane Smith",
    completionDate:
      sampleData?.completionDate ||
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
  };

  const serialNumber = "CERT-PREVIEW-SAMPLE";

  // Generate PDF certificate
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // If template has background image, add it
  if (template.background_image_url) {
    try {
      // Load background image
      const img = await loadImageForPDF(template.background_image_url);
      doc.addImage(img, 'JPEG', 0, 0, 297, 210);
    } catch (error) {
      console.error("Error loading background image:", error);
      // Fall back to borders
      doc.setDrawColor(100, 200, 180);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 277, 190);
      doc.rect(12, 12, 273, 186);
    }
  } else {
    // Add border decorations
    doc.setDrawColor(100, 200, 180);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 277, 190);
    doc.rect(12, 12, 273, 186);
  }

  // Add certificate number (top right)
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(serialNumber, 275, 20, { align: "right" });

  // Add "CERTIFICATE" title
  doc.setFontSize(48);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("CERTIFICATE", 148, 45, { align: "center" });

  // Add organization subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("OF COMPLETION", 148, 55, { align: "center" });

  // Add "PRESENTED TO" text
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("PRESENTED TO", 148, 70, { align: "center" });

  // Add participant name
  doc.setFontSize(template.participant_name_size || 32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    parseInt(template.participant_name_color?.slice(1, 3) || "00", 16),
    parseInt(template.participant_name_color?.slice(3, 5) || "00", 16),
    parseInt(template.participant_name_color?.slice(5, 7) || "00", 16)
  );
  doc.text(
    data.participantName.toUpperCase(),
    template.participant_name_x ? template.participant_name_x / 2.83 : 148,
    template.participant_name_y ? template.participant_name_y / 2.83 : 85,
    { align: "center" }
  );

  // Add decorative line under name
  doc.setDrawColor(100, 200, 180);
  doc.setLineWidth(0.8);
  doc.line(60, 90, 236, 90);

  // Add "FOR COMPLETING" text
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("FOR SUCCESSFULLY COMPLETING", 148, 102, { align: "center" });

  // Add lesson title
  doc.setFontSize(template.lesson_title_size || 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    parseInt(template.lesson_title_color?.slice(1, 3) || "64", 16),
    parseInt(template.lesson_title_color?.slice(3, 5) || "C8", 16),
    parseInt(template.lesson_title_color?.slice(5, 7) || "B4", 16)
  );
  const maxWidth = 180;
  const lines = doc.splitTextToSize(data.lessonTitle.toUpperCase(), maxWidth);
  const lineHeight = 8;
  const startY = template.lesson_title_y ? template.lesson_title_y / 2.83 : 112;
  lines.forEach((line: string, index: number) => {
    doc.text(
      line,
      template.lesson_title_x ? template.lesson_title_x / 2.83 : 148,
      startY + index * lineHeight,
      { align: "center" }
    );
  });

  // Add completion date and instructor
  const detailsY = startY + lines.length * lineHeight + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(data.completionDate, 148, detailsY, { align: "center" });

  // Add creator name
  doc.setFontSize(template.creator_name_size || 14);
  doc.setTextColor(
    parseInt(template.creator_name_color?.slice(1, 3) || "64", 16),
    parseInt(template.creator_name_color?.slice(3, 5) || "64", 16),
    parseInt(template.creator_name_color?.slice(5, 7) || "64", 16)
  );
  doc.text(
    `Instructor: ${data.creatorName}`,
    template.creator_name_x ? template.creator_name_x / 2.83 : 148,
    template.creator_name_y ? template.creator_name_y / 2.83 : detailsY + 7,
    { align: "center" }
  );

  // Generate and add QR code for verification
  try {
    const verificationUrl = `${window.location.origin}/certificate/verify/${serialNumber}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 150,
      margin: 1,
    });
    doc.addImage(qrCodeDataUrl, 'PNG', 260, 175, 25, 25);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify", 272.5, 203, { align: "center" });
  } catch (error) {
    console.error("Error generating QR code:", error);
  }

  return doc.output("blob");
}
