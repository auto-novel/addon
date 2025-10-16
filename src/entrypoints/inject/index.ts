import { TabFetchOptions } from "@/rpc/types";

import { AddonClient } from "./client";

type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

function buildAddonEndpoint<T extends FunctionKeys<AddonClient>>(name: T) {
  return (...args: Parameters<AddonClient[T]>) => {
    const addon = new AddonClient();
    const method = addon[name] as (
      ...args: Parameters<AddonClient[T]>
    ) => ReturnType<AddonClient[T]>;
    return method.apply(addon, args);
  };
}

export const Addon = {
  version: VERSION,

  info: buildAddonEndpoint("info"),
  cookiesStatus: buildAddonEndpoint("cookies_status"),
  cookiesPatch: buildAddonEndpoint("cookies_patch"),

  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const addon = new AddonClient();
    return addon.http_fetch(input, init);
  },

  tabFetch(
    options: TabFetchOptions,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const addon = new AddonClient();
    return addon.tab_http_fetch(options, input, init);
  },

  async spoofFetch(
    baseUrl: string,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const addon = new AddonClient();
    let url;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else {
      url = input.url;
    }
    const origin = new URL(baseUrl).origin;
    await addon.bypass_enable({
      requestUrl: url,
      origin,
      referer: origin + "/",
    });

    // const headers = new Headers(init?.headers || {});
    // init = {
    //   ...init,
    //   headers,
    // };
    const resp = await fetch(input, init ?? {});

    await addon.bypass_disable({
      requestUrl: url,
      origin,
      referer: origin + "/",
    });
    return resp;
  },
};

declare global {
  interface Window {
    Addon: typeof Addon;
  }
}

export default defineUnlistedScript(() => {
  debugLog("Addon script loaded");
  window.Addon = Addon;
  debugLog("Addon injected to window.Addon, extension version:", Addon.version);
});
