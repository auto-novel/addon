// ================================== msg types ===============================
export enum MessageType {
  Ping = "AUTO_NOVEL_CRAWLER_PING",
  Request = "AUTO_NOVEL_CRAWLER_REQUEST",
  Response = "AUTO_NOVEL_CRAWLER_RESPONSE",
  DebugLog = "AUTO_NOVEL_DEBUG_LOG",
}

export interface MessagePing {
  type: typeof MessageType.Ping;
  id?: string;
}

export type RequestPayload = {
  cmd: keyof ClientCmd;
  params?: any;
};

export interface MessageRequest {
  type: typeof MessageType.Request;
  id?: string;
  payload: RequestPayload;
}

export interface MessageResponse {
  type: typeof MessageType.Response;
  id?: string;
  payload: ResponsePayload;
}

export enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

export enum LogContext {
  Background = "background",
  Content = "content",
  Inject = "inject",
  Unknown = "unknown",
}

export type SerializableLogValue =
  | null
  | string
  | number
  | boolean
  | SerializableLogValue[]
  | { [key: string]: SerializableLogValue };

export interface LogEntry {
  id: string;
  timestamp: number;
  isoTime: string;
  level: LogLevel;
  context: LogContext;
  args: SerializableLogValue[];
  text: string;
  version: string;
}

export interface DebugLogPayload {
  entry: LogEntry;
}

export interface MessageDebugLog {
  type: typeof MessageType.DebugLog;
  payload: DebugLogPayload;
}

export type ResponsePayload = {
  success: boolean;
  result?: any;
  error?: string | SerializableError;
};

export type Message =
  | MessagePing
  | MessageRequest
  | MessageResponse
  | MessageDebugLog;

// ======================== types =================================
export type EnvType = {
  sender: {
    tabId: number;
    origin?: string;
    url: string;
  };
};

export type SerializableResponse = {
  body: string;
  status: number;
  statusText: string;
  ok: boolean;
  headers: [string, string][];
  redirected: boolean;
  url: string;
  type: ResponseType;
  redirectUrls?: string[];
  tabId?: number;
};

export type SerializableError = {
  message: string;
  name?: string;
  redirectUrls?: string[];
  redirectUrl?: string;
  requestUrl?: string;
  tabId?: number;
};

export type TabFetchError = Error & {
  redirectUrls?: string[];
  redirectUrl?: string;
  requestUrl?: string;
  tabId?: number;
};

export const TabFetchResponseHeaders = {
  TabId: "X-AutoNovelAddon-TabId",
  ResponseUrl: "X-AutoNovelAddon-Response-Url",
  Redirected: "X-AutoNovelAddon-Redirected",
  RedirectUrl: "X-AutoNovelAddon-Redirect-Url",
  RedirectUrls: "X-AutoNovelAddon-Redirect-Urls",
} as const;

export async function serializeResponse(
  response: Response,
): Promise<SerializableResponse> {
  const headers: [string, string][] = Array.from(response.headers.entries());
  const bodyText = await response.text();

  const serializableResponse = {
    body: bodyText,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: headers,
    redirected: response.redirected,
    url: response.url,
    type: response.type,
  };
  return serializableResponse;
}

const NULL_BODY_STATUSES = new Set([0, 101, 204, 205, 304]);

/**
 * Restore fetch's read-only response metadata after crossing the RPC boundary.
 *
 * A plain `new Response()` loses `url`, `redirected`, and `type`. Defining own
 * accessors after construction preserves those values without subclassing:
 * native Response constructors may access virtual getters before a subclass
 * has finished initializing.
 */
function restoreResponseMetadata(
  response: Response,
  serialized: SerializableResponse,
): Response {
  const nativeClone = response.clone.bind(response);
  Object.defineProperties(response, {
    status: { configurable: true, get: () => serialized.status },
    statusText: { configurable: true, get: () => serialized.statusText },
    ok: { configurable: true, get: () => serialized.ok },
    redirected: { configurable: true, get: () => serialized.redirected },
    url: { configurable: true, get: () => serialized.url },
    type: { configurable: true, get: () => serialized.type },
    redirectUrls: {
      configurable: true,
      value: Object.freeze([...(serialized.redirectUrls ?? [])]),
    },
    tabId: { configurable: true, value: serialized.tabId },
    clone: {
      configurable: true,
      value: () => restoreResponseMetadata(nativeClone(), serialized),
    },
  });
  return response;
}

export function deserializeResponse(serResp: SerializableResponse): Response {
  const canConstructStatus = serResp.status >= 200 && serResp.status <= 599;
  const response = new Response(
    NULL_BODY_STATUSES.has(serResp.status) ? null : serResp.body,
    {
      // The restored public getters retain status 0. ResponseInit itself only
      // accepts status codes in the 200-599 range.
      status: canConstructStatus ? serResp.status : 200,
      statusText: canConstructStatus ? serResp.statusText : "",
      headers: serResp.headers,
    },
  );
  return restoreResponseMetadata(response, serResp);
}

