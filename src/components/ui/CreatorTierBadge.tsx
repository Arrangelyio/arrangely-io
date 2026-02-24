import { Crown, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type CreatorTier = "arrangely" | "verified" | "community";

interface CreatorTierBadgeProps {
  tier: CreatorTier;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

const tierConfig = {
  arrangely: {
    label: "Arrangely",
    tooltip: "Curated by Arrangely - Highest quality arrangements",
    icon: Crown,
    bgClass: "bg-gradient-to-r from-amber-500 to-orange-500",
    textClass: "text-white",
    iconClass: "text-white",
  },
  verified: {
    label: "Verified",
    tooltip: "Verified Professional - Quality reviewed creator",
    icon: ShieldCheck,
    bgClass: "bg-gradient-to-r from-blue-500 to-cyan-500",
    textClass: "text-white",
    iconClass: "text-white",
  },
  community: {
    label: "Community",
    tooltip: "Community Contribution - User submitted arrangement",
    icon: Users,
    bgClass: "bg-purple-500/20 border border-purple-500/30",
    textClass: "text-purple-300",
    iconClass: "text-purple-400",
  },
};

const sizeConfig = {
  xs: {
    badge: "px-1 py-0 text-[8px]",
    icon: "h-2 w-2",
    gap: "gap-0.5",
  },
  sm: {
    badge: "px-1.5 py-0 text-[9px]",
    icon: "h-2.5 w-2.5",
    gap: "gap-0.5",
  },
  md: {
    badge: "px-2 py-0.5 text-[10px]",
    icon: "h-3 w-3",
    gap: "gap-1",
  },
  lg: {
    badge: "px-2.5 py-1 text-xs",
    icon: "h-3.5 w-3.5",
    gap: "gap-1",
  },
};

export function CreatorTierBadge({
  tier,
  size = "sm",
  showLabel = true,
  showIcon = true,
  showTooltip = true,
  className,
}: CreatorTierBadgeProps) {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const badge = (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        sizeStyles.badge,
        sizeStyles.gap,
        config.bgClass,
        config.textClass,
        className
      )}
    >
      {showIcon && <Icon className={cn(sizeStyles.icon, config.iconClass)} />}
      {showLabel && <span>{config.label}</span>}
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper function to get tier from creator_type database value
export function getTierFromCreatorType(
  creatorType: string | undefined | null
): CreatorTier | null {
  if (creatorType === "creator_arrangely") return "arrangely";
  if (creatorType === "creator_professional") return "verified";
  if (creatorType === "creator_pro") return "community";
  return null;
}

// Helper to get ring class for avatar/thumbnail borders
export function getTierRingClass(tier: CreatorTier | null): string {
  if (tier === "arrangely") {
    return "bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 p-[2px] animate-shimmer bg-[length:200%_100%]";
  }
  if (tier === "verified") {
    return "border-2 border-blue-500 p-[1px]";
  }
  return "border border-muted";
}

export default CreatorTierBadge;
