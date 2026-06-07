import { nanoid } from 'nanoid'
import type { DesignSchema, KnotNodeData, KnotEdgeData, RiskLevel } from '@/types/knot'
import { MATERIALS, RISK_LABELS } from '@/types/knot'
import type {
  Tutorial,
  TutorialStep,
  TutorialStepNode,
  TutorialStepEdge,
  TutorialGenerationOptions,
  TutorialPracticeTask,
} from '@/types/tutorial'

interface SchemaNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: KnotNodeData
}

interface SchemaEdge {
  id: string
  source: string
  target: string
  data: KnotEdgeData
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function nodeTypeLabel(t: string): string {
  switch (t) {
    case 'fixed': return '固定点'
    case 'load': return '受力点'
    case 'junction': return '连接点'
    default: return '节点'
  }
}

function materialLabel(m: string): string {
  const info = MATERIALS.find((x) => x.key === m)
  return info?.label || m
}

function getRiskLevel(edge: SchemaEdge): RiskLevel {
  if (!edge.data?.maxLoad) return 'safe'
  const ratio = edge.data.currentLoad / edge.data.maxLoad
  if (ratio >= 1.0) return 'critical'
  if (ratio >= 0.85) return 'danger'
  if (ratio >= 0.6) return 'warning'
  return 'safe'
}

function buildBuildOrder(nodes: SchemaNode[], edges: SchemaEdge[]): Array<{ kind: 'node' | 'edge'; id: string }> {
  const order: Array<{ kind: 'node' | 'edge'; id: string }> = []
  const addedNodes = new Set<string>()
  const addedEdges = new Set<string>()

  const fixedNodes = nodes.filter((n) => n.data?.nodeType === 'fixed')
  const loadNodes = nodes.filter((n) => n.data?.nodeType === 'load')
  const junctionNodes = nodes.filter((n) => n.data?.nodeType === 'junction')
  const otherNodes = nodes.filter(
    (n) => !['fixed', 'load', 'junction'].includes(n.data?.nodeType || ''),
  )

  for (const n of fixedNodes) {
    order.push({ kind: 'node', id: n.id })
    addedNodes.add(n.id)
  }
  for (const n of loadNodes) {
    order.push({ kind: 'node', id: n.id })
    addedNodes.add(n.id)
  }

  const remainingJunctions = [...junctionNodes]
  const remainingEdges = [...edges]

  while (remainingJunctions.length > 0 || remainingEdges.length > 0) {
    let progress = false

    for (let i = remainingJunctions.length - 1; i >= 0; i--) {
      const jn = remainingJunctions[i]
      const connectedEdges = remainingEdges.filter(
        (e) => e.source === jn.id || e.target === jn.id,
      )
      const connectable = connectedEdges.some(
        (e) => addedNodes.has(e.source) || addedNodes.has(e.target),
      )
      if (connectable || addedNodes.size >= 2) {
        order.push({ kind: 'node', id: jn.id })
        addedNodes.add(jn.id)
        remainingJunctions.splice(i, 1)
        progress = true
      }
    }

    for (let i = remainingEdges.length - 1; i >= 0; i--) {
      const e = remainingEdges[i]
      if (addedNodes.has(e.source) && addedNodes.has(e.target)) {
        order.push({ kind: 'edge', id: e.id })
        addedEdges.add(e.id)
        remainingEdges.splice(i, 1)
        progress = true
      }
    }

    if (!progress) {
      if (remainingJunctions.length > 0) {
        const jn = remainingJunctions.shift()!
        order.push({ kind: 'node', id: jn.id })
        addedNodes.add(jn.id)
      } else if (remainingEdges.length > 0) {
        const e = remainingEdges.shift()!
        if (!addedNodes.has(e.source)) {
          order.push({ kind: 'node', id: e.source })
          addedNodes.add(e.source)
        }
        if (!addedNodes.has(e.target)) {
          order.push({ kind: 'node', id: e.target })
          addedNodes.add(e.target)
        }
        order.push({ kind: 'edge', id: e.id })
        addedEdges.add(e.id)
      }
    }
  }

  for (const n of otherNodes) {
    if (!addedNodes.has(n.id)) {
      order.push({ kind: 'node', id: n.id })
      addedNodes.add(n.id)
    }
  }

  return order
}

function filterNodesEdges(
  allNodes: SchemaNode[],
  allEdges: SchemaEdge[],
  nodeIds: Set<string>,
  edgeIds: Set<string>,
): { nodes: TutorialStepNode[]; edges: TutorialStepEdge[] } {
  const nodes: TutorialStepNode[] = allNodes
    .filter((n) => nodeIds.has(n.id))
    .map((n) => ({
      id: n.id,
      type: n.type || 'knotNode',
      position: { ...n.position },
      data: deepClone(n.data),
    }))
  const edges: TutorialStepEdge[] = allEdges
    .filter((e) => edgeIds.has(e.id))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'knotEdge',
      data: deepClone(e.data),
    }))
  return { nodes, edges }
}

