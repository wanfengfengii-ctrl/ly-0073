<script setup lang="ts">
import { computed } from 'vue'
import { useTutorialStore } from '@/stores/tutorial'

const store = useTutorialStore()

const activeTutorial = computed(() => store.activeTutorial)
const currentStep = computed(() => store.currentStep)
const currentStepIndex = computed(() => store.currentStepIndex)
const totalSteps = computed(() => store.totalSteps)
const showForces = computed(() => store.showForces)
</script>

<template>
  <div class="w-80 h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden">
    <div class="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <span class="text-sm font-bold text-gray-800">教学指导</span>
      </div>
      <div v-if="activeTutorial" class="text-xs text-gray-600 leading-relaxed">
        {{ activeTutorial.description }}
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="currentStep" class="p-5">
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold">
              {{ currentStepIndex + 1 }}
            </div>
            <h3 class="text-lg font-bold text-gray-900">
              {{ currentStep.title }}
            </h3>
          </div>
          <div class="ml-11 mt-2 text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-blue-200">
            {{ currentStep.description }}
          </div>
        </div>

        <div v-if="currentStep.keyPoints && currentStep.keyPoints.length > 0" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <h4 class="text-sm font-semibold text-gray-800">操作要点</h4>
          </div>
          <ul class="mt-2 space-y-2 ml-6">
            <li
              v-for="(point, idx) in currentStep.keyPoints"
              :key="idx"
              class="flex items-start gap-2 text-sm text-gray-700"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
              <span>{{ point }}</span>
            </li>
          </ul>
        </div>

        <div v-if="currentStep.warnings && currentStep.warnings.length > 0" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h4 class="text-sm font-semibold text-gray-800">注意事项</h4>
          </div>
          <div class="mt-2 ml-6 space-y-2">
            <div
              v-for="(warning, idx) in currentStep.warnings"
              :key="idx"
              class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
              <span>{{ warning }}</span>
            </div>
          </div>
        </div>

        <div v-if="showForces && currentStep.forceChanges && currentStep.forceChanges.length > 0" class="mb-6">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="m4.93 4.93 2.83 2.83" />
              <path d="m16.24 16.24 2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="m4.93 19.07 2.83-2.83" />
              <path d="m16.24 7.76 2.83-2.83" />
            </svg>
            <h4 class="text-sm font-semibold text-gray-800">受力变化</h4>
          </div>
          <div class="mt-2 ml-6 space-y-2">
            <div
              v-for="(fc, idx) in currentStep.forceChanges"
              :key="idx"
              class="bg-indigo-50 border border-indigo-200 rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-indigo-700 font-medium">绳段 {{ fc.edgeId }}</span>
              <span class="text-xs text-gray-500 font-mono">{{ fc.before }}N → {{ fc.after }}N</span>
              </div>
              <div class="w-full bg-indigo-100 rounded-full h-1.5 mt-1">
                <div
                  class="bg-indigo-500 h-1.5 rounded-full transition-all"
                  :style="{ width: `${Math.min(100, (fc.after / Math.max(1, fc.before || 1)) * 50)}%` }"
                ></div>
              </div>
              <div class="text-xs text-indigo-600 mt-1">{{ fc.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTutorial" class="border-t border-gray-100 p-4 bg-gray-50">
      <div class="flex items-center justify-between mb-3">
      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">步骤导航</h4>
      <span class="text-xs text-gray-400">{{ currentStepIndex + 1 }} / {{ totalSteps }}</span>
      </div>
      <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
        <button
          v-for="(step, idx) in activeTutorial.steps"
          :key="step.id"
          @click="store.goToStep(idx)"
          class="w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2"
          :class="[
            idx === currentStepIndex
              ? 'bg-blue-100 text-blue-800 font-medium'
              : idx < currentStepIndex
              ? 'text-gray-600 hover:bg-gray-100'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
          ]"
        >
          <div
            class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            :class="[
              idx === currentStepIndex
                ? 'bg-blue-500 text-white'
                : idx < currentStepIndex
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-500',
            ]"
          >
            <svg v-if="idx < currentStepIndex" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else>{{ idx + 1 }}</span>
          </div>
          <span class="truncate">{{ step.title.replace(/^第.+步：/, '') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
