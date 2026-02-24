import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { endpoint = 'library-action', iterations = 35 } = await req.json()
    
    console.log(`Starting rate limit test for ${endpoint} with ${iterations} iterations`)
    
    const results = []
    const testUserId = 'test-user-' + Date.now()
    const testIP = '192.168.1.100'

    // Simulate rapid requests to trigger rate limiting
    for (let i = 0; i < iterations; i++) {
      try {
        const response = await supabase.functions.invoke('global-rate-limiter', {
          body: {
            endpoint,
            user_id: testUserId,
            ip_address: testIP
          }
        })

        if (response.error) {
          console.error(`Request ${i + 1} error:`, response.error)
          results.push({
            iteration: i + 1,
            success: false,
            error: response.error.message || 'Unknown error',
            status: 'error'
          })
        } else {
          const data = response.data
          console.log(`Request ${i + 1}:`, data?.rate_limit_result || data)
          
          results.push({
            iteration: i + 1,
            success: true,
            allowed: data?.rate_limit_result?.allowed || true,
            currentCount: data?.rate_limit_result?.currentCount || 0,
            limit: data?.rate_limit_result?.limit || 0,
            status: data?.rate_limit_result?.allowed ? 'allowed' : 'rate_limited'
          })

          // If rate limited, break early
          if (data?.rate_limit_result && !data.rate_limit_result.allowed) {
            console.log('Rate limit triggered! Stopping test.')
            break
          }
        }

        // Small delay between requests to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Request ${i + 1} failed:`, error)
        results.push({
          iteration: i + 1,
          success: false,
          error: error.message,
          status: 'failed'
        })
      }
    }

    // Test other endpoints quickly to trigger global monitoring
    const otherEndpoints = ['subscription-validation', 'analyze-chord-image', 'send-otp-email']
    
    for (const testEndpoint of otherEndpoints) {
      console.log(`Testing ${testEndpoint} for suspicious activity...`)
      
      // Make requests at 85% of limit to trigger "approaching" alerts
      const config = {
        'subscription-validation': 51, // 85% of 60
        'analyze-chord-image': 17,    // 85% of 20
        'send-otp-email': 4           // 85% of 5
      }
      
      const requestCount = config[testEndpoint] || 5
      
      for (let i = 0; i < requestCount; i++) {
        try {
          await supabase.functions.invoke('global-rate-limiter', {
            body: {
              endpoint: testEndpoint,
              user_id: `test-${testEndpoint}-${Date.now()}`,
              ip_address: `192.168.1.${100 + i}`
            }
          })
          await new Promise(resolve => setTimeout(resolve, 50))
        } catch (error) {
          console.error(`Test ${testEndpoint} request ${i + 1} failed:`, error)
        }
      }
    }

    // Check if security incidents were created
    const { data: incidents } = await supabase
      .from('security_incidents')
      .select('*')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false })

    return new Response(
      JSON.stringify({ 
        success: true,
        test_completed: true,
        endpoint_tested: endpoint,
        iterations_completed: results.length,
        results: results.slice(-10), // Last 10 results
        security_incidents_triggered: incidents?.length || 0,
        incidents: incidents || [],
        message: incidents?.length ? 
          ` Test completed! ${incidents.length} security incidents were triggered and should have sent Telegram alerts.` :
          `⚠️ Test completed but no security incidents were detected. Check the security-monitor function logs.`
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Rate limit tester error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})