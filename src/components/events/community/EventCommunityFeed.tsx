import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EventCommunityFeedProps {
  eventId: string;
  isOrganizer?: boolean;
}

export function EventCommunityFeed({ eventId, isOrganizer = false }: EventCommunityFeedProps) {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
    subscribeToNewPosts();
  }, [eventId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("event_community_posts")
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq("event_id", eventId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNewPosts = () => {
    const channel = supabase
      .channel(`event-posts-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_community_posts",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;

    setPosting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from("event_community_posts").insert({
        event_id: eventId,
        user_id: userData.user?.id,
        content: newPost,
        is_announcement: isOrganizer,
      });

      if (error) throw error;

      setNewPost("");
      toast({
        title: "Success",
        description: isOrganizer ? "Announcement posted" : "Post created",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading community feed...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder={
                isOrganizer
                  ? "Post an announcement to all attendees..."
                  : "Share your thoughts..."
              }
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
            />
            <Button onClick={handlePost} disabled={posting || !newPost.trim()} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {posting ? "Posting..." : isOrganizer ? "Post Announcement" : "Post"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No posts yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {post.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{post.profiles?.display_name || "Anonymous"}</p>
                      {post.is_announcement && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Announcement
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
