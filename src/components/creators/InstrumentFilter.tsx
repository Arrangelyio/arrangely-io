import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCreatorInstruments } from "@/hooks/useCreatorDirectory";
import { Skeleton } from "@/components/ui/skeleton";

interface InstrumentFilterProps {
  selectedInstrument: string | null;
  onSelect: (instrument: string | null) => void;
}

export function InstrumentFilter({
  selectedInstrument,
  onSelect,
}: InstrumentFilterProps) {
  const { data: instruments, isLoading } = useCreatorInstruments();

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  const allInstruments = instruments || [];

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
            "border border-border hover:bg-accent",
            selectedInstrument === null
              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              : "bg-background text-foreground"
          )}
        >
          All
        </button>
        {allInstruments.map((instrument) => (
          <button
            key={instrument}
            onClick={() => onSelect(instrument)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              "border border-border hover:bg-accent",
              selectedInstrument === instrument
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "bg-background text-foreground"
            )}
          >
            {instrument}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

export default InstrumentFilter;
