
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, Zap, Music, Brain, Sparkles } from "lucide-react";

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
  enhanced?: boolean;
}

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  currentStep: string;
  progress: number;
  onStepComplete?: (stepId: string) => void;
}

const AnalysisProgress = ({ isAnalyzing, currentStep, progress, onStepComplete }: AnalysisProgressProps) => {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const analysisSteps: AnalysisStep[] = [
    {
      id: "metadata",
      title: "Video Metadata Extraction",
      description: "Analyzing YouTube video information and extracting title/artist",
      progress: 15,
      icon: <Music className="h-4 w-4" />
    },
    {
      id: "spotify",
      title: "Spotify Audio Features",
      description: "Enhancing analysis with Spotify's audio intelligence",
      progress: 30,
      icon: <Zap className="h-4 w-4" />,
      enhanced: true
    },
    {
      id: "lyrics",
      title: "Enhanced Lyrics Extraction",
      description: "Using LyricsGenius API for accurate lyrics retrieval",
      progress: 45,
      icon: <Brain className="h-4 w-4" />,
      enhanced: true
    },
    {
      id: "audio",
      title: "Advanced Audio Analysis",
      description: "powered tempo, key, and energy detection",
      progress: 65,
      icon: <Sparkles className="h-4 w-4" />,
      enhanced: true
    },
    {
      id: "chords",
      title: "Intelligent Chord Detection",
      description: "Generating sophisticated chord progressions",
      progress: 80,
      icon: <Music className="h-4 w-4" />,
      enhanced: true
    },
    {
      id: "structure",
      title: "Smart Structure Analysis",
      description: "Creating intelligent song arrangement with AI",
      progress: 95,
      icon: <Brain className="h-4 w-4" />,
      enhanced: true
    }
  ];

  useEffect(() => {
    if (!isAnalyzing) return;

    const currentStepData = analysisSteps.find(step => 
      currentStep.toLowerCase().includes(step.id) || 
      currentStep.toLowerCase().includes(step.title.toLowerCase())
    );

    if (currentStepData && !completedSteps.includes(currentStepData.id)) {
      const timer = setTimeout(() => {
        setCompletedSteps(prev => [...prev, currentStepData.id]);
        onStepComplete?.(currentStepData.id);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [currentStep, isAnalyzing, completedSteps, onStepComplete]);

  const getCurrentStepData = () => {
    return analysisSteps.find(step => 
      currentStep.toLowerCase().includes(step.id) || 
      currentStep.toLowerCase().includes(step.title.toLowerCase())
    );
  };

  const currentStepData = getCurrentStepData();

  if (!isAnalyzing) return null;

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Enhanced AI Analysis in Progress</h3>
          <Badge variant="secondary" className="bg-gradient-worship text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Using advanced audio intelligence and multiple APIs for maximum accuracy
        </p>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>Overall Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Current Step Highlight */}
      {currentStepData && (
        <div className="bg-white rounded-lg p-4 border-l-4 border-primary shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              {currentStepData.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{currentStepData.title}</h4>
                {currentStepData.enhanced && (
                  <Badge variant="outline" className="text-xs bg-gradient-worship text-white border-none">
                    Enhanced
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStepData.description}
              </p>
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        </div>
      )}

      {/* Steps Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {analysisSteps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStepData?.id === step.id;
          const isPending = !isCompleted && !isCurrent;

          return (
            <div 
              key={step.id}
              className={`
                p-3 rounded-lg border transition-all duration-300
                ${isCompleted ? 'bg-green-50 border-green-200' : 
                  isCurrent ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 
                  'bg-gray-50 border-gray-200'}
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  p-1.5 rounded-full
                  ${isCompleted ? 'bg-green-100' : 
                    isCurrent ? 'bg-blue-100' : 
                    'bg-gray-100'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`
                      text-xs font-medium truncate
                      ${isCompleted ? 'text-green-700' : 
                        isCurrent ? 'text-blue-700' : 
                        'text-gray-600'}
                    `}>
                      {step.title}
                    </span>
                    {step.enhanced && (
                      <Sparkles className="h-2.5 w-2.5 text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`
                    text-xs truncate
                    ${isCompleted ? 'text-green-600' : 
                      isCurrent ? 'text-blue-600' : 
                      'text-gray-500'}
                  `}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Features Notice */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-worship text-white rounded-full text-xs">
          <Sparkles className="h-3 w-3" />
          Enhanced with Spotify API & LyricsGenius for professional-grade analysis
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
