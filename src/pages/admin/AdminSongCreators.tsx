import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Edit, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ProfessionalCreator {
    user_id: string;
    display_name: string | null;
    email: string | null;
}

interface Song {
    id: string;
    title: string;
    artist: string | null;
    user_id: string;
    created_by: string | null;
    contribution_type: string | null;

    creator_name?: string;
    benefit_amount?: number;

    original_creator_name?: string;
    original_benefit_amount?: number;
}

const AdminSongCreators = () => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [creators, setCreators] = useState<ProfessionalCreator[]>([]);
    const [loading, setLoading] = useState(true);

    // State for search with debounce
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [totalSongs, setTotalSongs] = useState(0);
    const songsPerPage = 20;

    const [editingBenefit, setEditingBenefit] = useState<{
        songId: string;
        songTitle: string;
        creatorId: string;
        currentAmount: number;
        isOriginal: boolean;
    } | null>(null);
    const [customAmount, setCustomAmount] = useState<string>("");

    // Debounce effect: Wait 500ms after user stops typing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch data when page or search term changes
    useEffect(() => {
        fetchData();
    }, [currentPage, debouncedSearchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Professional Creators
            const { data: creatorsData, error: creatorsError } = await supabase
                .from("profiles")
                .select("user_id, display_name, email")
                .eq("creator_type", "creator_professional")
                .order("display_name");

            if (creatorsError) throw creatorsError;
            setCreators(creatorsData || []);

            // 2. Prepare Song Query
            let query = supabase
                .from("songs")
                .select(
                    "id, title, artist, user_id, created_by, contribution_type",
                    {
                        count: "exact",
                    }
                )
                .eq("is_public", true)
                .range(
                    (currentPage - 1) * songsPerPage,
                    currentPage * songsPerPage - 1
                )
                .order("created_at", { ascending: false });

            // 3. Complex Search Logic
            if (debouncedSearchTerm) {
                // First, find user IDs that match the search term in profiles
                const { data: matchedProfiles } = await supabase
                    .from("profiles")
                    .select("user_id")
                    .ilike("display_name", `%${debouncedSearchTerm}%`);

                const matchedIds = matchedProfiles?.map((p) => p.user_id) || [];

                // Construct the OR filter
                // Matches Title OR Artist OR (Current Creator Name) OR (Original Creator Name)
                let orFilter = `title.ilike.%${debouncedSearchTerm}%,artist.ilike.%${debouncedSearchTerm}%`;

                if (matchedIds.length > 0) {
                    const idsString = `(${matchedIds.join(",")})`;
                    orFilter += `,user_id.in.${idsString},created_by.in.${idsString}`;
                }

                query = query.or(orFilter);
            }

            const { data: songsData, error: songsError, count } = await query;
            if (songsError) throw songsError;

            // 4. Prepare IDs for batch fetching
            const allUserIds = new Set<string>();
            const songIds: string[] = [];

            (songsData || []).forEach((s) => {
                songIds.push(s.id);
                if (s.user_id) allUserIds.add(s.user_id);
                if (s.created_by) allUserIds.add(s.created_by);
            });

            // 5. Fetch Names (Profiles)
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, display_name, email")
                .in("user_id", Array.from(allUserIds));

            // 6. Fetch Benefits
            const { data: benefitsData } = await supabase
                .from("creator_benefits")
                .select("song_id, amount, creator_id")
                .in("song_id", songIds)
                .eq("benefit_type", "song_publish");

            // 7. Map Data
            const formattedSongs = (songsData || []).map((song) => {
                const getName = (uid: string | null) => {
                    if (!uid) return "Unknown";
                    const p = profilesData?.find(
                        (profile) => profile.user_id === uid
                    );
                    return p?.display_name || p?.email || "Unknown";
                };

                const getBenefit = (uid: string | null) => {
                    if (!uid) return undefined;
                    return benefitsData?.find(
                        (b) => b.song_id === song.id && b.creator_id === uid
                    )?.amount;
                };

                return {
                    ...song,
                    creator_name: getName(song.user_id),
                    benefit_amount: getBenefit(song.user_id),
                    original_creator_name: getName(song.created_by),
                    original_benefit_amount: getBenefit(song.created_by),
                };
            });

            setSongs(formattedSongs);
            setTotalSongs(count || 0);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateContributionType = async (
        songId: string,
        newType: string
    ) => {
        try {
            const currentSong = songs.find((s) => s.id === songId);
            if (!currentSong) return;

            const { data, error } = await supabase.functions.invoke(
                "update-song-creator",
                {
                    body: {
                        songId,
                        newCreatorId: currentSong.user_id,
                        contributionType: newType,
                        // JANGAN kirim customAmount agar Edge Function menghitung ulang dari Config
                        customAmount: null,
                        benefitTargetId: currentSong.user_id,
                    },
                }
            );

            if (error) throw error;

            toast.success(
                `Contribution updated to ${newType}. Benefit recalculated.`
            );
            fetchData(); // Refresh data agar Current Benefit yang baru muncul
        } catch (error: any) {
            toast.error(error.message || "Failed to update contribution type");
        }
    };

    const handleCreatorChange = async (
        songId: string,
        newCreatorId: string, // ID yang akan di-assign ke lagu (Current Creator)
        customAmount?: number,
        benefitTargetId?: string // ID spesifik yang benefitnya mau diubah
    ) => {
        try {
            const { error } = await supabase.functions.invoke(
                "update-song-creator",
                {
                    body: {
                        songId,
                        newCreatorId,
                        // Jika benefitTargetId tidak ada, gunakan newCreatorId (perilaku default)
                        benefitTargetId: benefitTargetId || newCreatorId,
                        customAmount:
                            customAmount !== undefined ? customAmount : null,
                    },
                }
            );

            if (error) throw error;

            toast.success("Benefit updated successfully");
            fetchData();
        } catch (error: any) {
            console.error("Error updating song creator:", error);
            toast.error(error.message || "Failed to update song creator");
        }
    };

    const handleEditBenefit = (song: Song, isOriginal: boolean) => {
        const targetCreatorId = isOriginal ? song.created_by : song.user_id;
        const targetAmount = isOriginal
            ? song.original_benefit_amount
            : song.benefit_amount;

        if (!targetCreatorId) {
            toast.error("No creator found for this selection");
            return;
        }

        setEditingBenefit({
            songId: song.id,
            songTitle: song.title,
            creatorId: targetCreatorId,
            currentAmount: targetAmount || 0,
            isOriginal: isOriginal,
        });
        setCustomAmount(targetAmount?.toString() || "");
    };

    const handleSaveCustomAmount = async () => {
        if (!editingBenefit) return;

        const amount = parseInt(customAmount);
        if (isNaN(amount) || amount < 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        // Cari data lagu saat ini untuk mendapatkan 'user_id' (Current Creator) yang sedang aktif
        const currentSong = songs.find((s) => s.id === editingBenefit.songId);
        if (!currentSong) return;

        await handleCreatorChange(
            editingBenefit.songId,
            currentSong.user_id, // Tetap gunakan ID creator yang sekarang (agar tidak berubah di UI)
            amount, // Jumlah benefit baru
            editingBenefit.creatorId // ID target yang akan diupdate benefitnya (bisa Original atau Current)
        );

        setEditingBenefit(null);
        setCustomAmount("");
    };

    const totalPages = Math.ceil(totalSongs / songsPerPage);

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">
                    Manage Song Creators
                </h1>
                <p className="text-muted-foreground">
                    Assign professional creators and manage benefits
                </p>
            </div>

            {/* Input Search is now outside the loading condition to maintain focus */}
            <div className="flex items-center gap-4 bg-background sticky top-0 z-10 py-2">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, artist, or creator..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="pl-8"
                    />
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Total songs: {totalSongs}
                </div>
            </div>

            <div className="border rounded-lg overflow-x-auto min-h-[400px]">
                {loading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[300px]">
                                    Title / Artist
                                </TableHead>

                                {/* ORIGINAL CREATOR SECTION */}
                                <TableHead>Original Creator</TableHead>
                                <TableHead>Original Benefit</TableHead>

                                {/* CURRENT CREATOR SECTION */}
                                <TableHead>Current Creator</TableHead>
                                <TableHead>Current Benefit</TableHead>
                                <TableHead>Contribution Type</TableHead>
                                <TableHead>Assign New Creator</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {songs.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center h-24 text-muted-foreground"
                                    >
                                        No songs found matching "
                                        {debouncedSearchTerm}"
                                    </TableCell>
                                </TableRow>
                            ) : (
                                songs.map((song) => (
                                    <TableRow key={song.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span
                                                    className="font-medium line-clamp-1"
                                                    title={song.title}
                                                >
                                                    {song.title}
                                                </span>
                                                <span className="text-sm text-muted-foreground line-clamp-1">
                                                    {song.artist || "N/A"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* ORIGINAL CREATOR */}
                                        <TableCell>
                                            <span className="text-sm text-gray-700">
                                                {song.original_creator_name ||
                                                    "Unknown"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {song.original_benefit_amount !==
                                                undefined ? (
                                                    <span className="font-medium text-gray-600">
                                                        Rp{" "}
                                                        {song.original_benefit_amount.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">
                                                        -
                                                    </span>
                                                )}
                                                {song.created_by && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() =>
                                                            handleEditBenefit(
                                                                song,
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* CURRENT CREATOR */}
                                        <TableCell className="text-blue-600 font-medium">
                                            {song.creator_name}
                                        </TableCell>
                                        <TableCell>
                                            {song.benefit_amount !==
                                            undefined ? (
                                                <span className="font-semibold text-green-600">
                                                    Rp{" "}
                                                    {song.benefit_amount.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={
                                                    song.contribution_type || ""
                                                }
                                                onValueChange={(value) =>
                                                    handleUpdateContributionType(
                                                        song.id,
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="transcription">
                                                        Transcription
                                                    </SelectItem>
                                                    <SelectItem value="arrangement">
                                                        Arrangement
                                                    </SelectItem>
                                                    <SelectItem value="original">
                                                        Original
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={song.user_id}
                                                onValueChange={(value) =>
                                                    handleCreatorChange(
                                                        song.id,
                                                        value
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-[200px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {creators.map((creator) => (
                                                        <SelectItem
                                                            key={
                                                                creator.user_id
                                                            }
                                                            value={
                                                                creator.user_id
                                                            }
                                                        >
                                                            {creator.display_name ||
                                                                creator.email ||
                                                                "Unknown"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleEditBenefit(
                                                        song,
                                                        false
                                                    )
                                                }
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog
                open={!!editingBenefit}
                onOpenChange={() => setEditingBenefit(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Edit{" "}
                            {editingBenefit?.isOriginal
                                ? "Original"
                                : "Current"}{" "}
                            Creator Benefit
                        </DialogTitle>
                        <DialogDescription>
                            Set custom benefit amount for:{" "}
                            <span className="font-semibold text-foreground">
                                {editingBenefit?.songTitle}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Custom Amount (Rp)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={customAmount}
                                onChange={(e) =>
                                    setCustomAmount(e.target.value)
                                }
                                placeholder="Enter custom amount"
                                min="0"
                            />
                            {editingBenefit?.currentAmount! > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Current amount: Rp{" "}
                                    {editingBenefit?.currentAmount.toLocaleString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingBenefit(null)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCustomAmount}>
                            Save Amount
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1 || loading}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages || loading}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AdminSongCreators;