function buildAnnotations(
  nodes: TutorialStepNode[],
  edges: TutorialStepEdge[],
  highlightNodeIds: string[],
  highlightEdgeIds: string[],
  kind: 'node' | 'edge',
  lastItemId: string,
  allNodes: SchemaNode[],
): TutorialStep['annotations'] {
  const annotations: TutorialStep['annotations'] = []
  if (kind === 'node') {
    const n = nodes.find((x) => x.id === lastItemId)
    if (n) {
      annotations.push({
        id: `ann-${nanoid(6)}`,
        targetType: 'node',
        targetId: n.id,
        text: `新增${nodeTypeLabel(n.data.nodeType)}：${n.data.label}`,
      })
    }
  } else {
    const e = edges.find((x) => x.id === lastItemId)
    if (e) {
      const src = allNodes.find((n) => n.id === e.source)
      const tgt = allNodes.find((n) => n.id === e.target)
      if (src && tgt) {
        annotations.push({
          id: `ann-${nanoid(6)}`,
          targetType: 'edge',
          targetId: e.id,
          text: `连接 ${src.data.label} → ${tgt.data.label}`,
        })
      }
    }
  }
  if (highlightNodeIds.length > 0) {
    const main = nodes.find((x) => x.id === highlightNodeIds[0])
    if (main && !annotations.some((a) => a.targetId === main.id)) {
      annotations.push({
        id: `ann-hl-${nanoid(6)}`,
        targetType: 'node',
        targetId: main.id,
        text: '关注此节点',
      })
    }
  }
  return annotations
}

function buildPracticeTask(
  kind: 'node' | 'edge',
  allNodes: SchemaNode[],
  lastItemId: string,
  stepIndex: number,
): TutorialPracticeTask | undefined {
  if (kind === 'node') {
    const n = allNodes.find((x) => x.id === lastItemId)
    if (!n) return undefined
    const task: TutorialPracticeTask = {
      id: `practice-step-${stepIndex}`,
      type: 'addNode',
      description: `请在设计器中添加一个${nodeTypeLabel(n.data.nodeType)}节点（编号：${n.data.label}）`,
      hint: `点击工具栏的"${nodeTypeLabel(n.data.nodeType)}"按钮，然后在画布上放置`,
      targetState: {
        expectedNodes: [
          {
            nodeType: n.data.nodeType as 'junction' | 'fixed' | 'load',
            labels: [n.data.label],
            minCount: 1,
          },
        ],
      },
      successMessage: `很好！你已成功添加 ${nodeTypeLabel(n.data.nodeType)} ${n.data.label}`,
      errorMessages: {
        NODE_NOT_FOUND: `未找到 ${n.data.label} 节点，请添加对应类型的节点`,
        WRONG_TYPE: `节点类型不正确，应为${nodeTypeLabel(n.data.nodeType)}`,
      },
    }
    return task
  } else {
    const e = allNodes // placeholder
    if (!e) return undefined
    const task: TutorialPracticeTask = {
      id: `practice-step-${stepIndex}`,
      type: 'addEdge',
      description: '请按图示连接两个节点形成绳段',
      hint: '从一个节点拖拽到另一个节点以创建连接',
      targetState: {
        expectedEdges: [{ minCount: 1 }],
      },
      successMessage: '绳段连接成功！',
      errorMessages: {
        EDGE_NOT_FOUND: '请创建至少一条绳段连接',
      },
    }
    return task
  }
}

function buildForceChanges(
  prevEdges: TutorialStepEdge[],
  currEdges: TutorialStepEdge[],
): TutorialStep['forceChanges'] {
  const changes: TutorialStep['forceChanges'] = []
  const prevMap = new Map(prevEdges.map((e) => [e.id, e]))
  for (const e of currEdges) {
    const before = prevMap.get(e.id)?.data.currentLoad ?? 0
    const after = e.data.currentLoad
    if (Math.abs(after - before) > 0.01) {
      changes.push({
        edgeId: e.id,
        before,
        after,
        description:
          after > before
            ? `绳段受力增加 ${(after - before).toFixed(1)}N`
            : `绳段受力减少 ${(before - after).toFixed(1)}N`,
      })
    }
  }
  return changes
}

