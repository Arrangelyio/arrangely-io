import { useState, useEffect } from "react";
import { MessageSquare, X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "./ChatInterface";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const FloatingChatWidget = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // const [isMinimized, setIsMinimized] = useState(false);
  // const [user, setUser] = useState<User | null>(null);
  // const [unreadCount, setUnreadCount] = useState(0);
  // const [chatEnabled, setChatEnabled] = useState(true);

  // useEffect(() => {
  //     const getUser = async () => {
  //         const {
  //             data: { user },
  //         } = await supabase.auth.getUser();
  //         setUser(user);

  //         // if (user) {
  //         //   // Check if chat is enabled for this user
  //         //   const { data: chatSettings } = await supabase
  //         //     .rpc('get_chat_settings', { user_id: user.id });
  //         //   setChatEnabled(chatSettings !== false);
  //         // }
  //     };

  //     getUser();
  // }, []);

  // useEffect(() => {
  //     if (!user || !isOpen) return;

  //     // Subscribe to new messages to show unread count
  //     const channel = supabase
  //         .channel("new-messages")
  //         .on(
  //             "postgres_changes",
  //             {
  //                 event: "INSERT",
  //                 schema: "public",
  //                 table: "messages",
  //                 filter: `sender_id=neq.${user.id}`,
  //             },
  //             (payload) => {
  //                 if (!isOpen) {
  //                     setUnreadCount((prev) => prev + 1);
  //                 }
  //             }
  //         )
  //         .subscribe();

  //     return () => {
  //         supabase.removeChannel(channel);
  //     };
  // }, [user, isOpen]);

  // const handleToggle = () => {
  //     setIsOpen(!isOpen);
  //     if (!isOpen) {
  //         setUnreadCount(0);
  //     }
  // };

  // const handleMinimize = () => {
  //     setIsMinimized(!isMinimized);
  // };

  // const handleClose = () => {
  //     setIsOpen(false);
  //     setIsMinimized(false);
  // };

  // if (!user || !chatEnabled) return null;

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fungsi untuk direct ke WhatsApp
  const handleWhatsAppClick = () => {
    const phoneNumber = "6281393693999";
    const message = encodeURIComponent(
      "Halo Admin Arrangely, saya ingin bertanya...",
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  };

  /* EFFECT UNREAD MESSAGES DIKOMENTARI
    useEffect(() => {
        if (!user || !isOpen) return;
        const channel = supabase
            .channel("new-messages")
            // ... (logika subscribe)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [user, isOpen]);
    */

  // Widget hanya muncul jika user sudah login (sesuai logika asli Anda)
  if (!user) return null;

  return (
    <div className="fixed bottom-28 right-2 z-50 md:bottom-6 md:right-6">
      {/* {isOpen && (
        <Card
          className={`mb-4 w-96 h-[500px] flex flex-col transition-all duration-300 ${
            isMinimized ? "h-12" : "h-[500px]"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <span className="font-medium">Support Chat</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
              >
                {isMinimized ? (
                  <Maximize2 className="h-3 w-3" />
                ) : (
                  <Minimize2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <ChatInterface user={user} isWidget={true} />
            </div>
          )}
        </Card>
      )}

      <Button
        onClick={handleToggle}
        className="h-14 w-14 rounded-full shadow-lg relative"
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button> */}
      <Button
        onClick={handleWhatsAppClick}
        className="h-14 w-14 rounded-full shadow-lg relative" // bg-[#25D366] dihapus agar pakai warna default
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />

        {/* LOGIKA BADGE UNREAD DIKOMENTARI
            {unreadCount > 0 && ( <Badge>...</Badge> )}
        */}
      </Button>
    </div>
  );
};
