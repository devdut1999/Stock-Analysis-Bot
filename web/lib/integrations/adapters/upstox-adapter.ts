import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

const UPSTOX_AUTH_URL = 'https://api.upstox.com/v2/login/authorization/dialog';
const UPSTOX_TOKEN_URL = 'https://api.upstox.com/v2/login/authorization/token';

export const upstoxAdapter = {
  id: 'upstox',

  async connect(userId: string): Promise<{ redirectUrl: string }> {
    const clientId = process.env.UPSTOX_API_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Upstox API credentials not configured');
    }

    const state = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    const redirectUrl = `${UPSTOX_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    return { redirectUrl };
  },

  async handleCallback(code: string, userId: string): Promise<void> {
    const clientId = process.env.UPSTOX_API_KEY;
    const clientSecret = process.env.UPSTOX_API_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_UPSTOX_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Upstox API credentials not configured');
    }

    // Exchange code for access token
    const response = await fetch(UPSTOX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upstox token exchange failed: ${error}`);
    }

    const tokenData = await response.json();
    const supabase = getServiceClient();

    // Store token in integrations table
    await supabase.from('integrations').upsert({
      user_id: userId,
      provider: 'upstox',
      config: {
        access_token: tokenData.access_token,
        extended_token: tokenData.extended_token,
        token_type: tokenData.token_type,
        user_id: tokenData.user_id,
        user_name: tokenData.user_name,
        email: tokenData.email,
        exchanges: tokenData.exchanges,
        // Token expires at 3:30 AM IST next day
        expires_at: getTokenExpiry(),
      },
      enabled: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });
  },

  async disconnect(userId: string): Promise<void> {
    const supabase = getServiceClient();
    await supabase
      .from('integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'upstox');
  },

  async isConnected(userId: string): Promise<boolean> {
    const token = await this.getAccessToken(userId);
    return token !== null;
  },

  async getAccessToken(userId: string): Promise<string | null> {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', userId)
      .eq('provider', 'upstox')
      .eq('enabled', true)
      .single();

    if (!data?.config) return null;

    const config = data.config as Record<string, unknown>;
    const expiresAt = config.expires_at as string;

    // Check if token is expired
    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Use extended token if available (valid for 1 year, read-only)
      if (config.extended_token) {
        return config.extended_token as string;
      }
      return null;
    }

    return (config.access_token as string) || null;
  },
};

function getTokenExpiry(): string {
  // Upstox tokens expire at 3:30 AM IST next day
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const expiry = new Date(ist);
  expiry.setDate(expiry.getDate() + 1);
  expiry.setHours(3, 30, 0, 0);
  return expiry.toISOString();
}
