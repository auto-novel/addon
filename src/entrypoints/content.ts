import { browserInfo, isDebug } from '@/utils/consts';
import { MSG_TYPE } from '@/utils/msg';

/*
  Here we use externally_connectable in manifest.json to allow the web page to connect to the extension directly.
*/
function process_forward(event: MessageEvent) {
  if (browserInfo.isChrome) {
    browser.runtime.sendMessage(event.data, (response) => {
      console.debug('[AutoNovel] Crawler response:', response);
      window.postMessage(response, event.origin);
    });
  } else if (browserInfo.isFirefox) {
    browser.runtime.sendMessage(event.data).then((resp) => {
      window.postMessage(resp, event.origin);
    });
  } else {
    throw new Error('Unsupported browser');
  }
}

export default defineContentScript({
  matches: [
    'http://localhost/*',
    'https://*.novelia.cc/*',
    'https://*.fishhawk.top/*',
  ],
  main() {
    console.log('[AutoNovel] Content script for auto-novel loaded.');
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return;
      }

      for (const key of Object.keys(MSG_TYPE)) {
        if (event.data?.type === (MSG_TYPE as any)[key]) {
          if (isDebug && browserInfo.isChrome) {
            console.info(
              '[AutoNovel] In Production Mode, please use chrome.runtime.postMessage'
            );
            return;
          }
          break;
        }
      }
      if (event.data?.type == MSG_TYPE.RESPONSE) return; // Ignore responses.
      process_forward(event);
    });
  },
});
