import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Telegram config
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
async function sendTelegramAlert(incident) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram credentials not configured for security alerts');
    return;
  }
  const message = `🚨 *SECURITY ALERT* 🚨

*Type:* ${incident.type}
*Severity:* ${incident.severity?.toUpperCase?.() || 'INFO'}
*IP Address:* \`${incident.ip_address || 'Unknown'}\`
*Endpoint:* ${incident.endpoint || '-'}
*User ID:* ${incident.user_id || 'Unknown'}
*Time:* ${new Date().toISOString()}

*Details:*
\`\`\`json
${JSON.stringify(incident.details || {}, null, 2)}
\`\`\``;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });
  if (!res.ok) {
    console.error('Failed to send Telegram alert:', await res.text());
  } else {
    
  }
}
async function detectSuspiciousActivity(supabase, ip, userId) {
  const incidents = [];
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const minuteAgo = new Date(now.getTime() - 60 * 1000);
  
  // Rate limit check
  const { data: rateLimitViolations, error: rlErr } = await supabase.from('rate_limits').select('*').eq('ip_address', ip).gte('window_start', hourAgo.toISOString());
  if (rlErr) console.error('Error fetching rate limits:', rlErr);
  if (rateLimitViolations && rateLimitViolations.length > 0) {
    const totalRequests = rateLimitViolations.reduce((sum, r)=>sum + r.request_count, 0);
    if (totalRequests > 500) {
      incidents.push({
        type: 'High Volume Traffic',
        severity: 'high',
        details: {
          totalRequests,
          violations: rateLimitViolations.length
        },
        ip_address: ip,
        user_id: userId,
        endpoint: 'multiple'
      });
    }
  }
  // Auth attempts
  if (userId) {
    const { data: authAttempts, error: authErr } = await supabase.from('rate_limits').select('*').eq('user_id', userId).eq('endpoint', 'auth').gte('window_start', minuteAgo.toISOString());
    if (authErr) console.error('Error fetching auth attempts:', authErr);
    if (authAttempts && authAttempts.length > 20) {
      incidents.push({
        type: 'Rapid Authentication Attempts',
        severity: 'critical',
        details: {
          attempts: authAttempts.length
        },
        ip_address: ip,
        user_id: userId,
        endpoint: 'auth'
      });
    }
  }
  // SQL injection check
  const { data: errorLogs, error: errLogsErr } = await supabase.from('error_logs').select('*').eq('ip_address', ip).gte('created_at', hourAgo.toISOString());
  if (errLogsErr) console.error('Error fetching error logs:', errLogsErr);
  if (errorLogs && errorLogs.length > 0) {
    const patterns = [
      'union select',
      'drop table',
      'insert into',
      '1=1',
      "admin' --"
    ];
    const suspicious = errorLogs.filter((log)=>patterns.some((p)=>log.error_message?.toLowerCase().includes(p) || log.error_details?.toString().toLowerCase().includes(p)));
    if (suspicious.length > 0) {
      incidents.push({
        type: 'Potential SQL Injection Attempt',
        severity: 'critical',
        details: {
          suspiciousErrors: suspicious.length,
          patterns
        },
        ip_address: ip,
        user_id: userId,
        endpoint: 'multiple'
      });
    }
  }
  return incidents;
}
Deno.serve(async (req)=>{
  
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch  {
      return new Response(JSON.stringify({
        error: 'Invalid JSON'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { ip_address, user_id, incident_type } = body;
    const incidents = await detectSuspiciousActivity(supabase, ip_address, user_id);
    if (incidents.length > 0) {
      // Incident ditemukan → kirim telegram & insert DB
      for (const inc of incidents){
        if (inc.severity === 'high' || inc.severity === 'critical') {
          await sendTelegramAlert(inc);
        }
      }
      const { error: insertErr } = await supabase.from('security_incidents').insert({
        ip_address,
        user_id,
        incident_type: incident_type || 'monitoring_check',
        incidents_detected: incidents.length,
        incident_details: JSON.stringify(incidents),
        is_production: true
      });
      if (insertErr) console.error('Error inserting security incident:', insertErr);
    } else {
      // Tidak ada incident → kirim telegram dari request body
      await sendTelegramAlert({
        type: incident_type || 'No Incident Detected',
        severity: 'info',
        details: {
          source: 'request',
          ...body
        },
        ip_address,
        user_id
      });
    }
    return new Response(JSON.stringify({
      success: true,
      incidents_detected: incidents.length,
      incidents: incidents.filter((i)=>i.severity === 'high' || i.severity === 'critical')
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error('Security monitoring error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
