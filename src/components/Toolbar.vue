<script setup lang="ts">
import { ref } from 'vue'
import type { NodeType } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'
import type { DesignSchema } from '@/types/knot'

const store = useKnotStore()
const fileInput = ref<HTMLInputElement | null>(null)

function addNode(type: NodeType) {
  store.addNode(type, { x: 280 + Math.random() * 240, y: 180 + Math.random() * 200 })
}

function exportDesign() {
  const data = store.exportDesign()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `knot-design-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
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
        alert(`导入失败，存在 ${store.importErrors.length} 个错误\n\n${store.importErrors.map((err) => '- ' + err.message).join('\n')}`)
      }
    } catch {
      alert('文件解析失败：不是有效的 JSON 文件')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function clearAll() {
  if (confirm('确定要清空画布吗？此操作不可撤销。')) {
    store.clearAll()
  }
}
</script>

<template>
  <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3 flex items-center gap-3 shadow-lg border-b border-slate-700/50">
    <div class="flex items-center gap-3 mr-2">
      <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="12" cy="18" r="3" />
          <path d="M8.5 7.5 12 15 15.5 7.5" />
        </svg>
      </div>
      <div>
        <h1 class="text-[15px] font-bold text-white leading-tight tracking-wide">绳结结构设计器</h1>
        <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Knot Structure Designer · v1.0</p>
      </div>
    </div>

    <div class="h-8 w-px bg-slate-600/60 mx-1" />

    <div class="flex items-center gap-1.5 ml-1">
      <span class="text-[11px] text-slate-400 mr-1 font-medium">添加节点</span>
      <button
        class="group px-3.5 py-1.5 text-xs rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-white text-slate-200 hover:text-slate-800 font-medium transition-all duration-200 flex items-center gap-1.5 shadow-sm"
        @click="addNode('junction')"
      >
        <span class="w-2 h-2 rounded-full border-2 border-current opacity-70 group-hover:opacity-100" />
        连接点
      </button>
      <button
        class="group px-3.5 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-medium transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-blue-500/25 hover:shadow-blue-500/40"
        @click="addNode('fixed')"
      >
        <span class="w-2 h-2 rounded-sm bg-white/90" />
        固定点
      </button>
      <button
        class="group px-3.5 py-1.5 text-xs rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-medium transition-all duration-200 flex items-center gap-1.5 shadow-md shadow-red-500/25 hover:shadow-red-500/40"
        @click="addNode('load')"
      >
        <span class="text-[10px]">▲</span>
        受力点
      </button>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-1.5">
      <button
        class="px-3 py-1.5 text-xs rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1.5"
        @click="triggerImport"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        导入方案
      </button>
      <button
        class="px-3 py-1.5 text-xs rounded-lg border border-slate-600/70 bg-slate-700/40 hover:bg-slate-600/60 text-slate-200 hover:text-white font-medium transition-all duration-200 flex items-center gap-1.5"
        @click="exportDesign"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 15V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M5 21h14" />
        </svg>
        导出方案
      </button>
      <div class="h-5 w-px bg-slate-600/60 mx-0.5" />
      <button
        class="px-3 py-1.5 text-xs rounded-lg bg-slate-600/70 hover:bg-slate-500 text-white font-medium transition-all duration-200 flex items-center gap-1.5"
        @click="clearAll"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        清空画布
      </button>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="handleFileImport"
    />
  </div>
</template>
