<script setup lang="ts">
import { computed, watch, ref, onMounted } from 'vue'
import { useTutorialStore } from '@/stores/tutorial'
import { useSpeech } from '@/composables/useSpeech'

const store = useTutorialStore()
const {
  isSupported: voiceIsSupported,
  settings: voiceSettings,
  isSpeaking: voiceIsSpeaking,
  availableVoices,
  speak,
  stop,
  setEnabled,
  setRate,
  setPitch,
  setVolume,
  setVoice,
  loadVoices,
} = useSpeech()

const activeTutorial = computed(() => store.activeTutorial)
const currentStep = computed(() => store.currentStep)
const currentStepIndex = computed(() => store.currentStepIndex)
const totalSteps = computed(() => store.totalSteps)
const isPlaying = computed(() => store.isPlaying)
const playbackSpeed = computed(() => store.playbackSpeed)
const progressPercent = computed(() => store.progressPercent)
const isFirstStep = computed(() => store.isFirstStep)
const isLastStep = computed(() => store.isLastStep)

const showVoicePanel = ref(false)

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

watch(
  () => store.currentStepIndex,
  () => {
    if (voiceSettings.value.enabled && currentStep.value?.voiceScript) {
      speak(currentStep.value.voiceScript)
    }
  },
)

onMounted(() => {
  loadVoices()
})

function toggleVoice() {
  setEnabled(!voiceSettings.value.enabled)
  if (!voiceSettings.value.enabled) {
    stop()
  }
}

function speakCurrent() {
  if (currentStep.value?.voiceScript) {
    speak(currentStep.value.voiceScript)
  } else if (currentStep.value) {
    speak(`${currentStep.value.title}。${currentStep.value.description}`)
  }
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
          <div class="relative">
            <button
              @click="showVoicePanel = !showVoicePanel"
              class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              :class="voiceSettings.enabled ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'"
              :title="voiceSettings.enabled ? '语音讲解已开启' : '开启语音讲解'"
            >
              <svg v-if="voiceSettings.enabled" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              语音
            </button>

            <Transition name="dropdown">
              <div v-if="showVoicePanel" class="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-20">
                <div class="flex items-center justify-between mb-3">
                  <div class="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    </svg>
                    语音讲解设置
                  </div>
                  <button @click="showVoicePanel = false" class="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>

                <div v-if="!voiceIsSupported" class="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
                  当前浏览器不支持语音合成功能
                </div>

                <template v-else>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-slate-600">启用语音</span>
                      <button
                        @click="toggleVoice"
                        class="w-10 h-5 rounded-full transition-colors relative"
                        :class="voiceSettings.enabled ? 'bg-indigo-500' : 'bg-slate-300'"
                      >
                        <span
                          class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                          :class="voiceSettings.enabled ? 'left-5' : 'left-0.5'"
                        />
                      </button>
                    </div>

                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-slate-600">语速</span>
                        <span class="text-xs text-slate-500 font-mono">{{ voiceSettings.rate.toFixed(1) }}x</span>
                      </div>
                      <input
                        type="range" min="0.5" max="2" step="0.1"
                        :value="voiceSettings.rate"
                        @input="(e) => setRate(parseFloat((e.target as HTMLInputElement).value))"
                        class="w-full accent-indigo-500"
                      />
                    </div>

                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-slate-600">音量</span>
                        <span class="text-xs text-slate-500 font-mono">{{ Math.round(voiceSettings.volume * 100) }}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        :value="voiceSettings.volume"
                        @input="(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))"
                        class="w-full accent-indigo-500"
                      />
                    </div>

                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-medium text-slate-600">音调</span>
                        <span class="text-xs text-slate-500 font-mono">{{ voiceSettings.pitch.toFixed(1) }}</span>
                      </div>
                      <input
                        type="range" min="0.5" max="2" step="0.1"
                        :value="voiceSettings.pitch"
                        @input="(e) => setPitch(parseFloat((e.target as HTMLInputElement).value))"
                        class="w-full accent-indigo-500"
                      />
                    </div>

                    <div v-if="availableVoices.length > 0">
                      <span class="text-xs font-medium text-slate-600 block mb-1">选择声音</span>
                      <select
                        :value="voiceSettings.voiceName || ''"
                        @change="(e) => setVoice((e.target as HTMLSelectElement).value || null)"
                        class="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">默认</option>
                        <option v-for="v in availableVoices" :key="v.name" :value="v.name">
                          {{ v.name }} ({{ v.lang }})
                        </option>
                      </select>
                    </div>

                    <button
                      @click="speakCurrent"
                      :disabled="voiceIsSpeaking"
                      class="w-full px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <svg v-if="voiceIsSpeaking" class="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      {{ voiceIsSpeaking ? '播放中...' : '试听当前步骤' }}
                    </button>
                  </div>
                </template>
              </div>
            </Transition>
          </div>

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

<style scoped>
.dropdown-enter-active, .dropdown-leave-active {
  transition: all 0.2s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
