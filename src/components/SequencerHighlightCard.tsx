import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Music,
  CheckCircle,
  Play,
  Pause,
  Volume2,
  ShoppingCart,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppLauncher } from "@/hooks/useAppLauncher";
import { supabase } from "@/integrations/supabase/client";
import arrangelyLogoGram from "@/assets/arrangely-logo-gram.png";

interface SequencerFile {
  id: string;
  title: string;
  tempo: number;
  time_signature: string;
  tracks: any[];
  youtube_thumbnail: string | null;
  pricing?: {
    price: number;
    currency: string;
  } | null;
}

interface SequencerHighlightCardProps {
  song: {
    id: string;
    title: string;
    artist: string | null;
    original_creator_id?: string;
    user_id?: string;
    youtube_thumbnail?: string | null;
  };
}

const MAX_DURATION = 20;

const SequencerHighlightCard = ({ song }: SequencerHighlightCardProps) => {
  const { toast } = useToast();
  const { openArrangelyApp } = useAppLauncher();
  const [sequencerFiles, setSequencerFiles] = useState<SequencerFile[]>([]);
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    loadSequencerFiles();
    return () => {
      intervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, [song.id]);

  const loadSequencerFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const songIdToQuery = song.original_creator_id || song.id;

      const { data: files, error: filesError } = await supabase
        .from('sequencer_files')
        .select(`
          id,
          title,
          tempo,
          time_signature,
          tracks,
          sequencer_file_pricing (
            price,
            currency,
            is_active
          )
        `)
        .eq('song_id', songIdToQuery)
        .eq('is_production', true);

      if (filesError) throw filesError;

      const transformedFiles = files?.map(file => {
        const activePricing = Array.isArray(file.sequencer_file_pricing)
          ? file.sequencer_file_pricing.find(p => p.is_active)
          : file.sequencer_file_pricing?.is_active
            ? file.sequencer_file_pricing
            : null;

        return {
          id: file.id,
          title: file.title,
          tempo: file.tempo,
          time_signature: file.time_signature,
          tracks: file.tracks || [],
          youtube_thumbnail: song.youtube_thumbnail || null,
          pricing: activePricing ? {
            price: activePricing.price,
            currency: activePricing.currency
          } : null
        };
      }) || [];

      setSequencerFiles(transformedFiles);

      if (user && transformedFiles.length > 0) {
        const { data: userEnrollments, error: enrollmentsError } = await supabase
          .from('sequencer_enrollments')
          .select('sequencer_file_id')
          .eq('user_id', user.id)
          .eq('is_production', true)
          .in('sequencer_file_id', transformedFiles.map(f => f.id));

        if (!enrollmentsError && userEnrollments) {
          setEnrollments(new Set(userEnrollments.map(e => e.sequencer_file_id)));
        }
      }
    } catch (error) {
      console.error("Error loading sequencer files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySample = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingId === id) {
      const interval = intervalsRef.current.get(id);
      if (interval) {
        clearInterval(interval);
        intervalsRef.current.delete(id);
      }
      setPlayingId(null);
      setProgress((prev) => ({ ...prev, [id]: 0 }));
    } else {
      if (playingId) {
        const prevInterval = intervalsRef.current.get(playingId);
        if (prevInterval) {
          clearInterval(prevInterval);
          intervalsRef.current.delete(playingId);
        }
        setProgress((prev) => ({ ...prev, [playingId]: 0 }));
      }

      setPlayingId(id);
      const interval = setInterval(() => {
        setProgress((prev) => {
          const currentProgress = (prev[id] || 0) + (100 / MAX_DURATION);
          if (currentProgress >= 100) {
            clearInterval(interval);
            intervalsRef.current.delete(id);
            setPlayingId(null);
            return { ...prev, [id]: 0 };
          }
          return { ...prev, [id]: currentProgress };
        });
      }, 1000);
      intervalsRef.current.set(id, interval);
    }
  };

  const handlePurchase = async (sequencerFile: SequencerFile, e: React.MouseEvent) => {
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

    if (!sequencerFile.pricing) {
      toast({
        title: "Error",
        description: "Pricing information not available.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(sequencerFile.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-midtrans-payment', {
        body: {
          amount: sequencerFile.pricing.price,
          description: `Sequencer File - ${sequencerFile.title}`,
          item_details: [{
            id: `seqfile_${sequencerFile.id.substring(0, 8)}`,
            price: sequencerFile.pricing.price,
            quantity: 1,
            name: sequencerFile.title.length > 50
              ? sequencerFile.title.substring(0, 47) + "..."
              : sequencerFile.title
          }],
          isOneTimePayment: true,
          sequencerId: sequencerFile.id
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
            loadSequencerFiles();
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
          },
          onClose: () => {
            setProcessingPayment(null);
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
      setProcessingPayment(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
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

  if (loading) {
    return null;
  }

  if (sequencerFiles.length === 0) {
    return null;
  }

  // Show only the first sequencer file as a highlight
  const file = sequencerFiles[0];
  const hasAccess = enrollments.has(file.id);
  const isPurchasing = processingPayment === file.id;
  const isPlaying = playingId === file.id;
  const currentProgress = progress[file.id] || 0;
  const tracks = Array.isArray(file.tracks) ? file.tracks : [];
  const originalPrice = file.pricing ? Math.round(file.pricing.price * 1.4) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="overflow-hidden border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-lg">
        <CardContent className="p-0">
          {/* Header with glow effect */}
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                <span className="text-white font-semibold text-sm">Premium Sequencer Available</span>
              </div>
              <img src={arrangelyLogoGram} alt="Arrangely" className="h-5 w-auto opacity-90" />
            </div>
          </div>

          {/* Main content */}
          <div className="p-4">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                {file.youtube_thumbnail ? (
                  <img
                    src={file.youtube_thumbnail}
                    alt={file.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Music className="h-8 w-8 text-purple-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Track count badge */}
                <div className="absolute bottom-1 left-1">
                  <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-[10px] px-1.5 py-0.5">
                    <Volume2 className="w-2.5 h-2.5 mr-0.5" />
                    {tracks.length}
                  </Badge>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <h4 className="font-bold text-foreground line-clamp-1">{file.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{song.artist}</p>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {file.tempo} BPM
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {file.time_signature}
                  </Badge>
                  {hasAccess && (
                    <Badge className="bg-green-500 text-white border-0 text-xs gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Owned
                    </Badge>
                  )}
                </div>

                {/* Tracks preview */}
                {tracks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tracks.slice(0, 4).map((track: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/80 text-xs"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${getTrackColor(track.color)}`} />
                        <span className="truncate max-w-[60px]">{track.name}</span>
                      </div>
                    ))}
                    {tracks.length > 4 && (
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5">
                        +{tracks.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Audio Progress */}
            {isPlaying && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <Progress value={currentProgress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round((currentProgress / 100) * MAX_DURATION)}s
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              {!hasAccess && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => handlePlaySample(file.id, e)}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3 h-3 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-1" />
                      Sample
                    </>
                  )}
                </Button>
              )}
              {hasAccess ? (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openArrangelyApp(song.id);
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Open in App
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs gap-1"
                  onClick={(e) => handlePurchase(file, e)}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    "Processing..."
                  ) : (
                    <>
                      <ShoppingCart className="w-3 h-3" />
                      {file.pricing ? (
                        <span className="flex items-center gap-1.5">
                          <span className="line-through opacity-70 text-[10px]">{formatPrice(originalPrice)}</span>
                          <span>{formatPrice(file.pricing.price)}</span>
                        </span>
                      ) : (
                        "Get Free"
                      )}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Additional sequencer files indicator */}
            {sequencerFiles.length > 1 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  +{sequencerFiles.length - 1} more sequencer file{sequencerFiles.length > 2 ? 's' : ''} available
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SequencerHighlightCard;
