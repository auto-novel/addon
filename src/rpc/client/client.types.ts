export type SerializableResponse = {
  body: string;
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  redirected: boolean;
  url: string;
  type: ResponseType;
};

export type HttpRawParams = {
  url: string;
  requestInit?: RequestInit;
};
export type HttpRawResult = SerializableResponse;

export type HttpGetParams = {
  url: string;
  params?: Record<string, string>;
};
export type HttpGetResult = SerializableResponse;

export type HttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
  headers?: Record<string, string>;
};
export type HttpPostJsonResult = SerializableResponse;

export type TabSwitchToParams = {
  url: string;
};
export type TabSwitchToResult = void;

export type TabHttpGetParams = {
  url: string;
  params?: Record<string, string>;
};
export type TabHttpGetResult = SerializableResponse;

export type TabHttpPostJsonParams = {
  url: string;
  data?: Record<string, string>;
  headers?: Record<string, string>;
};
export type TabHttpPostJsonResult = SerializableResponse;

export type CookiesGetParams = {
  url: string;
};
export type CookiesGetResult = chrome.cookies.Cookie[];

export type DomQuerySelectorAllParams = {
  selector: string;
};
export type DomQuerySelectorAllResult = string[];

export type JobQuitParams = {
  status: "completed" | "failed" | "canceled" | "ignored";
  reason?: string;
};
export type JobQuitResult = void;

// export type CtlQuitParams = {
//   worker_id: WorkerId;
// };
// export type CtrlQuitResult = void;

export type ClientMethods = {
  "base.ping"(): Promise<string>;

  "http.raw"(params: HttpRawParams): Promise<HttpRawResult>;
  "http.get"(params: HttpGetParams): Promise<HttpGetResult>;
  "http.postJson"(params: HttpPostJsonParams): Promise<HttpPostJsonResult>;

  "tab.switchTo"(params: TabSwitchToParams): Promise<TabSwitchToResult>;
  "tab.http.get"(params: TabHttpGetParams): Promise<TabHttpGetResult>;
  "tab.http.postJson"(params: TabHttpPostJsonParams): Promise<TabHttpPostJsonResult>;
  "tab.dom.querySelectorAll"(params: DomQuerySelectorAllParams): Promise<DomQuerySelectorAllResult>;

  "cookies.get"(params: CookiesGetParams): Promise<CookiesGetResult>;

  "dom.querySelectorAll"(params: DomQuerySelectorAllParams): Promise<DomQuerySelectorAllResult>;

  "job.new"(params: void): Promise<void>;
  "job.quit"(params: JobQuitParams): Promise<JobQuitResult>;

  // NOTE(kuriko): 基于同一个 ws 连接进行多路复用可能会更优雅一些，但是实现起来比较麻烦，
  //  暂时按照每个爬虫任务一条 ws 连接来做。
  // "ctl.quit"(params: CtlQuitParams): Promise<CtrlQuitResult>;
};
