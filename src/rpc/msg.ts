import type { ClientMethods } from "@rpc/types";

export enum MsgType {
  CrawlerReq = "AUTO_NOVEL_CRAWLER_REQUEST",
  Response = "AUTO_NOVEL_CRAWLER_RESPONSE",
  Ping = "AUTO_NOVEL_CRAWLER_PING",
}

interface BaseMessage {
  type: MsgType;
  id?: string;
}

export interface MsgPing extends BaseMessage {
  type: MsgType.Ping;
}

export interface MsgCrawler extends BaseMessage {
  type: MsgType.CrawlerReq;
  payload: CrawlerCommand;
}

export interface MsgResponse extends BaseMessage {
  type: MsgType.Response;
  payload: ResponsePayload;
}

export type ResponsePayload = {
  success: boolean;
  result?: any;
  error?: string;
};

export type Message = MsgPing | MsgCrawler | MsgResponse;

export type CrawlerCommand = {
  cmd: keyof ClientMethods;
  params?: any;
};
