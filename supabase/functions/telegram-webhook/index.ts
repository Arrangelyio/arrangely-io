import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    message_thread_id?: number;
    text?: string;
    date: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      throw new Error("Missing Telegram configuration");
    }

    const update: TelegramUpdate = await req.json();
    

    // Only process messages from the configured group
    if (!update.message || update.message.chat.id.toString() !== chatId) {
      return new Response("OK", { headers: corsHeaders });
    }

    const message = update.message;

    // Skip bot messages to avoid loops
    if (message.from.username?.includes("bot")) {
      return new Response("OK", { headers: corsHeaders });
    }

    // Only process messages that are in topics (message_thread_id exists)
    if (!message.message_thread_id) {
      return new Response("OK", { headers: corsHeaders });
    }

    // Find the conversation by topic ID
    const { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("telegram_topic_id", message.message_thread_id)
      .eq("is_production", true)
      .single();

    if (!conversation) {
      
      return new Response("OK", { headers: corsHeaders });
    }

    // Create admin message in Supabase
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        content: message.text || "Media message",
        message_type: "admin",
        sender_id: conversation.admin_id,
        is_production: true
      });

    if (messageError) {
      console.error("Error creating message:", messageError);
    } else {
      
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});