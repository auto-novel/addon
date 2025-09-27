import type { WorkerId } from "@rpc/api";
// import type { JobToken } from "@rpc/job";

export type EchoParams = {
  message: string;
};
export type EchoResult = string;

export type EndpointRegisterParams = object;
export type EndpointRegisterResult = { worker_id: WorkerId };

// export type EndpointQueryParams = { worker_id: WorkerId };
// export type EndpointQueryResult = {
//   job_tokens: JobToken[];
// }

export type JobSubmitParams = {
  worker_id: WorkerId;
  url: string;
};
export type JobSubmitResult = { success: boolean; message?: string };

// export type JobCancelParams = {
//     job_token: JobToken;
// };
// export type JobCancelResult = { success: boolean; message?: string };

export type JobQueryParams = {
  job_token: string;
};
export type JobQueryResult = {
  status: "pending" | "in-progress" | "completed" | "failed" | "canceled";
  result?: any;
  error?: string;
};

export type ServerMethods = {
  "echo"(params: EchoParams): EchoResult;

  // register as a new crawler endpoint
  "endpoint.register"(params?: EndpointRegisterParams): EndpointRegisterResult;
  // "endpoint.query"(params: EndpointQueryParams): EndpointQueryResult;

  "job.submit"(params: JobSubmitParams): JobSubmitResult;
  // "job.cancel"(params: JobCancelParams): JobCancelResult;
  // "job.query"(params: JobQueryParams): JobQueryResult;
};
