<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useTutorialStore } from '@/stores/tutorial'
import { MATERIALS, RISK_COLORS } from '@/types/knot'
import type { TutorialStepNode, TutorialStepEdge } from '@/types/tutorial'

const store = useTutorialStore()

const svgRef = ref<SVGSVGElement | null>(null)
const viewport = ref({ x: 0, y: 0, zoom: 1 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0, vx: 0, vy: 0 })

const currentStep = computed(() => store.currentStep)
const nodes = computed(() => currentStep.value?.nodes || [])
const edges = computed(() => currentStep.value?.edges || [])
const highlightedNodeIds = computed(() => new Set(currentStep.value?.highlightedNodeIds || []))
const highlightedEdgeIds = computed(() => new Set(currentStep.value?.highlightedEdgeIds || []))
const annotations = computed(() => currentStep.value?.annotations || [])
const showAnnotations = computed(() => store.showAnnotations)
const showForces = computed(() => store.showForces)

const nodeMap = computed(() => {
  const m = new Map<string, TutorialStepNode>()
  nodes.value.forEach((n) => m.set(n.id, n))
  return m
})

function getNodeColor(nodeType: string): string {
  switch (nodeType) {
    case 'fixed':
      return '#2563eb'
    case 'load':
      return '#dc2626'
    case 'junction':
    default:
      return '#6366f1'
  }
}

function getNodeIcon(nodeType: string): string {
  switch (nodeType) {
    case 'junction':
      return '◉'
    case 'fixed':
      return '▣'
    case 'load':
      return '▲'
    default:
      return '●'
  }
}

function getNodeTypeLabel(nodeType: string): string {
  switch (nodeType) {
    case 'junction':
      return '连接点'
    case 'fixed':
      return '固定点'
    case 'load':
      return '受力点'
    default:
      return '节点'
  }
}

function getMaterialColor(edge: TutorialStepEdge): string {
  const mat = MATERIALS.find((m) => m.key === edge.data.material)
  return mat?.color || '#94a3b8'
}

function getEdgeRiskColor(edge: TutorialStepEdge): string {
  if (!edge.data.maxLoad) return RISK_COLORS.safe
  const ratio = edge.data.currentLoad / edge.data.maxLoad
  if (ratio >= 1.0) return RISK_COLORS.critical
  if (ratio >= 0.85) return RISK_COLORS.danger
  if (ratio >= 0.6) return RISK_COLORS.warning
  return RISK_COLORS.safe
}

function getEdgeWidth(edge: TutorialStepEdge, highlighted: boolean): number {
  const base = highlighted ? 4 : 2.5
  if (!edge.data.maxLoad) return base
  const ratio = edge.data.currentLoad / edge.data.maxLoad
  return base + Math.min(3, ratio * 2.5)
}

function getAnnotationPosition(ann: { targetType: string; targetId: string; position?: { x: number; y: number } }) {
  if (ann.position) return ann.position
  const node = nodeMap.value.get(ann.targetId)
  if (node) {
    return { x: node.position.x + 40, y: node.position.y - 35 }
  }
  const edge = edges.value.find((e) => e.id === ann.targetId)
  if (edge) {
    const src = nodeMap.value.get(edge.source)
    const tgt = nodeMap.value.get(edge.target)
    if (src && tgt) {
      return {
        x: (src.position.x + tgt.position.x) / 2 + 20,
        y: (src.position.y + tgt.position.y) / 2 - 25,
      }
    }
  }
  return { x: 200, y: 100 }
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isPanning.value = true
  panStart.value = {
    x: e.clientX,
    y: e.clientY,
    vx: viewport.value.x,
    vy: viewport.value.y,
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!isPanning.value) return
  const dx = (e.clientX - panStart.value.x) / viewport.value.zoom
  const dy = (e.clientY - panStart.value.y) / viewport.value.zoom
  viewport.value.x = panStart.value.vx + dx
  viewport.value.y = panStart.value.vy + dy
}

function handleMouseUp() {
  isPanning.value = false
}

function handleWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  viewport.value.zoom = Math.max(0.3, Math.min(2.5, viewport.value.zoom * delta))
}

