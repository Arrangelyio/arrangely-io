import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import VisibilitySelector, {
    ContributionType,
} from "@/components/VisibilitySelector";
import { supabase } from "@/integrations/supabase/client";
import { extractYouTubeVideoId } from "@/utils/youtubeUtils";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "react-router-dom";

const fetchYouTubeInfo = async (url: string) => {
    try {
        const response = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
                url,
            )}&format=json`,
        );
        if (response.ok) {
            const data = await response.json();
            return {
                title: data.title,
                artist: data.author_name,
            };
        }
    } catch (error) {
        console.error("Error fetching YouTube info:", error);
    }
    return null;
};
interface SongDetailsStepProps {
    songData: {
        title: string;
        artist: string;
        key: string;
        tempo: string;
        timeSignature: string;
        tags: string;
        serviceDate: string;
        youtubeLink: string;
        visibility: string;
        sequencerDriveLink: string;
        sequencerPrice: string;
        originalCreatorId: string | null;
        contributionType?: ContributionType;
    };
    setSongData: (data: any) => void;
    fromRequestSongs?: boolean;
}
const SongDetailsStep = ({
    songData,
    setSongData,
    fromRequestSongs = false,
}: SongDetailsStepProps) => {
    const { t } = useLanguage();
    const [isYouTubeDataLocked, setIsYouTubeDataLocked] = useState(false);
    const [initialDataProcessed, setInitialDataProcessed] = useState(false);
    const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
    const [duplicateSong, setDuplicateSong] = useState<any>(null);
    const [hasPendingRequests, setHasPendingRequests] = useState(false);
    const isLocked = !!songData.originalCreatorId;
    const location = useLocation();
    const shouldLockVisibility = location.state?.lockVisibility;
    const [creatorType, setCreatorType] = useState<string | null>(null);
    const isCurrentlyPublicInDb = songData.visibility === "public";

    // NEW: State for visibility lock after duplicate detection
    const [isVisibilityLockedToPrivate, setIsVisibilityLockedToPrivate] =
        useState(false);
    const [duplicateLockReason, setDuplicateLockReason] = useState<string>("");

    const { toast } = useToast();

    /**
     * Tiered permission logic for duplicate override:
     * - Creator Professional can override creator_pro and creator_arrangely
     * - Creator Arrangely and Creator Pro cannot override anyone
     */
    const canOverrideDuplicate = (
        currentUserType: string | null,
        ownerType: string | null,
    ): boolean => {
        // Only creator_professional can override
        if (currentUserType !== "creator_professional") return false;

        // Can only override creator_pro or creator_arrangely
        return ownerType === "creator_pro" || ownerType === "creator_arrangely";
    };

    const keys = [
        "C",
        "C#",
        "Db",
        "D",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "Ab",
        "A",
        "Bb",
        "B",
    ];

    // Check for pending arrangement requests on mount (skip if from Request Songs flow)
    useEffect(() => {
        const checkPendingRequests = async () => {
            // Skip check if coming from Request Songs flow
            if (fromRequestSongs) return;

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                // Get user profile
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, creator_type")
                    .eq("user_id", user.id)
                    .single();

                if (profile) {
                    setCreatorType(profile.creator_type);
                }

                // Check if user is creator_arrangely
                if (
                    profile?.role === "creator" &&
                    profile?.creator_type === "creator_arrangely"
                ) {
                    // Check for pending requests
                    const { data: pendingRequests } = await supabase
                        .from("request_arrangements")
                        .select("id")
                        .or(`status.eq.pending,status.eq.assigned`)
                        .or(`status.eq.pending,user_id.eq.${user.id}`)
                        .limit(1);

                    if (pendingRequests && pendingRequests.length > 0) {
                        setHasPendingRequests(true);
                        // toast({
                        //   title: "Pending Arrangement Requests",
                        //   description: "You have pending arrangement requests. Please complete them before publishing new arrangements.",
                        //   variant: "destructive",
                        //   duration: 8000,
                        // });
                    }
                }
            } catch (error) {
                console.error("Error checking pending requests:", error);
            }
        };

        checkPendingRequests();
    }, [toast, fromRequestSongs]);

    // Load prefilled YouTube link from sessionStorage (from Request Songs flow)
    useEffect(() => {
        const prefillYoutubeLink = sessionStorage.getItem("prefillYoutubeLink");
        if (prefillYoutubeLink && !songData.youtubeLink) {
            handleYouTubeLinkChange(prefillYoutubeLink, fromRequestSongs);
            sessionStorage.removeItem("prefillYoutubeLink");
        }
    }, []);

    useEffect(() => {
        if (!initialDataProcessed && songData.youtubeLink && songData.title) {
            setIsYouTubeDataLocked(true);
            setInitialDataProcessed(true); // Tandai sudah diproses agar tidak berjalan
        }
    }, [songData.youtubeLink, songData.title, initialDataProcessed]);

    const checkDuplicatePublicSong = async (
        youtubeLink: string,
        title: string,
        artist: string,
    ): Promise<{
        id: string;
        title: string;
        artist: string;
        slug: string;
        ownerCreatorType: string | null;
    } | null> => {
        try {
            // Get current user
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            // Call Edge Function
            const { data, error } = await supabase.functions.invoke(
                "check-duplicate-songs",
                {
                    body: {
                        youtubeLink,
                        title,
                        artist,
                        userId: user.id,
                    },
                },
            );

            if (error) {
                console.error("Error invoking check-duplicate-songs:", error);
                return null;
            }

            return data?.duplicate ?? null;
        } catch (err) {
            console.error("Error in checkDuplicatePublicSong:", err);
            return null;
        }
    };

    useEffect(() => {
        if (shouldLockVisibility && songData.visibility === "public") {
            setSongData((prev: any) => ({
                ...prev,
                visibility: "private",
            }));

            // Opsional: Beritahu user via toast
            toast({
                title: "Visibility Locked",
                description:
                    "Editing a community arrangement automatically sets visibility to Private.",
            });
        }
    }, [shouldLockVisibility, setSongData, songData.visibility]);

    const handleYouTubeLinkChange = async (
        url: string,
        skipLocking: boolean = false,
    ) => {
        if (!url.trim()) {
            const shouldClearData = isYouTubeDataLocked;
            setSongData({
                ...songData,
                youtubeLink: "",
                title: shouldClearData ? "" : songData.title,
                artist: shouldClearData ? "" : songData.artist,
            });
            setIsYouTubeDataLocked(false);
            setIsVisibilityLockedToPrivate(false);
            setDuplicateLockReason("");
            return;
        }

        setSongData({ ...songData, youtubeLink: url });
        const info = await fetchYouTubeInfo(url);

        if (info && info.title) {
            // Extract videoId for duplicate checking
            const videoId = extractYouTubeVideoId(url);

            // Check for duplicate public song
            if (videoId && songData.visibility === "public") {
                const duplicate = await checkDuplicatePublicSong(
                    url,
                    info.title,
                    info.artist,
                );

                if (duplicate) {
                    // Check if current user can override this duplicate
                    if (
                        canOverrideDuplicate(
                            creatorType,
                            duplicate.ownerCreatorType,
                        )
                    ) {
                        // User can override - proceed normally without dialog
                        console.log(
                            "User can override duplicate, proceeding...",
                        );
                    } else {
                        // User cannot override - show dialog
                        setDuplicateSong(duplicate);
                        setShowDuplicateAlert(true);
                        return;
                    }
                }
            }

            setSongData({
                ...songData,
                youtubeLink: url,
                title: info.title,
                artist: info.artist,
            });
            // Don't lock fields when coming from Request Songs flow - allow editing
            if (!skipLocking) {
                setIsYouTubeDataLocked(true);
            }
            toast({
                title: "Auto-filled from YouTube",
                description:
                    "Song title and artist have been automatically filled.",
            });
        } else {
            setIsYouTubeDataLocked(false);
        }
    };

    const handleContinueWithDuplicate = () => {
        // User chose to continue despite duplicate
        setShowDuplicateAlert(false);
        setDuplicateSong(null);

        // Set the song data with private visibility AND lock visibility toggle
        setSongData({
            ...songData,
            visibility: "private", // Force private if duplicate exists
        });
        setIsYouTubeDataLocked(true);

        // Lock visibility to private for the rest of the session
        setIsVisibilityLockedToPrivate(true);
        setDuplicateLockReason(
            "A verified creator's public arrangement already exists for this song.",
        );

        toast({
            title: "Continuing as Private",
            description:
                "Your arrangement will be created as private since a public version exists.",
        });
    };

    const handleCancelDuplicate = () => {
        // Clear the YouTube link and data
        setShowDuplicateAlert(false);
        setDuplicateSong(null);
        setSongData({
            ...songData,
            youtubeLink: "",
            title: "",
            artist: "",
        });
        setIsYouTubeDataLocked(false);
    };

    const handleVisibilityChange = async (value: string) => {
        // Block public visibility if user has pending requests
        // if (value === "public" && hasPendingRequests) {
        //   toast({
        //     title: "❌ Cannot Set to Public",
        //     description: "You have pending arrangement requests. Please complete them before publishing new arrangements.",
        //     variant: "destructive",
        //     duration: 5000,
        //   });
        //   return; // Don't change visibility
        // }

        if (isCurrentlyPublicInDb && value === "private") {
            toast({
                title: "Cannot change to Private",
                description: "Public arrangements cannot be switched back to private to maintain consistency.",
                variant: "destructive"
            });
            return; 
        }

        // If changing to public, check for duplicates
        if (value === "public" && songData.youtubeLink && songData.title) {
            const videoId = extractYouTubeVideoId(songData.youtubeLink);

            if (videoId) {
                const duplicate = await checkDuplicatePublicSong(
                    songData.youtubeLink,
                    songData.title,
                    songData.artist,
                );

                if (duplicate) {
                    // Check if current user can override this duplicate
                    if (
                        canOverrideDuplicate(
                            creatorType,
                            duplicate.ownerCreatorType,
                        )
                    ) {
                        // User can override - allow changing to public
                        console.log(
                            "User can override duplicate, allowing public visibility",
                        );
                    } else {
                        // User cannot override - show dialog
                        setDuplicateSong(duplicate);
                        setShowDuplicateAlert(true);
                        return; // Don't change visibility
                    }
                }
            }
        }

        setSongData({ ...songData, visibility: value });
    };

    return (
        <>
            <AlertDialog
                open={showDuplicateAlert}
                onOpenChange={setShowDuplicateAlert}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Public Song Already Exists
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                A public arrangement with this YouTube video
                                already exists:
                            </p>
                            <div className="bg-muted p-3 rounded-md">
                                <p className="font-semibold">
                                    {duplicateSong?.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {duplicateSong?.artist}
                                </p>
                            </div>
                            <p className="text-sm">
                                You can create a private version for personal
                                use, or view the existing public arrangement.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancelDuplicate}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (duplicateSong?.slug) {
                                    window.open(
                                        `/song/${duplicateSong.slug}`,
                                        "_blank",
                                    );
                                    handleCancelDuplicate();
                                }
                            }}
                            className="bg-primary"
                        >
                            View Existing
                        </AlertDialogAction>
                        <AlertDialogAction
                            onClick={handleContinueWithDuplicate}
                        >
                            Create as Private
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="w-full max-w-4xl mx-auto px-3 sm:px-4">
                <Card className="w-full shadow-sm">
                    <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                        <CardTitle className="text-lg sm:text-xl lg:text-2xl text-primary">
                            {/* Song Information */}
                            {t("arrEditor.subtitle")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-6 space-y-4 sm:space-y-5">
                        {/* YouTube Link - First for auto-fill */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="youtube"
                                className="text-sm font-medium"
                            >
                                {/* YouTube Link */}
                                {t("arrEditor.ytLink")}
                            </Label>
                            <Input
                                id="youtube"
                                value={songData.youtubeLink}
                                onChange={(e) =>
                                    handleYouTubeLinkChange(e.target.value)
                                }
                                placeholder="https://youtube.com/..."
                                className="w-full h-10 sm:h-11"
                                disabled={isLocked}
                            />
                            {songData.youtubeLink &&
                                extractYouTubeVideoId(songData.youtubeLink) && (
                                    <div className="mt-3">
                                        <img
                                            src={`https://img.youtube.com/vi/${extractYouTubeVideoId(
                                                songData.youtubeLink,
                                            )}/mqdefault.jpg`}
                                            alt="YouTube video thumbnail"
                                            className="w-32 h-24 object-cover rounded-lg border shadow-sm"
                                        />
                                    </div>
                                )}
                        </div>

                        {/* Song Title & Artist - Responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="title"
                                    className="text-sm font-medium"
                                >
                                    {/* Song Title{" "} */}
                                    {t("arrEditor.songTitle")}{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={songData.title}
                                    onChange={(e) =>
                                        setSongData({
                                            ...songData,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="Enter song title"
                                    className="w-full h-10 sm:h-11"
                                    required
                                    readOnly={isYouTubeDataLocked}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="artist"
                                    className="text-sm font-medium"
                                >
                                    {/* Artist / Arranger */}
                                    {t("arrEditor.artist")}
                                </Label>
                                <Input
                                    id="artist"
                                    value={songData.artist}
                                    onChange={(e) =>
                                        setSongData({
                                            ...songData,
                                            artist: e.target.value,
                                        })
                                    }
                                    placeholder="Enter artist name"
                                    className="w-full h-10 sm:h-11"
                                    readOnly={isYouTubeDataLocked}
                                />
                            </div>
                        </div>

                        {/* Musical Details - Three column responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="key"
                                    className="text-sm font-medium"
                                >
                                    {/* Key */}
                                    {t("arrEditor.key")}
                                </Label>
                                <Select
                                    value={songData.key}
                                    onValueChange={(value) =>
                                        setSongData({ ...songData, key: value })
                                    }
                                >
                                    <SelectTrigger className="w-full h-10 sm:h-11">
                                        <SelectValue placeholder="Select key" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border shadow-lg">
                                        {keys.map((key) => (
                                            <SelectItem key={key} value={key}>
                                                {key}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="tempo"
                                    className="text-sm font-medium"
                                >
                                    Tempo (BPM)
                                </Label>
                                <Input
                                    id="tempo"
                                    type="number"
                                    value={songData.tempo}
                                    onChange={(e) =>
                                        setSongData({
                                            ...songData,
                                            tempo: e.target.value,
                                        })
                                    }
                                    placeholder="120"
                                    className="w-full h-10 sm:h-11"
                                    min="60"
                                    max="200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="timeSignature"
                                    className="text-sm font-medium"
                                >
                                    Time Signature
                                </Label>
                                <Select
                                    value={songData.timeSignature}
                                    onValueChange={(value) =>
                                        setSongData({
                                            ...songData,
                                            timeSignature: value,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full h-10 sm:h-11">
                                        <SelectValue placeholder="Select time signature" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border shadow-lg">
                                        <SelectItem value="4/4">4/4</SelectItem>
                                        <SelectItem value="3/4">3/4</SelectItem>
                                        <SelectItem value="2/4">2/4</SelectItem>
                                        <SelectItem value="6/8">6/8</SelectItem>
                                        <SelectItem value="9/8">9/8</SelectItem>
                                        <SelectItem value="12/8">
                                            12/8
                                        </SelectItem>
                                        <SelectItem value="5/4">5/4</SelectItem>
                                        <SelectItem value="7/8">7/8</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Visibility Selector */}
                        <VisibilitySelector
                            value={songData.visibility as "public" | "private"}
                            onChange={handleVisibilityChange}
                            originalCreatorId={songData.originalCreatorId}
                            forcePrivate={hasPendingRequests}
                            contributionType={
                                songData.contributionType || "transcription"
                            }
                            onContributionTypeChange={(val) =>
                                setSongData({
                                    ...songData,
                                    contributionType: val,
                                })
                            }
                            theme="chord_lyric"
                            creatorType={creatorType}
                            isCurrentlyPublic={isCurrentlyPublicInDb}
                            // isCurrentlyPublic={songData.visibility === "public"}
                            forcePrivateLocked={isVisibilityLockedToPrivate}
                            forcePrivateLockedReason={duplicateLockReason}
                        />

                        {/* Tags */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="tags"
                                className="text-sm font-medium"
                            >
                                Tags
                            </Label>
                            <Input
                                id="tags"
                                value={songData.tags}
                                onChange={(e) =>
                                    setSongData({
                                        ...songData,
                                        tags: e.target.value,
                                    })
                                }
                                placeholder="worship, contemporary, uplifting"
                                className="w-full h-10 sm:h-11"
                            />
                        </div>

                        {/* Sequencer Section */}
                        {/* <div className="space-y-4 pt-4 border-t">
                        <div className="space-y-2">
                            <Label htmlFor="sequencer-title" className="text-sm font-medium text-primary">
                                Sequencer
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Add a Google Drive link to your sequencer file and set pricing
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-2">
                                <Label htmlFor="sequencer-drive-link" className="text-sm font-medium">
                                    Drive Link
                                </Label>
                                <Input
                                    id="sequencer-drive-link"
                                    value={songData.sequencerDriveLink}
                                    onChange={(e) =>
                                        setSongData({
                                            ...songData,
                                            sequencerDriveLink: e.target.value,
                                        })
                                    }
                                    placeholder="https://drive.google.com/..."
                                    className="w-full h-10 sm:h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sequencer-price" className="text-sm font-medium">
                                    Price (IDR)
                                </Label>
                                <Input
                                    id="sequencer-price"
                                    type="number"
                                    value={songData.sequencerPrice}
                                    onChange={(e) =>
                                        setSongData({
                                            ...songData,
                                            sequencerPrice: e.target.value,
                                        })
                                    }
                                    placeholder="0 (free)"
                                    className="w-full h-10 sm:h-11"
                                    min="0"
                                    step="1000"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter 0 for free (minimum: Rp 10,000)
                                </p>
                            </div>
                        </div>
                    </div> */}
                    </CardContent>
                </Card>
            </div>
        </>
    );
};
export default SongDetailsStep;
