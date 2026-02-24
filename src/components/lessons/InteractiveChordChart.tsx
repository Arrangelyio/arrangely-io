import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Music, Play, Pause, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Chord {
  name: string;
  duration: number; // beats
  position: number; // bar number
}

interface InteractiveChordChartProps {
  exerciseId: string;
  chords: Chord[];
  tempo: number;
  difficulty: number;
  onComplete?: (score: number, timeTaken: number) => void;
}

export default function InteractiveChordChart({
  exerciseId,
  chords,
  tempo = 120,
  difficulty = 1,
  onComplete,
}: InteractiveChordChartProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [userClicks, setUserClicks] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const beatDuration = (60 / tempo) * 1000; // milliseconds per beat

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentChordIndex((prev) => {
        if (prev >= chords.length - 1) {
          setIsPlaying(false);
          handleComplete();
          return prev;
        }
        return prev + 1;
      });
    }, beatDuration * (chords[currentChordIndex]?.duration || 4));

    return () => clearInterval(interval);
  }, [isPlaying, currentChordIndex, beatDuration, chords]);

  useEffect(() => {
    if (isPlaying && startTime) {
      const timer = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isPlaying, startTime]);

  const handleStart = () => {
    setIsPlaying(true);
    setStartTime(Date.now());
    setCurrentChordIndex(0);
    setUserClicks([]);
    setScore(0);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentChordIndex(0);
    setUserClicks([]);
    setScore(0);
    setStartTime(null);
    setElapsedTime(0);
  };

  const handleChordClick = (index: number) => {
    if (!isPlaying) return;

    const newClicks = [...userClicks, index];
    setUserClicks(newClicks);

    // Check if click matches current chord
    if (index === currentChordIndex) {
      const newScore = score + 10;
      setScore(newScore);
      toast.success("Perfect timing! ✨");
    } else {
      toast.error("Wrong chord - keep trying!");
    }
  };

  const handleComplete = async () => {
    const totalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    const finalScore = Math.round((score / (chords.length * 10)) * 100);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("exercise_completions").insert({
        user_id: user.id,
        exercise_id: exerciseId,
        score: finalScore,
        time_taken_seconds: totalTime,
        attempt_data: {
          clicks: userClicks,
          missed_chords: chords.length - userClicks.length,
        },
      });

      toast.success(`Exercise complete! Score: ${finalScore}%`);
      onComplete?.(finalScore, totalTime);
    } catch (error) {
      console.error("Error saving completion:", error);
    }
  };

  const progress = (currentChordIndex / chords.length) * 100;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Interactive Chord Chart</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Tempo: {tempo} BPM | Difficulty: {difficulty}/5
          </div>
        </div>

        <Progress value={progress} className="mb-2" />
        <div className="text-sm text-muted-foreground text-right">
          {currentChordIndex + 1} / {chords.length} chords
        </div>
      </div>

      {/* Chord Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {chords.map((chord, index) => (
          <Button
            key={index}
            variant={index === currentChordIndex ? "default" : "outline"}
            className={`h-24 text-xl font-bold transition-all ${
              index === currentChordIndex
                ? "scale-110 shadow-lg ring-4 ring-primary/20 animate-pulse"
                : userClicks.includes(index)
                ? "bg-green-500/10 border-green-500"
                : ""
            }`}
            onClick={() => handleChordClick(index)}
            disabled={!isPlaying}
          >
            <div className="flex flex-col items-center">
              <span>{chord.name}</span>
              {userClicks.includes(index) && (
                <Check className="h-5 w-5 text-green-500 mt-1" />
              )}
            </div>
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isPlaying ? (
            <Button onClick={handleStart} size="lg">
              <Play className="mr-2 h-5 w-5" />
              {startTime ? "Resume" : "Start"}
            </Button>
          ) : (
            <Button onClick={handlePause} variant="outline" size="lg">
              <Pause className="mr-2 h-5 w-5" />
              Pause
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" size="lg">
            <RotateCcw className="mr-2 h-5 w-5" />
            Reset
          </Button>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground">Score</div>
          <div className="text-2xl font-bold text-primary">{score}</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-semibold mb-2">How to Play:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Click START to begin the exercise</li>
          <li>• Click the highlighted chord as it lights up</li>
          <li>• Follow the rhythm and stay in time with the tempo</li>
          <li>• Complete all chords to finish the exercise</li>
        </ul>
      </div>
    </Card>
  );
}
