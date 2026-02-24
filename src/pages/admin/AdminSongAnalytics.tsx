import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    BarChart,
    Bar,
    ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
    Music,
    Eye,
    Heart,
    TrendingUp,
    Download,
    Filter,
    Calendar,
    Plus,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const AdminSongAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [songs, setSongs] = useState([]);
    const [filteredSongs, setFilteredSongs] = useState([]);
    const [summaryStats, setSummaryStats] = useState({
        totalSongs: 0,
        publicSongs: 0,
        privateSongs: 0,
        arrangelySongs: 0,
        creatorSongs: 0,
        totalViews: 0,
        totalLibraryActions: 0,
        avgViewsPerSong: 0,
    });

    const [privacyFilter, setPrivacyFilter] = useState("all");
    const [creatorFilter, setCreatorFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchSongAnalytics();
    }, []);

    useEffect(() => {
        applyFilters();
        setCurrentPage(1); // Reset to first page when filters change
    }, [songs, privacyFilter, creatorFilter, searchTerm, sortBy, sortOrder]);

    const fetchSongAnalytics = async () => {
        try {
            setLoading(true);

            // 1. Ambil semua data lagu (Query ke-1)
            const { data: songData, error: songError } = await supabase
                .from("songs")
                .select(
                    `
        id, title, artist, user_id, is_public, views_count, created_at,
        updated_at, difficulty, theme, tags, current_key, original_key, tempo
      `
                )
                .order("created_at", { ascending: false });

            if (songError) {
                console.error("Error fetching songs:", songError);
                return;
            }
            if (!songData || songData.length === 0) {
                setSongs([]);
                setLoading(false);
                return;
            }

            const userIds = [
                ...new Set(
                    songData.map((song) => song.user_id).filter((id) => id)
                ),
            ];
            const songIds = songData.map((song) => song.id);

            // --- TAMBAHKAN LOG DI SINI ---
            console.log(
                "1. ID User yang dikumpulkan dari tabel 'songs':",
                userIds
            );

            // 2. Ambil semua profil yang relevan
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("user_id, display_name, role") // Ganti 'id' menjadi 'user_id'
                .in("user_id", userIds); // Ganti 'id' menjadi 'user_id'

            if (profilesError)
                console.error("Error fetching profiles:", profilesError);

            // --- TAMBAHKAN LOG DI SINI ---
            

            // 3. Ambil semua data library action
            const { data: libraryActions, error: libraryError } = await supabase
                .from("user_library_actions")
                .select("song_id")
                .in("song_id", songIds);

            if (libraryError)
                console.error("Error fetching library actions:", libraryError);

            const profilesMap = new Map(
                profilesData?.map((p) => [p.user_id, p])
            );
            // --- TAMBAHKAN LOG DI SINI ---
            console.log(
                "3. Peta Profil yang dibuat (profilesMap):",
                profilesMap
            );

            const libraryCountsMap = (libraryActions || []).reduce(
                (acc, action) => {
                    acc.set(action.song_id, (acc.get(action.song_id) || 0) + 1);
                    return acc;
                },
                new Map()
            );

            const songsWithDetails = songData.map((song) => {
                // --- TAMBAHKAN LOG PEMERIKSAAN DI SINI ---
                if (!profilesMap.has(song.user_id)) {
                    console.warn(
                        `Peringatan: user_id '${song.user_id}' dari lagu '${song.title}' tidak ditemukan di profilesMap.`
                    );
                }

                return {
                    ...song,
                    creatorName:
                        (profilesMap.get(song.user_id) as any)?.display_name ||
                        "Unknown",
                    creatorRole: (profilesMap.get(song.user_id) as any)?.role || "user",
                    libraryCount: libraryCountsMap.get(song.id) || 0,
                };
            });

            setSongs(songsWithDetails);

            // ... sisa kode tidak berubah
            const totalSongs = songsWithDetails.length;
            const publicSongs = songsWithDetails.filter(
                (s) => s.is_public
            ).length;
            const privateSongs = totalSongs - publicSongs;
            const creatorSongs = songsWithDetails.filter(
                (s) => s.creatorRole === "creator"
            ).length;
            const arrangelySongs = totalSongs - creatorSongs;
            const totalViews = songsWithDetails.reduce(
                (sum, song) => sum + (song.views_count || 0),
                0
            );
            const totalLibraryActions = songsWithDetails.reduce(
                (sum, song) => sum + song.libraryCount,
                0
            );
            const avgViewsPerSong =
                totalSongs > 0 ? Math.round(totalViews / totalSongs) : 0;

            setSummaryStats({
                totalSongs,
                publicSongs,
                privateSongs,
                arrangelySongs,
                creatorSongs,
                totalViews,
                totalLibraryActions,
                avgViewsPerSong,
            });
        } catch (error) {
            console.error("Error fetching song analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...songs];

        // Privacy filter
        if (privacyFilter !== "all") {
            filtered = filtered.filter((song) =>
                privacyFilter === "public" ? song.is_public : !song.is_public
            );
        }

        // Creator filter
        if (creatorFilter !== "all") {
            filtered = filtered.filter((song) =>
                creatorFilter === "creator"
                    ? song.creatorRole === "creator"
                    : song.creatorRole !== "creator"
            );
        }

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (song) =>
                    song.title
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    song.artist
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    song.creatorName
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === "created_at" || sortBy === "updated_at") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredSongs(filtered);
    };

    // Calculate pagination
    const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = filteredSongs.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const exportToCSV = () => {
        const csvData = filteredSongs.map((song) => ({
            title: song.title,
            artist: song.artist || "",
            creator: song.creatorName,
            privacy: song.is_public ? "Public" : "Private",
            views: song.views_count || 0,
            libraryCount: song.libraryCount,
            difficulty: song.difficulty || "",
            theme: song.theme || "",
            key: song.current_key || "",
            tempo: song.tempo || "",
            created: new Date(song.created_at).toLocaleDateString(),
        }));

        const csvContent = [
            Object.keys(csvData[0]).join(","),
            ...csvData.map((row) =>
                Object.values(row)
                    .map((val) => `"${val}"`)
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `song-analytics-${
            new Date().toISOString().split("T")[0]
        }.csv`;
        a.click();
    };

    const pieChartData = [
        {
            name: "Public Songs",
            value: summaryStats.publicSongs,
            fill: "hsl(var(--primary))",
        },
        {
            name: "Private Songs",
            value: summaryStats.privateSongs,
            fill: "hsl(var(--secondary))",
        },
    ];

    const creatorTypeData = [
        {
            name: "Arrangely Songs",
            value: summaryStats.arrangelySongs,
            fill: "hsl(var(--accent))",
        },
        {
            name: "Creator Songs",
            value: summaryStats.creatorSongs,
            fill: "hsl(var(--primary))",
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Song Analytics</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-2">
                                <div className="h-4 bg-muted rounded w-1/2"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-muted rounded w-1/3"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Song Analytics</h1>
                    <p className="text-muted-foreground">
                        Comprehensive analysis of all songs in the platform
                    </p>
                </div>
                <Button onClick={exportToCSV} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Songs
                        </CardTitle>
                        <Music className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.totalSongs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All arrangements
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Public Songs
                        </CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.publicSongs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Publicly visible
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Views
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.totalViews.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Avg: {summaryStats.avgViewsPerSong} per song
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Library Actions
                        </CardTitle>
                        <Heart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.totalLibraryActions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Add-to-library events
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Music className="h-5 w-5" />
                            Privacy Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                publicSongs: {
                                    label: "Public Songs",
                                    color: "hsl(var(--primary))",
                                },
                                privateSongs: {
                                    label: "Private Songs",
                                    color: "hsl(var(--secondary))",
                                },
                            }}
                            className="h-[300px]"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, value }) =>
                                            `${name}: ${value}`
                                        }
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Creator Type Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                arrangelySongs: {
                                    label: "Arrangely Songs",
                                    color: "hsl(var(--accent))",
                                },
                                creatorSongs: {
                                    label: "Creator Songs",
                                    color: "hsl(var(--primary))",
                                },
                            }}
                            className="h-[300px]"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={creatorTypeData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, value }) =>
                                            `${name}: ${value}`
                                        }
                                    >
                                        {creatorTypeData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                    </Pie>
                                    <ChartTooltip
                                        content={<ChartTooltipContent />}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        All Songs ({filteredSongs.length}) - Page {currentPage}{" "}
                        of {totalPages || 1}
                    </CardTitle>
                    <div className="flex flex-wrap gap-4">
                        <Input
                            placeholder="Search songs, artists, or creators..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select
                            value={privacyFilter}
                            onValueChange={setPrivacyFilter}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by privacy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Songs</SelectItem>
                                <SelectItem value="public">
                                    Public Only
                                </SelectItem>
                                <SelectItem value="private">
                                    Private Only
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={creatorFilter}
                            onValueChange={setCreatorFilter}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by creator" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Creators
                                </SelectItem>
                                <SelectItem value="creator">
                                    Verified Creators
                                </SelectItem>
                                <SelectItem value="user">
                                    Regular Users
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="created_at">
                                    Date Created
                                </SelectItem>
                                <SelectItem value="updated_at">
                                    Last Updated
                                </SelectItem>
                                <SelectItem value="views_count">
                                    Views
                                </SelectItem>
                                <SelectItem value="libraryCount">
                                    Library Count
                                </SelectItem>
                                <SelectItem value="title">Title</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="desc">Desc</SelectItem>
                                <SelectItem value="asc">Asc</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Song Title</TableHead>
                                <TableHead>Artist</TableHead>
                                <TableHead>Created by</TableHead>
                                <TableHead>Privacy</TableHead>
                                <TableHead>Views</TableHead>
                                <TableHead>Library Count</TableHead>
                                <TableHead>Key</TableHead>
                                <TableHead>Tempo</TableHead>
                                <TableHead>Date Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentPageData.map((song) => (
                                <TableRow key={song.id}>
                                    <TableCell className="font-medium">
                                        {song.title}
                                    </TableCell>
                                    <TableCell>
                                        {song.artist || "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{song.creatorName}</span>
                                            {song.creatorRole === "creator" && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                >
                                                    Creator
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                song.is_public
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {song.is_public
                                                ? "Public"
                                                : "Private"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {song.views_count || 0}
                                    </TableCell>
                                    <TableCell className="font-semibold text-primary">
                                        {song.libraryCount}
                                    </TableCell>
                                    <TableCell>
                                        {song.current_key || "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        {song.tempo
                                            ? `${song.tempo} BPM`
                                            : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            song.created_at
                                        ).toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {startIndex + 1}-
                                {Math.min(endIndex, filteredSongs.length)} of{" "}
                                {filteredSongs.length} songs
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from(
                                        { length: Math.min(5, totalPages) },
                                        (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (
                                                currentPage >=
                                                totalPages - 2
                                            ) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={
                                                        pageNum === currentPage
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    className="w-8 h-8 p-0"
                                                    onClick={() =>
                                                        goToPage(pageNum)
                                                    }
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        }
                                    )}

                                    {totalPages > 5 &&
                                        currentPage < totalPages - 2 && (
                                            <>
                                                <span className="text-muted-foreground">
                                                    ...
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-8 h-8 p-0"
                                                    onClick={() =>
                                                        goToPage(totalPages)
                                                    }
                                                >
                                                    {totalPages}
                                                </Button>
                                            </>
                                        )}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSongAnalytics;
