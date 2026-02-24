import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, ArrowRight, Sparkles, Lock, Star } from "lucide-react";
import { useState } from "react";
import { TierAssessmentModal } from "@/components/lessons/tier-assessment/TierAssessmentModal";
import { motion } from "framer-motion";

const TIER_LEVELS = [
  { name: "Beginner", value: "beginner", icon: "🎯", color: "from-blue-500 to-cyan-500" },
  { name: "Intermediate", value: "intermediate", icon: "🎵", color: "from-purple-500 to-pink-500" },
  { name: "Advanced", value: "advanced", icon: "🔥", color: "from-orange-500 to-red-500" },
  { name: "Master", value: "master", icon: "👑", color: "from-amber-500 to-yellow-500" },
];

const CATEGORY_ICONS: Record<string, string> = {
  instrument: "🎹",
  production: "🎚️",
  songwriting: "✍️",
  "worship leader": "🙏",
  "music theory": "📚",
  "ear training": "👂",
};

export const LevelProgressTracker = () => {
  const [showAssessment, setShowAssessment] = useState(false);

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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", currentUser!.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: tierProgress } = useQuery({
  queryKey: ["tier-progress", currentUser?.id],
  enabled: !!currentUser?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_tier_progress")
      .select("*")
      .eq("user_id", currentUser!.id)
      .eq("is_production", true)
      .order("completed_at", { ascending: false }); // ambil terbaru dulu

    if (error) throw error;

    // DISTINCT (instrument + sub_category) → keep the latest (already sorted desc)
    const unique = [];
    const seen = new Set();

    for (const row of data) {
      const key = `${row.instrument}|${row.sub_category}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row); // row ini pasti paling baru karena sorted desc
      }
    }

    return unique;
  },
});


  // Hide section if no tier progress data
  if (!tierProgress || tierProgress.length === 0) {
    return null;
  }

  // Calculate overall progress
  const completedTests = tierProgress?.filter((t) => t.passed).length || 0;
  
  // Find highest tier achieved globally based on current_tier
  const getHighestTierIndex = () => {
    if (!tierProgress || tierProgress.length === 0) return 0;
    
    let highestTier = 0;
    tierProgress.forEach((progress) => {
      if (progress.current_tier && progress.current_tier > highestTier) {
        highestTier = progress.current_tier;
      }
    });
    // current_tier is 1-based, convert to 0-based index
    return Math.max(0, highestTier - 1);
  };

  const currentTierIndex = getHighestTierIndex();
  const currentTier = TIER_LEVELS[currentTierIndex] || TIER_LEVELS[0]; // Default to Beginner
  const nextTier = TIER_LEVELS[currentTierIndex + 1];
  
  // Extract unique categories from tier questions
  const uniqueCategories =
    tierProgress?.reduce((acc, t) => {
      const key = t.category.toLowerCase();
      if (!acc.find((c) => c.category === key)) {
        acc.push({ category: key, name: t.category });
      }
      return acc;
  }, [] as Array<{ category: string; name: string }>) || [];


  const progressByCategory = uniqueCategories.map((cat) => {
  const categoryProgress =
    tierProgress?.filter((t) => t.category === cat.category) || [];

  // Find highest current_tier
  let highestTier = 0;
  categoryProgress.forEach((prog) => {
    if (prog.current_tier && prog.current_tier > highestTier) {
      highestTier = prog.current_tier;
    }
  });

  const categoryTierIndex = highestTier > 0 ? highestTier - 1 : -1;

  return {
    id: cat.category,
    name: cat.name,
    icon: CATEGORY_ICONS[cat.category] || "📌",
    completedTests: categoryProgress.length,
    progress: categoryProgress,
    currentTierIndex: categoryTierIndex,
    currentTier:
      categoryTierIndex >= 0
        ? TIER_LEVELS[categoryTierIndex]
        : TIER_LEVELS[0],
    nextTier:
      categoryTierIndex >= 0 &&
      categoryTierIndex < TIER_LEVELS.length - 1
        ? TIER_LEVELS[categoryTierIndex + 1]
        : null,
  };
});


  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-purple-500/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="truncate">Skill Progress</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {completedTests === 0 ? "Start your journey" : `${completedTests} completed`}
              </p>
            </div>
            <Button onClick={() => setShowAssessment(true)} size="sm" className="gap-1.5 h-8 text-xs flex-shrink-0">
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">Take Test</span>
              <span className="sm:hidden">Test</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3">
          {/* Current Achievement Banner */}
          {completedTests > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative p-2.5 rounded-lg bg-gradient-to-br ${currentTier.color} text-white mb-3 overflow-hidden`}
            >
              <div className="absolute top-0 right-0 opacity-10">
                <Star className="h-12 w-12" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentTier.icon}</span>
                  <div>
                    <p className="text-[10px] opacity-90">Current Level</p>
                    <h3 className="text-sm font-bold">{currentTier.name}</h3>
                  </div>
                </div>
                {nextTier && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <ArrowRight className="h-3 w-3" />
                    <span className="hidden sm:inline">Next: </span>
                    <span>{nextTier.icon}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Category Progress Cards */}
          <div className="space-y-2">
            {progressByCategory.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No categories available</p>
              </div>
            ) : (
              progressByCategory.map((category, index) => {
                // Group by instrument and sub_category from tier progress
                const progressGroups = new Map<string, typeof tierProgress>();
                tierProgress
                  ?.filter((t) => t.category === category.id)
                  .forEach((t) => {
                    const key = `${t.instrument}|${t.sub_category}`;
                    if (!progressGroups.has(key)) {
                      progressGroups.set(key, []);
                    }
                    progressGroups.get(key)?.push(t);
                  });
                const subCategories = Array.from(progressGroups.entries());
                const hasProgress = category.completedTests > 0;

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`border transition-all cursor-pointer hover:border-primary/40 hover:shadow-md ${
                        hasProgress ? "border-primary/20 bg-primary/5" : "border-muted"
                      }`}
                      onClick={() => setShowAssessment(true)}
                    >
                      <CardContent className="p-2.5">
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xl ${hasProgress ? "" : "opacity-50"}`}>
                              {category.icon}
                            </span>
                            <div>
                              <h4 className="font-semibold text-sm capitalize">{category.name}</h4>
                              <Badge variant="default" className="mt-0.5 text-[10px] h-4 px-1.5">
                                {category.currentTier?.icon} {category.currentTier?.name || 'Basic'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Show current tier focus or start prompt */}
                        {hasProgress ? (
                          <div className="space-y-1.5">
                            {/* Sub-categories if any */}
                            {subCategories.length > 0 ? (
                              <div className="space-y-1.5">
                                {subCategories.map(([key, subCatProgress]) => {
                                  const [instrument, subCategory] = key.split('|');

                                  // Find highest current_tier for this subcategory
                                  let highestSubTier = 0;
                                  subCatProgress.forEach((prog) => {
                                    if (prog.current_tier && prog.current_tier > highestSubTier) {
                                      highestSubTier = prog.current_tier;
                                    }
                                  });
                                  const currentSubTierIndex = highestSubTier > 0 ? highestSubTier - 1 : 0;
                                  const currentSubTier = TIER_LEVELS[currentSubTierIndex];
                                  const nextSubTier = TIER_LEVELS[currentSubTierIndex + 1];

                                  return (
                                    <div key={key} className="bg-muted/30 rounded-md p-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex flex-col">
                                          <span className="font-medium capitalize text-xs">
                                            {instrument} - {subCategory}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {currentSubTier?.icon} {currentSubTier?.name || 'Basic'}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                          Tier {highestSubTier || 1}/{TIER_LEVELS.length}
                                        </span>
                                      </div>
                                      
                                      {/* Progress bar for current focus */}
                                      <div className="flex gap-0.5 mb-1">
                                        {TIER_LEVELS.map((tier, idx) => {
                                          const passed = idx < currentSubTierIndex || (idx === currentSubTierIndex && highestSubTier > 0);
                                          const isNext = idx === currentSubTierIndex + 1;
                                          
                                          return (
                                            <div
                                              key={tier.value}
                                              className={`flex-1 h-1.5 rounded-full transition-all ${
                                                passed
                                                  ? `bg-gradient-to-r ${tier.color}`
                                                  : isNext
                                                  ? "bg-primary/30"
                                                  : "bg-muted"
                                              }`}
                                              title={tier.name}
                                            />
                                          );
                                        })}
                                      </div>

                                      {/* Next step hint */}
                                      {nextSubTier && (
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                          <ArrowRight className="h-2.5 w-2.5" />
                                          <span className="hidden sm:inline">Next: </span>
                                          <span>{nextSubTier.icon} {nextSubTier.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Direct tier progress */
                              <div className="space-y-1">
                                {TIER_LEVELS.map((tier, idx) => {
                                  const passed = idx < category.currentTierIndex || (idx === category.currentTierIndex && category.completedTests > 0);
                                  const isCurrent = idx === category.currentTierIndex;
                                  const isNext = idx === category.currentTierIndex + 1;

                                  return (
                                    <div
                                      key={tier.value}
                                      className={`flex items-center justify-between p-1.5 rounded-md transition-all ${
                                        passed
                                          ? "bg-green-50 border border-green-200"
                                          : isNext
                                          ? "bg-primary/5 border border-primary/20"
                                          : "bg-muted/30"
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{tier.icon}</span>
                                        <span className="font-medium text-xs">{tier.name}</span>
                                        {isNext && (
                                          <Badge variant="outline" className="text-[10px] h-3.5 px-1">
                                            Next
                                          </Badge>
                                        )}
                                      </div>
                                      {passed ? (
                                        <Trophy className="h-3 w-3 text-green-600" />
                                      ) : isNext ? (
                                        <ArrowRight className="h-3 w-3 text-primary" />
                                      ) : (
                                        <Lock className="h-3 w-3 text-muted-foreground/30" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Not started prompt */
                          <div className="text-center py-3 bg-muted/20 rounded-lg border border-dashed">
                            <Lock className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground/50" />
                            <p className="text-xs text-muted-foreground mb-2">
                              Start with {TIER_LEVELS[0].name} {TIER_LEVELS[0].icon}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowAssessment(true)}
                              className="h-7 text-xs px-3"
                            >
                              Begin Test
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <TierAssessmentModal
        open={showAssessment}
        onClose={() => setShowAssessment(false)}
        allowRetake={true}
      />
    </>
  );
};
