export const IS_DEBUG = import.meta.env.PROD;

export const MAX_PAGE_LOAD_WAIT_TIME = 10000; // ms
export const DELAYED_TAB_CLOSE_TIME = 3000; // ms

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
//     debugPrint.error("Could not parse sender URL:", url, error);
//   }
//   return isAllowed;
// }
