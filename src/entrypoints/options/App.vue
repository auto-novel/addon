<script lang="ts" setup>
import * as Api from "@/utils/api";

import Button from "./components/Button.vue";
import Input from "./components/Input.vue";

const urlHttpFetch = ref("https://www.amazon.co.jp/dp/4098505789");
const resultHttpFetch = ref("");

async function testHttpFetch() {
  resultHttpFetch.value = "Loading...";
  try {
    const resp = await Api.http_fetch(
      "https://www.amazon.co.jp/dp/4098505789",
      {},
    );
    resultHttpFetch.value = JSON.stringify(resp, null, 2);
    debugPrint("http_fetch: ", resp);
  } catch (e) {
    resultHttpFetch.value = JSON.stringify(e);
    debugPrint.error("Error in browser action: ", e);
  }
  return;
}
</script>

<template>
    <div class="m-auto max-w-160 flex flex-col gap-4 mt-24">
      <div class="flex">
        <Input round="left" placeholder="请输入URL" v-model="urlHttpFetch" />
        <Button
          text="确认"
          round="right"
          class="flex-1/2"
          @click="testHttpFetch"
        />
      </div>
      <div>{{ resultHttpFetch }}</div>
    </div>
</template>
