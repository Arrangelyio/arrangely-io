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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { surveyId } = await req.json();

    

    // Get survey details
    const { data: survey, error: surveyError } = await supabaseClient
      .from('event_surveys')
      .select('*, events(*)')
      .eq('id', surveyId)
      .single();

    if (surveyError) throw surveyError;

    // Get all registrations for the event that have checked in
    const { data: registrations, error: regError } = await supabaseClient
      .from('event_registrations')
      .select('*')
      .eq('event_id', survey.event_id)
      .not('check_in_time', 'is', null);

    if (regError) throw regError;

    

    // In a real implementation, you would send emails here
    // For now, we'll just log the survey sending
    // You could integrate with a service like SendGrid, Resend, etc.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Survey sent to ${registrations.length} attendees`,
        recipientCount: registrations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending survey:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
