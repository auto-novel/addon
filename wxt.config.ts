import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/auto-icons', '@wxt-dev/module-vue'],
  manifest: {
    name: '轻小说机翻机器人',
    homepage_url: 'https://n.novelia.cc/',
    action: {},
    host_permissions: [
      'https://*.novelia.cc/*',
      'https://*.fishhawk.top/*',

      'https://*.baidu.com/*',
      'https://*.youdao.com/*',
      'https://*.openai.com/*',
      'https://*.amazon.co.jp/*',
      'https://kakuyomu.jp/*',
      'https://*.syosetu.com/*',
      'https://novelup.plus/*',
      'https://syosetu.org/*',
      'https://*.pixiv.net/*',
      'https://*.alphapolis.co.jp/*',
      'https://novelism.jp/*',
    ],
  },
  srcDir: 'src',
  webExt: {
    openDevtools: true,
    startUrls: ['http://localhost:5173/wenku-edit'],
    firefoxArgs: ['--devtools'],
    chromiumArgs: ['--auto-open-devtools-for-tabs'],
  },
  autoIcons: {
    baseIconPath: 'assets/icon.svg',
    sizes: [128, 48, 38, 32, 19, 16],
  },
});
