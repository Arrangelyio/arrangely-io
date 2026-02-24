import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RateLimitConfig {
  endpoint: string
  limit: number
  windowMinutes: number
  requiresAuth: boolean
}

// Global rate limit configurations for all endpoints
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  'library-action': { endpoint: 'library-action', limit: 30, windowMinutes: 1, requiresAuth: true },
  'subscription-validation': { endpoint: 'subscription-validation', limit: 60, windowMinutes: 1, requiresAuth: true },
  'check-subscription': { endpoint: 'check-subscription', limit: 100, windowMinutes: 1, requiresAuth: true },
  'analyze-chord-image': { endpoint: 'analyze-chord-image', limit: 20, windowMinutes: 1, requiresAuth: true },
  'analyze-mp3-audio': { endpoint: 'analyze-mp3-audio', limit: 10, windowMinutes: 1, requiresAuth: false },
  'analyze-youtube-audio': { endpoint: 'analyze-youtube-audio', limit: 15, windowMinutes: 1, requiresAuth: false },
  'analyze-youtube-chords': { endpoint: 'analyze-youtube-chords', limit: 15, windowMinutes: 1, requiresAuth: false },
  'create-midtrans-payment': { endpoint: 'create-midtrans-payment', limit: 10, windowMinutes: 1, requiresAuth: true },
  'start-free-trial': { endpoint: 'start-free-trial', limit: 5, windowMinutes: 1, requiresAuth: true },
  'upgrade-subscription': { endpoint: 'upgrade-subscription', limit: 10, windowMinutes: 1, requiresAuth: true },
  'send-otp-email': { endpoint: 'send-otp-email', limit: 5, windowMinutes: 1, requiresAuth: false },
  'verify-otp': { endpoint: 'verify-otp', limit: 10, windowMinutes: 1, requiresAuth: false },
  'youtube-realtime-chords': { endpoint: 'youtube-realtime-chords', limit: 20, windowMinutes: 1, requiresAuth: false },
  'categorize-songs': { endpoint: 'categorize-songs', limit: 30, windowMinutes: 1, requiresAuth: true },
  // Global fallback for any unlisted endpoints
  'default': { endpoint: 'default', limit: 100, windowMinutes: 1, requiresAuth: false }
}

export interface RateLimitResult {
  allowed: boolean
  currentCount: number
  limit: number
  resetTime: Date
  retryAfter?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData = await req.json()
    const { 
      endpoint, 
      user_id, 
      auth_header,
      ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    } = requestData

    // Get rate limit configuration
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS['default']
    
    // Verify authentication if required
    let user = null
    if (config.requiresAuth && auth_header) {
      const token = auth_header.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: corsHeaders }
        )
      }
      user = authUser
    }

    // Use user_id from auth or provided user_id or IP as fallback
    const rateLimitKey = user?.id || user_id || ip_address

    // Calculate window start time
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes)

    // Check current rate limit
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('request_count, id, window_start')
      .eq('user_id', rateLimitKey)
      .eq('endpoint', config.endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle()

    if (rateLimitError && rateLimitError.code !== 'PGRST116') {
      console.error('Rate limit check error:', rateLimitError)
    }

    let currentCount = rateLimitData?.request_count || 0
    const resetTime = new Date()
    resetTime.setMinutes(resetTime.getMinutes() + config.windowMinutes)

    // Check if rate limit exceeded
    if (currentCount >= config.limit) {
      // Trigger security monitoring for rate limit exceeded
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address,
          user_id: user?.id || rateLimitKey,
          incident_type: 'rate_limit_exceeded',
          details: { 
            endpoint: config.endpoint, 
            current_count: currentCount, 
            limit: config.limit,
            window_minutes: config.windowMinutes
          }
        }
      }).catch(console.error)

      const result: RateLimitResult = {
        allowed: false,
        currentCount,
        limit: config.limit,
        resetTime,
        retryAfter: config.windowMinutes * 60
      }

      return new Response(
        JSON.stringify({ 
          rate_limit_result: result,
          error: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfter: config.windowMinutes * 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders,
            'Retry-After': (config.windowMinutes * 60).toString()
          }
        }
      )
    }

    // Update or create rate limit record
    if (rateLimitData) {
      await supabase
        .from('rate_limits')
        .update({ 
          request_count: currentCount + 1,
          ip_address
        })
        .eq('id', rateLimitData.id)
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          user_id: rateLimitKey,
          endpoint: config.endpoint,
          ip_address,
          request_count: 1,
          window_start: new Date().toISOString(),
          is_production: true
        })
    }

    // Check for suspicious activity (80% of rate limit)
    if (currentCount + 1 > config.limit * 0.8) {
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address,
          user_id: user?.id || rateLimitKey,
          incident_type: 'rate_limit_approaching',
          details: { 
            endpoint: config.endpoint, 
            current_count: currentCount + 1, 
            limit: config.limit,
            percentage: ((currentCount + 1) / config.limit) * 100
          }
        }
      }).catch(console.error)
    }

    const result: RateLimitResult = {
      allowed: true,
      currentCount: currentCount + 1,
      limit: config.limit,
      resetTime
    }

    return new Response(
      JSON.stringify({ 
        rate_limit_result: result,
        success: true 
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Global rate limiter error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})