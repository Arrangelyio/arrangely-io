import { Badge } from "@/components/ui/badge";
import { Volume2, Headphones } from "lucide-react";

interface SequencerBadgeProps {
  trackCount?: number;
  price?: number;
  currency?: string;
  variant?: "default" | "compact" | "pill";
  className?: string;
}

export const SequencerBadge = ({
  trackCount,
  price,
  currency = "IDR",
  variant = "default",
  className = "",
}: SequencerBadgeProps) => {
  const formatPrice = (amount: number) => {
    if (currency === "IDR") {
      if (amount >= 1000) {
        return `Rp${Math.floor(amount / 1000)}K`;
      }
      return `Rp${amount}`;
    }
    return `$${amount}`;
  };

  if (variant === "compact") {
    return (
      <Badge 
        className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] px-1.5 py-0.5 ${className}`}
      >
        <Headphones className="w-2.5 h-2.5 mr-0.5" />
        Stems
      </Badge>
    );
  }

  if (variant === "pill") {
    return (
      <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full px-2.5 py-1 ${className}`}>
        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <Volume2 className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
          {trackCount ? `${trackCount} Tracks` : "Audio Stems"}
        </span>
        {price && (
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
            {formatPrice(price)}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge 
      className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg shadow-purple-500/20 ${className}`}
    >
      <Volume2 className="w-3 h-3 mr-1" />
      {trackCount ? `${trackCount} Tracks` : "Audio Stems"}
      {price && (
        <span className="ml-1.5 font-bold">
          • {formatPrice(price)}
        </span>
      )}
    </Badge>
  );
};

export default SequencerBadge;
