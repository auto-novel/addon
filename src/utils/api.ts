import { Debugger } from "@utils/debugger";
import { WaitOrTimeout } from "@utils/tools";
import { isDebug, MAX_PAGE_LOAD_WAIT_TIME } from "@utils/consts";
import type { SerializableResponse } from "@rpc/client/client.types";
import retry from "async-retry";

type Tab = chrome.tabs.Tab;

// function requireInit(target: any, key: string, descriptor: any) {
//     const originalMethod = descriptor.value;
//     descriptor.value = async function(...args: any[]) {
//         const This = this as { initialized: boolean; init: () => Promise<void> };
//         if (!This.initialized) {
//             await This.init();
//         }
//         return originalMethod.apply(this, args);
//     }
//     return descriptor;
// }

export class Api {
  url: string;

  init = {
    tab: false,
    debugger: false
  };

  tab!: Tab;
  debugger!: Debugger;

  constructor(url: string) {
    this.url = url;
  }

  async ensureTab() {
    if (this.init.tab) return;
    await this.initTab();
    this.init.tab = true;
  }

  async ensureDebugger() {
    await this.ensureTab();
    if (this.init.debugger) return;
    await this.initDebugger();
    this.init.debugger = true;
  }

  // @requireInit
  private wait_any_tab(tab: Tab): Promise<void> {
    return new Promise<void>((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
  }

  public async tab_wait() {
    await this.wait_any_tab(this.tab);
  }

  public async close() {
    if (this.init.tab === false) {
      return;
    }
    console.debug("[AutoNovel] crawler api closing");
    if (this.init.debugger) await this.debugger.disconnect();
    if (this.init.tab) await chrome.tabs.remove(this.tab.id!);
    this.init.tab = false;
    this.init.debugger = false;
  }

  private loadTabPromise: Promise<Tab> | null = null;
  public async initTab() {
    if (this.loadTabPromise) {
      await this.loadTabPromise;
      return;
    }

    const createTabFn = () =>
      chrome.tabs
        .create({
          url: this.url.toString(),
          active: false
        })
        .then(async (tab) => {
          return await WaitOrTimeout(this.wait_any_tab(tab), MAX_PAGE_LOAD_WAIT_TIME)
            .then(() => tab)
            .catch(() => {
              console.debug(`[AutoNovel] ${this.url} timeout, proceed anyway.`);
              return tab;
            });
        });

    this.loadTabPromise = retry(createTabFn, { retries: 3, minTimeout: 1000 });
    this.tab = await this.loadTabPromise;
    this.init.tab = true;
  }

  private loadDebuggerPromise: Promise<Debugger> | null = null;
  public async initDebugger() {
    if (this.loadDebuggerPromise) {
      await this.loadDebuggerPromise;
      return;
    }
    this.loadDebuggerPromise = (async () => {
      const dbg = new Debugger(this.tab);
      await dbg.connect();
      return dbg;
    })();
    this.debugger = await this.loadDebuggerPromise;
    this.init.debugger = true;
  }

  // ==========================================================================
  public async tab_swith_to(url: string) {
    await this.ensureTab();
    await chrome.tabs.update(this.tab!.id, { url }).then((tab) =>
      WaitOrTimeout(this.wait_any_tab(tab ?? this.tab), MAX_PAGE_LOAD_WAIT_TIME)
        .then(() => {
          this.url = url;
        })
        .catch(() => {})
    );
  }

  public async tab_set_alway_focus() {
    await this.ensureTab();
    await this.ensureDebugger();
    await this.debugger.tab_set_alway_focus();
    await this.wait_any_tab(this.tab);
  }

  public async tab_dom_querySelectorAll(selector: string): Promise<string[]> {
    await this.ensureTab();
    await this.ensureDebugger();
    return await this.debugger.dom_querySelectorAll(selector);
  }

  /*
            在当前 tab 的身份下执行 http_get
            CORS: 遵循浏览器
            cookies: 浏览器自动附加
        */
  // @requireInit
  public async tab_http_get(url: string, params = {}, headers = {}): Promise<SerializableResponse> {
    await this.ensureTab();
    await this.ensureDebugger();
    return await this.debugger.http_get(url, params, headers);
  }

  /*
            在当前 tab 的身份下执行 http_post_json
            CORS: 遵循浏览器
            cookies: 浏览器自动附加
        */
  // @requireInit
  public async tab_http_post_json(url: string, data = {}, headers = {}): Promise<SerializableResponse> {
    await this.ensureTab();
    await this.ensureDebugger();
    return await this.debugger.http_post_json(url, data, headers);
  }

  private async pack_response(response: Response): Promise<SerializableResponse> {
    const headers: Record<string, string> = {};
    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
    }

    const bodyText = await response.text();

    const serializableResponse = {
      body: bodyText,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: headers,
      redirected: response.redirected,
      url: response.url,
      type: response.type
    };
    return serializableResponse;
  }

  /*
            以 extension 身份执行 fetch
            CORS: 遵循 host_permissions 设定
            cookies: 手动获取并添加
        */
  public async http_raw_fetch(url: string, requestInit?: RequestInit): Promise<SerializableResponse> {
    const final_url = new URL(url).toString();
    const resp = await fetch(final_url, requestInit);
    return this.pack_response(resp);
  }

  public async http_get(url: string, params = {}, headers = {}): Promise<SerializableResponse> {
    let final_url = new URL(url).toString();
    if (params) {
      final_url += "?" + new URLSearchParams(params).toString();
    }
    const resp = await fetch(final_url, { method: "GET", cache: "no-cache", ...headers });
    return this.pack_response(resp);
  }

  public async http_post_json(url: string, data = {}, headers = {}): Promise<SerializableResponse> {
    const final_url = new URL(url).toString();
    const jsonDataString = JSON.stringify(data || {});
    const resp = await fetch(final_url, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(headers || {})
      },
      body: JSON.stringify(jsonDataString)
    });
    return this.pack_response(resp);
  }

  public async cookies_get(url: string): Promise<chrome.cookies.Cookie[]> {
    // get all cookies for the url
    return await chrome.cookies.getAll({ url });
  }

  // @requireInit
  public async dom_query_selector_all(selector: string): Promise<string[]> {
    await this.ensureTab();
    const results = await chrome.scripting.executeScript({
      target: { tabId: this.tab.id! },
      func: (selector: string): string[] => {
        const els = document.querySelectorAll(selector);
        const arrayEls = Array.from(els);
        return arrayEls.map((el) => el.outerHTML);
      },
      args: [selector]
    });

    if (results && results[0] && results[0].result) {
      return results[0].result as string[];
    } else {
      return [];
    }
  }
}
