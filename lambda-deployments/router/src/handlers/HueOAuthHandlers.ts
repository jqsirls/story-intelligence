import { createClient as createRedisClient, RedisClientType } from 'redis';
import * as https from 'node:https';
import * as http from 'node:http';
import type { Database } from '@alexa-multi-agent/shared-types';
import { slackNotify } from '../utils/slack';

function buildAuthorizeUrl(
  creds: { clientId: string; clientSecret?: string; redirectUri: string },
  params: { state?: string; codeChallenge?: string; codeChallengeMethod?: 'S256' }
): string {
  const url = new URL('https://api.meethue.com/v2/oauth2/authorize');
  url.searchParams.set('client_id', creds.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', creds.redirectUri);
  url.searchParams.set('scope', 'remote_access');
  if (params.state) url.searchParams.set('state', params.state);
  if (params.codeChallenge) {
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', params.codeChallengeMethod || 'S256');
  }
  return url.toString();
}

async function exchangeCodeForTokens(
  creds: { clientId: string; clientSecret: string; redirectUri: string },
  code: string
): Promise<any> {
  const postData = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: creds.redirectUri,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.meethue.com',
        path: '/v2/oauth2/token',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData).toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on('end', () => {
          try {
            const txt = Buffer.concat(chunks).toString('utf8');
            const json = JSON.parse(txt);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve(json);
            return reject(new Error(json?.error_description || 'Hue token exchange failed'));
          } catch (e) {
            return reject(e);
          }
        });
      }
    );
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

export async function handleHueStart(body: any) {
  const redirectUri = process.env.HUE_REDIRECT_URI || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/production/v1/oauth/hue/callback';
  const clientId = process.env.HUE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.HUE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Hue OAuth not configured' }) };
  }
  const { state, codeChallenge } = body || {};
  const url = buildAuthorizeUrl({ clientId, clientSecret, redirectUri }, { state: state || 'state', codeChallenge, codeChallengeMethod: codeChallenge ? 'S256' : undefined });
  return { statusCode: 302, headers: { Location: url }, body: '' };
}

export async function handleHueCallback(query: any) {
  const code = query.code;
  const state = query.state;
  if (!code) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'code missing' }) };
  }
  const redirectUri = process.env.HUE_REDIRECT_URI || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/production/v1/oauth/hue/callback';
  const clientId = process.env.HUE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.HUE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Hue OAuth not configured' }) };
  }
  try {
    const tokens = await exchangeCodeForTokens({ clientId, clientSecret, redirectUri }, code);
    // Stash tokens temporarily in Redis for pairing step (10 min TTL)
    let client: RedisClientType | null = null;
    try {
      if (process.env.REDIS_URL) {
        client = createRedisClient({ url: process.env.REDIS_URL });
        await client.connect();
        await client.setEx(`oauth:hue:${state || 'no-state'}`, 600, JSON.stringify(tokens));
      }
    } finally {
      try { if (client) await client.disconnect(); } catch { /* ignore redis disconnect */ }
    }
    slackNotify('Hue OAuth callback successful; tokens received');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e: any) {
    slackNotify(`Hue OAuth callback error: ${e?.message || String(e)}`);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: e?.message || String(e) }) };
  }
}

export async function handleHuePairAttempt(body: any) {
  const { state, bridgeIp } = body || {};
  if (!bridgeIp) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'bridgeIp missing' }) };
  }
  // Attempt local pairing: user must press link button on bridge within 30s before this call
  const payload = JSON.stringify({ devicetype: 'storytailor#storytailor_agent' });
  return new Promise((resolve) => {
    const req = http.request({ method: 'POST', hostname: bridgeIp, path: '/api', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload).toString() } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on('end', async () => {
        const txt = Buffer.concat(chunks).toString('utf8');
        try {
          const arr = JSON.parse(txt);
          const first = Array.isArray(arr) ? arr[0] : null;
          if (first && first.success && first.success.username) {
            // Optionally stash pairing result for finalization
            try {
              if (process.env.REDIS_URL) {
                const client = createRedisClient({ url: process.env.REDIS_URL });
                await client.connect();
                await client.setEx(`hue:bridge:${state || 'no-state'}`, 900, JSON.stringify({ bridgeIp, username: first.success.username }));
                await client.disconnect();
              }
            } catch { /* ignore redis cache errors during pairing */ }
            slackNotify(`Hue pairing success for bridge ${bridgeIp}`);
            resolve({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true, bridgeIp }) });
          } else if (first && first.error && first.error.type === 101) {
            // Link button not pressed
            slackNotify(`Hue pairing failed: link button not pressed on ${bridgeIp}`);
            resolve({ statusCode: 428, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'link_button_not_pressed' }) });
          } else {
            slackNotify(`Hue pairing failed: ${txt}`);
            resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'pairing_failed', details: first }) });
          }
        } catch { /* ignore parse error */
          slackNotify('Hue pairing failed: invalid bridge response');
          resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'invalid_bridge_response' }) });
        }
      });
    });
    req.on('error', () => resolve({ statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'bridge_unreachable' }) }));
    req.write(payload);
    req.end();
  });
}

