/**
 * Rate limiter service using token bucket algorithm
 * Prevents API throttling across multiple providers
 */
interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    minDelay?: number;
}
declare class RateLimiter {
    private buckets;
    private queue;
    /**
     * Register an API with rate limit configuration
     */
    register(apiName: string, config: RateLimitConfig): void;
    /**
     * Wait for rate limit clearance before making request
     */
    waitForSlot(apiName: string): Promise<void>;
    /**
     * Refill tokens based on time elapsed
     */
    private refillTokens;
    /**
     * Wait in queue for a token to become available
     */
    private waitInQueue;
    /**
     * Periodically check if tokens are available for queued requests
     */
    private scheduleTokenCheck;
    /**
     * Simple sleep utility
     */
    private sleep;
    /**
     * Get current status for an API
     */
    getStatus(apiName: string): {
        available: boolean;
        tokensRemaining: number;
        queueLength: number;
    } | null;
    /**
     * Reset rate limiter for an API (useful for testing)
     */
    reset(apiName: string): void;
}
export declare const rateLimiter: RateLimiter;
export { RateLimiter, RateLimitConfig };
//# sourceMappingURL=rate-limiter.d.ts.map