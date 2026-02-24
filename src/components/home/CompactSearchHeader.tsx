import { useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CompactSearchHeaderProps {
  className?: string;
  showLogo?: boolean;
  placeholder?: string;
}

export function CompactSearchHeader({
  className,
  showLogo = true,
  placeholder = "Search songs, artists, creators...",
}: CompactSearchHeaderProps) {
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/community-library?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleClear = () => {
    setSearchValue("");
  };

  return (
    <div className={cn("px-4 pt-4 pb-2", className)}>
      {/* Logo and Title */}
      {showLogo && (
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/LOGO_BACK.png"
            alt="Arrangely"
            className="h-10 w-10 object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-foreground">Discover</h1>
            <p className="text-xs text-muted-foreground">
              Find your next arrangement
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <div
          className={cn(
            "relative flex items-center bg-muted/50 rounded-xl border transition-all duration-200",
            isFocused
              ? "border-primary/50 bg-muted/80 shadow-sm"
              : "border-transparent"
          )}
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
          {searchValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="absolute right-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CompactSearchHeader;
