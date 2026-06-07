<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@vue-flow/core'
import type { KnotEdgeData } from '@/types/knot'
import { MATERIALS } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'

const props = defineProps<EdgeProps<KnotEdgeData>>()

const store = useKnotStore()

const isSelected = computed(() => store.selectedEdgeId === props.id)

const isOverloaded = computed(() => {
  if (!props.data) return false
  return props.data.currentLoad > props.data.maxLoad
})

const isDangling = computed(() => {
  return store.danglingEdges.some((e) => e.id === props.id)
})

const materialColor = computed(() => {
  if (!props.data) return '#94a3b8'
  const mat = MATERIALS.find((m) => m.key === props.data?.material)
  return mat?.color || '#94a3b8'
})

const stroke = computed(() => {
  if (isOverloaded.value) return '#dc2626'
  if (isDangling.value) return '#f59e0b'
  return materialColor.value
})

const strokeWidth = computed(() => {
  if (isOverloaded.value) return 4
  if (isSelected.value) return 3
  return 2
})

const classList = computed(() => {
  const list: string[] = []
  if (isOverloaded.value) list.push('overloaded')
  if (isDangling.value) list.push('dangling')
  return list.join(' ')
})

const labelText = computed(() => {
  if (!props.data) return ''
  const mat = MATERIALS.find((m) => m.key === props.data?.material)
  return `${mat?.label || props.data.material} ${props.data.length}m | ${props.data.currentLoad}/${props.data.maxLoad}N`
})

const [edgePath, labelX, labelY] = getBezierPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
})
</script>

<template>
  <BaseEdge
    :path="edgePath"
    :class="classList"
    :style="{ stroke, strokeWidth }"
    marker-end=""
  />
  <EdgeLabelRenderer>
    <div
      class="knot-edge-label nodrag nopan cursor-pointer"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        border: isSelected ? '2px solid #2563eb' : 'none',
      }"
    >
      {{ labelText }}
    </div>
  </EdgeLabelRenderer>
</template>
