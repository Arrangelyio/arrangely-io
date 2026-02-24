import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Disc, Loader2, ChevronLeft, ChevronRight, CalendarIcon, DollarSign, Music, Library, Ticket, AlertCircle } from "lucide-react";
import { PublicationStatusBadge, type PublicationStatus } from "@/components/publication/PublicationStatusBadge";
import { SequencerUploadModal } from "./SequencerUploadModal";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface ArrangementDisplay {
    id: string | number;
    title: string;
    artist: string;
    views: number;
    downloads: number;
    earnings: string;
    status: string;
    created_at: string;
    updated_at: string;
    publicationStatus?: 'pending_review' | 'approved' | 'rejected' | 'active' | 'archived' | null;
    rejectedReason?: string | null;
}

interface BenefitMetrics {
    netEarnings: number;
    songPublished: number;
    libraryAdd: number;
    discountCode: number;
}

type PeriodPreset = "all" | "this_month" | "last_month" | "last_3_months" | "custom";

const ITEMS_PER_PAGE = 10;

interface ArrangementsListProps {
    creatorId?: string;
}

const ArrangementsList = ({
    creatorId,
}: ArrangementsListProps) => {
    const navigate = useNavigate();
    const [arrangements, setArrangements] = useState<ArrangementDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);

    // State Filter
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");

    // State Period Filter
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("all");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // State Metrics
    const [benefitMetrics, setBenefitMetrics] = useState<BenefitMetrics>({
        netEarnings: 0,
        songPublished: 0,
        libraryAdd: 0,
        discountCode: 0,
    });

    // State Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // State Modal
    const [showSequencerModal, setShowSequencerModal] = useState(false);
    const [selectedSong, setSelectedSong] = useState<{
        id: string;
        title: string;
        artist: string;
    } | null>(null);

    // Calculate effective date range based on preset
    const effectiveDateRange = useMemo(() => {
        const now = new Date();
        switch (periodPreset) {
            case "this_month":
                return {
                    from: startOfMonth(now),
                    to: endOfMonth(now),
                };
            case "last_month":
                const lastMonth = subMonths(now, 1);
                return {
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth),
                };
            case "last_3_months":
                return {
                    from: startOfMonth(subMonths(now, 2)),
                    to: endOfMonth(now),
                };
            case "custom":
                return dateRange;
            case "all":
            default:
                return undefined;
        }
    }, [periodPreset, dateRange]);

    useEffect(() => {
        fetchArrangements();
        fetchBenefitMetrics();
    }, [creatorId, effectiveDateRange]);

    // Reset ke halaman 1 jika user melakukan pencarian atau ganti filter status
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const fetchBenefitMetrics = async () => {
        try {
            setMetricsLoading(true);
            let targetUserId = creatorId;

            if (!targetUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                targetUserId = user.id;
            }

            const fromDate = effectiveDateRange?.from?.toISOString();
            const toDate = effectiveDateRange?.to?.toISOString();

            let query = supabase
                .from("creator_benefits")
                .select("amount, benefit_type, created_at")
                .eq("creator_id", targetUserId)
                .eq("is_production", true);

            if (fromDate) query = query.gte("created_at", fromDate);
            if (toDate) query = query.lte("created_at", toDate);

            const { data: benefitsData } = await query;

            const metrics: BenefitMetrics = {
                netEarnings: 0,
                songPublished: 0,
                libraryAdd: 0,
                discountCode: 0,
            };

            benefitsData?.forEach((item) => {
                const amount = item.amount || 0;
                metrics.netEarnings += amount;
                switch (item.benefit_type) {
                    case "song_publish":
                        metrics.songPublished += amount;
                        break;
                    case "library_add":
                        metrics.libraryAdd += amount;
                        break;
                    case "discount_code":
                        metrics.discountCode += amount;
                        break;
                }
            });

            setBenefitMetrics(metrics);
        } catch (error) {
            console.error("Error fetching benefit metrics:", error);
        } finally {
            setMetricsLoading(false);
        }
    };

    const fetchArrangements = async () => {
        try {
            setLoading(true);
            let targetUserId = creatorId;

            if (!targetUserId) {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                targetUserId = user.id;
            }

            const fromDate = effectiveDateRange?.from;
            const toDate = effectiveDateRange?.to;

            // 1. Fetch Songs dengan Filter Tanggal
            let query = supabase
                .from("songs")
                .select("*")
                .eq("user_id", targetUserId)
                .order("created_at", { ascending: false });

            // LOGIKA FILTER TANGGAL DI SINI
            if (fromDate) {
                query = query.gte("created_at", fromDate.toISOString());
            }
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                query = query.lte("created_at", endOfDay.toISOString());
            }

            const { data: songsData, error: songsError } = await query;
            if (songsError) throw songsError;

            // 2. Fetch Benefits
            const { data: benefits } = await supabase
                .from("creator_benefits")
                .select("song_id, amount")
                .eq("creator_id", targetUserId);

            const benefitsData = benefits || [];

            // 3. Get song IDs for library adds lookup
            const songIds = (songsData || []).map((song) => song.id);

            // 4. Fetch Library Adds from user_library_actions using song_original_id
            // This counts how many times each song was added to users' libraries
            let libraryAddsMap: Record<string, number> = {};
            if (songIds.length > 0) {
                const { data: libraryActions } = await supabase
                    .from("user_library_actions")
                    .select("song_original_id")
                    .in("song_original_id", songIds)
                    .eq("action_type", "add_to_library");

                // Count library adds per song
                (libraryActions || []).forEach((action) => {
                    const songId = action.song_original_id;
                    if (songId) {
                        libraryAddsMap[songId] = (libraryAddsMap[songId] || 0) + 1;
                    }
                });
            }

            // 5. Fetch Publication Status for Creator Pro/Community songs
            let publicationsMap: Record<string, { status: PublicationStatus; rejected_reason: string | null }> = {};
            if (songIds.length > 0) {
                const { data: publications } = await supabase
                    .from("creator_pro_publications")
                    .select("song_id, status, rejected_reason")
                    .in("song_id", songIds);

                (publications || []).forEach((pub) => {
                    publicationsMap[pub.song_id] = {
                        status: pub.status as PublicationStatus,
                        rejected_reason: pub.rejected_reason,
                    };
                });
            }

            // 6. Gabungkan Data
            const formattedData = (songsData || []).map((song) => {
                const totalEarnings = benefitsData
                    .filter((b) => String(b.song_id) === String(song.id))
                    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

                const publication = publicationsMap[song.id];

                return {
                    id: song.id,
                    title: song.title,
                    artist: song.artist || "Unknown",
                    views: song.views_count || 0,
                    downloads: libraryAddsMap[song.id] || 0,
                    status: song.is_public ? "published" : "private",
                    created_at: song.created_at,
                    updated_at: song.updated_at || song.created_at,
                    earnings: new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                    }).format(totalEarnings),
                    publicationStatus: publication?.status || null,
                    rejectedReason: publication?.rejected_reason || null,
                };
            });

            setArrangements(formattedData);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LOGIKA FILTERING ---
    const filteredArrangements = arrangements.filter((arrangement) => {
        const matchesSearch =
            arrangement.title
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            arrangement.artist.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status filtering - check both visibility status and publication status
        let matchesStatus = filterStatus === "all";
        if (!matchesStatus) {
            if (filterStatus === "rejected" || filterStatus === "pending_review") {
                matchesStatus = arrangement.publicationStatus === filterStatus;
            } else {
                matchesStatus = arrangement.status === filterStatus;
            }
        }

        return matchesSearch && matchesStatus;
    });

    // --- LOGIKA PAGINATION ---
    const totalPages = Math.ceil(filteredArrangements.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentData = filteredArrangements.slice(startIndex, endIndex);

    // Fungsi navigasi halaman
    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
    };

    const goToPreviousPage = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1);
    };

    const formatCurrency = (amount: number) => {
        return `Rp${amount.toLocaleString("id-ID")}`;
    };

    return (
        <Card>
            <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                    <CardTitle>My Arrangements</CardTitle>
                    {loading && (
                        <Loader2 className="animate-spin h-5 w-5 text-muted-foreground" />
                    )}
                </div>

                {/* Period Filter */}
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Period:</span>
                    <Select
                        value={periodPreset}
                        onValueChange={(val) => setPeriodPreset(val as PeriodPreset)}
                    >
                        <SelectTrigger className="w-[160px] h-8">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    {periodPreset === "custom" && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "justify-start text-left font-normal h-8",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "dd MMM yyyy")} -{" "}
                                                {format(dateRange.to, "dd MMM yyyy")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "dd MMM yyyy")
                                        )
                                    ) : (
                                        "Pick date range"
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-400">Net Earnings</span>
                        </div>
                        {metricsLoading ? (
                            <div className="h-6 w-20 bg-green-200 dark:bg-green-800 animate-pulse rounded" />
                        ) : (
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(benefitMetrics.netEarnings)}</p>
                        )}
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-1">
                            <Music className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Song Published</span>
                        </div>
                        {metricsLoading ? (
                            <div className="h-6 w-20 bg-blue-200 dark:bg-blue-800 animate-pulse rounded" />
                        ) : (
                            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(benefitMetrics.songPublished)}</p>
                        )}
                    </div>

                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-1">
                            <Library className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Library Add</span>
                        </div>
                        {metricsLoading ? (
                            <div className="h-6 w-20 bg-purple-200 dark:bg-purple-800 animate-pulse rounded" />
                        ) : (
                            <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatCurrency(benefitMetrics.libraryAdd)}</p>
                        )}
                    </div>

                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 mb-1">
                            <Ticket className="h-4 w-4 text-orange-600" />
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Discount Code</span>
                        </div>
                        {metricsLoading ? (
                            <div className="h-6 w-20 bg-orange-200 dark:bg-orange-800 animate-pulse rounded" />
                        ) : (
                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatCurrency(benefitMetrics.discountCode)}</p>
                        )}
                    </div>
                </div>

                {/* Search and Status Filter */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search arrangements..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select
                        value={filterStatus}
                        onValueChange={setFilterStatus}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="pending_review">Pending Review</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Created At</TableHead>{" "}
                                {/* Kolom Baru */}
                                <TableHead>Updated At</TableHead>{" "}
                                {/* Kolom Baru */}
                                <TableHead>Views</TableHead>
                                <TableHead>Library Adds</TableHead>
                                <TableHead>Earnings</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-8"
                                    >
                                        Loading data...
                                    </TableCell>
                                </TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-8"
                                    >
                                        No arrangements found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentData.map((arrangement) => (
                                    <TableRow
                                        key={arrangement.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => {
                                            navigate(
                                                `/arrangement/${arrangement.id}`
                                            );
                                        }}
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">
                                                    {arrangement.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {arrangement.artist}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(
                                                arrangement.created_at
                                            ).toLocaleDateString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(
                                                arrangement.updated_at
                                            ).toLocaleDateString("id-ID")}
                                        </TableCell>
                                        <TableCell>
                                            {arrangement.views.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {arrangement.downloads}
                                        </TableCell>
                                        <TableCell className="font-medium text-green-600">
                                            {arrangement.earnings}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge
                                                    variant={
                                                        arrangement.status ===
                                                        "published"
                                                            ? "default"
                                                            : "secondary"
                                                    }
                                                >
                                                    {arrangement.status}
                                                </Badge>
                                                {/* Show publication status for Creator Pro/Community */}
                                                {arrangement.publicationStatus && (
                                                    <PublicationStatusBadge
                                                        status={arrangement.publicationStatus}
                                                        rejectedReason={arrangement.rejectedReason}
                                                        showTooltip={true}
                                                        size="sm"
                                                    />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSong({
                                                        id: arrangement.id.toString(),
                                                        title: arrangement.title,
                                                        artist: arrangement.artist,
                                                    });
                                                    setShowSequencerModal(true);
                                                }}
                                            >
                                                <Disc className="w-4 h-4 mr-2" />
                                                Upload Sequencer
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* --- PAGINATION CONTROLS --- */}
                {!loading && filteredArrangements.length > 0 && (
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-sm text-muted-foreground">
                            Showing {startIndex + 1} to{" "}
                            {Math.min(endIndex, filteredArrangements.length)} of{" "}
                            {filteredArrangements.length} entries
                        </div>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>

            {selectedSong && (
                <SequencerUploadModal
                    open={showSequencerModal}
                    onOpenChange={setShowSequencerModal}
                    songId={selectedSong.id}
                    songTitle={selectedSong.title}
                    songArtist={selectedSong.artist}
                />
            )}
        </Card>
    );
};

export default ArrangementsList;
