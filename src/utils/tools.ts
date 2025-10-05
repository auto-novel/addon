import { deserializeRequest, type SerializableRequest, type SerializableResponse } from "@rpc/client/client.types";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function WaitOrTimeout<T>(task: Promise<T>, timeout: number): Promise<T> {
  const ctl = new AbortController();
  let ret: T | null = null;
  return await Promise.race([
    (async () => {
      ret = await task;
      ctl.abort();
      return ret;
    })(),
    sleep(timeout).then(() => {
      if (ctl.signal.aborted) {
        return ret as T;
      }
      return Promise.reject("Timeout");
    })
  ]);
}

export async function pack_response(response: Response): Promise<SerializableResponse> {
  const headers: [string, string][] = [];
  for (const [key, value] of response.headers.entries()) {
    headers.push([key, value]);
  }

  const bodyText = await response.text();

  const serializableResponse = {
    body: bodyText,
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers,
    redirected: response.redirected,
    url: response.url,
    type: response.type
  };
  return serializableResponse;
}

export function SerReq2RequestInfo(input: SerializableRequest | string) {
  let final_input: RequestInfo;
  switch (typeof input) {
    case "string": {
      final_input = input;
      break;
    }
    case "object": {
      final_input = deserializeRequest(input as SerializableRequest);
      break;
    }
    default:
      throw new Error("Invalid input type for http.raw");
  }
  return final_input;
}

export async function ChromeRemoteExecution<T, A extends any[]>({
  target,
  func,
  args
}: {
  target: chrome.scripting.InjectionTarget;
  func: (...args: A) => T | Promise<T>;
  args: A;
}): Promise<T> {
  const results = await chrome.scripting.executeScript({
    target,
    func,
    args
  });

  if (results && results[0] && results[0].result) {
    return results[0].result as T;
  } else {
    throw new Error("Failed to execute script in tab.");
  }
}
