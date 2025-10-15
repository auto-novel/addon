import * as Api from "@/utils/api";
import { deserializeRequest, EnvType, type ClientCmd } from "@/rpc/types";

export async function dispatchCommand(
  command: keyof ClientCmd,
  params: any,
  env: EnvType,
) {
  const method = METHODS[command];
  if (!method) throw new Error(`Unknown command: ${command}`);
  return await method(params, env);
}

const METHODS: ClientCmd = {
  "base.ping": async () => await "pong",
  "base.info": async () => {
    return await {
      version: browser.runtime.getManifest().version,
      homepage_url:
        browser.runtime.getManifest().homepage_url ??
        "https://github.com/auto-novel/addon",
    };
  },

  "local.bypass.enable": async (
    { requestUrl, origin, referer },
    { sender: { tabId } },
  ) => await Api.local_install_bypass(tabId, { requestUrl, origin, referer }),

  "local.bypass.disable": async (
    { requestUrl, origin, referer },
    { sender: { tabId } },
  ) => await Api.local_uninstall_bypass(tabId, { requestUrl, origin, referer }),

  "http.fetch": async ({ input, requestInit }) => {
    const final_input = await deserializeRequest(input);
    return await Api.http_fetch(final_input, requestInit);
  },

  "tab.http.fetch": Api.tab_http_fetch,
  "tab.dom.querySelectorAll": Api.tab_dom_querySelectorAll,

  "cookies.status": Api.cookies_status,
  "cookies.patch": Api.cookies_patch,
};
