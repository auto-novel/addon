const spoof_rules_builder = (url: string) => {
  let rule_idx = 100;
  const origin = new URL(url).origin;
  const referer = origin + "/";
  return [
    {
      id: rule_idx++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          { header: "Origin", operation: "set", value: origin },
          { header: "Referer", operation: "set", value: referer }
        ]
      },
      condition: {
        resourceTypes: ["xmlhttprequest", "csp_report"]
      }
    }
  ];
};

const cors_rules_builder = (url: string) => {
  let rule_idx = 200;
  const origin = new URL(url).origin;
  return [
    {
      id: rule_idx++,
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
      id: rule_idx++,
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
      id: rule_idx++,
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

const spoof_rules_ids = spoof_rules_builder("https://example.com").map((r) => r.id);

const cors_rules_ids = cors_rules_builder("https://example.com").map((r) => r.id);

export function installSpoofRules(url: string) {
  const rules = spoof_rules_builder(url);
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules as any,
    removeRuleIds: spoof_rules_ids
  });
}

export function uninstallSpoofRules() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: spoof_rules_ids
  });
}

export function installCORSRules(url: string) {
  const rules = cors_rules_builder(url);
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules as any,
    removeRuleIds: cors_rules_ids
  });
}

export function uninstallCORSRules() {
  browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: cors_rules_ids
  });
}
