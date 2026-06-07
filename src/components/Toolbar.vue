<script setup lang="ts">
import { ref } from 'vue'
import type { NodeType } from '@/types/knot'
import { useKnotStore } from '@/stores/knot'
import type { DesignSchema } from '@/types/knot'

const store = useKnotStore()
const fileInput = ref<HTMLInputElement | null>(null)

function addNode(type: NodeType) {
  store.addNode(type, { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 })
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
        alert(`导入失败，存在 ${store.importErrors.length} 个错误\n\n${store.importErrors.map((e) => '- ' + e.message).join('\n')}`)
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
  <div class="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-2 shadow-sm">
    <div class="flex items-center gap-2 mr-4">
      <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">绳</div>
      <h1 class="text-lg font-semibold text-gray-800">绳结结构设计器</h1>
    </div>

    <div class="h-6 w-px bg-gray-300 mx-2" />

    <span class="text-xs text-gray-500 mr-2">添加节点:</span>
    <button
      class="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition"
      @click="addNode('junction')"
    >
      ○ 连接点
    </button>
    <button
      class="px-3 py-1.5 text-sm rounded-md bg-blue-700 text-white hover:bg-blue-800 transition"
      @click="addNode('fixed')"
    >
      ■ 固定点
    </button>
    <button
      class="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition"
      @click="addNode('load')"
    >
      ▲ 受力点
    </button>

    <div class="flex-1" />

    <button
      class="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition"
      @click="triggerImport"
    >
      ⬆ 导入方案
    </button>
    <button
      class="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition"
      @click="exportDesign"
    >
      ⬇ 导出方案
    </button>
    <button
      class="px-3 py-1.5 text-sm rounded-md bg-gray-600 text-white hover:bg-gray-700 transition"
      @click="clearAll"
    >
      清空画布
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="handleFileImport"
    />
  </div>
</template>
