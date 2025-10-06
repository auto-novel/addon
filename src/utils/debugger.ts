import { Response2SerResp, type SerializableRequest, type SerializableResponse } from "@rpc/client/client.types";
import { ChromeRemoteExecution, SerReq2RequestInfo } from "./tools";
import setCookie from "set-cookie-parser";
import { browserInfo } from "./consts";
import { installCORSRules, installSpoofRules, uninstallCORSRules, uninstallSpoofRules } from "./firefox";

type Tab = chrome.tabs.Tab;

export class Debugger {
  tab: Tab;
  debuggee: { tabId: number };

  private init = {
    fetch: false,
    page: false,
    cors: false
  };

  constructor(tab: Tab) {
    this.tab = tab;
    this.debuggee = { tabId: tab.id! };
  }

  private ensureChrome() {
    if (browserInfo.isFirefox) {
      console.error("Debugger is not supported in Firefox.");
      throw new Error("Debugger is not supported in Firefox.");
    }
  }

  get debugger() {
    this.ensureChrome();
    return chrome.debugger;
  }

  private async enableFetch() {
    if (this.init.fetch) return;
    await this.debugger.sendCommand(this.debuggee, "Fetch.enable", {
      patterns: [{ requestStage: "Request" }, { requestStage: "Response" }]
    });
    this.debugger.onEvent.addListener(this.onEventListener);
    this.init.fetch = true;
    console.log("[Debugger] Fetch interception enabled.");
  }

  private async enablePage() {
    if (this.init.page) return;
    await this.debugger.sendCommand(this.debuggee, "Page.enable");
    this.init.page = true;
  }

  public async connect() {
    if (browserInfo.isChrome) {
      await this.debugger.attach({ tabId: this.tab.id! }, "1.3");
    }
  }

  public async disconnect() {
    this.spoofFuncs.clear();
    this.init.cors = false;
    if (browserInfo.isChrome) {
      this.debugger.onEvent.removeListener(this.onEventListener);
      await this.debugger.sendCommand(this.debuggee, "Fetch.disable");
      await this.debugger.detach({ tabId: this.tab.id });
    }
  }

  // Excute js at the earliest possible time.
  private async danger_remote_execute_asap(js: string): Promise<void> {
    const TAG = "[AutoNovel.RCE.asap]";
    console.warn(`${TAG} executing js: `, js);
    await this.enablePage();
    const result = await this.debugger.sendCommand(this.debuggee, "Page.addScriptToEvaluateOnNewDocument", {
      source: js
    });
    console.log(`${TAG} script result: `, result);
    // trigger a reload to make script effective
    await chrome.tabs.reload(this.tab.id!);
  }

  private async danger_remote_execute<T>(js: string): Promise<T> {
    const TAG = "[AutoNovel.RCE]";
    console.warn(`${TAG} executing js: `, js);
    const ret = (await this.debugger.sendCommand(this.debuggee, "Runtime.evaluate", {
      expression: js,
      awaitPromise: true,
      returnByValue: true
    })) as { exceptionDetails?: { exception: any }; result: { value: T } };

    console.warn(`${TAG} script result: `, ret);
    if (ret.exceptionDetails) {
      // NOTE(kuriko): Sometimes it's the cors error.
      return Promise.reject(JSON.stringify(ret.exceptionDetails.exception));
    }
    return Promise.resolve(ret.result.value);
  }

  public async tab_set_alway_focus() {
    const TAG = "[AutoNovel.SPOOF]";
    const js = `
      // 覆盖 document.hasFocus
      Object.defineProperty(document, 'hasFocus', {
        get: () => {
          console.log('${TAG} document.hasFocus() called, returning true.');
          return true;
        },
        configurable: true
      });
      // 覆盖 document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        get: () => {
          console.log('${TAG} document.visibilityState accessed, returning "visible".');
          return 'visible';
        },
        configurable: true
      });
      // 劫持 addEventListener
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'blur' || type === 'visibilitychange') {
          console.log('${TAG} Blocked an attempt to listen for event:', type);
          return; // 静默地阻止监听
        }
        originalAddEventListener.call(this, type, listener, options);
      };
    `;
    await this.danger_remote_execute_asap(js);
  }

