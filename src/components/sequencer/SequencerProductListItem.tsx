import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Play, 
  Pause,
  Volume2, 
  Music, 
  ShoppingCart,
  ExternalLink,
  Headphones,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppLauncher } from "@/hooks/useAppLauncher";

interface Track {
  index: number;
  name: string;
  color: string;
}

interface SequencerProductListItemProps {
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

export const SequencerProductListItem = ({
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
}: SequencerProductListItemProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openArrangelyApp } = useAppLauncher();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOwnedLocal, setIsOwnedLocal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [isTracksOpen, setIsTracksOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const maxDuration = 20;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: enrollment } = await supabase
        .from('sequencer_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('sequencer_file_id', id)
        .eq('is_production', true)
        .maybeSingle();

      setIsOwnedLocal(!!enrollment);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handlePurchase = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();

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
      const { data, error } = await supabase.functions.invoke('create-midtrans-payment', {
        body: {
          amount: price,
          description: `Sequencer File - ${title}`,
          item_details: [{
            id: `seqfile_${id.substring(0, 8)}`,
            price: price,
            quantity: 1,
            name: title.length > 50 ? title.substring(0, 47) + "..." : title
          }],
          isOneTimePayment: true,
          sequencerId: id
        }
      });

      if (error) throw error;

      if (data?.snapToken) {
        // @ts-ignore
        window.snap.pay(data.snapToken, {
          onSuccess: () => {
            toast({
              title: "Payment Successful",
              description: "You now have access to this sequencer file in the Electron app.",
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
              description: "There was an error processing your payment.",
              variant: "destructive",
            });
            setProcessingPayment(false);
          },
          onClose: () => {
            setProcessingPayment(false);
          }
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
      if (isPlaying) {
        setIsPlaying(false);
        setProgress(0);
      } else {
        setIsPlaying(true);
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              setIsPlaying(false);
              return 0;
            }
            return prev + (100 / maxDuration);
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
        audioRef.current.addEventListener('timeupdate', () => {
          if (audioRef.current) {
            const currentProgress = (audioRef.current.currentTime / maxDuration) * 100;
            setProgress(Math.min(currentProgress, 100));
            
            if (audioRef.current.currentTime >= maxDuration) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              setIsPlaying(false);
              setProgress(0);
            }
          }
        });
        audioRef.current.addEventListener('ended', () => {
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="group bg-card border border-border rounded-xl p-4 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        <div className="relative w-full sm:w-32 h-24 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Music className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
              onClick={handlePlaySample}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-4">
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              {isOwned && (
                <Badge className="bg-green-500 text-white border-0 text-xs flex-shrink-0">
                  Owned
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mb-2">{artist}</p>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-normal">
                <Volume2 className="w-3 h-3 mr-1" />
                {tracks.length} Tracks
              </Badge>
              <span>{tempo} BPM</span>
              <span>{timeSignature}</span>
              
              {creatorName && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={creatorAvatar} />
                    <AvatarFallback className="text-[8px] bg-muted">
                      {creatorName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[80px]">{creatorName}</span>
                </div>
              )}
            </div>

            {/* Preview Tracks Collapsible */}
            <Collapsible open={isTracksOpen} onOpenChange={setIsTracksOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-between hover:bg-primary/5 h-7 px-2 mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <Headphones className="w-3 h-3" />
                    Preview Tracks
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {tracks.slice(0, 6).map((track, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${getTrackColor(track.color)}`}
                        />
                      ))}
                      {tracks.length > 6 && (
                        <span className="text-[10px] text-muted-foreground ml-0.5">+{tracks.length - 6}</span>
                      )}
                    </div>
                    {isTracksOpen ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {tracks.slice(0, 8).map((track, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 p-1.5 rounded-md bg-muted/50"
                    >
                      <div className={`w-2.5 h-2.5 rounded-full ${getTrackColor(track.color)}`} />
                      <span className="text-xs truncate">{track.name}</span>
                    </div>
                  ))}
                </div>
                {tracks.length > 8 && (
                  <div className="text-center mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      +{tracks.length - 8} more tracks
                    </span>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Progress bar */}
            {isPlaying && (
              <div className="flex items-center gap-2 mt-2">
                <Progress value={progress} className="h-1 flex-1 max-w-32" />
                <span className="text-[10px] text-muted-foreground">
                  {Math.round((progress / 100) * maxDuration)}s
                </span>
              </div>
            )}
          </div>

          {/* Price & Actions */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
            {!isOwned && price ? (
              <div className="text-right">
                {originalPrice && originalPrice > price && (
                  <span className="text-xs text-muted-foreground line-through block">
                    {formatPrice(originalPrice)}
                  </span>
                )}
                <span className="font-bold text-primary">{formatPrice(price)}</span>
              </div>
            ) : !isOwned ? (
              <Badge className="bg-green-500 text-white border-0">Free</Badge>
            ) : null}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlaySample}
                className="h-8"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              {isOwned ? (
                <Button
                  size="sm"
                  className="h-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    openArrangelyApp(songId);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-8 bg-gradient-worship hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={handlePurchase}
                  disabled={processingPayment}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  {processingPayment ? "..." : price ? "Buy" : "Get"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
