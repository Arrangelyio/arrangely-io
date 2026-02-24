import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import nodemailer from "https://esm.sh/nodemailer@6.9.8";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    // Use service role for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );
    // 1. Data eventDetails dari client tidak akan kita gunakan untuk hal sensitif (seperti tanggal/waktu)
    const { paymentId, eventId, userId, tickets, amountPaid } =
      await req.json();
    
    // Get payment to check status
    const { data: payment, error: paymentError } = await supabaseService
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();
    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }
    if (payment.status !== "paid") {
      throw new Error("Payment must be in paid status");
    }
    // 2. 🔽 [PERBAIKAN] Ambil data event yang valid langsung dari database 🔽
    const { data: eventData, error: eventError } = await supabaseService
      .from("events")
      .select("title, date, start_time, end_time, location, notes")
      .eq("id", eventId)
      .single();
    if (eventError || !eventData) {
      console.error("Failed to fetch event data:", eventError);
      throw new Error("Event not found");
    }
    // 🔼 [AKHIR PERBAIKAN] 🔼
    // Generate booking ID and QR token
    const bookingId = `EVT-${Date.now()}-${userId.substring(0, 6)}`;
    const qrToken = `${bookingId}-${crypto.randomUUID()}`;
    // Create event registration
    const { data: registration, error: regError } = await supabaseService
      .from("event_registrations")
      .insert({
        event_id: eventId,
        user_id: userId,
        booking_id: bookingId,
        qr_code: qrToken,
        attendee_name: tickets[0].participant_name,
        attendee_email: tickets[0].participant_email,
        attendee_phone: tickets[0].participant_phone || "",
        status: "confirmed",
        payment_status: "paid",
        amount_paid: amountPaid,
        is_production: payment.is_production,
      })
      .select()
      .single();
    if (regError) {
      console.error("Failed to create registration:", regError);
      throw new Error("Failed to create event registration");
    }
    console.log(
      `✅ Created registration ${registration.id} with booking ID ${bookingId}`
    );
    // Validate ticket categories before processing
    const categoryIds = tickets.map((t) => t.ticket_category_id);
    const { data: categories, error: categoriesError } = await supabaseService
      .from("event_ticket_categories")
      .select("id, sale_start_date, sale_end_date, is_active")
      .in("id", categoryIds);
    if (categoriesError || !categories?.length) {
      throw new Error("Failed to fetch ticket categories");
    }
    // Validate sales period for all categories
    const now = new Date();
    for (const ticket of tickets) {
      const category = categories.find(
        (c) => c.id === ticket.ticket_category_id
      );
      if (!category) {
        throw new Error(
          `Invalid ticket category: ${ticket.ticket_category_id}`
        );
      }
      if (!category.is_active) {
        throw new Error(`Ticket category is not active`);
      }
      if (
        category.sale_start_date &&
        new Date(category.sale_start_date) > now
      ) {
        throw new Error(`Ticket sales for this category have not started yet`);
      }
      if (category.sale_end_date && new Date(category.sale_end_date) < now) {
        throw new Error(`Ticket sales for this category have ended`);
      }
    }
    
    // Create tickets for each ticket (quota already booked during payment creation)
    const createdTickets = [];
    for (const ticket of tickets) {
      // Insert ticket first to get the ticket_number
      const { data: createdTicket, error: ticketError } = await supabaseService
        .from("event_tickets")
        .insert({
          event_id: eventId,
          payment_id: paymentId,
          registration_id: registration.id,
          ticket_category_id: ticket.ticket_category_id,
          buyer_user_id: userId,
          participant_name: ticket.participant_name,
          participant_email: ticket.participant_email,
          participant_phone: ticket.participant_phone,
          participant_ktp: ticket.participant_ktp || null,
          status: "paid",
          is_production: payment.is_production,
        })
        .select()
        .single();
      if (ticketError) {
        console.error("Failed to create ticket:", ticketError);
        throw new Error("Failed to create event ticket");
      }
      // Now generate QR code using the ticket_number
      const qrCodeDataUrl = await QRCode.toDataURL(
        createdTicket.ticket_number,
        {
          width: 200,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }
      );
      // Update the ticket with the QR code
      const { error: updateError } = await supabaseService
        .from("event_tickets")
        .update({
          qr_code_data: qrCodeDataUrl,
        })
        .eq("id", createdTicket.id);
      if (updateError) {
        console.error("Failed to update ticket QR code:", updateError);
      }
      createdTickets.push({
        ...createdTicket,
        qr_code_data: qrCodeDataUrl,
      });
      console.log(
        `✅ Created ticket ${createdTicket.ticket_number} with QR code`
      );
    }
    // Mark quota as used
    const { data: useQuotaResult, error: useQuotaError } =
      await supabaseService.rpc("use_event_quota", {
        p_payment_id: paymentId,
      });
    if (useQuotaError || !useQuotaResult?.success) {
      console.error(
        "Error marking quota as used:",
        useQuotaError || useQuotaResult
      );
    } else {
      
    }
    // Fetch category details for PDF generation
    const ticketCategoryIds = [
      ...new Set(createdTickets.map((t) => t.ticket_category_id)),
    ];
    const { data: ticketCategories, error: categoriesFetchError } =
      await supabaseService
        .from("event_ticket_categories")
        .select("id, name, price")
        .in("id", ticketCategoryIds);
    if (categoriesFetchError) {
      console.error("Failed to fetch ticket categories:", categoriesFetchError);
    }
    // 3. 🔽 [PERBAIKAN] Format tanggal & waktu di server 🔽
    let formattedDate = "N/A";
    let formattedTime = "N/A";
    try {
      // Ganti '-' dengan '/' agar kompatibel di semua JavaScript engine
      formattedDate = new Date(
        eventData.date.replace(/-/g, "/")
      ).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const startTime = new Date(
        `${eventData.date}T${eventData.start_time}`
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = eventData.end_time
        ? new Date(
            `${eventData.date}T${eventData.end_time}`
          ).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : null;
      formattedTime = endTime ? `${startTime} - ${endTime}` : startTime;
    } catch (e) {
      console.error("Date formatting error:", e);
      formattedDate = eventData.date; // Fallback jika gagal
      formattedTime = eventData.start_time;
    }
    // Buat objek eventDetails yang valid untuk email & PDF
    const authoritativeEventDetails = {
      title: eventData.title,
      date: formattedDate,
      time: formattedTime,
      location: eventData.location,
      notes: eventData.notes || "",
    };
    // Gunakan notes dari server
    const eventNotes = authoritativeEventDetails.notes;
    // 🔼 [AKHIR PERBAIKAN] 🔼
    // 4. [PERBAIKAN] Generate PDFs dengan data yang sudah valid
    const receiptPdfArrayBuffer = generateReceiptPDF({
      bookingId,
      attendeeName: tickets[0].participant_name,
      attendeeEmail: tickets[0].participant_email,
      attendeePhone: tickets[0].participant_phone,
      eventDetails: authoritativeEventDetails,
      amountPaid,
      paymentStatus: "paid",
    });
    const ticketPdfArrayBuffer = await generateTicketPDF({
      bookingId,
      attendeeName: tickets[0].participant_name,
      attendeeEmail: tickets[0].participant_email,
      eventDetails: authoritativeEventDetails,
      amountPaid,
      createdTickets,
      ticketCategories: ticketCategories || [],
    });
    // Convert ArrayBuffer to Uint8Array for nodemailer
    const receiptPdf = new Uint8Array(receiptPdfArrayBuffer);
    const ticketPdf = new Uint8Array(ticketPdfArrayBuffer);
    try {
      // Send confirmation email with PDF attachments
      const transporter = nodemailer.createTransport({
        host: "smtp.mailgun.org",
        port: 587,
        secure: false,
        auth: {
          user: "info@mg.arrangely.io",
          pass: Deno.env.get("SMTP_MAILGUN_PASSWORD"),
        },
      });
      // 5. 🔽 [PERBAIKAN] Gunakan data yang valid di HTML 🔽
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: bold; color: #667eea; }
              .booking-id { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Event Registration Confirmed!</h1>
                <p>Your ticket is ready</p>
              </div>
              <div class="content">
                <p>Dear ${tickets[0].participant_name},</p>
                <p>Thank you for registering! Your ticket and receipt are attached to this email.</p>
                
                <div class="details">
                  <div class="detail-row">
                    <span class="detail-label">Event:</span>
                    <span>${authoritativeEventDetails.title}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span>${authoritativeEventDetails.date}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span>${authoritativeEventDetails.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span>${authoritativeEventDetails.location}</span>
                  </div>
                </div>

                <div class="booking-id">
                  Booking ID: ${bookingId}
                </div>

                <p>Please find your event ticket and receipt attached. Present the ticket at the event entrance.</p>
                ${
                  eventNotes
                    ? `
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">📝 Important Notes:</p>
                  <p style="margin: 10px 0 0 0; color: #856404; white-space: pre-wrap;">${eventNotes}</p>
                </div>
                `
                    : ""
                }
                <p>We look forward to seeing you at the event!</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      // 🔼 [AKHIR PERBAIKAN] 🔼
      await transporter.sendMail({
        from: '"Arrangely" <info@arrangely.io>',
        to: tickets[0].participant_email,
        subject: `Registration Confirmed - ${authoritativeEventDetails.title}`,
        html: htmlContent,
        attachments: [
          {
            filename: `Event-Ticket-${bookingId}.pdf`,
            content: ticketPdf,
            contentType: "application/pdf",
          },
          {
            filename: `Receipt-${bookingId}.pdf`,
            content: receiptPdf,
            contentType: "application/pdf",
          },
        ],
      });
      
    } catch (emailError) {
      console.error("⚠️ Failed to send email:", emailError);
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration successful and email sent",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in register-for-event:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
// ----------------------------------------------------------------
// FUNGSI HELPER (TIDAK ADA PERUBAHAN)
// ----------------------------------------------------------------

// GANTI FUNGSI INI
// GANTI FUNGSI INI
function addWatermark(doc, pageHeight, pageWidth) {
  // PERBAIKAN: Dibuat SUPER RAPAT
  doc.setTextColor(240, 240, 240); // Sedikit lebih gelap agar terlihat
  doc.setFontSize(16); // Ukuran tetap kecil
  doc.setFont(undefined, "bold"); // Tetap bold
  const watermarkText = "ARRANGELY";
  const angle = -30;

  // Jarak antar teks (step) dibuat SANGAT RAPAT
  const yStep = 22; // Jarak vertikal sangat rapat (sebelumnya 28)
  const xStep = 55; // Jarak horizontal sangat rapat (sebelumnya 75)

  const rows = Math.ceil(pageHeight / yStep) + 4; // +4 agar 100% penuh
  const cols = Math.ceil(pageWidth / xStep) + 4; // +4 agar 100% penuh

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      // Pola staggered (zig-zag / bata)
      // Kita kurangi juga offset 'x'-nya agar lebih penuh di kiri
      const x = j * xStep - (i % 2 === 0 ? xStep / 2 : xStep / 4);

      // Kita mulai dari Y negatif agar bagian atas juga penuh
      const y = i * yStep - 10; // Mulai sedikit di atas 0

      doc.text(watermarkText, x, y, {
        angle: angle,
      });
    }
  }
}

// FUNGSI 2: generateReceiptPDF (HEADER BIRU)
function generateReceiptPDF(data) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Add watermark (memanggil fungsi baru di atas)
  addWatermark(doc, pageHeight, pageWidth);

  // Reset color for content
  doc.setTextColor(0, 0, 0);
  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.setTextColor(37, 99, 235); // PERBAIKAN: Set warna biru
  doc.text("ARRANGELY", 15, 20);
  doc.setTextColor(0, 0, 0); // PERBAIKAN: Reset ke hitam

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text("Bukti Pembelian / Receipt", pageWidth - 15, 16, {
    align: "right",
  });
  doc.text(`No Order / Order Number : ${data.bookingId}`, pageWidth - 15, 22, {
    align: "right",
  });
  doc.text(
    `Tanggal / Date : ${new Date().toLocaleDateString()}`,
    pageWidth - 15,
    28,
    {
      align: "right",
    }
  );
  doc.text(data.eventDetails.title, pageWidth - 15, 34, {
    align: "right",
    maxWidth: 80,
  });
  // Buyer Information Section
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("Informasi Pembeli / Buyer Information", 15, 55);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(data.attendeeName, 15, 65);
  doc.text(data.attendeeEmail, 15, 72);
  if (data.attendeePhone) {
    doc.text(data.attendeePhone, 15, 79);
  }
  // Payment Information - Two columns
  const leftCol = 15;
  const rightCol = 110;
  doc.setFontSize(10);
  doc.text("Metode Pembayaran /", leftCol, 95);
  doc.text("Payment Method", leftCol, 101);
  doc.setFont(undefined, "bold");
  doc.text("Free", leftCol, 109);
  doc.setFont(undefined, "normal");
  doc.text("Status Pembayaran", rightCol, 95);
  doc.text("/ Payment Status", rightCol, 101);
  doc.setFont(undefined, "bold");
  doc.text(
    data.paymentStatus === "paid" ? "Lunas / Paid" : "Pending",
    rightCol,
    109
  );
  // Items table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 125, pageWidth - 30, 8, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.text("Item", 18, 130);
  doc.text("Qty", 110, 130);
  doc.text("Price", 135, 130);
  doc.text("Subtotal", pageWidth - 18, 130, {
    align: "right",
  });
  // Items table content
  doc.setFont(undefined, "normal");
  doc.text(data.eventDetails.title, 18, 142, {
    maxWidth: 85,
  });
  doc.text("1", 110, 142);
  doc.text(`Rp ${data.amountPaid}`, 135, 142);
  doc.text(`Rp ${data.amountPaid}`, pageWidth - 18, 142, {
    align: "right",
  });
  // Totals section
  const totalsY = 165;
  doc.text("Subtotal", 18, totalsY);
  doc.text(`Rp ${data.amountPaid}`, pageWidth - 18, totalsY, {
    align: "right",
  });
  doc.text("Biaya Layanan / Service Fee", 18, totalsY + 8);
  doc.text("Rp 0", pageWidth - 18, totalsY + 8, {
    align: "right",
  });
  // Total with background
  doc.setFillColor(240, 240, 240);
  doc.rect(15, totalsY + 15, pageWidth - 30, 10, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(12);
  doc.text(`Total: Rp ${data.amountPaid}`, pageWidth - 18, totalsY + 22, {
    align: "right",
  });
  // Payment status badge - elegant rounded rectangle
  if (data.paymentStatus === "paid") {
    doc.setFillColor(46, 125, 50);
    doc.roundedRect(15, 195, 50, 12, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("LUNAS / PAID", 40, 203, {
      align: "center",
    });
  }
  // Footer
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text("PT Nada Karya Digital", 15, pageHeight - 15);
  doc.text("www.arrangely.io", 15, pageHeight - 10);
  doc.text("Arrangely", 70, pageHeight - 15);
  doc.text("Email", 140, pageHeight - 15);
  doc.text("info@arrangely.io", 140, pageHeight - 10);
  return doc.output("arraybuffer");
}

// FUNGSI 3: generateTicketPDF (HEADER BIRU)
async function generateTicketPDF(data) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const createdTickets = data.createdTickets || [];
  const ticketCategories = data.ticketCategories || [];
  // Group tickets by category
  const ticketsByCategory = new Map();
  createdTickets.forEach((ticket) => {
    const categoryId = ticket.ticket_category_id;
    if (!ticketsByCategory.has(categoryId)) {
      ticketsByCategory.set(categoryId, []);
    }
    ticketsByCategory.get(categoryId).push(ticket);
  });
  let isFirstPage = true;
  // Generate a page for each category
  for (const [categoryId, tickets] of ticketsByCategory) {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;
    // Find category details
    const category = ticketCategories.find((c) => c.id === categoryId);
    // [PERBAIKAN KECIL] ganti 'category_name' ke 'name'
    const categoryName = category?.name || "General Admission";
    const categoryPrice = category?.price || 0;

    // Add watermark
    addWatermark(doc, pageHeight, pageWidth);
    doc.setTextColor(0, 0, 0);

    // Header
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.setTextColor(37, 99, 235); // PERBAIKAN: Set warna biru
    doc.text("ARRANGELY", pageWidth - 15, 18, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0); // PERBAIKAN: Reset ke hitam

    // Category Title
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.setFont(undefined, "bold");
    doc.text(categoryName, 15, 25);
    // Order details - top right
    let rightY = 35;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Order No. / No. Pesanan", 120, rightY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(data.bookingId, 120, rightY + 6);
    rightY += 18;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Tickets in this category", 120, rightY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(`${tickets.length}`, 120, rightY + 6);
    // Display tickets with QR codes
    let yPos = 70;
    const qrSize = 50;
    const leftMargin = 15;
    const detailsX = leftMargin + qrSize + 15;
    tickets.forEach((ticket, index) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        addWatermark(doc, pageHeight, pageWidth);
        doc.setTextColor(0, 0, 0);
        // Repeat header on new page
        doc.setFontSize(14);
        doc.setFont(undefined, "bold");
        doc.setTextColor(37, 99, 235); // PERBAIKAN: Set warna biru
        doc.text("ARRANGELY", pageWidth - 15, 18, {
          align: "right",
        });
        doc.setTextColor(0, 0, 0); // PERBAIKAN: Reset ke hitam
        doc.setFontSize(16);
        doc.setTextColor(37, 99, 235);
        doc.text(categoryName, 15, 25);
        yPos = 45;
      }
      // QR Code
      if (ticket.qr_code_data) {
        doc.addImage(
          ticket.qr_code_data,
          "PNG",
          leftMargin,
          yPos,
          qrSize,
          qrSize
        );
      }
      // Ticket details next to QR
      let detailY = yPos + 5;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Ticket Number", detailsX, detailY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text(ticket.ticket_number, detailsX, detailY + 6);
      detailY += 14;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Participant Name", detailsX, detailY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text(ticket.participant_name || "N/A", detailsX, detailY + 6, {
        maxWidth: pageWidth - detailsX - 15,
      });
      detailY += 14;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.setFont(undefined, "normal");
      doc.text("Email", detailsX, detailY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      doc.text(ticket.participant_email || "N/A", detailsX, detailY + 6, {
        maxWidth: pageWidth - detailsX - 15,
      });
      // Draw separator line
      yPos += qrSize + 10;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, yPos, pageWidth - 15, yPos);
      yPos += 15;
    });
    // Event Details Section (after all tickets in category)
    // [PERBAIKAN] Cek jika yPos terlalu ke bawah, pindah ke halaman baru
    if (yPos > pageHeight - 90) {
      doc.addPage();
      addWatermark(doc, pageHeight, pageWidth);
      doc.setTextColor(0, 0, 0);
      yPos = 30;
    }
    // Divider before event details
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 15;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont(undefined, "bold");
    doc.text("Event Details", 15, yPos);
    yPos += 10;
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text(data.eventDetails.title, 15, yPos, {
      maxWidth: pageWidth - 30,
    });
    yPos += 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Date & Time", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(
      `${data.eventDetails.date} @ ${data.eventDetails.time}`,
      15,
      yPos + 6
    );
    yPos += 16;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Location", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(data.eventDetails.location, 15, yPos + 6, {
      maxWidth: pageWidth - 30,
    });
    yPos += 16;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Category Price", 15, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(
      categoryPrice === 0
        ? "FREE"
        : `Rp ${categoryPrice.toLocaleString("id-ID")}`,
      15,
      yPos + 6
    );
    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.text("PT Nada Karya Digital", 15, pageHeight - 15);
    doc.text("www.arrangely.io", 70, pageHeight - 15);
    doc.text("Email: info@arrangely.io", 145, pageHeight - 15);
  }
  // Page 2 - Order Information
  doc.addPage();
  addWatermark(doc, pageHeight, pageWidth);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.setTextColor(37, 99, 235); // PERBAIKAN: Set warna biru
  doc.text("ARRANGELY", pageWidth - 15, 18, {
    align: "right",
  });
  doc.setTextColor(0, 0, 0); // PERBAIKAN: Reset ke hitam

  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.text("Order Information / Informasi Pesanan", 15, 30);
  // Experience details
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont(undefined, "normal");
  doc.text("Experience Name / Nama Aktivitas", 15, 45);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.eventDetails.title, 80, 45, {
    maxWidth: pageWidth - 95,
  });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Ticket Type / Jenis Tiket", 15, 60);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  // [PERBAIKAN KECIL] Tampilkan semua nama kategori
  doc.text(ticketCategories.map((c) => c.name).join(", "), 80, 60, {
    maxWidth: pageWidth - 95,
  });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Order No. / No. Pesanan", 15, 75);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.bookingId, 80, 75);
  // Buyer contact section
  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.setFont(undefined, "bold");
  doc.text("Buyer Contact / Kontak Pembeli", 15, 95);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont(undefined, "normal");
  doc.text("Name / Nama", 15, 110);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.attendeeName, 80, 110);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Email", 15, 123);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.attendeeEmail, 80, 123);
  // Location section
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Location / Lokasi", 15, 145);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.eventDetails.location, 15, 153);
  if (data.eventDetails.address) {
    doc.text(data.eventDetails.address, 15, 161, {
      maxWidth: pageWidth - 30,
    });
  }
  // Footer
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text("PT Nada Karya Digital", 15, pageHeight - 15);
  doc.text("arrangely.io", 70, pageHeight - 15);
  doc.text("Email: info@arrangely.io", 145, pageHeight - 15);
  return doc.output("arraybuffer");
}
