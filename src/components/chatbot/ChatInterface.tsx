import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Send,
  HeadphonesIcon,
  AlertTriangle,
  Image as ImageIcon, // [!code ++]
  X, // [!code ++]
  Loader2, // [!code ++]
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  id: string;
  content: string;
  image_url?: string | null;
  message_type: "user" | "bot" | "admin";
  created_at: string;
  sender_id?: string;
}

interface Conversation {
  id: string;
  is_escalated: boolean;
  status: string;
  title?: string;
  language?: string;
}

interface ChatInterfaceProps {
  user: User;
  isWidget?: boolean;
}

export const ChatInterface = ({
  user,
  isWidget = false,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t, setLanguage, language } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, previewUrl]);

  useEffect(() => {
    initializeChat();
  }, [user]);

  useEffect(() => {
    if (!conversation) return;

    // Subscribe to real-time message updates
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
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
  }, [conversation]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        // Limit 2MB
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

  const initializeChat = async () => {
    try {
      // Check for existing active conversation
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (existingConversation) {
        setConversation(existingConversation);
        await loadMessages(existingConversation.id);
      } else {
        await createNewConversation();
      }
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const createNewConversation = async () => {
    try {
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert([
          {
            user_id: user.id,
            title: "Arrangely Support Chat",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setConversation(newConversation);

      // Check if language preference is set, if not show language selector
      // if (!(newConversation as any).language) {
      //   setShowLanguageSelector(true);
      //   await sendBotMessage(newConversation.id, "Hello! Welcome to Arrangely support.\n\nPlease select your preferred language:\n🇺🇸 English\n🇮🇩 Indonesian (Bahasa Indonesia)");
      // } else {
      // Set language from conversation and send appropriate welcome message
      // setLanguage((newConversation as any).language as "en" | "id");
      const welcomeMessage =
        "Halo! Selamat datang di Arrangely. Saya di sini untuk membantu Anda membuat aransemen lagu, mengelola library, dan menggunakan fitur-fitur kami. Bagaimana saya dapat membantu Anda hari ini?";
      await sendBotMessage(newConversation.id, welcomeMessage);
      // }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadMessages = async (conversationId: string) => {
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

  const handleLanguageSelection = async (selectedLanguage: "en" | "id") => {
    if (!conversation) return;

    try {
      // Update conversation with selected language
      const { error } = await supabase
        .from("conversations")
        .update({ language: selectedLanguage } as any)
        .eq("id", conversation.id);

      if (error) throw error;

      setLanguage(selectedLanguage);
      setShowLanguageSelector(false);
      setConversation((prev) =>
        prev ? { ...prev, language: selectedLanguage } : null
      );

      // Send appropriate welcome message
      const welcomeMessage =
        selectedLanguage === "id"
          ? "Terima kasih! Saya di sini untuk membantu Anda dengan membuat aransemen lagu, mengelola perpustakaan, dan menggunakan fitur-fitur Arrangely. Bagaimana saya dapat membantu Anda hari ini?"
          : "Thank you! I'm here to help you with creating song arrangements, managing your library, and using Arrangely features. How can I assist you today?";

      await sendBotMessage(conversation.id, welcomeMessage);
    } catch (error) {
      console.error("Error setting language:", error);
    }
  };

  const findBotResponse = async (userMessage: string) => {
    try {
      const { data: responses, error } = await supabase
        .from("predefined_responses")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;

      const userMessageLower = userMessage.toLowerCase();

      // Find the best matching response
      for (const response of responses) {
        const hasKeyword = response.trigger_keywords.some((keyword: string) =>
          userMessageLower.includes(keyword.toLowerCase())
        );

        if (hasKeyword) {
          return response.response_text;
        }
      }

      // Default response based on language
      const isIndonesian = conversation?.language === "id";
      return isIndonesian
        ? "Saya memahami Anda mencari bantuan dengan Arrangely. Bisakah Anda lebih spesifik tentang apa yang ingin Anda ketahui? Anda dapat bertanya tentang membuat aransemen, kolaborasi, ekspor, atau fitur lainnya. Jika Anda membutuhkan bantuan langsung, Anda dapat mengeskalasi chat ini ke tim admin kami."
        : "I understand you're looking for help with Arrangely. Could you please be more specific about what you'd like to know? You can ask about creating arrangements, collaboration, exporting, or any other features. If you need direct assistance, you can escalate this chat to our admin team.";
    } catch (error) {
      console.error("Error finding bot response:", error);
      const isIndonesian = conversation?.language === "id";
      return isIndonesian
        ? "Maaf, saya mengalami masalah dalam memproses permintaan Anda sekarang. Silakan coba lagi atau eskalasi ke dukungan admin."
        : "I'm sorry, I'm having trouble processing your request right now. Please try again or escalate to admin support.";
    }
  };

  const sendBotMessage = async (conversationId: string, content: string) => {
    try {
      const { error } = await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          content,
          message_type: "bot",
          is_predefined: true,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error("Error sending bot message:", error);
    }
  };

  const sendMessage = async () => {
    // [!code warning] Update kondisi ini: izinkan kirim jika ada text ATAU file
    if ((!newMessage.trim() && !selectedFile) || !conversation) return;

    setIsLoading(true);
    let uploadedImageUrl = null; // [!code ++]

    try {
      // [!code ++] 1. Upload Image Logic
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${conversation.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-attachments").getPublicUrl(fileName);

        uploadedImageUrl = publicUrl;
      }

      // [!code warning] 2. Insert Message dengan image_url
      const { error: userMessageError } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversation.id,
            sender_id: user.id,
            content: newMessage,
            image_url: uploadedImageUrl, // [!code ++] Masukkan URL
            message_type: "user",
          },
        ]);

      if (userMessageError) throw userMessageError;

      const userMessageContent = newMessage;
      setNewMessage("");
      clearSelectedFile(); // [!code ++] Reset input file

      // ... sisa logika (Telegram / Bot Response) biarkan tetap sama ...
      // (Kode eskalasi telegram dll tetap berjalan normal)

      if (conversation.is_escalated) {
        // ... existing telegram logic ...
      } else if (!showLanguageSelector) {
        // ... existing bot logic ...
      }
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

  const escalateToAdmin = async () => {
    if (!conversation || !user) {
      toast({
        title: "Login Required",
        description: "You must be logged in to escalate to admin support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("conversations")
        .update({ is_escalated: true })
        .eq("id", conversation.id);

      if (error) throw error;

      setConversation((prev) =>
        prev ? { ...prev, is_escalated: true } : null
      );

      const conversationIsIndonesian = conversation.language === "id";
      const escalationMessage = conversationIsIndonesian
        ? "🚀 Percakapan ini telah diteruskan ke tim admin kami. Admin akan segera bergabung untuk membantu Anda."
        : "🚀 This conversation has been escalated to our admin team. An admin will join shortly to assist you.";

      // Create Telegram topic for this conversation
      const { error: telegramError } = await supabase.functions.invoke(
        "telegram-topic-manager",
        {
          body: {
            action: "createTopic",
            conversationId: conversation.id,
            userName: user.user_metadata?.display_name || user.email,
            message:
              messages.length > 0
                ? messages[messages.length - 1].content
                : "New support conversation",
          },
        }
      );

      if (telegramError) {
        console.error("Failed to create Telegram topic:", telegramError);
      }

      await supabase.from("messages").insert([
        {
          conversation_id: conversation.id,
          content: escalationMessage,
          message_type: "bot",
          is_predefined: true,
        },
      ]);

      // Send email notification to admin
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        await fetch("https://api.arrangely.io/send-escalation-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            userEmail: user.email,
            userName: profile?.display_name || user.email || "Unknown User",
            conversationTitle: conversation.title || "Support Chat",
          }),
        });
      } catch (emailError) {
        console.error("Error sending escalation email:", emailError);
        // Don't show error to user as escalation still worked
      }

      const conversationLanguage = conversation.language === "id";
      toast({
        title: conversationLanguage
          ? "Diteruskan ke Admin"
          : "Escalated to Admin",
        description: conversationLanguage
          ? "Admin akan segera bergabung untuk membantu Anda."
          : "An admin will join this chat shortly to help you.",
      });
    } catch (error) {
      console.error("Error escalating to admin:", error);
      toast({
        title: "Error",
        description: "Failed to escalate to admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showLanguageSelector) return; // Don't send message when language selector is shown
      sendMessage();
    }
  };

  return (
    <div className={`flex flex-col ${isWidget ? "h-full" : "h-[600px]"}`}>
      {!isWidget && (
        <Card className="flex flex-col h-[600px] max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <HeadphonesIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Arrangely Support</h3>
              {conversation?.is_escalated && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <AlertTriangle className="h-3 w-3" />
                  Admin Support
                </span>
              )}
            </div>
            {conversation && !conversation.is_escalated && user && (
              <Button
                variant="outline"
                size="sm"
                onClick={escalateToAdmin}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate to Admin
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
                    message.message_type === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.message_type === "user"
                        ? "bg-primary text-primary-foreground ml-4"
                        : message.message_type === "admin"
                        ? "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100 mr-4"
                        : "bg-muted mr-4"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Language Selector */}
              {showLanguageSelector && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] mr-4 space-y-2">
                    <Button
                      onClick={() => handleLanguageSelection("en")}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      🇺🇸 English
                    </Button>
                    <Button
                      onClick={() => handleLanguageSelection("id")}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      🇮🇩 Indonesian (Bahasa Indonesia)
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            {" "}
            {/* Sesuaikan padding jika widget */}
            {/* [!code ++] Preview Image */}
            {previewUrl && (
              <div className="relative inline-block mb-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-16 w-16 object-cover rounded-md border"
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
              {/* [!code ++] Hidden File Input & Button */}
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
                disabled={isLoading || showLanguageSelector}
                className="mb-[2px]" // Biar sejajar
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  conversation?.language === "id"
                    ? "Ketik pesan..."
                    : "Type your message..."
                }
                disabled={isLoading || showLanguageSelector}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                // [!code warning] Update disabled logic
                disabled={
                  (!newMessage.trim() && !selectedFile) ||
                  isLoading ||
                  showLanguageSelector
                }
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
        </Card>
      )}

      {isWidget && (
        <>
          {/* Widget Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.message_type === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-2 rounded-lg text-sm ${
                      message.message_type === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.message_type === "admin"
                        ? "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.image_url && (
                      <div className="mt-2">
                        <img
                          src={message.image_url}
                          alt="Attachment"
                          className="max-w-full rounded-md border cursor-pointer hover:opacity-90"
                          onClick={() =>
                            window.open(message.image_url!, "_blank")
                          }
                        />
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {/* Language Selector for Widget */}
              {showLanguageSelector && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] space-y-2">
                    <Button
                      onClick={() => handleLanguageSelection("en")}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      🇺🇸 English
                    </Button>
                    <Button
                      onClick={() => handleLanguageSelection("id")}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      🇮🇩 Indonesian
                    </Button>
                  </div>
                </div>
              )}
              {conversation?.is_escalated && (
                <div className="text-center py-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    <AlertTriangle className="h-3 w-3" />
                    Admin Support Active
                  </span>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Widget Input */}
          <div className="p-3 border-t bg-background">
            {conversation &&
              !conversation.is_escalated &&
              !showLanguageSelector && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={escalateToAdmin}
                  className="w-full mb-2 text-xs"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {conversation.language === "id"
                    ? "Butuh Dukungan Manusia?"
                    : "Need Human Support?"}
                </Button>
              )}

            {/* [!code ++] Preview Gambar di Widget */}
            {previewUrl && (
              <div className="relative inline-block mb-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-14 w-14 object-cover rounded-md border"
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
              {/* [!code ++] Input File Hidden (PENTING) */}
              <input
                type="file"
                ref={fileInputRef} // Ref ini akan bekerja karena input desktop sedang hidden/unmounted
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />

              {/* [!code ++] Tombol Upload Image */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || showLanguageSelector}
                className="h-8 w-8 mb-[2px] shrink-0" // Ukuran disesuaikan widget
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  conversation?.language === "id" ? "Ketik pesan..." : "Type..."
                }
                disabled={isLoading || showLanguageSelector}
                className="flex-1 text-sm h-9"
              />
              <Button
                onClick={sendMessage}
                // [!code warning] Update disabled logic (Text ATAU File)
                disabled={
                  (!newMessage.trim() && !selectedFile) ||
                  isLoading ||
                  showLanguageSelector
                }
                size="sm"
                className="h-9 px-3 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