export async function handleHueStatus(body: any) {
  const { state, userId } = body || {};
  if (!state) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'state required' }) };
  }
  if (!process.env.REDIS_URL) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Redis not configured' }) };
  }
  
  let redis: RedisClientType | null = null;
  try {
    redis = createRedisClient({ url: process.env.REDIS_URL });
    await redis.connect();
    
    const oauthRaw = await redis.get(`oauth:hue:${state}`);
    const pairRaw = await redis.get(`hue:bridge:${state}`);
    
    if (!oauthRaw) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
        success: true, 
        status: 'waiting_for_oauth',
        message: 'Waiting for Hue OAuth completion...'
      }) };
    }
    
    const oauth = JSON.parse(oauthRaw);
    
    if (!pairRaw) {
      // OAuth complete, but no bridge pairing yet - try automatic bridge discovery
      const bridgeIp = await discoverHueBridge();
      if (bridgeIp) {
        // Attempt automatic pairing
        const pairingResult = await attemptAutomaticPairing(bridgeIp, state);
        if (pairingResult.success) {
          return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
            success: true, 
            status: 'pairing_complete',
            bridgeIp: pairingResult.bridgeIp,
            message: 'Hue bridge paired successfully!'
          }) };
        } else {
          return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
            success: true, 
            status: 'oauth_complete_waiting_for_pairing',
            bridgeIp: bridgeIp,
            message: 'OAuth complete. Please press the link button on your Hue bridge.'
          }) };
        }
      } else {
        return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
          success: true, 
          status: 'oauth_complete_no_bridge',
          message: 'OAuth complete but no Hue bridge found. Please check your network.'
        }) };
      }
    }
    
    // Both OAuth and pairing complete
    const pair = JSON.parse(pairRaw);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 
      success: true, 
      status: 'complete',
      bridgeIp: pair.bridgeIp,
      username: pair.username,
      message: 'Hue setup complete!'
    }) };
    
  } catch (e: any) {
    slackNotify(`Hue status check error: ${e?.message || String(e)}`);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: e?.message || String(e) }) };
  } finally {
    try { if (redis) await redis.disconnect(); } catch { /* ignore redis disconnect */ }
  }
}

async function discoverHueBridge(): Promise<string | null> {
  // Try common Hue bridge IPs
  const commonIPs = [
    '192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103',
    '192.168.0.100', '192.168.0.101', '192.168.0.102', '192.168.0.103',
    '10.0.0.100', '10.0.0.101', '10.0.0.102', '10.0.0.103'
  ];
  
  for (const ip of commonIPs) {
    try {
      const response = await fetch(`http://${ip}/api/config`, { 
        method: 'GET'
      });
      if (response.ok) {
        const config = await response.json() as any;
        if (config.name && config.name.includes('Philips hue')) {
          return ip;
        }
      }
    } catch {
      // Continue to next IP
    }
  }
  
  return null;
}

async function attemptAutomaticPairing(bridgeIp: string, state: string): Promise<{ success: boolean; bridgeIp?: string }> {
  try {
    const payload = JSON.stringify({ devicetype: 'storytailor-app' });
    
    const response = await fetch(`http://${bridgeIp}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    
    const result = await response.json();
    const first = Array.isArray(result) ? result[0] : null;
    
    if (first && first.success && first.success.username) {
      // Store pairing result
      if (process.env.REDIS_URL) {
        const redis = createRedisClient({ url: process.env.REDIS_URL });
        await redis.connect();
        await redis.setEx(`hue:bridge:${state}`, 900, JSON.stringify({ bridgeIp, username: first.success.username }));
        await redis.disconnect();
      }
      
      slackNotify(`Automatic Hue pairing success for bridge ${bridgeIp}`);
      return { success: true, bridgeIp };
    }
    
    return { success: false };
  } catch (e) {
    slackNotify(`Automatic Hue pairing failed for ${bridgeIp}: ${e}`);
    return { success: false };
  }
}

export async function handleHueFinalize(body: any) {
  const { state, userId } = body || {};
  if (!state || !userId) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'state and userId required' }) };
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Supabase not configured' }) };
  }
  if (!process.env.REDIS_URL) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Redis not configured' }) };
  }
  let redis: RedisClientType | null = null;
  try {
    redis = createRedisClient({ url: process.env.REDIS_URL });
    await redis.connect();
    const oauthRaw = await redis.get(`oauth:hue:${state}`);
    const pairRaw = await redis.get(`hue:bridge:${state}`);
    if (!oauthRaw || !pairRaw) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'incomplete_state' }) };
    }
    const oauth = JSON.parse(oauthRaw);
    const pair = JSON.parse(pairRaw);
    // Store device token directly in Supabase (service role if available)
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient<Database>(process.env.SUPABASE_URL as string, supabaseKey as string);
    const bridgeIp: string = pair.bridgeIp;
    const username: string = pair.username;
    const accessToken = `${bridgeIp}:${username}`;
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const insertPayload: any = {
      user_id: userId,
      device_id: bridgeIp,
      device_type: 'philips_hue',
      encrypted_token: accessToken, // already local-only username; upstream encryption handled in agent
      token_type: 'hue_username',
      expires_at: expiresAt,
      refresh_token_encrypted: null,
      last_refreshed: new Date().toISOString(),
      refresh_attempts: 0,
      status: 'active',
      encryption_key_id: 'none',
    };
    const { error: insertError } = await (supabase as any)
      .from('device_tokens')
      .insert(insertPayload)
      .select('id')
      .single();
    if (insertError) throw new Error(insertError.message || 'Failed to store device token');
    // Cleanup temp keys
    await redis.del(`oauth:hue:${state}`);
    await redis.del(`hue:bridge:${state}`);
    slackNotify(`Hue finalize success: token stored for user ${userId} bridge ${bridgeIp}`);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e: any) {
    slackNotify(`Hue finalize error: ${e?.message || String(e)}`);
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: e?.message || String(e) }) };
  } finally {
    try { if (redis) await redis.disconnect(); } catch { /* ignore redis disconnect */ }
  }
}


