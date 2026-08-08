import { SerializableResponse, serializeResponse } from "@/rpc/types";
import { debugLog } from "@/utils/log/backend";
import { rateLimiter } from "@/utils/rate-limit";
import { extractUrl, getHeaderValue } from "@/utils/tools";
import { local_install_bypass, local_uninstall_bypass } from "./bypass";

const MAX_REDIRECT_SPOOF_RETRIES = 20;

type FetchAttempt = {
  response?: Response;
  error?: unknown;
  redirectUrls: string[];
};

function isSameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).toString() === new URL(right).toString();
  } catch {
    return left === right;
  }
}

/**
 * Fetch normally follows redirects before it resolves. If a redirected request
 * fails, fetch only exposes a TypeError and hides the redirect target. The
 * webRequest event is observational, but it still gives us the redirect URL so
 * that a DNR spoof rule can be installed before retrying the whole request.
 */
async function fetchWithRedirectCapture(
  request: Request,
): Promise<FetchAttempt> {
  const redirectUrls: string[] = [];
  let requestId: string | null = null;

  const onBeforeRedirect = (
    details: Browser.webRequest.OnBeforeRedirectDetails,
  ) => {
    if (requestId == null) {
      if (!isSameUrl(details.url, request.url)) return;
      debugLog.info(`redirecting to ${details.redirectUrl}`);
      requestId = details.requestId;
    } else if (details.requestId !== requestId) {
      return;
    }

    redirectUrls.push(details.redirectUrl);
  };

  browser.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, {
    urls: ["<all_urls>"],
  });

  try {
    return {
      response: await fetch(request),
      redirectUrls,
    };
  } catch (error) {
    return { error, redirectUrls };
  } finally {
    browser.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect);
  }
}

export async function http_fetch(
  input: Request | string | URL,
  requestInit?: RequestInit,
): Promise<SerializableResponse> {
  const url = extractUrl(input);
  const userAgent = getHeaderValue(requestInit?.headers, "User-Agent");
  const viewportWidth = getHeaderValue(requestInit?.headers, "viewport-width");

  const tabId = null;
  const initialBypassParams = {
    requestUrl: url,
    spoofOrigin: url,
    userAgent,
    viewportWidth,
  };

  // Keep an untouched template so requests with a body can be retried safely.
  // Each fetch consumes a clone, while redirects themselves remain browser-managed.
  const requestTemplate = new Request(input, requestInit);
  const shouldFollowRedirects = requestTemplate.redirect === "follow";
  const installedByOrigin = new Map<string, typeof initialBypassParams>();

  const installBypassForUrl = async (requestUrl: string): Promise<boolean> => {
    const origin = new URL(requestUrl).origin;
    if (installedByOrigin.has(origin)) return false;

    const bypassParams = {
      ...initialBypassParams,
      requestUrl,
      spoofOrigin: requestUrl,
    };
    await local_install_bypass(tabId, bypassParams);
    installedByOrigin.set(origin, bypassParams);
    return true;
  };

  const release = await rateLimiter.acquire(rateLimiter.urlToKey(url));
  try {
    await installBypassForUrl(url);

    for (let attempt = 0; attempt <= MAX_REDIRECT_SPOOF_RETRIES; attempt++) {
      const result = shouldFollowRedirects
        ? await fetchWithRedirectCapture(requestTemplate.clone())
        : { response: await fetch(requestTemplate.clone()), redirectUrls: [] };

      if (result.response?.redirected) {
        result.redirectUrls.push(result.response.url);
      }

      let installedRedirectRule = false;
      for (const redirectUrl of result.redirectUrls) {
        if (
          !redirectUrl.startsWith("http://") &&
          !redirectUrl.startsWith("https://")
        ) {
          continue;
        }
        installedRedirectRule =
          (await installBypassForUrl(redirectUrl)) || installedRedirectRule;
      }

      if (installedRedirectRule) {
        debugLog.info("Retrying http_fetch with redirect spoof rules", {
          url,
          redirectUrls: result.redirectUrls,
          attempt: attempt + 1,
        });
        continue;
      }

      if (result.error !== undefined) throw result.error;
      if (result.response) return serializeResponse(result.response);
      throw new Error(`http_fetch returned no response for ${url}`);
    }

    throw new Error(
      `Too many redirect spoof retries in http_fetch for url ${url}`,
    );
  } catch (error) {
    debugLog.error(`Error in http_fetch for url ${url}:`, error);
    throw error;
  } finally {
    try {
      await Promise.all(
        Array.from(installedByOrigin.values()).map((bypassParams) =>
          local_uninstall_bypass(tabId, bypassParams),
        ),
      );
    } finally {
      await release();
    }
  }
}
