import { getVar, storeVar } from "@utils/storage";
import { hashStringToInt } from "./tools";

// chrome.declarativeNetRequest.HeaderOperation
const spoof_rules_builder = (base: number, url: string, origin: string, referer: string): any[] => {
  let idx = base;
  console.log("Building spoof rules for", { url, origin, referer });
  const filter = new URL(url).origin;
  return [
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: origin },
          { header: "Referer", operation: "set", value: referer }
        ]
      },
      condition: {
        urlFilter: `|${filter}/*`,
        resourceTypes: ["xmlhttprequest", "csp_report"]
      }
    }
  ];
};

const cors_rules_builder = (base: number, url: string): any[] => {
  let idx = base;
  const origin = new URL(url).origin;
  console.log("Building cors rules for", { url, origin });
  return [
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "Access-Control-Allow-Methods", operation: "set", value: "GET, POST, PUT, DELETE, HEAD, OPTIONS" },

          { header: "Access-Control-Allow-Headers", operation: "set", value: "*" },
          { header: "Access-Control-Expose-Headers", operation: "set", value: "*" },

          { header: "Access-Control-Allow-Credentials", operation: "set", value: "true" },
          { header: "Access-Control-Allow-Origin", operation: "set", value: origin }
        ]
      },
      condition: {
        resourceTypes: ["xmlhttprequest", "csp_report"]
      }
    },
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { operation: "remove", header: "content-security-policy" },
          { operation: "remove", header: "content-security-policy-report-only" },
          { operation: "remove", header: "x-webkit-csp" },
          { operation: "remove", header: "x-content-security-policy" }
        ]
      },
      condition: {
        resourceTypes: ["main_frame"]
      }
    },
    {
      id: idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [{ operation: "remove", header: "x-frame-options" }]
      },
      condition: {
        resourceTypes: ["sub_frame"]
      }
    }
  ];
};

const SPOOF_KEY = "spoof_rules";
export async function installSpoofRules(id: string, url: string, origin: string, referer: string) {
  const base = hashStringToInt(`${id}_${url}_${origin}_${referer}`);
  const newRules = spoof_rules_builder(base, url, origin, referer);
  await storeVar(`${id}_${SPOOF_KEY}`, newRules);
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: newRules,
      removeRuleIds: newRules.map((rule) => rule.id)
    });
  } catch (e) {
    console.error("Failed to install spoof rules, ignoring: ", e);
  }
  return id;
}

export async function uninstallSpoofRules(id: string) {
  const rules: any[] = (await getVar(`${id}_spoof_rules`)) ?? [];
  const idsToRemove = rules.map((rule) => rule.id);
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: idsToRemove
    });
  } catch (e) {
    console.error("Failed to uninstall spoof rules, ignoring: ", e);
  }
}

const CORS_KEY = "cors_rules";
export async function installCORSRules(id: string, url: string) {
  const base = hashStringToInt(`${id}_${url}`);
  const newRules = cors_rules_builder(base, url);
  await storeVar(`${id}_${CORS_KEY}`, newRules);
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: newRules,
      removeRuleIds: newRules.map((rule) => rule.id)
    });
  } catch (e) {
    console.error("Failed to install cors rules, ignoring: ", e);
  }
  return id;
}

export async function uninstallCORSRules(id: string) {
  const rules: any[] = (await getVar(`${id}_${CORS_KEY}`)) ?? [];
  const idsToRemove = rules.map((rule) => rule.id);
  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: idsToRemove
    });
  } catch (e) {
    console.error("Failed to uninstall cors rules, ignoring: ", e);
  }
}
