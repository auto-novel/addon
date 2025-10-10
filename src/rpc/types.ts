export type EnvType = {
  sender: {
    id: string;
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

export function SerResp2Response(serResp: SerializableResponse): Response {
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
export async function Request2SerReq(
  request: string | Request,
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
export function SerReq2Request(
  req: SerializableRequest | string,
): Request | string {
  if (typeof req === "string") {
    return req;
  }

  debugPrint("deserializeRequest: ", req);
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
  version: string; // extension version
  homepage_url: string;
};

export type ClientMethods = {
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

  "local.bypass.disable"(
    params: {
      requestUrl: string;
      origin?: string;
      referer?: string;
    },
    env: EnvType,
  ): Promise<void>;

  "http.fetch"(
    params: {
      input: SerializableRequest | string;
      requestInit?: RequestInit;
    },
    env: EnvType,
  ): Promise<SerializableResponse>;

  "tab.http.fetch"(
    params: {
      tabUrl: string;
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
    params: { url: string },
    env: EnvType,
  ): Promise<Browser.cookies.Cookie[]>;

  "cookies.getStr"(params: { url: string }, env: EnvType): Promise<string>;

  "cookies.setFromResponse"(
    params: { response: SerializableResponse },
    env: EnvType,
  ): Promise<void>;
};
