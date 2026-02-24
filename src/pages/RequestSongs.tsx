import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Music,
    CheckCircle,
    Clock,
    User,
    Calendar,
    Mail,
    Link as LinkIcon,
    ChevronsUpDown,
    ArrowDownUp,
    Check,
    X,
    Plus,
} from "lucide-react";

interface RequestArrangement {
    id: string;
    title: string;
    artist: string;
    youtube_link?: string;
    user_id: string;
    assigned_to?: string;
    assigned_song_id?: string;
    status: string;
    created_at: string;
    assigned_at?: string;
    completed_at?: string;
    admin_notes?: string;
    requester_email?: string;
    assigned_creator_name?: string;
    amount?: number;
    assigned_song?: {
        id: string;
        title: string;
        artist: string;
        slug: string;
    };
}

const RequestSongs = () => {
    const navigate = useNavigate();
    const { user, role, creatorType } = useUserRole();
    const { toast } = useToast();
    const [requests, setRequests] = useState<RequestArrangement[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] =
        useState<RequestArrangement | null>(null);
    const [assignNotes, setAssignNotes] = useState("");
    const [songUrl, setSongUrl] = useState("");
    const [creators, setCreators] = useState<any[]>([]);
    const [selectedCreator, setSelectedCreator] = useState("");
    const [mySongs, setMySongs] = useState<any[]>([]);
    const [selectedSongId, setSelectedSongId] = useState("");
    const [selectSongDialogOpen, setSelectSongDialogOpen] = useState(false);
    const [allSongs, setAllSongs] = useState<any[]>([]);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    const [adminAssignSongDialogOpen, setAdminAssignSongDialogOpen] =
        useState(false);
    const [filterCreatorId, setFilterCreatorId] = useState<string>("all");
    const [creatorCounts, setCreatorCounts] = useState<
        Record<string, { name: string; count: number }>
    >({});
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
    const [creatorComboboxOpen, setCreatorComboboxOpen] = useState(false);
    const [amount, setAmount] = useState<string>("0");
    const [editAmountDialogOpen, setEditAmountDialogOpen] = useState(false);
    const [isInternal, setIsInternal] = useState(false);

    useEffect(() => {
        const checkAccessAndFetch = async () => {
            if (!user) return;

            try {
                // Ambil data is_internal karena Michael butuh ini untuk lolos
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("is_internal")
                    .eq("user_id", user.id)
                    .single();

                const internalStatus = profile?.is_internal || false;
                setIsInternal(internalStatus);

                // Logika akses yang sinkron dengan Sidebar
                const hasAccess =
                    role === "admin" ||
                    role === "support_admin" ||
                    (role === "creator" &&
                        creatorType === "creator_arrangely") ||
                    (role === "creator" &&
                        creatorType === "creator_pro" &&
                        internalStatus);

                if (hasAccess) {
                    await fetchRequests();
                    if (role === "admin" || role === "support_admin") {
                        fetchCreators();
                        fetchAllSongs();
                    }
                    if (role === "creator") {
                        fetchMySongs();
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                // Loading BERHENTI di sini, apa pun hasilnya
                setLoading(false);
            }
        };

        checkAccessAndFetch();
    }, [user, role, creatorType]);

    // useEffect(() => {
    //     if (
    //         user &&
    //         (role === "admin" ||
    //             role === "support_admin" ||
    //             (role === "creator" && creatorType === "creator_arrangely"))
    //     ) {
    //         fetchRequests();
    //         if (role === "admin" || role === "support_admin") {
    //             fetchCreators();
    //             fetchAllSongs();
    //         }
    //         if (role === "creator") {
    //             fetchMySongs();
    //         }
    //     }
    // }, [user, role, creatorType]);

    const fetchAllSongs = async () => {
        try {
            const { data, error } = await supabase
                .from("songs")
                .select("id, title, artist, slug")
                .eq("is_public", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAllSongs(data || []);
        } catch (error) {
            console.error("Error fetching all songs:", error);
        }
    };

    const fetchCreators = async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, display_name")
                .eq("role", "creator")
                .eq("creator_type", "creator_arrangely");

            if (error) throw error;
            setCreators(data || []);
        } catch (error) {
            console.error("Error fetching creators:", error);
        }
    };

    const handleUpdateAmount = async () => {
        if (!selectedRequest) return;

        try {
            const { error } = await supabase
                .from("request_arrangements")
                .update({
                    amount: parseFloat(amount),
                })
                .eq("id", selectedRequest.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Amount updated successfully",
            });

            setEditAmountDialogOpen(false);
            fetchRequests();
        } catch (error) {
            console.error("Error updating amount:", error);
            toast({
                title: "Error",
                description: "Failed to update amount",
                variant: "destructive",
            });
        }
    };

    const handleUntakeRequest = async (requestId: string) => {
            try {
                const { error } = await supabase
                    .from("request_arrangements")
                    .update({
                        assigned_to: null,
                        status: "pending",
                        assigned_at: null,
                    })
                    .eq("id", requestId);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Request returned to the pool.",
                });

                fetchRequests();
            } catch (error) {
                console.error("Error un-taking request:", error);
                toast({
                    title: "Error",
                    description: "Failed to untake request",
                    variant: "destructive",
                });
            }
        };

        const handleDeleteRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from("request_arrangements")
                .delete()
                .eq("id", requestId);

            if (error) throw error;

            toast({
                title: "Deleted",
                description: "Request deleted successfully",
            });

            fetchRequests();
        } catch (error) {
            console.error("Error deleting request:", error);
            toast({
                title: "Error",
                description: "Failed to delete request",
                variant: "destructive",
            });
        }
    };


    const fetchMySongs = async () => {
        try {
            const { data, error } = await supabase
                .from("songs")
                .select("id, title, artist, slug")
                .eq("user_id", user?.id)
                .eq("is_public", true)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMySongs(data || []);
        } catch (error) {
            console.error("Error fetching my songs:", error);
        }
    };

    const fetchRequests = async () => {
        try {
            // Call edge function to get requests with emails
            const { data, error } = await supabase.functions.invoke(
                "get-request-arrangements",
            );

            if (error) {
                console.error("Edge function error:", error);
                throw error;
            }

            const formattedRequests = (data?.data || []).map((req: any) => ({
                id: req.id,
                title: req.title,
                artist: req.artist,
                youtube_link: req.youtube_link,
                user_id: req.user_id,
                assigned_to: req.assigned_to,
                status: req.status || "pending",
                created_at: req.created_at,
                assigned_at: req.assigned_at,
                completed_at: req.completed_at,
                admin_notes: req.admin_notes,
                requester_email: req.requester_email || "",
                assigned_creator_name: req.assigned_creator_name,
                assigned_song_id: req.assigned_song_id,
                assigned_song: req.assigned_song,
                amount: req.amount || 0,
            }));

            setRequests(formattedRequests);

            const completed = formattedRequests.filter(
                (r) => r.status === "completed",
            );
            const counts: Record<string, { name: string; count: number }> = {};
            completed.forEach((req) => {
                const creatorId = req.assigned_to;
                const creatorName = req.assigned_creator_name;
                if (creatorId && creatorName) {
                    if (!counts[creatorId]) {
                        counts[creatorId] = { name: creatorName, count: 0 };
                    }
                    counts[creatorId].count += 1;
                }
            });
            setCreatorCounts(counts);
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast({
                title: "Error",
                description: "Failed to fetch song requests",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedRequest || !selectedCreator) return;

        try {
            const { error } = await supabase
                .from("request_arrangements")
                .update({
                    assigned_to: selectedCreator,
                    status: "assigned",
                    assigned_at: new Date().toISOString(),
                    admin_notes: assignNotes,
                    amount: parseFloat(amount),
                })
                .eq("id", selectedRequest.id);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Request assigned successfully",
            });

            setAssignDialogOpen(false);
            setSelectedRequest(null);
            setAssignNotes("");
            setSelectedCreator("");
            fetchRequests();
        } catch (error) {
            console.error("Error assigning request:", error);
            toast({
                title: "Error",
                description: "Failed to assign request",
                variant: "destructive",
            });
        }
    };

    const handleTakeRequest = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from("request_arrangements")
                .update({
                    assigned_to: user?.id,
                    status: "assigned",
                    assigned_at: new Date().toISOString(),
                })
                .eq("id", requestId);

            if (error) throw error;

            toast({
                title: "Success",
                description: "Request taken successfully",
            });

            fetchRequests();
        } catch (error) {
            console.error("Error taking request:", error);
            toast({
                title: "Error",
                description: "Failed to take request",
                variant: "destructive",
            });
        }
    };

    const handleCreateNewArrangement = (request: RequestArrangement) => {
        navigate("/editor", {
            state: {
                fromRequestSongs: true,
                requestData: {
                    id: request.id,
                    title: request.title,
                    artist: request.artist,
                    youtube_link: request.youtube_link,
                },
            },
        });
    };

    const handleAssignSong = async () => {
        if (!selectedRequest || !selectedSongId) return;

        try {
            const selectedSong = mySongs.find((s) => s.id === selectedSongId);
            const songUrl = `https://arrangely.io/song/${selectedSong?.slug}`;

            const { error: updateError } = await supabase
                .from("request_arrangements")
                .update({
                    assigned_song_id: selectedSongId,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    admin_notes: `Song available at: ${songUrl}`,
                })
                .eq("id", selectedRequest.id);

            if (updateError) throw updateError;

            // Send email notification
            const { error: emailError } = await supabase.functions.invoke(
                "notify-song-ready",
                {
                    body: {
                        email: selectedRequest.requester_email,
                        title: selectedRequest.title,
                        artist: selectedRequest.artist,
                        songUrl: songUrl,
                        assignedSongTitle: selectedSong?.title,
                    },
                },
            );

            if (emailError) {
                console.error("Email error:", emailError);
            }

            toast({
                title: "Success",
                description: "Song assigned and notification sent to requester",
            });

            setSelectSongDialogOpen(false);
            setSelectedRequest(null);
            setSelectedSongId("");
            fetchRequests();
        } catch (error) {
            console.error("Error assigning song:", error);
            toast({
                title: "Error",
                description: "Failed to assign song",
                variant: "destructive",
            });
        }
    };

    const handleAdminAssignSong = async () => {
        if (!selectedRequest || !selectedSongId) return;

        try {
            const selectedSong = allSongs.find((s) => s.id === selectedSongId);
            if (!selectedSong) {
                throw new Error("Selected song not found.");
            }
            const songUrl = `https://arrangely.io/song/${selectedSong.slug}`;

            const { error: updateError } = await supabase
                .from("request_arrangements")
                .update({
                    assigned_song_id: selectedSongId,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    admin_notes: `Song available at: ${songUrl}`,
                })
                .eq("id", selectedRequest.id);

            if (updateError) throw updateError;

            const { error: emailError } = await supabase.functions.invoke(
                "notify-song-ready",
                {
                    body: {
                        email: selectedRequest.requester_email,
                        title: selectedRequest.title,
                        artist: selectedRequest.artist,
                        songUrl: songUrl,
                        assignedSongTitle: selectedSong.title,
                    },
                },
            );

            if (emailError) {
                console.error("Email error:", emailError);
            }

            toast({
                title: "Success",
                description: "Song assigned and notification sent to requester",
            });

            setAdminAssignSongDialogOpen(false);
            setSelectedRequest(null);
            setSelectedSongId("");
            fetchRequests();
        } catch (error) {
            console.error("Error assigning song:", error);
            toast({
                title: "Error",
                description: "Failed to assign song",
                variant: "destructive",
            });
        }
    };

    const newRequests = requests.filter(
        (r) => r.status === "pending" || r.status === "assigned",
    );
    const completedRequests = requests.filter((r) => r.status === "completed");

    const filteredCompletedRequests =
        filterCreatorId === "all"
            ? completedRequests
            : completedRequests.filter(
                  (r) => r.assigned_to === filterCreatorId,
              );

    const sortedAndFilteredCompletedRequests = filteredCompletedRequests.sort(
        (a, b) => {
            // Handle jika completed_at null (taruh di akhir jika descending, di awal jika ascending)
            if (!a.completed_at) return 1;
            if (!b.completed_at) return -1;

            const dateA = new Date(a.completed_at).getTime();
            const dateB = new Date(b.completed_at).getTime();

            if (sortOrder === "desc") {
                return dateB - dateA; // Terbaru ke terlama
            } else {
                return dateA - dateB; // Terlama ke terbaru
            }
        },
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading requests...</p>
                </div>
            </div>
        );
    }

    const hasAccess =
        role === "admin" ||
        role === "support_admin" ||
        (role === "creator" && creatorType === "creator_arrangely") ||
        (role === "creator" && creatorType === "creator_pro" && isInternal);

    // Cukup satu blok pengecekan sebelum "return" utama
    if (!loading && !hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen text-center">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-muted-foreground">
                        Hanya admin dan creator internal yang dapat mengakses
                        halaman ini.
                    </p>
                </div>
            </div>
        );
    }
    {
        // return (
        //     <div className="flex items-center justify-center min-h-screen">
        //         <div className="text-center">
        //             <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        //             <p className="text-muted-foreground">
        //                 Only admins and Arrangely creators can access this page.
        //                 {role === "creator" &&
        //                     creatorType !== "creator_arrangely" && (
        //                         <span className="block mt-2">
        //                             Your creator type:{" "}
        //                             {creatorType || "not set"}
        //                         </span>
        //                     )}
        //             </p>
        //         </div>
        //     </div>
        // );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Song Requests</h1>
                <p className="text-muted-foreground">
                    Manage and assign requested arrangements
                </p>
            </div>

            <Tabs defaultValue="new" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="new">
                        New Requests ({newRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="done">
                        Done ({completedRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="mt-6">
                    <div className="grid gap-4">
                        {newRequests.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No new requests</p>
                                </CardContent>
                            </Card>
                        ) : (
                            newRequests.map((request) => (
                                <Card key={request.id}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="flex items-center gap-2">
                                                    <Music className="h-5 w-5" />
                                                    {request.title}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    by {request.artist}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                variant={
                                                    request.status ===
                                                    "assigned"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {request.status ===
                                                "assigned" ? (
                                                    <>
                                                        <Clock className="h-3 w-3 mr-1" />{" "}
                                                        Assigned
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3 mr-1" />{" "}
                                                        Pending
                                                    </>
                                                )}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                                                <span className="text-xs uppercase tracking-wider opacity-70">
                                                    Benefit:
                                                </span>
                                                Rp{" "}
                                                {request.amount?.toLocaleString(
                                                    "id-ID",
                                                ) || "0"}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {new Date(
                                                        request.created_at,
                                                    ).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate">
                                                    {request.requester_email}
                                                </span>
                                            </div>
                                        </div>

                                        {request.youtube_link && (
                                            <div className="text-sm">
                                                <a
                                                    href={request.youtube_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                >
                                                    View YouTube Reference
                                                </a>
                                            </div>
                                        )}

                                        {request.assigned_to &&
                                            request.assigned_creator_name && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span>
                                                        Assigned to:{" "}
                                                        {
                                                            request.assigned_creator_name
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                        {request.admin_notes && (
                                            <div className="text-sm p-3 bg-muted rounded-lg">
                                                <p className="font-medium mb-1">
                                                    Notes:
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {request.admin_notes}
                                                </p>
                                            </div>
                                        )}

                                        {request.assigned_song && (
                                            <div className="text-sm p-3 bg-primary/10 rounded-lg border border-primary/20">
                                                <p className="font-medium mb-1 text-primary">
                                                    Assigned Song:
                                                </p>
                                                <p className="text-foreground">
                                                    {
                                                        request.assigned_song
                                                            .title
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        request.assigned_song
                                                            .artist
                                                    }
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            {/* Admin can assign to creators */}
                                            {(role === "admin" || role === "support_admin") &&
                                                request.status === "pending" && (
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedRequest(
                                                                request,
                                                            );
                                                            setAssignDialogOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        Assign to Creator
                                                    </Button>
                                                )}
                                            {(role === "admin" || role === "support_admin") &&
                                                request.status === "pending" && (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedRequest(
                                                                request,
                                                            );
                                                            setAdminAssignSongDialogOpen(
                                                                true,
                                                            );
                                                        }}
                                                    >
                                                        <LinkIcon className="h-4 w-4 mr-2" />
                                                        Assign Existing Song
                                                    </Button>
                                                )}
                                            {(role === "admin" ||
                                                role === "support_admin") && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(
                                                            request,
                                                        );
                                                        setAmount(
                                                            request.amount?.toString() ||
                                                                "0",
                                                        );
                                                        setEditAmountDialogOpen(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    Edit Amount
                                                </Button>
                                            )}
                                            {/* Creator can take unassigned requests */}
                                            {role === "creator" &&
                                                !request.assigned_to && (
                                                    <>
                                                        <Button
                                                            onClick={() =>
                                                                handleTakeRequest(
                                                                    request.id,
                                                                )
                                                            }
                                                        >
                                                            Take Request
                                                        </Button>

                                                        {/* --- TOMBOL BARU --- */}
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedRequest(
                                                                    request,
                                                                );
                                                                setSelectSongDialogOpen(
                                                                    true,
                                                                ); // Buka dialog milik creator
                                                            }}
                                                        >
                                                            <LinkIcon className="h-4 w-4 mr-2" />
                                                            Assign Existing Song
                                                        </Button>
                                                        {/* --- AKHIR TOMBOL BARU --- */}
                                                    </>
                                                )}
                                            {/* Creator can select song for their assigned requests */}
                                            {role === "creator" &&
                                                request.assigned_to ===
                                                    user?.id &&
                                                request.status === "assigned" &&
                                                !request.assigned_song_id && (
                                                    <>
                                                        <Button
                                                            onClick={() =>
                                                                handleCreateNewArrangement(
                                                                    request,
                                                                )
                                                            }
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Create New
                                                            Arrangement
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedRequest(
                                                                    request,
                                                                );
                                                                setSelectSongDialogOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <Music className="h-4 w-4 mr-2" />
                                                            Select Existing Song
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleUntakeRequest(
                                                                    request.id,
                                                                )
                                                            }
                                                        >
                                                            <X className="h-4 w-4 mr-2" />
                                                            Untake
                                                        </Button>
                                                    </>
                                                )}
                                                {(role === "admin" || role === "support_admin") && (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleDeleteRequest(request.id)}
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </Button>
                                                )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="done" className="mt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-4">
                        <div className="max-w-xs">
                            <Label htmlFor="filter-creator">
                                Filter by Creator
                            </Label>
                            <Select
                                value={filterCreatorId}
                                onValueChange={setFilterCreatorId}
                            >
                                <SelectTrigger id="filter-creator">
                                    <SelectValue placeholder="Select Creator" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All Creators ({completedRequests.length}
                                        ) {/* Total semua */}
                                    </SelectItem>
                                    {/* Urutkan kreator berdasarkan nama */}
                                    {Object.entries(creatorCounts)
                                        .sort(([, a], [, b]) =>
                                            a.name.localeCompare(b.name),
                                        )
                                        .map(([creatorId, { name, count }]) => (
                                            <SelectItem
                                                key={creatorId}
                                                value={creatorId}
                                            >
                                                {name} ({count}){" "}
                                                {/* Tampilkan nama dan jumlah */}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setSortOrder(
                                        sortOrder === "desc" ? "asc" : "desc",
                                    )
                                }
                            >
                                <ArrowDownUp className="h-4 w-4 mr-2" />
                                Sort by Date (
                                {sortOrder === "desc" ? "Newest" : "Oldest"})
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {sortedAndFilteredCompletedRequests.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>
                                        No completed requests{" "}
                                        {filterCreatorId !== "all"
                                            ? "found for this creator"
                                            : "yet"}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            sortedAndFilteredCompletedRequests.map(
                                (request) => {
                                    // console.log(
                                    //   `Request ID: ${request.id}, Assigned Creator Name:`,
                                    //   request.assigned_creator_name
                                    // );
                                    return (
                                        <Card key={request.id}>
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Music className="h-5 w-5" />
                                                            {request.title}
                                                        </CardTitle>
                                                        <CardDescription className="mt-1">
                                                            by {request.artist}
                                                        </CardDescription>
                                                    </div>
                                                    <Badge variant="default">
                                                        <CheckCircle className="h-3 w-3 mr-1" />{" "}
                                                        Completed
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full border border-green-200">
                                                        <span className="text-xs uppercase tracking-wider opacity-70">
                                                            Benefit:
                                                        </span>
                                                        Rp{" "}
                                                        {request.amount?.toLocaleString(
                                                            "id-ID",
                                                        ) || "0"}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            Requested
                                                        </p>
                                                        <p>
                                                            {new Date(
                                                                request.created_at,
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">
                                                            Completed
                                                        </p>
                                                        <p>
                                                            {request.completed_at
                                                                ? new Date(
                                                                      request.completed_at,
                                                                  ).toLocaleDateString()
                                                                : "-"}
                                                        </p>
                                                    </div>

                                                    {/* {request.assigned_creator_name && ( */}
                                                    <div className="col-span-2 sm:col-span-1">
                                                        {/* Adjust span if needed */}
                                                        <p className="text-muted-foreground">
                                                            Completed by
                                                        </p>
                                                        <p className="flex items-center gap-1">
                                                            <User className="h-3 w-3" />{" "}
                                                            {
                                                                request.assigned_creator_name
                                                            }
                                                        </p>
                                                    </div>
                                                    {/* )} */}
                                                </div>

                                                {request.admin_notes && (
                                                    <div className="text-sm p-3 bg-muted rounded-lg">
                                                        <p className="font-medium mb-1">
                                                            Notes:
                                                        </p>
                                                        <p className="text-muted-foreground">
                                                            {
                                                                request.admin_notes
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                },
                            )
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Admin Dialog: Assign to Creator */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Request</DialogTitle>
                        <DialogDescription>
                            Assign this song request to a creator
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="creator">Select Creator</Label>
                            <Select
                                value={selectedCreator}
                                onValueChange={setSelectedCreator}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a creator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {creators.map((creator) => (
                                        <SelectItem
                                            key={creator.user_id}
                                            value={creator.user_id}
                                        >
                                            {creator.display_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">
                                Amount / Benefit (Rp)
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Contoh: 50000"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Add any notes or instructions..."
                                value={assignNotes}
                                onChange={(e) => setAssignNotes(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleAssign} className="w-full">
                            Assign Request
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editAmountDialogOpen}
                onOpenChange={setEditAmountDialogOpen}
            >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Set Benefit Amount</DialogTitle>
                        <DialogDescription>
                            Update the benefit amount for:{" "}
                            {selectedRequest?.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-amount">
                                Amount / Benefit (Rp)
                            </Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleUpdateAmount} className="w-full">
                            Save Amount
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Creator Dialog: Select Song */}
            <Dialog
                open={selectSongDialogOpen}
                onOpenChange={setSelectSongDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Song to Assign</DialogTitle>
                        <DialogDescription>
                            Choose one of your published songs to fulfill this
                            request
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2 relative">
                            <Label htmlFor="song">Select Song</Label>{" "}
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={creatorComboboxOpen}
                                className="w-full justify-between"
                                onClick={() =>
                                    setCreatorComboboxOpen(!creatorComboboxOpen)
                                }
                            >
                                {" "}
                                {selectedSongId
                                    ? mySongs.find(
                                          (song) => song.id === selectedSongId,
                                      )?.title +
                                      " - " +
                                      mySongs.find(
                                          (song) => song.id === selectedSongId,
                                      )?.artist
                                    : "Search and choose a song..."}{" "}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />{" "}
                            </Button>{" "}
                            {/* Tampilkan Command secara manual jika creatorComboboxOpen === true */}{" "}
                            {creatorComboboxOpen && (
                                <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                                    {" "}
                                    <Command>
                                        {" "}
                                        <CommandInput placeholder="Search song by title or artist..." />{" "}
                                        <CommandList>
                                            {" "}
                                            <CommandEmpty>
                                                No song found.
                                            </CommandEmpty>{" "}
                                            <CommandGroup>
                                                {" "}
                                                {mySongs.map((song) => (
                                                    <CommandItem
                                                        key={song.id}
                                                        value={`${song.title} ${song.artist}`}
                                                        onSelect={() => {
                                                            setSelectedSongId(
                                                                song.id ===
                                                                    selectedSongId
                                                                    ? ""
                                                                    : song.id,
                                                            );
                                                            setCreatorComboboxOpen(
                                                                false,
                                                            ); // Tutup dropdown
                                                        }}
                                                    >
                                                        {" "}
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${
                                                                selectedSongId ===
                                                                song.id
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            }`}
                                                        />
                                                        {song.title} -{" "}
                                                        {song.artist}{" "}
                                                    </CommandItem>
                                                ))}{" "}
                                            </CommandGroup>{" "}
                                        </CommandList>{" "}
                                    </Command>{" "}
                                </div>
                            )}{" "}
                        </div>
                        {mySongs.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                You don't have any published songs yet. Please
                                publish a song first.
                            </p>
                        )}
                        <Button
                            onClick={handleAssignSong}
                            className="w-full"
                            disabled={!selectedSongId}
                        >
                            Assign Song & Notify Requester
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={adminAssignSongDialogOpen}
                onOpenChange={setAdminAssignSongDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Existing Song</DialogTitle>
                        <DialogDescription>
                            Choose a published song from the entire library to
                            fulfill this request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        {/* 👇 PERUBAHAN BESAR DIMULAI DARI SINI 👇 */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="all-songs">Select Song</Label>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={comboboxOpen}
                                className="w-full justify-between"
                                onClick={() => setComboboxOpen(!comboboxOpen)} // Langsung toggle state
                            >
                                {selectedSongId
                                    ? allSongs.find(
                                          (song) => song.id === selectedSongId,
                                      )?.title +
                                      " - " +
                                      allSongs.find(
                                          (song) => song.id === selectedSongId,
                                      )?.artist
                                    : "Search and choose a song..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            {/* Tampilkan Command secara manual jika comboboxOpen === true */}
                            {comboboxOpen && (
                                <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                                    <Command>
                                        <CommandInput placeholder="Search song by title or artist..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                No song found.
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {allSongs.map((song) => (
                                                    <CommandItem
                                                        key={song.id}
                                                        value={`${song.title} ${song.artist}`}
                                                        onSelect={() => {
                                                            setSelectedSongId(
                                                                song.id ===
                                                                    selectedSongId
                                                                    ? ""
                                                                    : song.id,
                                                            );
                                                            setComboboxOpen(
                                                                false,
                                                            ); // Tutup dropdown setelah memilih
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${
                                                                selectedSongId ===
                                                                song.id
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                            }`}
                                                        />
                                                        {song.title} -{" "}
                                                        {song.artist}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </div>
                            )}
                        </div>
                        {allSongs.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No published songs found in the library.
                            </p>
                        )}
                        <Button
                            onClick={handleAdminAssignSong}
                            className="w-full"
                            disabled={!selectedSongId}
                        >
                            Assign Song & Notify Requester
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RequestSongs;
