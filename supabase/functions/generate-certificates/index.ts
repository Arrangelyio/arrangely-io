import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { eventId } = await req.json();

    

    // Get event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    // Get all checked-in registrations without certificates
    const { data: registrations, error: regError } = await supabaseClient
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .not('check_in_time', 'is', null)
      .is('certificate_url', null);

    if (regError) throw regError;

    

    const certificates = [];

    // Generate certificates for each registration
    for (const registration of registrations) {
      const serialNumber = `CERT-${eventId.slice(0, 8)}-${registration.id.slice(0, 8)}`.toUpperCase();
      
      try {
        // Generate PDF certificate
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        // Add border decorations
        doc.setDrawColor(100, 200, 180);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, 277, 190);
        doc.rect(12, 12, 273, 186);

        // Add certificate number (top right)
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(serialNumber, 275, 20, { align: 'right' });

        // Add "CERTIFICATE" title
        doc.setFontSize(48);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text('CERTIFICATE', 148, 45, { align: 'center' });
        
        // Add organization subtitle
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('ARRANGELY EVENT MANAGEMENT', 148, 55, { align: 'center' });
        
        // Add "PRESENTED TO" text
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('PRESENTED TO', 148, 70, { align: 'center' });
        
        // Add recipient name
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(registration.attendee_name.toUpperCase(), 148, 85, { align: 'center' });
        
        // Add decorative line under name
        doc.setDrawColor(100, 200, 180);
        doc.setLineWidth(0.8);
        doc.line(60, 90, 236, 90);
        
        // Add "AS" text
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('AS', 148, 102, { align: 'center' });
        
        // Add "ATTENDEE" text in teal
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 200, 180);
        doc.text('ATTENDEE', 148, 112, { align: 'center' });
        
        // Add "OF THE EVENT" text
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('OF THE EVENT', 148, 122, { align: 'center' });
        
        // Add event title in teal
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 200, 180);
        const eventTitle = event.title.toUpperCase();
        const maxWidth = 180;
        const lines = doc.splitTextToSize(eventTitle, maxWidth);
        const lineHeight = 8;
        const startY = 132;
        lines.forEach((line: string, index: number) => {
          doc.text(line, 148, startY + (index * lineHeight), { align: 'center' });
        });
        
        // Add date and location
        const detailsY = startY + (lines.length * lineHeight) + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const formattedDate = new Date(event.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        doc.text(formattedDate, 148, detailsY, { align: 'center' });
        doc.text(event.location.toUpperCase(), 148, detailsY + 7, { align: 'center' });

        // Convert to blob
        const pdfBytes = doc.output('arraybuffer');
        
        // Upload to Supabase Storage
        const fileName = `${eventId}/${serialNumber}.pdf`;
        const { error: uploadError } = await supabaseClient.storage
          .from('event-certificates')
          .upload(fileName, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading certificate:', uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('event-certificates')
          .getPublicUrl(fileName);

        const certificateUrl = urlData.publicUrl;

        // Insert certificate record
        const { data: certificate, error: certError } = await supabaseClient
          .from('event_certificates')
          .insert({
            event_id: eventId,
            registration_id: registration.id,
            serial_number: serialNumber,
            certificate_url: certificateUrl,
          })
          .select()
          .single();

        if (certError) {
          console.error('Error creating certificate:', certError);
          continue;
        }

        // Update registration with certificate URL
        await supabaseClient
          .from('event_registrations')
          .update({
            certificate_url: certificateUrl,
            certificate_generated_at: new Date().toISOString(),
          })
          .eq('id', registration.id);

        certificates.push(certificate);
      } catch (error) {
        console.error('Error processing certificate for registration:', registration.id, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${certificates.length} certificates`,
        certificateCount: certificates.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating certificates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
