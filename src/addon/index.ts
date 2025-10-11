import Bowser from "bowser";

import type { Message, MessageRequest, MessageResponse } from "@/rpc/types";
import { deserializeResponse, MessageType } from "@/rpc/types";
import type { ClientCmd, InfoResult, SerializableResponse } from "@/rpc/types";
import { serializeRequest, serializeResponse } from "@/rpc/types";

function sendMessageChrome<T>(msg: Message): Promise<T> {
  const addonId = "kenigjdcpndlkomhegjcepokcgikpdki";
  return new Promise((resolve, reject) => {
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
  return new Promise<T>((resolve, reject) => {
    const listener = (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== MessageType.Response) return;

      const resp: MessageResponse = event.data;
      if (resp.id != msg.id) return;

      window.removeEventListener("message", listener);
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
  const bowser = Bowser.getParser(window.navigator.userAgent);
  const browser = bowser.getBrowserName(true);

  if (browser === "chrome" || browser === "edge") {
    return { sendMessage: sendMessageChrome };
  } else if (browser === "firefox") {
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

  async ping(): Promise<string> {
    const cmd = "base.ping";
    const msg = this.buildCrawlerMessage(cmd);
    return await api.sendMessage(msg);
  }

  async info(): Promise<InfoResult> {
    const cmd = "base.info";
    const msg = this.buildCrawlerMessage(cmd);
    return await api.sendMessage(msg);
  }

  async bypass_toggle(
    enable: boolean,
    params: {
      requestUrl: string;
      origin?: string;
      referer?: string;
    },
  ): Promise<void> {
    const cmd = enable ? "local.bypass.enable" : "local.bypass.disable";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, params);
    return await api.sendMessage(msg);
  }

  async bypass_enable(params: {
    requestUrl: string;
    origin?: string;
    referer?: string;
  }): Promise<void> {
    return await this.bypass_toggle(true, params);
  }

  async bypass_disable(params: {
    requestUrl: string;
    origin?: string;
    referer?: string;
  }): Promise<void> {
    return await this.bypass_toggle(false, params);
  }

  async http_fetch(
    input: Request | string | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const cmd = "http.fetch";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const serInput =
      typeof _input === "string" ? _input : await serializeRequest(_input);
    const msg = this.buildCrawlerMessage<ParamType>(cmd, {
      input: serInput,
      requestInit,
    });
    const resp: SerializableResponse = await api.sendMessage(msg);
    return deserializeResponse(resp);
  }

  async tab_http_fetch(
    tabUrl: string,
    input: Request | string | URL,
    requestInit?: RequestInit,
  ): Promise<Response> {
    const [url, _input] = this.rebuild_serializable_request(input);
    const cmd = "tab.http.fetch";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const serInput =
      typeof _input === "string" ? _input : await serializeRequest(_input);
    const msg = this.buildCrawlerMessage<ParamType>(cmd, {
      tabUrl,
      input: serInput,
      requestInit,
    });
    const resp: SerializableResponse = await api.sendMessage(msg);
    return deserializeResponse(resp);
  }

  async tab_dom_querySelectorAll(
    url: string,
    selector: string,
  ): Promise<string[]> {
    const cmd = "tab.dom.querySelectorAll";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { url, selector });
    const resp: string[] = await api.sendMessage(msg);
    return resp;
  }

  async cookies_getStr(url: string): Promise<string> {
    const cmd = "cookies.getStr";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { url });
    return await api.sendMessage(msg);
  }

  async cookies_setFromResponse(response: Response) {
    const serResp = await serializeResponse(response);
    const cmd = "cookies.setFromResponse";
    type ParamType = Parameters<ClientCmd[typeof cmd]>[0];
    const msg = this.buildCrawlerMessage<ParamType>(cmd, { response: serResp });
    return await api.sendMessage(msg);
  }

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
