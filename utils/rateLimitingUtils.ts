import { supabase } from "@/integrations/supabase/client";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  suspicious: boolean;
}

export class ServerRateLimiter {
  private static async checkRateLimit(
    userId: string | null,
    ipAddress: string,
    endpoint: string,
    limit: number,
    windowMinutes: number = 1
  ): Promise<RateLimitResult> {
    try {
      // Calculate window start time
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

      // Get current rate limit data
      const { data: rateLimitData, error } = await supabase
        .from('rate_limits')
        .select('request_count, window_start')
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart.toISOString())
        .or(userId ? `user_id.eq.${userId}` : `ip_address.eq.${ipAddress}`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Rate limit check error:', error);
        return { allowed: true, remaining: limit, resetTime: now, suspicious: false };
      }

      let currentCount = 0;
      let windowStartTime = now;

      if (rateLimitData) {
        currentCount = rateLimitData.request_count;
        windowStartTime = new Date(rateLimitData.window_start);
      }

      // Check if we're within limits
      const allowed = currentCount < limit;
      const remaining = Math.max(0, limit - currentCount - 1);
      const resetTime = new Date(windowStartTime.getTime() + windowMinutes * 60 * 1000);

      // Detect suspicious activity
      const suspicious = currentCount > limit * 0.8; // 80% of limit reached

      if (allowed) {
        // Update or create rate limit record
        if (rateLimitData) {
          await supabase
            .from('rate_limits')
            .update({ 
              request_count: currentCount + 1,
              ip_address: ipAddress,
              user_id: userId
            })
            .eq('endpoint', endpoint)
            .gte('window_start', windowStart.toISOString())
            .or(userId ? `user_id.eq.${userId}` : `ip_address.eq.${ipAddress}`);
        } else {
          await supabase
            .from('rate_limits')
            .insert({
              user_id: userId,
              endpoint,
              ip_address: ipAddress,
              request_count: 1,
              window_start: now.toISOString(),
              is_production: true
            });
        }

        // Trigger security monitoring if suspicious
        if (suspicious) {
          await this.triggerSecurityMonitoring(ipAddress, userId, endpoint, currentCount + 1);
        }
      }

      return { allowed, remaining, resetTime, suspicious };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request but log error
      return { allowed: true, remaining: limit, resetTime: new Date(), suspicious: false };
    }
  }

  private static async triggerSecurityMonitoring(
    ipAddress: string,
    userId: string | null,
    endpoint: string,
    requestCount: number
  ) {
    try {
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address: ipAddress,
          user_id: userId,
          incident_type: 'rate_limit_approaching',
          details: { endpoint, request_count: requestCount }
        }
      });
    } catch (error) {
      console.error('Failed to trigger security monitoring:', error);
    }
  }

  static async checkLibraryActionLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'library-action', 30, 1); // 30 per minute
  }

  static async checkSubscriptionValidationLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'subscription-validation', 60, 1); // 60 per minute
  }

  static async checkAuthLimit(userId: string | null, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'auth', 10, 1); // 10 per minute
  }

  static async checkAPILimit(userId: string | null, ipAddress: string, endpoint: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, endpoint, 100, 1); // 100 per minute default
  }

  static async checkCreateLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'create-song', 20, 1); // 20 per minute
  }

  static async checkExportLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'export-pdf', 10, 1); // 10 per minute
  }

  static async checkYouTubeImportLimit(userId: string, ipAddress: string): Promise<RateLimitResult> {
    return this.checkRateLimit(userId, ipAddress, 'youtube-import', 5, 1); // 5 per minute
  }
}

// Utility function to get client IP address
export function getClientIP(request?: Request): string {
  if (typeof window !== 'undefined') {
    // Client-side fallback
    return 'client-unknown';
  }
  
  if (request) {
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }
  
  return 'unknown';
}

// Middleware wrapper for rate limiting
export function withRateLimit(
  rateLimitCheck: (userId: string | null, ipAddress: string) => Promise<RateLimitResult>
) {
  return async (userId: string | null, ipAddress: string) => {
    const result = await rateLimitCheck(userId, ipAddress);
    
    if (!result.allowed) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.resetTime.getTime() - Date.now()) / 1000)} seconds.`);
    }
    
    return result;
  };
}