import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header to identify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Get user from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid or expired token");
    }

    const userId = user.id;
    console.log(`Processing account deletion for user: ${userId}`);

    // Verify confirmation
    const { confirmation } = await req.json();
    if (confirmation !== "DELETE") {
      throw new Error("Invalid confirmation. Please type DELETE to confirm.");
    }

    // Delete user data in order (respecting foreign key constraints)
    // Note: Some tables may have CASCADE delete, but we'll be explicit
    
    const tablesToClean = [
      // User content
      { table: "arrangements", column: "song_id", subQuery: { table: "songs", column: "user_id", value: userId } },
      { table: "song_sections", column: "song_id", subQuery: { table: "songs", column: "user_id", value: userId } },
      { table: "songs", column: "user_id" },
      { table: "chord_grids", column: "user_id" },
      
      // Library and favorites
      { table: "library_songs", column: "user_id" },
      { table: "user_setlists", column: "user_id" },
      
      // Creator related
      { table: "creator_benefits", column: "creator_id" },
      { table: "creator_applications", column: "user_id" },
      { table: "creator_withdrawal_requests", column: "creator_id" },
      { table: "creator_pro_scores", column: "user_id" },
      { table: "creator_score_history", column: "user_id" },
      { table: "discount_code_assignments", column: "creator_id" },
      
      // Subscriptions and payments
      { table: "subscriptions", column: "user_id" },
      { table: "lesson_transactions", column: "user_id" },
      { table: "lesson_progress", column: "user_id" },
      { table: "user_lesson_purchases", column: "user_id" },
      
      // Assessments
      { table: "user_assessment_attempts", column: "user_id" },
      { table: "user_assessment_results", column: "user_id" },
      
      // Events
      { table: "event_registrations", column: "user_id" },
      { table: "event_attendee_profiles", column: "user_id" },
      
      // Support
      { table: "conversations", column: "user_id" },
      { table: "support_chat_settings", column: "user_id" },
      
      // Settings and notifications
      { table: "user_notification_settings", column: "user_id" },
      { table: "push_tokens", column: "user_id" },
      
      // Profile (last before auth deletion)
      { table: "profiles", column: "user_id" },
    ];

    for (const tableConfig of tablesToClean) {
      try {
        if (tableConfig.subQuery) {
          // For tables that reference songs, get song IDs first
          const { data: songs } = await supabaseAdmin
            .from(tableConfig.subQuery.table)
            .select("id")
            .eq(tableConfig.subQuery.column, tableConfig.subQuery.value);
          
          if (songs && songs.length > 0) {
            const songIds = songs.map(s => s.id);
            await supabaseAdmin
              .from(tableConfig.table)
              .delete()
              .in(tableConfig.column, songIds);
          }
        } else {
          await supabaseAdmin
            .from(tableConfig.table)
            .delete()
            .eq(tableConfig.column, userId);
        }
        console.log(`Cleaned table: ${tableConfig.table}`);
      } catch (tableError) {
        // Log but continue - table might not exist or have different structure
        console.log(`Note: Could not clean ${tableConfig.table}: ${tableError}`);
      }
    }

    // Delete user's storage files
    try {
      const { data: avatarFiles } = await supabaseAdmin.storage
        .from("profile-photos")
        .list(userId);
      
      if (avatarFiles && avatarFiles.length > 0) {
        const filePaths = avatarFiles.map(f => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("profile-photos").remove(filePaths);
        console.log("Deleted profile photos");
      }
    } catch (storageError) {
      console.log("Note: Could not delete storage files:", storageError);
    }

    // Finally, delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error("Error deleting auth user:", deleteAuthError);
      throw new Error("Failed to delete authentication account");
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in delete-user-account:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to delete account",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
