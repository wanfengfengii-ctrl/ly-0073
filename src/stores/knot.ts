import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type {
  KnotNodeData,
  KnotEdgeData,
  NodeType,
  ValidationError,
  DesignSchema,
  MaterialType,
} from '@/types/knot'
import { MATERIALS } from '@/types/knot'

export interface StoreKnotNode {
  id: string
  type?: string
  position: { x: number; y: number }
  data: KnotNodeData
  [key: string]: any
}

export interface StoreKnotEdge {
  id: string
  source: string
  target: string
  type?: string
  data: KnotEdgeData
  [key: string]: any
}

export const useKnotStore = defineStore('knot', () => {
  const nodes = ref<StoreKnotNode[]>([])
  const edges = ref<StoreKnotEdge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const selectedEdgeId = ref<string | null>(null)
  const importErrors = ref<ValidationError[]>([])

  const junctionCounter = ref(0)
  const fixedCounter = ref(0)
  const loadCounter = ref(0)

  const selectedNode = computed<StoreKnotNode | null>(() => {
    const id = selectedNodeId.value
    if (!id) return null
    for (const n of nodes.value) {
      if (n.id === id) return n
    }
    return null
  })
  const selectedEdge = computed<StoreKnotEdge | null>(() => {
    const id = selectedEdgeId.value
    if (!id) return null
    for (const e of edges.value) {
      if (e.id === id) return e
    }
    return null
  })

  const overloadedEdges = computed(() =>
    edges.value.filter(
      (e) => e.data && e.data.currentLoad > e.data.maxLoad,
    ),
  )

  const danglingEdges = computed(() => {
    const nodeIds = new Set(nodes.value.map((n) => n.id))
    return edges.value.filter(
      (e) => !nodeIds.has(e.source) || !nodeIds.has(e.target),
    )
  })

  const duplicateJunctionLabels = computed(() => {
    const labels = new Map<string, number>()
    nodes.value
      .filter((n) => n.data?.nodeType === 'junction')
      .forEach((n) => {
        const label = n.data?.label || ''
        labels.set(label, (labels.get(label) || 0) + 1)
      })
    const dups: string[] = []
    labels.forEach((count, label) => {
      if (count > 1) dups.push(label)
    })
    return dups
  })

  const duplicateLabels = computed(() => {
    const labels = new Map<string, { count: number; types: string[] }>()
    nodes.value.forEach((n) => {
      const label = n.data?.label || ''
      const type = n.data?.nodeType || 'unknown'
      const existing = labels.get(label)
      if (existing) {
        existing.count++
        if (!existing.types.includes(type)) existing.types.push(type)
      } else {
        labels.set(label, { count: 1, types: [type] })
      }
    })
    const dups: Array<{ label: string; types: string[] }> = []
    labels.forEach((info, label) => {
      if (info.count > 1 && label.trim() !== '') dups.push({ label, types: info.types })
    })
    return dups
  })

  function isLabelDuplicate(label: string, excludeNodeId?: string): boolean {
    const trimmed = label.trim()
    if (!trimmed) return false
    for (const n of nodes.value) {
      if (excludeNodeId && n.id === excludeNodeId) continue
      if ((n.data?.label || '').trim() === trimmed) return true
    }
    return false
  }

  function typeLabel(type: string): string {
    if (type === 'junction') return '连接点'
    if (type === 'fixed') return '固定点'
    if (type === 'load') return '受力点'
    return '节点'
  }

  const validationErrors = computed<ValidationError[]>(() => {
    const errors: ValidationError[] = []
    duplicateLabels.value.forEach(({ label, types }) => {
      const typeNames = types.map((t) => typeLabel(t)).join('/')
      errors.push({
        type: 'node',
        message: `编号重复: ${label} (${typeNames})`,
      })
    })
    edges.value.forEach((e) => {
      if (!e.data) return
      if (e.data.length <= 0) {
        errors.push({
          type: 'edge',
          targetId: e.id,
          message: `绳段 ${e.id}: 长度必须大于零`,
        })
      }
      if (e.data.maxLoad <= 0) {
        errors.push({
          type: 'edge',
          targetId: e.id,
          message: `绳段 ${e.id}: 承重上限必须大于零`,
        })
      }
      if (e.data.currentLoad > e.data.maxLoad) {
        errors.push({
          type: 'edge',
          targetId: e.id,
          message: `绳段 ${e.id}: 当前受力 ${e.data.currentLoad} 超过承重上限 ${e.data.maxLoad}`,
        })
      }
    })
    danglingEdges.value.forEach((e) => {
      errors.push({
        type: 'edge',
        targetId: e.id,
        message: `绳段 ${e.id}: 悬空 (未连接两端节点)`,
      })
    })
    return errors
  })

  const materialUsage = computed(() => {
    const usage = new Map<MaterialType, number>()
    edges.value.forEach((e) => {
      if (!e.data) return
      const mat = e.data.material
      usage.set(mat, (usage.get(mat) || 0) + e.data.length)
    })
    const result: Array<{ material: MaterialType; label: string; length: number; weight: number; color: string }> = []
    usage.forEach((length, mat) => {
      const info = MATERIALS.find((m) => m.key === mat)
      if (info) {
        result.push({
          material: mat,
          label: info.label,
          length,
          weight: length * info.density,
          color: info.color,
        })
      }
    })
    return result
  })

  function addNode(type: NodeType, position: { x: number; y: number }) {
    let label = ''
    if (type === 'junction') {
      junctionCounter.value++
      label = `J${junctionCounter.value}`
    } else if (type === 'fixed') {
      fixedCounter.value++
      label = `F${fixedCounter.value}`
    } else if (type === 'load') {
      loadCounter.value++
      label = `L${loadCounter.value}`
    }
    const node: StoreKnotNode = {
      id: nanoid(8),
      type: 'knotNode',
      position,
      data: { label, nodeType: type },
    }
    nodes.value.push(node)
    return node
  }

  function updateNodePosition(id: string, position: { x: number; y: number }) {
    const node = nodes.value.find((n) => n.id === id)
    if (node) {
      node.position = position
    }
  }

  function updateNodeData(id: string, data: Partial<KnotNodeData>): boolean {
    const node = nodes.value.find((n) => n.id === id)
    if (!node || !node.data) return false
    if (data.label !== undefined) {
      const trimmed = data.label.trim()
      if (!trimmed) return false
      if (isLabelDuplicate(trimmed, id)) return false
      data.label = trimmed
    }
    node.data = { ...node.data, ...data }
    return true
  }

  function removeNode(id: string) {
    nodes.value = nodes.value.filter((n) => n.id !== id)
    edges.value = edges.value.filter(
      (e) => e.source !== id && e.target !== id,
    )
    if (selectedNodeId.value === id) selectedNodeId.value = null
  }

  function addEdge(source: string, target: string) {
    if (source === target) return null
    const exists = edges.value.some(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source),
    )
    if (exists) return null
    const edge: StoreKnotEdge = {
      id: nanoid(8),
      source,
      target,
      type: 'knotEdge',
      data: {
        material: 'nylon',
        length: 1,
        maxLoad: 100,
        currentLoad: 0,
      },
    }
    edges.value.push(edge)
    return edge
  }

  function updateEdgeData(id: string, data: Partial<KnotEdgeData>): boolean {
    const edge = edges.value.find((e) => e.id === id)
    if (!edge || !edge.data) return false
    if (data.length !== undefined) {
      if (typeof data.length !== 'number' || isNaN(data.length) || data.length <= 0) return false
    }
    if (data.maxLoad !== undefined) {
      if (typeof data.maxLoad !== 'number' || isNaN(data.maxLoad) || data.maxLoad <= 0) return false
    }
    if (data.currentLoad !== undefined) {
      if (typeof data.currentLoad !== 'number' || isNaN(data.currentLoad) || data.currentLoad < 0) return false
    }
    edge.data = { ...edge.data, ...data }
    return true
  }

  function removeEdge(id: string) {
    edges.value = edges.value.filter((e) => e.id !== id)
    if (selectedEdgeId.value === id) selectedEdgeId.value = null
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id
    selectedEdgeId.value = null
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id
    selectedNodeId.value = null
  }

  function clearSelection() {
    selectedNodeId.value = null
    selectedEdgeId.value = null
  }

  function clearAll() {
    nodes.value = []
    edges.value = []
    selectedNodeId.value = null
    selectedEdgeId.value = null
    junctionCounter.value = 0
    fixedCounter.value = 0
    loadCounter.value = 0
    importErrors.value = []
  }

  function validateDesign(schema: DesignSchema): ValidationError[] {
    const errors: ValidationError[] = []
    if (!schema || typeof schema !== 'object') {
      errors.push({ type: 'general', message: '方案格式无效' })
      return errors
    }
    if (!schema.version) {
      errors.push({ type: 'general', message: '缺少版本信息' })
    }
    if (!Array.isArray(schema.nodes)) {
      errors.push({ type: 'general', message: 'nodes 必须是数组' })
      return errors
    }
    if (!Array.isArray(schema.edges)) {
      errors.push({ type: 'general', message: 'edges 必须是数组' })
      return errors
    }

    const nodeIds = new Set<string>()
    const allLabels = new Map<string, { count: number; types: string[] }>()

    schema.nodes.forEach((n, idx) => {
      if (!n.id) {
        errors.push({ type: 'node', message: `节点[${idx}]: 缺少 id` })
      } else {
        if (nodeIds.has(n.id)) {
          errors.push({ type: 'node', targetId: n.id, message: `节点 ID 重复: ${n.id}` })
        }
        nodeIds.add(n.id)
      }
      if (!n.data || !n.data.nodeType) {
        errors.push({ type: 'node', targetId: n.id, message: `节点 ${n.id || idx}: 缺少类型` })
      }
      if (!n.position || typeof n.position.x !== 'number' || typeof n.position.y !== 'number') {
        errors.push({ type: 'node', targetId: n.id, message: `节点 ${n.id || idx}: 位置无效` })
      }
      if (n.data?.label && n.data?.nodeType) {
        const label = n.data.label.trim()
        const nt = n.data.nodeType
        const existing = allLabels.get(label)
        if (existing) {
          existing.count++
          if (!existing.types.includes(nt)) existing.types.push(nt)
        } else {
          allLabels.set(label, { count: 1, types: [nt] })
        }
      }
    })

    allLabels.forEach((info, label) => {
      if (info.count > 1) {
        const typeNames = info.types.map((t) => typeLabel(t)).join('/')
        errors.push({ type: 'node', message: `编号重复: ${label} (${typeNames})` })
      }
    })

    schema.edges.forEach((e, idx) => {
      if (!e.id) {
        errors.push({ type: 'edge', message: `绳段[${idx}]: 缺少 id` })
      }
      if (!e.source) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 缺少源节点` })
      } else if (!nodeIds.has(e.source)) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 源节点不存在: ${e.source}` })
      }
      if (!e.target) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 缺少目标节点` })
      } else if (!nodeIds.has(e.target)) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 目标节点不存在: ${e.target}` })
      }
      if (e.source === e.target) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 不能连接到自身` })
      }
      if (!e.data) {
        errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 缺少数据` })
      } else {
        if (typeof e.data.length !== 'number' || e.data.length <= 0) {
          errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 长度必须大于零` })
        }
        if (typeof e.data.maxLoad !== 'number' || e.data.maxLoad <= 0) {
          errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 承重上限必须大于零` })
        }
        if (typeof e.data.currentLoad !== 'number') {
          errors.push({ type: 'edge', targetId: e.id, message: `绳段 ${e.id || idx}: 当前受力无效` })
        }
      }
    })

    return errors
  }

  function exportDesign(): DesignSchema {
    return {
      version: '1.0.0',
      nodes: nodes.value.map((n) => ({
        id: n.id,
        type: n.type || 'knotNode',
        position: n.position,
        data: n.data as KnotNodeData,
      })),
      edges: edges.value.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data as KnotEdgeData,
      })),
    }
  }

  function importDesign(schema: DesignSchema): boolean {
    const errors = validateDesign(schema)
    if (errors.length > 0) {
      importErrors.value = errors
      return false
    }
    importErrors.value = []
    nodes.value = schema.nodes.map((n) => ({
      id: n.id,
      type: 'knotNode',
      position: n.position,
      data: n.data,
    }))
    edges.value = schema.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'knotEdge',
      data: e.data,
    }))

    const maxJ = Math.max(
      0,
      ...nodes.value
        .filter((n) => n.data?.nodeType === 'junction')
        .map((n) => parseInt((n.data?.label || 'J0').replace('J', ''), 10) || 0),
    )
    const maxF = Math.max(
      0,
      ...nodes.value
        .filter((n) => n.data?.nodeType === 'fixed')
        .map((n) => parseInt((n.data?.label || 'F0').replace('F', ''), 10) || 0),
    )
    const maxL = Math.max(
      0,
      ...nodes.value
        .filter((n) => n.data?.nodeType === 'load')
        .map((n) => parseInt((n.data?.label || 'L0').replace('L', ''), 10) || 0),
    )
    junctionCounter.value = maxJ
    fixedCounter.value = maxF
    loadCounter.value = maxL

    clearSelection()
    return true
  }

  function clearImportErrors() {
    importErrors.value = []
  }

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedEdge,
    overloadedEdges,
    danglingEdges,
    duplicateLabels,
    duplicateJunctionLabels,
    validationErrors,
    materialUsage,
    importErrors,
    isLabelDuplicate,
    addNode,
    updateNodePosition,
    updateNodeData,
    removeNode,
    addEdge,
    updateEdgeData,
    removeEdge,
    selectNode,
    selectEdge,
    clearSelection,
    clearAll,
    validateDesign,
    exportDesign,
    importDesign,
    clearImportErrors,
  }
})
