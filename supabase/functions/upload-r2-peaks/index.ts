import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: " + (authError?.message || "No user") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { songId, trackIndex, peaks } = await req.json();

    if (!songId || trackIndex === undefined || !peaks) {
      throw new Error("Missing required parameters: songId, trackIndex, peaks");
    }

    // Get R2 credentials
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const bucketName = Deno.env.get("CLOUDFLARE_R2_BUCKET_NAME") || "sequencer-tracks";

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 credentials not configured");
    }

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "auto",
      service: "s3",
    });

    const r2Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const peaksKey = `${songId}/${trackIndex}.peaks.json`;
    const peaksBody = JSON.stringify({ peaks });

    // Upload peaks directly to R2
    const uploadUrl = `${r2Endpoint}/${bucketName}/${peaksKey}`;
    const uploadRequest = new Request(uploadUrl, {
      method: "PUT",
      body: peaksBody,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const signedRequest = await aws.sign(uploadRequest);
    const uploadResponse = await fetch(signedRequest);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("R2 upload failed:", uploadResponse.status, errorText);
      throw new Error(`Failed to upload peaks: ${uploadResponse.status}`);
    }

    

    return new Response(
      JSON.stringify({
        success: true,
        peaksKey,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error uploading peaks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