export function serializeError(error: unknown): SerializableError {
  const value =
    typeof error === "object" && error !== null
      ? (error as Partial<TabFetchError>)
      : null;
  const redirectUrls = Array.isArray(value?.redirectUrls)
    ? value.redirectUrls.filter(
        (redirectUrl): redirectUrl is string => typeof redirectUrl === "string",
      )
    : undefined;

  return {
    message:
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : String(error),
    name: error instanceof Error ? error.name : undefined,
    redirectUrls,
    redirectUrl:
      typeof value?.redirectUrl === "string" ? value.redirectUrl : undefined,
    requestUrl:
      typeof value?.requestUrl === "string" ? value.requestUrl : undefined,
    tabId: typeof value?.tabId === "number" ? value.tabId : undefined,
  };
}

export function deserializeError(
  error: string | SerializableError | undefined,
): TabFetchError {
  if (typeof error === "string" || error === undefined) {
    return new Error(error ?? "Unknown addon error");
  }

  const deserialized = new Error(error.message) as TabFetchError;
  deserialized.name = error.name ?? "Error";
  deserialized.redirectUrls = error.redirectUrls
    ? [...error.redirectUrls]
    : undefined;
  deserialized.redirectUrl = error.redirectUrl;
  deserialized.requestUrl = error.requestUrl;
  deserialized.tabId = error.tabId;
  return deserialized;
}

export interface SerializableRequest {
  url: string;
  // RequestInit 的所有可序列化属性
  method: string;
  headers?: [string, string][];
  body?: string; // base64 encoded body
  mode?: RequestMode;
  credentials: RequestCredentials;
  cache: RequestCache;
  redirect?: RequestRedirect;
  referrer?: string;
  integrity?: string;
}

export function deserializeRequest(
  req: SerializableRequest | string,
): Request | string {
  if (typeof req === "string") {
    return req;
  }

  const init: RequestInit = {
    method: req.method,
    headers: new Headers(req.headers),
    body: req.body,
    mode: req.mode,
    credentials: req.credentials,
    cache: req.cache,
    redirect: req.redirect,
    referrer: req.referrer,
    integrity: req.integrity,
  };

  return new Request(req.url, init);
}

export async function serializeRequest(
  request: string | Request,
): Promise<SerializableRequest | string> {
  if (typeof request === "string") {
    return request;
  }

  const headers: [string, string][] = Array.from(request.headers.entries());

  // FIXME(kuriko):
  //   对于 Firefox，即使有 body，Request.body 也是 undefiend。
  //   对于 Chrome，有 body 时，Request.body 存在，可以用于判断。
  //   对于 GET, HEAD， body 必须是 undefined。
  let body = undefined;
  try {
    if (request.method === "GET" || request.method === "HEAD") {
      body = undefined;
    } else {
      body = await request.clone().text();
    }
  } catch (e) {
    console.error("Failed to serialize request body: ", e);
  }
  const req: SerializableRequest = {
    url: request.url,
    method: request.method,
    headers,
    body,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    integrity: request.integrity,
  };
  return req;
}

export type InfoResult = {
  version: string; // extension version
  homepage_url: string;
};

export type BypassParams = {
  requestUrl: string;
  spoofOrigin?: string;
  origin?: string;
  referer?: string;
  userAgent?: string;
  viewportWidth?: string;
};

export type TabFetchOptions = {
  tabUrl: string;
  tabId?: number;
  forceNewTab?: boolean;
  forceWaitForLoad?: boolean;
  closeTimeout?: number;
};

export type TabDomQueryOptions = {
  tabId?: number;
  forceNewTab?: boolean;
  forceWaitForLoad?: boolean;
  closeTimeout?: number;
};

export type CookieStatus = Partial<Browser.cookies.Cookie> & {
  name: string;
};

export type DomQueryResults = {
  tabId: number;
  results: string[];
  readyState: DocumentReadyState;
};

export type ClientCmd = {
  "base.ping"(): Promise<string>;
  "base.info"(): Promise<InfoResult>;

  "local.bypass.enable"(params: BypassParams, env: EnvType): Promise<void>;
  "local.bypass.disable"(params: BypassParams, env: EnvType): Promise<void>;

  "http.fetch"(
    params: {
      input: SerializableRequest | string;
      requestInit?: RequestInit;
    },
    env: EnvType,
  ): Promise<SerializableResponse>;

  "tab.http.fetch"(
    params: {
      options: TabFetchOptions;
      input: SerializableRequest | string;
      requestInit?: RequestInit;
    },
    env: EnvType,
  ): Promise<SerializableResponse>;

  "tab.dom.querySelectorAll"(
    params: {
      tabUrl: string;
      selector: string;
      options?: TabDomQueryOptions;
    },
    env: EnvType,
  ): Promise<DomQueryResults>;

  "cookies.status"(
    params: {
      url?: string;
      domain?: string;
      partitionKey?: Browser.cookies.CookiePartitionKey;
      keys: string[] | "*";
    },
    env: EnvType,
  ): Promise<Record<string, CookieStatus | null>>;

  "cookies.patch"(
    params: {
      url: string;
      patches: Record<string, CookieStatus | null>;
    },
    env: EnvType,
  ): Promise<void>;
};