function fitView() {
  if (nodes.value.length === 0) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.value.forEach((n) => {
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x)
    maxY = Math.max(maxY, n.position.y)
  })
  const padding = 80
  const svg = svgRef.value
  if (!svg) return
  const w = svg.clientWidth
  const h = svg.clientHeight
  const contentW = maxX - minX + padding * 2
  const contentH = maxY - minY + padding * 2
  const zoom = Math.min(w / contentW, h / contentH, 1.2)
  viewport.value.zoom = zoom
  viewport.value.x = w / 2 - ((minX + maxX) / 2) * zoom
  viewport.value.y = h / 2 - ((minY + maxY) / 2) * zoom
}

function edgePath(source: TutorialStepNode, target: TutorialStepNode): string {
  const sx = source.position.x
  const sy = source.position.y
  const tx = target.position.x
  const ty = target.position.y
  const mx = (sx + tx) / 2
  const my = (sy + ty) / 2
  const dx = tx - sx
  const dy = ty - sy
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const offset = Math.min(dist * 0.15, 30)
  const cx = mx - (dy / dist) * offset
  const cy = my + (dx / dist) * offset
  return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`
}

watch(
  () => store.currentStepIndex,
  () => {
    nextTick(() => fitView())
  },
)

onMounted(() => {
  nextTick(() => fitView())
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  isPanning.value = false
})
</script>

<template>
  <div class="relative w-full h-full bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
    <svg
      ref="svgRef"
      class="w-full h-full cursor-grab active:cursor-grabbing"
      @mousedown="handleMouseDown"
      @wheel="handleWheel"
    >
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" stroke-width="0.5" />
        </pattern>
        <filter id="glow-highlight" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="shadow-node" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.15" />
        </filter>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
        </marker>
      </defs>

      <g :transform="`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`">
        <rect x="-2000" y="-2000" width="4000" height="4000" fill="url(#grid)" />

        <g class="edges-layer">
          <g v-for="edge in edges" :key="edge.id">
            <path
              v-if="nodeMap.get(edge.source) && nodeMap.get(edge.target)"
              :d="edgePath(nodeMap.get(edge.source)!, nodeMap.get(edge.target)!)"
              :stroke="highlightedEdgeIds.has(edge.id) ? '#f59e0b' : getEdgeRiskColor(edge)"
              :stroke-width="getEdgeWidth(edge, highlightedEdgeIds.has(edge.id))"
              fill="none"
              stroke-linecap="round"
              :class="{ 'animate-pulse': highlightedEdgeIds.has(edge.id), 'edge-animated': edge.animated }"
              :filter="highlightedEdgeIds.has(edge.id) ? 'url(#glow-highlight)' : 'none'"
              :stroke-dasharray="edge.animated ? '8 4' : 'none'"
            >
              <animate
                v-if="edge.animated"
                attributeName="stroke-dashoffset"
                from="24"
                to="0"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </path>

            <g v-if="nodeMap.get(edge.source) && nodeMap.get(edge.target) && showForces">
              <rect
                :x="(nodeMap.get(edge.source)!.position.x + nodeMap.get(edge.target)!.position.x) / 2 - 70"
                :y="(nodeMap.get(edge.source)!.position.y + nodeMap.get(edge.target)!.position.y) / 2 - 12"
                width="140"
                height="24"
                rx="6"
                fill="white"
                :stroke="highlightedEdgeIds.has(edge.id) ? '#f59e0b' : '#cbd5e1'"
                stroke-width="1.5"
                opacity="0.95"
              />
              <text
                :x="(nodeMap.get(edge.source)!.position.x + nodeMap.get(edge.target)!.position.x) / 2"
                :y="(nodeMap.get(edge.source)!.position.y + nodeMap.get(edge.target)!.position.y) / 2 + 4"
                text-anchor="middle"
                font-size="11"
                fill="#334155"
                font-weight="600"
              >
                {{ edge.data.currentLoad }}N / {{ edge.data.maxLoad }}N
              </text>
            </g>
          </g>
        </g>

        <g class="nodes-layer">
          <g v-for="node in nodes" :key="node.id">
            <circle
              :cx="node.position.x"
              :cy="node.position.y"
              r="32"
              fill="white"
              :stroke="highlightedNodeIds.has(node.id) ? '#f59e0b' : getNodeColor(node.data.nodeType)"
              :stroke-width="highlightedNodeIds.has(node.id) ? 4 : 2.5"
              :filter="highlightedNodeIds.has(node.id) ? 'url(#glow-highlight)' : 'url(#shadow-node)'"
              :class="{ 'node-highlight': highlightedNodeIds.has(node.id) }"
            />
            <circle
              :cx="node.position.x"
              :cy="node.position.y"
              r="26"
              :fill="highlightedNodeIds.has(node.id) ? '#fef3c7' : `${getNodeColor(node.data.nodeType)}10`"
            />
            <text
              :x="node.position.x"
              :y="node.position.y - 2"
              text-anchor="middle"
              font-size="14"
              :fill="getNodeColor(node.data.nodeType)"
              font-weight="700"
            >
              {{ getNodeIcon(node.data.nodeType) }}
            </text>
            <text
              :x="node.position.x"
              :y="node.position.y + 14"
              text-anchor="middle"
              font-size="12"
              fill="#1e293b"
              font-weight="700"
            >
              {{ node.data.label }}
            </text>
          </g>
        </g>

        <g v-if="showAnnotations" class="annotations-layer">
          <g v-for="ann in annotations" :key="ann.id">
            <g>
              <rect
                :x="getAnnotationPosition(ann).x - 80"
                :y="getAnnotationPosition(ann).y - 18"
                width="160"
                height="36"
                rx="8"
                fill="#fffbeb"
                stroke="#f59e0b"
                stroke-width="1.5"
                filter="url(#shadow-node)"
              />
              <path
                :d="`M ${getAnnotationPosition(ann).x - 8} ${getAnnotationPosition(ann).y + 18} L ${getAnnotationPosition(ann).x} ${getAnnotationPosition(ann).y + 28} L ${getAnnotationPosition(ann).x + 8} ${getAnnotationPosition(ann).y + 18}`"
                fill="#fffbeb"
                stroke="#f59e0b"
                stroke-width="1.5"
              />
              <text
                :x="getAnnotationPosition(ann).x"
                :y="getAnnotationPosition(ann).y + 5"
                text-anchor="middle"
                font-size="11"
                fill="#92400e"
                font-weight="600"
              >
                {{ ann.text }}
              </text>
            </g>
          </g>
        </g>
      </g>
    </svg>

    <div class="absolute top-3 right-3 flex flex-col gap-2">
      <button
        @click="viewport.zoom = Math.min(2.5, viewport.zoom * 1.2)"
        class="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        title="放大"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        @click="viewport.zoom = Math.max(0.3, viewport.zoom * 0.83)"
        class="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        title="缩小"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        @click="fitView"
        class="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        title="适应视图"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
      </button>
      <button
        @click="store.toggleForces"
        class="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center transition-colors"
        :class="showForces ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-gray-600 hover:bg-gray-50'"
        title="显示受力"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2v4" />
          <path d="M12 18v4" />
          <path d="m4.93 4.93 2.83 2.83" />
          <path d="m16.24 16.24 2.83 2.83" />
          <path d="M2 12h4" />
          <path d="M18 12h4" />
          <path d="m4.93 19.07 2.83-2.83" />
          <path d="m16.24 7.76 2.83-2.83" />
        </svg>
      </button>
      <button
        @click="store.toggleAnnotations"
        class="w-9 h-9 bg-white rounded-lg shadow border border-gray-200 flex items-center justify-center transition-colors"
        :class="showAnnotations ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-600 hover:bg-gray-50'"
        title="显示标注"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>

    <div class="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-lg px-3.5 py-2.5 text-xs text-gray-600 shadow-sm border border-gray-200 max-w-[260px]">
      <div class="font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        图例说明
      </div>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border-2" style="border-color:#2563eb"></span>
          <span>固定点</span>
          <span class="w-3 h-3 rounded-full border-2 ml-2" style="border-color:#6366f1"></span>
          <span>连接点</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border-2" style="border-color:#dc2626"></span>
          <span>受力点</span>
          <span class="w-3 h-3 rounded-full border-2 ml-2 border-amber-500"></span>
          <span class="text-amber-700">高亮区域</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-highlight {
  animation: node-bounce 1.2s ease-in-out infinite;
}

@keyframes node-bounce {
  0%, 100% { transform-origin: center; }
  50% { transform-origin: center; }
}

.edge-animated {
  animation: flow-line 1.5s linear infinite;
}
</style>
