export type NodeType = 'junction' | 'fixed' | 'load'

export type MaterialType = 'cotton' | 'nylon' | 'polyester' | 'hemp' | 'steel'

export type RiskLevel = 'safe' | 'warning' | 'danger' | 'critical'

export type HistoryActionType =
  | 'addNode'
  | 'removeNode'
  | 'updateNode'
  | 'addEdge'
  | 'removeEdge'
  | 'updateEdge'
  | 'clearAll'
  | 'import'
  | 'moveNode'

export interface MaterialInfo {
  key: MaterialType
  label: string
  color: string
  density: number
  costPerMeter: number
  breakingStrength: number
  safetyFactor: number
}

export interface KnotNodeData {
  label: string
  nodeType: NodeType
  loadForce?: number
  loadDirection?: 'down' | 'left' | 'right' | 'up'
  description?: string
}

export interface KnotEdgeData {
  material: MaterialType
  length: number
  maxLoad: number
  currentLoad: number
  diameter?: number
  cost?: number
}

export interface ValidationError {
  type: 'node' | 'edge' | 'general'
  targetId?: string
  message: string
  severity: 'error' | 'warning'
  code?: string
}

export interface ForceAnalysisResult {
  edgeId: string
  calculatedLoad: number
  loadRatio: number
  riskLevel: RiskLevel
  safetyMargin: number
  isOverloaded: boolean
  isCriticalPath: boolean
}

export interface SafetyAssessment {
  overallScore: number
  overallLevel: RiskLevel
  maxLoadRatio: number
  overloadedCount: number
  warningCount: number
  criticalEdges: string[]
  recommendation: string
}

export interface CostBreakdown {
  material: MaterialType
  label: string
  length: number
  unitCost: number
  totalCost: number
  weight: number
  color: string
}

export interface MaterialCostSummary {
  breakdown: CostBreakdown[]
  totalLength: number
  totalWeight: number
  totalCost: number
  estimatedLaborCost: number
  grandTotal: number
}

export interface DesignScheme {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  description?: string
  schema: DesignSchema
  analysis?: {
    safetyScore: number
    safetyLevel: RiskLevel
    totalCost: number
    totalWeight: number
    totalLength: number
    overloadedCount: number
  }
  tags?: string[]
}

export interface SchemeComparison {
  schemes: DesignScheme[]
  metrics: Array<{
    key: string
    label: string
    unit: string
    values: Record<string, number | string>
    bestId?: string
    worstId?: string
    lowerIsBetter?: boolean
  }>
}

export interface HistoryState {
  nodes: any[]
  edges: any[]
  counters: {
    junction: number
    fixed: number
    load: number
  }
  timestamp: number
}

export interface HistoryAction {
  id: string
  type: HistoryActionType
  description: string
  before: HistoryState
  after: HistoryState
}

export interface CriticalPathEdge {
  edgeId: string
  sourceLabel: string
  targetLabel: string
  load: number
  ratio: number
  riskLevel: RiskLevel
}

export interface CriticalPath {
  edges: CriticalPathEdge[]
  totalLoad: number
  avgRatio: number
  maxRatio: number
  overallRisk: RiskLevel
}

export interface DesignSchema {
  version: string
  name?: string
  description?: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: KnotNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    data: KnotEdgeData
  }>
  metadata?: {
    createdAt?: number
    updatedAt?: number
    author?: string
  }
}

export const MATERIALS: MaterialInfo[] = [
  { key: 'cotton', label: '棉绳', color: '#f5deb3', density: 0.8, costPerMeter: 2.5, breakingStrength: 2000, safetyFactor: 5 },
  { key: 'nylon', label: '尼龙', color: '#4169e1', density: 1.14, costPerMeter: 8.0, breakingStrength: 5000, safetyFactor: 7 },
  { key: 'polyester', label: '涤纶', color: '#32cd32', density: 1.38, costPerMeter: 6.5, breakingStrength: 4500, safetyFactor: 6 },
  { key: 'hemp', label: '麻绳', color: '#d2691e', density: 1.48, costPerMeter: 4.0, breakingStrength: 3000, safetyFactor: 5 },
  { key: 'steel', label: '钢丝绳', color: '#708090', density: 7.85, costPerMeter: 35.0, breakingStrength: 20000, safetyFactor: 8 },
]

export const RISK_COLORS: Record<RiskLevel, string> = {
  safe: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  critical: '#991b1b',
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  safe: '安全',
  warning: '警告',
  danger: '危险',
  critical: '严重危险',
}
