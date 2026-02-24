import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CreatorProScoreBadge } from "@/components/ui/creator-pro-score-badge";
import { 
  TrendingUp, 
  TrendingDown, 
  FileCheck, 
  FileX, 
  Star, 
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScoreBreakdownCardProps {
  score: {
    total: number;
    validation: number;
    community: number;
    status: 'active' | 'warning' | 'blocked' | 'suspended';
  };
  stats: {
    totalPublications: number;
    approvedPublications: number;
    rejectedPublications: number;
    totalRatings: number;
    averageRating: number;
    totalReports: number;
    confirmedReports: number;
  };
  className?: string;
}

export function ScoreBreakdownCard({ score, stats, className }: ScoreBreakdownCardProps) {
  const approvalRate = stats.totalPublications > 0 
    ? (stats.approvedPublications / stats.totalPublications) * 100 
    : 100;

  const getStatusMessage = () => {
    switch (score.status) {
      case 'suspended':
        return { 
          icon: XCircle, 
          text: 'Your account is suspended. Contact support.',
          color: 'text-destructive'
        };
      case 'blocked':
        return { 
          icon: AlertTriangle, 
          text: 'Publishing is temporarily blocked. Improve your score.',
          color: 'text-amber-500'
        };
      case 'warning':
        return { 
          icon: AlertTriangle, 
          text: 'Your score is low. Focus on quality to avoid restrictions.',
          color: 'text-amber-500'
        };
      default:
        return { 
          icon: CheckCircle2, 
          text: 'Your account is in good standing.',
          color: 'text-emerald-500'
        };
    }
  };

  const statusInfo = getStatusMessage();
  const StatusIcon = statusInfo.icon;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Creator Community Score</CardTitle>
          <CreatorProScoreBadge score={score.total} status={score.status} size="lg" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Message */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          score.status === 'active' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        )}>
          <StatusIcon className={cn("h-5 w-5", statusInfo.color)} />
          <span className={cn("text-sm", statusInfo.color)}>{statusInfo.text}</span>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Validation Score (60%)</span>
              <span className="font-medium">{score.validation.toFixed(1)}</span>
            </div>
            <Progress value={score.validation} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Community Score (40%)</span>
              <span className="font-medium">{score.community.toFixed(1)}</span>
            </div>
            <Progress value={score.community} className="h-2" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCheck className="h-4 w-4 text-emerald-500" />
              Publications
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.approvedPublications}</span>
              <span className="text-xs text-muted-foreground">
                / {stats.totalPublications} total
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {approvalRate.toFixed(0)}% approval rate
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileX className="h-4 w-4 text-destructive" />
              Rejections
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.rejectedPublications}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Affects validation score
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-amber-400" />
              Ratings
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({stats.totalRatings} total)
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Reports
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stats.confirmedReports}</span>
              <span className="text-xs text-muted-foreground">
                confirmed
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoreBreakdownCard;
