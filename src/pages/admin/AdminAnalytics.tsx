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
    Users,
    Music,
    Eye,
    Heart,
    UserPlus,
    Activity,
    TrendingUp,
    Download,
    Filter,
    Calendar,
} from "lucide-react";
import { LibraryUsersModal } from "@/components/admin/LibraryUsersModal";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
const AdminAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [summaryStats, setSummaryStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalSongs: 0,
        publicSongs: 0,
        privateSongs: 0,
        arrangelySongs: 0,
        creatorSongs: 0,
        totalCreators: 0,
        libraryActions: 0,
    });
    const [users, setUsers] = useState([]);
    const [songs, setSongs] = useState([]);
    const [creators, setCreators] = useState([]);
    const [dateFilter, setDateFilter] = useState("30");
    const [statusFilter, setStatusFilter] = useState("all");
    const [creatorTypeFilter, setCreatorTypeFilter] = useState("all");
    const [creatorSearchTerm, setCreatorSearchTerm] = useState("");

    // Library users modal state
    const [libraryModalOpen, setLibraryModalOpen] = useState(false);
    const [selectedCreator, setSelectedCreator] = useState<{
        id: string;
        name: string;
    } | null>(null);
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                // Menjalankan semua fungsi fetch secara paralel untuk efisiensi maksimal
                await Promise.all([
                    fetchSummaryData(),
                    fetchUsersWithStats(),
                    fetchSongsWithDetails(),
                    fetchCreatorsWithStats(),
                ]);
            } catch (error) {
                console.error("Error fetching all analytics data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [dateFilter]); // Bergantung pada dateFilter untuk memuat ulang data saat filter tanggal berubah

    // ✅ 1. FUNGSI UNTUK STATISTIK RINGKASAN (lebih terorganisir)
    const fetchSummaryData = async () => {
        const [
            { count: totalUsers },
            { count: totalSongs },
            { count: publicSongs },
            { count: totalCreators },
            { count: libraryActions },
            { data: creatorProfiles },
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select("*", { count: "exact", head: true }),
            supabase.from("songs").select("*", { count: "exact", head: true }),
            supabase
                .from("songs")
                .select("*", { count: "exact", head: true })
                .eq("is_public", true),
            supabase
                .from("profiles")
                .select("*", { count: "exact", head: true })
                .eq("role", "creator"),
            supabase
                .from("user_library_actions")
                .select("*", { count: "exact", head: true }),
            supabase.from("profiles").select("user_id").eq("role", "creator"),
        ]);

        const privateSongs = (totalSongs || 0) - (publicSongs || 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() - parseInt(dateFilter, 10)
        );
        const { count: activeUsers } = await supabase
            .from("song_activity")
            .select("user_id", { count: "exact", head: true })
            .gte("created_at", thirtyDaysAgo.toISOString());

        const creatorIds = creatorProfiles?.map((c) => c.user_id) || [];
        let creatorSongs = 0;
        if (creatorIds.length > 0) {
            const { count } = await supabase
                .from("songs")
                .select("*", { count: "exact", head: true })
                .in("user_id", creatorIds);
            creatorSongs = count || 0;
        }
        const arrangelySongs = (totalSongs || 0) - creatorSongs;

        setSummaryStats({
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            totalSongs: totalSongs || 0,
            publicSongs: publicSongs || 0,
            privateSongs,
            arrangelySongs,
            creatorSongs,
            totalCreators: totalCreators || 0,
            libraryActions: libraryActions || 0,
        });
    };

    // ✅ 2. FUNGSI UNTUK USER & STATISTIKNYA (batching)
    const fetchUsersWithStats = async () => {
        const { data: userData, error } = await supabase
            .from("profiles")
            .select(`user_id, display_name, role, created_at, is_onboarded`)
            .order("created_at", { ascending: false })
            .limit(100);

        if (error || !userData) return setUsers([]);
        const userIds = userData.map((u) => u.user_id);

        const [{ data: songCountsData }, { data: lastActivityData }] =
            await Promise.all([
                supabase.from("songs").select("user_id"),
                supabase
                    .from("song_activity")
                    .select("user_id, created_at")
                    .in("user_id", userIds),
            ]);

        const songCountsMap = (songCountsData || []).reduce(
            (acc, { user_id }) => {
                acc.set(user_id, (acc.get(user_id) || 0) + 1);
                return acc;
            },
            new Map()
        );

        const lastActivityMap = (lastActivityData || []).reduce(
            (acc, { user_id, created_at }) => {
                if (
                    !acc.has(user_id) ||
                    new Date(created_at) > new Date(acc.get(user_id))
                ) {
                    acc.set(user_id, created_at);
                }
                return acc;
            },
            new Map()
        );

        const usersWithStats = userData.map((user) => ({
            ...user,
            songCount: songCountsMap.get(user.user_id) || 0,
            lastActive: lastActivityMap.get(user.user_id) || null,
        }));
        setUsers(usersWithStats as any); // Cast as any to match state type
    };

    // ✅ 3. FUNGSI UNTUK LAGU & DETAILNYA (batching)
    const fetchSongsWithDetails = async () => {
        const { data: songData, error } = await supabase
            .from("songs")
            .select(
                `id, title, artist, user_id, is_public, views_count, created_at`
            )
            .order("views_count", { ascending: false })
            .limit(10);

        if (error || !songData || songData.length === 0) return setSongs([]);

        const userIds = [
            ...new Set(songData.map((s) => s.user_id).filter(Boolean)),
        ];
        const songIds = songData.map((s) => s.id);

        const [{ data: profilesData }, { data: libraryCountsData }] =
            await Promise.all([
                supabase
                    .from("profiles")
                    .select("user_id, display_name")
                    .in("user_id", userIds),
                supabase
                    .from("user_library_actions")
                    .select("song_id")
                    .in("song_id", songIds),
            ]);

        const profilesMap = new Map(
            profilesData?.map((p) => [p.user_id, p.display_name])
        );
        const libraryCountsMap = (libraryCountsData || []).reduce(
            (acc, { song_id }) => {
                acc.set(song_id, (acc.get(song_id) || 0) + 1);
                return acc;
            },
            new Map()
        );

        const songsWithDetails = songData.map((song) => ({
            ...song,
            creatorName: profilesMap.get(song.user_id) || "Unknown",
            libraryCount: libraryCountsMap.get(song.id) || 0,
        }));
        setSongs(songsWithDetails as any); // Cast as any to match state type
    };

    // ✅ 4. FUNGSI UNTUK KREATOR & PERFORMANYA (batching)
    const fetchCreatorsWithStats = async () => {
        const { data: creatorData, error } = await supabase
            .from("profiles")
            .select(`user_id, display_name, creator_type, created_at`)
            .eq("role", "creator")
            .order("created_at", { ascending: false });

        if (error || !creatorData || creatorData.length === 0)
            return setCreators([]);
        const creatorIds = creatorData.map((c) => c.user_id);

        const [{ data: songsByCreators }, { data: originalSongsByCreators }] =
            await Promise.all([
                supabase
                    .from("songs")
                    .select("user_id, views_count, is_public")
                    .in("user_id", creatorIds),
                supabase
                    .from("songs")
                    .select("original_creator_id")
                    .in("original_creator_id", creatorIds),
            ]);

        const performanceMap = (songsByCreators || []).reduce((acc, song) => {
            let stats = acc.get(song.user_id) || {
                totalSongs: 0,
                totalViews: 0,
            };
            if (song.is_public) {
                stats.totalSongs++;
                stats.totalViews += song.views_count || 0;
            }
            acc.set(song.user_id, stats);
            return acc;
        }, new Map());

        const originalLibraryMap = (originalSongsByCreators || []).reduce(
            (acc, song) => {
                if (song.original_creator_id) {
                    acc.set(
                        song.original_creator_id,
                        (acc.get(song.original_creator_id) || 0) + 1
                    );
                }
                return acc;
            },
            new Map()
        );

        const creatorsWithStats = creatorData.map((creator) => {
            const perf = performanceMap.get(creator.user_id) || {
                totalSongs: 0,
                totalViews: 0,
            };
            return {
                ...creator,
                totalSongs: perf.totalSongs,
                totalViews: perf.totalViews,
                avgEngagement:
                    perf.totalSongs > 0
                        ? (perf.totalViews / perf.totalSongs).toFixed(1)
                        : "0",
                originalCreatorLibraryCount:
                    originalLibraryMap.get(creator.user_id) || 0,
            };
        });
        setCreators(creatorsWithStats as any); // Cast as any to match state type
    };

    const exportToCSV = (data: any[], filename: string) => {
        const csvContent = [
            Object.keys(data[0]).join(","),
            ...data.map((row) =>
                Object.values(row)
                    .map((val) => `"${val}"`)
                    .join(",")
            ),
        ].join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
    };
    const handleLibraryCountClick = (
        creatorId: string,
        creatorName: string
    ) => {
        setSelectedCreator({
            id: creatorId,
            name: creatorName,
        });
        setLibraryModalOpen(true);
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
    const songCreationData = [
        {
            month: "Jan",
            songs: 45,
        },
        {
            month: "Feb",
            songs: 52,
        },
        {
            month: "Mar",
            songs: 48,
        },
        {
            month: "Apr",
            songs: 61,
        },
        {
            month: "May",
            songs: 55,
        },
        {
            month: "Jun",
            songs: 67,
        },
    ];
    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
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
            <div>
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground">
                    Platform performance metrics and user insights
                </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.totalUsers.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Registered accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Users
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.activeUsers.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

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
                            Total Creators
                        </CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.totalCreators.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Verified creators
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
                            Private Songs
                        </CardTitle>
                        <Music className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.privateSongs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Personal arrangements
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Creator Songs
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {summaryStats.creatorSongs.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            By verified creators
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
                            {summaryStats.libraryActions.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Add-to-library events
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Section 1: User Analytics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        User Analytics
                    </CardTitle>
                    <div className="flex gap-4">
                        <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="creator">Creator</SelectItem>
                                <SelectItem value="user">
                                    Regular User
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() => exportToCSV(users, "user-analytics")}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Signup Date</TableHead>
                                <TableHead>Songs Created</TableHead>
                                <TableHead>Last Active</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users
                                .filter(
                                    (user) =>
                                        statusFilter === "all" ||
                                        user.role === statusFilter
                                )
                                .slice(0, 10)
                                .map((user) => (
                                    <TableRow key={user.user_id}>
                                        <TableCell className="font-medium">
                                            {user.display_name || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    user.role === "admin"
                                                        ? "bg-red-100 text-red-800"
                                                        : user.role ===
                                                          "creator"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-green-100 text-green-800"
                                                }`}
                                            >
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                user.created_at
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{user.songCount}</TableCell>
                                        <TableCell>
                                            {user.lastActive
                                                ? new Date(
                                                      user.lastActive
                                                  ).toLocaleDateString()
                                                : "Never"}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    user.is_onboarded
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                }`}
                                            >
                                                {user.is_onboarded
                                                    ? "Active"
                                                    : "Pending"}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Section 2: Creator Performance */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Creator Performance
                    </CardTitle>
                    <div className="flex gap-4">
                        <Input
                            placeholder="Search creator name..."
                            value={creatorSearchTerm}
                            onChange={(e) =>
                                setCreatorSearchTerm(e.target.value)
                            }
                            className="w-64"
                        />
                        <Select
                            value={creatorTypeFilter}
                            onValueChange={setCreatorTypeFilter}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Creators
                                </SelectItem>
                                <SelectItem value="creator_arrangely">
                                    Creator Arrangely
                                </SelectItem>
                                <SelectItem value="creator_freelance">
                                    Creator Professional
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() =>
                                exportToCSV(creators, "creator-performance")
                            }
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Creator Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Total Songs Public</TableHead>
                                <TableHead>Total Views</TableHead>
                                <TableHead>Avg. Engagement</TableHead>
                                <TableHead>
                                    Original Creator Library Count
                                </TableHead>
                                <TableHead>Join Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creators
                                .filter(
                                    (creator) =>
                                        creatorTypeFilter === "all" ||
                                        creator.creator_type ===
                                            creatorTypeFilter
                                )
                                .filter(
                                    (creator) =>
                                        !creatorSearchTerm ||
                                        (creator.display_name || "")
                                            .toLowerCase()
                                            .includes(
                                                creatorSearchTerm.toLowerCase()
                                            )
                                )
                                .slice(0, 10)
                                .map((creator) => (
                                    <TableRow key={creator.user_id}>
                                        <TableCell className="font-medium">
                                            {creator.display_name || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs ${
                                                    creator.creator_type ===
                                                    "creator_arrangely"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-purple-100 text-purple-800"
                                                }`}
                                            >
                                                {creator.creator_type ===
                                                "creator_arrangely"
                                                    ? "Creator Arrangely"
                                                    : "Creator Professional"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {creator.totalSongs}
                                        </TableCell>
                                        <TableCell>
                                            {creator.totalViews.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {creator.avgEngagement}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() =>
                                                    handleLibraryCountClick(
                                                        creator.user_id,
                                                        creator.display_name ||
                                                            "Unknown"
                                                    )
                                                }
                                                className="font-semibold text-primary hover:text-primary/80 underline cursor-pointer transition-colors"
                                            >
                                                {
                                                    creator.originalCreatorLibraryCount
                                                }
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                creator.created_at
                                            ).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Section 4: Song Engagement Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Song Engagement Trends
                    </CardTitle>
                    <div className="flex gap-4">
                        <Select
                            value={dateFilter}
                            onValueChange={setDateFilter}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select date range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            onClick={() =>
                                exportToCSV(
                                    songCreationData,
                                    "engagement-trends"
                                )
                            }
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={{
                            songs: {
                                label: "Songs Created",
                                color: "hsl(var(--primary))",
                            },
                        }}
                        className="h-[400px]"
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={songCreationData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="songs"
                                    fill="hsl(var(--primary))"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Library Users Modal */}
            <LibraryUsersModal
                isOpen={libraryModalOpen}
                onClose={() => setLibraryModalOpen(false)}
                creatorId={selectedCreator?.id || ""}
                creatorName={selectedCreator?.name || ""}
            />
        </div>
    );
};
export default AdminAnalytics;
