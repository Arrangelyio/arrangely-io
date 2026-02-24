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
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }
    const { action, subscription_id, data: requestData } = await req.json();
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    const serverKey = isProduction ? Deno.env.get("MIDTRANS_PRODUCTION_SERVER_KEY") : Deno.env.get("MIDTRANS_SANDBOX_SERVER_KEY");
    const baseUrl = isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    const authHeader = `Basic ${btoa(serverKey + ':')}`;
    
    let response;
    let endpoint;
    switch(action){
      case 'get':
        // GET subscription details
        endpoint = `${baseUrl}/v1/subscriptions/${subscription_id}`;
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': authHeader
          }
        });
        break;
      case 'disable':
        // Disable subscription
        endpoint = `${baseUrl}/v1/subscriptions/${subscription_id}/disable`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader
          }
        });
        // Update local database
        await supabaseClient.from('subscriptions').update({
          midtrans_subscription_status: 'disabled',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        }).eq('midtrans_subscription_id', subscription_id);
        break;
      case 'cancel':
        // Cancel subscription
        endpoint = `${baseUrl}/v1/subscriptions/${subscription_id}/cancel`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader
          }
        });
        // Update local database
        await supabaseClient.from('subscriptions').update({
          midtrans_subscription_status: 'cancelled',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        }).eq('midtrans_subscription_id', subscription_id);
        break;
      case 'enable':
        // Enable subscription
        endpoint = `${baseUrl}/v1/subscriptions/${subscription_id}/enable`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader
          }
        });
        // Update local database
        await supabaseClient.from('subscriptions').update({
          midtrans_subscription_status: 'active',
          status: 'active',
          updated_at: new Date().toISOString()
        }).eq('midtrans_subscription_id', subscription_id);
        break;
      case 'update':
        // Update subscription
        endpoint = `${baseUrl}/v1/subscriptions/${subscription_id}`;
        response = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(requestData)
        });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Midtrans API error:', errorText);
      throw new Error(`Midtrans API error: ${response.status} - ${errorText}`);
    }
    const result = await response.json();
    
    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in manage-midtrans-subscription:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
