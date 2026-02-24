import { motion } from "framer-motion";
import { Trophy, Share2, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ShareableAchievementCard } from "./ShareableAchievementCard";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface FinalSuccessPageProps {
  category: string;
  instrument: string;
  onClose: () => void;
}

export const FinalSuccessPage = ({ 
  category, 
  instrument, 
  onClose 
}: FinalSuccessPageProps) => {
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
          link.download = `arrangely-master-achievement.png`;
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
          const file = new File([blob], `arrangely-master-achievement.png`, { type: "image/png" });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: "My Arrangely Master Achievement",
                text: `🏆 I just became a Master in ${instrument || category} on Arrangely! 🎵`,
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
    const text = `🏆 I just became a Master in ${instrument || category} on Arrangely! 🎵 ${window.location.origin}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Arrangely Achievement",
        text: text,
      }).catch(() => {
        navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard!",
          description: "Share your achievement with friends"
        });
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard!",
        description: "Share your achievement with friends"
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
          <h2 className="text-4xl font-bold">Share Your Master Achievement!</h2>
          <p className="text-muted-foreground text-lg">
            Screenshot this card and share it on Instagram, Facebook, or TikTok
          </p>
        </div>

        <ShareableAchievementCard
          ref={cardRef}
          tier="master"
          category={category}
          instrument={instrument}
          score={5}
          totalQuestions={5}
          userName={profile?.display_name || "Music Master"}
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
            Back
          </Button>
          <Button onClick={onClose} size="lg" className="gap-2">
            Start Learning
            <Sparkles className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Confetti Background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -100, x: Math.random() * 100 + "%", opacity: 1 }}
            animate={{ y: "100vh", opacity: 0 }}
            transition={{ duration: 3, delay: Math.random() * 2, repeat: Infinity }}
            className="absolute w-3 h-3 bg-primary rounded-full"
            style={{ left: Math.random() * 100 + "%" }}
          />
        ))}
      </div>

      <div className="relative text-center space-y-8 p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
          transition={{ type: "spring", duration: 1 }}
        >
          <Trophy className="w-32 h-32 text-yellow-500 mx-auto" />
        </motion.div>

        <div className="space-y-3">
          <h2 className="text-5xl font-bold flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-yellow-500" />
            You're a Master!
            <Sparkles className="w-10 h-10 text-yellow-500" />
          </h2>
          <p className="text-xl text-muted-foreground">
            Congratulations on completing all tier levels!
          </p>
        </div>

        {/* Achievement Card */}
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-8 space-y-4 border-2 border-primary">
          <div className="text-6xl">⭐</div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Master Level Achieved</h3>
            <p className="text-lg">
              {instrument ? `${instrument.charAt(0).toUpperCase() + instrument.slice(1)} Master` : `${category.charAt(0).toUpperCase() + category.slice(1)} Master`}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                All Tiers Complete
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Master Status
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGetShareCard} variant="outline" size="lg" className="gap-2">
            <Share2 className="w-5 h-5" />
            Share Achievement
          </Button>
          <Button onClick={onClose} size="lg" className="gap-2">
            Start Learning
            <Sparkles className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Your personalized music lab are now ready based on your master level!
        </p>
      </div>
    </div>
  );
};