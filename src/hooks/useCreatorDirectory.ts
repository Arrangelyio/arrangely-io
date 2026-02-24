import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CreatorTierFilter = "all" | "verified" | "community";

export interface CreatorDirectoryItem {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  instruments: string[] | null;
  city: string | null;
  country: string | null;
  creator_slug: string;
  creator_type: string;
  song_count: number;
  follower_count: number;
}

interface UseCreatorDirectoryParams {
  search?: string;
  tierFilter?: CreatorTierFilter;
  instrumentFilter?: string | null;
  page?: number;
  pageSize?: number;
}

const CREATOR_TYPE_MAP: Record<CreatorTierFilter, string[]> = {
  all: ["creator_arrangely", "creator_professional", "creator_pro"],
  verified: ["creator_professional"],
  community: ["creator_pro", "creator_arrangely"],
};

export function useCreatorDirectory({
  search = "",
  tierFilter = "all",
  instrumentFilter = null,
  page = 1,
  pageSize = 18,
}: UseCreatorDirectoryParams = {}) {
  return useQuery({
    queryKey: ["creator-directory", search, tierFilter, instrumentFilter, page, pageSize],
    queryFn: async () => {
      const creatorTypes = CREATOR_TYPE_MAP[tierFilter];
      const offset = (page - 1) * pageSize;

      try {
        
        
        // Fetch all matching creators
        const { data: allProfiles, error: fetchError } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, bio, instruments, city, country, creator_slug, creator_type")
          .eq("role", "creator")
          .not("creator_slug", "is", null)
          .order("display_name", { ascending: true });

        // Filter by creator type client-side to avoid potential .in() issues
        const filteredByType = (allProfiles || []).filter(p => 
          creatorTypes.includes(p.creator_type)
        );

        

        if (fetchError) {
          console.error("Error fetching creators:", fetchError);
          throw new Error(`Failed to fetch creators: ${fetchError.message}`);
        }

        if (!filteredByType || filteredByType.length === 0) {
          
          return { creators: [], total: 0 };
        }

        // Apply client-side filtering for search and instrument
        let filteredProfiles = filteredByType;
        
        if (search.trim()) {
          const searchLower = search.trim().toLowerCase();
          filteredProfiles = filteredProfiles.filter(p => 
            p.display_name?.toLowerCase().includes(searchLower)
          );
        }
        
        if (instrumentFilter) {
          const filterLower = instrumentFilter.toLowerCase();
          filteredProfiles = filteredProfiles.filter(p => 
            p.instruments?.some((inst: string) => {
              // Clean the instrument and compare case-insensitively
              let cleaned = inst.trim();
              if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                  (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
                cleaned = cleaned.slice(1, -1);
              }
              return cleaned.toLowerCase() === filterLower;
            })
          );
        }

        const total = filteredProfiles.length;
        
        // Apply pagination
        const paginatedProfiles = filteredProfiles.slice(offset, offset + pageSize);

        if (paginatedProfiles.length === 0) {
          return { creators: [], total: 0 };
        }

        // Get song counts and follower counts for paginated creators
        const userIds = paginatedProfiles.map((p) => p.user_id);

        // Fetch song counts
        const { data: songCounts } = await supabase
          .from("songs")
          .select("user_id")
          .in("user_id", userIds)
          .eq("is_public", true);

        const songCountMap = new Map<string, number>();
        songCounts?.forEach((s) => {
          songCountMap.set(s.user_id, (songCountMap.get(s.user_id) || 0) + 1);
        });

        // Fetch follower counts
        const { data: followerCounts } = await supabase
          .from("user_follows")
          .select("following_id")
          .in("following_id", userIds);

        const followerCountMap = new Map<string, number>();
        followerCounts?.forEach((f) => {
          followerCountMap.set(
            f.following_id,
            (followerCountMap.get(f.following_id) || 0) + 1
          );
        });

        // Combine data
        const creators: CreatorDirectoryItem[] = paginatedProfiles.map((p) => ({
          user_id: p.user_id,
          display_name: p.display_name || "Unknown Creator",
          avatar_url: p.avatar_url,
          bio: p.bio,
          instruments: p.instruments,
          city: p.city,
          country: p.country,
          creator_slug: p.creator_slug!,
          creator_type: p.creator_type || "creator_pro",
          song_count: songCountMap.get(p.user_id) || 0,
          follower_count: followerCountMap.get(p.user_id) || 0,
        }));

        // Sort by song count descending
        creators.sort((a, b) => b.song_count - a.song_count);

        

        return {
          creators,
          total,
        };
      } catch (err) {
        console.error("useCreatorDirectory error:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper function to clean and normalize instrument names
function normalizeInstrument(instrument: string): string {
  // Remove surrounding quotes and trim whitespace
  let cleaned = instrument.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  // Capitalize first letter, lowercase the rest
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

// Get all unique instruments from creators for filter options
export function useCreatorInstruments() {
  return useQuery({
    queryKey: ["creator-instruments"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("instruments, creator_type")
          .eq("role", "creator")
          .not("instruments", "is", null);

        // Filter client-side
        const creatorsWithInstruments = (data || []).filter(p =>
          ["creator_arrangely", "creator_professional", "creator_pro"].includes(p.creator_type)
        );

        if (error) {
          console.error("Error fetching instruments:", error);
          return [];
        }

        // Flatten, clean, and dedupe instruments (case-insensitive)
        const instrumentMap = new Map<string, string>();
        creatorsWithInstruments.forEach((profile) => {
          if (Array.isArray(profile.instruments)) {
            profile.instruments.forEach((instrument: string) => {
              if (instrument && typeof instrument === 'string') {
                const normalized = normalizeInstrument(instrument);
                const key = normalized.toLowerCase();
                // Keep the first occurrence (properly formatted)
                if (!instrumentMap.has(key)) {
                  instrumentMap.set(key, normalized);
                }
              }
            });
          }
        });

        return Array.from(instrumentMap.values()).sort();
      } catch (err) {
        console.error("useCreatorInstruments error:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
