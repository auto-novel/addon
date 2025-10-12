<script lang="ts" setup>
import { ref } from "vue";

import Case from "./components/Case.vue";
import Divider from "./components/Divider.vue";
import type { TestCase } from "./test";
import { Test } from "./test";

const cases = ref<TestCase[]>([
  Test.httpFetchCase(
    "https://www.amazon.co.jp/dp/4098505789",
    "異世界転生して魔女になったの",
  ),
  Test.tabHttpFetchCase(
    "https://www.amazon.co.jp/",
    "https://www.amazon.co.jp/dp/4098505789",
    "異世界転生して魔女になったの",
  ),
]);

async function runAllTestCases() {
  // for (const c of cases.value) {
  //   await Test.runTestCase(c);
  // }
  await Promise.all(
    cases.value.map((c: any) => {
      return Test.runTestCase(c);
    }),
  );
}
</script>

<template>
  <div class="m-auto max-w-160 flex flex-col my-12">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900 my-4">测试用例</h1>
      <button
        class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        @click="runAllTestCases"
      >
        运行所有测试
      </button>
    </div>
    <Divider />
    <template v-for="c in cases" :key="c.name">
      <Case :name="c.name" :status="c.status" @run="Test.runTestCase(c)" />
      <Divider />
    </template>
  </div>
</template>
