import { Badge } from "@/components/ui/badge";
import { Trophy, CheckCircle } from "lucide-react";

interface CompletedTestsListProps {
  completedTests: any[];
  onTestClick?: (test: any) => void;
}

const tierEmojis: Record<string, string> = {
  beginner: "🌱",
  intermediate: "🌿",
  advanced: "🌳",
  master: "⭐",
};

const getTierName = (tierNumber: number): string => {
  const tierMap: Record<number, string> = {
    1: "beginner",
    2: "intermediate",
    3: "advanced",
    4: "master"
  };
  return tierMap[tierNumber] || "beginner";
};

export const CompletedTestsList = ({ completedTests, onTestClick }: CompletedTestsListProps) => {
  if (completedTests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No completed tests yet. Start your journey!</p>
      </div>
    );
  }

  // 🔥 SORTING BY TIER BEFORE RENDERING
  const sortedTests = [...completedTests].sort(
  (a, b) => a.current_tier - b.current_tier
);


  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold">Your Completed Assessments</h3>
      </div>

      <div className="grid gap-2">
        {sortedTests.map((test) => {
          const tierName = getTierName(test.current_tier);
          return (
            <div
              key={test.id}
              onClick={() => onTestClick?.(test)}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div>
                  <p className="font-medium text-sm">
                    {test.sub_category 
                      ? `${test.sub_category.charAt(0).toUpperCase() + test.sub_category.slice(1)} (${test.category})`
                      : test.category.replace('_', ' ').charAt(0).toUpperCase() + test.category.replace('_', ' ').slice(1)
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Score: {test.total_score}
                  </p>
                </div>
              </div>

              <Badge variant="secondary" className="gap-1">
                {tierEmojis[tierName]}
                {tierName}
              </Badge>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Try a different category or instrument to test your skills!
      </p>
    </div>
  );
};
