import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Award, TrendingUp, Users, BookOpen } from "lucide-react";
import { TierAssessmentModal } from "@/components/lessons/tier-assessment/TierAssessmentModal";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const LessonHeroSection = () => {
  const { t } = useLanguage();
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Get total assessment questions count
      const { count: questionsCount } = await supabase
        .from("tier_assessment_questions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get active lessons count as proxy for active learners
      const { count: lessonsCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .eq("is_unlisted", false);

      setStats({
        totalQuestions: questionsCount || 0,
        activeUsers: (lessonsCount || 0) * 10, // Rough estimate
      });
    };

    fetchStats();
  }, []);

  const categories = [
    { icon: "🎸", label: t("LessonHome.instrument") },
    { icon: "🎼", label: t("LessonHome.theory") },
    { icon: "🎚️", label: t("LessonHome.prod") },
    { icon: "✝️", label: t("LessonHome.worshipLeading") },
    { icon: "✍️", label: t("LessonHome.songWriting") },
  ];

  return (
    <>
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 rounded-3xl p-8 md:p-12 border border-amber-500/20 shadow-xl overflow-hidden relative"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 bg-amber-500 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-500 rounded-full blur-3xl" />
          </div>

          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 mb-4">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {/* New Feature */}
                  {t("LessonHome.newFeat")}
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                  {/* Don't Know Where to Start? */}
                  {t("LessonHome.title1")}
                  <span className="block text-amber-600 mt-2">
                    {/* Find Your Perfect Learning Path! */}
                    {t("LessonHome.title2")}
                  </span>
                </h2>
                <p className="text-muted-foreground text-lg">
                  {/* Take our comprehensive assessment to discover your music skill
                  level and get personalized lesson recommendations tailored
                  just for you. */}
                  {t("LessonHome.desc")}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-4 items-center"
              >
                <Button
                  size="lg"
                  onClick={() => setIsAssessmentOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg hover-scale"
                >
                  <Award className="w-5 h-5 mr-2" />
                  {/* Test Your Level Now */}
                  {t("LessonHome.buttonTest")}
                </Button>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>
                    {stats.activeUsers.toLocaleString()}{" "}
                    {t("LessonHome.tested")}
                  </span>
                </div>
              </motion.div>

              {/* Category Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap gap-2 pt-4"
              >
                {categories.map((cat, index) => (
                  <div
                    key={index}
                    className="px-3 py-1.5 bg-background/60 backdrop-blur-sm border border-border/50 rounded-full text-sm flex items-center gap-1.5 hover:scale-105 transition-transform"
                  >
                    <span>{cat.icon}</span>
                    <span className="text-foreground">{cat.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="relative w-full max-w-sm aspect-square">
                {/* Animated Circle */}
                <motion.div
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 blur-2xl"
                />

                {/* Center Badge */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="w-48 h-48 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl"
                    >
                      <Award className="w-24 h-24 text-white" />
                    </motion.div>

                    {/* Floating Icons */}
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute -top-8 -right-8 w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg"
                    >
                      <BookOpen className="w-8 h-8 text-white" />
                    </motion.div>

                    <motion.div
                      animate={{
                        y: [0, 10, 0],
                      }}
                      transition={{
                        duration: 3,
                        delay: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute -bottom-8 -left-8 w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center shadow-lg"
                    >
                      <TrendingUp className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 pt-8 border-t border-amber-500/20 grid grid-cols-3 gap-4 text-center"
          >
            <div>
              <div className="text-2xl font-bold text-primary">
                {stats.totalQuestions}+
              </div>
              <div className="text-sm text-muted-foreground">
                {/* Assessment Questions */}
                {t("LessonHome.assesment")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">5</div>
              <div className="text-sm text-muted-foreground">
                {/* Skill Categories */}
                {t("LessonHome.skill")}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">3</div>
              <div className="text-sm text-muted-foreground">
                {/* Difficulty Levels */}
                {t("LessonHome.level")}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <TierAssessmentModal
        open={isAssessmentOpen}
        onClose={() => setIsAssessmentOpen(false)}
      />
    </>
  );
};

export default LessonHeroSection;
