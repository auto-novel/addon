<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  name: string;
  status: "executing" | "success" | "error" | null;
}>();

const emits = defineEmits<{
  run: [];
}>();

const label = computed(() => {
  if (props.status === "executing")
    return { color: "text-blue-600", label: "RUNNING..." };
  if (props.status === "success")
    return { color: "text-green-600", label: "PASS" };
  if (props.status === "error") return { color: "text-red-600", label: "FAIL" };
  return { color: "text-gray-500", label: "PENDING" };
});
</script>

<template>
  <div class="flex items-center">
    <div :class="['w-24', 'text-xs', label.color]">
      {{ label.label }}
    </div>
    <span class="text-sm font-medium">{{ name }}</span>
    <div class="flex-1"></div>
    <button
      class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
      :disabled="status === 'executing'"
      @click="emits('run')"
    >
      测试
    </button>
  </div>
</template>
