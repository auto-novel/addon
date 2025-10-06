import * as browserDetection from "@braintree/browser-detection";

export const isDebug = process.env.NODE_ENV !== "production";

export const WS_ADDRESS = isDebug ? "wss://csc.novalia.cc:37000" : "ws://localhost:37000";

export const MAX_PAGE_LOAD_WAIT_TIME = 10000; // ms

export const browserInfo = {
  isFirefox: false,
  isChrome: false,
  name: "Unknown"
};

export function detectBrowser() {
  try {
    if (browserDetection.isFirefox()) {
      browserInfo.isFirefox = true;
      browserInfo.name = "firefox";
      console.log("检测到浏览器:", browserInfo);
    } else {
      // 如果不是 Firefox，我们假定它是基于 Chromium 的浏览器
      // 注意: `chrome` 命名空间在 Firefox 中也作为别名存在，所以不能用它来区分
      browserInfo.isChrome = true;
      if (browserDetection.isEdge()) {
        browserInfo.name = "Edge";
      } else {
        browserInfo.name = "Chrome"; // 或 Opera, Brave 等
      }
      console.log("检测到基于 Chromium 的浏览器:", browserInfo.name);
    }
  } catch (error) {
    browserInfo.isChrome = true;
    browserInfo.name = "Chrome";
  }
  return browserInfo;
}
detectBrowser();

export const ALLOWED_MESSAGING_HOSTS = ["novelia.cc", "fishhawk.top", "localhost", "example.com"];

export function isMessagingAllowed(url: string): boolean {
  if (!url) {
    console.warn("Received external message from a source without a URL.");
    return false;
  }

  let isAllowed = false;
  try {
    const senderHostname = new URL(url).hostname;

    isAllowed = ALLOWED_MESSAGING_HOSTS.some((allowedHost) => {
      if (senderHostname === allowedHost) {
        return true;
      }
      if (senderHostname.endsWith("." + allowedHost)) {
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error("Could not parse sender URL:", url, error);
  }
  return isAllowed;
}
