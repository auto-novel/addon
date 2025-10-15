import type {
  Message,
  MessageRequest,
  MessageResponse,
  TabFetchOptions,
} from "@/rpc/types";
import { deserializeResponse, MessageType } from "@/rpc/types";
import type { ClientCmd, SerializableResponse } from "@/rpc/types";
import { serializeRequest } from "@/rpc/types";

function sendMessageChrome<T>(msg: Message): Promise<T> {
  const addonId = "kenigjdcpndlkomhegjcepokcgikpdki";
  return new Promise((resolve, reject) => {
    console.debug(msg);
    browser.runtime.sendMessage(addonId, msg, (response: MessageResponse) => {
      if (browser.runtime.lastError) {
        console.error(
          "Error sending message to addon:",
          browser.runtime.lastError,
        );
        reject(browser.runtime.lastError);
      }
      console.debug(response);
      resolve(response.payload.result);
    });
  });
}

function sendMessageFirefox<T>(msg: Message): Promise<T> {
  // const addonId = 'addon@n.novelia.cc';
  console.debug(msg);
  return new Promise<T>((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== MessageType.Response) return;

      const resp: MessageResponse = event.data;
      if (resp.id != msg.id) return;

      window.removeEventListener("message", listener);
      console.debug(resp.payload);
      if (resp.payload.success) {
        return resolve(resp.payload.result);
      } else {
        console.error("Error from addon:", resp.payload);
        return reject(resp.payload.error);
      }
    };
    window.postMessage(msg, "*");
    window.addEventListener("message", listener);
  });
}

function createAddonApi() {
  if (import.meta.env.CHROME) {
    return { sendMessage: sendMessageChrome };
  } else if (import.meta.env.FIREFOX) {
    return { sendMessage: sendMessageFirefox };
  } else {
    function sendMessageFallback<T>(msg: Message): Promise<T> {
      throw new Error(`浏览器${browser}不支持插件通信`);
    }
    return { sendMessage: sendMessageFallback };
  }
}

//================================== AddonClient ==============================

let msgId = 1;

const api = createAddonApi();

export class AddonClient {
  buildApiEndpoint<T extends keyof ClientCmd>(cmd: T) {
    return (params: Parameters<ClientCmd[T]>[0]): ReturnType<ClientCmd[T]> => {
      type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
      type ResultType = ReturnType<ClientCmd[typeof cmd]>;
      const msg = this.buildCrawlerMessage<ParamType>(cmd, params);
      return api.sendMessage(msg) as ResultType;
    };
  }

  buildCrawlerMessage<P>(cmd: keyof ClientCmd, params?: P): MessageRequest {
    const msg: MessageRequest = {
      type: MessageType.Request,
      id: (msgId++).toString(),
      payload: {
        cmd,
        params,
      },
    };
    return msg;
  }

  ping = this.buildApiEndpoint("base.ping");
  info = this.buildApiEndpoint("base.info");

  bypass_enable = this.buildApiEndpoint("local.bypass.enable");
  bypass_disable = this.buildApiEndpoint("local.bypass.disable");

  async http_fetch(
    input: Request | string | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const serInput =
      typeof _input === "string" ? _input : await serializeRequest(_input);
    const F = this.buildApiEndpoint("http.fetch");
    const resp: SerializableResponse = await F({
      input: serInput,
      requestInit,
    });
    return deserializeResponse(resp);
  }

  async tab_http_fetch(
    options: TabFetchOptions,
    input: Request | string | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const serInput =
      typeof _input === "string" ? _input : await serializeRequest(_input);
    const F = this.buildApiEndpoint("tab.http.fetch");
    const resp: SerializableResponse = await F({
      options,
      input: serInput,
      requestInit,
    });
    return deserializeResponse(resp);
  }

  tab_dom_querySelectorAll = this.buildApiEndpoint("tab.dom.querySelectorAll");

  cookies_status = this.buildApiEndpoint("cookies.status");

  cookies_patch = this.buildApiEndpoint("cookies.patch");

  private rebuild_serializable_request(
    input: Request | string | URL,
  ): [string, Request | string] {
    let url: string;
    if (input instanceof URL) {
      input = input.toString();
      url = input;
    }
    input = input as Request | string;
    if (typeof input === "string") {
      url = input;
    } else {
      url = input.url;
    }
    return [url, input];
  }
}
