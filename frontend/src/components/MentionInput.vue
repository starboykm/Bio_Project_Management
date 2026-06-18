<script setup lang="ts">
import { computed, ref } from 'vue';

type MentionOption = { id: string; name: string; label: string; email?: string };

const props = defineProps<{
  modelValue: string;
  options: MentionOption[];
  placeholder?: string;
  rows?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();

const showOptions = ref(false);
const query = ref('');

const filteredOptions = computed(() => {
  const keyword = query.value.toLowerCase();
  return props.options
    .filter((option) => option.label.toLowerCase().includes(keyword) || option.name.toLowerCase().includes(keyword) || option.email?.toLowerCase().includes(keyword))
    .slice(0, 8);
});

function update(value: string) {
  emit('update:modelValue', value);
  const match = value.match(/@([^\s@]*)$/);
  showOptions.value = Boolean(match);
  query.value = match?.[1] || '';
}

function insertMention(option: MentionOption) {
  const replacement = `${option.label} `;
  const next = props.modelValue.replace(/@([^\s@]*)$/, replacement);
  emit('update:modelValue', next);
  showOptions.value = false;
}
</script>

<template>
  <div class="mention-input">
    <el-input
      :model-value="modelValue"
      type="textarea"
      :rows="rows || 2"
      :placeholder="placeholder"
      @update:model-value="(value: string) => update(value)"
      @focus="showOptions = /@([^\s@]*)$/.test(modelValue)"
      @keydown.ctrl.enter.prevent="emit('submit')"
    />
    <div v-if="showOptions && filteredOptions.length" class="mention-menu">
      <button v-for="option in filteredOptions" :key="option.id" type="button" @click="insertMention(option)">
        <strong>{{ option.label }}</strong>
        <span v-if="option.email">{{ option.email }}</span>
      </button>
    </div>
  </div>
</template>
