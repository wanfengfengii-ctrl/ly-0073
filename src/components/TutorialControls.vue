<script setup lang="ts">
import { computed } from 'vue'
import { useTutorialStore } from '@/stores/tutorial'

const store = useTutorialStore()

const activeTutorial = computed(() => store.activeTutorial)
const currentStep = computed(() => store.currentStep)
const currentStepIndex = computed(() => store.currentStepIndex)
const totalSteps = computed(() => store.totalSteps)
const isPlaying = computed(() => store.isPlaying)
const playbackSpeed = computed(() => store.playbackSpeed)
const progressPercent = computed(() => store.progressPercent)
const isFirstStep = computed(() => store.isFirstStep)
const isLastStep = computed(() => store.isLastStep)

const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
]

const difficultyLabels: Record<string, { label: string; color: string; bg: string }> = {
  beginner: { label: '入门', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  intermediate: { label: '中级', color: 'text-amber-700', bg: 'bg-amber-100' },
  advanced: { label: '高级', color: 'text-red-700', bg: 'bg-red-100' },
}
</script>

<template>
  <div class="w-full bg-white border-t border-gray-200 px-6 py-3">
    <div v-if="activeTutorial" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
              :class="[difficultyLabels[activeTutorial.difficulty]?.color || 'text-gray-700', difficultyLabels[activeTutorial.difficulty]?.bg || 'bg-gray-100']"
            >
              {{ difficultyLabels[activeTutorial.difficulty]?.label || activeTutorial.difficulty }}
            </span>
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {{ activeTutorial.category }}
            </span>
          </div>
          <h3 class="font-bold text-gray-900 text-base truncate">
            {{ activeTutorial.name }}
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              v-for="opt in speedOptions"
              :key="opt.value"
              @click="store.setPlaybackSpeed(opt.value)"
              class="px-2 py-1 text-xs font-medium rounded-md transition-all"
              :class="playbackSpeed === opt.value ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            @click="store.resetTutorial"
            class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            title="重置教程"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            重置
          </button>
          <button
            @click="store.exitTutorial"
            class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            title="退出教程"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出
          </button>
        </div>
      </div>

      <div class="relative">
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="absolute top-0 left-0 right-0 flex justify-between px-0.5 -top-0.5">
          <div
            v-for="(_, idx) in totalSteps"
            :key="idx"
            class="w-2 h-2 rounded-full mt-0 -translate-y-0.5 transition-colors duration-300"
            :class="idx <= currentStepIndex ? 'bg-white' : 'bg-gray-300'"
            :style="{ boxShadow: idx <= currentStepIndex ? '0 0 0 1px rgba(59,130,246,0.5)' : 'none' }"
          />
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 font-mono">
            <span class="text-blue-600 font-bold">{{ currentStepIndex + 1 }}</span>
            <span class="mx-1">/</span>
            <span>{{ totalSteps }}</span>
          </span>
          <span v-if="currentStep" class="text-sm font-medium text-gray-800 truncate max-w-md">
            {{ currentStep.title }}
          </span>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            @click="store.goToStep(0)"
            :disabled="isFirstStep"
            class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            :class="isFirstStep ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
            title="回到开头"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>
          <button
            @click="store.prevStep"
            :disabled="isFirstStep"
            class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            :class="isFirstStep ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
            title="上一步"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            @click="store.togglePlayback"
            class="w-12 h-12 mx-1.5 rounded-full flex items-center justify-center shadow-md transition-all hover:shadow-lg"
            :class="isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'"
            :title="isPlaying ? '暂停' : '播放'"
          >
            <svg v-if="!isPlaying" class="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4" />
            </svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>

          <button
            @click="store.nextStep"
            :disabled="isLastStep"
            class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            :class="isLastStep ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
            title="下一步"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            @click="store.goToStep(totalSteps - 1)"
            :disabled="isLastStep"
            class="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            :class="isLastStep ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
            title="跳到最后"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        </div>

        <div class="text-sm text-gray-500 flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          预计 {{ activeTutorial.estimatedTime }} 分钟
        </div>
      </div>
    </div>
  </div>
</template>
