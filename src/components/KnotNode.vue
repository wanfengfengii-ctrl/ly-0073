<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { KnotNodeData } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'

const props = defineProps<{
  id: string
  data: KnotNodeData
  selected?: boolean
}>()

const store = useKnotStore()

const isSelected = computed(() => store.selectedNodeId === props.id)

const nodeClass = computed(() => {
  return [
    'knot-node',
    props.data.nodeType,
    isSelected.value ? 'selected' : '',
  ].join(' ')
})

const typeLabel = computed(() => {
  switch (props.data.nodeType) {
    case 'junction':
      return '连接点'
    case 'fixed':
      return '固定点'
    case 'load':
      return '受力点'
    default:
      return ''
  }
})
</script>

<template>
  <div :class="nodeClass" :title="typeLabel">
    <Handle type="target" :position="Position.Top" style="opacity: 0" />
    <div class="flex flex-col items-center">
      <span class="text-sm font-bold">{{ data.label }}</span>
      <span class="text-[10px] opacity-70">{{ typeLabel }}</span>
    </div>
    <Handle type="source" :position="Position.Bottom" style="opacity: 0" />
  </div>
</template>
