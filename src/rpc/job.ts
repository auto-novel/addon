import type { Api } from "@utils/api";

export class CrawlerJob {
  url: string;
  api: Api;

  start_time: Date;

  constructor(url: string, api: Api) {
    this.url = url;
    this.api = api;

    this.start_time = new Date();
  }
}
