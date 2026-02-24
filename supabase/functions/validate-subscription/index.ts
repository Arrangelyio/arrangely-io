import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionRequest {
  feature: string
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

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Enhanced rate limiting with proper error handling
    const userIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const endpoint = 'subscription-validation'
    const windowStart = new Date()
    windowStart.setMinutes(windowStart.getMinutes() - 1)

    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from('rate_limits')
      .select('request_count, id, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle()

    if (rateLimitError && rateLimitError.code !== 'PGRST116') {
      console.error('Rate limit check error:', rateLimitError)
    }

    let currentCount = rateLimitData?.request_count || 0
    const rateLimit = 60 // 60 requests per minute

    if (currentCount >= rateLimit) {
      // Trigger security monitoring for rate limit exceeded
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address: userIP,
          user_id: user.id,
          incident_type: 'rate_limit_exceeded',
          details: { endpoint, current_count: currentCount, limit: rateLimit }
        }
      }).catch(console.error)

      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders,
            'Retry-After': '60'
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
          ip_address: userIP
        })
        .eq('id', rateLimitData.id)
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          user_id: user.id,
          endpoint,
          ip_address: userIP,
          request_count: 1,
          window_start: new Date().toISOString(),
          is_production: true
        })
    }

    // Check for suspicious activity (80% of rate limit)
    if (currentCount + 1 > rateLimit * 0.8) {
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address: userIP,
          user_id: user.id,
          incident_type: 'rate_limit_approaching',
          details: { endpoint, current_count: currentCount + 1, limit: rateLimit }
        }
      }).catch(console.error)
    }

    const requestData: SubscriptionRequest = await req.json()

    // Validate subscription with comprehensive checks
    const { data: subscriptionData } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          library_limit,
          features
        )
      `)
      .eq('user_id', user.id)
      .eq('is_production', true)
      .eq('status', 'active')
      .single()

    const now = new Date()
    let hasAccess = false
    let subscriptionInfo = {
      hasActiveSubscription: false,
      isTrialing: false,
      planName: null,
      libraryLimit: 10,
      features: [],
      expiresAt: null
    }

    if (subscriptionData) {
      const currentPeriodEnd = subscriptionData.current_period_end ? new Date(subscriptionData.current_period_end) : null
      const trialEnd = subscriptionData.trial_end ? new Date(subscriptionData.trial_end) : null

      // Check if subscription is still valid
      const subscriptionValid = !currentPeriodEnd || currentPeriodEnd > now
      const trialValid = subscriptionData.is_trial && trialEnd && trialEnd > now

      if (subscriptionValid || trialValid) {
        hasAccess = true
        subscriptionInfo = {
          hasActiveSubscription: subscriptionValid,
          isTrialing: trialValid,
          planName: subscriptionData.subscription_plans?.name || null,
          libraryLimit: subscriptionData.subscription_plans?.library_limit || 10,
          features: subscriptionData.subscription_plans?.features || [],
          expiresAt: currentPeriodEnd || trialEnd
        }
      }
    }

    // Feature-specific validation
    const { data: featureAccess } = await supabase
      .rpc('validate_user_subscription', {
        user_id_param: user.id,
        feature_name: requestData.feature
      })

    return new Response(
      JSON.stringify({
        hasAccess: featureAccess,
        subscriptionInfo,
        timestamp: now.toISOString()
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Subscription validation error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})