function buildVoiceScript(step: TutorialStep): string {
  const parts: string[] = []
  parts.push(step.title)
  parts.push(step.description)
  if (step.keyPoints && step.keyPoints.length > 0) {
    parts.push('操作要点：' + step.keyPoints.join('；'))
  }
  if (step.warnings && step.warnings.length > 0) {
    parts.push('注意事项：' + step.warnings.join('；'))
  }
  return parts.join('。')
}

export function generateTutorialFromSchema(
  schema: DesignSchema,
  options: TutorialGenerationOptions,
): Tutorial {
  const nodes = schema.nodes as unknown as SchemaNode[]
  const edges = schema.edges as unknown as SchemaEdge[]
  const buildOrder = buildBuildOrder(nodes, edges)

  const steps: TutorialStep[] = []
  const activeNodeIds = new Set<string>()
  const activeEdgeIds = new Set<string>()
  const prevStepEdges: TutorialStepEdge[] = []

  const introStep: TutorialStep = {
    id: `step-intro`,
    title: `教程介绍：${options.name || '自定义绳结'}`,
    description:
      options.description ||
      `本教程将演示${options.name || '此绳结结构'}的完整编结过程，包含节点布置、绳段连接和受力分析等内容。`,
    keyPoints: [
      '准备好所需的绳索和工具',
      '检查绳索是否有磨损或断丝',
      '预留足够的操作空间',
      '建议跟随步骤逐步操作',
    ],
    warnings: [
      '确保工作区域整洁，避免绳索绊倒',
      '操作前请阅读全部安全注意事项',
    ],
    nodes: [],
    edges: [],
    highlightedNodeIds: [],
    highlightedEdgeIds: [],
  }
  introStep.voiceScript = buildVoiceScript(introStep)
  steps.push(introStep)

  let stepCounter = 1
  for (const action of buildOrder) {
    if (action.kind === 'node') {
      activeNodeIds.add(action.id)
    } else {
      activeEdgeIds.add(action.id)
    }
    const { nodes: stepNodes, edges: stepEdges } = filterNodesEdges(
      nodes,
      edges,
      activeNodeIds,
      activeEdgeIds,
    )

    const titleN = action.kind === 'node' ? '添加节点' : '连接绳段'
    const lastItem =
      action.kind === 'node'
        ? nodes.find((n) => n.id === action.id)
        : edges.find((e) => e.id === action.id)

    let title = `第${stepCounter}步：${titleN}`
    let description = ''
    const keyPoints: string[] = []
    const warnings: string[] = []
    const highlightNodeIds: string[] = []
    const highlightEdgeIds: string[] = []

    if (action.kind === 'node' && lastItem) {
      const n = lastItem as SchemaNode
      const typeName = nodeTypeLabel(n.data.nodeType)
      title = `第${stepCounter}步：添加${typeName} ${n.data.label}`
      description = `在设计区域中添加新的${typeName}节点，编号为 ${n.data.label}。${n.data.description ? n.data.description : ''}`
      keyPoints.push(`类型：${typeName}`)
      keyPoints.push(`编号：${n.data.label}`)
      if (n.data.nodeType === 'load') {
        keyPoints.push(`设计载荷：${n.data.loadForce ?? 0}N`)
      }
      highlightNodeIds.push(n.id)
      if (n.data.nodeType === 'load') {
        warnings.push('受力点的载荷方向将影响力学分析结果')
      }
      if (n.data.nodeType === 'fixed') {
        warnings.push('固定点是整个结构的锚点，位置不可移动')
      }
    } else if (action.kind === 'edge' && lastItem) {
      const e = lastItem as SchemaEdge
      const src = nodes.find((n) => n.id === e.source)
      const tgt = nodes.find((n) => n.id === e.target)
      const mat = materialLabel(e.data.material)
      title = `第${stepCounter}步：连接绳段 ${src?.data.label ?? e.source} → ${tgt?.data.label ?? e.target}`
      description = `使用${mat}连接节点 ${src?.data.label ?? e.source} 和 ${tgt?.data.label ?? e.target}。`
      keyPoints.push(`材质：${mat}`)
      keyPoints.push(`绳段长度：${e.data.length}m`)
      keyPoints.push(`承重上限：${e.data.maxLoad}N`)
      highlightEdgeIds.push(e.id)

      const risk = getRiskLevel(e)
      if (risk !== 'safe') {
        warnings.push(`此绳段受力等级为"${RISK_LABELS[risk]}"，请注意检查`)
      }
      if (e.data.currentLoad > e.data.maxLoad * 0.8) {
        warnings.push('当前受力已接近或超过承重上限，存在安全风险')
      }
    }

    const annotations = buildAnnotations(
      stepNodes,
      stepEdges,
      highlightNodeIds,
      highlightEdgeIds,
      action.kind,
      action.id,
      nodes,
    )

    const forceChanges = buildForceChanges(prevStepEdges, stepEdges)

    const step: TutorialStep = {
      id: `step-${stepCounter}`,
      title,
      description,
      keyPoints,
      warnings: warnings.length > 0 ? warnings : undefined,
      nodes: stepNodes,
      edges: stepEdges,
      highlightedNodeIds: highlightNodeIds,
      highlightedEdgeIds: highlightEdgeIds,
      annotations,
      forceChanges: forceChanges.length > 0 ? forceChanges : undefined,
    }

    if (options.addPracticeSteps) {
      step.practiceTask = buildPracticeTask(
        action.kind,
        nodes,
        action.id,
        stepCounter,
      )
    }

    step.voiceScript = buildVoiceScript(step)
    steps.push(step)

    prevStepEdges.length = 0
    for (const e of stepEdges) prevStepEdges.push(deepClone(e))
    stepCounter++
  }

  const finalNodes = nodes.map((n) => ({
    id: n.id,
    type: n.type || 'knotNode',
    position: { ...n.position },
    data: deepClone(n.data),
  }))
  const finalEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'knotEdge',
    data: deepClone(e.data),
    highlighted: true,
  }))

  const reviewStep: TutorialStep = {
    id: `step-final`,
    title: `第${stepCounter}步：整理收紧与检查`,
    description:
      '对整个绳结结构进行整理和收紧，检查每个连接是否牢固，确认受力分布是否合理。',
    keyPoints: [
      '同时均匀用力收紧各绳段',
      '检查所有节点连接是否紧密',
      '确认绳结整体结构对称合理',
      '对关键受力点进行二次加固',
    ],
    warnings: [
      '切勿只拉一端，否则结形会变形',
      '收紧后应拉动两端测试牢固度',
      '发现异常受力应立即调整结构',
    ],
    nodes: finalNodes,
    edges: finalEdges,
    highlightedNodeIds: finalNodes.map((n) => n.id),
    highlightedEdgeIds: finalEdges.map((e) => e.id),
    annotations: finalNodes
      .filter((n) => n.data.nodeType !== 'junction')
      .map((n) => ({
        id: `ann-final-${n.id}`,
        targetType: 'node' as const,
        targetId: n.id,
        text: `${nodeTypeLabel(n.data.nodeType)}：${n.data.label}`,
      })),
  }
  reviewStep.voiceScript = buildVoiceScript(reviewStep)
  steps.push(reviewStep)

  const tutorial: Tutorial = {
    id: `gen-${Date.now()}-${nanoid(6)}`,
    name: options.name || '自定义绳结教程',
    category: options.category || '自定义教学',
    difficulty: options.difficulty || 'beginner',
    description:
      options.description ||
      `从设计器自动生成的教程：${options.name || '自定义绳结'}`,
    estimatedTime:
      steps.length * (options.estimatedTimePerStep ?? 2),
    author: options.author || '自动生成',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: options.tags?.length ? options.tags : ['自动生成', '自定义'],
    schema: deepClone(schema),
    steps,
    version: '1.0.0-smart',
  }

  return tutorial
}

export function validateTutorialForImport(data: unknown): {
  success: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  if (!data || typeof data !== 'object') {
    errors.push('教程数据格式无效')
    return { success: false, errors, warnings }
  }
  const obj = data as Record<string, any>
  if (!obj.id) errors.push('缺少教程 id')
  if (!obj.name) errors.push('缺少教程名称')
  if (!Array.isArray(obj.steps)) {
    errors.push('steps 必须是数组')
  } else if (obj.steps.length === 0) {
    warnings.push('教程步骤为空')
  }
  if (!obj.schema || typeof obj.schema !== 'object') {
    errors.push('缺少 schema 设计数据')
  }
  return { success: errors.length === 0, errors, warnings }
}
