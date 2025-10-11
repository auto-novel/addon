import { type SerializableRequest } from "@/rpc/types";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitOrTimeout<T>(
  task: Promise<T>,
  timeout: number,
): Promise<T> {
  const ctl = new AbortController();
  let ret: T | null = null;
  return await Promise.race([
    (async () => {
      ret = await task;
      ctl.abort();
      return ret;
    })(),
    sleep(timeout).then(() => {
      if (ctl.signal.aborted) {
        return ret as T;
      }
      return Promise.reject("Timeout");
    }),
  ]);
}

type BrowserRemoteExecutionOptions<T, A extends any[]> = {
  target: Browser.scripting.InjectionTarget;
  func: (...args: A) => T | Promise<T>;
  args: A;
};
export async function browserRemoteExecution<T, A extends any[]>({
  target,
  func,
  args,
}: BrowserRemoteExecutionOptions<T, A>): Promise<T> {
  const results = await browser.scripting.executeScript({ target, func, args });

  if (results && results[0] && results[0].result) {
    return results[0].result as T;
  } else {
    const msg = `Failed to execute script in tab: ${results}`;
    console.error(results);
    debugLog(msg);
    throw new Error(msg);
  }
}

export function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash < 0 ? -hash : hash;
}

export function extractUrl(input: SerializableRequest | string): string {
  return typeof input === "string" ? input : input.url;
}

export function debugLog(...args: any[]) {
  console.debug("[AutoNovel.addon]", ...args);
}
debugLog.info = (...args: any[]) => console.info("[AutoNovel.addon]", ...args);
debugLog.error = (...args: any[]) =>
  console.error("[AutoNovel.addon]", ...args);
debugLog.warn = (...args: any[]) => console.warn("[AutoNovel.addon]", ...args);

export function newError(msg: string) {
  return new Error(`[AutoNovel.addon] ${msg}`);
}

export function b64EncodeUnicode(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }),
  );
}
