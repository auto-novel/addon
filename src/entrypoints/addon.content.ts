export default defineContentScript({
  matches: [
    "https://*.novelia.cc/*",
    "https://*.fishhawk.top/*",
    "*://localhost/*",
  ],
  async main() {
    debugLog("Injecting Addon into web page.");
    await injectScript("./addon-world.js", {
      keepInDom: true,
    });
  },
});
