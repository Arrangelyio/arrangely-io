import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending email jobs (limit to 100 per run to avoid timeout)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('email_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching pending jobs:", fetchError);
      throw fetchError;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      
      return new Response(JSON.stringify({
        success: true,
        message: "No pending emails to process",
        processed: 0
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    

    // Configure SMTP client with Mailgun
    const smtpClient = new SMTPClient({
      connection: {
        hostname: "smtp.mailgun.org",
        port: 587,
        tls: true,
        auth: {
          username: "info@mg.arrangely.io",
          password: Deno.env.get("SMTP_MAILGUN_PASSWORD") || "",
        },
      },
    });

    let successCount = 0;
    let failureCount = 0;

    // Process emails in batches of 10 to avoid overwhelming SMTP server
    const batchSize = 10;
    
    for (let i = 0; i < pendingJobs.length; i += batchSize) {
      const batch = pendingJobs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (job) => {
        try {
          // Personalize the body
          const personalizedBody = job.body.replace(/\{name\}/g, job.recipient_name);
          
          // Build email HTML
          const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">Arrangely</h1>
              </div>

              <div style="background: #f8fafc; padding: 30px; border-radius: 10px;">
                <div style="color: #1f2937; line-height: 1.6; margin-bottom: 20px;">
                  ${personalizedBody.replace(/\n/g, '<br>')}
                </div>
                
                ${job.attached_image_url ? `
                  <div style="text-align: center; margin: 20px 0;">
                    <img src="${job.attached_image_url}" alt="Attached image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  </div>
                ` : ''}
                
                ${job.link_url && job.link_text ? `
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${job.link_url}" 
                       style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;"
                       target="_blank">
                      ${job.link_text}
                    </a>
                  </div>
                ` : ''}
              </div>

              <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
                <p>© 2024 Arrangely. Create beautiful song arrangements with ease.</p>
                <p>
                  <a href="mailto:info@arrangely.io" style="color: #6366f1; text-decoration: none;">
                    Contact us
                  </a> | 
                  <a href="https://arrangely.io" style="color: #6366f1; text-decoration: none;">
                    Visit our website
                  </a>
                </p>
              </div>
            </div>
          `;

          // Send email
          await smtpClient.send({
            from: "Arrangely <info@arrangely.io>",
            to: job.recipient_email,
            subject: job.subject,
            content: emailContent,
            html: emailContent,
          });

          // Update job status to 'sent'
          await supabase
            .from('email_jobs')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', job.id);

          successCount++;
          
          
        } catch (error) {
          // Update job with error, keep status as 'pending' for retry
          await supabase
            .from('email_jobs')
            .update({ 
              error_message: error.message,
              retry_count: job.retry_count + 1
            })
            .eq('id', job.id);

          failureCount++;
          console.error(`Failed to send email to ${job.recipient_email}:`, error);
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < pendingJobs.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${successCount + failureCount} emails`,
      successCount,
      failureCount,
      total: pendingJobs.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error("Error in process-email-jobs function:", error);
    return new Response(JSON.stringify({
      error: "Failed to process email jobs",
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
