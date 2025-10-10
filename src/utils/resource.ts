import { Persist } from "@/utils/persist";
import { newError } from "./tools";

type Tab = Browser.tabs.Tab;
type TabId = number;

type TabStatus = {
  opened: boolean;
};

class TabResMgr {
  private tabInfo: Persist<TabId> = new Persist("tabRes", {}, "session");

  constructor() {}

  public waitAnyTab(tab: Tab): Promise<Tab> {
    return new Promise((resolve, reject) => {
      const listener = (tabId: number, info: { status?: string }) => {
        if (tabId === tab.id && info.status === "complete") {
          clearTimeout(timeoutId);
          browser.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      };
      const timeoutId = setTimeout(() => {
        browser.tabs.onUpdated.removeListener(listener);
        reject(tab);
      }, MAX_PAGE_LOAD_WAIT_TIME);

      browser.tabs.onUpdated.addListener(listener);
    });
  }

  async closeTab(tab: Tab): Promise<void> {
    if (!tab.id) return;
    await browser.tabs.remove(tab.id);
  }

  async findOrCreateTab(url: string): Promise<Tab> {
    const tabs = await browser.tabs.query({ url });
    // FIXME(kuriko): 如果用户此时手动关闭了标签页怎么办？
    const tab = tabs.length > 0 ? tabs[0] : await browser.tabs.create({ url });
    await this.waitAnyTab(tab);
    if (!tab.id) throw newError(`Tab has no id: ${url}`);
    this.tabInfo.set(tab.id.toString(), tab.id);
    return tab;
  }
}

export const tabResMgr = new TabResMgr();

class RulesManager {
  // NOTE(kuriko): all RW is inside worker thread, so it's atomic
  ruleRefCount: Persist<number> = new Persist("dnrRuleRefCount", 0, "session");

  async add(rules: Browser.declarativeNetRequest.Rule[]) {
    try {
      // NOTE(kuriko): JSON.stringify is stable for arrays
      const cnt = await this.ruleRefCount.get(JSON.stringify(rules));
      await browser.declarativeNetRequest.updateDynamicRules({
        addRules: rules,
        removeRuleIds: rules.map((rule) => rule.id),
      });
    } catch (e) {
      const msg = `Failed to install rules, ignoring: ${e}`;
      debugPrint.error(msg);
      throw newError(msg);
    }
  }

  async remove(rules: Browser.declarativeNetRequest.Rule[]) {
    try {
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((rule) => rule.id),
      });
    } catch (e) {
      const msg = `Failed to uninstall rules, ignoring: ${e}`;
      debugPrint.error(msg);
      throw newError(msg);
    } finally {
      // await storage.removeItem(`session:${key}`);
    }
  }

  clear() {
    // Clear all rules
    browser.declarativeNetRequest.getDynamicRules((rules) => {
      console.info("[AutoNovel] Cleaning up old rules: ", rules);
      browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
      });
    });
    // Clear all persisted data
    // TODO(kuriko)
  }
}

export const rulesMgr = new RulesManager();
