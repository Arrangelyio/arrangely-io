import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Music, 
  Users, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit, 
  Star, 
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Song {
  id: string;
  title: string;
  artist: string;
  user_id: string;
  is_public: boolean;
  views_count: number;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

interface CreatorApplication {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  musical_background: string;
  motivation: string;
}

interface ContentStats {
  totalSongs: number;
  publicSongs: number;
  totalUsers: number;
  pendingApplications: number;
  totalViews: number;
}

const AdminContent = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [stats, setStats] = useState<ContentStats>({
    totalSongs: 0,
    publicSongs: 0,
    totalUsers: 0,
    pendingApplications: 0,
    totalViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<CreatorApplication | null>(null);
  
  // Pagination states
  const [currentSongPage, setCurrentSongPage] = useState(1);
  const [currentAppPage, setCurrentAppPage] = useState(1);
  const [totalSongsCount, setTotalSongsCount] = useState(0);
  const [totalAppsCount, setTotalAppsCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSongs();
  }, [currentSongPage, visibilityFilter, searchTerm]);

  useEffect(() => {
    loadApplications();
  }, [currentAppPage, statusFilter, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load statistics only
      const { data: songStats } = await supabase
        .from('songs')
        .select('is_public, views_count');

      const { data: userStats } = await supabase
        .from('profiles')
        .select('id');

      const { data: appsData } = await supabase
        .from('creator_applications')
        .select('status');

      const totalSongs = songStats?.length || 0;
      const publicSongs = songStats?.filter(s => s.is_public).length || 0;
      const totalViews = songStats?.reduce((sum, s) => sum + (s.views_count || 0), 0) || 0;
      const pendingApplications = appsData?.filter(a => a.status === 'pending').length || 0;

      setStats({
        totalSongs,
        publicSongs,
        totalUsers: userStats?.length || 0,
        pendingApplications,
        totalViews
      });

      // Load initial data for both tabs
      await Promise.all([loadSongs(), loadApplications()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load content data');
    } finally {
      setLoading(false);
    }
  };

  const loadSongs = async () => {
    try {
      // Build query filters
      let query = supabase
        .from('songs')
        .select(`
          id,
          title,
          artist,
          user_id,
          is_public,
          views_count,
          created_at
        `, { count: 'exact' });

      // Apply filters
      if (visibilityFilter !== 'all') {
        query = query.eq('is_public', visibilityFilter === 'public');
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`);
      }

      const { data: songsData, error: songsError, count } = await query
        .order('created_at', { ascending: false })
        .range((currentSongPage - 1) * itemsPerPage, currentSongPage * itemsPerPage - 1);

      if (songsError) throw songsError;

      // Get profiles separately for each song
      let songsWithProfiles = [];
      if (songsData) {
        for (const song of songsData) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', song.user_id)
            .single();
          
          songsWithProfiles.push({
            ...song,
            profiles: profile
          });
        }
      }

      setSongs(songsWithProfiles || []);
      setTotalSongsCount(count || 0);
    } catch (error) {
      console.error('Error loading songs:', error);
      toast.error('Failed to load songs');
    }
  };

  const loadApplications = async () => {
    try {
      let query = supabase
        .from('creator_applications')
        .select('*', { count: 'exact' });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: appsData, error: appsError, count } = await query
        .order('created_at', { ascending: false })
        .range((currentAppPage - 1) * itemsPerPage, currentAppPage * itemsPerPage - 1);

      if (appsError) throw appsError;

      setApplications(appsData || []);
      setTotalAppsCount(count || 0);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Failed to load applications');
    }
  };

  const toggleSongVisibility = async (songId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('songs')
        .update({ is_public: !currentVisibility })
        .eq('id', songId);

      if (error) throw error;

      setSongs(songs.map(song => 
        song.id === songId 
          ? { ...song, is_public: !currentVisibility }
          : song
      ));

      toast.success(`Song ${!currentVisibility ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      console.error('Error updating song visibility:', error);
      toast.error('Failed to update song visibility');
    }
  };

  const deleteSong = async (songId: string) => {
    try {
      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;

      setSongs(songs.filter(song => song.id !== songId));
      toast.success('Song deleted successfully');
    } catch (error) {
      console.error('Error deleting song:', error);
      toast.error('Failed to delete song');
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string, adminNotes?: string) => {
    try {
      const { error } = await supabase
        .from('creator_applications')
        .update({ 
          status: newStatus,
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', appId);

      if (error) throw error;

      setApplications(applications.map(app => 
        app.id === appId 
          ? { ...app, status: newStatus }
          : app
      ));

      toast.success(`Application ${newStatus} successfully`);
      setSelectedApplication(null);
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const exportData = async (type: 'songs' | 'applications') => {
    try {
      const data = type === 'songs' ? songs : applications;
      const csvContent = type === 'songs' 
        ? "Title,Artist,Creator,Public,Views,Created\n" + 
          songs.map(s => `"${s.title}","${s.artist}","${s.profiles?.display_name}",${s.is_public},${s.views_count},${new Date(s.created_at).toLocaleDateString()}`).join('\n')
        : "Name,Email,Status,Created,Background\n" + 
          applications.map(a => `"${a.full_name}","${a.email}","${a.status}",${new Date(a.created_at).toLocaleDateString()},"${a.musical_background}"`).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${type} data exported successfully`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Calculate pagination info
  const totalSongPages = Math.ceil(totalSongsCount / itemsPerPage);
  const totalAppPages = Math.ceil(totalAppsCount / itemsPerPage);

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void, totalCount: number) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalCount);

    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalCount} items
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => onPageChange(pageNum)}
                    isActive={currentPage === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading content data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary">Content Management</h1>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Songs</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSongs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Public Songs</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publicSongs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Apps</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApplications}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="songs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="songs">Songs & Arrangements</TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Song Management</CardTitle>
                  <CardDescription>Moderate and manage user-created songs and arrangements</CardDescription>
                </div>
                <Button onClick={() => exportData('songs')} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Search songs, artists, or creators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Songs</SelectItem>
                    <SelectItem value="public">Public Only</SelectItem>
                    <SelectItem value="private">Private Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Song</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {songs.map((song) => (
                    <TableRow key={song.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{song.title}</div>
                          <div className="text-sm text-muted-foreground">{song.artist}</div>
                        </div>
                      </TableCell>
                      <TableCell>{song.profiles?.display_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={song.is_public ? "default" : "secondary"}>
                          {song.is_public ? "Public" : "Private"}
                        </Badge>
                      </TableCell>
                      <TableCell>{song.views_count || 0}</TableCell>
                      <TableCell>{new Date(song.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleSongVisibility(song.id, song.is_public)}
                          >
                            {song.is_public ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedSong(song)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Song Details</DialogTitle>
                                <DialogDescription>
                                  Review song information and metadata
                                </DialogDescription>
                              </DialogHeader>
                              {selectedSong && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Title</label>
                                    <p className="text-sm text-muted-foreground">{selectedSong.title}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Artist</label>
                                    <p className="text-sm text-muted-foreground">{selectedSong.artist}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Creator</label>
                                    <p className="text-sm text-muted-foreground">{selectedSong.profiles?.display_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Views</label>
                                    <p className="text-sm text-muted-foreground">{selectedSong.views_count || 0}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Status</label>
                                    <p className="text-sm text-muted-foreground">
                                      {selectedSong.is_public ? "Public" : "Private"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Song</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{song.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteSong(song.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalSongPages > 1 && renderPagination(currentSongPage, totalSongPages, setCurrentSongPage, totalSongsCount)}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AdminContent;