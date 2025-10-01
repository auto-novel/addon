import type { SerializableResponse } from "@rpc/client/client.types";

type Tab = chrome.tabs.Tab;

export class Debugger {
  tab: Tab;
  debugee: { tabId: number };

  constructor(tab: Tab) {
    this.tab = tab;
    this.debugee = { tabId: tab.id! };
  }

  public async connect() {
    await chrome.debugger.attach({ tabId: this.tab.id! }, "1.3");
    // await chrome.debugger.sendCommand(this.debugee, "Network.enable");
  }

  public async disconnect() {
    await chrome.debugger.detach({ tabId: this.tab.id });
  }

  // Excute js at the earliest possible time.
  private async danger_remote_execute_asap(js: string): Promise<void> {
    const TAG = "[AutoNovel.RCE.asap]";
    console.warn(`${TAG} executing js: `, js);
    await chrome.debugger.sendCommand(this.debugee, "Page.enable");
    const result = await chrome.debugger.sendCommand(this.debugee, "Page.addScriptToEvaluateOnNewDocument", {
      source: js
    });
    console.log(`${TAG} script result: `, result);
    // trigger a reload to make script effective
    await chrome.tabs.reload(this.tab.id!);
  }

  private async danger_remote_execute<T>(js: string): Promise<T> {
    const TAG = "[AutoNovel.RCE]";
    console.warn(`${TAG} executing js: `, js);
    const ret = (await chrome.debugger.sendCommand(this.debugee, "Runtime.evaluate", {
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

  public async http_get(url: string, params = {}, headers = {}): Promise<SerializableResponse> {
    let final_url = new URL(url).toString();
    if (params) {
      const final_params = new URLSearchParams(params).toString();
      final_url += "?" + final_params;
    }

    const ret: SerializableResponse = await this.danger_remote_execute(`
      (async () => {
        const fetchOptions = {
          method: 'GET',
          headers: {
            ...${JSON.stringify(headers)}
          },
        };

        const response = await fetch('${final_url}', fetchOptions);

        const headers = {};
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
          type: response.type,
        };
        return serializableResponse;
      })();
    `);
    return ret;
  }

  public async http_post_json(url: string, data = {}, headers = {}): Promise<SerializableResponse> {
    const ret: SerializableResponse = await this.danger_remote_execute(`
      (async () => {
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...${JSON.stringify(headers)}
          },
          body: JSON.stringify(${JSON.stringify(data)})
        };
        const response = await fetch('${url}', fetchOptions);

        const headers = {};
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
          type: response.type,
        };
        return serializableResponse;
      })();
    `);
    return ret;
  }
}
