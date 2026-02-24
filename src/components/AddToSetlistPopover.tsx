import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ListPlus, Plus, Check, Loader2, Calendar, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface Setlist {
    id: string;
    name: string;
    date: string;
    theme: string | null;
    song_ids: string[];
}

interface AddToSetlistPopoverProps {
    songId: string;
    songTitle: string;
    disabled?: boolean;
}

export const AddToSetlistPopover = ({
    songId,
    songTitle,
    disabled = false,
}: AddToSetlistPopoverProps) => {
    const { t } = useLanguage();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [setlists, setSetlists] = useState<Setlist[]>([]);
    const [loading, setLoading] = useState(false);
    const [addingToSetlist, setAddingToSetlist] = useState<string | null>(null);
    const [newSetlist, setNewSetlist] = useState({
        name: "",
        date: "",
        theme: "",
    });

    useEffect(() => {
        if (open) {
            loadSetlists();
        }
    }, [open]);

    const loadSetlists = async () => {
        setLoading(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to add songs to setlists.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("setlists")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error loading setlists:", error);
                toast({
                    title: "Error",
                    description: "Failed to load setlists.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            setSetlists(data || []);
        } catch (error) {
            console.error("Error loading setlists:", error);
            toast({
                title: "Error",
                description: "Failed to load setlists.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const addToSetlist = async (setlistId: string) => {
        setAddingToSetlist(setlistId);
        try {
            const setlist = setlists.find((s) => s.id === setlistId);
            if (!setlist) return;

            // Check if song is already in setlist - if so, remove it
            const isAlreadyInSetlist = setlist.song_ids.includes(songId);
            const updatedSongIds = isAlreadyInSetlist
                ? setlist.song_ids.filter((id) => id !== songId)
                : [...setlist.song_ids, songId];

            const { error } = await supabase
                .from("setlists")
                .update({ song_ids: updatedSongIds })
                .eq("id", setlistId);

            if (error) {
                console.error("Error updating setlist:", error);
                toast({
                    title: "Error",
                    description: "Failed to update setlist.",
                    variant: "destructive",
                });
                setAddingToSetlist(null);
                return;
            }

            toast({
                title: isAlreadyInSetlist
                    ? "Removed from Setlist"
                    : "Added to Setlist",
                description: isAlreadyInSetlist
                    ? `"${songTitle}" has been removed from "${setlist.name}".`
                    : `"${songTitle}" has been added to "${setlist.name}".`,
            });

            // Reload setlists to get updated data
            await loadSetlists();
        } catch (error) {
            console.error("Error updating setlist:", error);
            toast({
                title: "Error",
                description: "Failed to update setlist.",
                variant: "destructive",
            });
        } finally {
            setAddingToSetlist(null);
        }
    };

    const createSetlist = async () => {
        if (!newSetlist.name.trim() || !newSetlist.date) {
            toast({
                title: "Missing Information",
                description: "Please fill in name and date.",
                variant: "destructive",
            });
            return;
        }

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Authentication Required",
                    description: "Please log in to create setlists.",
                    variant: "destructive",
                });
                return;
            }

            const { data, error } = await supabase
                .from("setlists")
                .insert({
                    user_id: user.id,
                    name: newSetlist.name,
                    date: newSetlist.date,
                    theme: newSetlist.theme || null,
                    song_ids: [songId], // Add current song to new setlist
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating setlist:", error);
                toast({
                    title: "Error",
                    description: "Failed to create setlist.",
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "Setlist Created",
                description: `"${newSetlist.name}" has been created with "${songTitle}" added.`,
            });

            setNewSetlist({ name: "", date: "", theme: "" });
            setShowCreateDialog(false);
            await loadSetlists();
            setOpen(false);
        } catch (error) {
            console.error("Error creating setlist:", error);
            toast({
                title: "Error",
                description: "Failed to create setlist.",
                variant: "destructive",
            });
        }
    };

    const isSongInSetlist = (setlist: Setlist) => {
        return setlist.song_ids.includes(songId);
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={disabled}
                        className="flex-1 min-w-[120px] border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                    >
                        <ListPlus className="h-4 w-4 mr-1" />
                        {/* Add to Setlist */}
                        {t("arrDetail.addToSetlist")}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">
                                Add to Setlist
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Choose a setlist or create a new one
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : setlists.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground mb-3">
                                    No setlists yet
                                </p>
                                <Button
                                    onClick={() => setShowCreateDialog(true)}
                                    size="sm"
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Your First Setlist
                                </Button>
                            </div>
                        ) : (
                            <>
                                <ScrollArea className="h-[200px] pr-4">
                                    <div className="space-y-2">
                                        {setlists.map((setlist) => (
                                            <button
                                                key={setlist.id}
                                                onClick={() =>
                                                    addToSetlist(setlist.id)
                                                }
                                                disabled={
                                                    addingToSetlist ===
                                                    setlist.id
                                                }
                                                className="w-full text-left p-3 rounded-md border transition-colors hover:bg-accent hover:border-accent-foreground"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">
                                                            {setlist.name}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(
                                                                    setlist.date
                                                                ).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {
                                                                setlist.song_ids
                                                                    .length
                                                            }{" "}
                                                            song
                                                            {setlist.song_ids
                                                                .length !== 1
                                                                ? "s"
                                                                : ""}
                                                        </p>
                                                    </div>
                                                    {addingToSetlist ===
                                                    setlist.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                                                    ) : isSongInSetlist(
                                                          setlist
                                                      ) ? (
                                                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                    ) : null}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="space-y-2">
                                    {/* <Button
                    onClick={() => {
                      const setlistWithSong = setlists.find((s) =>
                        s.song_ids.includes(songId)
                      );
                      if (setlistWithSong) {
                        navigate(`/setlist/${setlistWithSong.id}/performance`);
                        setOpen(false);
                      } else {
                        toast({
                          title: "No Setlist Selected",
                          description: "Please add this song to a setlist first.",
                          variant: "destructive",
                        });
                      }
                    }}
                    size="sm"
                    className="w-full"
                    disabled={!setlists.some((s) => s.song_ids.includes(songId))}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Performance
                  </Button> */}
                                    <Button
                                        onClick={() =>
                                            setShowCreateDialog(true)
                                        }
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create New Setlist
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            {/* Create Setlist Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Setlist</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Setlist Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Sunday Worship, Christmas Service"
                                value={newSetlist.name}
                                onChange={(e) =>
                                    setNewSetlist({
                                        ...newSetlist,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={newSetlist.date}
                                onChange={(e) =>
                                    setNewSetlist({
                                        ...newSetlist,
                                        date: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="theme">Theme (Optional)</Label>
                            <Input
                                id="theme"
                                placeholder="e.g., Praise & Worship, Christmas"
                                value={newSetlist.theme}
                                onChange={(e) =>
                                    setNewSetlist({
                                        ...newSetlist,
                                        theme: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            "{songTitle}" will be added to this setlist
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setNewSetlist({
                                    name: "",
                                    date: "",
                                    theme: "",
                                });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={createSetlist}>
                            Create & Add Song
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
