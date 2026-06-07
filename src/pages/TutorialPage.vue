<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

const difficultyConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  beginner: { label: '入门', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  intermediate: { label: '中级', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  advanced: { label: '高级', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
}

function goToDesigner() {
  store.exitTutorial()
  router.push('/')
}

function startTutorial(id: string) {
  store.setActiveTutorial(id)
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
          <h1 class="text-sm font-bold text-white leading-tight">绳结教学演示</h1>
          <p class="text-[10px] text-slate-400 leading-tight mt-0.5">Knot Tutorial Module · 分步编结引导</p>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex items-center gap-1.5">
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
        <div class="mb-6">
          <h2 class="text-xl font-bold text-gray-900 mb-1">选择教程</h2>
          <p class="text-sm text-gray-500">从预设教程中选择，开始学习绳结编结技巧</p>
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
                class="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer"
                @click="startTutorial(tut.id)"
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
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border"
                    :class="[difficultyConfig[tut.difficulty]?.bg || 'bg-gray-100 border-gray-200', difficultyConfig[tut.difficulty]?.color || 'text-gray-700']"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="difficultyConfig[tut.difficulty]?.dot || 'bg-gray-400'"></span>
                    {{ difficultyConfig[tut.difficulty]?.label || tut.difficulty }}
                  </span>
                </div>

                <h4 class="text-base font-bold text-gray-900 mb-1.5 group-hover:text-blue-600 transition-colors">
                  {{ tut.name }}
                </h4>
                <p class="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2 min-h-[2rem]">
                  {{ tut.description }}
                </p>

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
                  </div>
                  <span class="text-xs font-semibold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-1 transition-all inline-flex items-center gap-0.5">
                    开始学习
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </div>

                <div class="flex flex-wrap gap-1 mt-3">
                  <span
                    v-for="tag in tut.tags.slice(0, 3)"
                    :key="tag"
                    class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                  >
                    {{ tag }}
                  </span>
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
