import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/contexts/SubscriptionContext';

// Configuration for YouTube import limits
const YOUTUBE_IMPORT_CONFIG = {
  FREE_TIER_MONTHLY_LIMIT: 3, // Configurable limit for non-subscribed users
  PREMIUM_TIER_MONTHLY_LIMIT: -1 // -1 means unlimited
};

interface YouTubeImportUsage {
  currentMonthCount: number;
  limit: number;
  canImport: boolean;
  isUnlimited: boolean;
}

export const useYouTubeImportLimit = () => {
  const [importUsage, setImportUsage] = useState<YouTubeImportUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const { subscriptionStatus } = useSubscription();

  const checkImportUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setImportUsage(null);
        setLoading(false);
        return;
      }

      // Get current month's import count using the database function
      const { data: countData, error } = await supabase.rpc(
        'get_user_monthly_youtube_import_count',
        { user_id: user.id }
      );

      if (error) {
        console.error('Error fetching YouTube import count:', error);
        setLoading(false);
        return;
      }

      const currentMonthCount = countData || 0;
      const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription || subscriptionStatus?.isTrialing;
      
      const limit = hasActiveSubscription 
        ? YOUTUBE_IMPORT_CONFIG.PREMIUM_TIER_MONTHLY_LIMIT 
        : YOUTUBE_IMPORT_CONFIG.FREE_TIER_MONTHLY_LIMIT;

      const isUnlimited = limit === -1;
      const canImport = isUnlimited || currentMonthCount < limit;

      setImportUsage({
        currentMonthCount,
        limit,
        canImport,
        isUnlimited
      });
    } catch (error) {
      console.error('Error checking YouTube import usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const recordImport = async (youtubeUrl: string, importType: string = 'enhanced_analysis') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('youtube_import_usage')
        .insert({
          user_id: user.id,
          youtube_url: youtubeUrl,
          import_type: importType
        });

      if (error) {
        console.error('Error recording YouTube import:', error);
        return false;
      }

      // Refresh usage count
      await checkImportUsage();
      return true;
    } catch (error) {
      console.error('Error recording YouTube import:', error);
      return false;
    }
  };

  useEffect(() => {
    checkImportUsage();
  }, [subscriptionStatus]);

  return {
    importUsage,
    loading,
    checkImportUsage,
    recordImport,
    config: YOUTUBE_IMPORT_CONFIG
  };
};