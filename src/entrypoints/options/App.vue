<script lang="ts" setup>
import { ref, onMounted } from "vue";

import * as Api from "@/utils/api";
import Case from "./components/Case.vue";
import Divider from "./components/Divider.vue";

interface TestCase {
  name: string;
  status: "executing" | "success" | "error" | null;
  test: () => Promise<boolean>;
}

function newHttpFetchCase(url: string, content: string) {
  return {
    name: `http_fetch ${url}`,
    status: null,
    test: async () => {
      const resp = await Api.http_fetch(url, {});
      return resp.status === 200 && resp.body.includes(content);
    },
  } as TestCase;
}

const cases = ref<TestCase[]>([
  newHttpFetchCase(
    "https://www.amazon.co.jp/dp/4098505789",
    "異世界転生して魔女になったの",
  ),
  newHttpFetchCase(
    "https://www.amazon.co.jp/dp/4098505789",
    "異世界転生して魔女になったの",
  ),
]);

async function runTestCase(testCase: TestCase) {
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

onMounted(async () => {
  for (const c of cases.value) {
    await runTestCase(c);
  }
});
</script>

<template>
  <div class="m-auto max-w-160 flex flex-col my-12">
    <h1 class="text-3xl font-bold text-gray-900 my-12">测试用例</h1>
    <Divider />
    <template v-for="c in cases" :key="c.name">
      <Case :name="c.name" :status="c.status" @run="runTestCase(c)" />
      <Divider />
    </template>
  </div>
</template>
