import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
    Play,
    Pause,
    Volume2,
    Music,
    ChevronDown,
    ChevronUp,
    Headphones,
    ShoppingCart,
    ExternalLink,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppLauncher } from "@/hooks/useAppLauncher";
import { useLanguage } from "@/contexts/LanguageContext";

interface Track {
    index: number;
    name: string;
    color: string;
}

interface SequencerProductCardProps {
    id: string;
    songId: string;
    title: string;
    artist: string;
    tempo: number;
    timeSignature: string;
    tracks: Track[];
    price?: number;
    originalPrice?: number;
    currency?: string;
    thumbnailUrl?: string;
    creatorName?: string;
    creatorAvatar?: string;
    audioPreviewUrl?: string;
    isOwned?: boolean;
}

export const SequencerProductCard = ({
    id,
    songId,
    title,
    artist,
    tempo,
    timeSignature,
    tracks,
    price,
    originalPrice,
    currency = "IDR",
    thumbnailUrl,
    creatorName,
    creatorAvatar,
    audioPreviewUrl,
    isOwned: isOwnedProp,
}: SequencerProductCardProps) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { openArrangelyApp } = useAppLauncher();
    const [isTracksOpen, setIsTracksOpen] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isOwnedLocal, setIsOwnedLocal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const maxDuration = 20; // 20 seconds limit

    // Use prop if provided, otherwise use local state
    const isOwned = isOwnedProp !== undefined ? isOwnedProp : isOwnedLocal;

    useEffect(() => {
        // Only check enrollment if isOwned prop is not provided
        if (isOwnedProp === undefined) {
            checkEnrollment();
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [id, isOwnedProp]);

    const checkEnrollment = async () => {
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const { data: enrollment } = await supabase
                .from("sequencer_enrollments")
                .select("id")
                .eq("user_id", user.id)
                .eq("sequencer_file_id", id)
                .eq("is_production", true)
                .maybeSingle();

            setIsOwnedLocal(!!enrollment);
        } catch (error) {
            console.error("Error checking enrollment:", error);
        }
    };

    const handlePurchase = async (e: React.MouseEvent) => {
        e.stopPropagation();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please log in to purchase this sequencer file.",
                variant: "destructive",
            });
            return;
        }

        if (!price) {
            toast({
                title: "Error",
                description: "Pricing information not available.",
                variant: "destructive",
            });
            return;
        }

        setProcessingPayment(true);
        try {
            const { data, error } = await supabase.functions.invoke(
                "create-midtrans-payment",
                {
                    body: {
                        amount: price,
                        description: `Sequencer File - ${title}`,
                        item_details: [
                            {
                                id: `seqfile_${id.substring(0, 8)}`,
                                price: price,
                                quantity: 1,
                                name:
                                    title.length > 50
                                        ? title.substring(0, 47) + "..."
                                        : title,
                            },
                        ],
                        isOneTimePayment: true,
                        sequencerId: id,
                    },
                },
            );

            if (error) throw error;

            if (data?.snapToken) {
                // @ts-ignore - Midtrans Snap is loaded via script tag
                window.snap.pay(data.snapToken, {
                    onSuccess: () => {
                        toast({
                            title: "Payment Successful",
                            description:
                                "You now have access to this sequencer file in the Electron app.",
                        });
                        setIsOwnedLocal(true);
                        setProcessingPayment(false);
                    },
                    onPending: () => {
                        toast({
                            title: "Payment Pending",
                            description: "Your payment is being processed.",
                        });
                    },
                    onError: () => {
                        toast({
                            title: "Payment Failed",
                            description:
                                "There was an error processing your payment.",
                            variant: "destructive",
                        });
                        setProcessingPayment(false);
                    },
                    onClose: () => {
                        setProcessingPayment(false);
                    },
                });
            }
        } catch (error) {
            console.error("Payment error:", error);
            toast({
                title: "Error",
                description: "Failed to initiate payment.",
                variant: "destructive",
            });
            setProcessingPayment(false);
        }
    };

    const formatPrice = (amount: number) => {
        if (currency === "IDR") {
            return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
        }
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
        }).format(amount);
    };

    const handleCardClick = () => {
        navigate(`/arrangement/${songId}`);
    };

    const handlePlaySample = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!audioPreviewUrl) {
            // Demo: simulate audio playing
            if (isPlaying) {
                setIsPlaying(false);
                setProgress(0);
            } else {
                setIsPlaying(true);
                // Simulate progress for demo
                const interval = setInterval(() => {
                    setProgress((prev) => {
                        if (prev >= 100) {
                            clearInterval(interval);
                            setIsPlaying(false);
                            return 0;
                        }
                        return prev + 100 / maxDuration;
                    });
                }, 1000);
            }
            return;
        }

        if (audioRef.current && isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if (!audioRef.current) {
                audioRef.current = new Audio(audioPreviewUrl);
                audioRef.current.addEventListener("timeupdate", () => {
                    if (audioRef.current) {
                        const currentProgress =
                            (audioRef.current.currentTime / maxDuration) * 100;
                        setProgress(Math.min(currentProgress, 100));

                        // Stop at 20 seconds
                        if (audioRef.current.currentTime >= maxDuration) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            setIsPlaying(false);
                            setProgress(0);
                        }
                    }
                });
                audioRef.current.addEventListener("ended", () => {
                    setIsPlaying(false);
                    setProgress(0);
                });
            }
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const getTrackColor = (color: string) => {
        const colorMap: Record<string, string> = {
            red: "bg-red-500",
            blue: "bg-blue-500",
            green: "bg-green-500",
            yellow: "bg-yellow-500",
            purple: "bg-purple-500",
            pink: "bg-pink-500",
            orange: "bg-orange-500",
            cyan: "bg-cyan-500",
            teal: "bg-teal-500",
            indigo: "bg-indigo-500",
        };
        return colorMap[color?.toLowerCase()] || "bg-gray-500";
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="group overflow-hidden border-purple-200/50 dark:border-purple-800/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div
                        className="relative h-40 sm:h-48 overflow-hidden cursor-pointer bg-gradient-to-br from-purple-500/20 to-pink-500/20"
                        onClick={handleCardClick}
                    >
                        {thumbnailUrl ? (
                            <img
                                src={thumbnailUrl}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <Music className="h-16 w-16 text-purple-400" />
                            </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Track count badge */}
                        <div className="absolute top-3 left-3">
                            <Badge className="bg-black/60 backdrop-blur-sm text-white border-0">
                                <Volume2 className="w-3 h-3 mr-1" />
                                {tracks.length} Tracks
                            </Badge>
                        </div>

                        {/* Price / Owned badge */}
                        <div className="absolute top-3 right-3">
                            {isOwned ? (
                                <Badge className="bg-green-500 text-white border-0">
                                    Owned
                                </Badge>
                            ) : price ? (
                                <div className="flex flex-col items-end gap-1">
                                    {originalPrice && originalPrice > price && (
                                        <Badge className="bg-black/40 backdrop-blur-sm text-white/70 border-0 text-xs line-through">
                                            {formatPrice(originalPrice)}
                                        </Badge>
                                    )}
                                    <Badge className="bg-gradient-worship text-white border-0 font-bold text-sm">
                                        {formatPrice(price)}
                                    </Badge>
                                </div>
                            ) : (
                                <Badge className="bg-green-500 text-white border-0">
                                    Free
                                </Badge>
                            )}
                        </div>

                        {/* Play button overlay */}
                        <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={handlePlaySample}
                        >
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                {isPlaying ? (
                                    <Pause className="w-8 h-8 text-white fill-white" />
                                ) : (
                                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                                )}
                            </div>
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="text-white font-bold text-lg line-clamp-1 drop-shadow-lg mb-1">
                                {title}
                            </h3>
                            <p className="text-white/80 text-sm line-clamp-1">
                                {artist}
                            </p>
                        </div>
                    </div>

                    {/* Audio Progress */}
                    {isPlaying && (
                        <div className="px-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Progress
                                    value={progress}
                                    className="h-1 flex-1"
                                />
                                <span className="text-xs text-muted-foreground">
                                    {Math.round((progress / 100) * maxDuration)}
                                    s / {maxDuration}s
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Meta */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="font-medium">{tempo} BPM</span>
                                <span>{timeSignature}</span>
                            </div>
                            {creatorName && (
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={creatorAvatar} />
                                        <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                                            {creatorName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                                        {creatorName}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Track Preview */}
                        <Collapsible
                            open={isTracksOpen}
                            onOpenChange={setIsTracksOpen}
                        >
                            <CollapsibleTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                >
                                    <span className="flex items-center gap-2 text-sm">
                                        <Headphones className="w-4 h-4" />
                                        Preview Tracks
                                    </span>
                                    {isTracksOpen ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    {tracks.slice(0, 8).map((track, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                                        >
                                            <div
                                                className={`w-3 h-3 rounded-full ${getTrackColor(
                                                    track.color,
                                                )}`}
                                            />
                                            <span className="text-xs truncate">
                                                {track.name}
                                            </span>
                                        </div>
                                    ))}
                                    {tracks.length > 8 && (
                                        <div className="flex items-center justify-center p-2 rounded-lg bg-muted/50 col-span-2">
                                            <span className="text-xs text-muted-foreground">
                                                +{tracks.length - 8} more tracks
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-indigo-100 text-indigo-700 hover:bg-indigo-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Direct link ke arrangement detail
                                    navigate(
                                        "/arrangement/e2a33787-f884-4177-b48a-a3b74b8619b8",
                                    );
                                }}
                            >
                                <Music className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                            {isOwned ? (
                                <Button
                                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openArrangelyApp(songId);
                                    }}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open App
                                </Button>
                            ) : (
                                <Button
                                    className="flex-1 bg-gradient-worship hover:from-purple-600 hover:to-pink-600 text-white"
                                    onClick={handlePurchase}
                                    disabled={processingPayment}
                                >
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    {processingPayment
                                        ? "Processing..."
                                        : price
                                        ? t("SequencerStore.purchase")
                                        : "Get Free"}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default SequencerProductCard;
