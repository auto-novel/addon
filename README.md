# 轻小说机翻站用户侧爬虫 Chrome 插件

> [!note]
> 使用本插件爬取内容仅限于个人学习和研究目的，请遵守所在国家和地区的法律法规。

这是一个用于轻小说机翻站的用户侧爬虫 Chrome 插件，旨在帮助用户从特定网站上抓取和处理轻小说内容。
该插件通过监听网页中的消息事件，处理爬虫请求，并将结果返回给网页。



## 使用方法

### 命令报文

```typescript
enum MSG_TYPE {
  CRAWLER_REQ = "AUTO_NOVEL_CRAWLER_REQUEST",  // 发起爬虫请求
  RESPONSE = "AUTO_NOVEL_CRAWLER_RESPONSE",    // 爬虫请求的响应
  PING = "AUTO_NOVEL_CRAWLER_PING"             // 测试用命令
}

// 以 爬虫请求 为例
type MSG_CRAWLER = {
  type: MSG_TYPE.CRAWLER_REQ;                  // 命令类型
  payload: AutoNovelCrawlerCommand;            // 爬虫请求参数
};

type AutoNovelCrawlerCommand = {
  base_url: string;                    // 基础 URL，用于创建后台页面，可以认为是 Host
  cmd: keyof ClientMethods;            // 爬虫命令
  data?: any;                          // 爬虫参数
};

// 目前支持的爬虫命令：
// 其中 `tab_*` 代表使用 debugger api 在目标 tab 上操作。
export type ClientMethods = {
  "http.raw"(params: HttpRawParams): Promise<HttpRawResult>;
  "http.get"(params: HttpGetParams): Promise<HttpGetResult>;
  "http.postJson"(params: HttpPostJsonParams): Promise<HttpPostJsonResult>;

  "tab.switchTo"(params: TabSwitchToParams): Promise<TabSwitchToResult>;
  "tab.http.get"(params: TabHttpGetParams): Promise<TabHttpGetResult>;
  "tab.http.postJson"(params: TabHttpPostJsonParams): Promise<TabHttpPostJsonResult>;

  "cookies.get"(params: CookiesGetParams): Promise<CookiesGetResult>;
  // 在 base_url 页面执行 querySelectorAll，支持 SPA 页面。
  "dom.querySelectorAll"(params: DomQuerySelectorAllParams): Promise<DomQuerySelectorAllResult>;
  // 用于关闭调试器和清理
  "job.quit"(params: JobQuitParams): Promise<JobQuitResult>;
};
```



### 调用方法

```typescript
// 命令：对 机翻站（SPA 站）进行 dom 查询
window.postMessage({
  type: "AUTO_NOVEL_CRAWLER_REQUEST",
  payload: { 
      base_url: "https://n.novelia.cc/", 
      cmd: "dom.querySelectorAll", 
      data: { selector: "body" } 
  }},"*");

// 命令：对 机翻站（SPA 站）进行 dom 查询
window.postMessage({
  type: "AUTO_NOVEL_CRAWLER_REQUEST",
  payload: { 
      base_url: "https://n.novelia.cc/", 
      cmd: "dom.querySelectorAll", 
      data: { selector: "body" } 
  }},"*");

// 命令：直接执行 http get 操作，对于 SPA 站只能获取裸 html
// 注意，base_url 为空时会替换为 data.url
window.postMessage({
  type: "AUTO_NOVEL_CRAWLER_REQUEST",
  payload: {
    base_url: "",
    cmd: "http.get",
    data: { url: "https://n.novelia.cc/" } }
}, "*");
// ---------------------------------------------------------------------------------
// 监听结果
window.addEventListener("message", (event) => {
  if (event.source !== window && event.type != "AUTO_NOVEL_CRAWLER_RESPONSE") return;
  console.log("received message:", event.data);
}, false);

```



## 开发说明

```shell
> pnpm install  # 安装依赖
> pnpm prepare  # 设置 husky git hooks
> pnpm dev      # 使用 extension.js 框架开发
```






## 权限和安全声明

目前本插件**不会**上传任何数据到服务器，完全本地操作。

获取的数据会传送到机翻站页面，并通过机翻站自身接口上传到服务器。



**该插件请求以下权限**：

- `tabs`：用于创建后台网页，加载目标网站。

- `scripting`：用于在网页中注入脚本并执行代码。

- `storage`：暂未使用。

- `cookies`：获取目标网站的 `cookies`。

- `debugger`：用于在目标网站域内执行操作，绕过浏览器权限限制。
  
  - 相关 API 调用见 `utils/api.ts` 中 `tab_*` 系列函数。
  
    

**该插件会访问如下网站内容**：

- 机翻站
  - "\*://n.novelia.cc/\*",
  - "\*://\*.fishhawk.top/\*",
- 目标站
  - "\*://\*.syosetu.com/\*",
- 测试用
  - "\*://example.com/\*"

由于插件使用了 `debugger` 权限，可能会被浏览器标记为不安全插件。

如果您发现了本插件存在任何**安全问题**或者**远程执行漏洞**，请及时联系 AutoNovel 团队。
