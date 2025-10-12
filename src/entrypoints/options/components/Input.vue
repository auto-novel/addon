<script setup lang="ts">
import { roundClass } from "./util";

interface Props {
  type?: string;
  placeholder?: string;
  round?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "text",
  placeholder: "",
  round: "full",
  class: "",
});
const model = defineModel<string>();

const inputClass = computed(() => [
  "box-border h-12 w-full pl-4 pr-4 outline-none",
  "text-base text-on-surface placeholder:text-outline",
  "border border-outline focus:border-primary invalid:border-error invalid:focus:border-error",
  roundClass(props.round),
  props.class,
]);
</script>

<template>
  <input
    v-model="model"
    :type="props.type"
    :placeholder="props.placeholder"
    autocomplete="off"
    :class="inputClass"
  />
</template>
