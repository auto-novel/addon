import Bowser from "bowser";

export const IS_DEBUG = process.env.NODE_ENV !== "production";

export const MAX_PAGE_LOAD_WAIT_TIME = 10000; // ms

export const browserInfo = {
  isFirefox: false,
  isChrome: false,
  name: "Unknown",
};

(function detectBrowser() {
  try {
    const parser = Bowser.getParser(window.navigator.userAgent);
    const browserName = parser.getBrowserName(true);
    browserInfo.name = browserName || "Unknown";
    if (browserName === "firefox") {
      browserInfo.isFirefox = true;
    } else {
      // FIXME(kuriko): 检测手机等其他平台
      // 如果不是 Firefox，我们假定它是基于 Chromium 的浏览器
      // 注意: `chrome` 命名空间在 Firefox 中也作为别名存在，所以不能用它来区分
      browserInfo.isChrome = true;
    }
  } catch (error) {
    browserInfo.isChrome = true;
  }
  console.log("检测到浏览器:", browserInfo);
  return browserInfo;
})();

// export const ALLOWED_MESSAGING_HOSTS = ["novelia.cc", "fishhawk.top", "localhost", "example.com"];

// export function isMessagingAllowed(url: string): boolean {
//   if (!url) {
//     console.warn("Received external message from a source without a URL.");
//     return false;
//   }

//   let isAllowed = false;
//   try {
//     const senderHostname = new URL(url).hostname;

//     isAllowed = ALLOWED_MESSAGING_HOSTS.some((allowedHost) => {
//       if (senderHostname === allowedHost) {
//         return true;
//       }
//       if (senderHostname.endsWith("." + allowedHost)) {
//         return true;
//       }
//       return false;
//     });
//   } catch (error) {
//     console.error("Could not parse sender URL:", url, error);
//   }
//   return isAllowed;
// }
