import { AddonClient } from "@/addon";

export const Addon = {
  makeCookiesPublic(
    cookies: Browser.cookies.Cookie[],
  ): Browser.cookies.Cookie[] {
    return cookies.map((cookie) => {
      if (cookie.sameSite !== "no_restriction" || !cookie.secure) {
        cookie.sameSite = "no_restriction";
        cookie.secure = true;
      }
      return cookie;
    });
  },

  cookiesGet(url: string): Promise<Browser.cookies.Cookie[]> {
    const addon = new AddonClient();
    return addon.cookies_get(url);
  },

  cookiesSet(cookies: Browser.cookies.Cookie[]): Promise<void> {
    const addon = new AddonClient();
    return addon.cookies_set(cookies);
  },

  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const addon = new AddonClient();
    return addon.http_fetch(input, init);
  },

  tabFetch(
    tabUrl: string,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const addon = new AddonClient();
    return addon.tab_http_fetch(tabUrl, input, init);
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
});
