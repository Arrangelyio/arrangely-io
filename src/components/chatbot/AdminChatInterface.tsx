import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  User,
  Bot,
  Shield,
  CheckCircle,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  image_url?: string | null; // [!code ++] Tambah field image
  message_type: "user" | "bot" | "admin";
  created_at: string;
  sender_id?: string;
}

interface Conversation {
  id: string;
  title: string;
  is_escalated: boolean;
  status: string;
  user_id: string;
  admin_id?: string;
  profiles?: {
    display_name: string;
  };
}

interface AdminChatInterfaceProps {
  conversationId: string;
}

export const AdminChatInterface = ({
  conversationId,
}: AdminChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // [!code ++] Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, previewUrl]); // Scroll juga saat preview muncul

  useEffect(() => {
    loadConversation();
    loadMessages();
    getCurrentUser();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`admin-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          profiles!conversations_user_id_fkey1(display_name)
        `
        )
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      setConversation(data as any);
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data || []) as Message[]);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // [!code ++] Handle File Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        // 2MB Limit
        toast({
          title: "File too large",
          description: "Max image size is 2MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // [!code ++] Clear File
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !currentUser) return;

    setIsLoading(true);
    let uploadedImageUrl = null;

    try {
      // 1. Upload Image logic
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${conversationId}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // 2. Insert Message
      const { error } = await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: newMessage,
          image_url: uploadedImageUrl, // Insert URL
          message_type: "admin",
        },
      ]);

      if (error) throw error;

      // 3. Assign Admin if needed
      if (conversation && !conversation.admin_id) {
        await supabase
          .from("conversations")
          .update({ admin_id: currentUser.id })
          .eq("id", conversationId);
      }

      // 4. [!code ++] Trigger Email Notification (Hanya jika Admin)
      supabase.functions.invoke("notify-support-reply", {
        body: {
          conversationId,
          content: newMessage || "Sent an image",
          adminName: "Admin Support", // Bisa diganti dynamic profile name
          imageUrl: uploadedImageUrl,
        },
      });

      setNewMessage("");
      clearSelectedFile(); // Reset image state
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeConversation = async () => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ status: "closed" })
        .eq("id", conversationId);

      if (error) throw error;

      // Send closing message
      await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          content:
            "This conversation has been closed by admin. Thank you for contacting Arrangely support!",
          message_type: "bot",
          is_predefined: true,
        },
      ]);

      setConversation((prev) => (prev ? { ...prev, status: "closed" } : null));

      toast({
        title: "Conversation Closed",
        description: "The conversation has been marked as closed.",
      });
    } catch (error) {
      console.error("Error closing conversation:", error);
      toast({
        title: "Error",
        description: "Failed to close conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case "user":
        return <User className="h-4 w-4" />;
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "bot":
        return <Bot className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!conversation) {
    return <div>Loading conversation...</div>;
  }

  return (
    <Card className="flex flex-col h-[700px] max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold">{conversation.title}</h3>
            <p className="text-sm text-muted-foreground">
              Customer: {conversation.profiles?.display_name || "Unknown User"}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant={conversation.is_escalated ? "destructive" : "secondary"}
            >
              {conversation.is_escalated ? "Escalated" : "Normal"}
            </Badge>
            <Badge
              variant={
                conversation.status === "active" ? "default" : "secondary"
              }
            >
              {conversation.status}
            </Badge>
          </div>
        </div>

        {conversation.status === "active" && (
          <Button
            variant="outline"
            size="sm"
            onClick={closeConversation}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Close Conversation
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.message_type === "admin"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.message_type === "admin"
                    ? "bg-blue-500 text-white ml-4"
                    : message.message_type === "user"
                    ? "bg-primary text-primary-foreground mr-4"
                    : "bg-muted mr-4"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getMessageIcon(message.message_type)}
                  <span className="text-xs font-medium capitalize">
                    {message.message_type === "admin"
                      ? "Admin"
                      : message.message_type}
                  </span>
                </div>

                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* [!code ++] Render Image */}
                {message.image_url && (
                  <div className="mt-2">
                    <img
                      src={message.image_url}
                      alt="Attachment"
                      className="max-w-[200px] rounded-md cursor-pointer hover:opacity-90"
                      onClick={() => window.open(message.image_url!, "_blank")}
                    />
                  </div>
                )}

                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      {conversation.status === "active" && (
        <div className="p-4 border-t">
          {/* [!code ++] Image Preview */}
          {previewUrl && (
            <div className="relative inline-block mb-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-md border"
              />
              <button
                onClick={clearSelectedFile}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            {/* [!code ++] Image Upload Buttons */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="mb-[2px]"
            >
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your admin response..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={(!newMessage.trim() && !selectedFile) || isLoading}
              size="sm"
              className="mb-[2px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
