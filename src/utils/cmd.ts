enum Command {
  GET,
  POST,
  QUERY_SELECTOR
}

type WSPacket = {
  cmd: Command;
  data: object;
};

enum RpcErrorCode {
  Success = 0,
  Failed = 1,
  Timeout,
  InvalidCommand,
  InvalidData
}

type RpcError = {
  code: RpcErrorCode;
  reason: string | null;
};

/*
 *  Get: client side perform a GET request
 */
type GetCmdData = {
  url: string;
  params: Record<string, string>;
  cookies: boolean;
};

type GetResult = {
  error: RpcError;
  data: string | null;
};

/*
 *  Post: client side perform a POST request
 */
type PostCmdData = {
  url: string;
  params: Record<string, string>;
  cookies: boolean;
};

type PostResult = {
  error: RpcError;
  data: string | null;
};

/*
 *  QuerySelectorAll: perform querySelector on the current page
 */
type QuerySelectorAllCmdData = {
  url: string;
  params: Record<string, string>;
  cookies: boolean;
};

type QuerySelectorAllResult = {
  error: RpcError;
  data: Array<string> | null;
};

/*
 *  Click: perform querySelector on the current page
 */
type ClickCmdData = {
  selector: string; // css selector
};

type ClickResult = {
  error: RpcError;
};
