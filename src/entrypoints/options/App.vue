<script lang="ts" setup>
import { onMounted, ref } from "vue";

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

onMounted(async () => {
  for (const c of cases.value) {
    await Test.runTestCase(c);
  }
});
</script>

<template>
  <div class="m-auto max-w-160 flex flex-col my-12">
    <h1 class="text-3xl font-bold text-gray-900 my-12">测试用例</h1>
    <Divider />
    <template v-for="c in cases" :key="c.name">
      <Case :name="c.name" :status="c.status" @run="Test.runTestCase(c)" />
      <Divider />
    </template>
  </div>
</template>
