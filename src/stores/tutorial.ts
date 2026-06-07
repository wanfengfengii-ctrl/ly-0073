import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  Tutorial,
  TutorialStep,
  TutorialProgress,
  TutorialGenerationOptions,
  TutorialImportResult,
  PracticeState,
  PracticeFeedback,
} from '@/types/tutorial'
import { PRESET_TUTORIALS } from '@/data/tutorials'
import { generateTutorialFromSchema, validateTutorialForImport } from '@/lib/tutorialGenerator'
import type { DesignSchema } from '@/types/knot'
import { nanoid } from 'nanoid'

const PROGRESS_STORAGE_KEY = 'knot-tutorial-progress'
const TUTORIALS_STORAGE_KEY = 'knot-custom-tutorials'

function loadProgressFromStorage(): Map<string, TutorialProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return new Map()
    const arr = JSON.parse(raw) as Array<[string, TutorialProgress]>
    return new Map(arr)
  } catch {
    return new Map()
  }
}

function saveProgressToStorage(map: Map<string, TutorialProgress>) {
  try {
    const arr = Array.from(map.entries())
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(arr))
  } catch {}
}

function loadCustomTutorialsFromStorage(): Tutorial[] {
  try {
    const raw = localStorage.getItem(TUTORIALS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Tutorial[]
  } catch {
    return []
  }
}

function saveCustomTutorialsToStorage(tutorials: Tutorial[]) {
  try {
    const custom = tutorials.filter((t) => t.id.startsWith('gen-') || t.id.startsWith('custom-'))
    localStorage.setItem(TUTORIALS_STORAGE_KEY, JSON.stringify(custom))
  } catch {}
}

export const useTutorialStore = defineStore('tutorial', () => {
  const customTutorials = ref<Tutorial[]>(loadCustomTutorialsFromStorage())
  const tutorials = ref<Tutorial[]>([...PRESET_TUTORIALS, ...customTutorials.value])
  const activeTutorialId = ref<string | null>(null)
  const currentStepIndex = ref(0)
  const isPlaying = ref(false)
  const playbackSpeed = ref(1)
  const showAnnotations = ref(true)
  const showForces = ref(true)

  const progressMap = ref<Map<string, TutorialProgress>>(loadProgressFromStorage())

  const practiceState = ref<PracticeState>({
    isActive: false,
    currentTaskId: null,
    attempts: 0,
    feedback: null,
    completed: false,
  })
  const practiceFeedback = ref<PracticeFeedback | null>(null)

  let playbackTimer: ReturnType<typeof setInterval> | null = null

  watch(progressMap, (val) => saveProgressToStorage(val), { deep: true })
  watch(tutorials, (val) => saveCustomTutorialsToStorage(val), { deep: true })

  const activeTutorial = computed<Tutorial | null>(() => {
    if (!activeTutorialId.value) return null
    return tutorials.value.find((t) => t.id === activeTutorialId.value) || null
  })

  const currentStep = computed<TutorialStep | null>(() => {
    if (!activeTutorial.value) return null
    return activeTutorial.value.steps[currentStepIndex.value] || null
  })

  const totalSteps = computed(() => activeTutorial.value?.steps.length || 0)
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

  const hasPracticeTask = computed(() => {
    return !!(currentStep.value && currentStep.value.practiceTask)
  })

  const isPracticeCompleted = computed(() => {
    if (!activeTutorialId.value || !currentStep.value) return false
    const stepId = currentStep.value.id
    const progress = progressMap.value.get(activeTutorialId.value)
    return !!(progress?.practiceResults?.[stepId]?.passed)
  })

  function setActiveTutorial(id: string, resumeProgress: boolean = true) {
    const tutorial = tutorials.value.find((t) => t.id === id)
    if (!tutorial) return
    stopPlayback()
    activeTutorialId.value = id
    const existingProgress = progressMap.value.get(id)
    if (resumeProgress && existingProgress) {
      const maxIndex = tutorial.steps.length - 1
      currentStepIndex.value = Math.min(Math.max(0, existingProgress.lastStepIndex), maxIndex)
    } else {
      currentStepIndex.value = 0
    }
    if (!existingProgress) {
      progressMap.value.set(id, {
        tutorialId: id,
        completedSteps: [],
        lastStepIndex: 0,
        startedAt: Date.now(),
        practiceResults: {},
        totalPracticeAttempts: 0,
        totalPracticePassed: 0,
      })
    }
    resetPracticeState()
  }

  function getProgressForTutorial(tutorialId: string) {
    const tutorial = tutorials.value.find((t) => t.id === tutorialId)
    if (!tutorial) return null
    const progress = progressMap.value.get(tutorialId)
    const total = tutorial.steps.length
    if (!progress) {
      return {
        totalSteps: total,
        completedSteps: 0,
        lastStepIndex: 0,
        percent: 0,
        isCompleted: false,
        hasStarted: false,
        practiceAttempts: 0,
        practicePassed: 0,
      }
    }
    const completedCount = progress.completedSteps.length
    return {
      totalSteps: total,
      completedSteps: completedCount,
      lastStepIndex: progress.lastStepIndex,
      percent: total > 0 ? (completedCount / total) * 100 : 0,
      isCompleted: !!progress.completedAt,
      hasStarted: completedCount > 0 || progress.lastStepIndex > 0,
      completedAt: progress.completedAt,
      practiceAttempts: progress.totalPracticeAttempts || 0,
      practicePassed: progress.totalPracticePassed || 0,
    }
  }

  function goToStep(index: number) {
    if (!activeTutorial.value) return
    const clamped = Math.max(0, Math.min(index, totalSteps.value - 1))
    currentStepIndex.value = clamped
    markStepProgress(clamped)
    resetPracticeState()
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
    if (isPlaying.value) stopPlayback()
    else startPlayback()
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
    stopPlayback()
    currentStepIndex.value = 0
    if (activeTutorialId.value) {
      progressMap.value.delete(activeTutorialId.value)
    }
    resetPracticeState()
  }

  function exitTutorial() {
    stopPlayback()
    activeTutorialId.value = null
    currentStepIndex.value = 0
    resetPracticeState()
  }

  function resetPracticeState() {
    practiceState.value = {
      isActive: false,
      currentTaskId: null,
      attempts: 0,
      feedback: null,
      completed: false,
    }
    practiceFeedback.value = null
  }

  function startPractice() {
    if (!currentStep.value?.practiceTask) return
    practiceState.value = {
      isActive: true,
      currentTaskId: currentStep.value.practiceTask.id,
      attempts: 0,
      feedback: null,
      completed: false,
    }
    practiceFeedback.value = null
  }

  function setPracticeFeedback(feedback: PracticeFeedback, passed: boolean) {
    practiceFeedback.value = feedback
    practiceState.value.feedback = feedback
    practiceState.value.attempts++
    if (passed) {
      practiceState.value.completed = true
      recordPracticeResult(true)
    } else {
      recordPracticeResult(false)
    }
  }

  function recordPracticeResult(passed: boolean) {
    if (!activeTutorialId.value || !currentStep.value) return
    let progress = progressMap.value.get(activeTutorialId.value)
    if (!progress) {
      progress = {
        tutorialId: activeTutorialId.value,
        completedSteps: [],
        lastStepIndex: 0,
        startedAt: Date.now(),
        practiceResults: {},
        totalPracticeAttempts: 0,
        totalPracticePassed: 0,
      }
      progressMap.value.set(activeTutorialId.value, progress)
    }
    if (!progress.practiceResults) progress.practiceResults = {}
    const stepId = currentStep.value.id
    const existing = progress.practiceResults[stepId]
    if (passed && !existing?.passed) {
      progress.practiceResults[stepId] = {
        attempts: practiceState.value.attempts,
        passed: true,
        completedAt: Date.now(),
      }
      progress.totalPracticePassed = (progress.totalPracticePassed || 0) + 1
    }
    progress.totalPracticeAttempts = (progress.totalPracticeAttempts || 0) + 1
  }

  function generateTutorialFromDesign(
    schema: DesignSchema,
    options: TutorialGenerationOptions,
  ): Tutorial {
    const tutorial = generateTutorialFromSchema(schema, options)
    tutorials.value.push(tutorial)
    return tutorial
  }

  function deleteTutorial(id: string) {
    tutorials.value = tutorials.value.filter((t) => t.id !== id)
    progressMap.value.delete(id)
    if (activeTutorialId.value === id) {
      exitTutorial()
    }
  }

  function updateTutorial(id: string, updates: Partial<Tutorial>) {
    const tut = tutorials.value.find((t) => t.id === id)
    if (tut) {
      Object.assign(tut, updates)
      tut.updatedAt = Date.now()
    }
  }

  function importTutorial(data: unknown): TutorialImportResult {
    const { success, errors, warnings } = validateTutorialForImport(data)
    if (!success) {
      return { success: false, errors, warnings }
    }
    const tutorial = data as Tutorial
    if (!tutorial.id) tutorial.id = `import-${Date.now()}-${nanoid(6)}`
    tutorial.updatedAt = Date.now()
    const existingIdx = tutorials.value.findIndex((t) => t.id === tutorial.id)
    if (existingIdx >= 0) {
      tutorials.value[existingIdx] = tutorial
    } else {
      tutorials.value.push(tutorial)
    }
    return { success: true, tutorial, warnings }
  }

  function exportTutorial(id: string): string | null {
    const tutorial = tutorials.value.find((t) => t.id === id)
    if (!tutorial) return null
    return JSON.stringify(tutorial, null, 2)
  }

  function importTutorialFromCurrentDesign(
    name: string,
    steps: TutorialStep[],
    options?: Partial<Tutorial>,
  ): Tutorial {
    const tutorial: Tutorial = {
      id: `custom-${Date.now()}`,
      name,
      category: options?.category || '自定义教学',
      difficulty: options?.difficulty || 'beginner',
      description: options?.description || '自定义编结教学教程',
      estimatedTime: options?.estimatedTime || steps.length * 2,
      author: '我',
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      version: '1.0.0',
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
    hasPracticeTask,
    isPracticeCompleted,
    practiceState,
    practiceFeedback,
    setActiveTutorial,
    getProgressForTutorial,
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
    startPractice,
    setPracticeFeedback,
    resetPracticeState,
    generateTutorialFromDesign,
    deleteTutorial,
    updateTutorial,
    importTutorial,
    exportTutorial,
    importTutorialFromCurrentDesign,
  }
})
