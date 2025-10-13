import { TabResMgr } from "@/utils/resource";

export async function alarmLisener(alarm: Browser.alarms.Alarm) {
  debugLog("Alarm triggered: ", alarm.name);
  {
    const prefix = TabResMgr.genAlarmName();
    if (alarm.name.startsWith(prefix)) {
      const tabIdToClose = parseInt(alarm.name.substring(prefix.length), 10);
      await tabResMgr.findAndCloseTab(tabIdToClose);
    }
  }
}
