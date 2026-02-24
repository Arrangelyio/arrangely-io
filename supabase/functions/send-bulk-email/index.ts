import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    
    
    const bodyText = await req.text();
    const { subject, body, recipients, attachedImageUrl, linkUrl, linkText } = JSON.parse(bodyText);
    
    if (!subject || !body || !recipients || recipients.length === 0) {
      console.error("Missing required fields:", {
        subject: !!subject,
        body: !!body,
        recipients: recipients?.length || 0
      });
      return new Response(JSON.stringify({
        error: "Subject, body, and recipients are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique blast ID
    const blastUniqueId = `blast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    

    // Prepare email jobs for batch insert
    const emailJobs = recipients.map((recipient: any) => ({
      blast_unique_id: blastUniqueId,
      recipient_email: recipient.email,
      recipient_name: recipient.display_name,
      subject,
      body,
      attached_image_url: attachedImageUrl || null,
      link_url: linkUrl || null,
      link_text: linkText || null,
      status: 'pending',
      is_production: true
    }));

    

    // Batch insert email jobs (Supabase can handle thousands efficiently)
    // If you have more than 1000 recipients, batch in groups of 1000
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < emailJobs.length; i += batchSize) {
      const batch = emailJobs.slice(i, i + batchSize);
      const { error } = await supabase
        .from('email_jobs')
        .insert(batch);

      if (error) {
        console.error("Error inserting email jobs batch:", error);
        throw error;
      }

      totalInserted += batch.length;
      
    }

    

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully queued ${totalInserted} emails for delivery`,
      total: totalInserted,
      note: "Emails will be processed by the background job scheduler"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error("Error in send-bulk-email function:", error);
    return new Response(JSON.stringify({
      error: "Failed to queue bulk emails",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
