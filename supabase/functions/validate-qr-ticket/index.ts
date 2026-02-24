import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { qrToken, eventId } = await req.json();
    if (!qrToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'QR token is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!eventId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Event ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Extract the QR token from URL format if needed
    let token = qrToken;
    if (qrToken.includes('/checkin/')) {
      token = qrToken.split('/checkin/')[1];
    }
    // First, try to find ticket by ticket_number in event_tickets table
    const { data: ticket, error: ticketError } = await supabase.from('event_tickets').select(`
    *,
    events:event_id (
      id,
      title,
      date,
      start_time,
      end_time,
      location,
      status,
      price
    ),
    event_registrations:registration_id (
      qr_code,
      booking_id
    ),
    event_ticket_categories:ticket_category_id (
      id,
      name,
      event_ticket_types:ticket_type_id (
        id,
        name
      )
    )
  `).eq('ticket_number', token).single();
    // If found in event_tickets, validate and check-in
    if (ticket && !ticketError) {
      
      // Check if ticket matches the event
      if (ticket.event_id !== eventId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'This ticket is for a different event'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Check if event is active
      if (ticket.events.status !== 'active') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Event is not active'
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Check if ticket is paid
      if (ticket.status !== 'paid') {
        return new Response(JSON.stringify({
          success: false,
          error: `Ticket status: ${ticket.status}`
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Check if already checked in
      if (ticket.checked_in_at) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Ticket already used',
          checkInTime: ticket.checked_in_at,
          attendee: {
            name: ticket.participant_name,
            email: ticket.participant_email,
            ticketCategory: ticket.event_ticket_categories?.name || 'N/A',
            ticketType: ticket.event_ticket_categories?.event_ticket_types?.name || 'N/A',
            isVip: ticket.is_vip || false
          }
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // All validations passed - mark ticket as checked in
      const { error: updateError } = await supabase.from('event_tickets').update({
        checked_in_at: new Date().toISOString()
      }).eq('id', ticket.id);
      if (updateError) {
        console.error('Error updating ticket check-in:', updateError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to check in'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Success response
      return new Response(JSON.stringify({
        success: true,
        message: 'Ticket validated successfully',
        attendee: {
          name: ticket.participant_name,
          email: ticket.participant_email,
          ticketNumber: ticket.ticket_number,
          ticketCategory: ticket.event_ticket_categories?.name || 'N/A',
          ticketType: ticket.event_ticket_categories?.event_ticket_types?.name || 'N/A',
          isVip: ticket.is_vip || false
        },
        event: {
          title: ticket.events.title,
          date: ticket.events.date,
          location: ticket.events.location
        },
        checkInTime: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // If not found in event_tickets, try event_registrations (legacy support)
    const isSimpleBookingId = token.split('-').length === 2;
    const { data: registration, error: regError } = await supabase.from('event_registrations').select(`
        *,
        events (
          id,
          title,
          date,
          start_time,
          end_time,
          location,
          status,
          price
        )
      `).eq(isSimpleBookingId ? 'booking_id' : 'qr_code', isSimpleBookingId ? token : qrToken).single();
    if (regError || !registration) {
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid QR code - registration not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if registration matches the event
    if (registration.event_id !== eventId) {
      
      return new Response(JSON.stringify({
        success: false,
        error: 'This QR code is for a different event'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if the event is active
    if (registration.events.status !== 'active') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Event is not active'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if registration is confirmed
    if (registration.status !== 'confirmed') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Registration is not confirmed'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if already checked in
    if (registration.check_in_time) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ticket already used',
        checkInTime: registration.check_in_time
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check payment status for paid events
    if (registration.events.price > 0 && registration.payment_status !== 'paid') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment not completed'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // All validations passed - mark as checked in
    const { error: updateError } = await supabase.from('event_registrations').update({
      check_in_time: new Date().toISOString()
    }).eq('id', registration.id);
    if (updateError) {
      console.error('Error updating check-in time:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to check in'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Ticket validated successfully',
      attendee: {
        name: registration.attendee_name,
        email: registration.attendee_email,
        bookingId: registration.booking_id,
        isVip: registration.is_vip
      },
      event: {
        title: registration.events.title,
        date: registration.events.date,
        location: registration.events.location
      },
      checkInTime: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
