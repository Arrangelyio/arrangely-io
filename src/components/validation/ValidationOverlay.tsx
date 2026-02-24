import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Music,
  FileCheck,
  MessageSquare,
  Youtube
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface ValidationStep {
  id: string;
  label: string;
  labelId: string;
  icon: React.ReactNode;
  status: 'pending' | 'validating' | 'passed' | 'failed';
}

interface ValidationOverlayProps {
  isOpen: boolean;
  onComplete?: (success: boolean) => void;
  validationResult?: {
    allPassed: boolean;
    results?: Record<string, { passed: boolean; error?: string }>;
  } | null;
}

const validationStepsConfig = [
  { id: 'youtube', label: 'YouTube Link', labelId: 'Link YouTube', icon: <Youtube className="w-5 h-5" /> },
  { id: 'sections', label: 'Section Quality', labelId: 'Kualitas Section', icon: <Music className="w-5 h-5" /> },
  { id: 'chords', label: 'Chord Coverage', labelId: 'Cakupan Chord', icon: <FileCheck className="w-5 h-5" /> },
  { id: 'content', label: 'Content Moderation', labelId: 'Moderasi Konten', icon: <MessageSquare className="w-5 h-5" /> },
];

export function ValidationOverlay({ isOpen, onComplete, validationResult }: ValidationOverlayProps) {
  const { language } = useLanguage();
  const [steps, setSteps] = useState<ValidationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [allPassed, setAllPassed] = useState(false);

  // Initialize steps
  useEffect(() => {
    if (isOpen) {
      setSteps(validationStepsConfig.map(s => ({
        ...s,
        status: 'pending' as const
      })));
      setCurrentStepIndex(0);
      setIsComplete(false);
      setAllPassed(false);
    }
  }, [isOpen]);

  // Animate through steps if no result yet
  useEffect(() => {
    if (!isOpen || validationResult) return;

    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        const next = (prev + 1) % validationStepsConfig.length;
        return next;
      });
    }, 800);

    // Update step statuses for animation
    setSteps(prev => prev.map((step, idx) => ({
      ...step,
      status: idx === currentStepIndex ? 'validating' : 'pending'
    })));

    return () => clearInterval(interval);
  }, [isOpen, validationResult, currentStepIndex]);

  // Handle validation result
  useEffect(() => {
    if (validationResult && isOpen) {
      const results = validationResult.results || {};
      
      // Animate through each step with result
      let stepIndex = 0;
      const animateSteps = () => {
        if (stepIndex < validationStepsConfig.length) {
          setSteps(prev => prev.map((step, idx) => {
            if (idx < stepIndex) {
              const result = results[step.id];
              return { ...step, status: result?.passed ? 'passed' : 'failed' };
            }
            if (idx === stepIndex) {
              return { ...step, status: 'validating' };
            }
            return step;
          }));

          setTimeout(() => {
            setSteps(prev => prev.map((step, idx) => {
              if (idx <= stepIndex) {
                const result = results[step.id];
                return { ...step, status: result?.passed !== false ? 'passed' : 'failed' };
              }
              return step;
            }));
            stepIndex++;
            setTimeout(animateSteps, 400);
          }, 300);
        } else {
          // All steps animated
          setTimeout(() => {
            setIsComplete(true);
            setAllPassed(validationResult.allPassed);
            setTimeout(() => {
              onComplete?.(validationResult.allPassed);
            }, 2000);
          }, 500);
        }
      };

      animateSteps();
    }
  }, [validationResult, isOpen, onComplete]);

  const getStepColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'validating': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getStepBgColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500/20 border-green-500/50';
      case 'failed': return 'bg-red-500/20 border-red-500/50';
      case 'validating': return 'bg-primary/20 border-primary/50';
      default: return 'bg-muted/50 border-border';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4"
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-xl" />
            
            <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                {!isComplete ? (
                  <>
                    {/* AI Shield Animation */}
                    <motion.div
                      className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 relative"
                    >
                      {/* Rotating ring */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary"
                      />
                      
                      {/* Inner pulsing glow */}
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-2 rounded-full bg-primary/20"
                      />
                      
                      {/* Shield icon */}
                      <Shield className="w-10 h-10 text-primary relative z-10" />
                      
                      {/* Sparkle effects */}
                      <motion.div
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0.8, 1.2, 0.8],
                          x: [0, 5, 0],
                          y: [0, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                        className="absolute top-0 right-0"
                      >
                        <Sparkles className="w-4 h-4 text-primary" />
                      </motion.div>
                      <motion.div
                        animate={{ 
                          opacity: [0, 1, 0],
                          scale: [0.8, 1.2, 0.8],
                          x: [0, -5, 0],
                          y: [0, 5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                        className="absolute bottom-0 left-0"
                      >
                        <Sparkles className="w-3 h-3 text-primary" />
                      </motion.div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-semibold text-foreground mb-2"
                    >
                      {language === 'id' ? 'Validasi dengan AI' : 'AI Validation'}
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-muted-foreground"
                    >
                      {language === 'id' 
                        ? 'Menganalisis arrangement Anda untuk standar kualitas...' 
                        : 'Analyzing your arrangement for quality standards...'}
                    </motion.p>
                  </>
                ) : (
                  <>
                    {/* Result Animation */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 15, stiffness: 300 }}
                      className={cn(
                        "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
                        allPassed ? "bg-green-500/20" : "bg-red-500/20"
                      )}
                    >
                      {allPassed ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                        >
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                        >
                          <XCircle className="w-12 h-12 text-red-500" />
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={cn(
                        "text-xl font-semibold mb-2",
                        allPassed ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {allPassed 
                        ? (language === 'id' ? 'Validasi Berhasil!' : 'Validation Passed!')
                        : (language === 'id' ? 'Validasi Gagal' : 'Validation Failed')
                      }
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-sm text-muted-foreground"
                    >
                      {allPassed 
                        ? (language === 'id' 
                            ? 'Arrangement Anda telah dipublikasikan!' 
                            : 'Your arrangement has been published!')
                        : (language === 'id' 
                            ? 'Silakan periksa dan perbaiki masalah yang ditemukan.' 
                            : 'Please review and fix the issues found.')
                      }
                    </motion.p>
                  </>
                )}
              </div>

              {/* Validation Steps */}
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
                      getStepBgColor(step.status)
                    )}
                  >
                    {/* Step Icon */}
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                      step.status === 'validating' ? 'bg-primary/20' : 'bg-background/50'
                    )}>
                      {step.status === 'validating' ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                        </motion.div>
                      ) : step.status === 'passed' ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 15 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      ) : step.status === 'failed' ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 15 }}
                        >
                          <XCircle className="w-5 h-5 text-red-500" />
                        </motion.div>
                      ) : (
                        <span className={getStepColor(step.status)}>{step.icon}</span>
                      )}
                    </div>

                    {/* Step Label */}
                    <span className={cn(
                      "flex-1 font-medium transition-colors",
                      getStepColor(step.status)
                    )}>
                      {language === 'id' ? step.labelId : step.label}
                    </span>

                    {/* Status Badge */}
                    {step.status === 'passed' && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full"
                      >
                        ✓
                      </motion.span>
                    )}
                    {step.status === 'failed' && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-full"
                      >
                        ✗
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Footer text */}
              {!isComplete && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-xs text-muted-foreground mt-6"
                >
                  {language === 'id' 
                    ? 'Proses ini biasanya membutuhkan beberapa detik...' 
                    : 'This process usually takes a few seconds...'}
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ValidationOverlay;
