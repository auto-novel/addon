import tailwindcss from "@tailwindcss/vite";
import { defineConfig, UserManifest, type WxtViteConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/auto-icons", "@wxt-dev/module-vue"],
  imports: {
    eslintrc: { enabled: true },
  },
  manifestVersion: 3,
  manifest: ({ browser }) => {
    let userManifest: UserManifest = {
      name: "轻小说机翻机器人",
      homepage_url: "https://n.novelia.cc/",
      action: {
        default_title: "轻小说机翻站用户侧爬虫插件",
      },
      web_accessible_resources: [
        {
          resources: ["addon-world.js"],
          matches: [
            "https://*.novelia.cc/*",
            "https://*.fishhawk.top/*",
            "*://localhost/*",
          ],
        },
      ],
      permissions: [
        "tabs",
        "scripting",
        "alarms",
        "cookies",
        "storage",
        "webRequest",
        "declarativeNetRequest",
        "declarativeNetRequestWithHostAccess",
      ],
      host_permissions: [
        "*://*.novelia.cc/*",
        "*://*.fishhawk.top/*",

        "*://*.baidu.com/*",
        "*://*.youdao.com/*",
        "*://*.openai.com/*",
        "*://*.amazon.co.jp/*",
        "*://kakuyomu.jp/*",
        "*://*.syosetu.com/*",
        "*://novelup.plus/*",
        "*://syosetu.org/*",
        "*://*.pixiv.net/*",
        "*://*.alphapolis.co.jp/*",
        "*://novelism.jp/*",
      ],
    };

    if (browser === "chrome") {
      userManifest = {
        ...userManifest,
        key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmzpvkqphjS1Od8waHDo12FnmcE7+QkzVTr/MKtv64UzlDhF54W8nJR2v4qWy+gHzJkf6QakEELfE4jOJAdOPxNQFd8YgEvsYk8Acfo9Pyki/3jpBB8dzDemAjABNasNGyd9RIHdOuZd2Evl+0NyUNHaCSzSgPJBcGZzg8ACfp8VGhPltiNlxy/JXQJZStR35fiFndC3WP9qaeztLy+jeg5ieQY8ULNLgJDbL02S1KEIB0ijaR9CICaiSYsPFdPhMlYdR8kYhHhrRfXljoJPw4LH0ThMrOoeNWHI6DgO/qSXgSDx4LknOJ28UPCEqHTkPo6WTDDNLpDhFG3ZwMbpHmQIDAQAB",
        externally_connectable: {
          matches: [
            "*://*.novelia.cc/*",
            "*://*.fishhawk.top/*",
            "*://localhost/*",
            "*://example.com/*",
          ],
        },
      };
    } else if (browser === "firefox") {
      userManifest = {
        ...userManifest,
        browser_specific_settings: {
          gecko: {
            id: "addon@n.novelia.cc",
          },
        },
      };
    } else {
      throw new Error(`不支持的浏览器类型: ${browser}`);
    }
    return userManifest;
  },
  srcDir: "src",
  webExt: {
    openDevtools: true,
    firefoxArgs: ["--devtools"],
    chromiumArgs: ["--auto-open-devtools-for-tabs", "--start-maximized"],
  },
  vite: () =>
    ({
      plugins: [tailwindcss()],
    }) as WxtViteConfig,
  autoIcons: {
    baseIconPath: "assets/icon.svg",
    sizes: [128, 48, 38, 32, 19, 16],
  },
});
