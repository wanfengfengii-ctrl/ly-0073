import type { DesignSchema } from './knot'

export interface TutorialStepNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    nodeType: 'junction' | 'fixed' | 'load'
    loadForce?: number
    loadDirection?: 'down' | 'left' | 'right' | 'up'
    description?: string
  }
  highlighted?: boolean
  label?: string
}

export interface TutorialStepEdge {
  id: string
  source: string
  target: string
  type?: string
  data: {
    material: 'cotton' | 'nylon' | 'polyester' | 'hemp' | 'steel'
    length: number
    maxLoad: number
    currentLoad: number
    diameter?: number
    cost?: number
  }
  highlighted?: boolean
  animated?: boolean
}

export interface TutorialStep {
  id: string
  title: string
  description: string
  keyPoints: string[]
  warnings?: string[]
  nodes: TutorialStepNode[]
  edges: TutorialStepEdge[]
  highlightedNodeIds: string[]
  highlightedEdgeIds: string[]
  forceChanges?: Array<{
    edgeId: string
    before: number
    after: number
    description: string
  }>
  annotations?: Array<{
    id: string
    targetType: 'node' | 'edge'
    targetId: string
    text: string
    position?: { x: number; y: number }
  }>
  voiceScript?: string
  practiceTask?: TutorialPracticeTask
}

export interface TutorialPracticeTask {
  id: string
  type: 'addNode' | 'addEdge' | 'selectNode' | 'selectEdge' | 'arrangeNodes'
  description: string
  hint?: string
  targetState: {
    expectedNodes?: Array<{
      nodeType: 'junction' | 'fixed' | 'load'
      minCount?: number
      labels?: string[]
    }>
    expectedEdges?: Array<{
      sourceLabel?: string
      targetLabel?: string
      sourceNodeType?: string
      targetNodeType?: string
      minCount?: number
    }>
    selectedId?: string
  }
  successMessage: string
  errorMessages: Record<string, string>
}

export interface PracticeState {
  isActive: boolean
  currentTaskId: string | null
  attempts: number
  feedback: PracticeFeedback | null
  completed: boolean
}

export interface PracticeFeedback {
  type: 'success' | 'error' | 'hint' | 'info'
  message: string
  errorCode?: string
  suggestions?: string[]
}

export interface VoiceSettings {
  enabled: boolean
  rate: number
  pitch: number
  volume: number
  voiceName: string | null
}

export interface TutorialGenerationOptions {
  name: string
  description?: string
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  author?: string
  includeForceAnalysis?: boolean
  includeWarnings?: boolean
  estimatedTimePerStep?: number
  autoGenerateVoice?: boolean
  addPracticeSteps?: boolean
  granularity?: 'coarse' | 'medium' | 'fine'
}

export interface Tutorial {
  id: string
  name: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  description: string
  estimatedTime: number
  author?: string
  createdAt?: number
  updatedAt?: number
  tags: string[]
  schema: DesignSchema
  steps: TutorialStep[]
  version?: string
}

export interface TutorialState {
  tutorials: Tutorial[]
  activeTutorialId: string | null
  currentStepIndex: number
  isPlaying: boolean
  playbackSpeed: number
  showAnnotations: boolean
  showForces: boolean
  stepTransitionProgress: number
}

export interface TutorialProgress {
  tutorialId: string
  completedSteps: string[]
  lastStepIndex: number
  completedAt?: number
  startedAt: number
  practiceResults?: Record<string, {
    attempts: number
    passed: boolean
    completedAt: number
  }>
  totalPracticeAttempts?: number
  totalPracticePassed?: number
}

export interface TutorialImportResult {
  success: boolean
  tutorial?: Tutorial
  errors?: string[]
  warnings?: string[]
}

export interface GenerationStep {
  type: 'intro' | 'addNode' | 'addEdge' | 'cross' | 'tighten' | 'review'
  title: string
  description: string
  keyPoints: string[]
  warnings?: string[]
}
