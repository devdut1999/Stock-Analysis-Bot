/**
 * Server-side data cache using Supabase analysis_cache table
 * Reduces redundant API calls for frequently requested stocks
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export type CacheDataType = 'quote' | 'historical' | 'fundamentals' | 'india_specific';

const TTL_MAP: Record<CacheDataType, number> = {
  quote: 5,           // 5 minutes
  historical: 60,     // 1 hour
  fundamentals: 1440, // 1 day
  india_specific: 360, // 6 hours
};

export async function getCachedData<T>(
  symbol: string,
  dataType: CacheDataType
): Promise<T | null> {
  const supabase = getClient();
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('analysis_cache')
      .select('data')
      .eq('symbol', symbol.toUpperCase())
      .eq('data_type', dataType)
      .gt('expires_at', new Date().toISOString())
      .single();

    return data?.data as T ?? null;
  } catch {
    return null;
  }
}

export async function setCachedData(
  symbol: string,
  dataType: CacheDataType,
  data: unknown,
  dataSource: string = 'yahoo'
): Promise<void> {
  const supabase = getClient();
  if (!supabase) return;

  const ttlMinutes = TTL_MAP[dataType] || 5;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  try {
    await supabase.from('analysis_cache').upsert({
      symbol: symbol.toUpperCase(),
      data_type: dataType,
      data_source: dataSource,
      data,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, {
      onConflict: 'symbol,data_type',
    });
  } catch {
    // Cache write failures are non-critical
  }
}
