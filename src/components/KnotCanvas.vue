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
      @node-drag-stop="handleNodeDragStop"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @pane-click="handlePaneClickEvt"
    >
      <Background pattern-color="#d1d5db" :gap="16" />
      <Controls position="bottom-right" :show-interactive="false" />
      <MiniMap position="bottom-left" pannable zoomable class="!bg-white" />
    </VueFlow>

    <div class="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-md px-3 py-2 text-xs text-gray-600 shadow-sm border border-gray-200 pointer-events-none">
      <div class="font-medium text-gray-700 mb-1">操作提示</div>
      <div>• 拖拽节点可以移动位置</div>
      <div>• 从节点拖出可连接到其他节点</div>
      <div>• 点击节点或绳段编辑属性</div>
      <div>• 红色边 = 超载 | 虚线 = 悬空</div>
    </div>
  </div>
</template>
