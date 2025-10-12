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
};

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

export function deserializeResponse(serResp: SerializableResponse): Response {
  const init: ResponseInit = {
    status: serResp.status,
    statusText: serResp.statusText,
    headers: serResp.headers,
  };
  const realResp = new Response(serResp.body, init);
  return realResp;
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

  console.debug("deserializeRequest: ", req);
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
  console.debug("serializeRequest: ", headers);

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
    console.debug("Failed to serialize request body: ", e);
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
};

export type TabFetchOptions = {
  tabUrl: string;
  forceNewTab?: boolean;
};

export type ClientCmd = {
  "base.ping"(): Promise<string>;
  "base.info"(): Promise<InfoResult>;

  "local.bypass.enable"(
    params: {
      requestUrl: string;
      origin?: string;
      referer?: string;
    },
    env: EnvType,
  ): Promise<void>;

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
      url: string;
      selector: string;
    },
    env: EnvType,
  ): Promise<string[]>;

  "cookies.get"(
    params: { domain: string },
    env: EnvType,
  ): Promise<Browser.cookies.Cookie[]>;

  "cookies.getStr"(params: { url: string }, env: EnvType): Promise<string>;

  "cookies.set"(
    params: { cookies: Browser.cookies.Cookie[] },
    env: EnvType,
  ): Promise<void>;

  "cookies.setFromResponse"(
    params: { response: SerializableResponse },
    env: EnvType,
  ): Promise<void>;
};

// ================================== msg types ===============================
export enum MessageType {
  Ping = "AUTO_NOVEL_CRAWLER_PING",
  Request = "AUTO_NOVEL_CRAWLER_REQUEST",
  Response = "AUTO_NOVEL_CRAWLER_RESPONSE",
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

export type ResponsePayload = {
  success: boolean;
  result?: any;
  error?: string;
};

export type Message = MessagePing | MessageRequest | MessageResponse;
