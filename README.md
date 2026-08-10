# Addon

[![GPL-3.0](https://img.shields.io/github/license/auto-novel/addon)](https://github.com/auto-novel/addon#license)
[![cd-addon](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml/badge.svg)](https://github.com/auto-novel/addon/actions/workflows/cd-addon.yml)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/auto-novel/addon/latest/total?label=下载量-最新&color=red&link=https%3A%2F%2Fgithub.com%2Fauto-novel%2Faddon%2Freleases)
![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/auto-novel/addon/total?label=下载量-总计&color=violet&link=https%3A%2F%2Fgithub.com%2Fauto-novel%2Faddon%2Freleases)

这是一个用于轻小说机翻站的用户侧 Chrome/Firefox 插件(Manifest v3)，
旨在扩展机翻站的功能，例如第三方翻译、智能导入、前端爬虫。

## 使用说明

### 翻译和导入功能：

支持机翻站的文库自动导入，有道翻译功能。

### 阅读器外部资源

处理 Pixiv 之类的文章中引用的图片等外部资源，绕过服务器 Referer 限制。

### 跳转功能

在机翻站支持的小说网站的**小说页面**上右键选择选项，可以直接跳转到对应的机翻站页面。
也可以直接点击浏览器右上角的机翻站插件的图标。

### 认证信息转移

AutoNovel 开发阶段本地启动的 `pnpm dev` 站点，右键可以将主站的认证信息复制到 `localhost:5173` 中，实现登录。

## 安装

打开最新版本的[发布页](https://github.com/auto-novel/addon/releases/latest)，下载和浏览器对应的 zip 文件。

国产浏览器绝大多数使用的是Chrome内核，请参考Chrome的安装方式。但是有些浏览器（比如搜狗）不提供从本地文件安装插件，这种无法使用。

> [!CAUTION]
>
> **注意**，如果在机翻站使用【**需要将机翻站网址加入浏览器广告拦截扩展的白名单**】
>
> **解释**：这是因为有道的 rlog api 被 adblock 拦截。机翻站调用 rlog 时也会被拦截，导致后续请求失败。
>
> 机翻站本身无任何广告。

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

想在手机上安装插件翻译的朋友，可以试试 `Firefox Nightly`

> Kiwi、Yandex 等手机浏览器支持插件功能，安装步骤和 Chrome 类似，请到官网下载
>
> 但是，注意这些浏览器不在本仓库测试和支持范围内。不保证能用。

#### Firefox (Android)

Android 手机建议使用 [Firefox Nightly](https://play.google.com/store/apps/details?id=org.mozilla.fenix) 浏览器。

- 从 [发布页](https://github.com/auto-novel/addon/releases/latest) 下载的`xpi文件`

- 打开`设置`点击`关于 Firefox Nightly`后`快速点击 Firefox 图标 5 次`，

- 返回上一页点击 `从文件安装扩展`，选择下载的 `xpi 文件`

> 之后新版本插件发布后，浏览器会自动更新插件。

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
type AddonCapabilityVersion = `${number}.${number}.${number}`;

type AddonCapabilityManifest = {
  [capability: string]: AddonCapabilityVersion | AddonCapabilityManifest;
};

type InfoResult = {
  version: string;
  homepage_url: string;
};

type CookieStatus = Partial<browser.cookies.Cookie> & {
  name: string;
};

type TabFetchOptions = {
  tabUrl: string;
  tabId?: number;
  forceNewTab?: boolean;
  forceWaitForLoad?: boolean;
  closeTimeout?: number;
};

type TabFetchError = Error & {
  /** 按发生顺序记录的重定向目标。 */
  redirectUrls?: string[];
  /** 最后一个重定向目标，等同于 redirectUrls.at(-1)。 */
  redirectUrl?: string;
  requestUrl?: string;
  tabId?: number;
};

type TabDomQueryOptions = {
  tabId?: number;
  forceNewTab?: boolean;
  forceWaitForLoad?: boolean;
  closeTimeout?: number;
};

type DomQueryResults = {
  tabId: number;
  results: string[];
  readyState: DocumentReadyState;
};

interface AddonApi {
  version: string;

  /** 兼容旧名称，等同于 capabilities。 */
  compat: AddonCapabilityManifest;

  /** 插件能力清单，可用于按版本判断功能是否可用。 */
  capabilities: AddonCapabilityManifest;

  info(): Promise<InfoResult>;

  cookiesStatus(params: {
    url?: string;
    domain?: string;
    partitionKey?: browser.cookies.CookiePartitionKey;
    keys: string[] | "*";
  }): Promise<Record<string, CookieStatus | null>>;

  cookiesPatch(params: {
    url: string;
    /** value 为 null 时删除对应 cookie。 */
    patches: Record<string, CookieStatus | null>;
  }): Promise<void>;

  fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;

  tabFetch(
    options: TabFetchOptions,
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response>;

  tabDomQuery(params: {
    tabUrl: string;
    selector: string;
    options?: TabDomQueryOptions;
  }): Promise<DomQueryResults>;

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

### tabFetch 重定向

`tabFetch` 的调用接口仍为 `Promise<Response>`。成功返回时：

- `response.url` 是 fetch 最终响应地址；
- `response.redirected` 表示 fetch 是否跟随过重定向；
- `X-AutoNovelAddon-Redirect-Url` 响应头是最后一个观测到的重定向目标；
- `X-AutoNovelAddon-Redirect-Urls` 响应头是 JSON 编码的完整重定向目标数组。

如果重定向后的请求因为 CORS、网络错误或验证墙而失败，Promise 会 reject，错误对象符合上面的 `TabFetchError`，调用方仍可根据 `redirectUrl` 切换 `tabUrl` 后重试：

```typescript
try {
  const response = await Addon.tabFetch(options, requestUrl);
  const redirectUrl = response.headers.get("X-AutoNovelAddon-Redirect-Url");
  // 根据业务响应和 redirectUrl 决定是否切换 tabUrl 后重试。
} catch (cause) {
  const error = cause as TabFetchError;
  if (error.redirectUrl) {
    const nextOptions = {
      ...options,
      tabUrl: new URL(error.redirectUrl).origin,
    };
    // 按调用方的重试策略再次调用 Addon.tabFetch。
  }
}
```

扩展必须同时具有初始请求域名和重定向目标域名的 `host_permissions`，否则浏览器可能不会向扩展暴露完整跳转链，也无法在目标域标签页执行脚本。

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
