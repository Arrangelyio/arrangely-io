import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface CertificateData {
  participantName: string;
  lessonTitle: string;
  creatorName: string;
  completionDate: string;
  enrollmentId: string;
  lessonId: string;
  userId: string;
}

// Helper function to load image
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        // Gunakan PNG agar transparansi tetap dipertahankan
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Helper function to add default borders
function addDefaultBorders(doc: jsPDF) {
  doc.setDrawColor("#C8A45D");
  doc.setLineWidth(3);
  doc.rect(2, 2, 293, 206);
}

export async function generateLessonCertificate(
  data: CertificateData
): Promise<string> {
  const {
    participantName,
    lessonTitle,
    creatorName,
    completionDate,
    enrollmentId,
    lessonId,
    userId,
  } = data;

  // Check if certificate already exists
  const { data: existingCert } = await supabase
    .from("lesson_certificates")
    .select("certificate_url")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  if (existingCert?.certificate_url) {
    return existingCert.certificate_url;
  }

  // Fetch lesson details including modules count, duration, difficulty, and category
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      `
      title,
      difficulty_level,
      category,
      duration_minutes,
      lesson_modules!inner(id)
    `
    )
    .eq("id", lessonId)
    .single();

  const modulesCount = lesson?.lesson_modules?.length || 0;
  const durationMinutes = lesson?.duration_minutes || 0;
  const difficultyLevel = lesson?.difficulty_level || "";
  const category = lesson?.category || "";

  // Get default template or a custom one
  const { data: template } = await supabase
    .from("certificate_templates")
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  // Generate serial number in format ARR-MUSIC-LAB-YYYYMMDD-XXXX
  const dateStr = new Date(completionDate)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const serialNumber = `ARR-MUSIC-LAB-${dateStr}-${randomSuffix}`.toUpperCase();

  // Generate verification URL and QR code
  const appDomain = "https://arrangely.io"; // Ganti dengan domain aslimu nanti

  const verificationUrl = `${appDomain}/certificate/verify/${serialNumber}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    width: 150,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Generate PDF certificate
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // If template has background image, add it
  if (template?.background_image_url) {
    try {
      // Load the background image
      const img = await loadImage(template.background_image_url);
      // Add background image to fill the entire page
      doc.addImage(img, "JPEG", 0, 0, 297, 210);
    } catch (error) {
      console.error("Error loading background image:", error);
      // Fall back to white background with borders
      addDefaultBorders(doc);
    }
  } else {
    // Add default border decorations
    addDefaultBorders(doc);
  }

  try {
    const logo = await loadImage("/Final-Logo-Arrangely-Logogram.png");
    doc.addImage(logo, "PNG", 132, 8, 33, 12);
  } catch (error) {
    console.error("Logo not found, skipping:", error);
  }

  // Add ARRANGELY header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 130, 50);
  doc.text("ARRANGELY", 148, 25, { align: "center" });

  // Add serial number below logo
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(serialNumber, 148, 32, { align: "center" });

  // Add main title
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(42, 42, 95);
  doc.text("SERTIFIKAT PENYELESAIAN KELAS", 148, 55, { align: "center" });

  // Add "MURID" label
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(42, 42, 95);
  doc.text("MURID", 148, 68, { align: "center" });

  // Add "Dipersembahkan Kepada"
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Dipersembahkan Kepada", 148, 76, { align: "center" });

  // Add participant name - large and bold
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(42, 42, 95);
  doc.text(participantName, 148, 95, { align: "center" });

  // Add decorative line under name
  doc.setDrawColor(42, 42, 95);
  doc.setLineWidth(1.2);
  doc.line(60, 100, 236, 100);

  // Add completion text with lesson title
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  const completionText = `atas keberhasilannya menyelesaikan kelas ${lessonTitle}`;
  const maxWidth = 200;
  const textLines = doc.splitTextToSize(completionText, maxWidth);
  let currentY = 115;
  textLines.forEach((line: string) => {
    doc.text(line, 148, currentY, { align: "center" });
    currentY += 7;
  });

  // Add duration info
  const durationHours = Math.floor(durationMinutes / 60);
  const durationText =
    durationHours > 0
      ? `Durasi: ${modulesCount} Pelajaran / ${durationHours} Jam`
      : `Durasi: ${modulesCount} Pelajaran / ${durationMinutes} Menit`;

  currentY += 5;
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(durationText, 148, currentY, { align: "center" });

  // Add difficulty level
  const difficultyMap: Record<string, string> = {
    beginner: "pemula",
    intermediate: "menengah",
    advanced: "lanjut",
  };
  const difficultyText =
    difficultyMap[difficultyLevel.toLowerCase()] || difficultyLevel;
  currentY += 6;
  doc.text(`Tingkat : ${difficultyText}`, 148, currentY, { align: "center" });

  // Add category
  currentY += 6;
  doc.text(`Kategori: ${category}`, 148, currentY, { align: "center" });

  // Add completion date
  currentY += 10;
  const formattedDate = new Date(completionDate).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(12);
  doc.text(formattedDate, 148, currentY, { align: "center" });

  // Add QR code centered below date
  currentY += 8;
  doc.addImage(qrCodeDataUrl, "PNG", 135, currentY, 26, 26);

  // Add footer signatures
  const footerY = 190;

  // Left signature - Creator
  doc.setDrawColor(42, 42, 95);
  doc.setLineWidth(0.5);
  doc.line(30, footerY, 90, footerY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(42, 42, 95);
  doc.text("BARRY LIKUMAHUWA", 60, footerY + 5, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Co-Founder", 60, footerY + 10, { align: "center" });

  // Center - QR verification text
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan untuk verifikasi", 148, footerY + 5, { align: "center" });
  doc.text("keaslian sertifikat", 148, footerY + 9, { align: "center" });

  // Right signature - TUTOR
  doc.setDrawColor(42, 42, 95);
  doc.line(206, footerY, 266, footerY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(42, 42, 95);
  doc.text(creatorName.toUpperCase(), 236, footerY + 5, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Pengajar", 236, footerY + 10, { align: "center" });

  // Add footer text
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Powered by ARRANGELY - Empowering Musicians to Learn, Create, and Grow.",
    148,
    205,
    { align: "center" }
  );

  // Convert to blob
  const pdfBlob = doc.output("blob");

  // Upload to Supabase Storage
  const fileName = `${userId}/${serialNumber}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("lesson-certificates")
    .upload(fileName, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading certificate:", uploadError);
    throw new Error("Failed to upload certificate");
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("lesson-certificates")
    .getPublicUrl(fileName);

  const certificateUrl = urlData.publicUrl;

  // Save certificate record
  const { error: certError } = await supabase
    .from("lesson_certificates")
    .upsert({ // <--- MENGUPDATE JIKA SUDAH ADA (ANTI ERROR)
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      user_id: userId,
      certificate_url: certificateUrl,
      serial_number: serialNumber,
      template_id: template?.id,
    }, {
      onConflict: 'enrollment_id' // Pastikan kolom ini unik di DB
    });

  if (certError) {
    console.error("Error saving certificate:", certError);
    throw new Error("Failed to save certificate record");
  }

  return certificateUrl;
}
