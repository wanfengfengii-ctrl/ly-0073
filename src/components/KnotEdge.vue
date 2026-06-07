<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@vue-flow/core'
import type { KnotEdgeData, RiskLevel } from '@/types/knot'
import { MATERIALS, RISK_COLORS, RISK_LABELS } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'

const props = defineProps<EdgeProps<KnotEdgeData>>()

const store = useKnotStore()

const isSelected = computed(() => store.selectedEdgeId === props.id)

const isDangling = computed(() => {
  return store.danglingEdges.some((e) => e.id === props.id)
})

const riskLevel = computed<RiskLevel>(() => {
  return store.getEdgeRiskLevel(props.id)
})

const loadRatio = computed(() => {
  return store.getEdgeLoadRatio(props.id)
})

const materialColor = computed(() => {
  if (!props.data) return '#94a3b8'
  const mat = MATERIALS.find((m) => m.key === props.data?.material)
  return mat?.color || '#94a3b8'
})

const stroke = computed(() => {
  if (isDangling.value) return '#f59e0b'
  return RISK_COLORS[riskLevel.value]
})

const strokeWidth = computed(() => {
  const base = isSelected.value ? 3 : 2
  const extra = Math.min(3, loadRatio.value * 3)
  return base + extra
})

const classList = computed(() => {
  const list: string[] = []
  if (riskLevel.value === 'critical') list.push('risk-critical')
  if (riskLevel.value === 'danger') list.push('risk-danger')
  if (riskLevel.value === 'warning') list.push('risk-warning')
  if (isDangling.value) list.push('dangling')
  if (isSelected.value) list.push('selected-edge')
  return list.join(' ')
})

const simulatedLoad = computed(() => {
  const fr = store.forceResults.get(props.id)
  return fr?.calculatedLoad ?? 0
})

const labelText = computed(() => {
  if (!props.data) return ''
  const mat = MATERIALS.find((m) => m.key === props.data?.material)
  const displayLoad = simulatedLoad.value > 0 ? simulatedLoad.value.toFixed(1) : props.data.currentLoad
  return `${mat?.label || props.data.material} ${props.data.length}m | ${displayLoad}/${props.data.maxLoad}N`
})

const riskIndicator = computed(() => {
  if (riskLevel.value === 'safe') return ''
  return RISK_LABELS[riskLevel.value]
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
    :style="{
      stroke,
      strokeWidth,
      filter: riskLevel === 'critical' ? 'drop-shadow(0 0 4px rgba(220,38,38,0.6))' : riskLevel === 'danger' ? 'drop-shadow(0 0 3px rgba(239,68,68,0.4))' : 'none',
    }"
    marker-end=""
  />
  <EdgeLabelRenderer>
    <div
      class="knot-edge-label nodrag nopan cursor-pointer select-none"
      @click.stop="store.selectEdge(props.id)"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        border: isSelected ? '2px solid #2563eb' : '1px solid rgba(148,163,184,0.3)',
        background: riskLevel === 'critical'
          ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
          : riskLevel === 'danger'
            ? 'linear-gradient(135deg, #fff1f2, #ffe4e6)'
            : riskLevel === 'warning'
              ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
              : 'rgba(255,255,255,0.95)',
      }"
    >
      <div class="flex items-center gap-1">
        <span
          v-if="riskIndicator"
          class="text-[9px] px-1 py-0.5 rounded font-bold leading-none"
          :style="{
            background: RISK_COLORS[riskLevel],
            color: 'white',
          }"
        >
          {{ riskIndicator }}
        </span>
        <span class="text-[10px] leading-tight">{{ labelText }}</span>
      </div>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.risk-critical {
  animation: pulse-critical 1.2s ease-in-out infinite;
}

.risk-danger {
  animation: pulse-danger 2s ease-in-out infinite;
}

@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.knot-edge-label {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  backdrop-filter: blur(4px);
}

.selected-edge .knot-edge-label {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
</style>
