<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useKnotStore } from '@/stores/knot'
import { MATERIALS, RISK_COLORS, RISK_LABELS } from '@/types/knot'
import type { MaterialType } from '@/types/knot'

const store = useKnotStore()

const selectedEdge = computed(() => store.selectedEdge)
const selectedNode = computed(() => store.selectedNode)

const edgeLengthInput = ref('')
const edgeMaxLoadInput = ref('')
const edgeCurrentLoadInput = ref('')
const nodeLabelInput = ref('')
const nodeLoadForceInput = ref('')
const labelError = ref('')
const lengthError = ref('')
const maxLoadError = ref('')
const loadForceError = ref('')

const edgeRiskLevel = computed(() => {
  if (!selectedEdge.value) return 'safe'
  return store.getEdgeRiskLevel(selectedEdge.value.id)
})

const edgeSimulatedLoad = computed(() => {
  if (!selectedEdge.value) return 0
  const fr = store.forceResults.get(selectedEdge.value.id)
  return fr?.calculatedLoad ?? 0
})

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
      nodeLoadForceInput.value = String(selectedNode.value.data.loadForce ?? '')
      labelError.value = ''
      loadForceError.value = ''
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

function applySimulated() {
  if (!selectedEdge.value?.id) return
  const sim = edgeSimulatedLoad.value
  if (sim > 0) {
    store.updateEdgeData(selectedEdge.value.id, { currentLoad: Math.round(sim * 100) / 100 })
  }
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

function commitLoadForce() {
  if (!selectedNode.value?.id) return
  const raw = nodeLoadForceInput.value.trim()
  if (raw === '') {
    store.updateNodeData(selectedNode.value.id, { loadForce: undefined })
    loadForceError.value = ''
    return
  }
  const num = parseFloat(raw)
  if (isNaN(num) || num < 0) {
    loadForceError.value = '请输入有效数值'
    if (selectedNode.value?.data?.loadForce !== undefined) {
      nodeLoadForceInput.value = String(selectedNode.value.data.loadForce)
    }
    return
  }
  loadForceError.value = ''
  store.updateNodeData(selectedNode.value.id, { loadForce: num })
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

const simulatedRatio = computed(() => {
  if (!selectedEdge.value?.data || selectedEdge.value.data.maxLoad === 0) return 0
  return (edgeSimulatedLoad.value / selectedEdge.value.data.maxLoad) * 100
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

const selectedMaterialInfo = computed(() => {
  if (!selectedEdge.value?.data?.material) return null
  return MATERIALS.find((m) => m.key === selectedEdge.value?.data?.material) || null
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
        <div class="flex items-center justify-between gap-2">
          <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider">绳段 ID</span>
            <div class="font-mono text-xs text-slate-600 mt-0.5">{{ selectedEdge.id }}</div>
          </div>
          <div
            class="px-2.5 py-2 rounded-lg text-[10px] font-bold text-white text-center min-w-[60px] shadow-md"
            :style="{ background: RISK_COLORS[edgeRiskLevel] }"
          >
            {{ RISK_LABELS[edgeRiskLevel] }}
          </div>
        </div>

        <div
          v-if="isOverloaded"
          class="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 shadow-sm"
        >
          <span class="text-red-500 text-base">⚠</span>
          <span class="font-medium">当前受力已超过承重上限！</span>
        </div>

        <div v-if="edgeSimulatedLoad > 0 && !isOverloaded" class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 shadow-sm">
          <div class="flex items-center gap-2">
            <span class="text-emerald-500 text-base">⚡</span>
            <div>
              <span class="font-medium">仿真受力</span>
              <span class="ml-1.5 font-bold">{{ edgeSimulatedLoad.toFixed(2) }} N</span>
              <span class="ml-1 opacity-75">({{ simulatedRatio.toFixed(1) }}%)</span>
            </div>
          </div>
          <button
            class="px-2 py-1 text-[10px] bg-emerald-500 text-white rounded-md hover:bg-emerald-600 font-medium transition shadow-sm"
            @click="applySimulated"
          >
            应用
          </button>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">材质</label>
          <select
            :value="selectedEdge.data?.material"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-slate-700 text-sm"
            @change="(e) => updateMaterial((e.target as HTMLSelectElement).value)"
          >
            <option v-for="m in MATERIALS" :key="m.key" :value="m.key">
              {{ m.label }} - ¥{{ m.costPerMeter }}/m · 破断{{ m.breakingStrength }}N
            </option>
          </select>
          <div v-if="selectedMaterialInfo" class="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span class="text-slate-400">密度</span>
              <div class="text-slate-700 font-semibold">{{ selectedMaterialInfo.density }} kg/m</div>
            </div>
            <div>
              <span class="text-slate-400">安全系数</span>
              <div class="text-slate-700 font-semibold">{{ selectedMaterialInfo.safetyFactor }}x</div>
            </div>
            <div>
              <span class="text-slate-400">破断强度</span>
              <div class="text-slate-700 font-semibold">{{ selectedMaterialInfo.breakingStrength }} N</div>
            </div>
            <div>
              <span class="text-slate-400">单价</span>
              <div class="text-emerald-700 font-semibold">¥{{ selectedMaterialInfo.costPerMeter }}/m</div>
            </div>
          </div>
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
              :class="isOverloaded ? 'bg-gradient-to-r from-red-500 to-orange-500' : loadRatio >= 85 ? 'bg-gradient-to-r from-orange-500 to-red-500' : loadRatio >= 65 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-400 to-blue-500'"
              :style="{ width: Math.min(100, loadRatio) + '%' }"
            />
          </div>
          <div class="flex justify-between mt-2 text-[9px] text-slate-400">
            <span>安全 0%</span>
            <span>警告 65%</span>
            <span>危险 85%</span>
            <span>超载 100%</span>
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
        <div class="flex items-center justify-between gap-2">
          <div class="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1">
            <span class="text-[10px] text-slate-400 uppercase tracking-wider">节点 ID</span>
            <div class="font-mono text-xs text-slate-600 mt-0.5">{{ selectedNode.id }}</div>
          </div>
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

        <div v-if="selectedNode.data?.nodeType === 'load'">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
            施加载荷 (N)
          </label>
          <input
            type="text"
            inputmode="decimal"
            v-model="nodeLoadForceInput"
            placeholder="默认 100N"
            class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white text-sm transition"
            :class="loadForceError ? 'border-red-400 bg-red-50' : 'border-slate-300'"
            @blur="commitLoadForce"
            @keyup.enter="commitLoadForce"
          />
          <div v-if="loadForceError" class="text-red-500 text-[11px] mt-1 flex items-center gap-1">
            <span>✕</span>{{ loadForceError }}
          </div>
          <div class="mt-1.5 text-[10px] text-slate-500">
            💡 该载荷将用于受力仿真，自动分配到各条路径
          </div>
          <div class="mt-2 grid grid-cols-4 gap-1.5">
            <button
              v-for="v in [50, 100, 200, 500]"
              :key="v"
              class="px-2 py-1 text-[10px] bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 rounded font-medium transition"
              @click="nodeLoadForceInput = String(v); commitLoadForce()"
            >
              {{ v }}N
            </button>
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

        <div v-if="selectedNode.data?.nodeType === 'load' || selectedNode.data?.nodeType === 'fixed'">
          <label class="block text-[11px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">连接绳段</label>
          <div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <div v-if="store.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0" class="text-[11px] text-slate-400 text-center py-1">
              暂无连接
            </div>
            <div v-else class="space-y-1">
              <div
                v-for="e in store.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id)"
                :key="e.id"
                class="flex items-center justify-between text-[11px]"
              >
                <span class="font-mono text-slate-600">
                  {{ store.nodes.find(n => n.id === (e.source === selectedNode.id ? e.target : e.source))?.data?.label || '?' }}
                </span>
                <span
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  :style="{
                    background: RISK_COLORS[store.getEdgeRiskLevel(e.id)] + '20',
                    color: RISK_COLORS[store.getEdgeRiskLevel(e.id)],
                  }"
                >
                  {{ (store.getEdgeLoadRatio(e.id) * 100).toFixed(0) }}%
                </span>
              </div>
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
