import type { SerializableRequest } from "@/rpc/types";
import { MAX_PAGE_LOAD_WAIT_TIME } from "@/shared/consts";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForTabUrl(
  tab: Browser.tabs.Tab,
  timeout: number = MAX_PAGE_LOAD_WAIT_TIME,
): Promise<string | null> {
  let tabUrl = tab.url ?? tab.pendingUrl;
  if (!tabUrl && tab.id != null) {
    await sleep(timeout);
    const updated = await browser.tabs.get(tab.id);
    tabUrl = updated.url ?? updated.pendingUrl;
  }
  return tabUrl ?? null;
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

  const injectionResult = results?.[0] as
    | (Browser.scripting.InjectionResult<T> & { error?: unknown })
    | undefined;
  if (injectionResult?.error) {
    throw newError(`Failed to execute script in tab: ${injectionResult.error}`);
  }
  if (injectionResult?.result !== undefined) {
    return injectionResult.result as T;
  }
  throw newError(`Failed to execute script in tab: ${results}`);
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

export function extractUrl(
  input: Request | SerializableRequest | string | URL,
): string {
  if (typeof input == "string") return input;
  else if (input instanceof URL) return input.toString();
  else return input.url;
}

export function getHeaderValue(
  headers: HeadersInit | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  return new Headers(headers).get(name) ?? undefined;
}

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

export function rebuildCookieUrl(cookie: Browser.cookies.Cookie): string {
  const protocol = cookie.secure ? "https://" : "http://";
  const domain = cookie.domain.startsWith(".")
    ? cookie.domain.substring(1)
    : cookie.domain;
  const url = `${protocol}${domain}${cookie.path}`;
  return url;
}

export function cookie2SetDetail(
  cookie: Browser.cookies.Cookie,
): Browser.cookies.SetDetails {
  const setDetail = {
    url: rebuildCookieUrl(cookie),
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    storeId: cookie.storeId,
    ...(cookie.expirationDate && { expirationDate: cookie.expirationDate }),
  };
  return setDetail;
}
