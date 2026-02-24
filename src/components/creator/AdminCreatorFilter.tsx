import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Users, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Creator {
  user_id: string;
  display_name: string;
  creator_type: string;
}

interface AdminCreatorFilterProps {
  selectedCreatorType: string;
  onCreatorTypeChange: (value: string) => void;
  selectedCreatorId: string | null;
  onCreatorSelect: (creatorId: string | null, creatorName: string | null) => void;
}

const AdminCreatorFilter = ({ 
  selectedCreatorType, 
  onCreatorTypeChange,
  selectedCreatorId,
  onCreatorSelect
}: AdminCreatorFilterProps) => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Track previous type to detect actual changes
  const [prevType, setPrevType] = useState<string | null>(null);

  // Fetch creators when type changes
  useEffect(() => {
    const fetchCreators = async () => {
      if (selectedCreatorType === "all") {
        setCreators([]);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, creator_type')
        .eq('role', 'creator')
        .eq('creator_type', selectedCreatorType)
        .eq('is_production', true)
        .order('display_name');
      
      setCreators(data || []);
      setLoading(false);
    };

    fetchCreators();
    
    // Only reset selection when type actually changes (not on initial mount)
    if (prevType !== null && prevType !== selectedCreatorType) {
      onCreatorSelect(null, null);
      setSearchQuery("");
    }
    setPrevType(selectedCreatorType);
  }, [selectedCreatorType]);

  // Filter creators by search query
  const filteredCreators = creators.filter(creator =>
    creator.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatorSelect = (creatorId: string) => {
    const creator = creators.find(c => c.user_id === creatorId);
    onCreatorSelect(creatorId, creator?.display_name || null);
  };

  const handleClearSelection = () => {
    onCreatorSelect(null, null);
    setSearchQuery("");
  };

  const selectedCreator = creators.find(c => c.user_id === selectedCreatorId);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Admin View:</span>
      </div>
      
      {/* Creator Type Dropdown */}
      <Select value={selectedCreatorType} onValueChange={onCreatorTypeChange}>
        <SelectTrigger className="w-[200px] bg-background">
          <SelectValue placeholder="Select creator type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All (My Data)</SelectItem>
          <SelectItem value="creator_professional">Creator Professional</SelectItem>
          <SelectItem value="creator_arrangely">Creator Arrangely</SelectItem>
        </SelectContent>
      </Select>

      {/* Creator Search/Select - Only show when a type is selected */}
      {selectedCreatorType !== "all" && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedCreatorId ?? undefined} 
              onValueChange={handleCreatorSelect}
            >
              <SelectTrigger className="w-[280px] bg-background pl-9">
                <SelectValue placeholder={loading ? "Loading creators..." : "Search creator name..."} />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <Input
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredCreators.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    {loading ? "Loading..." : "No creators found"}
                  </div>
                ) : (
                  filteredCreators.map((creator) => (
                    <SelectItem key={creator.user_id} value={creator.user_id}>
                      {creator.display_name || "Unknown Creator"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedCreatorId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSelection}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Show selected creator info */}
      {selectedCreator && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
          <span className="text-sm font-medium text-primary">
            Viewing: {selectedCreator.display_name}
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminCreatorFilter;
