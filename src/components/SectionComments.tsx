import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Trash2,
  Loader2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  content: string;
  image_url?: string | null; // [!code ++] Tambahkan field ini
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface SectionCommentsProps {
  songId: string;
  creatorId: string;
  sectionId: string;
  songTitle?: string; // [!code ++] Opsional: untuk konteks email
}

export function SectionComments({
  songId,
  creatorId,
  sectionId,
  songTitle,
}: SectionCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // [!code ++] State & Ref untuk Image Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
    fetchCommentCount();
  }, []);

  const fetchCommentCount = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;

    const isCreator = userId === creatorId;

    const { data, error } = await supabase
      .from("section_comments")
      .select("id, user_id, song_id, songs!inner(user_id)")
      .eq("section_id", sectionId);

    if (error) {
      console.error(error);
      return;
    }

    const filtered = isCreator
      ? data
      : data.filter((c) => c.user_id === userId);

    setCommentCount(filtered.length);
  };

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen]);

  const fetchComments = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return;
    const { data, error } = await supabase
      .from("section_comments")
      .select(`
        *,
        profiles:user_id(display_name, avatar_url),
        songs:song_id(id, title, slug, user_id)
      `)
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    let filtered = [];

    if (userId === creatorId) {
      filtered = data || [];
    } else {
      filtered = (data || []).filter((c) => c.user_id === userId);
    }

    setComments(filtered);
    setCommentCount(filtered.length);
  };

  // [!code ++] Fungsi Handle File Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validasi size (misal max 2MB)
      if (file.size > 2 * 1024 * 1024) {
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

  // [!code ++] Fungsi Hapus Pilihan Gambar
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePostComment = async () => {
    if ((!newComment.trim() && !selectedFile) || !currentUserId) return;
    setLoading(true);

    let uploadedImageUrl = null;

    // 1. Upload Image jika ada
    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${songId}/${fileName}`; // Folder per lagu biar rapi

      const { error: uploadError } = await supabase.storage
        .from("comment-attachments")
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload failed",
          description: "Could not upload image",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("comment-attachments").getPublicUrl(filePath);

      uploadedImageUrl = publicUrl;
    }

    // 2. Insert Comment ke Database
    const { error } = await supabase.from("section_comments").insert({
      song_id: songId,
      section_id: sectionId,
      user_id: currentUserId,
      content: newComment,
      image_url: uploadedImageUrl, // [!code ++] Masukkan URL gambar
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } else {
      supabase.functions.invoke("notify-comment", {
        body: {
          songId,
          commentContent: newComment,
          commenterId: currentUserId,
          imageUrl: uploadedImageUrl,
        },
      });

      setNewComment("");
      clearSelectedFile(); // Reset gambar
      fetchComments();
      setCommentCount((prev) => prev + 1);
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase
      .from("section_comments")
      .delete()
      .eq("id", commentId);
    if (!error) {
      setComments(comments.filter((c) => c.id !== commentId));
      setCommentCount((prev) => prev - 1);
    }
  };

  return (
    <div className="mt-2 border-t pt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="text-muted-foreground hover:text-primary gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {isOpen ? "Hide Comments" : `Comments (${commentCount})`}
      </Button>

      {isOpen && (
        <div className="mt-4 space-y-4 pl-2 sm:pl-4 animate-in slide-in-from-top-2 duration-200">
          {/* Comment List */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No comments yet. Be the first!
              </p>
            )}

            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 items-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.profiles?.avatar_url || ""} />
                  <AvatarFallback>
                    {comment.profiles?.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="bg-muted/40 p-3 rounded-lg text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-primary">
                        {comment.profiles?.display_name || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-foreground/90 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>

                  {/* [!code ++] Tampilkan Gambar Komentar */}
                  {comment.image_url && (
                    <div className="mt-2">
                      <img
                        src={comment.image_url}
                        alt="Attachment"
                        className="max-w-[200px] max-h-[200px] rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() =>
                          window.open(comment.image_url!, "_blank")
                        }
                      />
                    </div>
                  )}
                </div>

                {currentUserId === comment.user_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="pt-2 border-t">
            {/* [!code ++] Preview Image sebelum dikirim */}
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

            <div className="flex gap-2 items-center">
              {/* [!code ++] Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />

              {/* [!code ++] Tombol Trigger File Input */}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Attach image"
              >
                <ImageIcon className="h-5 w-5" />
              </Button>

              <Input
                placeholder="Add a note or attach image"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handlePostComment()
                }
                className="text-sm flex-1"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={handlePostComment}
                disabled={loading || (!newComment.trim() && !selectedFile)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
