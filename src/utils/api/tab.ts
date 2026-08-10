import {
  BypassParams,
  ClientCmd,
  DomQueryResults,
  SerializableRequest,
  SerializableResponse,
  TabFetchError,
  TabFetchResponseHeaders,
} from "@/rpc/types";
import { debugLog } from "@/utils/log/backend";
import { tabResMgr } from "@/utils/resource";
import { rateLimiter } from "@/utils/rate-limit";
import {
  browserRemoteExecution,
  extractUrl,
  getHeaderValue,
  newError,
  sleep,
} from "@/utils/tools";
import { local_install_bypass, local_uninstall_bypass } from "./bypass";
import { DELAYED_TAB_CLOSE_TIME } from "@/shared/consts";

type TabDocumentState = {
  body: string;
  readyState: DocumentReadyState;
};

type TabAccessOptions = {
  tabUrl: string;
  tabId?: number;
  forceNewTab?: boolean;
  forceWaitForLoad?: boolean;
  closeTimeout?: number;
};

type TabWithId = Browser.tabs.Tab & {
  id: number;
};

type RemoteDomQueryResult = {
  results: string[];
  readyState: DocumentReadyState;
};

type RedirectCapture = {
  stop(): string[];
};

function isSameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).toString() === new URL(right).toString();
  } catch {
    return left === right;
  }
}

/**
 * Observe the request started by the injected fetch. The first exact URL match
 * claims the webRequest requestId; subsequent redirects are then correlated by
 * that id so unrelated requests from the same tab are ignored.
 */
function startRedirectCapture(
  tabId: number,
  requestUrl: string,
): RedirectCapture {
  const redirectUrls: string[] = [];
  let requestId: string | null = null;
  let listening = true;

  const onBeforeRedirect = (
    details: Browser.webRequest.OnBeforeRedirectDetails,
  ) => {
    if (details.tabId !== tabId) return;

    if (requestId == null) {
      if (!isSameUrl(details.url, requestUrl)) return;
      requestId = details.requestId;
    } else if (details.requestId !== requestId) {
      return;
    }

    debugLog.info("tab_http_fetch redirect", {
      tabId,
      requestId: details.requestId,
      from: details.url,
      to: details.redirectUrl,
    });
    redirectUrls.push(details.redirectUrl);
  };

  browser.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, {
    urls: ["<all_urls>"],
  });

  return {
    stop() {
      if (listening) {
        browser.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect);
        listening = false;
      }
      return [...redirectUrls];
    },
  };
}

function setSerializableHeader(
  response: SerializableResponse,
  name: string,
  value: string,
) {
  response.headers = response.headers.filter(
    ([headerName]) => headerName.toLowerCase() !== name.toLowerCase(),
  );
  response.headers.push([name, value]);
}

function addRedirectResponseMetadata(
  response: SerializableResponse,
  tabId: number,
  redirectUrls: string[],
) {
  if (
    response.redirected &&
    response.url &&
    !redirectUrls.some((redirectUrl) => isSameUrl(redirectUrl, response.url))
  ) {
    // Keep the final URL even when webRequest visibility was restricted by
    // host permissions or browser-specific event behavior.
    redirectUrls.push(response.url);
  }

  response.redirectUrls = [...redirectUrls];
  response.tabId = tabId;

  setSerializableHeader(response, TabFetchResponseHeaders.TabId, String(tabId));
  setSerializableHeader(
    response,
    TabFetchResponseHeaders.ResponseUrl,
    response.url,
  );
  setSerializableHeader(
    response,
    TabFetchResponseHeaders.Redirected,
    String(response.redirected || redirectUrls.length > 0),
  );
  setSerializableHeader(
    response,
    TabFetchResponseHeaders.RedirectUrls,
    JSON.stringify(redirectUrls),
  );

  const redirectUrl = redirectUrls.at(-1);
  if (redirectUrl) {
    setSerializableHeader(
      response,
      TabFetchResponseHeaders.RedirectUrl,
      redirectUrl,
    );
  }
}

function createTabFetchError(
  cause: unknown,
  requestUrl: string,
  tabId: number | undefined,
  redirectUrls: string[],
): TabFetchError {
  const message = cause instanceof Error ? cause.message : String(cause);
  const error = new Error(message, { cause }) as TabFetchError;
  error.name = "TabFetchError";
  error.requestUrl = requestUrl;
  error.tabId = tabId;
  error.redirectUrls = [...redirectUrls];
  error.redirectUrl = redirectUrls.at(-1);
  return error;
}

function hasTabId(tab: Browser.tabs.Tab): tab is TabWithId {
  return tab.id != null;
}

async function getOrCreateTab({
  tabUrl,
  tabId,
  forceNewTab,
  closeTimeout,
}: TabAccessOptions): Promise<TabWithId> {
  let tab: Browser.tabs.Tab | null = null;

  if (tabId) {
    tab = await browser.tabs.get(tabId);
  }
  if (!tab) {
    tab = await tabResMgr.findOrCreateTab(tabUrl, {
      forceNewTab,
      closeTimeout,
    });
  }
  if (!hasTabId(tab)) throw newError(`Tab has no id: ${tab}`);

  return tab;
}

