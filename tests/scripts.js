window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: { base_url: "", cmd: "tab.http.get", data: { url: "https://ncode.syosetu.com/n9669bk/1" } }
  },
  "*"
);

window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: {
      base_url: "",
      cmd: "http.get",
      data: { url: "https://n.novelia.cc/" }
    }
  },
  "*"
);

// Pixiv R18 Test, Login Required
window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: {
      base_url: "",
      cmd: "http.get",
      data: { url: "https://www.pixiv.net/novel/show.php?id=20701122" }
    }
  },
  "*"
);

window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: { base_url: "", cmd: "tab.http.get", data: { url: "https://n.novelia.cc/" } }
  },
  "*"
);

window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: { base_url: "https://n.novelia.cc/", cmd: "dom.querySelectorAll", data: { selector: "body" } }
  },
  "*"
);

window.addEventListener(
  "message",
  (event) => {
    if (event.source !== window && event.type != "AUTO_NOVEL_CRAWLER_RESPONSE") return;
    console.log("received message:", event.data);
  },
  false
);

window.postMessage(
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: {
      base_url: "",
      cmd: "http.get",
      data: { url: "https://n.novelia.cc/" }
    }
  },
  "*"
);

chrome.runtime.sendMessage(
  "heaclbjdecgjhkbeigpkgoboipadjalj",
  {
    type: "AUTO_NOVEL_CRAWLER_PING"
  },
  (e) => console.log(e)
);

chrome.runtime.sendMessage(
  "heaclbjdecgjhkbeigpkgoboipadjalj",
  {
    type: "AUTO_NOVEL_CRAWLER_REQUEST",
    payload: {
      base_url: "https://www.pixiv.net/novel/show.php?id=20701122",
      cmd: "tab.dom.querySelectorAll",
      data: { selector: "main" }
    }
  },
  (e) => console.log(e)
);
