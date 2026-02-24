import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';

// Configuration for export limits
const EXPORT_CONFIG = {
  FREE_TIER_MONTHLY_LIMIT: 3,       // Configurable limit for non-subscribed users
  PREMIUM_TIER_MONTHLY_LIMIT: -1    // -1 means unlimited
};

interface ExportUsage {
  currentMonthCount: number;
  limit: number;
  canExport: boolean;
  isUnlimited: boolean;
}

export const useExportLimit = () => {
  const [exportUsage, setExportUsage] = useState<ExportUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscriptionStatus } = useSubscription();

  const checkExportUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setExportUsage({
          currentMonthCount: 0,
          limit: EXPORT_CONFIG.FREE_TIER_MONTHLY_LIMIT,
          canExport: true,
          isUnlimited: false
        });
        setLoading(false);
        return;
      }

      // Step 1: Ambil limit dari RPC
      const { data: planLimit, error: limitError } = await supabase.rpc(
        'get_user_pdf_export_limit',
        { user_id_param: user.id }
      );

      if (limitError) {
        console.error("Error fetching export limit:", limitError);
        setLoading(false);
        return;
      }

      // Step 2: Hitung export bulan ini
      const { data: countData, error: countError } = await supabase.rpc(
        'get_user_monthly_export_count',
        { user_id: user.id }
      );

      if (countError) {
        console.error("Error fetching export count:", countError);
        setLoading(false);
        return;
      }

      const currentMonthCount = countData ?? 0;
      const finalLimit = planLimit ?? EXPORT_CONFIG.FREE_TIER_MONTHLY_LIMIT;

      const isUnlimited = finalLimit === -1;
      const canExport = isUnlimited || currentMonthCount < finalLimit;

      setExportUsage({
        currentMonthCount,
        limit: finalLimit,
        canExport,
        isUnlimited
      });
    } catch (error) {
      console.error("Error checking export usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const recordExport = async (songId?: string, exportType: string = 'song') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('pdf_export_usage')
        .insert({
          user_id: user.id,
          song_id: songId || null,
          export_type: exportType
        });

      if (error) {
        console.error('Error recording export:', error);
        return false;
      }

      await checkExportUsage();
      return true;
    } catch (error) {
      console.error('Error recording export:', error);
      return false;
    }
  };

  useEffect(() => {
    checkExportUsage();
  }, [subscriptionStatus]);

  return {
    exportUsage,
    loading,
    checkExportUsage,
    recordExport,
    config: EXPORT_CONFIG
  };
};
