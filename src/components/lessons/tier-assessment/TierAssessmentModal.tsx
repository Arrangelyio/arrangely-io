import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CategorySelection } from "./CategorySelection";
import { InstrumentSelection } from "./InstrumentSelection";
import { QuizQuestion } from "./QuizQuestion";
import { TierSuccessPage } from "./TierSuccessPage";
import { TierFailPage } from "./TierFailPage";
import { FinalSuccessPage } from "./FinalSuccessPage";
import { CompletedTestsList } from "./CompletedTestsList";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Target,
  Zap,
  Star,
  ArrowLeft,
  Music,
  Trophy,
  X,
} from "lucide-react";
import assessmentHeroBg from "@/assets/assessment-hero-bg.jpg";
import assessmentIcon from "@/assets/assessment-icon.png";
import { StatusBar, Style } from "@capacitor/status-bar";
import { NavigationBar } from "@hugotomazi/capacitor-navigation-bar";
import { Capacitor } from "@capacitor/core";

type AssessmentStep =
  | "welcome"
  | "category"
  | "instrument"
  | "quiz"
  | "success"
  | "fail"
  | "final-success";

interface TierAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  allowRetake?: boolean;
}

export const TierAssessmentModal = ({
  open,
  onClose,
  allowRetake = false,
}: TierAssessmentModalProps) => {
  // --- State Management ---
  const [step, setStep] = useState<AssessmentStep>("welcome");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedInstrument, setSelectedInstrument] = useState<string>("");
  const [selectedCompletedTest, setSelectedCompletedTest] = useState<any>(null);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentTier, setCurrentTier] = useState<string>("basic");
  const [completedTests, setCompletedTests] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState(0);

  // --- Data Fetching ---
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
  });

  const { data: userProgress } = useQuery({
    queryKey: ["user-tier-progress"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("user_tier_progress")
        .select("*")
        .eq("user_id", user.id)
        .not("completed_at", "is", null);
      return data || [];
    },
    enabled: allowRetake,
  });

  useEffect(() => {
    if (userProgress) setCompletedTests(userProgress);
  }, [userProgress]);

  // --- EFFECT UNTUK SYSTEM UI (Status Bar & Nav Bar) ---
  useEffect(() => {
    const setupSystemUI = async () => {
      // Cek apakah berjalan di HP (Android/iOS) dan Modal sedang terbuka
      if (Capacitor.isNativePlatform() && open) {
        try {
          // 1. Atur Navigation Bar (Tombol Bawah Android) jadi Hitam
          await NavigationBar.show();
          await NavigationBar.setColor({ color: "#000000" });

          // 2. Atur Status Bar (Jam & Baterai) jadi Putih
          // Style.Dark artinya background dianggap gelap, jadi teksnya PUTIH
          await StatusBar.setStyle({ style: Style.Dark });
          // Set background status bar jadi hitam atau transparan biar teks putih terlihat
          await StatusBar.setBackgroundColor({ color: "#000000" });
        } catch (error) {
          console.error("Error setting system UI:", error);
        }
      }
    };

    setupSystemUI();

    // CLEANUP: Balikin ke warna normal (Putih/Teks Hitam) saat modal ditutup
    return () => {
      if (Capacitor.isNativePlatform()) {
        // Balikin Nav Bar jadi Putih
        NavigationBar.setColor({ color: "#FFFFFF" }).catch(() => {});
        // Balikin Status Bar jadi Teks Hitam (Style.Light) & Background Putih
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: "#FFFFFF" }).catch(() => {});
      }
    };
  }, [open]); // Effect jalan setiap 'open' berubah

  // --- Helper: Map tier number to tier name ---
  const getTierName = (tierNumber: number): string => {
    const tierMap: Record<number, string> = {
      1: "beginner",
      2: "intermediate",
      3: "advanced",
      4: "master",
    };
    return tierMap[tierNumber] || "beginner";
  };

  // --- Helper: Get Starting Tier Based on User Progress ---
  const getStartingTier = (
    category: string,
    subCategory: string | null
  ): string => {
    if (!userProgress || userProgress.length === 0) return "basic";

    // Find the user's progress for this category/subcategory
    const progress = userProgress.find((p) => {
      if (category === "instrument" && subCategory) {
        return p.category === "instrument" && p.sub_category === subCategory;
      } else {
        return p.category === category && p.sub_category === category;
      }
    });

    if (!progress || !progress.completed_at) return "basic";

    // Map tier level to tier name
    const tierLevelMap: Record<number, string> = {
      1: "basic",
      2: "intermediate",
      3: "advanced",
      4: "master",
    };

    const highestTier = progress.highest_tier_reached || 1;

    // If they completed master, they've finished all tiers
    if (highestTier >= 4) return "master";

    // Otherwise, start from the next tier
    const nextTierLevel = highestTier + 1;
    return tierLevelMap[nextTierLevel] || "basic";
  };

  // --- Helper: Robust Answer Checker ---
  // Fungsi ini mengecek apakah jawaban user benar, baik user mengirim Index ("0") maupun ID ("a")
  const isAnswerCorrect = (question: any, userAnswer: string) => {
    if (!question || !question.options || !userAnswer) return false;

    // 1. Cek jika jawaban adalah Index (Angka)
    // Contoh: User kirim "0", kita cek apakah options[0].isCorrect === true
    const asIndex = parseInt(userAnswer, 10);
    if (!isNaN(asIndex) && asIndex >= 0 && asIndex < question.options.length) {
      const optionByIndex = question.options[asIndex];
      if (
        optionByIndex.isCorrect === true ||
        optionByIndex.isCorrect === "true" ||
        optionByIndex.is_correct === true
      ) {
        return true;
      }
    }

    // 2. Cek jika jawaban adalah ID (String)
    // Contoh: User kirim "a", kita cari option dengan id="a" dan cek isCorrect
    const optionById = question.options.find(
      (opt: any) => String(opt.id) === String(userAnswer)
    );
    if (
      optionById &&
      (optionById.isCorrect === true ||
        optionById.isCorrect === "true" ||
        optionById.is_correct === true)
    ) {
      return true;
    }

    return false;
  };

  // --- Handlers ---
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    if (allowRetake) {
      const isCompleted = completedTests.some(
        (t) => t.category === category && !t.sub_category
      );
      if (isCompleted) {
        toast({
          title: "Sudah Selesai",
          description: "Anda sudah menyelesaikan tes ini!",
          variant: "destructive",
        });
        return;
      }
    }
    if (category === "instrument") {
      setStep("instrument");
    } else {
      // Check user's highest tier for this category
      const startingTier = getStartingTier(category, null);
      setCurrentTier(startingTier);
      setStep("quiz");
      loadQuestions(category, null, startingTier);
    }
  };

  const handleInstrumentSelect = (instrument: string) => {
    setSelectedInstrument(instrument);
    if (allowRetake) {
      const isCompleted = completedTests.some(
        (t) => t.category === "instrument" && t.sub_category === instrument
      );
      if (isCompleted) {
        toast({
          title: "Sudah Selesai",
          description: `Anda sudah menyelesaikan tes ${instrument}!`,
          variant: "destructive",
        });
        setStep("instrument");
        return;
      }
    }
    // Check user's highest tier for this instrument
    const startingTier = getStartingTier("instrument", instrument);
    setCurrentTier(startingTier);
    setStep("quiz");
    loadQuestions("instrument", instrument, startingTier);
  };

  const loadQuestions = async (
    category: string,
    subCategory: string | null,
    tier: string
  ) => {
    const tierLevelMap: Record<string, number> = {
      basic: 1,
      intermediate: 2,
      advanced: 3,
      master: 4,
    };
    const tierLevel = tierLevelMap[tier] || 1;

    let query = supabase
      .from("tier_assessment_questions")
      .select("*")
      .eq("is_production", true)
      .eq("tier_level", tierLevel);

    if (category === "instrument" && subCategory) {
      query = query
        .eq("category", "instrument")
        .eq("sub_category", subCategory);
    } else {
      query = query.eq("category", category).eq("sub_category", category);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      const minQuestionsRequired = 5;
      const idealQuestions = 10;
      if (data.length < minQuestionsRequired) {
        toast({
          title: "Pertanyaan Kurang",
          description: `Tier ini membutuhkan minimal ${minQuestionsRequired} pertanyaan.`,
          variant: "destructive",
        });
        setStep("category");
        return;
      }
      const shuffled = data.sort(() => Math.random() - 0.5);
      setCurrentQuestions(
        shuffled.slice(0, Math.min(data.length, idealQuestions))
      );
      setCurrentQuestionIndex(0);
      setAnswers({});
      setCurrentScore(0);
    } else {
      toast({
        title: "Tidak Tersedia",
        description: "Pertanyaan belum tersedia.",
        variant: "destructive",
      });
      setStep("category");
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const isTimeout = !answer || answer === "";

    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    const question = currentQuestions.find((q) => q.id === questionId);

    if (!isTimeout && question && isAnswerCorrect(question, answer)) {
      setCurrentScore((prev) => prev + 1);
    }

    if (currentQuestionIndex < currentQuestions.length - 1) {
      if (isTimeout) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setTimeout(
          () => setCurrentQuestionIndex(currentQuestionIndex + 1),
          300
        );
      }
    } else {
      // Jika pertanyaan terakhir
      if (isTimeout) {
        checkResults(newAnswers);
      } else {
        setTimeout(() => checkResults(newAnswers), 300);
      }
    }
  };

  const checkResults = async (finalAnswers: Record<string, string>) => {
    let correct = 0;

    currentQuestions.forEach((q) => {
      const userAnswer = finalAnswers[q.id];
      // Gunakan helper function isAnswerCorrect
      if (userAnswer && isAnswerCorrect(q, userAnswer)) {
        correct++;
      }
    });

    // Update state skor
    setCurrentScore(correct);

    const subCategory =
      selectedCategory === "instrument" ? selectedInstrument : selectedCategory;

    const { data: thresholdData } = await supabase
      .from("tier_assessment_thresholds")
      .select("pass_threshold")
      .eq("category", selectedCategory)
      .eq("sub_category", subCategory)
      .eq("instrument", selectedInstrument || "general")
      .eq("is_production", true)
      .single();

    const thresholdPercentage = thresholdData?.pass_threshold || 70;
    const passThreshold = Math.ceil(
      currentQuestions.length * (thresholdPercentage / 100)
    );
    const passed = correct >= passThreshold;

    if (passed) {
      saveProgress(true, correct);
      const tierOrder = ["basic", "intermediate", "advanced", "master"];
      const currentIndex = tierOrder.indexOf(currentTier);
      if (currentIndex < tierOrder.length - 1) setStep("success");
      else setStep("final-success");
    } else {
      saveProgress(false, correct);
      setStep("fail");
    }
  };

  const saveProgress = async (passed: boolean, correctCount: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const tierLevelMap: Record<string, number> = {
      basic: 1,
      intermediate: 2,
      advanced: 3,
      master: 4,
    };

    await supabase.from("user_tier_progress").upsert({
      user_id: user.id,
      instrument: selectedInstrument || "general",
      category: currentTier,
      sub_category:
        selectedCategory === "instrument"
          ? selectedInstrument
          : selectedCategory,
      current_tier: tierLevelMap[currentTier] || 1,
      highest_tier_reached: passed
        ? tierLevelMap[currentTier] || 1
        : (tierLevelMap[currentTier] || 1) - 1,
      total_score: correctCount,
      questions_answered: currentQuestions.length,
      completed_at: passed ? new Date().toISOString() : null,
    });

    if (passed) {
      const tierKey = selectedInstrument
        ? `${selectedCategory}_${selectedInstrument}`
        : selectedCategory;
      await supabase
        .from("profiles")
        .update({
          skill_tiers: {
            ...profile?.skill_tiers,
            [tierKey]: currentTier,
          },
        })
        .eq("user_id", user.id);
    }
  };

  const handleNextTier = async () => {
    const tierOrder = ["basic", "intermediate", "advanced", "master"];
    const nextTier = tierOrder[tierOrder.indexOf(currentTier) + 1];

    if (!nextTier) return;

    setCurrentTier(nextTier);
    setStep("quiz");
    loadQuestions(selectedCategory, selectedInstrument || null, nextTier);
  };

  const handleBack = () => {
    if (step === "quiz") {
      selectedCategory === "instrument"
        ? setStep("instrument")
        : setStep("category");
      setCurrentQuestionIndex(0);
      setAnswers({});
      setCurrentScore(0);
    } else if (step === "instrument") {
      setStep("category");
      setSelectedInstrument("");
    } else if (step === "category") {
      setStep("welcome");
      setSelectedCategory("");
    }
  };

  const Header = ({
    title,
    subtitle,
    showBack = true,
  }: {
    title: string;
    subtitle?: string;
    showBack?: boolean;
  }) => (
    <div className="relative mb-6 text-center pt-12 sm:pt-0">
      {showBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="absolute left-0 top-12 sm:top-0 -mt-1 hover:bg-background/50 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}
      <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 gap-0 w-full h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-background overflow-hidden flex flex-col border-none sm:border sm:rounded-3xl shadow-2xl sm:pt-0 [&>button]:hidden pt-safe">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {step !== "quiz" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-12 sm:top-4 z-50 rounded-full bg-black/20 text-white hover:bg-black/40 sm:text-foreground sm:bg-transparent sm:hover:bg-muted !inline-flex"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </Button>
        )}

        <div className="flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pb-24 sm:pb-0">
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full min-h-[600px]"
              >
                <div className="relative h-[280px] sm:h-[300px] w-full overflow-hidden shrink-0">
                  <div
                    className="absolute inset-0 bg-cover bg-center transform hover:scale-105 transition-transform duration-1000 grayscale-[30%]"
                    style={{
                      backgroundImage: `url(${assessmentHeroBg})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-blue-950/70 to-slate-900/80 mix-blend-multiply" />

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pt-12">
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        rotate: [0, 2, -2, 0],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="mb-4 drop-shadow-2xl"
                    >
                      {assessmentIcon ? (
                        <img
                          src={assessmentIcon}
                          alt="Trophy"
                          className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.8)] filter hue-rotate-[190deg] brightness-110 saturate-150"
                        />
                      ) : (
                        <Trophy className="w-24 h-24 text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                      )}
                    </motion.div>

                    <motion.h1
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-4xl sm:text-6xl font-extrabold tracking-tight drop-shadow-2xl"
                    >
                      <span className="bg-gradient-to-b from-white via-blue-100 to-blue-500 bg-clip-text text-transparent filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        Temukan Level Musikmu
                      </span>
                    </motion.h1>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-8 space-y-8 bg-background">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Ikuti assessment interaktif kami untuk menemukan pelajaran
                      yang disesuaikan untukmu!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        icon: Target,
                        title: "Akurat",
                        desc: "Berbasis AI & Data",
                      },
                      {
                        icon: Music,
                        title: "Personal",
                        desc: "Sesuai Instrumenmu",
                      },
                      {
                        icon: Zap,
                        title: "Instan",
                        desc: "Hasil langsung keluar",
                      },
                    ].map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex sm:flex-col items-center gap-4 sm:gap-2 p-4 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-blue-500/20 transition-all shadow-sm"
                      >
                        <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-600">
                          <f.icon className="w-5 h-5" />
                        </div>
                        <div className="text-left sm:text-center">
                          <h3 className="font-semibold text-foreground">
                            {f.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {f.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {allowRetake &&
                    completedTests.length > 0 &&
                    !selectedCompletedTest && (
                      <div className="border-t border-border/40 pt-6">
                        <CompletedTestsList
                          completedTests={completedTests}
                          onTestClick={(test) => setSelectedCompletedTest(test)}
                        />
                      </div>
                    )}

                  {selectedCompletedTest && (
                    <TierSuccessPage
                      tier={getTierName(selectedCompletedTest.current_tier)}
                      correctCount={selectedCompletedTest.total_score}
                      totalQuestions={10}
                      onNextTier={() => setSelectedCompletedTest(null)}
                      category={selectedCompletedTest.category}
                      instrument={selectedCompletedTest.sub_category}
                    />
                  )}

                  <div className="pt-4 flex justify-center pb-8 sm:pb-0">
                    <Button
                      onClick={() => setStep("category")}
                      size="lg"
                      className="w-full sm:w-auto min-w-[240px] h-14 text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all transform hover:-translate-y-1"
                    >
                      <span className="mr-2">
                        {allowRetake ? "Tes Ulang" : "Mulai Sekarang"}
                      </span>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {(step === "category" || step === "instrument") && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 sm:p-10 h-full flex flex-col"
              >
                <Header
                  title={
                    step === "category"
                      ? "Pilih Jalur Musik"
                      : "Pilih Instrumen"
                  }
                  subtitle={
                    step === "category"
                      ? "Apa yang ingin kamu pelajari?"
                      : "Instrumen apa yang kamu mainkan?"
                  }
                />

                <div className="flex-1 overflow-y-auto py-4 px-1">
                  {step === "category" ? (
                    <CategorySelection onSelect={handleCategorySelect} />
                  ) : (
                    <InstrumentSelection onSelect={handleInstrumentSelect} />
                  )}
                </div>
              </motion.div>
            )}

            {step === "quiz" && currentQuestions.length > 0 && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <div className="px-6 pt-6 pb-2 bg-background/80 backdrop-blur-sm z-20 border-b border-border/40 sticky top-0">
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-foreground -ml-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Batal
                    </Button>
                    <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Score: {currentScore}</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {currentQuestionIndex + 1} / {currentQuestions.length}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${
                            ((currentQuestionIndex + 1) /
                              currentQuestions.length) *
                            100
                          }%`,
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-50/50 dark:bg-black/20">
                  <div className="max-w-2xl mx-auto">
                    <QuizQuestion
                      question={currentQuestions[currentQuestionIndex]}
                      currentIndex={currentQuestionIndex}
                      totalQuestions={currentQuestions.length}
                      onAnswer={handleAnswer}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {(step === "success" ||
              step === "fail" ||
              step === "final-success") && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full overflow-y-auto p-6 sm:p-8 bg-gradient-to-b from-background to-blue-500/5"
              >
                {step === "success" && (
                  <TierSuccessPage
                    tier={currentTier}
                    correctCount={currentScore}
                    totalQuestions={currentQuestions.length}
                    onNextTier={handleNextTier}
                    category={selectedCategory}
                    instrument={selectedInstrument}
                  />
                )}
                {step === "fail" && (
                  <TierFailPage
                    tier={currentTier}
                    correctCount={currentScore}
                    totalQuestions={currentQuestions.length}
                    // --- Menggunakan isAnswerCorrect untuk filter pertanyaan salah ---
                    wrongQuestions={currentQuestions.filter((q) => {
                      const userAnswer = answers[q.id];
                      // Jika TIDAK benar, berarti salah
                      return !isAnswerCorrect(q, userAnswer);
                    })}
                    onRetry={() => {
                      setStep("quiz");
                      setCurrentQuestionIndex(0);
                      setCurrentScore(0);
                    }}
                    category={selectedCategory}
                    instrument={selectedInstrument}
                  />
                )}
                {step === "final-success" && (
                  <FinalSuccessPage
                    category={selectedCategory}
                    instrument={selectedInstrument}
                    onClose={onClose}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
