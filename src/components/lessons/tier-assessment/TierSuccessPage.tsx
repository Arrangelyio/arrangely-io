import { motion } from "framer-motion";
import { Trophy, ArrowRight, Sparkles, Share2, Download, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareableAchievementCard } from "./ShareableAchievementCard";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface TierSuccessPageProps {
  tier: string;
  correctCount: number;
  totalQuestions: number;
  onNextTier: () => void;
  category?: string;
  instrument?: string;
}

const tierEmojis: Record<string, string> = {
  beginner: "🌱",
  intermediate: "🌿",
  advanced: "🌳",
  master: "⭐"
};

const tierMessages: Record<string, string> = {
  beginner: "Pemula - Kamu memulai dengan baik!",
  intermediate: "Menengah - Kamu semakin kuat!",
  advanced: "Mahir - Kemampuan yang mengesankan!",
  master: "Ahli - Kamu adalah master!"
};

export const TierSuccessPage = ({ 
  tier, 
  correctCount, 
  totalQuestions, 
  onNextTier,
  category = "music",
  instrument
}: TierSuccessPageProps) => {
  const [showShareCard, setShowShareCard] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: currentUser } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", currentUser!.id)
        .single();
      return data;
    },
  });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.download = `arrangely-achievement-${tier}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "Downloaded!",
            description: "Your achievement card has been saved",
          });
        }
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDirectShare = async () => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `arrangely-achievement-${tier}.png`, { type: "image/png" });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "My Arrangely Achievement",
                text: `🏆 I just unlocked ${tierMessages[tier]} level on Arrangely! Score: ${correctCount}/${totalQuestions} 🎵`,
              });
              
              toast({
                title: "Shared!",
                description: "Thanks for sharing your achievement",
              });
            } catch (shareError) {
              // User cancelled or share failed, fallback to text share
              handleTextShare();
            }
          } else {
            // Fallback to text share if file sharing not supported
            handleTextShare();
          }
        }
      });
    } catch (error) {
      handleTextShare();
    }
  };

  const handleTextShare = () => {
    const tierLabel = tierMessages[tier];
    const text = `🏆 Saya baru saja membuka level ${tierLabel} di Arrangely! Skor: ${correctCount}/${totalQuestions} 🎵 ${window.location.origin}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Pencapaian Arrangely",
        text: text,
      }).catch(() => {
        navigator.clipboard.writeText(text);
        toast({
          title: "Disalin ke clipboard!",
          description: "Bagikan pencapaianmu dengan teman"
        });
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Disalin ke clipboard!",
        description: "Bagikan pencapaianmu dengan teman"
      });
    }
  };

  const handleGetShareCard = () => {
    setShowShareCard(true);
  };

  if (showShareCard) {
    return (
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2 mb-6">
          <h2 className="text-3xl font-bold">Bagikan Pencapaianmu!</h2>
          <p className="text-muted-foreground">
            Screenshot kartu ini dan bagikan di media sosial
          </p>
        </div>

        <ShareableAchievementCard
          ref={cardRef}
          tier={tier}
          category={category}
          instrument={instrument}
          score={correctCount}
          totalQuestions={totalQuestions}
          userName={profile?.display_name || "Music Enthusiast"}
        />

        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={handleDownload} variant="outline" size="lg" className="gap-2">
            <Download className="w-5 h-5" />
            Download Image
          </Button>
          <Button onClick={handleDirectShare} size="lg" className="gap-2">
            <Share2 className="w-5 h-5" />
            Share Now
          </Button>
          <Button onClick={() => setShowShareCard(false)} variant="outline" size="lg">
            Kembali
          </Button>
          <Button onClick={onNextTier} size="lg" className="gap-2">
            Tier Selanjutnya
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <div className="text-8xl mb-4">{tierEmojis[tier]}</div>
      </motion.div>

      <div className="space-y-2">
        <h2 className="text-4xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-yellow-500" />
          {tierMessages[tier]}
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </h2>
        <p className="text-xl text-muted-foreground">
          Kamu menjawab {correctCount} dari {totalQuestions} dengan benar!
        </p>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-4">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
          <p className="text-sm text-muted-foreground">Benar</p>
        </div>
        <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalQuestions - correctCount}</p>
          <p className="text-sm text-muted-foreground">Salah</p>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-6 space-y-4">
        <Trophy className="w-12 h-12 text-primary mx-auto" />
        <p className="text-lg font-semibold">
          {tierMessages[tier]} Tier Terbuka!
        </p>
        <p className="text-sm text-muted-foreground">
          Kamu telah membuktikan kemampuanmu. Siap untuk tantangan berikutnya?
        </p>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={handleGetShareCard} variant="outline" size="lg" className="gap-2">
          <Share2 className="w-5 h-5" />
          Bagikan Pencapaian
        </Button>
        <Button onClick={onNextTier} size="lg" className="gap-2">
          Tantangan Tier Berikutnya
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};