import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    
    const { email, token, newPassword } = await req.json();
    if (!email || !token || !newPassword) {
      console.error("Missing required fields:", {
        email: !!email,
        token: !!token,
        newPassword: !!newPassword
      });
      return new Response(JSON.stringify({
        error: "Email, token, and new password are required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Validate password strength
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({
        error: "Password must be at least 8 characters long"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Initialize Supabase client with service role
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    
    // Find the reset token record
    const { data: tokenRecord, error: tokenError } = await supabase.from("password_reset_tokens").select("*").eq("email", email).eq("token", token).eq("is_used", false).gt("expires_at", new Date().toISOString()).single();
    if (tokenError || !tokenRecord) {
      console.error("Invalid or expired reset token:", tokenError?.message);
      // Increment attempts for failed verification
      await supabase.from("password_reset_tokens").update({
        attempts: supabase.raw("attempts + 1")
      }).eq("email", email).eq("token", token);
      return new Response(JSON.stringify({
        error: "Invalid or expired reset token"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Get the user by email
    // const { data, error } = await supabase.auth.admin.listUsers();
    // if (error) {
    //   throw error;
    // }
    // const authUser = data.users.find((u)=>u.email === email);
    const { data: [authUser], error } = await supabase.rpc("get_user_by_email", {
      target_email: email
    });
    if (error) {
      throw error;
    }
    
    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword
    });
    if (updateError) {
      console.error("Error updating password:", updateError.message);
      return new Response(JSON.stringify({
        error: "Failed to update password"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Mark token as used
    await supabase.from("password_reset_tokens").update({
      is_used: true,
      attempts: tokenRecord.attempts + 1
    }).eq("id", tokenRecord.id);
    // Clean up all other reset tokens for this email
    await supabase.from("password_reset_tokens").delete().eq("email", email).neq("id", tokenRecord.id);
    return new Response(JSON.stringify({
      success: true,
      message: "Password has been reset successfully. You can now sign in with your new password."
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error in reset-password function:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
serve(handler);
