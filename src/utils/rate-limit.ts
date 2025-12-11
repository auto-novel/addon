import { Persist } from "@/utils/persist";
import { DEFAULT_RATE_LIMIT_CONFIG } from "@/utils/consts";
import { Mutex } from "async-mutex";

export type RateLimitConfig = {
  maxRequestsPerMinute: number;
  minIntervalMs: number; // minimal interval between requests in milliseconds
  maxParallelRequests: number;
};

type ReleaseFunction = () => void;
type QueuedTask = {
  resolve: (release: ReleaseFunction) => void;
  reject: (reason?: any) => void;
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

  version: Persist<string, string> = new Persist({
    tag: "rate_limiter_version",
    storageArea: "local",
    defaultValue: "",
  });

  constructor() {
    this.defaultConfig = DEFAULT_RATE_LIMIT_CONFIG["*"];
  }

  async init() {
    const curVersion = browser.runtime.getManifest().version;
    const version = (await this.version.get("version")) || "";
    if (version !== curVersion) {
      debugLog(
        `RateLimiter version changed: ${version} -> ${curVersion}, resetting configs.`,
      );
      await this.configs.clear();
    }
    await this.version.set("version", curVersion);

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

  async clear() {
    await this.configs.clear();
  }

  private queues = new Map<string, QueuedTask[]>();
  private timestamps = new Map<string, number[]>();
  private activeRequests = new Map<string, number>();

  async register(key: string, config: RateLimitConfig) {
    return await this.configs.set(key, config);
  }

  public urlToKey(url: string): string {
    const hostname = new URL(url).hostname;
    return hostname;
  }

  private mutex = new Mutex();
  public acquire(key: string): Promise<ReleaseFunction> {
    return this.mutex.runExclusive(() => {
      if (!this.queues.has(key)) {
        this.queues.set(key, []);
        this.timestamps.set(key, []);
        this.activeRequests.set(key, 0);
      }

      return new Promise((resolve, reject) => {
        this.queues.get(key)!.push({ resolve, reject });
        this.processQueue(key);
      });
    });
  }

  private release(key: string): void {
    const currentActive = this.activeRequests.get(key) || 0;
    this.activeRequests.set(key, currentActive - 1);
    debugLog("Request released", { key, active: this.activeRequests.get(key) });
    this.processQueue(key);
  }

  private async processQueue(key: string): Promise<void> {
    const queue = this.queues.get(key)!;
    if (queue.length === 0) return;
    const active = this.activeRequests.get(key)!;
    const config = (await this.configs.get(key)) || this.defaultConfig;

    if (
      config.maxParallelRequests > 0 &&
      active >= config.maxParallelRequests
    ) {
      debugLog("[ratelimiter] Max parallel requests reached, waiting...", {
        key,
        active,
        max: config.maxParallelRequests,
      });
      return;
    }

    const timestamps = this.timestamps.get(key)!;
    const now = Date.now();

    // Clean up old timestamps from the sliding window
    const oneMinuteAgo = now - 60000;
    while (timestamps.length > 0 && timestamps[0] <= oneMinuteAgo) {
      timestamps.shift();
    }

    if (
      timestamps.length >= config.maxRequestsPerMinute &&
      config.maxRequestsPerMinute > 0
    ) {
      const oldestRequestTime = timestamps[0];
      const delayForMinuteLimit = Math.max(0, oldestRequestTime + 60000 - now);

      if (delayForMinuteLimit > 0) {
        debugLog("[ratelimiter] Per-minute limit reached, scheduling check", {
          key,
          delay: delayForMinuteLimit,
        });
        // 等待后重新调度，而不是阻塞在这里持有循环
        setTimeout(() => this.processQueue(key), delayForMinuteLimit);
        return;
      }
    }

    // 3. 检查最小请求间隔 (minIntervalMs)
    const lastRequestTime =
      timestamps.length > 0 ? timestamps[timestamps.length - 1] : 0;
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < config.minIntervalMs) {
      const delayForInterval = config.minIntervalMs - timeSinceLast;
      debugLog("[ratelimiter] Interval limit reached, scheduling check", {
        key,
        delay: delayForInterval,
      });
      setTimeout(() => this.processQueue(key), delayForInterval);
      return;
    }

    this.activeRequests.set(key, this.activeRequests.get(key)! + 1);
    this.timestamps.get(key)!.push(Date.now());

    const nextTask = queue.shift();
    if (nextTask) {
      const releaseFunc = () => this.release(key);
      nextTask.resolve(releaseFunc);
    }

    // 立即尝试再次处理队列，以填充所有可用的并行槽位
    // 这会创建一个微任务，不会阻塞当前执行
    Promise.resolve().then(() => this.processQueue(key));
  }
}

export const rateLimiter = new RateLimiter();
