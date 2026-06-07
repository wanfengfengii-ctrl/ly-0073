<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { NodeType, DesignSchema, DesignScheme } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'

const store = useKnotStore()
const fileInput = ref<HTMLInputElement | null>(null)
const schemeDialogOpen = ref(false)
const comparisonDialogOpen = ref(false)
const newSchemeName = ref('')
const newSchemeDesc = ref('')
const copiedTip = ref('')

function addNode(type: NodeType) {
  store.addNode(type, { x: 280 + Math.random() * 240, y: 180 + Math.random() * 200 })
}

function exportDesign() {
  if (store.hasBlockingErrors) {
    if (!confirm('方案存在错误，导出后可能无法正常导入。是否继续？')) return
  }
  const data = store.exportDesign()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (data.name || 'knot-design').replace(/[^\w\u4e00-\u9fa5-]/g, '_')
  a.download = `${safeName}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportDesignCSV() {
  const lines: string[] = []
  lines.push('类型,编号/ID,材质,长度(m),承重上限(N),当前受力(N),X坐标,Y坐标')
  store.nodes.forEach((n) => {
    lines.push(`节点,${n.data?.label || n.id},,,,"",${n.position.x.toFixed(0)},${n.position.y.toFixed(0)}`)
  })
  store.edges.forEach((e) => {
    const source = store.nodes.find((n) => n.id === e.source)?.data?.label || e.source
    const target = store.nodes.find((n) => n.id === e.target)?.data?.label || e.target
    lines.push(`绳段,${source}→${target},${e.data?.material || ''},${e.data?.length || ''},${e.data?.maxLoad || ''},${e.data?.currentLoad || 0},,`)
  })
  const csv = '\uFEFF' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `knot-design-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function copyDesignToClipboard() {
  const text = store.exportDesignAsText()
  navigator.clipboard.writeText(text).then(() => {
    copiedTip.value = '已复制到剪贴板'
    setTimeout(() => (copiedTip.value = ''), 2000)
  }).catch(() => {
    copiedTip.value = '复制失败'
    setTimeout(() => (copiedTip.value = ''), 2000)
  })
}

function triggerImport() {
  fileInput.value?.click()
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const schema = JSON.parse(e.target?.result as string) as DesignSchema
      const ok = store.importDesign(schema)
      if (!ok) {
        const errs = store.importErrors
        alert(`导入失败，存在 ${errs.length} 个错误\n\n${errs.map((err) => '- ' + err.message).join('\n')}`)
      } else if (store.importErrors.length > 0) {
        const warns = store.importErrors
        alert(`导入成功，但存在 ${warns.length} 个警告：\n\n${warns.map((w) => '! ' + w.message).join('\n')}`)
      }
    } catch {
      alert('文件解析失败：不是有效的 JSON 文件')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function clearAll() {
  if (confirm('确定要清空画布吗？此操作可撤销。')) {
    store.clearAll()
  }
}

function handleUndo() {
  store.undo()
}

function handleRedo() {
  store.redo()
}

function openSchemeDialog() {
  newSchemeName.value = `方案 ${store.schemes.length + 1}`
  newSchemeDesc.value = ''
  schemeDialogOpen.value = true
}

function saveCurrentScheme() {
  const name = newSchemeName.value.trim()
  if (!name) return
  if (store.hasBlockingErrors) {
    if (!confirm('当前方案存在错误，是否仍要保存？')) return
  }
  store.saveScheme(name, newSchemeDesc.value.trim() || undefined)
  schemeDialogOpen.value = false
}

function deleteScheme(id: string) {
  const scheme = store.schemes.find((s) => s.id === id)
  if (scheme && confirm(`确定要删除方案"${scheme.name}"吗？`)) {
    store.deleteScheme(id)
  }
}

function loadScheme(scheme: DesignScheme) {
  if (store.nodes.length > 0 || store.edges.length > 0) {
    if (!confirm(`加载方案"${scheme.name}"将覆盖当前画布，是否继续？`)) return
  }
  store.loadScheme(scheme.id)
  comparisonDialogOpen.value = false
  schemeDialogOpen.value = false
}

function runSimulation() {
  if (store.edges.length === 0) {
    alert('请先添加绳段')
    return
  }
  store.applySimulatedForces()
}

function handleKeydown(e: KeyboardEvent) {
  const meta = e.metaKey || e.ctrlKey
  if (meta && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    handleUndo()
  } else if ((meta && e.shiftKey && e.key.toLowerCase() === 'z') || (meta && e.key.toLowerCase() === 'y')) {
    e.preventDefault()
    handleRedo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const sortedSchemes = computed(() => {
  return [...store.schemes].sort((a, b) => b.updatedAt - a.updatedAt)
})

function formatTime(ts: number) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-2.5 flex items-center gap-2 shadow-lg border-b border-slate-700/50">
    <div class="flex items-center gap-2 mr-1">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <path d="M8.5 7.5 12 15 15.5 7.5" />
        </svg>
      </div>
      <div>
        <h1 class="text-[13px] font-bold text-white leading-tight tracking-wide">绳结结构设计器</h1>
        <p class="text-[9px] text-slate-400 leading-tight mt-0.5">Knot Structure Designer · v2.0</p>
      </div>
    </div>

    <div class="h-7 w-px bg-slate-600/60 mx-0.5" />

    <div class="flex items-center gap-1 ml-0.5">
      <span class="text-[10px] text-slate-400 mr-0.5 font-medium">添加</span>
      <button
        class="group px-2.5 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-white text-slate-200 hover:text-slate-800 font-medium transition-all duration-200 flex items-center gap-1 shadow-sm"
        @click="addNode('junction')"
      >
        <span class="w-1.5 h-1.5 rounded-full border-2 border-current opacity-70 group-hover:opacity-100" />
        连接点
      </button>
      <button
        class="group px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-medium transition-all duration-200 flex items-center gap-1 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40"
        @click="addNode('fixed')"
      >
        <span class="w-1.5 h-1.5 rounded-sm bg-white/90" />
        固定点
      </button>
      <button
        class="group px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-medium transition-all duration-200 flex items-center gap-1 shadow-md shadow-red-500/25 hover:shadow-red-500/40"
        @click="addNode('load')"
      >
        <span class="text-[9px]">▲</span>
        受力点
      </button>
    </div>

    <div class="h-7 w-px bg-slate-600/60 mx-0.5" />

    <div class="flex items-center gap-1">
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600/60 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        :disabled="!store.canUndo()"
        title="撤销 (Ctrl+Z)"
        @click="handleUndo"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13" />
        </svg>
        撤销
      </button>
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600/60 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        :disabled="!store.canRedo()"
        title="重做 (Ctrl+Shift+Z)"
        @click="handleRedo"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13" />
        </svg>
        重做
      </button>
    </div>

    <div class="h-7 w-px bg-slate-600/60 mx-0.5" />

    <div class="flex items-center gap-1">
      <button
        class="px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium transition-all duration-200 flex items-center gap-1 shadow-md shadow-emerald-500/25"
        title="运行受力仿真，自动计算各绳段受力"
        @click="runSimulation"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        受力仿真
      </button>
      <button
        class="px-2.5 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        @click="openSchemeDialog"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        方案管理
        <span v-if="store.schemes.length > 0" class="bg-indigo-500/80 text-white text-[9px] px-1 rounded-full font-bold">
          {{ store.schemes.length }}
        </span>
      </button>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-1 relative">
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        title="复制方案 JSON 到剪贴板"
        @click="copyDesignToClipboard"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        复制
      </button>
      <span v-if="copiedTip" class="absolute -bottom-6 right-0 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded shadow whitespace-nowrap">
        {{ copiedTip }}
      </span>
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        @click="triggerImport"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        导入
      </button>
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        @click="exportDesign"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 15V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 21h14" />
        </svg>
        导出
      </button>
      <button
        class="px-2 py-1 text-[11px] rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1"
        title="导出为 CSV 表格"
        @click="exportDesignCSV"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        CSV
      </button>
      <div class="h-5 w-px bg-slate-600/60 mx-0.5" />
      <button
        class="px-2 py-1 text-[11px] rounded-lg bg-slate-600/70 hover:bg-slate-500 text-white font-medium transition-all duration-200 flex items-center gap-1"
        @click="clearAll"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        清空
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="handleFileImport"
    />

    <Teleport to="body">
      <div
        v-if="schemeDialogOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="schemeDialogOpen = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">📋</div>
              <div>
                <h3 class="text-base font-bold text-slate-700">方案管理</h3>
                <p class="text-[11px] text-slate-500">保存、加载和对比不同的绳结设计方案</p>
              </div>
            </div>
            <button @click="schemeDialogOpen = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>

          <div class="p-4 border-b border-slate-100 bg-slate-50/50">
            <div class="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-wider">保存当前方案</div>
            <div class="flex gap-2">
              <input
                v-model="newSchemeName"
                type="text"
                placeholder="方案名称"
                class="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                @keyup.enter="saveCurrentScheme"
              />
              <input
                v-model="newSchemeDesc"
                type="text"
                placeholder="描述（可选）"
                class="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
              />
              <button
                class="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 font-medium transition shadow-md shadow-indigo-500/25"
                @click="saveCurrentScheme"
              >
                保存
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div class="text-[11px] font-bold text-slate-500 uppercase mb-2 tracking-wider flex items-center justify-between">
              <span>已保存方案 ({{ sortedSchemes.length }})</span>
              <button
                v-if="sortedSchemes.length >= 2"
                class="text-indigo-600 hover:text-indigo-700 normal-case font-medium"
                @click="comparisonDialogOpen = true; schemeDialogOpen = false"
              >
                多方案对比 →
              </button>
            </div>
            <div v-if="sortedSchemes.length === 0" class="bg-slate-50/50 rounded-xl border border-dashed border-slate-300 py-10 text-center">
              <div class="text-slate-300 text-3xl mb-2">📂</div>
              <div class="text-slate-400 text-sm">暂无保存的方案</div>
              <div class="text-slate-400 text-xs mt-1">在上方输入名称并保存当前设计</div>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="s in sortedSchemes"
                :key="s.id"
                class="group bg-white border rounded-xl p-3 hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                :class="store.activeSchemeId === s.id ? 'border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-200' : 'border-slate-200'"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-slate-800 text-sm truncate">{{ s.name }}</span>
                      <span
                        v-if="s.analysis"
                        class="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        :class="
                          s.analysis.safetyLevel === 'safe' ? 'bg-emerald-100 text-emerald-700' :
                          s.analysis.safetyLevel === 'warning' ? 'bg-amber-100 text-amber-700' :
                          s.analysis.safetyLevel === 'danger' ? 'bg-red-100 text-red-700' :
                          'bg-red-200 text-red-800'
                        "
                      >
                        安全 {{ s.analysis.safetyScore }}
                      </span>
                      <span v-if="store.activeSchemeId === s.id" class="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                        当前
                      </span>
                    </div>
                    <p v-if="s.description" class="text-xs text-slate-500 mt-0.5 truncate">{{ s.description }}</p>
                    <div v-if="s.analysis" class="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span>💰 ¥{{ s.analysis.totalCost.toFixed(0) }}</span>
                      <span>⚖️ {{ s.analysis.totalWeight.toFixed(1) }}kg</span>
                      <span>📏 {{ s.analysis.totalLength.toFixed(1) }}m</span>
                      <span v-if="s.analysis.overloadedCount > 0" class="text-red-600 font-medium">
                        ⚠ {{ s.analysis.overloadedCount }}处超载
                      </span>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-1">更新于 {{ formatTime(s.updatedAt) }}</div>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="px-2 py-1 text-[11px] bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 font-medium transition"
                      @click="loadScheme(s)"
                    >
                      加载
                    </button>
                    <button
                      class="px-2 py-1 text-[11px] bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition"
                      @click="deleteScheme(s.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="comparisonDialogOpen"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="comparisonDialogOpen = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">⚖️</div>
              <div>
                <h3 class="text-base font-bold text-slate-700">多方案对比</h3>
                <p class="text-[11px] text-slate-500">横向比较各方案的安全性、成本与性能指标</p>
              </div>
            </div>
            <button @click="comparisonDialogOpen = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>
          <div class="flex-1 overflow-auto p-4">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-slate-50">
                  <th class="text-left px-4 py-2.5 font-bold text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">指标</th>
                  <th
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 font-bold text-[12px] border-b border-slate-200"
                    :class="store.activeSchemeId === s.id ? 'text-indigo-700 bg-indigo-50/50' : 'text-slate-700'"
                  >
                    <div class="flex flex-col items-center">
                      <span class="truncate max-w-[150px]">{{ s.name }}</span>
                      <span v-if="store.activeSchemeId === s.id" class="text-[9px] text-indigo-500 mt-0.5">当前</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">安全评分</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center"
                  >
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                      :class="
                        !s.analysis ? 'bg-slate-100 text-slate-500' :
                        s.analysis.safetyScore >= 85 ? 'bg-emerald-100 text-emerald-700' :
                        s.analysis.safetyScore >= 65 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      "
                    >
                      {{ s.analysis?.safetyScore ?? '-' }}
                    </span>
                  </td>
                </tr>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">安全等级</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center text-[12px] font-medium"
                    :class="
                      !s.analysis ? 'text-slate-400' :
                      s.analysis.safetyLevel === 'safe' ? 'text-emerald-600' :
                      s.analysis.safetyLevel === 'warning' ? 'text-amber-600' :
                      s.analysis.safetyLevel === 'danger' ? 'text-red-600' :
                      'text-red-700 font-bold'
                    "
                  >
                    {{ s.analysis ? (s.analysis.safetyLevel === 'safe' ? '安全' : s.analysis.safetyLevel === 'warning' ? '警告' : s.analysis.safetyLevel === 'danger' ? '危险' : '严重危险') : '-' }}
                  </td>
                </tr>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">总成本 (¥)</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center text-[12px] font-mono font-semibold"
                    :class="s.analysis && s.analysis.totalCost === Math.min(...sortedSchemes.filter(x => x.analysis).map(x => x.analysis!.totalCost)) ? 'text-emerald-600' : 'text-slate-700'"
                  >
                    {{ s.analysis ? s.analysis.totalCost.toFixed(0) : '-' }}
                  </td>
                </tr>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">总重量 (kg)</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center text-[12px] font-mono"
                  >
                    {{ s.analysis ? s.analysis.totalWeight.toFixed(2) : '-' }}
                  </td>
                </tr>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">绳段总长 (m)</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center text-[12px] font-mono"
                  >
                    {{ s.analysis ? s.analysis.totalLength.toFixed(2) : '-' }}
                  </td>
                </tr>
                <tr class="border-b border-slate-100">
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">超载绳段</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center text-[12px] font-medium"
                    :class="s.analysis && s.analysis.overloadedCount > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'"
                  >
                    {{ s.analysis ? (s.analysis.overloadedCount > 0 ? s.analysis.overloadedCount + ' 处' : '无') : '-' }}
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-2.5 text-slate-600 font-medium text-[12px]">操作</td>
                  <td
                    v-for="s in sortedSchemes"
                    :key="s.id"
                    class="px-4 py-2.5 text-center"
                  >
                    <button
                      class="px-3 py-1 text-[11px] bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition"
                      @click="loadScheme(s)"
                    >
                      加载此方案
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