  public async dom_querySelectorAll(selector: string): Promise<string[]> {
    const ret = (await this.danger_remote_execute<string[]>(`
        Array.from(document.querySelectorAll("${selector}")).map(e => e.outerHTML)
    `)) as string[];
    return ret;
  }

  public async cookies_get(url: string): Promise<string> {
    const cookies = await chrome.cookies.getAll({ url });
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    console.log(`[Debugger] Retrieved cookies for ${url}: ${cookieStr}`);
    return cookieStr;
  }

  public async cookies_refresh(response: SerializableResponse) {
    const setCookieStrings = Array.from(response.headers)
      .filter((h) => h[0].toLowerCase() === "set-cookie")
      .map((h) => h[1]);

    if (setCookieStrings.length === 0) {
      return;
    }

    const parsedCookies = setCookie.parse(setCookieStrings);
    const setPromises = parsedCookies.map((cookie) => {
      const setDetail: chrome.cookies.SetDetails = {
        ...cookie,
        url: response.url, // Provide the required context URL.
        sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus // Cast is needed here
      };
      // Convert 'expires' or 'maxAge' to 'expirationDate' (seconds since epoch)
      if (cookie.expires) {
        setDetail.expirationDate = cookie.expires.getTime() / 1000;
      } else if (cookie.maxAge) {
        // maxAge is seconds from now.
        setDetail.expirationDate = Date.now() / 1000 + cookie.maxAge;
      }
      return chrome.cookies.set(setDetail);
    });
    try {
      await Promise.all(setPromises);
      console.log(`Successfully set ${setPromises.length} cookies for ${response.url}`);
    } catch (error) {
      console.error("Failed to set one or more cookies:", error);
    }
  }

  public async http_fetch(
    input: SerializableRequest | string,
    requestInit?: RequestInit
  ): Promise<SerializableResponse> {
    await this.disable_cors_start();

    const url = typeof input === "string" ? input : input.url;
    const origin = new URL(this.tab.url || this.tab.pendingUrl!).origin;
    const referer = origin + "/";
    await installSpoofRules(url, origin, referer);
    await installCORSRules(this.tab.url || this.tab.pendingUrl || "*");

    // const cookieStr = await this.cookies_get(url);

    // const headers = new Headers(requestInit?.headers || {});
    // headers.set("Cookie", cookieStr);

    // requestInit = {
    //   ...requestInit,
    //   headers: Object.fromEntries(headers.entries()),
    // };

    const resp = await ChromeRemoteExecution({
      target: { tabId: this.tab.id! },
      func: async (input: string, requestInit?: RequestInit) => {
        const _input = SerReq2RequestInfo(JSON.parse(input));
        const ret = await fetch(_input, requestInit);
        return ret;
      },
      args: [JSON.stringify(input), requestInit]
    });

    await this.disable_cors_stop();
    const resp_ser = await Response2SerResp(resp);
    return resp_ser;
  }

  public async http_get(url: string, params: Record<string, string> = {}, headers = {}): Promise<SerializableResponse> {
    const final_url = new URL(url);
    for (const [k, v] of Object.entries(params)) {
      final_url.searchParams.append(k, v);
    }

    const ret = await this.http_fetch(final_url.toString(), { method: "GET", cache: "no-cache", headers });
    return ret;
  }

