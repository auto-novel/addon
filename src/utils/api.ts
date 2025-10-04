import { Debugger } from "@utils/debugger";
import { pack_response, WaitOrTimeout } from "@utils/tools";
import { MAX_PAGE_LOAD_WAIT_TIME } from "@utils/consts";
import type { SerializableRequest, SerializableResponse } from "@rpc/client/client.types";
import retry from "async-retry";

type Tab = chrome.tabs.Tab;

export class Api {
  private _url: string | null;

  get url() {
    return this._url;
  }
  async set_url(url: string) {
    this._url = url;
    if (this.init.tab && this.tab.url !== url) {
      await this.tab_swith_to(url);
    }
  }

  private init = {
    tab: false,
    debugger: false,
    local: false
  };

  private tab!: Tab;
  private debugger!: Debugger;

  private constructor(url: string, tab?: Tab) {
    this._url = url;
    if (tab) {
      this.tab = tab;
      this.init.tab = true;
      this.init.local = true;
    }
  }

  public static fromTab(tab: Tab) {
    return new Api(tab.url!, tab);
  }

  public static fromURL(url: string) {
    return new Api(url);
  }

  get tab_id() {
    return this.tab?.id;
  }

  ensureURL(): asserts this is this & { url: string } {
    if (!this.url) {
      throw new Error("URL is not set.");
    }
  }

  async ensureTab() {
    this.ensureURL();
    if (this.init.tab) {
      if (this.url != this.tab.url) {
        await this.tab_swith_to(this.url);
      }
      return;
    }
    await this.initTab();
    this.init.tab = true;
  }

  async ensureDebugger() {
    if (this.init.debugger) {
      if (this.tab && this.debugger.tab !== this.tab) {
        await this.debugger.disconnect();
        await this.initDebugger();
      }
      return;
    }
    await this.initDebugger();
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
    if (this.init.tab && !this.init.local) await chrome.tabs.remove(this.tab.id!);
    this.init.tab = false;
    this.init.debugger = false;
  }

  private loadTabPromise: Promise<Tab> | null = null;
  public async initTab() {
    if (this.loadTabPromise) {
      await this.loadTabPromise;
      return;
    }

    await this.ensureURL();

    const createTabFn = () =>
      chrome.tabs
        .create({
          url: this.url!.toString(),
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
      const tab =
        this.tab ||
        (await (async () => {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          return tabs[0];
        })());
      const dbg = new Debugger(tab);
      await dbg.connect();
      return dbg;
    })();
    this.debugger = await this.loadDebuggerPromise;
    this.init.debugger = true;
  }

  // ==========================================================================
  public async tab_swith_to(url: string) {
    if (!this.init.tab) {
      await this.initTab();
    }
    if (this.init.local) {
      throw new Error("Cannot switch tab in local mode.");
    }
    await chrome.tabs.update(this.tab!.id, { url }).then((tab) =>
      WaitOrTimeout(this.wait_any_tab(tab ?? this.tab), MAX_PAGE_LOAD_WAIT_TIME)
        .then(() => (this._url = url))
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

  // Tab http fetch
  public async tab_http_fetch(
    input: SerializableRequest | string,
    requestInit?: RequestInit
  ): Promise<SerializableResponse> {
    await this.ensureTab();
    await this.ensureDebugger();
    // const url = typeof input === "string" ? input : input.url;
    // await this.debugger.http_spoof(url);
    // const resp = await fetch(input, requestInit);
    // return pack_response(resp);
    return await this.debugger.http_fetch(input, requestInit);
  }

  /*
    在当前 tab 的身份下执行 http_get
    CORS: 遵循浏览器
    cookies: 浏览器自动附加
  */
  // @requireInit
  public async tab_http_get(url: string, params = {}, headers: [string, string][] = []): Promise<SerializableResponse> {
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
  public async tab_http_post_json(
    url: string,
    data = {},
    headers: [string, string][] = []
  ): Promise<SerializableResponse> {
    await this.ensureTab();
    await this.ensureDebugger();
    return await this.debugger.http_post_json(url, data, headers);
  }

  /*
      以 extension 身份执行 fetch
      CORS: 遵循 host_permissions 设定
      cookies: 手动获取并添加
  */
  public async http_fetch(input: RequestInfo | string, requestInit?: RequestInit): Promise<SerializableResponse> {
    const resp = await fetch(input, requestInit);
    return pack_response(resp);
  }

  public async http_get(url: string, params = {}, headers: [string, string][] = []): Promise<SerializableResponse> {
    let final_url = new URL(url).toString();
    if (params) {
      final_url += "?" + new URLSearchParams(params).toString();
    }
    const resp = await fetch(final_url, { method: "GET", cache: "no-cache", headers });
    return pack_response(resp);
  }

  public async http_post_json(url: string, data = {}, headers: [string, string][] = []): Promise<SerializableResponse> {
    const final_url = new URL(url).toString();
    const jsonDataString = JSON.stringify(data || {});
    const resp = await fetch(final_url, {
      method: "POST",
      cache: "no-cache",
      headers: [["Content-Type", "application/json"], ["Accept", "application/json"], ...(headers || [])],
      body: JSON.stringify(jsonDataString)
    });
    return pack_response(resp);
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

  public async enable_local_bypass(url: string): Promise<void> {
    await this.ensureDebugger();
    await this.debugger.enable_disable_cors();
    await this.debugger.spoof_request_start(url);
  }

  public async disable_local_bypass(url: string): Promise<void> {
    await this.debugger.spoof_request_stop(url);
  }
}
