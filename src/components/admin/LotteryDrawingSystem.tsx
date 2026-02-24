import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  DollarSign,
  Lock,
  Unlock,
  Trophy,
  Gift,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import RewardConfiguration from "./RewardConfiguration";
import LotteryRoulette from "./LotteryRoulette";
import * as XLSX from "xlsx";

interface Registration {
  id: string;
  booking_id: string;
  user_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  qr_code: string;
  payment_status: string;
  status: string;
  check_in_time?: string;
  registration_date: string;
  amount_paid: number;
}

interface Reward {
  id: string;
  name: string;
  type: "subscription" | "custom";
  subscriptionPlan?: string;
  quantity: number;
}

interface Winner {
  participant: {
    id: string;
    name: string;
    subscriptionPlan: string;
  };
  reward: Reward;
  timestamp: Date;
}

interface LotteryDrawingSystemProps {
  registrations: Registration[];
  // attendeeSubscriptions: {[key: string]: any};
  subscriptionRevenue: number;
  demoMode?: boolean;
}

export default function LotteryDrawingSystem({
  registrations,
  // attendeeSubscriptions,
  subscriptionRevenue,
  demoMode = false,
}: LotteryDrawingSystemProps) {
  const [step, setStep] = useState<"config" | "draw" | "results">("config");
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isParticipantsLocked, setIsParticipantsLocked] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);

  // Generate demo data if no registrations exist
  const generateDemoData = () => {
    const demoNames = [
      "John Smith",
      "Maria Garcia",
      "David Johnson",
      "Sarah Wilson",
      "Michael Brown",
      "Emma Davis",
      "James Miller",
      "Lisa Anderson",
      "Robert Taylor",
      "Jennifer White",
      "William Martinez",
      "Patricia Thomas",
      "Christopher Jackson",
      "Linda Thompson",
      "Daniel Rodriguez",
      "Barbara Lewis",
      "Matthew Lee",
      "Susan Walker",
      "Anthony Hall",
      "Jessica Allen",
      "Mark Young",
      "Ashley King",
      "Steven Wright",
      "Kimberly Scott",
      "Joshua Green",
      "Donna Adams",
      "Kenneth Baker",
      "Helen Nelson",
      "Paul Carter",
      "Dorothy Mitchell",
      "Edward Roberts",
      "Carol Phillips",
      "Brian Turner",
      "Nancy Campbell",
      "Ronald Parker",
      "Karen Evans",
      "Kevin Edwards",
      "Betty Collins",
      "Jason Stewart",
      "Ruth Sanchez",
      "Gary Morris",
      "Sharon Murphy",
      "Nicholas Reed",
      "Michelle Cook",
      "Eric Bailey",
      "Lisa Rivera",
      "Stephen Cooper",
      "Kimberly Richardson",
      "Andrew Cox",
      "Deborah Howard",
      "Raymond Ward",
      "Dorothy Torres",
      "Gregory Peterson",
      "Lisa Gray",
      "Joshua Ramirez",
      "Nancy James",
      "Ryan Watson",
      "Karen Brooks",
      "Jacob Kelly",
      "Helen Sanders",
      "Nicholas Price",
      "Shirley Bennett",
      "Gary Wood",
      "Angela Barnes",
      "Kenneth Ross",
      "Brenda Henderson",
      "Joshua Coleman",
      "Amy Jenkins",
      "Matthew Perry",
      "Janet Powell",
      "Christopher Long",
      "Frances Patterson",
      "Anthony Hughes",
      "Marilyn Flores",
      "Mark Washington",
      "Julie Butler",
      "Donald Simmons",
      "Cheryl Foster",
      "Steven Gonzales",
      "Martha Bryant",
      "Paul Alexander",
      "Gloria Russell",
      "Andrew Griffin",
      "Teresa Diaz",
      "Kenneth Hayes",
      "Sara Myers",
      "Joshua Ford",
      "Janice Hamilton",
      "Ryan Graham",
      "Kathleen Sullivan",
      "Gary Wallace",
      "Ann Woods",
      "Nicholas Cole",
      "Joan West",
      "Eric Jordan",
      "Judith Owens",
      "Stephen Reynolds",
      "Joyce Fisher",
      "Andrew Ellis",
      "Virginia Gibson",
      "Matthew Mason",
      "Kelly Dixon",
      "Anthony Hunter",
      "Christina Hart",
      "Mark Fuller",
      "Beverly Wells",
      "Donald Welch",
      "Laura Austin",
    ];

    const subscriptionPlans = [
      "basic_monthly",
      "basic_yearly",
      "premium_monthly",
      "premium_yearly",
      "free",
    ];
    const planWeights = [25, 15, 30, 20, 10]; // Distribution weights
    const domains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "email.com",
    ];
    const phones = [
      "+62812",
      "+62813",
      "+62814",
      "+62815",
      "+62816",
      "+62817",
      "+62818",
    ];

    const demoRegistrations: Registration[] = [];
    const demoSubscriptions: { [key: string]: any } = {};

    for (let i = 0; i < 100; i++) {
      const userId = `demo-user-${i}`;
      const name = demoNames[i] || `Participant ${i + 1}`;
      const isCheckedIn = Math.random() < 0.7; // 70% attendance

      // Select subscription plan based on weighted distribution
      const rand = Math.random() * 100;
      let cumulative = 0;
      let selectedPlan = "free";

      for (let j = 0; j < planWeights.length; j++) {
        cumulative += planWeights[j];
        if (rand <= cumulative) {
          selectedPlan = subscriptionPlans[j];
          break;
        }
      }

      demoRegistrations.push({
        id: `demo-reg-${i}`,
        booking_id: `EVT-${Math.random()
          .toString(36)
          .substr(2, 8)
          .toUpperCase()}`,
        user_id: userId,
        attendee_name: name,
        attendee_email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@${
          domains[i % domains.length]
        }`,
        attendee_phone: `${phones[i % phones.length]}${Math.floor(
          Math.random() * 99999999
        )
          .toString()
          .padStart(8, "0")}`,
        qr_code: `QR-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
        payment_status: "paid",
        status: "confirmed",
        check_in_time: isCheckedIn
          ? new Date(
              Date.now() - Math.random() * 2 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
        registration_date: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        amount_paid: 150000,
      });

      demoSubscriptions[userId] = selectedPlan;
    }

    return { demoRegistrations, demoSubscriptions };
  };

  // Use demo data if no registrations exist or demo mode is enabled
  const shouldUseDemoData = demoMode;
  const { demoRegistrations, demoSubscriptions } = shouldUseDemoData
    ? generateDemoData()
    : { demoRegistrations: [], demoSubscriptions: {} };

  const effectiveRegistrations = shouldUseDemoData
    ? demoRegistrations
    : registrations;
  // const effectiveSubscriptions = shouldUseDemoData ? demoSubscriptions : attendeeSubscriptions;
  const effectiveRevenue = shouldUseDemoData ? 15000000 : subscriptionRevenue; // 15M for demo

  // Normalize attendee subscription object/string to internal key (e.g., premium_yearly)
  const normalizePlanKey = (sub: any): string => {
    if (!sub) return "free";
    const raw =
      typeof sub === "string"
        ? sub
        : sub.plan_key ??
          sub.planId ??
          sub.plan_id ??
          sub.plan?.id ??
          sub.plan?.name ??
          sub.name ??
          "free";
    const s = String(raw).toLowerCase();
    const tier = s.includes("premium")
      ? "premium"
      : s.includes("basic")
      ? "basic"
      : "";
    const period =
      s.includes("year") || s.includes("annual")
        ? "yearly"
        : s.includes("month") || s.includes("monthly")
        ? "monthly"
        : "";
    return tier && period ? `${tier}_${period}` : s;
  };

  // Get eligible participants (checked in attendees)
  const eligibleParticipants = effectiveRegistrations
    .filter((reg) => reg.check_in_time)
    .map((reg) => ({
      id: reg.user_id,
      name: reg.attendee_name,
      subscriptionPlan: shouldUseDemoData
        ? demoSubscriptions[reg.user_id] || "free"
        : "free", // Default to free when not in demo mode
    }));

  const handleRewardConfigComplete = (configuredRewards: Reward[]) => {
    setRewards(configuredRewards);
    setStep("draw");
  };

  const handleLockParticipants = () => {
    setIsParticipantsLocked(true);
  };

  const handleDrawComplete = async (drawWinners: Winner[]) => {
    setWinners(drawWinners);
    setStep("results");

    // Save winners to database and send notifications
    await saveWinnersToDatabase(drawWinners);
  };

  const saveWinnersToDatabase = async (drawWinners: Winner[]) => {
    try {
      // Get event ID from URL if we're on event page
      const eventId = window.location.pathname.split("/events/")[1];

      for (const winner of drawWinners) {
        // Get user registration details
        const userReg = effectiveRegistrations.find(
          (r) => r.user_id === winner.participant.id
        );

        if (userReg && eventId) {
          // Save winner to lottery_winners table
          const { error: winnerError } = await supabase
            .from("lottery_winners")
            .insert({
              event_id: eventId,
              user_id: winner.participant.id,
              attendee_name: winner.participant.name,
              reward_name: winner.reward.name,
              reward_type: winner.reward.type,
              subscription_plan: winner.participant.subscriptionPlan,
              won_at: winner.timestamp.toISOString(),
            });

          if (winnerError) {
            console.error("Error saving winner:", winnerError);
            continue;
          }

          // Send notification to winner
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: winner.participant.id,
              type: "lottery_winner",
              title: "🎉 Congratulations! You Won!",
              message: `You've won "${winner.reward.name}" in the event lottery! Check your event tickets for more details.`,
              metadata: {
                event_id: eventId,
                reward_name: winner.reward.name,
                reward_type: winner.reward.type,
                won_at: winner.timestamp.toISOString(),
              },
            });

          if (notificationError) {
            console.error("Error sending notification:", notificationError);
          }
        }
      }
    } catch (error) {
      console.error("Error processing winners:", error);
    }
  };

  const handleResetSystem = () => {
    setStep("config");
    setRewards([]);
    setIsParticipantsLocked(false);
    setWinners([]);
  };

  const exportWinnersToExcel = () => {
    if (winners.length === 0) return;

    // Get detailed user information from registrations
    const exportData = winners.map((winner, index) => {
      const userRegistration = effectiveRegistrations.find(
        (reg) => reg.user_id === winner.participant.id
      );
      // const subscription = effectiveSubscriptions[winner.participant.id];

      return {
        "No.": index + 1,
        "Winner Name": winner.participant.name,
        Email: userRegistration?.attendee_email || "N/A",
        Phone: userRegistration?.attendee_phone || "N/A",
        "Check-in Time": userRegistration?.check_in_time
          ? new Date(userRegistration.check_in_time).toLocaleString()
          : "N/A",
        "Registration Date": userRegistration?.registration_date
          ? new Date(userRegistration.registration_date).toLocaleDateString()
          : "N/A",
        "Subscription Plan": winner.participant.subscriptionPlan,
        "Amount Paid": userRegistration?.amount_paid
          ? `Rp ${userRegistration.amount_paid.toLocaleString()}`
          : "N/A",
        "Reward Name": winner.reward.name,
        "Reward Type":
          winner.reward.type === "custom"
            ? "Custom Reward"
            : "Subscription Reward",
        "Target Plan": winner.reward.subscriptionPlan || "All Plans",
        "Won At": winner.timestamp.toLocaleString(),
        "Won Date": winner.timestamp.toLocaleDateString(),
        "Won Time": winner.timestamp.toLocaleTimeString(),
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Winners");

    // Auto-width columns
    const maxWidth = exportData.reduce((acc, row) => {
      Object.keys(row).forEach((key, idx) => {
        const cellValue = row[key as keyof typeof row]?.toString() || "";
        acc[idx] = Math.max(acc[idx] || 10, Math.min(cellValue.length + 2, 50));
      });
      return acc;
    }, {} as { [key: number]: number });

    ws["!cols"] = Object.keys(maxWidth).map((key) => ({
      width: maxWidth[parseInt(key)],
    }));

    // Generate filename with current date
    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `lottery-winners-${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  const checkedInCount = effectiveRegistrations.filter(
    (r) => r.check_in_time
  ).length;
  const notCheckedInCount = effectiveRegistrations.filter(
    (r) => !r.check_in_time
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Eligible Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {checkedInCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Checked in attendees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Not Eligible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {notCheckedInCount}
            </div>
            <p className="text-xs text-muted-foreground">Not checked in yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Total Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rewards.reduce((sum, reward) => sum + reward.quantity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Configured prizes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Event Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {effectiveRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From subscriptions during event
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 ${
                  step === "config"
                    ? "text-primary"
                    : step === "draw" || step === "results"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "config"
                      ? "bg-primary text-white"
                      : step === "draw" || step === "results"
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  1
                </div>
                <span className="font-medium">Configure Rewards</span>
              </div>

              <div
                className={`w-8 h-0.5 ${
                  step === "draw" || step === "results"
                    ? "bg-green-600"
                    : "bg-muted"
                }`}
              ></div>

              <div
                className={`flex items-center space-x-2 ${
                  step === "draw"
                    ? "text-primary"
                    : step === "results"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "draw"
                      ? "bg-primary text-white"
                      : step === "results"
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </div>
                <span className="font-medium">Drawing</span>
              </div>

              <div
                className={`w-8 h-0.5 ${
                  step === "results" ? "bg-green-600" : "bg-muted"
                }`}
              ></div>

              <div
                className={`flex items-center space-x-2 ${
                  step === "results"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === "results"
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </div>
                <span className="font-medium">Results</span>
              </div>
            </div>

            {step !== "config" && (
              <Button onClick={handleResetSystem} variant="outline" size="sm">
                Reset System
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {step === "config" && (
        <RewardConfiguration
          onConfigComplete={handleRewardConfigComplete}
          disabled={false}
          demoMode={shouldUseDemoData}
        />
      )}

      {step === "draw" && (
        <div className="space-y-6">
          {/* Participant Lock Controls */}
          {!isParticipantsLocked && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Lock Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Before starting the drawing, you need to lock the participant
                  list. Once locked, no new participants can be added to the
                  drawing.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                    <Users className="h-4 w-4" />
                    Current Eligible Participants: {eligibleParticipants.length}
                  </div>
                  <div className="text-sm text-yellow-700">
                    Make sure all attendees have checked in before locking the
                    list.
                  </div>
                </div>
                <Button onClick={handleLockParticipants} className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Participants & Proceed to Drawing
                </Button>
              </CardContent>
            </Card>
          )}

          {isParticipantsLocked && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Lock className="h-5 w-5" />
                    <span className="font-medium">
                      Participants Locked - Ready for Drawing
                    </span>
                  </div>
                </CardContent>
              </Card>

              <LotteryRoulette
                participants={eligibleParticipants}
                rewards={rewards}
                onDrawComplete={handleDrawComplete}
                isLocked={isParticipantsLocked}
              />
            </>
          )}
        </div>
      )}

      {step === "results" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Drawing Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-2xl font-bold mb-2">
                Congratulations to All Winners!
              </h3>
              <p className="text-muted-foreground">
                {winners.length} winners have been selected from{" "}
                {eligibleParticipants.length} eligible participants
              </p>
            </div>

            <div className="space-y-4">
              {winners.map((winner, index) => (
                <div
                  key={`${winner.participant.id}-${winner.reward.id}-${index}`}
                  className="flex items-center justify-between p-6 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-yellow-800" />
                    </div>
                    <div>
                      <div className="text-xl font-bold">
                        {winner.participant.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">
                          {winner.participant.subscriptionPlan}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Won at {winner.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary">
                      {winner.reward.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {winner.reward.type === "custom"
                        ? "Custom Reward"
                        : "Subscription Reward"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {winners.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Winners
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {eligibleParticipants.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Participants
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      (winners.length / eligibleParticipants.length) * 100
                    )}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={exportWinnersToExcel}
                  size="lg"
                  className="px-8"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Winners to Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
