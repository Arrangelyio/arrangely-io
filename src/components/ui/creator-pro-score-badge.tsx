import { Star, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorProScoreBadgeProps {
  score: number;
  status?: 'active' | 'warning' | 'blocked' | 'suspended';
  className?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function CreatorProScoreBadge({ 
  score, 
  status = 'active',
  className, 
  size = "md",
  showTooltip = true 
}: CreatorProScoreBadgeProps) {
  const getScoreTier = () => {
    if (score >= 85) return { tier: 'gold', label: 'Excellent', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' };
    if (score >= 70) return { tier: 'silver', label: 'Good', color: 'text-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-500/30' };
    if (score >= 50) return { tier: 'bronze', label: 'Fair', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' };
    if (score >= 30) return { tier: 'warning', label: 'Needs Improvement', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    return { tier: 'suspended', label: 'Suspended', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
  };

  const tier = getScoreTier();

  const sizeClasses = {
    sm: { icon: "h-3 w-3", text: "text-xs", padding: "px-1.5 py-0.5" },
    md: { icon: "h-4 w-4", text: "text-sm", padding: "px-2 py-1" },
    lg: { icon: "h-5 w-5", text: "text-base", padding: "px-3 py-1.5" }
  };

  const Icon = status === 'suspended' ? XCircle : status === 'warning' || status === 'blocked' ? AlertTriangle : Star;

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
        tier.bg,
        tier.border,
        sizeClasses[size].padding,
        className
      )}
      title={showTooltip ? `${tier.label} - Score: ${score}` : undefined}
    >
      <Icon className={cn(
        sizeClasses[size].icon,
        tier.color,
        tier.tier === 'gold' && "fill-amber-400/30"
      )} />
      <span className={cn(
        sizeClasses[size].text,
        "font-semibold",
        tier.color
      )}>
        {Math.round(score)}
      </span>
    </div>
  );
}

export default CreatorProScoreBadge;
