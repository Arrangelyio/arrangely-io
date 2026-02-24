import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const VerifiedBadge = ({ className, size = "sm" }: VerifiedBadgeProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  };

  return (
    <div 
      className={cn(
        "bg-blue-500 rounded-full flex items-center justify-center",
        sizeClasses[size],
        className
      )}
      aria-label="Verified Professional Creator"
    >
      <Check className="text-white h-2.5 w-2.5" />
    </div>
  );
};

export default VerifiedBadge;