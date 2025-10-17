import packageJson from "@/../package.json";

export const IS_DEBUG = import.meta.env.DEV;

export const MAX_PAGE_LOAD_WAIT_TIME = 10_000; // ms
export const DELAYED_TAB_CLOSE_TIME = 3_000; // ms

export const VERSION = packageJson.version;

export const DEFAULT_RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  "*": {
    maxRequestsPerMinute: -1,
    minIntervalMs: 0,
    burst: -1,
  },
  "dict.youdao.com": {
    maxRequestsPerMinute: -1,
    minIntervalMs: 100,
    burst: -1,
  },
};
