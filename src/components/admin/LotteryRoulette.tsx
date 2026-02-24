import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, Square } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  subscriptionPlan: string;
}

interface Reward {
  id: string;
  name: string;
  type: 'subscription' | 'custom';
  subscriptionPlan?: string;
  quantity: number;
}

interface Winner {
  participant: Participant;
  reward: Reward;
  timestamp: Date;
}

interface LotteryRouletteProps {
  participants: Participant[];
  rewards: Reward[];
  onDrawComplete: (winners: Winner[]) => void;
  isLocked: boolean;
}

export default function LotteryRoulette({ participants, rewards, onDrawComplete, isLocked }: LotteryRouletteProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [drawCompleted, setDrawCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Plan normalizer to align labels with configured values
  const normalizePlan = (plan: string): string => {
    const p = (plan || '').toLowerCase();
    const tier = p.includes('premium') ? 'premium' : p.includes('basic') ? 'basic' : '';
    const period = p.includes('year') ? 'yearly' : p.includes('month') ? 'monthly' : '';
    return tier && period ? `${tier}_${period}` : p; // fallback to raw if unknown
  };

  // Filter eligible participants based on rewards
  const getEligibleParticipants = (reward: Reward): Participant[] => {
    if (reward.type === 'custom') return participants; // Custom rewards: everyone eligible
    if (!reward.subscriptionPlan || reward.subscriptionPlan === 'all') return participants;
    const target = reward.subscriptionPlan.toLowerCase();
    return participants.filter((p) => normalizePlan(p.subscriptionPlan) === target);
  };

  const startDraw = async () => {
    if (!isLocked || isDrawing || drawCompleted) return;
    
    setIsDrawing(true);
    setWinners([]);
    
    const newWinners: Winner[] = [];
    const usedParticipants = new Set<string>();
    
    // Create a pool of all available participants for fair distribution
    let availableParticipants = [...participants];

    // Process each reward
    for (const reward of rewards) {
      // Draw winners for this reward's quantity
      for (let i = 0; i < reward.quantity && availableParticipants.length > 0; i++) {
        // Filter eligible participants based on reward type and exclude already won participants
        const eligibleParticipants = getEligibleParticipants(reward)
          .filter(p => !usedParticipants.has(p.id) && availableParticipants.some(ap => ap.id === p.id));

        if (eligibleParticipants.length === 0) {
          
          break; // No more eligible participants for this reward
        }

        // Roulette animation
        let spinCount = 0;
        const maxSpins = 20 + Math.random() * 30; // Random spin duration

        await new Promise<void>((resolve) => {
          intervalRef.current = setInterval(() => {
            const randomParticipant = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
            setCurrentParticipant(randomParticipant);
            
            spinCount++;
            if (spinCount >= maxSpins) {
              clearInterval(intervalRef.current!);
              
              // Select final winner with equal probability
              const winnerIndex = Math.floor(Math.random() * eligibleParticipants.length);
              const winner = eligibleParticipants[winnerIndex];
              
              const newWinner: Winner = {
                participant: winner,
                reward: reward,
                timestamp: new Date()
              };
              
              newWinners.push(newWinner);
              setWinners(prev => [...prev, newWinner]);
              
              // Mark participant as used globally across all rewards
              usedParticipants.add(winner.id);
              
              // Remove winner from available participants pool permanently
              availableParticipants = availableParticipants.filter(p => p.id !== winner.id);
              
              
              
              resolve();
            }
          }, 100);
        });

        // Pause between draws
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsDrawing(false);
    setDrawCompleted(true);
    setCurrentParticipant(null);
    onDrawComplete(newWinners);
  };

  const stopDraw = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsDrawing(false);
    setCurrentParticipant(null);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const totalRewardQuantity = rewards.reduce((sum, reward) => sum + reward.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Roulette Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Lottery Drawing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            {/* Participant Display */}
            <div className="relative">
              <div className="w-64 h-64 mx-auto border-4 border-primary rounded-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                {isDrawing && currentParticipant ? (
                  <div className="text-center animate-pulse">
                    <div className="text-2xl font-bold text-primary mb-2">
                      {currentParticipant.name}
                    </div>
                    <Badge variant="outline">
                      {currentParticipant.subscriptionPlan}
                    </Badge>
                  </div>
                ) : drawCompleted ? (
                  <div className="text-center">
                    <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                    <div className="text-lg font-semibold">Drawing Complete!</div>
                    <div className="text-sm text-muted-foreground">{winners.length} winners selected</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-muted-foreground">Ready to Draw</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {participants.length} participants<br />
                      {totalRewardQuantity} total prizes
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              {!drawCompleted ? (
                <>
                  <Button
                    onClick={startDraw}
                    disabled={!isLocked || isDrawing || participants.length === 0 || rewards.length === 0}
                    size="lg"
                    className="px-8"
                  >
                    {isDrawing ? (
                      <>
                        <Square className="h-5 w-5 mr-2" />
                        Drawing...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Mulai Undian
                      </>
                    )}
                  </Button>
                  {isDrawing && (
                    <Button
                      onClick={stopDraw}
                      variant="outline"
                      size="lg"
                    >
                      <Square className="h-5 w-5 mr-2" />
                      Stop
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => {
                    setDrawCompleted(false);
                    setWinners([]);
                    setCurrentParticipant(null);
                  }}
                  variant="outline"
                  size="lg"
                >
                  Reset Drawing
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Winners Display */}
      {winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🎉 Winners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {winners.map((winner, index) => (
                <div 
                  key={`${winner.participant.id}-${winner.reward.id}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <div>
                      <div className="font-semibold text-lg">{winner.participant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {winner.participant.subscriptionPlan}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-primary">{winner.reward.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {winner.reward.type === 'custom' ? 'Custom Reward' : 'Subscription Reward'} • {winner.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}