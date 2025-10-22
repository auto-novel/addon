# Addon

[![GPL-3.0](https://img.shields.io/github/license/auto-novel/addon)](https://github.com/auto-novel/addon#license)
[![cd-addon](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml/badge.svg)](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/auto-novel/addon/total?label=%E4%B8%8B%E8%BD%BD%E9%87%8F%20&color=violet&link=https%3A%2F%2Fgithub.com%2Fauto-novel%2Faddon%2Freleases)

这是一个用于轻小说机翻站的用户侧 Chrome/Firefox 插件(Manifest v3)，
旨在扩展机翻站的功能，例如第三方翻译、智能导入、前端爬虫。

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

#### 自动更新版
> [!note]
> 注意，插件可能会被 firefox 下架，但是安装后即使下架也能用（手动重新启用即可）。

- 从最新的下载页面中下载 `addon-${version}-firefox.xpi` 文件。
- 打开 Firefox 浏览器，进入 `about:addons`。
- 将 xpi 文件直接拖入浏览器页面中，即可安装。

#### 单次安装
- 打开 Firefox 浏览器，进入 `about:debugging#/runtime/this-firefox` 页面。
- 点击 `临时加载附加组件` 按钮，选择之前下载的 zip 文件。
- 安装后不能删除 zip 文件，每次打开浏览器都需要重新加载。

### 移动端

想在手机上安装插件翻译的朋友，可以试试 Kiwi、Yandex 等浏览器，安装步骤和 Chrome 类似，注意下载请到官网下载。

## 如何测试插件是否工作

- 进入 `https://n.novelia.cc/wenku-edit`。
- 使用任意 Amazon 文库地址，例如：`https://www.amazon.co.jp/dp/4048926667`。
- 选择`导入`。
- 检查是否导入成功：中文标题非空，简介是中文而非日文。

> 如果存在问题，请手动打开一次对应的 Amazon 页面和 `dict.youdao.com` 页面获取用户凭证或者过人机验证。
> 
> 之后刷新 wenku-edit 页面，重试导入流程。

## API

插件会将扩展函数挂载到 `window.Addon` 上，类型如下：

```typescript
type Cookie = browser.cookies.Cookie[];

interface AddonApi {
  cookiesStatus(params: {
    url?: string;
    domain?: string;
    keys: string[] | '*';
  }): Promise<Record<string, CookieStatus>>;

  cookiesPatch(params: {
    url: string;
    patches: Record<string, CookieStatus>;
  }): Promise<void>;

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

## 免责声明

> [!caution]
>
> - 声明：本工具旨在学习与交流，按“现状”提供。用户应确保其使用行为已获得必要授权并符合适用法律与目标网站政策，否则请立即停止使用。
> - 本免责声明可能不时更新。用户继续使用本工具即视为接受更新后的条款。建议用户定期查阅最新版本。

## 安全声明

> [!note]
>
> - 构建与透明性
>   - 本工具的 release 版本由 GitHub Actions 自动构建打包，完全基于公开的开源代码生成。源代码遵循 GPL‑3.0 协议开源，欢迎审计与复现构建流程。
> - 通信与数据上报
>   - 本工具仅通过机翻站接口上报用户声明要求爬取的数据，不与除该接口以外的任何第三方服务器建立通信连接。
> - 本地数据与隐私
>   - 本工具不读取、收集或存储用户的 Cookies、浏览记录等敏感信息，也不在本地或远端保存任何相关数据。
> - 漏洞发现与披露
>   - 如发现安全漏洞或潜在风险，请提交至本项目的安全问题通道/私密 Issue
