import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import nodemailer from "nodemailer";
import { jsPDF } from "npm:jspdf";
import QRCode from "npm:qrcode";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const parseJakartaTimestamp = (ts)=>{
  if (!ts) return null;
  const localDate = new Date(ts.replace(" ", "T"));
  // Tambahkan offset +7 jam karena Asia/Jakarta = UTC+7
  return new Date(localDate.getTime() - 7 * 60 * 60 * 1000);
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Missing authorization header"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    const { eventId, tickets } = await req.json();
    if (!eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      throw new Error("Invalid request: eventId and tickets array required");
    }
    
    // Check if user already registered for this free event
    const { data: existingRegistration, error: checkError } = await supabase.from("event_registrations").select("id, booking_id").eq("event_id", eventId).eq("user_id", user.id).eq("payment_status", "free").maybeSingle();
    if (checkError) {
      console.error("Error checking existing registration:", checkError);
      throw new Error("Failed to check existing registration");
    }
    if (existingRegistration) {
      return new Response(JSON.stringify({
        error: "You are already registered for this free event",
        booking_id: existingRegistration.booking_id
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    // Fetch event details
    const { data: event, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (eventError || !event) {
      throw new Error("Event not found");
    }
    // Validate all tickets are free (price = 0)
    const categoryIds = tickets.map((t)=>t.ticket_category_id);
    const { data: categories, error: categoriesError } = await supabase.from("event_ticket_categories").select("id, name, price, remaining_quota, is_active, sale_start_date, sale_end_date").in("id", categoryIds);
    if (categoriesError || !categories?.length) {
      throw new Error("Failed to fetch ticket categories");
    }
    // Check all tickets are free
    const nonFreeTickets = categories.filter((cat)=>cat.price > 0);
    if (nonFreeTickets.length > 0) {
      throw new Error("This endpoint only handles free events");
    }
    // Validate sales period and quota
    const now = new Date();
    for (const ticket of tickets){
      const category = categories.find((c)=>c.id === ticket.ticket_category_id);
      if (!category) throw new Error(`Invalid ticket category: ${ticket.ticket_category_id}`);
      if (!category.is_active) throw new Error(`Ticket category is not active`);
      const saleStart = parseJakartaTimestamp(category.sale_start_date);
      const saleEnd = parseJakartaTimestamp(category.sale_end_date);
      if (saleStart && saleStart > now) {
        throw new Error(`Ticket sales for this category have not started yet`);
      }
      if (saleEnd && saleEnd < now) {
        throw new Error(`Ticket sales for this category have ended`);
      }
      if (category.remaining_quota !== null && category.remaining_quota < 1) {
        throw new Error(`Ticket category ${category.name} is sold out`);
      }
    }
    
    // Generate booking ID and QR token
    const bookingId = `EVT-FREE-${Date.now()}-${user.id.substring(0, 6)}`;
    const qrToken = `${bookingId}-${crypto.randomUUID()}`;
    // Create event registration
    const { data: registration, error: regError } = await supabase.from("event_registrations").insert({
      event_id: eventId,
      user_id: user.id,
      booking_id: bookingId,
      qr_code: qrToken,
      attendee_name: tickets[0].participant_name,
      attendee_email: tickets[0].participant_email,
      attendee_phone: tickets[0].participant_phone || "",
      status: "confirmed",
      payment_status: "free",
      amount_paid: 0,
      is_production: true
    }).select().single();
    if (regError) {
      console.error("Failed to create registration:", regError);
      throw new Error("Failed to create event registration");
    }
    
    // Create tickets and deduct quota
    const createdTickets = [];
    for (const ticket of tickets){
      // Insert ticket
      const { data: createdTicket, error: ticketError } = await supabase.from("event_tickets").insert({
        event_id: eventId,
        payment_id: null,
        registration_id: registration.id,
        ticket_category_id: ticket.ticket_category_id,
        buyer_user_id: user.id,
        participant_name: ticket.participant_name,
        participant_email: ticket.participant_email,
        participant_phone: ticket.participant_phone,
        participant_ktp: ticket.participant_ktp || null,
        status: "paid",
        is_production: true
      }).select().single();
      if (ticketError) {
        console.error("Failed to create ticket:", ticketError);
        throw new Error("Failed to create event ticket");
      }
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(createdTicket.ticket_number, {
        width: 200,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
      // Update ticket with QR code
      await supabase.from("event_tickets").update({
        qr_code_data: qrCodeDataUrl
      }).eq("id", createdTicket.id);
      createdTickets.push({
        ...createdTicket,
        qr_code_data: qrCodeDataUrl
      });
      // Deduct quota for this ticket category
      const { data: category } = await supabase.from("event_ticket_categories").select("remaining_quota").eq("id", ticket.ticket_category_id).single();
      // Kurangi 1 dan update
      if (category?.remaining_quota !== null) {
        const newQuota = category.remaining_quota - 1;
        const { error: quotaError } = await supabase.from("event_ticket_categories").update({
          remaining_quota: newQuota
        }).eq("id", ticket.ticket_category_id);
        if (quotaError) console.error("Failed to deduct quota:", quotaError);
      }
      
    }
    // Format event details for email
    let formattedDate = "N/A";
    let formattedTime = "N/A";
    try {
      formattedDate = new Date(event.date.replace(/-/g, "/")).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      const startTime = new Date(`${event.date}T${event.start_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      const endTime = event.end_time ? new Date(`${event.date}T${event.end_time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }) : null;
      formattedTime = endTime ? `${startTime} - ${endTime}` : startTime;
    } catch (e) {
      console.error("Date formatting error:", e);
      formattedDate = event.date;
      formattedTime = event.start_time;
    }
    const eventDetails = {
      title: event.title,
      date: formattedDate,
      time: formattedTime,
      location: event.location,
      notes: event.notes || ""
    };
    // Generate ticket PDF
    const ticketPdfArrayBuffer = await generateFreeTicketPDF({
      bookingId,
      attendeeName: tickets[0].participant_name,
      attendeeEmail: tickets[0].participant_email,
      eventDetails,
      createdTickets,
      ticketCategories: categories
    });
    const ticketPdf = new Uint8Array(ticketPdfArrayBuffer);
    // Send confirmation email
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.mailgun.org",
        port: 587,
        secure: false,
        auth: {
          user: "info@mg.arrangely.io",
          pass: Deno.env.get("SMTP_MAILGUN_PASSWORD")
        }
      });
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
              .free-badge { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
              .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Event Registration Confirmed!</h1>
                <p>Your ticket is ready</p>
              </div>
              <div class="content">
                <p>Dear ${tickets[0].participant_name},</p>
                <p>Thank you for registering! Your event ticket is attached to this email.</p>
                
                <div style="text-align: center;">
                  <span class="free-badge">FREE EVENT</span>
                </div>

                <div class="details">
                  <div class="detail-row">
                    <span class="detail-label">Event:</span>
                    <span>${eventDetails.title}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Date:</span>
                    <span>${eventDetails.date}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Time:</span>
                    <span>${eventDetails.time}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span>${eventDetails.location}</span>
                  </div>
                </div>

                <div class="booking-id">
                  Booking ID: ${bookingId}
                </div>

                <p>Please find your event ticket attached. Present the ticket at the event entrance.</p>
                ${eventDetails.notes ? `
                <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                  <p style="margin: 0; color: #856404; font-weight: bold;">📝 Important Notes:</p>
                  <p style="margin: 10px 0 0 0; color: #856404; white-space: pre-wrap;">${eventDetails.notes}</p>
                </div>
                ` : ""}
                <p>We look forward to seeing you at the event!</p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      await transporter.sendMail({
        from: '"Arrangely" <info@arrangely.io>',
        to: tickets[0].participant_email,
        subject: `Event Registration Confirmed - ${eventDetails.title}`,
        html: htmlContent,
        attachments: [
          {
            filename: `Event-Ticket-${bookingId}.pdf`,
            content: ticketPdf,
            contentType: "application/pdf"
          }
        ]
      });
      
    } catch (emailError) {
      console.error("⚠️ Failed to send email:", emailError);
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Free event registration successful",
      booking_id: bookingId,
      registration_id: registration.id
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in register-free-event:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
function addWatermark(doc, pageHeight, pageWidth) {
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  const watermarkText = "ARRANGELY";
  const angle = -30;
  const yStep = 22;
  const xStep = 55;
  const rows = Math.ceil(pageHeight / yStep) + 4;
  const cols = Math.ceil(pageWidth / xStep) + 4;
  for(let i = 0; i < rows; i++){
    for(let j = 0; j < cols; j++){
      const x = j * xStep - (i % 2 === 0 ? xStep / 2 : xStep / 4);
      const y = i * yStep - 10;
      doc.text(watermarkText, x, y, {
        angle: angle
      });
    }
  }
}
async function generateFreeTicketPDF(data) {
  const doc = new jsPDF();
  doc.setFont("Helvetica");
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width; // Definisikan margin, misal 20mm dari atas dan 30mm dari bawah
  const topMargin = 20;
  const bottomMargin = 30; // Beri ruang lebih di bawah
  addWatermark(doc, pageHeight, pageWidth);
  doc.setTextColor(0, 0, 0); // Header
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.setTextColor(37, 99, 235);
  doc.text("ARRANGELY", 15, topMargin); // Gunakan topMargin
  doc.setTextColor(0, 0, 0); // FREE EVENT badge
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - 55, topMargin - 8, 40, 10, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("FREE EVENT", pageWidth - 35, topMargin - 1, {
    align: "center"
  });
  doc.setTextColor(0, 0, 0); // Event details
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Event Ticket", 15, topMargin + 20);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Booking ID: ${data.bookingId}`, 15, topMargin + 30);
  doc.text(`Name: ${data.attendeeName}`, 15, topMargin + 38);
  doc.text(`Email: ${data.attendeeEmail}`, 15, topMargin + 46); // Event information
  doc.setFont(undefined, "bold");
  doc.text("Event Information", 15, topMargin + 60);
  doc.setFont(undefined, "normal");
  doc.text(`Event: ${data.eventDetails.title}`, 15, topMargin + 70);
  doc.text(`Date: ${data.eventDetails.date}`, 15, topMargin + 78);
  doc.text(`Time: ${data.eventDetails.time}`, 15, topMargin + 86);
  doc.text(`Location: ${data.eventDetails.location}`, 15, topMargin + 94); // Tickets
  let yPos = topMargin + 110; // Mulai yPos di sini
  doc.setFont(undefined, "bold");
  doc.text("Tickets", 15, yPos);
  yPos += 10;
  const ticketBlockHeight = 40; // Tinggi satu blok tiket (termasuk QR & padding)
  for (const ticket of data.createdTickets){
    // --- 💡 PENGECEKAN PAGE BREAK ---
    // Cek apakah yPos + tinggi blok tiket akan melebihi batas bawah halaman
    if (yPos + ticketBlockHeight > pageHeight - bottomMargin) {
      doc.addPage(); // Tambah halaman baru
      doc.setFont("Helvetica");
      addWatermark(doc, pageHeight, pageWidth); // Gambar ulang watermark
      doc.setTextColor(0, 0, 0); // Reset warna teks
      yPos = topMargin; // Reset yPos ke margin atas
      doc.setFont("Helvetica"); // 1. Atur ulang FONT FAMILY
      doc.setFontSize(10);
    } // --- 💡 AKHIR DARI PENGECEKAN ---
    const category = data.ticketCategories.find((c)=>c.id === ticket.ticket_category_id);
    doc.setFont(undefined, "normal");
    doc.text(`• ${category?.name || "Ticket"} - ${ticket.ticket_number}`, 15, yPos); // Add QR code
    if (ticket.qr_code_data) {
      try {
        // Posisikan QR code relatif terhadap yPos
        doc.addImage(ticket.qr_code_data, "PNG", pageWidth - 45, yPos - 8, 30, 30);
      } catch (e) {
        console.error("Failed to add QR code:", e);
      }
    }
    yPos += ticketBlockHeight; // Pindahkan yPos ke bawah sebesar tinggi blok
  } // Footer note
  yPos += 10; // Padding tambahan sebelum footer // Cek juga untuk footer
  if (yPos > pageHeight - bottomMargin) {
    doc.addPage();
    doc.setFont("Helvetica");
    addWatermark(doc, pageHeight, pageWidth);
    doc.setTextColor(0, 0, 0);
    yPos = topMargin;
    doc.setFont("Helvetica");
    doc.setFontSize(9);
  }
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("Please present this ticket at the event entrance.", 15, yPos);
  doc.text("This is a free event. No payment required.", 15, yPos + 6);
  return doc.output("arraybuffer");
}
