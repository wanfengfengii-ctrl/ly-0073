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
  tags: string[]
  schema: DesignSchema
  steps: TutorialStep[]
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
}
