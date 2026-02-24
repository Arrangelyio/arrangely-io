import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramAPIResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

const callTelegramAPI = async (method: string, params: any): Promise<TelegramAPIResponse> => {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  
  return await response.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, conversationId, userName, message } = await req.json();
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    

    if (action === "createTopic") {
      // Create a new forum topic
      const response = await callTelegramAPI("createForumTopic", {
        chat_id: chatId,
        name: `💬 ${userName || "User"}`,
        icon_color: 0x6FB9F0,
      });

      if (!response.ok) {
        throw new Error(`Failed to create topic: ${response.description}`);
      }

      const topicId = response.result.message_thread_id;
      

      // Update conversation with topic ID
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ telegram_topic_id: topicId })
        .eq("id", conversationId);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
      }

      // Send initial message to topic
      if (message) {
        await callTelegramAPI("sendMessage", {
          chat_id: chatId,
          message_thread_id: topicId,
          text: `🆕 New support conversation\n\n📝 **Message:**\n${message}\n\n👤 **User:** ${userName || "Unknown"}`,
          parse_mode: "Markdown",
        });
      }

      return new Response(JSON.stringify({ success: true, topicId }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "sendMessage") {
      // Get conversation with topic ID
      const { data: conversation } = await supabase
        .from("conversations")
        .select("telegram_topic_id")
        .eq("id", conversationId)
        .single();

      if (!conversation?.telegram_topic_id) {
        throw new Error("No topic found for conversation");
      }

      // Send message to topic
      const response = await callTelegramAPI("sendMessage", {
        chat_id: chatId,
        message_thread_id: conversation.telegram_topic_id,
        text: `💬 **User message:**\n${message}`,
        parse_mode: "Markdown",
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.description}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "closeTopic") {
      // Get conversation with topic ID
      const { data: conversation } = await supabase
        .from("conversations")
        .select("telegram_topic_id")
        .eq("id", conversationId)
        .single();

      if (!conversation?.telegram_topic_id) {
        throw new Error("No topic found for conversation");
      }

      // Send closing message
      await callTelegramAPI("sendMessage", {
        chat_id: chatId,
        message_thread_id: conversation.telegram_topic_id,
        text: " **Conversation closed**\n\nThis topic will be deleted shortly.",
        parse_mode: "Markdown",
      });

      // Close the topic
      await callTelegramAPI("closeForumTopic", {
        chat_id: chatId,
        message_thread_id: conversation.telegram_topic_id,
      });

      // Delete the topic after a brief delay
      setTimeout(async () => {
        await callTelegramAPI("deleteForumTopic", {
          chat_id: chatId,
          message_thread_id: conversation.telegram_topic_id,
        });
      }, 2000);

      // Update conversation status
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ 
          status: "closed",
          telegram_topic_id: null
        })
        .eq("id", conversationId);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error("Invalid action");

  } catch (error) {
    console.error("Telegram topic manager error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});