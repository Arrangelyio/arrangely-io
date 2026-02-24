import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorProBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

/**
 * @deprecated Use CreatorTierBadge with tier="community" instead
 */
export function CreatorProBadge({ 
  className, 
  size = "md",
  showLabel = false 
}: CreatorProBadgeProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
      "bg-purple-500/20",
      "border border-purple-500/30",
      className
    )}>
      <Users className={cn(
        sizeClasses[size],
        "text-purple-400"
      )} />
      {showLabel && (
        <span className={cn(
          textSizeClasses[size],
          "font-medium text-purple-300"
        )}>
          Community
        </span>
      )}
    </div>
  );
}

export default CreatorProBadge;
