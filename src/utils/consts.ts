import packageJson from "@/../package.json";

export const IS_DEBUG = import.meta.env.DEV;

export const MAX_PAGE_LOAD_WAIT_TIME = 10000; // ms
export const DELAYED_TAB_CLOSE_TIME = 3000; // ms

export const VERSION = packageJson.version;
