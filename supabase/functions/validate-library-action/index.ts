import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Missing authorization header'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    // Enhanced rate limiting with proper error handling
    const userIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const endpoint = 'library-action';
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - 1) // 1-minute window
    ;
    // Check current rate limit with proper error handling
    const { data: rateLimitData, error: rateLimitError } = await supabase.from('rate_limits').select('request_count, id, window_start').eq('user_id', user.id).eq('endpoint', endpoint).gte('window_start', windowStart.toISOString()).maybeSingle();
    if (rateLimitError && rateLimitError.code !== 'PGRST116') {
      console.error('Rate limit check error:', rateLimitError);
    }
    let currentCount = rateLimitData?.request_count || 0;
    const rateLimit = 30 // 30 requests per minute
    ;
    if (currentCount >= rateLimit) {
      // Trigger security monitoring for rate limit exceeded
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address: userIP,
          user_id: user.id,
          incident_type: 'rate_limit_exceeded',
          details: {
            endpoint,
            current_count: currentCount,
            limit: rateLimit
          }
        }
      }).catch(console.error);
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: 60
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': '60'
        }
      });
    }
    // Update or create rate limit record
    if (rateLimitData) {
      await supabase.from('rate_limits').update({
        request_count: currentCount + 1,
        ip_address: userIP
      }).eq('id', rateLimitData.id);
    } else {
      await supabase.from('rate_limits').insert({
        user_id: user.id,
        endpoint,
        ip_address: userIP,
        request_count: 1,
        window_start: new Date().toISOString(),
        is_production: true
      });
    }
    // Check for suspicious activity (80% of rate limit)
    if (currentCount + 1 > rateLimit * 0.8) {
      await supabase.functions.invoke('security-monitor', {
        body: {
          ip_address: userIP,
          user_id: user.id,
          incident_type: 'rate_limit_approaching',
          details: {
            endpoint,
            current_count: currentCount + 1,
            limit: rateLimit
          }
        }
      }).catch(console.error);
    }
    const requestData = await req.json();
    // Validate subscription for library access
    const { data: hasAccess } = await supabase.rpc('validate_user_subscription', {
      user_id_param: user.id,
      feature_name: 'library_access'
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({
        error: 'Subscription required for library access'
      }), {
        status: 403,
        headers: corsHeaders
      });
    }
    if (requestData.actionType === 'add_to_library') {
      // Validate library limit server-side
      const { data: canAdd } = await supabase.rpc('validate_library_limit', {
        user_id_param: user.id
      });
      if (!canAdd) {
        return new Response(JSON.stringify({
          error: 'Library limit reached. Upgrade your subscription for more space.'
        }), {
          status: 403,
          headers: corsHeaders
        });
      }
      // Check for duplicates
      const { data: existing } = await supabase.from('user_library_actions').select('id').eq('user_id', user.id).eq('song_original_id', requestData.songId).eq('action_type', 'add_to_library').maybeSingle();
      if (existing) {
        // Skip insert, langsung sukses
        return new Response(JSON.stringify({
          success: true,
          data: existing
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    // Perform the library action
    const { data, error } = await supabase.from('user_library_actions').insert({
      user_id: user.id,
      song_id: requestData.songId,
      user_original_id: requestData.originalId,
      song_original_id: requestData.originalSongId,
      action_type: requestData.actionType,
      is_production: true
    }).select();
    if (error) {
      console.error('Library action error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to update library'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
