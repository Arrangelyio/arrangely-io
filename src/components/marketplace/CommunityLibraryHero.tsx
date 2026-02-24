import { cn } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MarketplaceTab } from "./MarketplaceTabs";

interface CommunityLibraryHeroProps {
  className?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isAnalyzing?: boolean;
  activeTab: MarketplaceTab;
}

const getTabDescription = (tab: MarketplaceTab, t: (key: string) => string): string => {
  switch (tab) {
    case 'verified':
      return "Curated arrangements from our verified creators and professionals";
    case 'community':
      return "Discover arrangements shared by our passionate community members";
    case 'all':
      return "Explore all arrangements from verified creators and community contributors";
    default:
      return "Discover quality arrangements for any song";
  }
};

export function CommunityLibraryHero({ 
  className, 
  searchTerm, 
  onSearchChange, 
  isAnalyzing = false,
  activeTab
}: CommunityLibraryHeroProps) {
  const { t } = useLanguage();
  
  return (
    <div 
      className={cn(
        "relative w-full overflow-hidden rounded-xl",
        "bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800",
        className
      )}
    >
      {/* Abstract Equalizer Art - Colorful Bars (scaled down) */}
      <div className="absolute inset-0 flex items-end justify-center gap-0.5 sm:gap-1 px-4 pb-2 opacity-60">
        {/* Cyan/Teal bars */}
        <div className="w-2 sm:w-3 h-6 sm:h-8 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-2 sm:w-3 h-10 sm:h-14 bg-gradient-to-t from-cyan-500 to-teal-400 rounded-t-sm animate-pulse" style={{ animationDelay: '150ms' }} />
        
        {/* Orange/Red bars */}
        <div className="w-2 sm:w-3 h-8 sm:h-12 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-sm animate-pulse" style={{ animationDelay: '300ms' }} />
        <div className="w-2 sm:w-3 h-12 sm:h-16 bg-gradient-to-t from-red-600 to-orange-500 rounded-t-sm animate-pulse" style={{ animationDelay: '100ms' }} />
        
        {/* Yellow/Amber bars */}
        <div className="w-2 sm:w-3 h-10 sm:h-14 bg-gradient-to-t from-amber-600 to-yellow-400 rounded-t-sm animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-2 sm:w-3 h-6 sm:h-10 bg-gradient-to-t from-yellow-500 to-amber-400 rounded-t-sm animate-pulse" style={{ animationDelay: '350ms' }} />
        
        {/* Green bars */}
        <div className="w-2 sm:w-3 h-10 sm:h-14 bg-gradient-to-t from-emerald-600 to-green-400 rounded-t-sm animate-pulse" style={{ animationDelay: '250ms' }} />
        <div className="w-2 sm:w-3 h-6 sm:h-8 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-sm animate-pulse" style={{ animationDelay: '400ms' }} />
        
        {/* Pink/Magenta bars */}
        <div className="w-2 sm:w-3 h-12 sm:h-16 bg-gradient-to-t from-pink-600 to-fuchsia-400 rounded-t-sm animate-pulse" style={{ animationDelay: '50ms' }} />
        <div className="w-2 sm:w-3 h-8 sm:h-12 bg-gradient-to-t from-fuchsia-600 to-pink-400 rounded-t-sm animate-pulse" style={{ animationDelay: '300ms' }} />
        
        {/* Additional cyan bars */}
        <div className="w-2 sm:w-3 h-8 sm:h-10 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="w-2 sm:w-3 h-6 sm:h-8 bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-sm animate-pulse" style={{ animationDelay: '350ms' }} />
      </div>
      
      {/* Glow effects behind bars */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-20 h-16 bg-cyan-500/20 blur-2xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-20 bg-orange-500/20 blur-2xl" />
        <div className="absolute bottom-0 right-1/4 w-20 h-16 bg-pink-500/20 blur-2xl" />
      </div>
      
      {/* Overlay gradient for better readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-slate-900/40" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-4 sm:py-5">
        {/* Title */}
        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
          Discover
        </h1>
        
        {/* Dynamic description based on active tab */}
        <p className="text-xs sm:text-sm text-white/70 mb-3 max-w-md">
          {getTabDescription(activeTab, t)}
        </p>
        
        {/* Search Bar integrated inside hero */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 h-4 w-4" />
          {isAnalyzing && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-white/70" />
          )}
          <Input
            placeholder="Search songs, artists, or creators..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 sm:h-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30"
          />
        </div>
      </div>
    </div>
  );
}

export default CommunityLibraryHero;
