// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, AlertTriangle, User } from "lucide-react";
import { AdminChatInterface } from "./AdminChatInterface";

interface Conversation {
  id: string;
  title: string;
  is_escalated: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  admin_id?: string;
  profiles?: {
    display_name: string;
  } | null;
  _count?: {
    messages: number;
  };
}

type FilterStatus = "all" | "escalated" | "active" | "closed";

export const AdminChatDashboard = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  // const [selectedConversation, setSelectedConversation] = useState<
  //   string | null
  // >(null);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    loadConversations();

    // Real-time listener untuk conversations
    const channel = supabase
      .channel("admin-conversations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async () => {
    try {
      // Ambil semua conversations
      const { data: conversationsData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (convError) throw convError;
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      // Ambil semua user_id unik
      const userIds = [...new Set(conversationsData.map((c) => c.user_id))];

      // Ambil profiles (display_name)
      const { data: profilesData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      // Ambil jumlah pesan per conversation (grouped)
      const { data: messageCounts, error: msgError } = await supabase
        .from("messages")
        .select("conversation_id", { count: "exact", head: true })
        .in(
          "conversation_id",
          conversationsData.map((c) => c.id)
        );

      if (msgError) throw msgError;

      // Gabungkan data profiles + message count
      const merged = conversationsData.map((conv) => {
        const profile = profilesData.find((p) => p.user_id === conv.user_id);
        const msgCount = messageCounts?.find(
          (m) => m.conversation_id === conv.id
        );

        return {
          ...conv,
          profiles: profile ? { display_name: profile.display_name } : null,
          _count: { messages: (msgCount as any)?.count || 0 },
        };
      });

      setConversations(merged);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = useMemo(() => {
    switch (filterStatus) {
      case "all":
        return conversations;
      case "escalated":
        return conversations.filter(
          (c) => c.is_escalated && c.status === "active"
        );
      // PERUBAHAN: Tambahkan kondisi `!c.is_escalated`
      // untuk mengecualikan chat eskalasi dari filter "Active"
      case "active":
        return conversations.filter(
          (c) => !c.is_escalated && c.status === "active"
        );
      case "closed":
        return conversations.filter((c) => c.status === "closed");
      default:
        return conversations;
    }
  }, [conversations, filterStatus]);

  const getStatusColor = (conversation: Conversation) => {
    if (conversation.is_escalated && conversation.status === "active") {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }
    if (conversation.status === "active") {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const getStatusText = (conversation: Conversation) => {
    if (conversation.is_escalated && conversation.status === "active") {
      return "Escalated";
    }
    return (
      conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)
    );
  };

  // if (selectedConversation) {
  //   return (
  //     <div className="container mx-auto p-6">
  //       <div className="mb-4">
  //         <Button
  //           variant="outline"
  //           onClick={() => setSelectedConversation(null)}
  //         >
  //           ← Back to Dashboard
  //         </Button>
  //       </div>
  //       <AdminChatInterface conversationId={selectedConversation} />
  //     </div>
  //   );
  // }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chat Support Dashboard</h1>
        <p className="text-muted-foreground">
          Manage customer support conversations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setFilterStatus("all")}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">
                Total Conversations
              </p>
              <p className="text-2xl font-bold">{conversations.length}</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setFilterStatus("escalated")}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Escalated</p>
              <p className="text-2xl font-bold">
                {
                  conversations.filter(
                    (c) => c.is_escalated && c.status === "active"
                  ).length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setFilterStatus("active")}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">
                {conversations.filter((c) => c.status === "active").length}
              </p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setFilterStatus("closed")}
        >
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Closed</p>
              <p className="text-2xl font-bold">
                {conversations.filter((c) => c.status === "closed").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Conversations List */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Conversations</h2>

          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversations found
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    // onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{conversation.title}</h3>
                        <Badge className={getStatusColor(conversation)}>
                          {getStatusText(conversation)}
                        </Badge>
                        {conversation.is_escalated && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {conversation.profiles?.display_name ||
                            "Unknown User"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {conversation._count?.messages || 0} messages
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(
                            conversation.updated_at
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Ganti URL `/admin/chat/` sesuai dengan routing aplikasi Anda
                        window.open(`/admin/chat/${conversation.id}`, "_blank");
                      }}
                    >
                      View Chat
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </Card>
    </div>
  );
};
