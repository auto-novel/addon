import type { ClientMethods } from "@rpc/client/client.types";
import type { JobSubmitResult, ServerMethods } from "@rpc/server/server.types";
import { JSONRPCClient, JSONRPCServer, JSONRPCServerAndClient, type TypedJSONRPCServerAndClient } from "json-rpc-2.0";
import { WebSocketServer } from "ws";

const wsServer = new WebSocketServer({ port: 37000 });

wsServer.on("connection", (ws: WebSocket) => {
  console.log("New Client Connected");
  // Server and Client is reversed here
  const rpc: TypedJSONRPCServerAndClient<ServerMethods, ClientMethods> = new JSONRPCServerAndClient(
    new JSONRPCServer(),
    new JSONRPCClient((request) => {
      try {
        ws.send(JSON.stringify(request));
        return Promise.resolve();
      } catch (error) {
        return Promise.reject(error);
      }
    })
  );
  rpc.addMethod("echo", ({ message }: { message: string }) => {
    return `Echo: ${message}`;
  });

  rpc.addMethod("endpoint.register", (params?: object) => {
    return { worker_id: "1" }; // sim worker_id
  });

  const jobs = new Map<string, Promise<any>>();

  rpc.addMethod("job.submit", async ({ worker_id, url }) => {
    const job_token = "114514";

    const worker = async () => {
      await rpc.request("tab.switchTo", {
        url: "https://ncode.syosetu.com/n9669bk"
      });
      {
        const html = await rpc.request("dom.querySelectorAll", {
          selector: "body"
        });
        console.log(html);
      }
      {
        await rpc.request("tab.http.get", {
          url: "https://ncode.syosetu.com/n9669bk/1"
        });
        const html = await rpc.request("dom.querySelectorAll", {
          selector: "body"
        });
        console.log(html);
      }

      await rpc.request("job.quit", { status: "completed" });

      jobs.delete(job_token);
    };

    jobs.set(job_token, worker());
    return { success: true };
  });

  ws.onmessage = (message) => {
    try {
      console.log(`received: ${message.data.toString()}`);
      const payload = JSON.parse(message.data);
      rpc.receiveAndSend(payload);
    } catch (error) {
      console.error("Failed to process message:", error);
    }
  };

  ws.onclose = () => {
    console.log("Client Disconnected");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
});
