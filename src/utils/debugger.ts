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

  private async danger_remote_execute<T>(js: string): Promise<T> {
    console.warn("executing js: ", js);
    const ret = (await chrome.debugger.sendCommand(this.debugee, "Runtime.evaluate", {
      expression: js,
      awaitPromise: true,
      returnByValue: true
    })) as { exceptionDetails?: { exception: any }; result: { value: T } };

    console.warn("executing js resull: t", ret);
    if (ret.exceptionDetails) {
      // NOTE(kuriko): Sometimes it's the cors error.
      return Promise.reject(JSON.stringify(ret.exceptionDetails.exception));
    }
    return Promise.resolve(ret.result.value);
  }

  public async dom_querySelectorAll(selector: string): Promise<string[]> {
    const ret = (await this.danger_remote_execute<string[]>(`
        Array.from(document.querySelectorAll("${selector}")).map(e => e.outerHTML)
    `)) as string[];
    return ret;
  }

  public async http_get(url: string, params?: Record<string, string>): Promise<string> {
    let final_url = new URL(url).toString();
    if (params) {
      const final_params = new URLSearchParams(params).toString();
      final_url += "?" + final_params;
    }

    const ret: string = await this.danger_remote_execute(`
        fetch("${final_url}", { method: "GET", })
            .then(response => response.text())
    `);
    return ret;
  }

  public async http_post_json(url: string, data?: Record<string, string>): Promise<string> {
    const final_url = new URL(url).toString();
    const jsonDataString = JSON.stringify(data || {});
    const ret = (await this.danger_remote_execute(`
            fetch("${final_url}", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: ${JSON.stringify(jsonDataString)},
            }).then(response => response.text())
        `)) as string;
    return ret;
  }
}
