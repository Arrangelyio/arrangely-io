import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type CreatorProFeatures = {
  earn_per_library_add?: number;
  earn_per_song_published?: number;
};

type UseCreatorProFeaturesResult = {
  features: CreatorProFeatures | null;
  earnPerLibraryAdd: number | null;
  earnPerSongPublished: number | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetch Creator Community earn values from `subscription_plans.features`.
 * If multiple active Creator Community/Pro plans exist (e.g. monthly/yearly), we take the MIN value
 * to avoid inconsistencies between rows.
 */
export function useCreatorProFeatures(): UseCreatorProFeaturesResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<CreatorProFeatures | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Query both "Creator Pro" and "Creator Community" for backwards compatibility
        const { data, error: plansError } = await supabase
          .from("subscription_plans")
          // features is JSONB; keep it raw and compute in JS
          .select("name, is_active, features")
          .eq("is_active", true)
          .or("name.ilike.%Creator Pro%,name.ilike.%Creator Community%")
          .limit(25);

        if (plansError) throw plansError;

        const rows = (data || []) as Array<{
          name: string;
          is_active: boolean;
          features: any;
        }>;

        const earnPerLibraryAddValues = rows
          .map((r) => Number(r?.features?.earn_per_library_add))
          .filter((v) => Number.isFinite(v));

        const earnPerSongPublishedValues = rows
          .map((r) => Number(r?.features?.earn_per_song_published))
          .filter((v) => Number.isFinite(v));

        const computed: CreatorProFeatures = {
          earn_per_library_add:
            earnPerLibraryAddValues.length > 0
              ? Math.max(...earnPerLibraryAddValues)
              : undefined,
          earn_per_song_published:
            earnPerSongPublishedValues.length > 0
              ? Math.min(...earnPerSongPublishedValues)
              : undefined,
        };

        if (!isMounted) return;
        setFeatures(computed);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load Creator Community features");
        setFeatures(null);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const earnPerLibraryAdd = useMemo(() => {
    const v = features?.earn_per_library_add;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }, [features]);

  const earnPerSongPublished = useMemo(() => {
    const v = features?.earn_per_song_published;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }, [features]);

  return {
    features,
    earnPerLibraryAdd,
    earnPerSongPublished,
    isLoading,
    error,
  };
}