  public async http_post_json(url: string, data = {}, headers = {}): Promise<SerializableResponse> {
    const ret = await this.http_fetch(url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers
      },
      body: JSON.stringify(data)
    });
    return ret;
  }

  private onEventListener = async (source: chrome._debugger.DebuggerSession, method: string, params: any) => {
    if (method !== "Fetch.requestPaused" || source.tabId !== this.tab.id) {
      return;
    }

    const { requestId, request, resourceType } = params;

    if (params.responseStatusCode) {
      if (this.init.cors) {
        // NOTE(kuriko): I know this looks ugly, but it just works.
        return await this.handleResponse(source, method, params);
      }
    } else {
      const spoofHandler = this.spoofFuncs.get(request.url);
      if (spoofHandler) {
        await spoofHandler(source, method, params);
        return;
      }
    }
    try {
      if (params.responseStatusCode) {
        // 响应阶段的默认放行
        await this.debugger.sendCommand(this.debuggee, "Fetch.continueResponse", { requestId });
      } else {
        // 请求阶段的默认放行
        await this.debugger.sendCommand(this.debuggee, "Fetch.continueRequest", { requestId });
      }
    } catch (e) {
      if (!String(e).includes("Invalid state")) {
        console.error(`Default continue failed for ${requestId}:`, e);
      }
    }
  };

  private handleSPOOFRequest(url: string, origin?: string, referer?: string) {
    return async (source: chrome.debugger.Debuggee, method: string, params: any) => {
      const requestId = params.requestId as string;
      const requestUrl = params.request.url as string;

      console.log(`[Debugger] Intercepted our target request: ${requestUrl}`);

      const originalHeaders = params.request.headers;

      // Origin should be right.
      const targetOrigin = origin ?? new URL(url).origin;
      const targetReferer = referer ?? targetOrigin + "/";

      const spoofedHeaders = Object.entries(originalHeaders)
        .map(([name, value]) => ({ name, value }))
        .filter((h: any) => h.name.toLowerCase() !== "origin")
        .filter((h: any) => h.name.toLowerCase() !== "referer")
        .concat([
          { name: "Origin", value: targetOrigin },
          { name: "Referer", value: targetReferer }
        ]);

      console.log("[Debugger] Spoofed Headers:", spoofedHeaders);

      try {
        await this.debugger.sendCommand(this.debuggee, "Fetch.continueRequest", {
          requestId: requestId,
          headers: spoofedHeaders
        });
      } catch (e) {
        console.error(`Failed to continue request for requestId ${requestId}:`, e);
      }
    };
  }

  private async handleResponse(source: chrome._debugger.DebuggerSession, method: string, params: any) {
    const { requestId, request, responseHeaders, responseStatusCode } = params;

    const originHeader = request.headers["Origin"] || request.headers["origin"];
    const originToAllow = new URL(this.tab.url || this.tab.pendingUrl || originHeader)?.origin || "*";

    const newHeaders = responseHeaders ? [...responseHeaders] : [];

    const acaoHeader = newHeaders.find((h) => h.name.toLowerCase() === "access-control-allow-origin");
    if (acaoHeader) {
      acaoHeader.value = originToAllow;
    } else {
      newHeaders.push({ name: "Access-Control-Allow-Origin", value: originToAllow });
    }

    newHeaders.push({ name: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, HEAD, OPTIONS" });
    newHeaders.push({ name: "Access-Control-Allow-Headers", value: "*" });
    newHeaders.push({ name: "Access-Control-Allow-Credentials", value: "true" });

    try {
      await this.debugger.sendCommand(source, "Fetch.continueResponse", {
        requestId: requestId,
        responseCode: responseStatusCode,
        responseHeaders: newHeaders
      });
    } catch (e) {
      console.error(`Failed to continue response for requestId ${requestId}:`, e);
    }
  }

  public async disable_cors_start() {
    if (this.init.cors) return;
    if (browserInfo.isChrome) {
      await this.enableFetch();
    } else {
      await installCORSRules(this.tab.url ?? this.tab.pendingUrl ?? "");
    }
    this.init.cors = true;
  }

  public async disable_cors_stop() {
    this.init.cors = false;
    if (browserInfo.isFirefox) {
      await uninstallCORSRules();
    }
  }

  private spoofFuncs = new Map();
  public async spoof_request_start(url: string, origin?: string, referer?: string) {
    if (browserInfo.isChrome) {
      await this.enableFetch();
      const func = this.handleSPOOFRequest(url, origin, referer);
      if (this.spoofFuncs.has(url)) {
        return;
      }
      this.spoofFuncs.set(url, func);
    } else {
      const targetOrigin = origin ?? new URL(url).origin;
      const targetReferer = referer ?? targetOrigin + "/";
      await installSpoofRules(url, targetOrigin, targetReferer);
    }
  }

  public async spoof_request_stop(url: string) {
    if (browserInfo.isChrome) {
      this.spoofFuncs.delete(url);
    } else {
      await uninstallSpoofRules();
    }
  }
}
