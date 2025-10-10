export type SerializableResponse = {
  body: string;
  status: number;
  statusText: string;
  ok: boolean;
  headers: [string, string][];
  redirected: boolean;
  url: string;
  type: ResponseType;
};

export async function Response2SerResp(
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
export async function serializeRequest(
  request: RequestInfo,
): Promise<SerializableRequest | string> {
  if (typeof request === "string") {
    return request;
  }

  const headers: [string, string][] = Array.from(request.headers.entries());
  console.log("serializeRequest: ", headers);

  const req: SerializableRequest = {
    url: request.url,
    method: request.method,
    headers,
    body: request.body ? await request.text() : undefined,
    mode: request.mode,
    credentials: request.credentials,
    cache: request.cache,
    redirect: request.redirect,
    referrer: request.referrer,
    integrity: request.integrity,
  };
  return req;
}
export function deserializeRequest(req: SerializableRequest): RequestInfo {
  if (typeof req === "string") {
    return req;
  }

  console.log("deserializeRequest: ", req);
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

export type InfoResult = {
  version: string;
};

export type HttpFetchParams = {
  input: SerializableRequest | string;
  requestInit?: RequestInit;
};
export type HttpFetchResult = SerializableResponse;

export type HttpGetParams = {
  url: string;
  params?: Record<string, string>;
  headers?: [string, string][];
};
export type HttpGetResult = SerializableResponse;

export type HttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
  headers?: [string, string][];
};
export type HttpPostJsonResult = SerializableResponse;

export type TabSwitchToParams = {
  url: string;
};
export type TabSwitchToResult = void;

export type TabHttpFetchParams = {
  input: SerializableRequest | string;
  requestInit?: RequestInit;
};
export type TabHttpFetchResult = SerializableResponse;

export type TabHttpGetParams = {
  url: string;
  params?: Record<string, string>;
};
export type TabHttpGetResult = SerializableResponse;

export type TabHttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
  headers?: [string, string][];
};
export type TabHttpPostJsonResult = SerializableResponse;

export type CookiesGetParams = {
  url: string;
};
export type CookiesGetResult = chrome.cookies.Cookie[];

export type DomQuerySelectorAllParams = {
  selector: string;
};
export type DomQuerySelectorAllResult = string[];

export type JobNewParams = void;
export type JobNewResult = { job_id: string };

export type JobQuitParams = void;
export type JobQuitResult = {
  status: "completed" | "failed" | "canceled" | "ignored";
  reason?: string;
};

export type BypassEnableParams = {
  url: string;
  origin?: string;
  referer?: string;
};
export type BypassEnableResult = string;

export type ClientMethods = {
  "base.ping"(): Promise<string>;
  "base.info"(): Promise<InfoResult>;

  "local.bypass.enable"(
    params: BypassEnableParams,
  ): Promise<BypassEnableResult>;
  "local.bypass.disable"(params: { id: string; url: string }): Promise<void>;

  "http.fetch"(params: HttpFetchParams): Promise<HttpFetchResult>;

  "tab.switchTo"(params: TabSwitchToParams): Promise<TabSwitchToResult>;
  "tab.http.fetch"(params: TabHttpFetchParams): Promise<TabHttpFetchResult>;
  "tab.dom.querySelectorAll"(
    params: DomQuerySelectorAllParams,
  ): Promise<DomQuerySelectorAllResult>;

  "cookies.get"(params: CookiesGetParams): Promise<CookiesGetResult>;
  "cookies.getStr"(params: { url: string }): Promise<string>;
  "cookies.setFromResponse"(params: {
    response: SerializableResponse;
  }): Promise<void>;
};
