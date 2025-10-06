// chrome.declarativeNetRequest.HeaderOperation
let spoof_rule_idx = 100;
const spoof_rules: any[] = [];
const spoof_rules_builder = (url: string, origin: string, referer: string) => {
  console.log("Building spoof rules for", { url, origin, referer });
  return [
    {
      id: spoof_rule_idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: origin },
          { header: "Referer", operation: "set", value: referer }
        ]
      },
      condition: {
        urlFilter: `|${url}`,
        resourceTypes: ["xmlhttprequest", "csp_report"]
      }
    }
  ];
};

let cors_rule_idx = 200;
const cors_rules: any[] = [];
const cors_rules_builder = (url: string) => {
  const origin = new URL(url).origin;
  console.log("Building cors rules for", { url, origin });
  return [
    {
      id: cors_rule_idx++,
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
      id: cors_rule_idx++,
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
      id: cors_rule_idx++,
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

export async function installSpoofRules(url: string, origin: string, referer: string) {
  const spoof_rules_ids = spoof_rules.map((r) => r.id);
  spoof_rules.push(...spoof_rules_builder(url, origin, referer));
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: spoof_rules as any,
    removeRuleIds: spoof_rules_ids
  });
}

export async function uninstallSpoofRules() {
  const spoof_rules_ids = spoof_rules.map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: spoof_rules_ids
  });
}

export async function installCORSRules(url: string) {
  const cors_rules_ids = cors_rules.map((r) => r.id);
  cors_rules.push(...cors_rules_builder(url));
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: cors_rules,
    removeRuleIds: cors_rules_ids
  });
}

export async function uninstallCORSRules() {
  const cors_rules_ids = cors_rules.map((r) => r.id);
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: cors_rules_ids
  });
}
