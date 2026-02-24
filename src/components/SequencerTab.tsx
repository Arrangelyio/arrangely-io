import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Music, 
  Lock, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Play,
  Pause,
  Volume2,
  ShoppingCart,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppLauncher } from "@/hooks/useAppLauncher";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

interface SequencerTabProps {
  song: {
    id: string;
    title: string;
    artist: string | null;
    original_creator_id?: string;
    user_id?: string;
    youtube_thumbnail?: string | null;
  };
}

const MAX_DURATION = 20; // 20 seconds audio preview limit

const SequencerTab = ({ song }: SequencerTabProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { openArrangelyApp } = useAppLauncher();
  const { subscriptionStatus } = useSubscription();
  const [sequencerFiles, setSequencerFiles] = useState<SequencerFile[]>([]);
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
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

      // Check if song is in user's library
      if (user) {
        const { data: libraryCheck } = await supabase
          .from('user_library_actions')
          .select('id')
          .eq('user_id', user.id)
          .eq('song_id', song.id)
          .eq('action_type', 'add_to_library')
          .maybeSingle();
        
        setIsInLibrary(!!libraryCheck);
      }

      // Use original_creator_id to fetch sequencer files if available, otherwise use song.id
      const songIdToQuery = song.original_creator_id || song.id;

      // Fetch sequencer files for this song with pricing and tracks
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

      // Transform data to match interface
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

      // If user is logged in, check their enrollments
      if (user) {
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
      toast({
        title: "Error",
        description: "Failed to load sequencer files",
        variant: "destructive",
      });
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
        // @ts-ignore - Midtrans Snap is loaded via script tag
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
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading sequencer files...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sequencerFiles.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <img src={arrangelyLogoGram} alt="Arrangely" className="h-12 w-auto opacity-50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Sequencer Files Available</h3>
            <p className="text-muted-foreground">
              There are no sequencer files available for this arrangement yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src={arrangelyLogoGram} alt="Arrangely" className="h-5 w-auto" />
            Available Sequencer Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sequencerFiles.map((file) => {
              const hasAccess = enrollments.has(file.id);
              const isPurchasing = processingPayment === file.id;
              const isExpanded = expandedFiles.has(file.id);
              const isPlaying = playingId === file.id;
              const currentProgress = progress[file.id] || 0;
              const tracks = Array.isArray(file.tracks) ? file.tracks : [];
              const originalPrice = file.pricing ? Math.round(file.pricing.price * 1.4) : 0;

              const toggleExpand = () => {
                setExpandedFiles(prev => {
                  const next = new Set(prev);
                  if (next.has(file.id)) {
                    next.delete(file.id);
                  } else {
                    next.add(file.id);
                  }
                  return next;
                });
              };

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="group overflow-hidden border-purple-200/50 dark:border-purple-800/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300">
                    <CardContent className="p-0">
                      {/* Thumbnail */}
                      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        {file.youtube_thumbnail ? (
                          <img
                            src={file.youtube_thumbnail}
                            alt={file.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Music className="h-12 w-12 text-purple-400" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Track count badge */}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-xs">
                            <Volume2 className="w-3 h-3 mr-1" />
                            {tracks.length} Tracks
                          </Badge>
                        </div>

                        {/* Price / Owned badge */}
                        <div className="absolute top-2 right-2">
                          {hasAccess ? (
                            <Badge className="bg-green-500 text-white border-0 text-xs gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Purchased
                            </Badge>
                          ) : file.pricing ? (
                            <div className="flex flex-col items-end gap-1">
                              <Badge className="bg-black/40 backdrop-blur-sm text-white/70 border-0 text-xs line-through">
                                {formatPrice(originalPrice)}
                              </Badge>
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 font-bold text-xs">
                                {formatPrice(file.pricing.price)}
                              </Badge>
                            </div>
                          ) : (
                            <Badge className="bg-green-500 text-white border-0">
                              Free
                            </Badge>
                          )}
                        </div>

                        {/* Play button overlay */}
                        {!hasAccess && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                            onClick={(e) => handlePlaySample(file.id, e)}
                          >
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                              {isPlaying ? (
                                <Pause className="w-6 h-6 text-white fill-white" />
                              ) : (
                                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bottom info */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <h3 className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">
                            {file.title}
                          </h3>
                          <p className="text-white/80 text-xs line-clamp-1">{song.artist}</p>
                        </div>
                      </div>

                      {/* Audio Progress */}
                      {isPlaying && (
                        <div className="px-3 pt-2">
                          <div className="flex items-center gap-2">
                            <Progress value={currentProgress} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round((currentProgress / 100) * MAX_DURATION)}s
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-3 space-y-3">
                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">{file.tempo} BPM</span>
                          <span>{file.time_signature}</span>
                        </div>

                        {/* Track Preview */}
                        {tracks.length > 0 && (
                          <Collapsible open={isExpanded} onOpenChange={toggleExpand}>
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 h-8 px-2"
                              >
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Volume2 className="w-3 h-3" />
                                  Preview Tracks
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {tracks.slice(0, 6).map((track: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50"
                                  >
                                    <div className={`w-2 h-2 rounded-full ${getTrackColor(track.color)}`} />
                                    <span className="text-xs truncate">{track.name}</span>
                                  </div>
                                ))}
                                {tracks.length > 6 && (
                                  <div className="flex items-center justify-center p-1.5 rounded bg-muted/50 col-span-2">
                                    <span className="text-xs text-muted-foreground">
                                      +{tracks.length - 6} more tracks
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          {!hasAccess && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
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
                              Open App
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs"
                              onClick={(e) => handlePurchase(file, e)}
                              disabled={isPurchasing}
                            >
                              {isPurchasing ? (
                                "Processing..."
                              ) : (
                                <>
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  Purchase
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Secure Access</h4>
              <p className="text-sm text-muted-foreground">
                After purchasing a sequencer file, it will be available in your Electron app library. 
                Individual tracks and sequencer data are protected and can only be accessed through the app.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SequencerTab;
