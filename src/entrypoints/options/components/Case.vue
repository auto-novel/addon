<script setup lang="ts">
defineProps<{
  name: string;
  status: "executing" | "success" | "error" | null;
}>();

const emits = defineEmits<{
  run: [];
}>();
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium">{{ name }}</span>

    <div class="flex items-center gap-2">
      <div v-if="status === 'executing'" class="text-blue-600 text-xs">
        运行中...
      </div>
      <div v-else-if="status === 'success'" class="text-green-600 text-xs">
        成功
      </div>
      <div v-else-if="status === 'error'" class="text-red-600 text-xs">
        失败
      </div>
      <button
        @click="emits('run')"
        class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
      >
        执行测试
      </button>
    </div>
  </div>
</template>
