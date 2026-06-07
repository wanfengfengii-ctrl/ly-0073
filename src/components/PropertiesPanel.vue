<script setup lang="ts">
import { computed } from 'vue'
import { useKnotStore } from '@/stores/knot'
import { MATERIALS } from '@/types/knot'
import type { MaterialType } from '@/types/knot'

const store = useKnotStore()

const selectedEdge = computed(() => store.selectedEdge)
const selectedNode = computed(() => store.selectedNode)

function updateMaterial(val: string) {
  if (selectedEdge.value?.id) {
    store.updateEdgeData(selectedEdge.value.id, { material: val as MaterialType })
  }
}

function updateLength(val: string) {
  if (selectedEdge.value?.id) {
    const num = parseFloat(val)
    if (!isNaN(num)) {
      store.updateEdgeData(selectedEdge.value.id, { length: num })
    }
  }
}

function updateMaxLoad(val: string) {
  if (selectedEdge.value?.id) {
    const num = parseFloat(val)
    if (!isNaN(num)) {
      store.updateEdgeData(selectedEdge.value.id, { maxLoad: num })
    }
  }
}

function updateCurrentLoad(val: string) {
  if (selectedEdge.value?.id) {
    const num = parseFloat(val)
    if (!isNaN(num)) {
      store.updateEdgeData(selectedEdge.value.id, { currentLoad: num })
    }
  }
}

function updateNodeLabel(val: string) {
  if (selectedNode.value?.id) {
    store.updateNodeData(selectedNode.value.id, { label: val })
  }
}

function deleteEdge() {
  if (selectedEdge.value?.id && confirm('确定删除此绳段吗？')) {
    store.removeEdge(selectedEdge.value.id)
  }
}

function deleteNode() {
  if (selectedNode.value?.id && confirm('确定删除此节点？关联绳段也会被删除。')) {
    store.removeNode(selectedNode.value.id)
  }
}

const isOverloaded = computed(() => {
  if (!selectedEdge.value?.data) return false
  return selectedEdge.value.data.currentLoad > selectedEdge.value.data.maxLoad
})

const loadRatio = computed(() => {
  if (!selectedEdge.value?.data || selectedEdge.value.data.maxLoad === 0) return 0
  return (selectedEdge.value.data.currentLoad / selectedEdge.value.data.maxLoad) * 100
})
</script>

<template>
  <div class="bg-white border-l border-gray-200 w-80 h-full overflow-y-auto">
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-base font-semibold text-gray-800">属性编辑</h2>
    </div>

    <div v-if="!selectedNode && !selectedEdge" class="p-6 text-gray-500 text-sm text-center">
      <div class="text-gray-300 text-4xl mb-3">⌖</div>
      选择画布中的节点或绳段<br />查看和编辑属性
    </div>

    <template v-else-if="selectedEdge">
      <div class="p-4 space-y-4 text-sm">
        <div class="text-xs text-gray-500">绳段 ID: {{ selectedEdge.id }}</div>

        <div
          v-if="isOverloaded"
          class="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs"
        >
          ⚠ 当前受力已超过承重上限！
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">材质</label>
          <select
            :value="selectedEdge.data?.material"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="(e) => updateMaterial((e.target as HTMLSelectElement).value)"
          >
            <option v-for="m in MATERIALS" :key="m.key" :value="m.key">
              {{ m.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">
            长度 (米)
            <span v-if="selectedEdge.data && selectedEdge.data.length <= 0" class="text-red-500 ml-1">
              (必须大于零)
            </span>
          </label>
          <input
            type="number"
            step="0.1"
            min="0.01"
            :value="selectedEdge.data?.length"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="(e) => updateLength((e.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">
            承重上限 (N)
            <span v-if="selectedEdge.data && selectedEdge.data.maxLoad <= 0" class="text-red-500 ml-1">
              (必须大于零)
            </span>
          </label>
          <input
            type="number"
            step="1"
            min="0.01"
            :value="selectedEdge.data?.maxLoad"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="(e) => updateMaxLoad((e.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">当前受力 (N)</label>
          <input
            type="number"
            step="1"
            :value="selectedEdge.data?.currentLoad"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="(e) => updateCurrentLoad((e.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <div class="flex justify-between text-xs text-gray-600 mb-1.5">
            <span>受力比</span>
            <span :class="isOverloaded ? 'text-red-600 font-semibold' : ''">
              {{ loadRatio.toFixed(1) }}%
            </span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="isOverloaded ? 'bg-red-500' : 'bg-blue-500'"
              :style="{ width: Math.min(100, loadRatio) + '%' }"
            />
          </div>
        </div>

        <button
          class="w-full mt-4 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
          @click="deleteEdge"
        >
          删除绳段
        </button>
      </div>
    </template>

    <template v-else-if="selectedNode">
      <div class="p-4 space-y-4 text-sm">
        <div class="text-xs text-gray-500">节点 ID: {{ selectedNode.id }}</div>
        <div class="text-xs text-gray-500">
          类型:
          <span class="font-medium text-gray-700">
            {{ selectedNode.data?.nodeType === 'junction' ? '连接点' : selectedNode.data?.nodeType === 'fixed' ? '固定点' : '受力点' }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">
            编号 / 标签
            <span v-if="selectedNode.data?.nodeType === 'junction' && store.duplicateJunctionLabels.includes(selectedNode.data.label)" class="text-red-500 ml-1">
              (编号重复)
            </span>
          </label>
          <input
            type="text"
            :value="selectedNode.data?.label"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="(e) => updateNodeLabel((e.target as HTMLInputElement).value)"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">位置</label>
          <div class="grid grid-cols-2 gap-2 text-gray-500">
            <div>X: {{ selectedNode.position.x.toFixed(0) }}</div>
            <div>Y: {{ selectedNode.position.y.toFixed(0) }}</div>
          </div>
        </div>

        <button
          class="w-full mt-4 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition text-sm"
          @click="deleteNode"
        >
          删除节点
        </button>
      </div>
    </template>
  </div>
</template>
