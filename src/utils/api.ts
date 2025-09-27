import { Debugger } from "@utils/debugger";
import { WaitOrTimeout } from "@utils/tools";
import { MAX_PAGE_LOAD_WAIT_TIME } from "@utils/consts";

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
  initialized = false;

  tab!: Tab;
  debugger!: Debugger;

  constructor(url: string) {
    this.url = url;
    this.initialized = false;
  }

  async requireInit() {
    if (this.initialized) return;
    await this.init();
    this.initialized = true;
  }

  // @requireInit
  private async tab_wait(tab: Tab) {
    await this.requireInit();
    return new Promise<Tab>((resolve) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        // status == unloaded, loading, complete
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      });
    });
  }

  public async close() {
    if (this.initialized === false) {
      return;
    }
    console.info("crawler api closing");
    await this.debugger.disconnect();
    await chrome.tabs.remove(this.tab.id!);
  }

  public async init() {
    // console.error("Calling init");
    this.initialized = true;
    this.tab = await chrome.tabs
      .create({
        url: this.url.toString(),
        active: false
      })
      .then(async (tab) => {
        return await WaitOrTimeout(this.tab_wait(tab), MAX_PAGE_LOAD_WAIT_TIME).catch(() => {
          console.debug(`tab ${this.url} completing timeout, proceed anyway.`);
          return tab;
        });
      });

    this.debugger = new Debugger(this.tab);
    await this.debugger.connect();
  }

  // @requireInit
  public async tab_swith_to(url: string) {
    await this.requireInit();
    await chrome.tabs.update(this.tab!.id, { url }).then(async (tab) =>
      WaitOrTimeout(this.tab_wait(tab || this.tab), MAX_PAGE_LOAD_WAIT_TIME)
        .then((tab) => {
          this.url = url;
        })
        .catch(() => {})
    );
  }

  /*
            在当前 tab 的身份下执行 http_get
            CORS: 遵循浏览器
            cookies: 浏览器自动附加
        */
  // @requireInit
  public async tab_http_get(url: string, params?: Record<string, string>): Promise<string> {
    await this.requireInit();
    return await this.debugger.http_get(url, params);
  }

  /*
            在当前 tab 的身份下执行 http_post_json
            CORS: 遵循浏览器
            cookies: 浏览器自动附加
        */
  // @requireInit
  public async tab_http_post_json(url: string, data?: Record<string, string>): Promise<string> {
    await this.requireInit();
    return await this.debugger.http_post_json(url, data);
  }

  /*
            以 extension 身份执行 fetch
            CORS: 遵循 host_permissions 设定
            cookies: 手动获取并添加
        */
  public async http_raw_fetch(url: string, requestInit?: RequestInit): Promise<string> {
    const final_url = new URL(url).toString();
    const response = await fetch(final_url, requestInit);
    return response.text();
  }
  public async http_get(url: string, params?: Record<string, string>): Promise<string> {
    let final_url = new URL(url).toString();
    if (params) {
      final_url += "?" + new URLSearchParams(params).toString();
    }
    const resp = await fetch(final_url, { method: "GET", cache: "no-cache" });
    return resp.text();
  }
  public async http_post_json(
    url: string,
    data?: Record<string, string>,
    headers?: Record<string, string>
  ): Promise<string> {
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
    return resp.text();
  }

  public async cookies_get(url: string): Promise<chrome.cookies.Cookie[]> {
    // get all cookies for the url
    return await chrome.cookies.getAll({ url });
  }

  // @requireInit
  public async dom_query_selector_all(selector: string): Promise<string[]> {
    await this.requireInit();
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
