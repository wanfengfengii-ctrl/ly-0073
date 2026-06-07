<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTutorialStore } from '@/stores/tutorial'
import { useKnotStore } from '@/stores/knot'
import { usePracticeEvaluator } from '@/composables/usePractice'

const tutorialStore = useTutorialStore()
const knotStore = useKnotStore()

const evaluator = usePracticeEvaluator()

const currentStep = computed(() => tutorialStore.currentStep)
const practiceTask = computed(() => currentStep.value?.practiceTask)
const isPracticeCompleted = computed(() => tutorialStore.isPracticeCompleted)
const practiceState = computed(() => tutorialStore.practiceState)
const storeFeedback = computed(() => tutorialStore.practiceFeedback)

watch(
  () => tutorialStore.currentStepIndex,
  () => {
    evaluator.clearTask()
  },
)

function startPractice() {
  if (!practiceTask.value) return
  evaluator.startTask(practiceTask.value)
  tutorialStore.startPractice()
}

function checkPractice() {
  if (!practiceTask.value) return
  const feedback = evaluator.evaluate(
    knotStore.nodes as any,
    knotStore.edges as any,
    knotStore.selectedNodeId,
    knotStore.selectedEdgeId,
  )
  tutorialStore.setPracticeFeedback(feedback, feedback.type === 'success')
}

function showHint() {
  evaluator.showHint()
  if (evaluator.state.value.feedback) {
    tutorialStore.setPracticeFeedback(evaluator.state.value.feedback, false)
  }
}

const displayFeedback = computed(() => storeFeedback.value || evaluator.state.value.feedback)
const displayState = computed(() => {
  if (practiceState.value.isActive) return practiceState.value
  return evaluator.state.value
})
</script>

<template>
  <div v-if="practiceTask" class="border-t border-gray-100 p-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <span class="text-xs font-bold text-slate-700">交互式练习</span>
        <span
          v-if="isPracticeCompleted"
          class="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold"
        >
          已通过
        </span>
      </div>
      <span v-if="displayState.attempts > 0" class="text-[10px] text-slate-500">
        尝试 {{ displayState.attempts }} 次
      </span>
    </div>

    <div class="bg-white rounded-xl border border-indigo-100 p-3 mb-3">
      <div class="text-sm text-slate-800 font-medium mb-1">任务</div>
      <p class="text-xs text-slate-600 leading-relaxed">{{ practiceTask.description }}</p>
    </div>

    <Transition name="feedback">
      <div
        v-if="displayFeedback"
        class="rounded-xl p-3 mb-3 text-xs"
        :class="{
          'bg-emerald-50 border border-emerald-200 text-emerald-800': displayFeedback.type === 'success',
          'bg-red-50 border border-red-200 text-red-800': displayFeedback.type === 'error',
          'bg-amber-50 border border-amber-200 text-amber-800': displayFeedback.type === 'hint',
          'bg-blue-50 border border-blue-200 text-blue-800': displayFeedback.type === 'info',
        }"
      >
        <div class="flex items-start gap-2">
          <svg
            v-if="displayFeedback.type === 'success'"
            class="w-4 h-4 mt-0.5 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <svg
            v-else-if="displayFeedback.type === 'error'"
            class="w-4 h-4 mt-0.5 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <svg
            v-else
            class="w-4 h-4 mt-0.5 flex-shrink-0"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div class="flex-1">
            <div class="font-semibold">{{ displayFeedback.message }}</div>
            <div v-if="displayFeedback.suggestions && displayFeedback.suggestions.length > 0" class="mt-1 space-y-0.5">
              <div v-for="(s, i) in displayFeedback.suggestions" :key="i" class="text-[11px] opacity-80">
                • {{ s }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div class="flex items-center gap-2">
      <button
        v-if="!displayState.isActive"
        @click="startPractice"
        class="flex-1 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg shadow-sm shadow-indigo-500/20 transition-all"
      >
        开始练习
      </button>
      <template v-else>
        <button
          @click="showHint"
          class="px-3 py-2 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          提示
        </button>
        <button
          @click="checkPractice"
          class="flex-1 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg shadow-sm shadow-emerald-500/20 transition-all flex items-center justify-center gap-1"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          检查答案
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.feedback-enter-active, .feedback-leave-active {
  transition: all 0.25s ease;
}
.feedback-enter-from, .feedback-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
