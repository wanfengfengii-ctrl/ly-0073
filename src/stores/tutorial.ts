import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tutorial, TutorialStep, TutorialProgress } from '@/types/tutorial'
import { PRESET_TUTORIALS } from '@/data/tutorials'

export const useTutorialStore = defineStore('tutorial', () => {
  const tutorials = ref<Tutorial[]>([...PRESET_TUTORIALS])
  const activeTutorialId = ref<string | null>(null)
  const currentStepIndex = ref(0)
  const isPlaying = ref(false)
  const playbackSpeed = ref(1)
  const showAnnotations = ref(true)
  const showForces = ref(true)
  const progressMap = ref<Map<string, TutorialProgress>>(new Map())
  let playbackTimer: ReturnType<typeof setInterval> | null = null

  const activeTutorial = computed<Tutorial | null>(() => {
    if (!activeTutorialId.value) return null
    return tutorials.value.find((t) => t.id === activeTutorialId.value) || null
  })

  const currentStep = computed<TutorialStep | null>(() => {
    if (!activeTutorial.value) return null
    return activeTutorial.value.steps[currentStepIndex.value] || null
  })

  const totalSteps = computed(() => {
    return activeTutorial.value?.steps.length || 0
  })

  const isFirstStep = computed(() => currentStepIndex.value <= 0)
  const isLastStep = computed(() => currentStepIndex.value >= totalSteps.value - 1)
  const progressPercent = computed(() => {
    if (totalSteps.value <= 0) return 0
    return ((currentStepIndex.value + 1) / totalSteps.value) * 100
  })

  const currentProgress = computed<TutorialProgress | null>(() => {
    if (!activeTutorialId.value) return null
    return progressMap.value.get(activeTutorialId.value) || null
  })

  const tutorialsByCategory = computed(() => {
    const map = new Map<string, Tutorial[]>()
    tutorials.value.forEach((t) => {
      const list = map.get(t.category) || []
      list.push(t)
      map.set(t.category, list)
    })
    return map
  })

  function setActiveTutorial(id: string) {
    const tutorial = tutorials.value.find((t) => t.id === id)
    if (!tutorial) return
    stopPlayback()
    activeTutorialId.value = id
    currentStepIndex.value = 0
    if (!progressMap.value.has(id)) {
      progressMap.value.set(id, {
        tutorialId: id,
        completedSteps: [],
        lastStepIndex: 0,
        startedAt: Date.now(),
      })
    }
  }

  function goToStep(index: number) {
    if (!activeTutorial.value) return
    const clamped = Math.max(0, Math.min(index, totalSteps.value - 1))
    currentStepIndex.value = clamped
    markStepProgress(clamped)
  }

  function nextStep() {
    if (isLastStep.value) {
      stopPlayback()
      return
    }
    goToStep(currentStepIndex.value + 1)
  }

  function prevStep() {
    if (isFirstStep.value) return
    goToStep(currentStepIndex.value - 1)
  }

  function markStepProgress(index: number) {
    if (!activeTutorialId.value || !activeTutorial.value) return
    const progress = progressMap.value.get(activeTutorialId.value)
    if (!progress) return
    const stepId = activeTutorial.value.steps[index]?.id
    if (stepId && !progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId)
    }
    progress.lastStepIndex = index
    if (index >= totalSteps.value - 1) {
      progress.completedAt = Date.now()
    }
  }

  function startPlayback() {
    if (isPlaying.value) return
    if (isLastStep.value) {
      currentStepIndex.value = 0
    }
    isPlaying.value = true
    const interval = 4000 / playbackSpeed.value
    playbackTimer = setInterval(() => {
      if (isLastStep.value) {
        stopPlayback()
        return
      }
      nextStep()
    }, interval)
  }

  function stopPlayback() {
    isPlaying.value = false
    if (playbackTimer) {
      clearInterval(playbackTimer)
      playbackTimer = null
    }
  }

  function togglePlayback() {
    if (isPlaying.value) {
      stopPlayback()
    } else {
      startPlayback()
    }
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = speed
    if (isPlaying.value) {
      stopPlayback()
      startPlayback()
    }
  }

  function toggleAnnotations() {
    showAnnotations.value = !showAnnotations.value
  }

  function toggleForces() {
    showForces.value = !showForces.value
  }

  function resetTutorial() {
    currentStepIndex.value = 0
    if (activeTutorialId.value) {
      progressMap.value.delete(activeTutorialId.value)
    }
  }

  function exitTutorial() {
    stopPlayback()
    activeTutorialId.value = null
    currentStepIndex.value = 0
  }

  function importTutorialFromCurrentDesign(name: string, steps: TutorialStep[], options?: Partial<Tutorial>): Tutorial {
    const tutorial: Tutorial = {
      id: `custom-${Date.now()}`,
      name,
      category: options?.category || '自定义教学',
      difficulty: options?.difficulty || 'beginner',
      description: options?.description || '自定义编结教学教程',
      estimatedTime: options?.estimatedTime || steps.length * 2,
      author: '我',
      createdAt: Date.now(),
      tags: options?.tags || ['自定义'],
      schema: {
        version: '2.0.0',
        name,
        nodes: steps[steps.length - 1]?.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })) || [],
        edges: steps[steps.length - 1]?.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: e.data,
        })) || [],
      },
      steps,
    }
    tutorials.value.push(tutorial)
    return tutorial
  }

  return {
    tutorials,
    activeTutorialId,
    currentStepIndex,
    isPlaying,
    playbackSpeed,
    showAnnotations,
    showForces,
    activeTutorial,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    progressPercent,
    currentProgress,
    tutorialsByCategory,
    setActiveTutorial,
    goToStep,
    nextStep,
    prevStep,
    startPlayback,
    stopPlayback,
    togglePlayback,
    setPlaybackSpeed,
    toggleAnnotations,
    toggleForces,
    resetTutorial,
    exitTutorial,
    importTutorialFromCurrentDesign,
  }
})
