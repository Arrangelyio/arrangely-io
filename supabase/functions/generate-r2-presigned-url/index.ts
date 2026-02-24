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

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Use getUser with the token directly
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: " + (authError?.message || "No user") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { songId, trackIndex, trackName, fileType } = await req.json();

    if (!songId || trackIndex === undefined || !trackName) {
      throw new Error("Missing required parameters: songId, trackIndex, trackName");
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
    const extension = fileType || "wav";

    // Generate keys for audio and peaks
    const audioKey = `${songId}/${trackIndex}.${extension}`;
    const peaksKey = `${songId}/${trackIndex}.peaks.json`;

    // Generate presigned URLs (valid for 1 hour)
    const expiresIn = 3600;
    const expireTime = Math.floor(Date.now() / 1000) + expiresIn;

    // Create presigned URL for audio upload
    const audioUrl = new URL(`${r2Endpoint}/${bucketName}/${audioKey}`);
    audioUrl.searchParams.set("X-Amz-Expires", expiresIn.toString());
    
    const audioRequest = new Request(audioUrl.toString(), { method: "PUT" });
    const signedAudioRequest = await aws.sign(audioRequest, {
      aws: { signQuery: true },
    });
    const audioPresignedUrl = signedAudioRequest.url;

    // Create presigned URL for peaks upload
    const peaksUrl = new URL(`${r2Endpoint}/${bucketName}/${peaksKey}`);
    peaksUrl.searchParams.set("X-Amz-Expires", expiresIn.toString());
    
    const peaksRequest = new Request(peaksUrl.toString(), { method: "PUT" });
    const signedPeaksRequest = await aws.sign(peaksRequest, {
      aws: { signQuery: true },
    });
    const peaksPresignedUrl = signedPeaksRequest.url;

    

    return new Response(
      JSON.stringify({
        success: true,
        audioPresignedUrl,
        peaksPresignedUrl,
        audioKey,
        peaksKey,
        expiresAt: new Date(expireTime * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
