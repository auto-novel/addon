# Addon

[![GPL-3.0](https://img.shields.io/github/license/auto-novel/addon)](https://github.com/auto-novel/addon#license)
[![cd-addon](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml/badge.svg)](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml)

这是一个用于轻小说机翻站的用户侧 Chrome/Firefox 插件(Manifest v3)，
旨在扩展机翻站的功能，例如第三方翻译、智能导入、前端爬虫。

> 注意，此插件会读取你的 cookie 和浏览器数据，并能调试所有网页。如果担心隐私泄露，请谨慎使用。

## 安装

打开最新版本的[发布页](https://github.com/auto-novel/addon/releases/latest)，下载和浏览器对应的 zip 文件。

国产浏览器绝大多数使用的是Chrome内核，请参考Chrome的安装方式。但是有些浏览器（比如搜狗）不提供从本地文件安装插件，这种无法使用。

### Chrome

- 将 zip 文件解压到文件夹。
- 打开 Chrome 浏览器，进入 `chrome://extensions/` 页面。
- 打开 `开发者模式`，选择 `加载已解压的扩展程序`，选择解压的目录（包含 `manifest.json` 文件）。
- 安装后不能删除解压目录。

![Chrome安装步骤](https://n.novelia.cc/files-extra/chrome.png)

### Edge

安装步骤参考 Chrome。

![Edge安装步骤](https://n.novelia.cc/files-extra/edge.png)

### Firefox

- 打开 Firefox 浏览器，进入 `about:debugging#/runtime/this-firefox` 页面。
- 点击 `临时加载附加组件` 按钮，选择之前下载的 zip 文件。
- 安装后不能删除 zip 文件，每次打开浏览器都需要重新加载。

### 移动端

想在手机上安装插件翻译的朋友，可以试试 Kiwi、Yandex 等浏览器，安装步骤和 Chrome 类似，注意下载请到官网下载。

## API

插件会将扩展函数挂载到 `window.Addon` 上，类型如下：

```typescript
type Cookie = browser.cookies.Cookie[];

interface AddonApi {
  makeCookiesPublic(cookies: Cookie[]): Cookie[];

  cookiesGet(url: string): Promise<Cookie[]>;
  cookiesSet(cookies: Cookie[]): Promise<void>;

  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
  tabFetch(
    options: { tabUrl: string; forceNewTab?: boolean },
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response>;
  spoofFetch(
    baseUrl: string,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response>;
}

declare global {
  interface Window {
    Addon?: AddonApi;
  }
}
```

## 开发说明

```shell
> pnpm install  # 安装依赖
> pnpm prepare  # 设置 husky git hooks
> pnpm dev      # 打开调试浏览器
```
