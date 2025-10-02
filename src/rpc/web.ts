import { Api } from "@utils/api";
import { deserializeRequest, type ClientMethods, type SerializableRequest } from "./client/client.types";

export class WebCrawler {
  url: string;
  api: Api;

  constructor(url: string) {
    this.url = url;
    this.api = new Api(url);
  }

  public applyCommand = async (command: keyof ClientMethods, params: any) => {
    const method = this.methods[command];
    if (!method) throw new Error(`Unknown command: ${command}`);
    return await method(params);
  };

  public methods: ClientMethods = {
    "base.ping": async () => await "pong",

    "http.raw": async ({ input, requestInit }) => {
      let final_input: RequestInfo;
      switch (typeof input) {
        case "string": {
          final_input = input;
          break;
        }
        case "object": {
          final_input = deserializeRequest(input as SerializableRequest);
          break;
        }
        default:
          throw new Error("Invalid input type for http.raw");
      }
      return await this.api.http_raw_fetch(final_input, requestInit);
    },
    "http.get": async ({ url, params, headers }) => await this.api.http_get(url, params, headers),
    "http.postJson": async ({ url, data, headers }) => await this.api.http_post_json(url, data, headers),

    "tab.switchTo": async ({ url }) => await this.api.tab_swith_to(url),
    "tab.http.get": async ({ url, params }) => await this.api.tab_http_get(url, params),
    "tab.http.postJson": async ({ url, data }) => await this.api.tab_http_post_json(url, data),
    "tab.dom.querySelectorAll": async ({ selector }) => await this.api.tab_dom_querySelectorAll(selector),

    "cookies.get": async ({ url }) => await this.api.cookies_get(url),

    "dom.querySelectorAll": async ({ selector }) => await this.api.dom_query_selector_all(selector),

    "job.new": async () => await this.api.tab_wait(),
    "job.quit": async () => await this.quit()
  };

  public async quit() {
    await this.api.close();
  }
}
