import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, signState, verifyState, isEncrypted } from '../../utils/crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

const UPSTOX_AUTH_URL = 'https://api.upstox.com/v2/login/authorization/dialog';
const UPSTOX_TOKEN_URL = 'https://api.upstox.com/v2/login/authorization/token';

interface UpstoxTokenResponse {
  access_token: string;
  extended_token?: string;
  refresh_token?: string;
  token_type: string;
  user_id: string;
  user_name: string;
  email: string;
  exchanges: string[];
}

interface UpstoxConfig {
  access_token: string;
  extended_token?: string;
  refresh_token?: string;
  token_type: string;
  user_id: string;
  user_name: string;
  email: string;
  exchanges: string[];
  expires_at: string;
}

export const upstoxAdapter = {
  id: 'upstox',

  /**
   * Initiate OAuth connection - returns URL to redirect user to
   */
  async connect(userId: string): Promise<{ redirectUrl: string }> {
    const clientId = process.env.UPSTOX_API_KEY;
    const redirectUri = process.env.NEXT_PUBLIC_UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('Upstox API credentials not configured');
    }

    // Create signed state with user ID and timestamp
    const state = signState({ userId, provider: 'upstox' });
    
    const redirectUrl = `${UPSTOX_AUTH_URL}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

    return { redirectUrl };
  },

  /**
   * Handle OAuth callback - exchange code for tokens and store them
   */
  async handleCallback(code: string, state: string): Promise<{ userId: string }> {
    // Verify state signature and extract user ID
    const stateData = verifyState(state);
    const userId = stateData.userId as string;
    
    if (!userId) {
      throw new Error('Invalid state: missing userId');
    }
    
    if (stateData.provider !== 'upstox') {
      throw new Error('Invalid state: wrong provider');
    }

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
      console.error('Upstox token exchange failed:', error);
      throw new Error(`Upstox token exchange failed: ${response.status}`);
    }

    const tokenData: UpstoxTokenResponse = await response.json();
    
    // Encrypt sensitive tokens before storing
    const encryptedConfig: UpstoxConfig = {
      access_token: encrypt(tokenData.access_token),
      extended_token: tokenData.extended_token ? encrypt(tokenData.extended_token) : undefined,
      refresh_token: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : undefined,
      token_type: tokenData.token_type,
      user_id: tokenData.user_id,
      user_name: tokenData.user_name,
      email: tokenData.email,
      exchanges: tokenData.exchanges,
      expires_at: getTokenExpiry(),
    };

    const supabase = getServiceClient();

    // Store encrypted tokens in integrations table
    const { error } = await supabase.from('integrations').upsert({
      user_id: userId,
      provider: 'upstox',
      config: encryptedConfig,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,provider',
    });

    if (error) {
      console.error('Failed to store Upstox integration:', error);
      throw new Error('Failed to store integration');
    }

    return { userId };
  },

  /**
   * Disconnect integration - remove stored tokens
   */
  async disconnect(userId: string): Promise<void> {
    const supabase = getServiceClient();
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'upstox');
      
    if (error) {
      console.error('Failed to disconnect Upstox:', error);
      throw new Error('Failed to disconnect');
    }
  },

  /**
   * Check if user has valid Upstox connection
   */
  async isConnected(userId: string): Promise<boolean> {
    const token = await this.getAccessToken(userId);
    return token !== null;
  },

  /**
   * Get decrypted access token for API calls
   * Handles token expiry and falls back to extended token
   */
  async getAccessToken(userId: string): Promise<string | null> {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', userId)
      .eq('provider', 'upstox')
      .eq('enabled', true)
      .single();

    if (error || !data?.config) return null;

    const config = data.config as UpstoxConfig;
    
    // Check if token is expired
    const isExpired = config.expires_at && new Date(config.expires_at) < new Date();
    
    if (isExpired) {
      // Try to refresh token if we have a refresh token
      if (config.refresh_token) {
        try {
          const newToken = await this.refreshToken(userId, config);
          if (newToken) return newToken;
        } catch (e) {
          console.error('Token refresh failed:', e);
        }
      }
      
      // Fall back to extended token (valid for 1 year, read-only)
      if (config.extended_token) {
        return decryptToken(config.extended_token);
      }
      
      return null;
    }

    return decryptToken(config.access_token);
  },

  /**
   * Refresh expired access token
   */
  async refreshToken(userId: string, config: UpstoxConfig): Promise<string | null> {
    const clientId = process.env.UPSTOX_API_KEY;
    const clientSecret = process.env.UPSTOX_API_SECRET;
    
    if (!clientId || !clientSecret || !config.refresh_token) {
      return null;
    }

    const refreshToken = decryptToken(config.refresh_token);
    if (!refreshToken) return null;

    try {
      const response = await fetch(UPSTOX_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        return null;
      }

      const tokenData: UpstoxTokenResponse = await response.json();
      
      // Update stored tokens
      const supabase = getServiceClient();
      await supabase.from('integrations').update({
        config: {
          ...config,
          access_token: encrypt(tokenData.access_token),
          refresh_token: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : config.refresh_token,
          expires_at: getTokenExpiry(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'upstox');

      return tokenData.access_token;
    } catch (e) {
      console.error('Token refresh error:', e);
      return null;
    }
  },

  /**
   * Get user profile info (non-sensitive)
   */
  async getUserInfo(userId: string): Promise<{ userName: string; email: string } | null> {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('integrations')
      .select('config')
      .eq('user_id', userId)
      .eq('provider', 'upstox')
      .eq('enabled', true)
      .single();

    if (!data?.config) return null;
    
    const config = data.config as UpstoxConfig;
    return {
      userName: config.user_name,
      email: config.email,
    };
  },
};

/**
 * Decrypt token, handling both encrypted and legacy unencrypted values
 */
function decryptToken(value: string | undefined): string | null {
  if (!value) return null;
  
  // Check if value is encrypted (has our format)
  if (isEncrypted(value)) {
    try {
      return decrypt(value);
    } catch (e) {
      console.error('Failed to decrypt token:', e);
      return null;
    }
  }
  
  // Legacy unencrypted value
  return value;
}

/**
 * Calculate token expiry time
 * Upstox tokens expire at 3:30 AM IST next day
 */
function getTokenExpiry(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const expiry = new Date(ist);
  expiry.setDate(expiry.getDate() + 1);
  expiry.setHours(3, 30, 0, 0);
  return expiry.toISOString();
}
