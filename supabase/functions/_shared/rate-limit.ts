// Global rate limiting utility for edge functions
export async function checkRateLimit(
  req: Request, 
  endpoint: string, 
  authHeader?: string,
  userId?: string
) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/global-rate-limiter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        endpoint,
        user_id: userId,
        auth_header: authHeader,
        ip_address: ip
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        allowed: false,
        error: errorData.error || 'Rate limit check failed',
        status: response.status,
        retryAfter: errorData.retryAfter
      }
    }

    const data = await response.json()
    return {
      allowed: data.rate_limit_result?.allowed ?? true,
      currentCount: data.rate_limit_result?.currentCount ?? 0,
      limit: data.rate_limit_result?.limit ?? 0,
      resetTime: data.rate_limit_result?.resetTime
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Allow request if rate limit check fails (fail-open for availability)
    return { allowed: true, currentCount: 0, limit: 0 }
  }
}

export function createRateLimitResponse(retryAfter?: number) {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfter: retryAfter || 60 
    }),
    { 
      status: 429, 
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Retry-After': (retryAfter || 60).toString()
      }
    }
  )
}