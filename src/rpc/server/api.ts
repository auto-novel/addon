import type { ClientSideCrawler, RPCCSType, WorkerId } from "@rpc/api";
import type { Api } from "@utils/api";
import type { EndpointRegisterResult, JobSubmitResult } from "./server.types";

export class ServerAbility {
  rpc: RPCCSType;
  api: Api;

  ctl: ClientSideCrawler;

  constructor(ctl: ClientSideCrawler, rpc: RPCCSType, api: Api) {
    this.ctl = ctl;
    this.api = api;
    this.rpc = rpc;
  }

  // Test connectivity
  public async echo(message: string = "Hello, World!"): Promise<string> {
    return await this.rpc.request("echo", { message });
  }

  // Register self as a new crawler endpoint
  public async endpoint_register(data?: object): Promise<EndpointRegisterResult> {
    const ret = await this.rpc.request("endpoint.register", data);
    return ret;
  }

  // public async endpoint_query(worker_id: WorkerId): Promise<job> {
  //     const queryResult = await this.rpc.request("endpoint.query", { worker_id });
  //     return queryResult;
  // }

  // Job management
  public async job_submit(worker_id: WorkerId, url: string): Promise<JobSubmitResult> {
    const ret = await this.rpc.request("job.submit", { worker_id, url });
    return ret;
  }

  // public async job_cancel(): Promise<JobCancelResult> {
  //     const ret = await this.rpc.request("job.cancel", { job_token });
  //     return ret;
  // }

  // public async job_query(job_token: JobToken): Promise<JobQueryResult> {
  //     const ret = await this.rpc.request("job.query", { job_token });
  //     return ret;
  // }
}
