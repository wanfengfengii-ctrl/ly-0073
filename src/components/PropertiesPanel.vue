<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useKnotStore } from '@/stores/knot'
import { MATERIALS } from '@/types/knot'
import type { MaterialType } from '@/types/knot'

const store = useKnotStore()

const selectedEdge = computed(() => store.selectedEdge)
const selectedNode = computed(() => store.selectedNode)

const edgeLengthInput = ref('')
const edgeMaxLoadInput = ref('')
const edgeCurrentLoadInput = ref('')
const nodeLabelInput = ref('')
const labelError = ref('')
const lengthError = ref('')
const maxLoadError = ref('')

watch(
  () => selectedEdge.value?.id,
  () => {
    if (selectedEdge.value?.data) {
      edgeLengthInput.value = String(selectedEdge.value.data.length)
      edgeMaxLoadInput.value = String(selectedEdge.value.data.maxLoad)
      edgeCurrentLoadInput.value = String(selectedEdge.value.data.currentLoad)
      lengthError.value = ''
      maxLoadError.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => selectedNode.value?.id,
  () => {
    if (selectedNode.value?.data) {
      nodeLabelInput.value = selectedNode.value.data.label
      labelError.value = ''
    }
  },
  { immediate: true },
)

function updateMaterial(val: string) {
  if (selectedEdge.value?.id) {
    store.updateEdgeData(selectedEdge.value.id, { material: val as MaterialType })
  }
}

function commitLength() {
  if (!selectedEdge.value?.id) return
  const raw = edgeLengthInput.value.trim()
  const num = parseFloat(raw)
  if (!raw || isNaN(num) || num <= 0) {
    lengthError.value = !raw ? '不能为空' : '必须大于 0'
    if (selectedEdge.value?.data) {
      edgeLengthInput.value = String(selectedEdge.value.data.length)
    }
    return
  }
  lengthError.value = ''
  store.updateEdgeData(selectedEdge.value.id, { length: num })
}

function commitMaxLoad() {
  if (!selectedEdge.value?.id) return
  const raw = edgeMaxLoadInput.value.trim()
  const num = parseFloat(raw)
  if (!raw || isNaN(num) || num <= 0) {
    maxLoadError.value = !raw ? '不能为空' : '必须大于 0'
    if (selectedEdge.value?.data) {
      edgeMaxLoadInput.value = String(selectedEdge.value.data.maxLoad)
    }
    return
  }
  maxLoadError.value = ''
  store.updateEdgeData(selectedEdge.value.id, { maxLoad: num })
}

function commitCurrentLoad() {
  if (!selectedEdge.value?.id) return
  const raw = edgeCurrentLoadInput.value.trim()
  if (!raw) {
    if (selectedEdge.value?.data) {
      edgeCurrentLoadInput.value = String(selectedEdge.value.data.currentLoad)
    }
    return
  }
  const num = parseFloat(raw)
  if (isNaN(num) || num < 0) {
    if (selectedEdge.value?.data) {
      edgeCurrentLoadInput.value = String(selectedEdge.value.data.currentLoad)
    }
    return
  }
  store.updateEdgeData(selectedEdge.value.id, { currentLoad: num })
}

function commitNodeLabel() {
  if (!selectedNode.value?.id) return
  const raw = nodeLabelInput.value.trim()
  if (!raw) {
    labelError.value = '编号不能为空'
    if (selectedNode.value?.data) {
      nodeLabelInput.value = selectedNode.value.data.label
    }
    return
  }
  if (store.isLabelDuplicate(raw, selectedNode.value.id)) {
    labelError.value = `编号 "${raw}" 已存在`
    if (selectedNode.value?.data) {
      nodeLabelInput.value = selectedNode.value.data.label
    }
    return
  }
  labelError.value = ''
  store.updateNodeData(selectedNode.value.id, { label: raw })
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

const labelHasError = computed(() => {
  if (labelError.value) return true
  if (!selectedNode.value?.data?.label) return false
  return store.duplicateLabels.some((d) => d.label === selectedNode.value?.data?.label)
})

const nodeTypeText = computed(() => {
  if (!selectedNode.value?.data?.nodeType) return ''
  const t = selectedNode.value.data.nodeType
  return t === 'junction' ? '连接点' : t === 'fixed' ? '固定点' : '受力点'
})

const nodeTypeColor = computed(() => {
  if (!selectedNode.value?.data?.nodeType) return 'text-gray-500'
  const t = selectedNode.value.data.nodeType
  return t === 'junction' ? 'text-gray-600' : t === 'fixed' ? 'text-blue-600' : 'text-red-600'
})
</script>

<template>
  <div class="bg-gradient-to-b from-white to-slate-50 border-l border-slate-200 w-80 h-full overflow-y-auto shadow-inner">
    <div class="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">✎</div>
        <h2 class="text-sm font-bold text-slate-700 tracking-wide">属性编辑</h2>
      </div>
    </div>

    <div v-if="!selectedNode && !selectedEdge" class="p-8 text-slate-400 text-xs text-center flex flex-col items-center">
      <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 text-2xl mb-4">◉</div>
      <div class="text-slate-500 font-medium mb-1">暂无选中元素</div>
      <div class="text-slate-400">点击画布中的节点或绳段<br/>查看并编辑属性</div>
    </div>

    <template v-else-if="selectedEdge">
      <div class="p-4 space-y-4 text-sm">
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span class="text-[10px] text-slate-400 uppercase tracking-wider">绳段 ID</span>
          <span class="font-mono text-xs text-slate-600">{{ selectedEdge.id }}</span>
        </div>

        <div
          v-if="isOverloaded"
          class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm"
        >
          <span class="text-red-500 text-base">⚠</span>
          <span class="font-medium">当前受力已超过承重上限！</span>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">材质</label>
          <select
            :value="selectedEdge.data?.material"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-slate-700 text-sm"
            @change="(e) => updateMaterial((e.target as HTMLSelectElement).value)"
          >
            <option v-for="m in MATERIALS" :key="m.key" :value="m.key">
              {{ m.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            长度 (米)
          </label>
          <input
            type="text"
            inputmode="decimal"
            v-model="edgeLengthInput"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-sm transition"
            :class="lengthError ? 'border-red-400 bg-red-50' : 'border-slate-300'"
            @blur="commitLength"
            @keyup.enter="commitLength"
          />
          <div v-if="lengthError" class="text-red-500 text-[11px] mt-1 flex items-center gap-1">
            <span>✕</span>{{ lengthError }}（已自动恢复）
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            承重上限 (N)
          </label>
          <input
            type="text"
            inputmode="decimal"
            v-model="edgeMaxLoadInput"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-sm transition"
            :class="maxLoadError ? 'border-red-400 bg-red-50' : 'border-slate-300'"
            @blur="commitMaxLoad"
            @keyup.enter="commitMaxLoad"
          />
          <div v-if="maxLoadError" class="text-red-500 text-[11px] mt-1 flex items-center gap-1">
            <span>✕</span>{{ maxLoadError }}（已自动恢复）
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">当前受力 (N)</label>
          <input
            type="text"
            inputmode="decimal"
            v-model="edgeCurrentLoadInput"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-sm transition"
            @blur="commitCurrentLoad"
            @keyup.enter="commitCurrentLoad"
          />
        </div>

        <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div class="flex justify-between text-xs mb-2">
            <span class="font-semibold text-slate-600">受力比</span>
            <span :class="isOverloaded ? 'text-red-600 font-bold' : 'text-slate-700 font-semibold'">
              {{ loadRatio.toFixed(1) }}%
            </span>
          </div>
          <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="isOverloaded ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-indigo-400 to-blue-500'"
              :style="{ width: Math.min(100, loadRatio) + '%' }"
            />
          </div>
        </div>

        <button
          class="w-full mt-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition text-sm font-medium shadow-sm hover:shadow flex items-center justify-center gap-1.5"
          @click="deleteEdge"
        >
          <span>🗑</span>删除绳段
        </button>
      </div>
    </template>

    <template v-else-if="selectedNode">
      <div class="p-4 space-y-4 text-sm">
        <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
          <span class="text-[10px] text-slate-400 uppercase tracking-wider">节点 ID</span>
          <span class="font-mono text-xs text-slate-600">{{ selectedNode.id }}</span>
        </div>

        <div class="flex items-center gap-2 px-1">
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            :class="selectedNode.data?.nodeType === 'junction' ? 'bg-white border-2 border-slate-300 text-slate-700' : selectedNode.data?.nodeType === 'fixed' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'"
          >
            {{ selectedNode.data?.nodeType === 'junction' ? '○' : selectedNode.data?.nodeType === 'fixed' ? '■' : '▲' }}
          </div>
          <div>
            <div class="text-[10px] text-slate-400 uppercase tracking-wider">节点类型</div>
            <div class="text-sm font-semibold" :class="nodeTypeColor">{{ nodeTypeText }}</div>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            编号 / 标签
          </label>
          <input
            type="text"
            v-model="nodeLabelInput"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-sm transition"
            :class="labelHasError ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-300'"
            @blur="commitNodeLabel"
            @keyup.enter="commitNodeLabel"
          />
          <div v-if="labelError" class="text-red-500 text-[11px] mt-1 flex items-center gap-1">
            <span>✕</span>{{ labelError }}（已自动恢复）
          </div>
          <div v-else-if="labelHasError" class="text-red-500 text-[11px] mt-1 flex items-center gap-1">
            <span>⚠</span>此编号已被占用，请修改
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">坐标位置</label>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
              <div class="text-[10px] text-slate-400 uppercase">X</div>
              <div class="text-sm font-mono text-slate-700 font-semibold">{{ selectedNode.position.x.toFixed(0) }}</div>
            </div>
            <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
              <div class="text-[10px] text-slate-400 uppercase">Y</div>
              <div class="text-sm font-mono text-slate-700 font-semibold">{{ selectedNode.position.y.toFixed(0) }}</div>
            </div>
          </div>
        </div>

        <button
          class="w-full mt-2 px-3 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg hover:from-red-600 hover:to-rose-600 transition text-sm font-medium shadow-sm hover:shadow flex items-center justify-center gap-1.5"
          @click="deleteNode"
        >
          <span>🗑</span>删除节点
        </button>
      </div>
    </template>
  </div>
</template>
