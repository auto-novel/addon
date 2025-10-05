import { Api } from "@utils/api";
import { type ClientMethods, type JobNewResult, type JobQuitResult } from "./client/client.types";
import { SerReq2RequestInfo } from "@utils/tools";
import type { EnvType } from "@/worker";

type Tab = chrome.tabs.Tab;

export class WebCrawler {
  api: Api;
  env: EnvType;

  private constructor(env: EnvType, url?: string, tab?: Tab) {
    this.env = env;
    if (url) {
      this.api = Api.fromURL(url);
    } else if (tab) {
      this.api = Api.fromTab(tab);
    } else {
      throw new Error("Either url or tab must be provided.");
    }
  }

  public static fromTab(env: EnvType, tab: chrome.tabs.Tab) {
    return new WebCrawler(env, undefined, tab);
  }

  public static fromURL(env: EnvType, url: string) {
    return new WebCrawler(env, url, undefined);
  }

  public applyCommand = async (command: keyof ClientMethods, params: any, env: EnvType) => {
    const method = this.methods[command];
    if (!method) throw new Error(`Unknown command: ${command}`);
    params = { ...params, ...env };
    return await method(params);
  };

  public methods: ClientMethods = {
    "base.ping": async () => await "pong",

    "local.cookies.setFromResponse": async ({ response }) => await this.api.cookies_set_from_response(response),
    "local.bypass.enable": async ({ origin, referer, url }) => await this.api.enable_local_bypass(url, origin, referer),
    "local.bypass.disable": async ({ url }) => await this.api.disable_local_bypass(url),

    "http.fetch": async ({ input, requestInit }) => {
      const final_input = SerReq2RequestInfo(input);
      return await this.api.http_fetch(final_input, requestInit);
    },
    "http.get": async ({ url, params, headers }) => await this.api.http_get(url, params, headers),
    "http.postJson": async ({ url, data, headers }) => await this.api.http_post_json(url, data, headers),

    "tab.switchTo": async ({ url }) => await this.api.tab_swith_to(url),
    "tab.http.fetch": async ({ input, requestInit }) => {
      return await this.api.tab_http_fetch(input, requestInit);
    },
    "tab.http.get": async ({ url, params }) => await this.api.tab_http_get(url, params),
    "tab.http.postJson": async ({ url, data }) => await this.api.tab_http_post_json(url, data),
    "tab.dom.querySelectorAll": async ({ selector }) => await this.api.tab_dom_querySelectorAll(selector),

    "cookies.get": async ({ url }) => await this.api.cookies_get(url),
    "cookies.getStr": async ({ url }) => await this.api.cookies_get_str(url),

    "dom.querySelectorAll": async ({ selector }) => await this.api.dom_query_selector_all(selector),

    "job.new": async () => await this.job_new(),
    "job.quit": async () => await this.job_quit()
  };

  public async job_new(): Promise<JobNewResult> {
    return await { job_id: this.env.job_id };
  }

  public async job_quit(): Promise<JobQuitResult> {
    await this.api.close();
    return { status: "completed" };
  }
}
