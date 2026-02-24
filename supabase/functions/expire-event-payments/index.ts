import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    // Find expired pending payments
    const { data: expiredPayments, error: findError } = await supabaseClient.from('payments').select('id').eq('status', 'pending').eq("payment_type", "event").lt('expires_at', new Date().toISOString());
    if (findError) {
      console.error('Error finding expired payments:', findError);
      throw findError;
    }
    if (!expiredPayments || expiredPayments.length === 0) {
      
      return new Response(JSON.stringify({
        success: true,
        expired_count: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    let successCount = 0;
    let failCount = 0;
    // Process each expired payment
    for (const payment of expiredPayments){
      try {
        // Reverse the quota
        const { data: reverseResult, error: reverseError } = await supabaseClient.rpc('reverse_event_quota', {
          p_payment_id: payment.id
        });
        if (reverseError || !reverseResult?.success) {
          console.error(`Error reversing quota for payment ${payment.id}:`, reverseError || reverseResult);
          failCount++;
          continue;
        }
        // Update payment status to expired
        const { error: updateError } = await supabaseClient.from('payments').update({
          status: 'expired',
          updated_at: new Date().toISOString()
        }).eq('id', payment.id);
        if (updateError) {
          console.error(`Error updating payment ${payment.id} status:`, updateError);
          failCount++;
          continue;
        }
        
        successCount++;
      } catch (err) {
        console.error(`Exception processing payment ${payment.id}:`, err);
        failCount++;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      expired_count: successCount,
      failed_count: failCount,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in expire-event-payments:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
