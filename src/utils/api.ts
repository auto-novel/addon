import { SerializableRequest, SerializableResponse } from "@/rpc/types";
import { browserRemoteExecution, extractUrl } from "@/utils/tools";
import { tabResMgr } from "@/utils/resource";
import setCookie from "set-cookie-parser";

type Tab = Browser.tabs.Tab;

// ==========================================================================
export async function http_fetch(
  input: Request | string | URL,
  requestInit?: RequestInit,
): Promise<SerializableResponse> {
  const resp = await fetch(input, requestInit);
  return response2SerResp(resp);
}

export async function tab_dom_querySelectorAll(
  url: string,
  selector: string,
): Promise<string[]> {
  const tab = await tabResMgr.findOrCreateTab(url);

  const results = await browserRemoteExecution({
    target: { tabId: tab.id! },
    func: (sel: string) => {
      const elements = document.querySelectorAll(sel);
      const texts: string[] = Array.from(elements).map((el) => el.outerHTML);
      return texts;
    },
    args: [selector],
  });

  return results;
}

export async function tab_http_fetch(
  tabUrl: string,
  input: SerializableRequest | string,
  requestInit?: RequestInit,
): Promise<SerializableResponse> {
  const tab = await tabResMgr.findOrCreateTab(tabUrl);

  // NOTE(kuriko): 在 tab 上面直接执行 fetch，一般不用考虑 CORS bypass 问题。
  const respSer = await browserRemoteExecution({
    target: { tabId: tab.id! },
    func: async (
      input: SerializableRequest | string,
      requestInit?: RequestInit,
    ) => {
      // Copied from types.ts
      function deserializeRequest(req: SerializableRequest): RequestInfo {
        if (typeof req === "string") {
          return req;
        }

        console.log("deserializeRequest: ", req);
        const init: RequestInit = {
          method: req.method,
          headers: new Headers(req.headers),
          body: req.body,
          mode: req.mode,
          credentials: req.credentials,
          cache: req.cache,
          redirect: req.redirect,
          referrer: req.referrer,
          integrity: req.integrity,
        };

        return new Request(req.url, init);
      }

      // Copied from types.ts
      function SerReq2RequestInfo(input: SerializableRequest | string) {
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
        return final_input;
      }

      async function Response2SerResp(
        response: Response,
      ): Promise<SerializableResponse> {
        const headers: [string, string][] = Array.from(
          response.headers.entries(),
        );
        const bodyText = await response.text();

        const serializableResponse = {
          body: bodyText,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: headers,
          redirected: response.redirected,
          url: response.url,
          type: response.type,
        };
        return serializableResponse;
      }
      const _input = SerReq2RequestInfo(input);
      const ret = await fetch(_input, requestInit);
      const respSer = await Response2SerResp(ret);
      console.debug("tab_http_fetch: ", respSer);
      return respSer;
    },
    args: [input, requestInit],
  });

  return respSer;
}

export async function cookies_get(
  url: string,
): Promise<Browser.cookies.Cookie[]> {
  return await browser.cookies.getAll({ url });
}

export async function cookies_get_str(url: string): Promise<string> {
  const cookies = await cookies_get(url);
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

export async function cookies_setFromResponse(
  response: SerializableResponse,
): Promise<void> {
  const setCookieStrings = Array.from(response.headers)
    .filter((h) => h[0].toLowerCase() === "set-cookie")
    .map((h) => h[1]);

  if (setCookieStrings.length === 0) {
    return;
  }

  const parsedCookies = setCookie.parse(setCookieStrings);
  const setPromises = parsedCookies.map((cookie) => {
    const setDetail: Browser.cookies.SetDetails = {
      ...cookie,
      url: response.url, // Provide the required context URL.
      sameSite: cookie.sameSite as Browser.cookies.SameSiteStatus, // Cast is needed here
    };

    // Convert 'expires' or 'maxAge' to 'expirationDate' (seconds since epoch)
    if (cookie.expires) {
      setDetail.expirationDate = cookie.expires.getTime() / 1000;
    } else if (cookie.maxAge) {
      // maxAge is seconds from now.
      setDetail.expirationDate = Date.now() / 1000 + cookie.maxAge;
    }
    return browser.cookies.set(setDetail);
  });

  try {
    await Promise.all(setPromises);
    console.log(
      `Successfully set ${setPromises.length} cookies for ${response.url}`,
    );
  } catch (error) {
    throw newError(`Failed to set one or more cookies: ${error}`);
  }
}

/*
  bypass 主要针对 web 端发起 fetch 请求时的 CORS 问题和 Spoof 问题。
  动态加载规则主要是防止影响安装插件的用户的正常使用，尽可能做到不需要用户交互（点击启用和停用）
  具体说明：
  Spoof，针对 Request：
    拦截到发起者到 requestUrl 的请求，修改 Origin，Referer，Cookies 等头部

  CORS，针对 Response：
    拦截 Response，添加 CORS 相关的头部
*/
type Rule = Browser.declarativeNetRequest.Rule;
type Condition = Browser.declarativeNetRequest.RuleCondition;
type _rule1 = Browser.declarativeNetRequest.RuleCondition["tabIds"];
type _rule2 = Browser.declarativeNetRequest.RuleCondition["requestMethods"];
type _rule3 =
  Browser.declarativeNetRequest.RuleCondition["isUrlFilterCaseSensitive"];
type _rule4 = Browser.declarativeNetRequest.RuleCondition["urlFilter"];
type _rule5 = Browser.declarativeNetRequest.RuleCondition["resourceTypes"];
type _rule6 = Browser.declarativeNetRequest.RuleCondition["responseHeaders"];

export async function global_install_bypass(
  requestUrl: string,
  origin?: string,
  referer?: string,
): Promise<string> {
  throw new Error("Not implemented");
}

export async function global_uninstall_bypass(
  requestUrl: string,
  origin?: string,
  referer?: string,
): Promise<void> {
  throw new Error("Not implemented");
}
