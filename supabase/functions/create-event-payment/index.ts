import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const { event_id, tickets, discount_code } = requestBody;

    if (!event_id || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      throw new Error('Invalid request: event_id and tickets array required');
    }

    

    // Fetch event details
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*, organizer_id')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check if event uses sessions
    let sessionId = null;
    let pricePerTicket = event.price;

    if (event.use_sessions) {
      // Get next available session
      const { data: nextSession, error: sessionError } = await supabaseClient
        .rpc('get_next_available_session', { p_event_id: event_id });

      if (sessionError || !nextSession) {
        throw new Error('No available sessions for this event');
      }

      sessionId = nextSession;

      // Reserve quota
      const { data: reserved, error: reserveError } = await supabaseClient
        .rpc('reserve_session_quota', {
          p_session_id: sessionId,
          p_ticket_count: tickets.length
        });

      if (reserveError || !reserved) {
        throw new Error('Unable to reserve tickets - session may be full');
      }
    } else {
      // Check total capacity
      const { count: existingTickets } = await supabaseClient
        .from('event_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id)
        .in('status', ['pending', 'paid']);

      if (existingTickets && event.capacity && existingTickets + tickets.length > event.capacity) {
        throw new Error('Not enough tickets available');
      }
    }

    // Calculate amount
    let totalAmount = pricePerTicket * tickets.length;
    let originalAmount = totalAmount;
    let discountCodeId = null;

    // Apply discount code if provided
    if (discount_code) {
      const { data: discountData, error: discountError } = await supabaseClient
        .from('discount_codes')
        .select('*')
        .eq('code', discount_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (!discountError && discountData) {
        const now = new Date();
        const validFrom = new Date(discountData.valid_from);
        const validUntil = new Date(discountData.valid_until);

        if (now >= validFrom && now <= validUntil) {
          if (!discountData.max_uses || discountData.used_count < discountData.max_uses) {
            discountCodeId = discountData.id;
            if (discountData.discount_type === 'percentage') {
              totalAmount = Math.round(totalAmount * (1 - discountData.discount_value / 100));
            } else {
              totalAmount = Math.max(0, totalAmount - discountData.discount_value);
            }
          }
        }
      }
    }

    // Determine if production based on hostname
    const origin = req.headers.get('origin') || '';
    const isProduction = origin.includes('arrangely.io') && !origin.includes('staging');
    const midtransServerKey = isProduction
      ? Deno.env.get('MIDTRANS_SERVER_KEY')
      : Deno.env.get('MIDTRANS_SERVER_KEY_STAGING');
    const midtransApiUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    // Calculate expiration time
    const expiryMinutes = event.payment_expiry_minutes || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Create payment record
    const orderId = `EVT-${Date.now()}-${user.id.substring(0, 8)}`;
    
    const { data: payment, error: paymentError } = await supabaseClient
      .from('event_payments')
      .insert({
        event_id,
        user_id: user.id,
        amount: totalAmount,
        original_amount: originalAmount,
        discount_code_id: discountCodeId,
        midtrans_order_id: orderId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        ticket_count: tickets.length,
        is_production: isProduction,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw new Error('Failed to create payment record');
    }

    // Create pending tickets
    const ticketRecords = tickets.map((ticket: any) => ({
      event_id,
      session_id: sessionId,
      payment_id: payment.id,
      buyer_user_id: user.id,
      participant_name: ticket.participant_name,
      participant_email: ticket.participant_email,
      participant_phone: ticket.participant_phone,
      participant_ktp: ticket.participant_ktp || null,
      status: 'pending',
      is_production: isProduction,
    }));

    const { error: ticketsError } = await supabaseClient
      .from('event_tickets')
      .insert(ticketRecords);

    if (ticketsError) {
      console.error('Failed to create tickets:', ticketsError);
      throw new Error('Failed to create ticket records');
    }

    // Create Midtrans Snap transaction
    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalAmount,
      },
      customer_details: {
        email: user.email,
        first_name: tickets[0].participant_name,
      },
      item_details: [
        {
          id: event_id,
          price: pricePerTicket,
          quantity: tickets.length,
          name: `${event.title} - Ticket`,
        },
      ],
      expiry: {
        start_time: new Date().toISOString().split('.')[0] + ' +0700',
        unit: 'minutes',
        duration: expiryMinutes,
      },
    };

    const midtransResponse = await fetch(midtransApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + btoa(midtransServerKey + ':'),
      },
      body: JSON.stringify(midtransPayload),
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans error:', errorText);
      throw new Error('Failed to create payment with Midtrans');
    }

    const midtransData = await midtransResponse.json();

    // Update payment with Snap token
    await supabaseClient
      .from('event_payments')
      .update({
        snap_token: midtransData.token,
        snap_redirect_url: midtransData.redirect_url,
      })
      .eq('id', payment.id);

    

    return new Response(
      JSON.stringify({
        payment_id: payment.id,
        snap_token: midtransData.token,
        snap_redirect_url: midtransData.redirect_url,
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-event-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
