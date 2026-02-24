import { cn } from '@/lib/utils';

interface RecapProgressProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

export default function RecapProgress({ total, current, onDotClick }: RecapProgressProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300 hover:scale-125",
            index === current
              ? "bg-white w-6"
              : "bg-white/40 hover:bg-white/60"
          )}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  );
}
