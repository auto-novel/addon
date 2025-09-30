export const isDebug = process.env.NODE_ENV !== "production";

export const WS_ADDRESS = isDebug ? "wss://csc.novalia.cc:37000" : "ws://localhost:37000";

export const MAX_PAGE_LOAD_WAIT_TIME = 30000; // ms
