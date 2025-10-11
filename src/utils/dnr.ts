import { hashStringToInt } from "@/utils/tools";
import { rulesMgr } from "@/utils/resource";

function spoofRulesKey(
  tabId: number,
  requestUrl: string,
  origin: string,
  referer: string,
) {
  return hashStringToInt(`${tabId}_${requestUrl}_${origin}_${referer}`);
}

function spoofRulesBuilder(
  tabId: number,
  requestUrl: string,
  origin: string,
  referer: string,
): any[] {
  let idx = spoofRulesKey(tabId, requestUrl, origin, referer);
  debugLog("Building spoof rules for", {
    idx,
    url: requestUrl,
    origin,
    referer,
  });
  const filter = new URL(requestUrl).origin;
  return [
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: origin },
          { header: "Referer", operation: "set", value: referer },
        ],
      },
      condition: {
        tabIds: [tabId],
        urlFilter: `|${filter}/*`,
        resourceTypes: ["xmlhttprequest", "csp_report", "main_frame"],
      },
    },
  ];
}

function corsRulesKey(tabId: number, initialatorUrl: string) {
  return hashStringToInt(`${tabId}_${initialatorUrl}`);
}

function corsRulesBuilder(tabId: number, initialatorUrl: string): any[] {
  let idx = corsRulesKey(tabId, initialatorUrl);
  debugLog("Building cors rules for", { idx, url: initialatorUrl });
  const origin = new URL(initialatorUrl).origin;
  return [
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          {
            header: "Access-Control-Allow-Methods",
            operation: "set",
            value: "GET, POST, PUT, DELETE, HEAD, OPTIONS",
          },

          {
            header: "Access-Control-Allow-Headers",
            operation: "set",
            value: "*",
          },
          {
            header: "Access-Control-Expose-Headers",
            operation: "set",
            value: "*",
          },

          {
            header: "Access-Control-Allow-Credentials",
            operation: "set",
            value: "true",
          },
          {
            header: "Access-Control-Allow-Origin",
            operation: "set",
            value: origin,
          },
        ],
      },
      condition: {
        tabIds: [tabId],
        requestMethods: ["get", "post", "put", "delete", "head", "options"],
      },
    },
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { operation: "remove", header: "content-security-policy" },
          {
            operation: "remove",
            header: "content-security-policy-report-only",
          },
          { operation: "remove", header: "x-webkit-csp" },
          { operation: "remove", header: "x-content-security-policy" },
        ],
      },
      condition: {
        tabIds: [tabId],
        resourceTypes: ["main_frame"],
      },
    },
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [{ operation: "remove", header: "x-frame-options" }],
      },
      condition: {
        tabIds: [tabId],
        resourceTypes: ["sub_frame"],
      },
    },
  ];
}

// 用于记录某个规则被安装了多少次，防止过早卸载
const SPOOF_KEY = "spoof_rules";
export async function installSpoofRules(
  tabId: number,
  requestUrl: string,
  origin: string,
  referer: string,
) {
  const rules = spoofRulesBuilder(tabId, requestUrl, origin, referer);
  debugLog("Add spoof rules: ", rules);
  await rulesMgr.add(rules);
}

export async function uninstallSpoofRules(
  tabId: number,
  requestUrl: string,
  origin: string,
  referer: string,
) {
  const rules = spoofRulesBuilder(tabId, requestUrl, origin, referer);
  debugLog("Remove spoof rules: ", rules);
  await rulesMgr.remove(rules);
}

const CORS_KEY = "cors_rules";
export async function installCORSRules(tabId: number, initialatorUrl: string) {
  const rules = corsRulesBuilder(tabId, initialatorUrl);
  debugLog("Add cors rules: ", rules);
  await rulesMgr.add(rules);
}

export async function uninstallCORSRules(
  tabId: number,
  initialatorUrl: string,
) {
  const rules = corsRulesBuilder(tabId, initialatorUrl);
  debugLog("Remove cors rules: ", rules);
  await rulesMgr.remove(rules);
}
