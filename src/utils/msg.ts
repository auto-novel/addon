import type { ClientMethods } from "@rpc/client/client.types";

export enum MSG_TYPE {
  CRAWLER_REQ = "AUTO_NOVEL_CRAWLER_REQUEST",
  RESPONSE = "AUTO_NOVEL_CRAWLER_RESPONSE",
  PING = "AUTO_NOVEL_CRAWLER_PING"
}

export type MSG_PING = {
  type: MSG_TYPE.PING;
  payload: null;
};

export type MSG_CRAWLER = {
  type: MSG_TYPE.CRAWLER_REQ;
  payload: AutoNovelCrawlerCommand;
};

export type Message = MSG_PING | MSG_CRAWLER;

export type AutoNovelCrawlerCommand = {
  base_url: string;
  continue?: boolean; // is this a single execution?
  cmd: keyof ClientMethods;
  data?: any;
};
