import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client"; // Sesuaikan path import supabase kamu
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Asumsi pakai shadcn/ui, jika tidak pakai <table> biasa html
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, Search, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns"; // Optional: install date-fns jika belum ada

interface CommentData {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  song_id: string;
  // Join ke tabel profiles (User yang komen)
  profile: {
    display_name: string | null;
    email?: string | null;
  } | null;
  // Join ke tabel songs
  song: {
    id: string;
    title: string;
    slug: string;
    // Join dari songs ke profiles (Creator lagu)
    creator_profile: {
      display_name: string | null;
    } | null;
  } | null;
}

const AdminComments = () => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Query Supabase dengan Nested Joins
      const { data, error } = await supabase
        .from("section_comments")
        .select(
          `
          *,
          profile:profiles!user_id (display_name),
          song:songs!song_id (
            id,
            title,
            slug,
            user_id,
            creator_profile:profiles!user_id (display_name)
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Mapping data agar sesuai tipe (karena join supabase kadang return array/single object beda2)
      const formattedData = (data || []).map((item: any) => ({
        ...item,
        profile: item.profile,
        song: item.song
          ? {
              ...item.song,
              creator_profile: item.song.creator_profile,
            }
          : null,
      }));

      setComments(formattedData);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter pencarian sederhana
  const filteredComments = comments.filter(
    (c) =>
      c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.profile?.display_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      c.song?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Comments Management
          </h1>
          <p className="text-muted-foreground">
            Monitor user comments and interactions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All Comments ({filteredComments.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search comment, user, or song..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User (Commenter)</TableHead>
                    <TableHead className="w-[40%]">Comment</TableHead>
                    <TableHead>Song Title</TableHead>
                    <TableHead>Creator (Owner)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No comments found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComments.map((comment) => (
                      <TableRow key={comment.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {comment.created_at
                            ? new Date(comment.created_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {comment.profile?.display_name || "Unknown User"}
                        </TableCell>
                        <TableCell>
                          <p className="line-clamp-2 text-sm">
                            "{comment.content}"
                          </p>
                        </TableCell>
                        <TableCell>
                          {comment.song?.title || "Unknown Song"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {comment.song?.creator_profile?.display_name ||
                              "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {comment.song && (
                            <Button asChild size="sm" variant="outline">
                              <Link
                                to={`/arrangement/${comment.song.id}/${comment.song.slug}`}
                                target="_blank" // Buka di tab baru agar admin tidak keluar dashboard
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminComments;
