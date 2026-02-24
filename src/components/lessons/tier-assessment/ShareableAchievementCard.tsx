import { motion } from "framer-motion";
import { Trophy, Star, Award } from "lucide-react";
import logoGram from "@/assets/logo-gram.png";
import { forwardRef } from "react";

interface ShareableAchievementCardProps {
  tier: string;
  category: string;
  instrument?: string;
  score: number;
  totalQuestions: number;
  userName?: string;
}

const tierColors: Record<string, { from: string; to: string; text: string }> = {
  beginner: { from: "from-green-400", to: "to-emerald-600", text: "Beginner" },
  intermediate: {
    from: "from-blue-400",
    to: "to-cyan-600",
    text: "Intermediate",
  },
  advanced: { from: "from-purple-400", to: "to-violet-600", text: "Advanced" },
  master: { from: "from-amber-400", to: "to-yellow-600", text: "Master" },
};

export const ShareableAchievementCard = forwardRef<HTMLDivElement, ShareableAchievementCardProps>(({
  tier,
  category,
  instrument,
  score,
  totalQuestions,
  userName = "Music Enthusiast",
}, ref) => {
  const tierColor = tierColors[tier] || tierColors.beginner;
  const percentage = Math.round((score / totalQuestions) * 100);
  const displayCategory = instrument
    ? `${instrument.charAt(0).toUpperCase() + instrument.slice(1)}`
    : category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full max-w-md mx-auto"
    >
      {/* Main Card */}
      <div
        className={`relative bg-gradient-to-br ${tierColor.from} ${tierColor.to} rounded-3xl p-8 shadow-2xl overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative space-y-6 text-white">
          {/* Header */}
          <div className="flex items-center justify-between">
            <img
              src={logoGram}
              alt="Arrangely"
              className="w-16 h-16 drop-shadow-2xl"
            />
            <div className="text-right">
              <div className="text-xs font-semibold opacity-90">ARRANGELY</div>
              <div className="text-xs opacity-75">Musical Mastery</div>
            </div>
          </div>

          {/* Achievement Badge */}
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/50"
            >
              <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-3xl font-bold drop-shadow-lg">
                {tierColor.text} Level
              </h3>
              <p className="text-xl font-semibold">{displayCategory}</p>
              <p className="text-lg opacity-90">{userName}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
              <Star className="w-5 h-5 fill-white" />
              <span className="font-bold">
                {score}/{totalQuestions}
              </span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
              <span className="font-bold">{percentage}%</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center space-y-1 pt-4 border-t border-white/20">
            <div className="text-sm font-medium">Certified Achievement</div>
            <div className="text-xs opacity-75">arrangely.io</div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-4 right-4">
          <Award className="w-8 h-8 text-white/20" />
        </div>
        <div className="absolute bottom-4 left-4">
          <Star className="w-6 h-6 text-white/20" />
        </div>
      </div>

      {/* Glow Effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tierColor.from} ${tierColor.to} rounded-3xl blur-xl opacity-50 -z-10`}
      />
    </motion.div>
  );
});

ShareableAchievementCard.displayName = "ShareableAchievementCard";
