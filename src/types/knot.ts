export type NodeType = 'junction' | 'fixed' | 'load'

export type MaterialType = 'cotton' | 'nylon' | 'polyester' | 'hemp' | 'steel'

export interface MaterialInfo {
  key: MaterialType
  label: string
  color: string
  density: number
}

export interface KnotNodeData {
  label: string
  nodeType: NodeType
}

export interface KnotEdgeData {
  material: MaterialType
  length: number
  maxLoad: number
  currentLoad: number
}

export interface ValidationError {
  type: 'node' | 'edge' | 'general'
  targetId?: string
  message: string
}

export interface DesignSchema {
  version: string
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
}

export const MATERIALS: MaterialInfo[] = [
  { key: 'cotton', label: '棉绳', color: '#f5deb3', density: 0.8 },
  { key: 'nylon', label: '尼龙', color: '#4169e1', density: 1.14 },
  { key: 'polyester', label: '涤纶', color: '#32cd32', density: 1.38 },
  { key: 'hemp', label: '麻绳', color: '#d2691e', density: 1.48 },
  { key: 'steel', label: '钢丝绳', color: '#708090', density: 7.85 },
]
