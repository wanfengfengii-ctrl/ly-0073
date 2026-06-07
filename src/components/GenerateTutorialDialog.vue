<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useKnotStore } from '@/stores/knot'
import { useTutorialStore } from '@/stores/tutorial'
import type { TutorialGenerationOptions } from '@/types/tutorial'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'generated', tutorialId: string): void
}>()

const router = useRouter()
const knotStore = useKnotStore()
const tutorialStore = useTutorialStore()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const name = ref('')
const description = ref('')
const category = ref('自定义教学')
const difficulty = ref<'beginner' | 'intermediate' | 'advanced'>('beginner')
const tagsStr = ref('')
const includeForceAnalysis = ref(true)
const includeWarnings = ref(true)
const autoGenerateVoice = ref(true)
const addPracticeSteps = ref(true)
const granularity = ref<'coarse' | 'medium' | 'fine'>('medium')
const estimatedTimePerStep = ref(2)
const generating = ref(false)
const generatedTutorialId = ref<string | null>(null)

const canGenerate = computed(() => {
  return knotStore.nodes.length > 0 && knotStore.edges.length > 0 && name.value.trim() !== ''
})

const hasErrors = computed(() => knotStore.hasBlockingErrors)

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      name.value = `我的绳结 - ${new Date().toLocaleDateString()}`
      description.value = ''
      tagsStr.value = ''
      generatedTutorialId.value = null
    }
  },
)

function close() {
  open.value = false
}

function generate() {
  if (!canGenerate.value) return
  generating.value = true
  try {
    const schema = knotStore.exportDesign()
    const tags = tagsStr.value
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const options: TutorialGenerationOptions = {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      category: category.value,
      difficulty: difficulty.value,
      tags: tags.length > 0 ? tags : undefined,
      author: '我',
      includeForceAnalysis: includeForceAnalysis.value,
      includeWarnings: includeWarnings.value,
      estimatedTimePerStep: estimatedTimePerStep.value,
      autoGenerateVoice: autoGenerateVoice.value,
      addPracticeSteps: addPracticeSteps.value,
      granularity: granularity.value,
    }
    const tutorial = tutorialStore.generateTutorialFromDesign(schema, options)
    generatedTutorialId.value = tutorial.id
    emit('generated', tutorial.id)
  } finally {
    generating.value = false
  }
}

function startTutorial() {
  if (!generatedTutorialId.value) return
  close()
  router.push('/tutorial')
  setTimeout(() => {
    tutorialStore.setActiveTutorial(generatedTutorialId.value!, false)
  }, 100)
}

function difficultyLabel(d: string) {
  switch (d) {
    case 'beginner': return { label: '入门', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    case 'intermediate': return { label: '中级', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
    case 'advanced': return { label: '高级', cls: 'bg-red-100 text-red-700 border-red-200' }
    default: return { label: d, cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="close"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-white to-purple-50">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  <circle cx="12" cy="9" r="2" />
                  <path d="M9 3v4" />
                  <path d="M15 3v4" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-800">一键生成教学教程</h3>
                <p class="text-[11px] text-slate-500">将当前设计的绳结结构自动拆分为分步教学流程</p>
              </div>
            </div>
            <button @click="close" class="text-slate-400 hover:text-slate-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            <div v-if="hasErrors" class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <svg class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div class="text-xs text-amber-800">
                当前设计存在错误，生成的教程可能不完整。建议先修正问题后再生成。
              </div>
            </div>

            <div v-if="!generatedTutorialId">
              <div class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">教程名称 <span class="text-red-500">*</span></label>
                  <input
                    v-model="name"
                    type="text"
                    placeholder="例如：我的八字结编结教学"
                    class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">教程描述</label>
                  <textarea
                    v-model="description"
                    rows="2"
                    placeholder="简要描述此绳结的用途和特点"
                    class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 resize-none"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">分类</label>
                    <select
                      v-model="category"
                      class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                    >
                      <option value="自定义教学">自定义教学</option>
                      <option value="基础绳结">基础绳结</option>
                      <option value="实用绳结">实用绳结</option>
                      <option value="攀登绳结">攀登绳结</option>
                      <option value="装饰绳结">装饰绳结</option>
                      <option value="工程绳结">工程绳结</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">难度</label>
                    <div class="flex gap-1.5">
                      <button
                        v-for="d in (['beginner', 'intermediate', 'advanced'] as const)"
                        :key="d"
                        @click="difficulty = d"
                        class="flex-1 px-2 py-2 text-xs font-semibold rounded-lg border transition-all"
                        :class="difficulty === d ? difficultyLabel(d).cls + ' ring-2 ring-offset-1 ring-indigo-300' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'"
                      >
                        {{ difficultyLabel(d).label }}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">标签（用逗号或空格分隔）</label>
                  <input
                    v-model="tagsStr"
                    type="text"
                    placeholder="例如：攀登, 救援, 基础"
                    class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                  />
                </div>

                <div class="pt-2 border-t border-slate-100">
                  <div class="text-xs font-semibold text-slate-600 mb-3">生成选项</div>
                  <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input v-model="includeForceAnalysis" type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" />
                      <div>
                        <div class="text-xs font-medium text-slate-700">受力分析</div>
                        <div class="text-[10px] text-slate-500">展示各绳段受力变化</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input v-model="includeWarnings" type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" />
                      <div>
                        <div class="text-xs font-medium text-slate-700">安全提示</div>
                        <div class="text-[10px] text-slate-500">自动生成风险警告</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input v-model="autoGenerateVoice" type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" />
                      <div>
                        <div class="text-xs font-medium text-slate-700">语音讲解</div>
                        <div class="text-[10px] text-slate-500">生成步骤语音脚本</div>
                      </div>
                    </label>
                    <label class="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input v-model="addPracticeSteps" type="checkbox" class="w-4 h-4 accent-indigo-600 rounded" />
                      <div>
                        <div class="text-xs font-medium text-slate-700">练习任务</div>
                        <div class="text-[10px] text-slate-500">添加交互式练习</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">步骤细分程度</label>
                    <select
                      v-model="granularity"
                      class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white"
                    >
                      <option value="coarse">粗略（较少步骤）</option>
                      <option value="medium">中等</option>
                      <option value="fine">精细（详细步骤）</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">每步预计时间（分钟）</label>
                    <input
                      v-model.number="estimatedTimePerStep"
                      type="number"
                      min="1"
                      max="10"
                      class="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8">
              <div class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
                <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h4 class="text-lg font-bold text-slate-800 mb-1">教程生成成功！</h4>
              <p class="text-sm text-slate-500 mb-5">已为你生成完整的分步教学流程</p>
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs text-slate-600">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                教程已添加到教学列表
              </div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div v-if="!generatedTutorialId" class="text-xs text-slate-500">
              当前设计：{{ knotStore.nodes.length }} 节点 · {{ knotStore.edges.length }} 绳段
            </div>
            <div v-else class="text-xs text-slate-500"></div>
            <div class="flex gap-2">
              <button
                v-if="!generatedTutorialId"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                v-if="!generatedTutorialId"
                @click="generate"
                :disabled="!canGenerate || generating"
                class="px-5 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
              >
                <svg v-if="generating" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round" />
                </svg>
                <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                {{ generating ? '生成中...' : '生成教程' }}
              </button>

              <template v-else>
                <button
                  @click="generatedTutorialId = null; name = ''"
                  class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  再生成一个
                </button>
                <button
                  @click="startTutorial"
                  class="px-5 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5"
                >
                  立即开始学习
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
