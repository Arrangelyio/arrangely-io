import { useState, useMemo } from "react";
import { Search, Crown, ShieldCheck, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { CreatorCardSkeleton } from "@/components/creators/CreatorCardSkeleton";
import { InstrumentFilter } from "@/components/creators/InstrumentFilter";
import {
  useCreatorDirectory,
  type CreatorTierFilter,
} from "@/hooks/useCreatorDirectory";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const PAGE_SIZE = 18;

export default function CreatorListPage() {
  const [searchInput, setSearchInput] = useState("");
  const [tierFilter, setTierFilter] = useState<CreatorTierFilter>("all");
  const [instrumentFilter, setInstrumentFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  const debouncedSearch = useDebounce(searchInput, 300);

  const { data, isLoading, error } = useCreatorDirectory({
    search: debouncedSearch,
    tierFilter,
    instrumentFilter,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  // Log error for debugging
  if (error) {
    console.error("Creator Directory Error:", error);
  }

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / PAGE_SIZE);
  }, [data?.total]);

  const handleTierChange = (value: string) => {
    setTierFilter(value as CreatorTierFilter);
    setCurrentPage(1);
  };

  const handleInstrumentChange = (instrument: string | null) => {
    setInstrumentFilter(instrument);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`pb-24 px-4 md:px-6 lg:px-8 
        ${Capacitor.isNativePlatform() ? "pt-36" : "pt-24"}
      `}>
        
        {/* Header */}

        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Discover Musicians
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Tier Tabs */}
        <div className="flex justify-center mb-6">
          <Tabs
            value={tierFilter}
            onValueChange={handleTierChange}
            className="w-full max-w-lg"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="verified" className="text-xs sm:text-sm">
                <ShieldCheck className="h-3 w-3 mr-1 hidden sm:inline" />
                Verified
              </TabsTrigger>
              <TabsTrigger value="community" className="text-xs sm:text-sm">
                <Users className="h-3 w-3 mr-1 hidden sm:inline" />
                Community
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Instrument Filter */}
        <div className="mb-8">
          <InstrumentFilter
            selectedInstrument={instrumentFilter}
            onSelect={handleInstrumentChange}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-destructive mb-2">
              Failed to load creators. Please try again.
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.creators.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No creators found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Creator Grid */}
        {!isLoading && !error && data && data.creators.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data.creators.map((creator) => (
                <CreatorCard key={creator.user_id} creator={creator} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            {/* Results count */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, data.total)} of {data.total}{" "}
              creators
            </p>
          </>
        )}
      </div>
    </div>
  );
}
