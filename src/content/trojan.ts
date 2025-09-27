/*
    This content script is injected into the target website.
    Actions:
        - send http requests
        - DOM parsing
        - <del>xhook to intercept ajax requests</del>
            Note: use debugger api to achieve this

    alternatively, we can use chrome.scripting.executeScript to run scripts in the context of the page.
*/

// function injectScript(filePath: string) {
//   const script = document.createElement('script');
//   script.src = chrome.runtime.getURL(filePath);
//   (document.head || document.documentElement).appendChild(script);
//   script.onload = () => {
//     script.remove();
//   };
// }

// 必须先注入 xhook 库
// injectScript('resources/torjan.js');
// 然后再注入我们自己的拦截逻辑
// injectScript('interceptor.js');
