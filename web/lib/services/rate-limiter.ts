/**
 * Rate limiter service using token bucket algorithm
 * Prevents API throttling across multiple providers
 */

interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
  minDelay?: number;    // Minimum delay between requests (ms)
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  config: RateLimitConfig;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private queue: Map<string, Array<() => void>> = new Map();

  /**
   * Register an API with rate limit configuration
   */
  register(apiName: string, config: RateLimitConfig): void {
    this.buckets.set(apiName, {
      tokens: config.maxRequests,
      lastRefill: Date.now(),
      config
    });
    this.queue.set(apiName, []);
  }

  /**
   * Wait for rate limit clearance before making request
   */
  async waitForSlot(apiName: string): Promise<void> {
    const bucket = this.buckets.get(apiName);

    if (!bucket) {
      // API not registered, allow request
      return;
    }

    // Refill tokens based on time elapsed
    this.refillTokens(apiName);

    if (bucket.tokens > 0) {
      bucket.tokens--;

      // Apply minimum delay if configured
      if (bucket.config.minDelay) {
        await this.sleep(bucket.config.minDelay);
      }

      return;
    }

    // No tokens available, wait in queue
    await this.waitInQueue(apiName);
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(apiName: string): void {
    const bucket = this.buckets.get(apiName);
    if (!bucket) return;

    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const { maxRequests, windowMs } = bucket.config;

    // Calculate tokens to add based on time elapsed
    const tokensToAdd = Math.floor((elapsed / windowMs) * maxRequests);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Wait in queue for a token to become available
   */
  private async waitInQueue(apiName: string): Promise<void> {
    return new Promise((resolve) => {
      const queue = this.queue.get(apiName);
      if (!queue) {
        resolve();
        return;
      }

      queue.push(resolve);

      // Schedule token check
      this.scheduleTokenCheck(apiName);
    });
  }

  /**
   * Periodically check if tokens are available for queued requests
   */
  private scheduleTokenCheck(apiName: string): void {
    const bucket = this.buckets.get(apiName);
    const queue = this.queue.get(apiName);

    if (!bucket || !queue || queue.length === 0) return;

    setTimeout(() => {
      this.refillTokens(apiName);

      if (bucket.tokens > 0 && queue.length > 0) {
        bucket.tokens--;
        const resolve = queue.shift();
        if (resolve) resolve();

        // Schedule next check if more in queue
        if (queue.length > 0) {
          this.scheduleTokenCheck(apiName);
        }
      } else {
        this.scheduleTokenCheck(apiName);
      }
    }, 100); // Check every 100ms
  }

  /**
   * Simple sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status for an API
   */
  getStatus(apiName: string): {
    available: boolean;
    tokensRemaining: number;
    queueLength: number;
  } | null {
    const bucket = this.buckets.get(apiName);
    const queue = this.queue.get(apiName);

    if (!bucket) return null;

    this.refillTokens(apiName);

    return {
      available: bucket.tokens > 0,
      tokensRemaining: bucket.tokens,
      queueLength: queue?.length || 0
    };
  }

  /**
   * Reset rate limiter for an API (useful for testing)
   */
  reset(apiName: string): void {
    const bucket = this.buckets.get(apiName);
    if (bucket) {
      bucket.tokens = bucket.config.maxRequests;
      bucket.lastRefill = Date.now();
    }

    const queue = this.queue.get(apiName);
    if (queue) {
      queue.length = 0;
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configure known APIs with their rate limits

// Alpha Vantage (Free tier: 25 requests/day)
rateLimiter.register('alphaVantage', {
  maxRequests: 25,
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  minDelay: 12000 // 12 seconds between requests (5 per minute)
});

// Twelve Data (Free tier: 800 requests/day, 8 per minute)
rateLimiter.register('twelveData', {
  maxRequests: 8,
  windowMs: 60 * 1000, // 1 minute
  minDelay: 8000 // 8 seconds between requests
});

// Free Indian Stock API (No official limit, be conservative)
rateLimiter.register('indianStockAPI', {
  maxRequests: 60,
  windowMs: 60 * 1000, // 1 minute
  minDelay: 1000 // 1 second between requests
});

// NSE India website (Scraping - very conservative)
rateLimiter.register('nseIndia', {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  minDelay: 6000 // 6 seconds between requests
});

// Screener.in (Scraping - be respectful, no official API)
rateLimiter.register('screener', {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  minDelay: 3000 // 3 seconds between requests
});

// Yahoo Finance (Unofficial API - be conservative)
rateLimiter.register('yahooFinance', {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  minDelay: 1000 // 1 second between requests
});

// TrueData (Paid - 1 req/sec typical limit)
rateLimiter.register('trueData', {
  maxRequests: 60,
  windowMs: 60 * 1000,
  minDelay: 1000
});

// Breeze API (ICICI Direct - 1 req/sec)
rateLimiter.register('breeze', {
  maxRequests: 60,
  windowMs: 60 * 1000,
  minDelay: 1000
});

// Upstox API (25 requests per second)
rateLimiter.register('upstox', {
  maxRequests: 25,
  windowMs: 1000, // 1 second
  minDelay: 50 // 50ms between requests
});

// NewsAPI (Free tier: 100 requests/day)
rateLimiter.register('newsAPI', {
  maxRequests: 100,
  windowMs: 24 * 60 * 60 * 1000,
  minDelay: 1000
});

export { RateLimiter };
export type { RateLimitConfig };
