import { Persist } from "@/utils/persist";
import { sleep } from "@/utils/tools";
import { DEFAULT_RATE_LIMIT_CONFIG } from "@/utils/consts";

export type RateLimitConfig = {
  maxRequestsPerMinute: number;
  minIntervalMs: number; // minimal interval between requests in milliseconds
  burst: number;
};

type QueuedTask = {
  resolve: (value: unknown) => void;
};

/*
  RateLimiter by domain
  This can be tweaked by option page
*/
class RateLimiter {
  defaultConfig: RateLimitConfig;

  configs: Persist<string, RateLimitConfig | null> = new Persist({
    tag: "rate_limiter_config",
    storageArea: "local",
    defaultValue: null,
  });

  constructor() {
    this.defaultConfig = DEFAULT_RATE_LIMIT_CONFIG["*"];
  }

  async init() {
    const promises = Object.entries(DEFAULT_RATE_LIMIT_CONFIG).map(
      async ([key, config]) => {
        const existingConfig = await this.configs.get(key);
        if (IS_DEBUG || !existingConfig) {
          // Force reset to default in debug mode
          await this.configs.set(key, config);
        }
      },
    );
    await Promise.all(promises);

    const configs = await this.configs.snapshot();
    debugLog("RateLimiter initialized with configs:", configs);
  }

  private queues = new Map<string, QueuedTask[]>();
  private timestamps = new Map<string, number[]>();
  private isProcessing = new Map<string, boolean>();

  async register(key: string, config: RateLimitConfig) {
    return await this.configs.set(key, config);
  }

  public urlToKey(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname;
  }

  public acquire(key: string) {
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
      this.timestamps.set(key, []);
      this.isProcessing.set(key, false);
    }

    return new Promise((resolve) => {
      this.queues.get(key)!.push({ resolve });
      this.processQueue(key);
    });
  }

  private async processQueue(key: string): Promise<void> {
    if (this.isProcessing.get(key)) {
      return;
    }
    this.isProcessing.set(key, true);

    try {
      const queue = this.queues.get(key)!;
      const timestamps = this.timestamps.get(key)!;
      const config = (await this.configs.get(key)) || this.defaultConfig;
      console.error(config);
      while (queue.length > 0) {
        const now = Date.now();

        // Clean up old timestamps from the sliding window
        const oneMinuteAgo = now - 60000;
        while (timestamps.length > 0 && timestamps[0] <= oneMinuteAgo) {
          timestamps.shift();
        }

        // Calculate necessary delays
        const lastRequestTime = timestamps[timestamps.length - 1] || 0;
        const timeSinceLastRequest = now - lastRequestTime;
        const delayForInterval =
          config.minIntervalMs > 0
            ? Math.max(0, config.minIntervalMs - timeSinceLastRequest)
            : 0;

        let delayForMinuteLimit = 0;
        if (config.burst > 0 && config.maxRequestsPerMinute > 0) {
          if (
            timestamps.length >= config.burst &&
            timestamps.length >= config.maxRequestsPerMinute
          ) {
            const oldestRequestTime = timestamps[0];
            delayForMinuteLimit = Math.max(0, oldestRequestTime + 60000 - now);
          }
        }

        const delay = Math.max(delayForInterval, delayForMinuteLimit);
        if (delay > 0) {
          debugLog("Sleep for rate limiting:", { key, delay });
          await sleep(delay);
        }

        const nextTask = queue.shift();
        if (!nextTask) continue;
        nextTask.resolve(undefined);
        this.timestamps.get(key)!.push(Date.now());
      }
    } finally {
      this.isProcessing.set(key, false);
    }
  }
}

export const rateLimiter = new RateLimiter();
