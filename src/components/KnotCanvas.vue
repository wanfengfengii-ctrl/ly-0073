<script setup lang="ts">
import { computed, markRaw, onMounted } from 'vue'
import {
  VueFlow,
  useVueFlow,
  type Connection,
  type NodeDragEvent,
  type NodeMouseEvent,
  type EdgeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import KnotNode from '@/components/KnotNode.vue'
import KnotEdge from '@/components/KnotEdge.vue'
import { useKnotStore } from '@/stores/knot'

const store = useKnotStore()

const { onConnect, onPaneClick } = useVueFlow()

const nodeTypes = {
  knotNode: markRaw(KnotNode),
}

const edgeTypes = {
  knotEdge: markRaw(KnotEdge),
}

const nodes = computed({
  get: () => store.nodes,
  set: () => {},
})

const edges = computed({
  get: () => store.edges,
  set: () => {},
})

function handleConnect(conn: Connection) {
  if (!conn.source || !conn.target) return
  store.addEdge(conn.source, conn.target)
}

function handleNodeDragStart() {
  store.pushHistory()
}

function handleNodeDragStop(event: NodeDragEvent) {
  event.nodes.forEach((node) => {
    store.updateNodePosition(node.id, node.position)
  })
}

function handleNodeClick(event: NodeMouseEvent) {
  store.selectNode(event.node.id)
}

function handleEdgeClick(event: EdgeMouseEvent) {
  store.selectEdge(event.edge.id)
}

function handlePaneClickEvt() {
  store.clearSelection()
}

onMounted(() => {
  onConnect(handleConnect)
  onPaneClick(handlePaneClickEvt)
})
</script>

<template>
  <div class="flex-1 relative">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-viewport="{ zoom: 1, x: 0, y: 0 }"
      :min-zoom="0.2"
      :max-zoom="2"
      fit-view-on-init
      class="h-full w-full"
      @node-drag-start="handleNodeDragStart"
      @node-drag-stop="handleNodeDragStop"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @pane-click="handlePaneClickEvt"
    >
      <Background pattern-color="#d1d5db" :gap="16" />
      <Controls position="bottom-right" :show-interactive="false" />
      <MiniMap position="bottom-left" pannable zoomable class="!bg-white" />
    </VueFlow>

    <div class="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg px-3.5 py-2.5 text-xs text-gray-600 shadow-sm border border-gray-200 pointer-events-none max-w-[280px]">
      <div class="font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        操作提示
      </div>
      <div class="space-y-0.5">
        <div>• 拖拽节点可以移动位置</div>
        <div>• 从节点拖出可连接到其他节点</div>
        <div>• 点击节点或绳段编辑属性</div>
        <div>• Ctrl+Z 撤销 / Ctrl+Shift+Z 重做</div>
      </div>
      <div class="mt-1.5 pt-1.5 border-t border-gray-100 text-[11px]">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm" style="background:#10b981"></span>安全</span>
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm" style="background:#f59e0b"></span>警告</span>
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm" style="background:#ef4444"></span>危险</span>
          <span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-sm" style="background:#991b1b"></span>严重</span>
        </div>
      </div>
    </div>
  </div>
</template>
