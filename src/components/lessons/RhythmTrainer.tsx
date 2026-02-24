import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Music2, Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface Beat {
  time: number;
  accent: boolean;
}

interface RhythmTrainerProps {
  exerciseId: string;
  tempo: number;
  timeSignature: string;
  pattern: number[]; // 1 for hit, 0 for rest
  measures: number;
  difficulty: number;
}

export default function RhythmTrainer({
  exerciseId,
  tempo = 120,
  timeSignature = "4/4",
  pattern = [1, 0, 1, 0, 1, 0, 1, 0],
  measures = 4,
  difficulty = 1,
}: RhythmTrainerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [userHits, setUserHits] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const beatsPerMeasure = parseInt(timeSignature.split("/")[0]);
  const totalBeats = pattern.length * measures;
  const beatDuration = (60 / tempo) * 1000;

  // Initialize Web Audio API
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playClick = (accent: boolean = false) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = accent ? 1200 : 800;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleStart = () => {
    setIsPlaying(true);
    setCurrentBeat(0);
    setUserHits([]);
    setScore(0);
    setStartTime(Date.now());

    let beat = 0;
    intervalRef.current = setInterval(() => {
      const patternIndex = beat % pattern.length;
      const isAccent = beat % beatsPerMeasure === 0;

      // Play metronome click
      playClick(isAccent);

      setCurrentBeat(beat);
      beat++;

      if (beat >= totalBeats) {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        calculateFinalScore();
      }
    }, beatDuration);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentBeat(0);
    setUserHits([]);
    setScore(0);
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleUserHit = () => {
    if (!isPlaying) return;

    const patternIndex = currentBeat % pattern.length;
    const shouldHit = pattern[patternIndex] === 1;
    const newHits = [...userHits, shouldHit];
    setUserHits(newHits);

    if (shouldHit) {
      setScore(score + 10);
      toast.success("Perfect! 🎵");
    } else {
      toast.error("Oops! Not on this beat");
    }

    // Play feedback sound
    playClick(true);
  };

  const calculateFinalScore = () => {
    const expectedHits = pattern.filter((p) => p === 1).length * measures;
    const correctHits = userHits.filter((h) => h).length;
    const accuracy = Math.round((correctHits / expectedHits) * 100);
    
    toast.success(`Exercise complete! Accuracy: ${accuracy}%`);
  };

  const progress = (currentBeat / totalBeats) * 100;
  const expectedHits = pattern.filter((p) => p === 1).length * measures;
  const correctHits = userHits.filter((h) => h).length;
  const accuracy = expectedHits > 0 ? Math.round((correctHits / expectedHits) * 100) : 0;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Rhythm Training</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {tempo} BPM • {timeSignature} Time
          </div>
        </div>

        <Progress value={progress} className="mb-2" />
        <div className="text-sm text-muted-foreground text-right">
          Beat {currentBeat + 1} / {totalBeats}
        </div>
      </div>

      {/* Visual Pattern Display */}
      <div className="mb-6 p-6 bg-muted/50 rounded-xl">
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: totalBeats }).map((_, index) => {
            const patternIndex = index % pattern.length;
            const shouldHit = pattern[patternIndex] === 1;
            const isCurrentBeat = index === currentBeat;
            const measureStart = index % beatsPerMeasure === 0;

            return (
              <div
                key={index}
                className={`h-16 rounded-lg flex items-center justify-center font-bold transition-all ${
                  isCurrentBeat
                    ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                    : shouldHit
                    ? "bg-primary/20 border-2 border-primary/40"
                    : "bg-background border-2 border-muted"
                } ${measureStart ? "border-l-4 border-l-primary" : ""}`}
              >
                {shouldHit ? (
                  <div className="text-2xl">♪</div>
                ) : (
                  <div className="text-muted-foreground">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Hit Button */}
      <div className="mb-6 flex justify-center">
        <Button
          size="lg"
          onClick={handleUserHit}
          disabled={!isPlaying}
          className="w-48 h-48 rounded-full text-3xl font-bold shadow-2xl hover:scale-105 transition-transform"
        >
          <div className="flex flex-col items-center gap-2">
            <Music2 className="h-16 w-16" />
            <span>TAP</span>
          </div>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Score</div>
          <div className="text-2xl font-bold text-primary">{score}</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Accuracy</div>
          <div className="text-2xl font-bold">{accuracy}%</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Time</div>
          <div className="text-2xl font-bold">
            {Math.floor(elapsedTime / 1000)}s
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isPlaying ? (
          <Button onClick={handleStart} className="flex-1" size="lg">
            <Play className="mr-2 h-5 w-5" />
            {startTime ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button onClick={handlePause} variant="outline" className="flex-1" size="lg">
            <Pause className="mr-2 h-5 w-5" />
            Pause
          </Button>
        )}
        <Button onClick={handleReset} variant="outline" size="lg">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          Instructions:
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Watch the pattern above - notes (♪) should be tapped, rests (-) should be skipped</li>
          <li>• Click START and tap the big button in rhythm</li>
          <li>• Follow the highlighted beat moving across the grid</li>
          <li>• Try to match the pattern perfectly for the best score!</li>
        </ul>
      </div>
    </Card>
  );
}
