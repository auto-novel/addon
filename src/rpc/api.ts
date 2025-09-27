// import { WebSocket } from "ws";
import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient, type TypedJSONRPCServerAndClient } from "json-rpc-2.0";
import { WS_ADDRESS } from "@utils/consts";
import type { Api } from "@/utils/api";
import { ServerAbility } from "@rpc/server/api";
import { ClientAbility } from "@rpc/client/api";
import type { JobSubmitParams, JobSubmitResult, ServerMethods } from "@rpc/server/server.types";
import type { ClientMethods } from "@rpc/client/client.types";
import type { CrawlerJob, JobToken } from "./job";

export type RPCCSType = TypedJSONRPCServerAndClient<ClientMethods, ServerMethods>;
export type WorkerId = string;

/*
 * Description:
 *  connect to the server via websocket
 *  register as a new crawler endpoint
 *  send the job description to the server
 *  receive&perform instructions from server
 *
 *  设计上应该是复用 ws，管理多个爬虫任务，但是实现上比较复杂，目前还是一条 ws 对应一个 job
 */
export class ClientSideCrawler {
  // connect to the server
  ws: WebSocket;
  // interact with the extension apis
  api: Api;
  // rpc client and server
  rpc: RPCCSType;
  // server abilities
  server: ServerAbility;
  client: ClientAbility;

  worker_id: WorkerId | null = null;
  jobs: CrawlerJob[] = [];

  private connectionPromise: Promise<void>;

  constructor(api: Api) {
    this.api = api;
    this.ws = new WebSocket(WS_ADDRESS);

    this.connectionPromise = new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        console.debug("WebSocket connection established");
        resolve();
      };
      this.ws.onerror = (event) => {
        console.error("WebSocket error observed:", event);
        const error = new Error(`WebSocket error observed: ${event}`);
        this.rpc.rejectAllPendingRequests(error.message);
        reject(error);
      };
    });

    this.ws.onclose = (event) => {
      console.debug("WebSocket connection closed.");
      this.rpc.rejectAllPendingRequests(`WebSocket connection closed: ${event.reason}`);
    };

    this.ws.onmessage = (event) => {
      this.rpc.receiveAndSend(JSON.parse(event.data.toString()));
    };

    this.rpc = new JSONRPCServerAndClient(
      new JSONRPCServer(),
      new JSONRPCClient((request) => {
        try {
          this.ws.send(JSON.stringify(request));
          return Promise.resolve();
        } catch (error) {
          return Promise.reject(error);
        }
      })
    );
    this.client = new ClientAbility(this, this.rpc, this.api);
    this.server = new ServerAbility(this, this.rpc, this.api);
  }

  // data should be some data for authentication or identification
  public async connect(data?: object) {
    await this.connectionPromise;
    const { worker_id } = await this.server.endpoint_register(data);
    this.worker_id = worker_id;
  }

  private async ensureConnected() {
    if (!this.worker_id) {
      await this.connect();
    }
  }

  public async job_submit(url: string): Promise<JobSubmitResult> {
    await this.ensureConnected();
    return await this.server.job_submit(this.worker_id, url);
  }

  public async quit() {
    await this.rpc.rejectAllPendingRequests("Client is quitting");
    await this.api.close();
    await this.ws.close();
  }
}
