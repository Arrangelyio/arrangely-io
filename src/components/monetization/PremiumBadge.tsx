import { Crown, Lock, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  variant?: "default" | "lock" | "small" | "basic" | "trial" | "community" | "pro";
  price?: string;
  label?: string;
}

const PremiumBadge = ({
  className,
  variant = "default",
  price,
  label,
}: PremiumBadgeProps) => {
  // BASIC PLAN
  if (variant === "basic") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
          "bg-gradient-to-r from-[hsl(var(--basic-primary))] to-[hsl(var(--basic-primary-light))]",
          "text-white shadow-[var(--basic-shadow)] border border-[var(--basic-border)]",
          "transition-all duration-300 hover:shadow-md hover:scale-[1.03]",
          "max-w-fit",
          className
        )}
      >
        <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span className="truncate">Basic Plan</span>
      </div>
    );
  }

  // LOCK (Premium Locked)
  if (variant === "lock") {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 text-[10px] sm:text-xs font-semibold",
          "bg-accent/10 text-accent border border-accent/20",
          "rounded-full max-w-fit",
          className
        )}
      >
        <Lock className="h-3 w-3" />
        Premium
      </Badge>
    );
  }

  if (variant === "community") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
          "bg-gradient-to-r from-[hsl(var(--basic-primary))] to-[hsl(var(--basic-primary-light))]",
          "text-white shadow-[var(--basic-shadow)] border border-[var(--basic-border)]",
          "transition-all duration-300 hover:shadow-md hover:scale-[1.03]",
          "max-w-fit",
          className
        )}
      >
        <span className="truncate">Community</span>
      </div>
    );
  }

  // LOCK (Premium Locked)
  if (variant === "pro") {
    return (
      <Badge
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 hover:from-blue-600 hover:to-cyan-600",
          "border border-accent/20",
          "rounded-full max-w-fit",
          className
        )}
      >
        <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
        Verified
      </Badge>

    );
  }

  // FREE TRIAL
  if (variant === "trial") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
          "bg-gradient-to-r from-[hsl(var(--premium-gold))] to-[hsl(var(--premium-gold-dark))]",
          "text-white shadow-[var(--premium-shadow)] border border-[hsl(var(--premium-gold-dark))]/20",
          "transition-all duration-300 hover:shadow-lg hover:scale-[1.03]",
          "max-w-fit",
          className
        )}
      >
        Free Trial
      </div>
    );
  }

  // SMALL PREMIUM
  if (variant === "small") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold",
          "bg-gradient-to-r from-purple-500 to-violet-500",
          "text-white shadow-lg border border-purple-400/20",
          "transition-all duration-300 hover:shadow-lg hover:scale-[1.03]",
          "max-w-fit",
          className
        )}
      >
        <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span>{label || "Premium"}</span>
      </div>
    );
  }

  // DEFAULT (FULL PREMIUM)
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-semibold",
        "bg-gradient-to-r from-purple-500 to-violet-500",
        "text-white shadow-lg border border-purple-400/20",
        "transition-all duration-300 hover:shadow-lg hover:scale-[1.03]",
        "max-w-fit",
        className
      )}
    >
      <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span>
        Premium {price && <span className="hidden sm:inline">• {price}</span>}
      </span>
      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-80" />
    </div>
  );
};

export default PremiumBadge;