async function waitForTabLoaded(
  tabId: number,
  tabUrl: string,
): Promise<TabDocumentState> {
  let finalTabDocumentState: TabDocumentState | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const tabDocumentState = await browserRemoteExecution({
      target: { tabId },
      func: (): TabDocumentState => {
        const body = document.querySelector("body")?.getHTML() ?? "";
        const readyState = document.readyState;
        return {
          body,
          readyState,
        };
      },
      args: [],
    });

    if (tabDocumentState.body) {
      finalTabDocumentState = tabDocumentState;
      break;
    }
    await sleep(1000);
  }

  if (finalTabDocumentState == null) {
    debugLog.warn(`Tab ${tabId} did not load within expected time.`);
    throw newError(`Tab did not load within expected time: ${tabUrl}`);
  }

  return finalTabDocumentState;
}
/**
 * Injected script for tab DOM querySelectorAll.
 * No external variable references - only uses parameters and Web APIs.
 * Serializable for browser.scripting.executeScript.
 */
function injectedDomQuerySelectorAll(sel: string): RemoteDomQueryResult {
  const elements = document.querySelectorAll(sel);
  const texts: string[] = Array.from(elements).map((el) => el.outerHTML);
  return {
    results: texts,
    readyState: document.readyState,
  };
}

/**
 * Injected script for tab HTTP fetch operations.
 * No external variable references - only uses parameters and Web APIs.
 * Serializable for browser.scripting.executeScript.
 * Note: Helper functions are nested inside to avoid closure issues during serialization.
 */
async function injectedTabHttpFetch(
  input: SerializableRequest | string,
  requestInit: RequestInit | null,
): Promise<SerializableResponse> {
  // Keep helpers inside injected function to avoid executeScript closure issues.
  function injectedDeserializeRequest(req: SerializableRequest): RequestInfo {
    if (typeof req === "string") {
      return req;
    }

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

  function injectedSerReqToRequestInfo(input: SerializableRequest | string) {
    let finalInput: RequestInfo;
    switch (typeof input) {
      case "string": {
        finalInput = input;
        break;
      }
      case "object": {
        finalInput = injectedDeserializeRequest(input as SerializableRequest);
        break;
      }
      default:
        throw new Error("Invalid input type for tab_http_fetch");
    }
    return finalInput;
  }

  async function injectedResponseToSerializableResponse(
    response: Response,
  ): Promise<SerializableResponse> {
    const headers: [string, string][] = Array.from(response.headers.entries());
    const bodyText = await response.text();

    return {
      body: bodyText,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers,
      redirected: response.redirected,
      url: response.url,
      type: response.type,
    };
  }

  const requestInput = injectedSerReqToRequestInfo(input);
  const response = await fetch(requestInput, requestInit || {});
  const responseSer = await injectedResponseToSerializableResponse(response);
  return responseSer;
}

export async function tab_http_fetch(
  params: Parameters<ClientCmd["tab.http.fetch"]>[0],
): Promise<SerializableResponse> {
  const { options, input, requestInit } = params;

  const userAgent = getHeaderValue(requestInit?.headers, "User-Agent");
  const viewportWidth = getHeaderValue(requestInit?.headers, "viewport-width");

  const { tabUrl, tabId, forceNewTab, forceWaitForLoad, closeTimeout } =
    options;

  const url = extractUrl(input);
  const release = await rateLimiter.acquire(rateLimiter.urlToKey(url));

  const bypassParams: BypassParams = {
    requestUrl: url,
    userAgent,
    viewportWidth,
    // incase of `Referrer Policystrict-origin-when-cross-origin`
    // origin: new URL(tabUrl).origin,
  };

  let activeTabId: number | undefined;
  let redirectUrls: string[] = [];

  try {
    const tab = await getOrCreateTab({
      tabUrl,
      tabId,
      forceNewTab,
      closeTimeout,
    });
    activeTabId = tab.id;

    if (forceWaitForLoad) {
      await waitForTabLoaded(tab.id, tabUrl);
    }

    try {
      await local_install_bypass(tab.id, bypassParams);
      const redirectCapture = startRedirectCapture(tab.id, url);
      let respSer: SerializableResponse;
      try {
        respSer = await browserRemoteExecution({
          target: { tabId: tab.id },
          func: injectedTabHttpFetch,
          args: [input, requestInit ?? null],
        });
      } finally {
        redirectUrls = redirectCapture.stop();
      }
      if (!respSer) {
        throw newError("tab_http_fetch returned null response");
      }
      addRedirectResponseMetadata(respSer, tab.id, redirectUrls);
      return respSer;
    } finally {
      await local_uninstall_bypass(tab.id, bypassParams);
      await tabResMgr.releaseTab(
        tab.id,
        closeTimeout ?? DELAYED_TAB_CLOSE_TIME,
      );
    }
  } catch (error) {
    const tabFetchError = createTabFetchError(
      error,
      url,
      activeTabId,
      redirectUrls,
    );
    debugLog.error(
      `Error in tab_http_fetch for url ${url} in tab ${activeTabId ?? "unknown"}:`,
      tabFetchError,
    );
    throw tabFetchError;
  } finally {
    await release();
  }
}

export async function tab_dom_querySelectorAll(
  params: Parameters<ClientCmd["tab.dom.querySelectorAll"]>[0],
): Promise<DomQueryResults> {
  const { tabUrl, selector, options } = params;
  const { tabId, forceNewTab, forceWaitForLoad, closeTimeout } = options ?? {};

  const tab = await getOrCreateTab({
    tabUrl,
    tabId,
    forceNewTab,
    closeTimeout,
  });

  if (forceWaitForLoad) {
    await waitForTabLoaded(tab.id, tabUrl);
  }

  try {
    const results: RemoteDomQueryResult = await browserRemoteExecution({
      target: { tabId: tab.id! },
      func: injectedDomQuerySelectorAll,
      args: [selector],
    });
    return {
      tabId: tab.id!,
      results: results.results,
      readyState: results.readyState,
    };
  } finally {
    await tabResMgr.releaseTab(tab.id, closeTimeout ?? DELAYED_TAB_CLOSE_TIME);
  }
}
