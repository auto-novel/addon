<script setup lang="ts">
import { roundClass } from './util';

interface Props {
  text: string;
  type?: 'button' | 'submit' | 'reset';
  round?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  round: 'full',
  loading: false,
});

const buttonClass = computed(() => [
  'h-12 w-full cursor-pointer border-0 ease-in-out outline-none',
  'text-base font-medium text-on-primary transition-all duration-200',
  'bg-primary hover:bg-primary-hover active:bg-primary-pressed',
  'disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500',
  { loading: props.loading },
  roundClass(props.round),
]);
</script>

<template>
  <button v-bind="$attrs" :type="props.type" :class="buttonClass">
    {{ props.text }}
  </button>
</template>
