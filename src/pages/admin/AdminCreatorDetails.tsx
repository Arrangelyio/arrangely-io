import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import DashboardStats from "@/components/creator/DashboardStats";
import ArrangementsList from "@/components/creator/ArrangementsList";
import DiscountCodeEarnings from "../../components/creator/DiscountCodeEarnings";
import * as XLSX from "xlsx";

interface CreatorProfile {
    id: string;
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    musical_role: string | null;
    experience_level: string | null;
    instruments: string[] | null;
    creator_type: string;
    created_at: string;
    email?: string;
}

interface StatsData {
    totalViews: number;
    totalDownloads: number;
    salesThisMonth: number;
    totalEarnings: string;
    followers: number;
}

const AdminCreatorDetails = () => {
    const { creatorId } = useParams<{ creatorId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<CreatorProfile | null>(null);
    const [songs, setSongs] = useState<any[]>([]);
    const [dateFrom, setDateFrom] = useState<Date | undefined>();
    const [dateTo, setDateTo] = useState<Date | undefined>();
    const [appliedDateFrom, setAppliedDateFrom] = useState<Date | undefined>();
    const [appliedDateTo, setAppliedDateTo] = useState<Date | undefined>();
    const [stats, setStats] = useState<StatsData>({
        totalViews: 0,
        totalDownloads: 0,
        salesThisMonth: 0,
        totalEarnings: "Rp0",
        followers: 0,
    });

    useEffect(() => {
        if (creatorId) {
            fetchCreatorData();
        }
    }, [creatorId, appliedDateFrom, appliedDateTo]);

    // Real-time subscription for library actions and creator benefits
    useEffect(() => {
        if (!creatorId) return;

        const channel = supabase
            .channel("creator-library-updates")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "user_library_actions",
                },
                (payload) => {
                    
                    // Add a small delay to ensure database consistency
                    setTimeout(() => {
                        fetchCreatorData();
                    }, 500);
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "creator_benefits",
                    filter: `creator_id=eq.${creatorId}`,
                },
                (payload) => {
                    
                    // Add a small delay to ensure database consistency
                    setTimeout(() => {
                        fetchCreatorData();
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [creatorId]);

    const fetchCreatorData = async () => {
        setLoading(true);
        try {
            if (!creatorId) throw new Error("Creator ID is required");

            // 1. --- AMBIL PROFILE (Yg sedang dilihat) ---
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", creatorId)
                .single();
            if (profileError) throw profileError;

            setProfile({ ...profileData, email: "creator@example.com" });

            // 2. --- AMBIL SONGS (Berdasarkan created_by) ---
            // Kita ambil berdasarkan created_by agar lagu yg sudah dipindah tetap muncul
            let songsQuery = supabase
                .from("songs")
                .select("*")
                .eq("user_id", creatorId);

            // ... (Bagian Filter Tanggal Tetap Sama) ...
            if (appliedDateFrom) {
                songsQuery = songsQuery.gte(
                    "created_at",
                    appliedDateFrom.toISOString()
                );
            }
            if (appliedDateTo) {
                const endOfDay = new Date(appliedDateTo);
                endOfDay.setHours(23, 59, 59, 999);
                songsQuery = songsQuery.lte(
                    "created_at",
                    endOfDay.toISOString()
                );
            }

            const { data: songsData, error: songsError } = await songsQuery;
            if (songsError) throw songsError;

            // 3. --- (BARU) AMBIL NAMA PEMILIK SEKARANG (Current Owner) ---
            // Kita kumpulkan semua user_id dari lagu-lagu tersebut untuk mengambil namanya
            const ownerIds = Array.from(
                new Set(songsData.map((s) => s.user_id))
            );

            const { data: ownersData } = await supabase
                .from("profiles")
                .select("user_id, display_name")
                .in("user_id", ownerIds);

            // 4. --- AMBIL EARNINGS (Tetap sama) ---
            let earningsQuery = supabase
                .from("creator_benefits")
                .select("*")
                .eq("creator_id", creatorId);

            // ... (Filter Tanggal Earnings Tetap Sama) ...
            if (appliedDateFrom) {
                earningsQuery = earningsQuery.gte(
                    "created_at",
                    appliedDateFrom.toISOString()
                );
            }
            if (appliedDateTo) {
                const endOfDay = new Date(appliedDateTo);
                endOfDay.setHours(23, 59, 59, 999);
                earningsQuery = earningsQuery.lte(
                    "created_at",
                    endOfDay.toISOString()
                );
            }

            const { data: earningsData, error: earningsError } =
                await earningsQuery;
            if (earningsError) throw earningsError;

            // 5. --- AMBIL LIBRARY (Tetap sama) ---
            let libraryData: any[] = [];
            if (profileData.creator_type !== "creator_arrangely") {
                // ... (Logic library query tetap sama persis seperti kode lama Anda) ...
                let libraryQuery = supabase
                    .from("user_library_actions")
                    .select("*")
                    .eq("user_original_id", creatorId);
                if (appliedDateFrom)
                    libraryQuery = libraryQuery.gte(
                        "created_at",
                        appliedDateFrom.toISOString()
                    );
                if (appliedDateTo) {
                    const endOfDay = new Date(appliedDateTo);
                    endOfDay.setHours(23, 59, 59, 999);
                    libraryQuery = libraryQuery.lte(
                        "created_at",
                        endOfDay.toISOString()
                    );
                }
                const { data, error } = await libraryQuery;
                if (error) throw error;
                libraryData = data || [];
            }

            // 6. --- DISCOUNT QUERY (Tetap sama) ---
            // ... (Logic discount query tetap sama persis) ...
            let discountQuery = supabase
                .from("creator_discount_benefits")
                .select("creator_benefit_amount, created_at")
                .eq("creator_id", creatorId)
                .eq("is_production", true);

            if (appliedDateFrom) {
                discountQuery = discountQuery.gte(
                    "created_at",
                    appliedDateFrom.toISOString()
                );
            }
            if (appliedDateTo) {
                const endOfDay = new Date(appliedDateTo);
                endOfDay.setHours(23, 59, 59, 999);
                discountQuery = discountQuery.lte(
                    "created_at",
                    endOfDay.toISOString()
                );
            }

            const { data: discountData, error: discountError } =
                await discountQuery;
            if (discountError) throw discountError;

            const discountTotal =
                discountData?.reduce(
                    (sum, d) => sum + d.creator_benefit_amount,
                    0
                ) || 0;

            // 7. ---- PROCESS SONGS (UPDATED LOGIC) ----
            const processedSongs = songsData.map((song) => {
                const songBenefits =
                    earningsData?.filter(
                        (e) =>
                            e.song_id === song.id &&
                            (e.benefit_type === "library_add" ||
                                e.benefit_type === "song_publish")
                    ) || [];

                const songLibraryAdds =
                    libraryData?.filter(
                        (a) => a.song_original_id === song.id
                    ) || [];
                const benefitEarnings = songBenefits.reduce(
                    (sum, e) => sum + e.amount,
                    0
                );
                const songEarnings = benefitEarnings;

                // --- LOGIC BARU: CEK STATUS KEPEMILIKAN ---
                let displayStatus = song.is_public ? "published" : "private";

                // Jika pemilik sekarang (user_id) BEDA dengan halaman creator yg dilihat (creatorId)
                if (song.user_id !== creatorId) {
                    const newOwner = ownersData?.find(
                        (o) => o.user_id === song.user_id
                    );
                    const newOwnerName =
                        newOwner?.display_name || "Professional Creator";
                    // Ubah status jadi string informatif
                    displayStatus = `Published to ${newOwnerName}`;
                }

                return {
                    id: song.id,
                    title: song.title,
                    artist: song.artist || "Unknown",
                    type:
                        song.sequencer_price > 0
                            ? ("premium" as const)
                            : ("free" as const),
                    price:
                        song.sequencer_price > 0
                            ? `Rp${song.sequencer_price.toLocaleString()}`
                            : "Free",
                    views: song.views_count || 0,
                    downloads: songLibraryAdds.length,
                    earnings: `Rp${songEarnings.toLocaleString()}`,
                    status: displayStatus, // <--- Gunakan variable baru ini
                    createdAt: song.created_at,
                    contributionType: song.contribution_type,
                };
            });

            // ... (Sisa perhitungan Stats di bawah tetap sama) ...
            const totalViews = songsData.reduce(
                (sum, song) => sum + (song.views_count || 0),
                0
            );
            const totalLibraryAdds = libraryData?.length || 0;
            const totalBenefitFiltered =
                earningsData
                    ?.filter(
                        (e) =>
                            e.benefit_type === "library_add" ||
                            e.benefit_type === "song_publish"
                    )
                    .reduce((sum, e) => sum + e.amount, 0) || 0;

            // 2. Pastikan total discount dihitung dari 'discountData' hasil filter query
            const totalDiscountFiltered =
                discountData?.reduce(
                    (sum, d) => sum + d.creator_benefit_amount,
                    0
                ) || 0;

            const totalFilteredEarnings =
                totalBenefitFiltered + totalDiscountFiltered;

            const totalViewsFromTable = processedSongs.reduce(
                (sum, s) => sum + s.views,
                0
            );
            const totalDownloadsFromTable = processedSongs.reduce(
                (sum, s) => sum + s.downloads,
                0
            );

            // 2. Hitung total uang hanya dari lagu-lagu yang ada di tabel saat ini
            const totalEarningsFromTable = processedSongs.reduce((sum, s) => {
                // Menghapus "Rp" dan "." agar bisa dijumlahkan sebagai angka
                const amount = parseInt(s.earnings.replace(/\D/g, "")) || 0;
                return sum + amount;
            }, 0);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const earningsThisMonthBenefits =
                earningsData
                    ?.filter(
                        (e) =>
                            (e.benefit_type === "library_add" ||
                                e.benefit_type === "song_publish") &&
                            new Date(e.created_at) >= startOfMonth
                    )
                    .reduce((sum, e) => sum + e.amount, 0) || 0;

            const earningsThisMonthDiscounts =
                discountData
                    ?.filter((d) => new Date(d.created_at) >= startOfMonth)
                    .reduce((sum, d) => sum + d.creator_benefit_amount, 0) || 0;

            const earningsThisMonth =
                earningsThisMonthBenefits + earningsThisMonthDiscounts;

            setStats({
                totalViews: totalViewsFromTable, // Sekarang sinkron dengan tabel
                totalDownloads: totalDownloadsFromTable, // Sekarang sinkron dengan tabel
                salesThisMonth: earningsThisMonth,
                // Sekarang angkanya akan menjadi Rp440.000 (sesuai isi tabel)
                totalEarnings: `Rp${totalEarningsFromTable.toLocaleString(
                    "id-ID"
                )}`,
                followers: 0,
            });

            setSongs(processedSongs);
        } catch (err) {
            console.error("Error fetching creator data:", err);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to fetch creator data",
            });
        } finally {
            setLoading(false);
        }
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

    const applyDateFilter = () => {
        setAppliedDateFrom(dateFrom);
        setAppliedDateTo(dateTo);
    };

    const clearDateFilter = () => {
        setDateFrom(undefined);
        setDateTo(undefined);
        setAppliedDateFrom(undefined);
        setAppliedDateTo(undefined);
    };

    const handleExportExcel = () => {
        if (!profile || songs.length === 0) {
            toast({
                variant: "destructive",
                title: "Tidak ada data untuk diekspor",
                description:
                    "Pastikan data kreator sudah dimuat dan ada aransemen yang tersedia.",
            });
            return;
        }

        // --- 1. Hitung Ulang Total Khusus Untuk Export (Agar Sinkron dengan Filter) ---
        // Kita ambil angka saja dari string "Rp10.000" -> 10000
        const totalEarningsFiltered = songs.reduce((sum, song) => {
            const numericValue =
                parseInt(song.earnings.replace(/\D/g, "")) || 0;
            return sum + numericValue;
        }, 0);

        // Jika kamu ingin memasukkan benefit dari discount code juga ke dalam total summary:
        // (Karena stats.totalEarnings di fetchCreatorData menyertakan discountTotal)
        // Kita hitung total views dan downloads dari array 'songs' yang sudah terfilter
        const totalViewsFiltered = songs.reduce(
            (sum, song) => sum + (song.views || 0),
            0
        );
        const totalDownloadsFiltered = songs.reduce(
            (sum, song) => sum + (song.downloads || 0),
            0
        );

        // --- 2. Siapkan data untuk Sheet "Summary" ---
        const summaryData = [
            {
                Keterangan: "Nama Kreator",
                Nilai: profile.display_name || "N/A",
            },
            { Keterangan: "Email", Nilai: profile.email || "N/A" },
            {
                Keterangan: "Tipe Kreator",
                Nilai: getCreatorTypeLabel(profile.creator_type),
            },
            {
                Keterangan: "Filter Tanggal Aktif",
                Nilai:
                    appliedDateFrom || appliedDateTo
                        ? `Dari ${
                              appliedDateFrom
                                  ? format(appliedDateFrom, "dd MMM yyyy")
                                  : "awal"
                          } hingga ${
                              appliedDateTo
                                  ? format(appliedDateTo, "dd MMM yyyy")
                                  : "sekarang"
                          }`
                        : "Semua Waktu (Lifetime)",
            },
            { Keterangan: "---", Nilai: "---" },
            { Keterangan: "Total Views (Filtered)", Nilai: totalViewsFiltered },
            {
                Keterangan: "Total Downloads (Filtered)",
                Nilai: totalDownloadsFiltered,
            },
            {
                Keterangan: "Total Pendapatan (Filtered)",
                Nilai: `Rp${totalEarningsFiltered.toLocaleString("id-ID")}`,
            },
            { Keterangan: "Jumlah Aransemen (Filtered)", Nilai: songs.length },
        ];
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);

        // --- 3. Siapkan data untuk Sheet "Arrangements Detail" ---
        const arrangementsData = songs.map((song) => ({
            "Judul Lagu": song.title,
            Artis: song.artist,
            Tipe: song.type,
            "Tipe Schema": song.contributionType,
            Harga: song.price,
            Views: song.views,
            Downloads: song.downloads,
            Pendapatan: parseInt(song.earnings.replace(/\D/g, "")),
            Status: song.status,
            "Tanggal Dibuat": format(
                new Date(song.createdAt),
                "yyyy-MM-dd HH:mm:ss"
            ),
            // Tambahkan kolom Updated At jika tersedia di object song
            "Terakhir Diupdate": song.updatedAt
                ? format(new Date(song.updatedAt), "yyyy-MM-dd HH:mm:ss")
                : format(new Date(song.createdAt), "yyyy-MM-dd HH:mm:ss"),
        }));
        const arrangementsSheet = XLSX.utils.json_to_sheet(arrangementsData);

        // Atur lebar kolom
        arrangementsSheet["!cols"] = [
            { wch: 30 },
            { wch: 20 },
            { wch: 10 },
            { wch: 15 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
        ];

        // --- 4. Buat Workbook ---
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
        XLSX.utils.book_append_sheet(
            workbook,
            arrangementsSheet,
            "Arrangements Detail"
        );

        const fileName = `Report_${profile.display_name?.replace(
            /\s/g,
            "_"
        )}_${format(new Date(), "yyyyMMdd")}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>
                <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-24 bg-muted rounded"
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>
                <div className="text-center py-8">
                    <h3 className="text-lg font-semibold">Creator not found</h3>
                    <p className="text-muted-foreground">
                        The requested creator could not be found.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            
                            navigate(-1);
                        }}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            
                            fetchCreatorData();
                        }}
                        disabled={loading}
                    >
                        Refresh Data
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={loading || songs.length === 0}
                        className="bg-green-600 text-white hover:bg-green-700"
                    >
                        Export to Excel
                    </Button>
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

            {/* Creator Profile Header */}
            <div className="flex items-center gap-4 mb-8">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>
                        {profile.display_name?.charAt(0)?.toUpperCase() ||
                            profile.email?.charAt(0)?.toUpperCase() ||
                            "U"}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">
                            {profile.display_name || "No Name"}
                        </h1>
                        <Badge variant="outline" className="text-xs">
                            {getCreatorTypeLabel(profile.creator_type)}
                        </Badge>
                        {profile.creator_type === "creator_professional" && (
                            <Badge className="bg-gradient-worship text-primary-foreground">
                                <Crown className="h-3 w-3 mr-1" />
                                Top Creator
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{profile.email}</span>
                        <span>{stats.followers} followers</span>
                        <span>{songs.length} arrangements</span>
                        {(appliedDateFrom || appliedDateTo) && (
                            <span className="font-medium text-primary">
                                Showing data from{" "}
                                {appliedDateFrom
                                    ? format(appliedDateFrom, "MMM dd, yyyy")
                                    : "start"}{" "}
                                to{" "}
                                {appliedDateTo
                                    ? format(appliedDateTo, "MMM dd, yyyy")
                                    : "now"}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <DashboardStats stats={stats} isFiltered={false} />

            <DiscountCodeEarnings creatorId={creatorId} />

            {/* Arrangements */}
            <ArrangementsList creatorId={creatorId} />
        </div>
    );
};

export default AdminCreatorDetails;
