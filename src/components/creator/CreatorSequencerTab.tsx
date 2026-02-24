import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAppLauncher } from "@/hooks/useAppLauncher";
import { 
  Play, 
  Pause,
  Volume2, 
  Music, 
  ShoppingCart,
  ExternalLink,
  CheckCircle
} from "lucide-react";
import arrangelyLogoGram from "@/assets/arrangely-logo-gram.png";

interface SequencerFile {
  id: string;
  song_id: string;
  title: string;
  artist: string;
  tempo: number;
  time_signature: string;
  tracks: any[];
  price: number;
  youtube_thumbnail: string | null;
  preview_audio_r2_key: string | null;
}

interface CreatorSequencerTabProps {
  creatorId: string;
  creatorName: string;
}

const MAX_DURATION = 20; // 20 seconds audio preview limit
const R2_PUBLIC_DOMAIN = "https://pub-1a13947b34c14a78875a3cddf8bb02d6.r2.dev";

export const CreatorSequencerTab = ({ creatorId, creatorName }: CreatorSequencerTabProps) => {
  const navigate = useNavigate();
  const { openArrangelyApp } = useAppLauncher();
  const [sequencerFiles, setSequencerFiles] = useState<SequencerFile[]>([]);
  const [enrollments, setEnrollments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    fetchSequencerFiles();
    return () => {
      // Cleanup audio on unmount
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      audioRefs.current.clear();
      intervalsRef.current.forEach((interval) => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();
    };
  }, [creatorId]);

  const fetchSequencerFiles = async () => {
    try {
      setLoading(true);
      
      // Fetch sequencer files directly for this creator with pricing
      const { data, error } = await supabase
        .from("sequencer_files")
        .select(`
          id,
          song_id,
          tracks,
          preview_audio_r2_key,
          sequencer_file_pricing (
            price
          ),
          songs!inner (
            id,
            title,
            artist,
            tempo,
            time_signature,
            youtube_thumbnail,
            user_id,
            is_public,
            is_production
          )
        `)
        .eq("songs.user_id", creatorId)
        .eq("songs.is_public", true)
        .eq("songs.is_production", true);

      if (error) throw error;

      const files = (data || []).map((item: any) => {
        const pricing = item.sequencer_file_pricing?.[0];
        return {
          id: item.id,
          song_id: item.song_id,
          title: item.songs?.title || "Untitled",
          artist: item.songs?.artist || "Unknown Artist",
          tempo: item.songs?.tempo || 120,
          time_signature: item.songs?.time_signature || "4/4",
          tracks: item.tracks || [],
          price: pricing?.price || 0,
          youtube_thumbnail: item.songs?.youtube_thumbnail,
          preview_audio_r2_key: item.preview_audio_r2_key,
        };
      });

      setSequencerFiles(files);

      // Check user enrollments
      const { data: { user } } = await supabase.auth.getUser();
      if (user && files.length > 0) {
        const { data: userEnrollments } = await supabase
          .from('sequencer_enrollments')
          .select('sequencer_file_id')
          .eq('user_id', user.id)
          .eq('is_production', true)
          .in('sequencer_file_id', files.map(f => f.id));

        if (userEnrollments) {
          setEnrollments(new Set(userEnrollments.map(e => e.sequencer_file_id)));
        }
      }
    } catch (error) {
      console.error("Error fetching sequencer files:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePlaySample = (file: SequencerFile, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = file.id;
    const previewUrl = file.preview_audio_r2_key 
      ? `${R2_PUBLIC_DOMAIN}/${file.preview_audio_r2_key}` 
      : null;

    if (playingId === id) {
      // Stop playing
      const audio = audioRefs.current.get(id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      const interval = intervalsRef.current.get(id);
      if (interval) {
        clearInterval(interval);
        intervalsRef.current.delete(id);
      }
      setPlayingId(null);
      setProgress((prev) => ({ ...prev, [id]: 0 }));
    } else {
      // Stop any currently playing
      if (playingId) {
        const prevAudio = audioRefs.current.get(playingId);
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
        const prevInterval = intervalsRef.current.get(playingId);
        if (prevInterval) {
          clearInterval(prevInterval);
          intervalsRef.current.delete(playingId);
        }
        setProgress((prev) => ({ ...prev, [playingId]: 0 }));
      }

      setPlayingId(id);

      if (previewUrl) {
        // Use actual audio playback
        let audio = audioRefs.current.get(id);
        if (!audio) {
          audio = new Audio(previewUrl);
          audioRefs.current.set(id, audio);
          
          audio.addEventListener('timeupdate', () => {
            if (audio) {
              const currentProgress = (audio.currentTime / MAX_DURATION) * 100;
              setProgress((prev) => ({ ...prev, [id]: Math.min(currentProgress, 100) }));
              
              // Stop at max duration
              if (audio.currentTime >= MAX_DURATION) {
                audio.pause();
                audio.currentTime = 0;
                setPlayingId(null);
                setProgress((prev) => ({ ...prev, [id]: 0 }));
              }
            }
          });
          
          audio.addEventListener('ended', () => {
            setPlayingId(null);
            setProgress((prev) => ({ ...prev, [id]: 0 }));
          });
        }
        
        audio.play().catch(console.error);
      } else {
        // Fallback: simulate progress for demo
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
    }
  };

  const handleCardClick = (songId: string) => {
    navigate(`/arrangement/${songId}`);
  };

  const handlePurchase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/sequencer-store?purchase=${id}`);
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
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sequencerFiles.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <img src={arrangelyLogoGram} alt="Arrangely" className="h-12 w-auto mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No Sequencer Files Yet</h3>
          <p className="text-muted-foreground">
            {creatorName} hasn't published any sequencer or premium audio stems yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img src={arrangelyLogoGram} alt="Arrangely" className="h-5 w-auto" />
          Sequencer & Premium Audio Stems
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Professional multi-track audio files ready for your performance
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequencerFiles.map((file) => {
            const isPlaying = playingId === file.id;
            const currentProgress = progress[file.id] || 0;
            const originalPrice = Math.round(file.price * 1.4);
            const tracks = Array.isArray(file.tracks) ? file.tracks : [];
            const hasAccess = enrollments.has(file.id);

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <Card 
                  className="group overflow-hidden border-purple-200/50 dark:border-purple-800/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                  onClick={() => handleCardClick(file.song_id)}
                >
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
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {file.price > 0 && (
                              <Badge className="bg-black/40 backdrop-blur-sm text-white/70 border-0 text-xs line-through">
                                {formatPrice(originalPrice)}
                              </Badge>
                            )}
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 font-bold text-xs">
                              {file.price > 0 ? formatPrice(file.price) : "Free"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Play button overlay */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        onClick={(e) => handlePlaySample(file, e)}
                      >
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                          {isPlaying ? (
                            <Pause className="w-6 h-6 text-white fill-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <h3 className="text-white font-bold text-sm line-clamp-1 drop-shadow-lg">
                          {file.title}
                        </h3>
                        <p className="text-white/80 text-xs line-clamp-1">{file.artist}</p>
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

                      {/* Track preview mini */}
                      {tracks.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tracks.slice(0, 4).map((track: any, index: number) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${getTrackColor(track.color)}`}
                              title={track.name}
                            />
                          ))}
                          {tracks.length > 4 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{tracks.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {!hasAccess && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={(e) => handlePlaySample(file, e)}
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
                              openArrangelyApp(file.song_id);
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open App
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs"
                            onClick={(e) => handlePurchase(file.id, e)}
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            {file.price > 0 ? "Buy" : "Get"}
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
  );
};

export default CreatorSequencerTab;
