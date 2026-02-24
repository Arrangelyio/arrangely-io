import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Headphones, Volume2, Music2, Zap, ArrowRight } from "lucide-react";
import arrangelyLogoGram from "@/assets/arrangely-logo-gram.png";
import { useLanguage } from "@/contexts/LanguageContext";

interface SequencerHeroProps {
  onExplore?: () => void;
}

export const SequencerHero = ({ onExplore }: SequencerHeroProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLearnMore = () => {
    navigate("/download-app");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-worship mb-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Waveform lines */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 w-1 bg-gradient-to-t from-purple-400/40 to-transparent rounded-full"
            style={{
              left: `${8 + i * 8}%`,
              height: `${20 + Math.random() * 40}%`,
            }}
            animate={{
              height: [
                `${20 + Math.random() * 40}%`,
                `${30 + Math.random() * 50}%`,
                `${20 + Math.random() * 40}%`,
              ],
            }}
            transition={{
              duration: 1 + Math.random() * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1,
            }}
          />
        ))}

        {/* Floating orbs */}
        <motion.div
          className="absolute top-10 right-20 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-10 left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16">
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
          >
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/90 text-sm font-medium">
              Premium Audio Production
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Professional{" "}
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Audio Stems
            </span>
            <br />
            {t("SequencerHome.title")}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-white/70 mb-8 max-w-xl"
          >
            {t("SequencerHome.desc")}
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-4 mb-8"
          >
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-pink-400" />
              </div>
              <span className="text-sm">{t("SequencerHome.separated")}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Music2 className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm">{t("SequencerHome.studio")}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-sm">{t("SequencerHome.easy")}</span>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-4"
          >
            <Button
              size="lg"
              onClick={onExplore}
              className="bg-white text-purple-900 hover:bg-white/90 font-semibold shadow-xl shadow-purple-900/30"
            >
              <Headphones className="mr-2 h-5 w-5" />
              {/* Explore Audio Packs */}
              {t("SequencerHome.buttonExplore")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLearnMore}
              className="bg-white text-purple-900 hover:bg-white/90 font-semibold shadow-xl shadow-purple-900/30"
            >
              {/* Learn More */}
              {t("SequencerHome.learnMore")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>

        {/* Decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="hidden lg:flex absolute right-12 top-1/2 -translate-y-1/2"
        >
          <div className="relative">
            {/* Headphone icon with glow */}
            <div className="w-40 h-40 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-2xl absolute inset-0" />
            <div className="relative w-40 h-40 bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
              <img
                src={arrangelyLogoGram}
                alt="Arrangely"
                className="relative z-20 h-20 w-auto opacity-90 mb-4"
              />
            </div>

            {/* Orbiting dots */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-pink-400 rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                }}
                animate={{
                  x: [0, Math.cos((i * 60 * Math.PI) / 180) * 80, 0],
                  y: [0, Math.sin((i * 60 * Math.PI) / 180) * 80, 0],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SequencerHero;
