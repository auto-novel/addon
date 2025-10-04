import type { ClientSideCrawler, RPCCSType, WorkerId } from "@rpc/api";
import type { Api } from "@utils/api";

export class ClientAbility {
  rpc: RPCCSType;
  api: Api;

  ctl: ClientSideCrawler;

  constructor(ctl: ClientSideCrawler, rpc: RPCCSType, api: Api) {
    this.ctl = ctl;
    this.rpc = rpc;
    this.api = api;

    this.rpc.addMethod("http.raw", ({ url, requestInit }) => this.api.http_fetch(url, requestInit));
    this.rpc.addMethod("http.get", ({ url, params }) => this.api.http_get(url, params));
    this.rpc.addMethod("http.postJson", ({ url, data, headers }) => this.api.http_post_json(url, data, headers));

    this.rpc.addMethod("tab.switchTo", ({ url }) => this.api.tab_swith_to(url));
    this.rpc.addMethod("tab.http.get", ({ url, params }) => this.api.tab_http_get(url, params));
    this.rpc.addMethod("tab.http.postJson", ({ url, data }) => this.api.tab_http_post_json(url, data));

    this.rpc.addMethod("cookies.get", ({ url }) => this.api.cookies_get(url));

    this.rpc.addMethod("dom.querySelectorAll", ({ selector }) => this.api.dom_query_selector_all(selector));

    // currently job.quit means the worker quit itself
    this.rpc.addMethod("job.quit", () => this.job_quit());
    this.rpc.addMethod("ctl.quit", ({ worker_id }) => this.job_quit(worker_id));
  }

  public job_quit = async (worker_id?: WorkerId) => {
    await this.ctl.quit();
  };
}
