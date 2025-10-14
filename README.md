# Addon

这是一个用于轻小说机翻站的用户侧 Chrome/Firefox 插件(Manifest v3)，
旨在扩展机翻站的功能，例如第三方翻译、智能导入、前端爬虫。

## 安装

### Chrome

- 下载 `addon-${version}-chrome.zip` 文件，右键解压到文件夹。
- 打开 Chrome 浏览器，进入 `chrome://extensions/` 页面。
- 打开 `开发者模式`，选择 `加载已解压的扩展程序`，选择解压的目录（包含 `manifest.json` 文件）。
- 安装后不能删除解压目录。

### Edge

Edge 浏览器和 Chrome 类似。

### Firefox

- 下载 `addon-${version}-firefox.zip`。
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
