import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrustedArranger {
  user_id: string;
  name: string;
  avatar: string | null;
  arrangements: number;
  isTrusted: boolean;
  creator_slug?: string;
  creator_type?: string;
}

async function fetchTrustedArrangers(): Promise<TrustedArranger[]> {
  const { data, error } = await supabase.functions.invoke("trusted-arrangers");

  if (error) {
    console.error("Error fetching trusted arrangers:", error);
    throw error;
  }

  return data || [];
}

export function useTrustedArrangers() {
  return useQuery({
    queryKey: ["trusted-arrangers"],
    queryFn: fetchTrustedArrangers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  });
}

export default useTrustedArrangers;
