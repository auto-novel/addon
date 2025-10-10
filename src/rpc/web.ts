import { Api } from "@/utils/api";
import { type ClientMethods } from "./types";

type Tab = chrome.tabs.Tab;

export type EnvType = {
  sender: Browser.runtime.MessageSender;
};

export async function dispatchCommand(
  command: keyof ClientMethods,
  params: any,
  env: EnvType,
) {
  const method = METHODS[command];
  if (!method) throw new Error(`Unknown command: ${command}`);
  params = { ...params, ...env };
  return await method(params);
}

const METHODS: ClientMethods = {
  "base.ping": async () => await "pong",
  "base.info": async () => {
    return await {
      version: browser.runtime.getManifest().version,
      homepage_url:
        browser.runtime.getManifest().homepage_url ??
        "https://github.com/auto-novel/addon",
    };
  },

  "local.bypass.enable": async ({ origin, referer, url }) =>
    await api.enable_local_bypass(url, origin, referer),
  "local.bypass.disable": async ({ id, url }) =>
    await api.disable_local_bypass(id, url),

  "http.fetch": async ({ input, requestInit }) => {
    const final_input = serReq2RequestInfo(input);
    return await api.http_fetch(final_input, requestInit);
  },

  "tab.switchTo": async ({ url }) => await api.tab_swith_to(url),
  "tab.http.fetch": async ({ input, requestInit }) => {
    return await api.tab_http_fetch(input, requestInit);
  },
  "tab.dom.querySelectorAll": async ({ selector }) =>
    await api.tab_dom_querySelectorAll(selector),

  "cookies.setFromResponse": async ({ response }) =>
    await api.cookies_set_from_response(response),
  "cookies.get": async ({ url }) => await api.cookies_get(url),
  "cookies.getStr": async ({ url }) => await api.cookies_get_str(url),
};
