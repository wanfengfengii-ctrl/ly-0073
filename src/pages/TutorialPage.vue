<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTutorialStore } from '@/stores/tutorial'
import TutorialCanvas from '@/components/TutorialCanvas.vue'
import TutorialControls from '@/components/TutorialControls.vue'
import TutorialPanel from '@/components/TutorialPanel.vue'

const router = useRouter()
const store = useTutorialStore()

const activeTutorial = computed(() => store.activeTutorial)
const tutorials = computed(() => store.tutorials)
const categoryList = computed(() => {
  const result: Array<{ category: string; items: typeof tutorials.value }> = []
  store.tutorialsByCategory.forEach((items, category) => {
    result.push({ category, items })
  })
  return result
})

const importFileInput = ref<HTMLInputElement | null>(null)
const importResult = ref<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

const difficultyConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  beginner: { label: '入门', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  intermediate: { label: '中级', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  advanced: { label: '高级', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
}

function goToDesigner() {
  store.exitTutorial()
  router.push('/')
}

function startTutorial(id: string, resume: boolean = true) {
  store.setActiveTutorial(id, resume)
}

function getProgress(id: string) {
  return store.getProgressForTutorial(id)
}

function formatTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function isCustomTutorial(id: string) {
  return id.startsWith('gen-') || id.startsWith('custom-') || id.startsWith('import-')
}

function handleDelete(id: string, name: string, event: Event) {
  event.stopPropagation()
  if (!confirm(`确定要删除教程"${name}"吗？此操作无法撤销。`)) return
  store.deleteTutorial(id)
}

function handleExport(id: string, name: string, event: Event) {
  event.stopPropagation()
  const json = store.exportTutorial(id)
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = name.replace(/[^\w\u4e00-\u9fa5-]/g, '_')
  a.download = `knot-tutorial-${safeName}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  importFileInput.value?.click()
}

function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      const result = store.importTutorial(data)
      if (result.success) {
        importResult.value = {
          type: 'success',
          message: `导入成功：${result.tutorial?.name || '教程'}`,
        }
      } else {
        importResult.value = {
          type: 'error',
          message: `导入失败：${result.errors?.join('；') || '未知错误'}`,
        }
      }
      if (result.warnings && result.warnings.length > 0) {
        importResult.value = {
          type: 'warning',
          message: `导入完成，警告：${result.warnings.join('；')}`,
        }
      }
      setTimeout(() => (importResult.value = null), 4000)
    } catch {
      importResult.value = { type: 'error', message: '文件解析失败：不是有效的 JSON 文件' }
      setTimeout(() => (importResult.value = null), 4000)
    }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gray-50">
    <div class="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-3 flex items-center gap-3 shadow-lg border-b border-indigo-900/50">
      <div class="flex items-center gap-2">
        <button
          @click="goToDesigner"
          class="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
          title="返回设计器"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-400 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div>
          <h1 class="text-sm font-bold text-white leading-tight">绳结智能教学系统</h1>
          <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Smart Knot Tutorial · 设计 + 转教程 + 演示 + 训练 + 复盘</p>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-1.5">
        <div class="relative">
          <button
            @click="triggerImport"
            class="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1.5"
            title="导入教程 JSON"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            导入教程
          </button>
          <input
            ref="importFileInput"
            type="file"
            accept="application/json,.json"
            class="hidden"
            @change="handleFileImport"
          />
          <Transition name="fade">
            <div
              v-if="importResult"
              class="absolute -bottom-8 right-0 px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap shadow-lg"
              :class="{
                'bg-emerald-500 text-white': importResult.type === 'success',
                'bg-red-500 text-white': importResult.type === 'error',
                'bg-amber-500 text-white': importResult.type === 'warning',
              }"
            >
              {{ importResult.message }}
            </div>
          </Transition>
        </div>

        <button
          v-if="activeTutorial"
          @click="store.exitTutorial"
          class="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
          返回教程列表
        </button>
      </div>
    </div>

    <div v-if="!activeTutorial" class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto p-6">
        <div class="mb-6 flex items-end justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900 mb-1">教程管理中心</h2>
            <p class="text-sm text-gray-500">选择预设教程，或从设计器生成自定义教程，也可导入外部教程文件</p>
          </div>
          <button
            @click="goToDesigner"
            class="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            前往设计器生成新教程
          </button>
        </div>

        <div v-if="tutorials.length === 0" class="bg-white rounded-2xl border border-dashed border-gray-300 p-16 text-center">
          <div class="text-5xl mb-3">📚</div>
          <div class="text-gray-500">暂无可用教程</div>
        </div>

        <div v-else>
          <div v-for="cat in categoryList" :key="cat.category" class="mb-8">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
              <h3 class="text-base font-bold text-gray-800">{{ cat.category }}</h3>
              <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{{ cat.items.length }} 个教程</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="tut in cat.items"
                :key="tut.id"
                class="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M6 4h4v16H6z" />
                      <path d="M14 4h4v10h-4z" />
                      <path d="M10 12h4" />
                      <path d="M10 8h4" />
                      <path d="M16 18h4v2h-4z" />
                    </svg>
                  </div>
                  <div class="flex items-center gap-1">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border"
                      :class="[difficultyConfig[tut.difficulty]?.bg || 'bg-gray-100 border-gray-200', difficultyConfig[tut.difficulty]?.color || 'text-gray-700']"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="difficultyConfig[tut.difficulty]?.dot || 'bg-gray-400'"></span>
                      {{ difficultyConfig[tut.difficulty]?.label || tut.difficulty }}
                    </span>
                  </div>
                </div>

                <div
                  class="cursor-pointer"
                  @click="startTutorial(tut.id)"
                >
                  <h4 class="text-base font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                    {{ tut.name }}
                  </h4>
                  <p class="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2 min-h-[2rem]">
                    {{ tut.description }}
                  </p>
                </div>

                <div v-if="getProgress(tut.id) && (getProgress(tut.id)!.hasStarted || getProgress(tut.id)!.isCompleted)" class="mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span
                      class="text-[11px] font-semibold inline-flex items-center gap-1"
                      :class="getProgress(tut.id)!.isCompleted ? 'text-emerald-600' : 'text-blue-600'"
                    >
                      <svg v-if="getProgress(tut.id)!.isCompleted" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {{ getProgress(tut.id)!.isCompleted ? '已完成' : `学习中 · 第 ${getProgress(tut.id)!.lastStepIndex + 1} / ${getProgress(tut.id)!.totalSteps} 步` }}
                    </span>
                    <span class="text-[11px] text-gray-500 font-mono">
                      {{ Math.round(getProgress(tut.id)!.percent) }}%
                    </span>
                  </div>
                  <div class="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="getProgress(tut.id)!.isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'"
                      :style="{ width: `${getProgress(tut.id)!.percent}%` }"
                    ></div>
                  </div>
                  <div v-if="(getProgress(tut.id)!.practiceAttempts || 0) > 0" class="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    <span class="flex items-center gap-0.5">
                      <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="22 3 9 17 4 12" />
                      </svg>
                      练习 {{ getProgress(tut.id)!.practicePassed || 0 }}/{{ getProgress(tut.id)!.practiceAttempts || 0 }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div class="flex items-center gap-3 text-[11px] text-gray-500">
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {{ tut.estimatedTime }}分钟
                    </span>
                    <span class="flex items-center gap-1">
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      {{ tut.steps.length }}步
                    </span>
                    <span v-if="tut.updatedAt" class="text-gray-400">
                      {{ formatTime(tut.updatedAt) }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in tut.tags.slice(0, 3)"
                      :key="tag"
                      class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      v-if="isCustomTutorial(tut.id)"
                      class="w-7 h-7 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors"
                      title="导出教程"
                      @click="(e) => handleExport(tut.id, tut.name, e)"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 15V3" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                      </svg>
                    </button>
                    <button
                      v-if="isCustomTutorial(tut.id)"
                      class="w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      title="删除教程"
                      @click="(e) => handleDelete(tut.id, tut.name, e)"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                    <button
                      class="text-xs font-semibold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all inline-flex items-center gap-0.5"
                      @click="(e) => { e.stopPropagation(); startTutorial(tut.id) }"
                    >
                      <template v-if="getProgress(tut.id)?.isCompleted">重新学习</template>
                      <template v-else-if="getProgress(tut.id)?.hasStarted">继续学习</template>
                      <template v-else>开始学习</template>
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 flex overflow-hidden">
        <TutorialPanel />
        <div class="flex-1 flex flex-col overflow-hidden">
          <TutorialCanvas />
        </div>
      </div>
      <TutorialControls />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
