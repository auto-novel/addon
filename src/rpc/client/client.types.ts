import type { WorkerId } from "@rpc/api";

type HttpRawParams = {
  url: string;
  requestInit?: RequestInit;
};
type HttpRawResult = string;

type HttpGetParams = {
  url: string;
  params?: Record<string, string>;
};
type HttpGetResult = string;

type HttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
  headers?: Record<string, string>;
};
type HttpPostJsonResult = string;

type TabSwitchToParams = {
  url: string;
};
type TabSwitchToResult = void;

type TabHttpGetParams = {
  url: string;
  params?: Record<string, string>;
};
type TabHttpGetResult = string;

type TabHttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
};
type TabHttpPostJsonResult = string;

type CookiesGetParams = {
  url: string;
};
type CookiesGetResult = chrome.cookies.Cookie[];

type DomQuerySelectorAllParams = {
  selector: string;
};
type DomQuerySelectorAllResult = string[];

type JobQuitParams = {
  status: "completed" | "failed" | "canceled" | "ignored";
  reason?: string;
};
type JobQuitResult = void;

type CtlQuitParams = {
  worker_id: WorkerId;
};
type CtrlQuitResult = void;

export type ClientMethods = {
  "http.raw"(params: HttpRawParams): Promise<HttpRawResult>;
  "http.get"(params: HttpGetParams): Promise<HttpGetResult>;
  "http.postJson"(params: HttpPostJsonParams): Promise<HttpPostJsonResult>;

  "tab.switchTo"(params: TabSwitchToParams): Promise<TabSwitchToResult>;
  "tab.http.get"(params: TabHttpGetParams): Promise<TabHttpGetResult>;
  "tab.http.postJson"(params: TabHttpPostJsonParams): Promise<TabHttpPostJsonResult>;
  "tab.dom.querySelectorAll"(params: DomQuerySelectorAllParams): Promise<DomQuerySelectorAllResult>;

  "cookies.get"(params: CookiesGetParams): Promise<CookiesGetResult>;

  "dom.querySelectorAll"(params: DomQuerySelectorAllParams): Promise<DomQuerySelectorAllResult>;

  "job.quit"(params: JobQuitParams): Promise<JobQuitResult>;

  // NOTE(kuriko): 基于同一个 ws 连接进行多路复用可能会更优雅一些，但是实现起来比较麻烦，
  //  暂时按照每个爬虫任务一条 ws 连接来做。
  // "ctl.quit"(params: CtlQuitParams): Promise<CtrlQuitResult>;
};
