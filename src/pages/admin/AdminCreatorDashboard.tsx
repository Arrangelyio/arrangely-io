import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Search,
    Filter,
    Users,
    FileText,
    TrendingUp,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface DiscountCodeBreakdown {
    code: string;
    uses: number;
    earnings: number;
}

interface Creator {
    user_id: string;
    display_name: string | null;
    email: string | null;
    creator_type: string;
    avatar_url: string | null;
    created_at: string;
    // Kolom-kolom yang tadi muncul 0
    total_song_count: number;
    original_count: number;
    arrangement_count: number;
    transcribe_count: number;
    library_adds: number;
    lesson_enrolled: number;
    amount_lesson: number;
    discount_amount: number;
    total_earnings: number; // Tambahkan ini agar stats card muncul
    discount_code_breakdown: DiscountCodeBreakdown[] | null;
    coupon_codes: string;
}

const AdminCreatorDashboard = () => {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [experienceFilter, setExperienceFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();
    const [appliedDateFrom, setAppliedDateFrom] = useState<Date | undefined>();
    const [appliedDateTo, setAppliedDateTo] = useState<Date | undefined>();
    const [earningsFilter, setEarningsFilter] = useState<
        "all" | "pro" | "arrangely"
    >("all");
    const { toast } = useToast();

    useEffect(() => {
        fetchCreators();
    }, []);

    useEffect(() => {
        filterCreators();
    }, [creators, searchTerm, roleFilter, experienceFilter]);

    useEffect(() => {
        fetchCreators();
    }, [appliedDateFrom, appliedDateTo]);

    const {
        currentPage,
        totalPages,
        paginatedData,
        nextPage,
        prevPage,
        goToPage,
        canGoNext,
        canGoPrev,
        startIndex,
        endIndex,
        totalItems,
    } = usePagination({
        data: filteredCreators,
        itemsPerPage: 10,
    });

    // GANTI SELURUH FUNGSI fetchCreators DENGAN INI

    const fetchCreators = async () => {
        setLoading(true);
        try {
            // 1. Siapkan parameter tanggal untuk RPC
            let fromISO: string | undefined = undefined;
            let toISO: string | undefined = undefined;

            if (appliedDateFrom) {
                fromISO = appliedDateFrom.toISOString();
            }
            if (appliedDateTo) {
                const endOfDay = new Date(appliedDateTo);
                endOfDay.setHours(23, 59, 59, 999);
                toISO = endOfDay.toISOString();
            } // 2. Panggil RPC yang baru kita buat

            const { data: creatorsData, error } = await supabase.rpc(
                "get_admin_creator_dashboard",
                {
                    date_from: fromISO,
                    date_to: toISO,
                }
            );

            if (error) {
                throw error;
            }

            if (!creatorsData) {
                setCreators([]);
                return;
            } // 3. Data sudah diproses! Cukup set state. // Logika .map() yang kompleks sudah tidak diperlukan lagi.

            const enhancedCreators: Creator[] = creatorsData.map((c) => ({
                ...c,
            }));

            setCreators(enhancedCreators);
        } catch (error: any) {
            console.error("Error fetching creators:", error);
            toast({
                title: "Error fetching creator data",
                description:
                    error.message || "Failed to fetch data from the server.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const filterCreators = () => {
        let filtered = [...creators];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(
                (creator) =>
                    creator.display_name
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    creator.email
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    creator.creator_type
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
            );
        }

        // Role filter - use creator_type instead of musical_role
        if (roleFilter !== "all") {
            filtered = filtered.filter(
                (creator) => creator.creator_type === roleFilter
            );
        }

        // Experience filter removed - property doesn't exist on Creator

        setFilteredCreators(filtered);
    };

    const getCreatorTypeLabel = (type: string) => {
        switch (type) {
            case "creator_arrangely":
                return "Arrangely Creator";
            case "creator_professional":
                return "Pro Creator";
            default:
                return type;
        }
    };

    const getExperienceBadgeColor = (level: string | null) => {
        switch (level) {
            case "beginner":
                return "bg-green-100 text-green-800";
            case "intermediate":
                return "bg-yellow-100 text-yellow-800";
            case "advanced":
                return "bg-orange-100 text-orange-800";
            case "professional":
                return "bg-purple-100 text-purple-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const applyDateFilter = () => {
        setAppliedDateFrom(dateFrom);
        setAppliedDateTo(dateTo);
    };

    const exportToExcel = () => {
        const exportData = filteredCreators.map((creator) => ({
            "Creator Name": creator.display_name || "No Name",
            Email: creator.email || "No Email",
            "Creator Type": creator.creator_type,
            "Total Song Count": creator.total_song_count,
            Original: creator.original_count,
            Arrangement: creator.arrangement_count,
            Transcribe: creator.transcribe_count,
            "Add to Library": creator.library_adds,
            "Lesson Enrolled": creator.lesson_enrolled,
            "Amount Lesson": creator.amount_lesson,
            "Amount Discount": creator.discount_amount,

            // 👇 INI YANG BARU
            "Discount Code Breakdown": creator.discount_code_breakdown?.length
                ? creator.discount_code_breakdown
                    .map(
                        (d) =>
                            `${d.code} (${d.uses}x): IDR ${Number(
                                d.earnings
                            ).toLocaleString()}`
                    )
                    .join("\n")
                : "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Creators");

        const fileName = `creators_export_${
            new Date().toISOString().split("T")[0]
        }.xlsx`;
        XLSX.writeFile(workbook, fileName);

        toast({
            title: "Export Successful",
            description: `${filteredCreators.length} creators exported to Excel`,
        });
    };

    const clearDateFilter = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setAppliedDateFrom(undefined);
        setAppliedDateTo(undefined);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                    <p className="text-muted-foreground">
                        View and manage all creators on the platform
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-[100px]" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-[60px]" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-[250px]" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    const totalCreators = creators.length;
    // ...
    const proCreators = creators.filter(
        (c) => c.creator_type === "creator_professional"
    ).length;

    // --- BLOK KALKULASI GABUNGAN (SONGS + EARNINGS) ---

    // 1. Hitung semua jenis data dalam satu kali 'reduce' agar efisien
    const {
        totalEarningsAll,
        totalEarningsPro,
        totalEarningsArrangely,
        totalSongsAll,
        totalSongsPro,
        totalSongsArrangely,
    } = creators.reduce(
        (acc, c) => {
            // Pastikan nama properti SESUAI dengan interface (total_song_count & total_earnings)
            const earnings = Number(c.total_earnings) || 0;
            const songs = Number(c.total_song_count) || 0;

            // Selalu tambahkan ke total 'all'
            acc.totalEarningsAll += earnings;
            acc.totalSongsAll += songs;

            // Tambahkan ke 'pro' jika tipenya sesuai
            if (c.creator_type === "creator_professional") {
                acc.totalEarningsPro += earnings;
                acc.totalSongsPro += songs;
            }

            // Tambahkan ke 'arrangely' jika tipenya sesuai
            if (c.creator_type === "creator_arrangely") {
                acc.totalEarningsArrangely += earnings;
                acc.totalSongsArrangely += songs;
            }

            return acc;
        },
        {
            totalEarningsAll: 0,
            totalEarningsPro: 0,
            totalEarningsArrangely: 0,
            totalSongsAll: 0,
            totalSongsPro: 0,
            totalSongsArrangely: 0,
        }
    );

    // 2. Tentukan nilai mana yang akan ditampilkan berdasarkan state 'earningsFilter'
    let displayedEarnings: number;
    let displayedSongs: number;
    let earningsTitle: string;
    let songsTitle: string;

    switch (earningsFilter) {
        case "pro":
            displayedEarnings = totalEarningsPro;
            displayedSongs = totalSongsPro;
            earningsTitle = "Pro Earnings";
            songsTitle = "Pro Songs";
            break;
        case "arrangely":
            displayedEarnings = totalEarningsArrangely;
            displayedSongs = totalSongsArrangely;
            earningsTitle = "Arrangely Earnings";
            songsTitle = "Arrangely Songs";
            break;
        default: // "all"
            displayedEarnings = totalEarningsAll;
            displayedSongs = totalSongsAll;
            earningsTitle =
                appliedDateFrom || appliedDateTo
                    ? "Filtered Earnings"
                    : "Total Earnings";
            songsTitle = "Total Songs";
    }
    // --- AKHIR BLOK GABUNGAN ---
    // --- AKHIR BLOK BARU ---

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Creator Dashboard</h1>
                    <p className="text-muted-foreground">
                        {appliedDateFrom || appliedDateTo
                            ? `Creator earnings from ${
                                  appliedDateFrom
                                      ? format(appliedDateFrom, "MMM dd, yyyy")
                                      : "start"
                              } to ${
                                  appliedDateTo
                                      ? format(appliedDateTo, "MMM dd, yyyy")
                                      : "now"
                              }`
                            : "View and manage all creators on the platform"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                        Filter by Date Range:
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[140px] justify-start text-left font-normal"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "MMM dd") : "From"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                                className="pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>
                    <span className="text-muted-foreground">to</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-[140px] justify-start text-left font-normal"
                            >
                                <Calendar className="mr-2 h-4 w-4" />
                                {dateTo ? format(dateTo, "MMM dd") : "To"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                                className="pointer-events-auto"
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        onClick={applyDateFilter}
                        disabled={!dateFrom && !dateTo}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Apply Filter
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDateFilter}
                        className="text-muted-foreground"
                    >
                        Clear
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Creators
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {totalCreators}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pro Creators
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{proCreators}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {songsTitle} {/* Menggunakan judul dinamis */}
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {displayedSongs} {/* Menggunakan nilai dinamis */}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {earningsTitle} {/* Menggunakan judul dinamis */}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {" "}
                        {/* Tambahkan space-y-3 */}
                        <div className="text-2xl font-bold">
                            IDR {displayedEarnings.toLocaleString()}{" "}
                            {/* Menggunakan nilai dinamis */}
                        </div>
                        {/* Tombol-tombol Filter Baru */}
                        <div className="flex gap-1">
                            <Button
                                variant={
                                    earningsFilter === "all"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setEarningsFilter("all")}
                                className="text-xs h-7 px-2" // Style untuk tombol kecil
                            >
                                All
                            </Button>
                            <Button
                                variant={
                                    earningsFilter === "pro"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setEarningsFilter("pro")}
                                className="text-xs h-7 px-2"
                            >
                                Creator Profesional
                            </Button>
                            <Button
                                variant={
                                    earningsFilter === "arrangely"
                                        ? "default"
                                        : "outline"
                                }
                                onClick={() => setEarningsFilter("arrangely")}
                                className="text-xs h-7 px-2"
                            >
                                Creator Arrangely
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="search">Search Creators</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search by name, email, or role..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="role-filter">Musical Role</Label>
                            <Select
                                value={roleFilter}
                                onValueChange={setRoleFilter}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Roles
                                    </SelectItem>
                                    <SelectItem value="keyboardist">
                                        Keyboardist
                                    </SelectItem>
                                    <SelectItem value="guitarist">
                                        Guitarist
                                    </SelectItem>
                                    <SelectItem value="vocalist">
                                        Vocalist
                                    </SelectItem>
                                    <SelectItem value="drummer">
                                        Drummer
                                    </SelectItem>
                                    <SelectItem value="bassist">
                                        Bassist
                                    </SelectItem>
                                    <SelectItem value="worship_leader">
                                        Worship Leader
                                    </SelectItem>
                                    <SelectItem value="music_director">
                                        Music Director
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="experience-filter">
                                Experience Level
                            </Label>
                            <Select
                                value={experienceFilter}
                                onValueChange={setExperienceFilter}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Levels
                                    </SelectItem>
                                    <SelectItem value="beginner">
                                        Beginner
                                    </SelectItem>
                                    <SelectItem value="intermediate">
                                        Intermediate
                                    </SelectItem>
                                    <SelectItem value="advanced">
                                        Advanced
                                    </SelectItem>
                                    <SelectItem value="professional">
                                        Professional
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Creators List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Creators ({totalItems})</CardTitle>
                            <CardDescription>
                                All registered creators on the platform -
                                Showing {startIndex} to {endIndex} of{" "}
                                {totalItems}
                            </CardDescription>
                        </div>
                        <Button
                            onClick={exportToExcel}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export to Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Creator Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Creator Type</TableHead>
                                <TableHead className="text-right">
                                    Total Song Count
                                </TableHead>
                                <TableHead className="text-right">
                                    Original
                                </TableHead>
                                <TableHead className="text-right">
                                    Arrangement
                                </TableHead>
                                <TableHead className="text-right">
                                    Transcribe
                                </TableHead>
                                <TableHead className="text-right">
                                    Add to Library
                                </TableHead>
                                <TableHead className="text-right">
                                    Lesson Enrolled
                                </TableHead>
                                <TableHead className="text-right">
                                    Amount Lesson
                                </TableHead>
                                <TableHead className="text-right">
                                    Amount Discount
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(searchTerm
                                ? filteredCreators
                                : paginatedData
                            ).map((creator) => (
                                <TableRow
                                    key={creator.user_id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                        (window.location.href = `/admin-dashboard-secure-7f8e2a9c/creator-dashboard/${creator.user_id}`)
                                    }
                                >
                                    <TableCell className="font-medium">
                                        {creator.display_name || "No Name"}
                                    </TableCell>
                                    <TableCell>{creator.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {creator.creator_type ===
                                            "creator_professional"
                                                ? "Professional"
                                                : "Arrangely"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {creator.total_song_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {creator.original_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {creator.arrangement_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {creator.transcribe_count}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {creator.library_adds}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {creator.lesson_enrolled}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">
                                        IDR{" "}
                                        {(
                                            creator.amount_lesson || 0
                                        ).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right align-top">
                                        {creator.discount_code_breakdown?.length ? (
                                            <div className="space-y-1">
                                                {/* Total */}
                                                <div className="font-semibold text-green-600">
                                                    IDR {Number(creator.discount_amount).toLocaleString()}
                                                </div>

                                                {/* Breakdown per code */}
                                                <div className="space-y-0.5">
                                                    {creator.discount_code_breakdown.map((d, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="text-xs text-muted-foreground flex justify-end gap-2"
                                                        >
                                                            <span className="font-medium text-foreground">
                                                                {d.code}
                                                            </span>
                                                            <span>({d.uses}x)</span>
                                                            <span className="text-green-600 font-semibold">
                                                                IDR {Number(d.earnings).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-muted-foreground">
                                                IDR 0
                                            </span>
                                        )}
                                    </TableCell>


                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {totalPages > 1 && !searchTerm && (
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={prevPage}
                                    disabled={!canGoPrev}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>

                                <div className="flex gap-1">
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
                                                        currentPage === pageNum
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    size="sm"
                                                    onClick={() =>
                                                        goToPage(pageNum)
                                                    }
                                                    className="w-10"
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        }
                                    )}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={nextPage}
                                    disabled={!canGoNext}
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

export default AdminCreatorDashboard;
