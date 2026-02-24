import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ShoppingBag, LayoutGrid } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type OwnershipFilter = "all" | "owned" | "available";

interface SequencerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  ownershipFilter?: OwnershipFilter;
  onOwnershipFilterChange?: (value: OwnershipFilter) => void;
  counts?: {
    all: number;
    owned: number;
    available: number;
  };
  isLoggedIn?: boolean;
}

export const SequencerFilters = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  ownershipFilter = "all",
  onOwnershipFilterChange,
  counts,
  isLoggedIn = false,
}: SequencerFiltersProps) => {
  const { t } = useLanguage();

  const filterButtons: { value: OwnershipFilter; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { value: "owned", label: "My Purchases", icon: <Package className="w-3.5 h-3.5" /> },
    { value: "available", label: "Available", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Ownership Filter Tabs - Only show when logged in */}
      {isLoggedIn && onOwnershipFilterChange && (
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={ownershipFilter === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => onOwnershipFilterChange(btn.value)}
              className={`h-9 px-3 gap-1.5 transition-all ${
                ownershipFilter === btn.value 
                  ? btn.value === "owned" 
                    ? "bg-green-500 hover:bg-green-600 text-white" 
                    : ""
                  : ""
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
              {counts && (
                <Badge 
                  variant="secondary" 
                  className={`ml-1 text-xs h-5 px-1.5 ${
                    ownershipFilter === btn.value 
                      ? "bg-white/20 text-inherit" 
                      : "bg-muted"
                  }`}
                >
                  {counts[btn.value]}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("SequencerStore.search")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="tracks">Most Tracks</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SequencerFilters;
