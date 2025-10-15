import * as Api from "@/utils/api";

export interface TestCase {
  name: string;
  status: "executing" | "success" | "error" | null;
  test: () => Promise<boolean>;
}

function httpFetchCase(url: string, content: string) {
  return {
    name: `http_fetch ${url}`,
    status: null,
    test: async () => {
      const resp = await Api.http_fetch(url, {});
      return resp.status === 200 && resp.body.includes(content);
    },
  } as TestCase;
}

function tabHttpFetchCase(tabUrl: string, url: string, content: string) {
  return {
    name: `tab_http_fetch ${url}`,
    status: null,
    test: async () => {
      const resp = await Api.tab_http_fetch({
        options: { tabUrl },
        input: url,
      });
      return resp.status === 200 && resp.body.includes(content);
    },
  } as TestCase;
}

async function runTestCase(testCase: TestCase) {
  if (testCase.status === "executing") return;
  testCase.status = "executing";
  await testCase
    .test()
    .then((result) => {
      testCase.status = result ? "success" : "error";
    })
    .catch(() => {
      testCase.status = "error";
    });
}

export const Test = {
  httpFetchCase,
  tabHttpFetchCase,
  runTestCase,
};
