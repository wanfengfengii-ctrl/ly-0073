import type {
  ForceAnalysisResult,
  SafetyAssessment,
  CriticalPath,
  CriticalPathEdge,
  RiskLevel,
  MaterialCostSummary,
  CostBreakdown,
  MaterialType,
} from '@/types/knot'
import { MATERIALS, RISK_LABELS } from '@/types/knot'
import type { StoreKnotNode, StoreKnotEdge } from '@/stores/knot'

function getRiskLevel(ratio: number): RiskLevel {
  if (ratio >= 1.0) return 'critical'
  if (ratio >= 0.85) return 'danger'
  if (ratio >= 0.65) return 'warning'
  return 'safe'
}

export function calculateForces(
  nodes: StoreKnotNode[],
  edges: StoreKnotEdge[],
): Map<string, ForceAnalysisResult> {
  const results = new Map<string, ForceAnalysisResult>()
  const nodeMap = new Map<string, StoreKnotNode>()
  nodes.forEach((n) => nodeMap.set(n.id, n))

  const adjacency = new Map<string, Array<{ edgeId: string; nodeId: string }>>()
  nodes.forEach((n) => adjacency.set(n.id, []))
  edges.forEach((e) => {
    if (adjacency.has(e.source)) {
      adjacency.get(e.source)!.push({ edgeId: e.id, nodeId: e.target })
    }
    if (adjacency.has(e.target)) {
      adjacency.get(e.target)!.push({ edgeId: e.id, nodeId: e.source })
    }
  })

  const loadNodes = nodes.filter((n) => n.data?.nodeType === 'load')
  const fixedNodes = nodes.filter((n) => n.data?.nodeType === 'fixed')

  const edgeLoads = new Map<string, number>()

  if (loadNodes.length > 0 && fixedNodes.length > 0) {
    loadNodes.forEach((loadNode) => {
      const appliedForce = loadNode.data?.loadForce ?? 100
      const paths = findPathsToFixed(
        loadNode.id,
        new Set(fixedNodes.map((f) => f.id)),
        adjacency,
      )

      if (paths.length > 0) {
        const perPathForce = appliedForce / paths.length
        paths.forEach((path) => {
          path.forEach((edgeId) => {
            edgeLoads.set(edgeId, (edgeLoads.get(edgeId) || 0) + perPathForce)
          })
        })
      } else {
        const adjacent = adjacency.get(loadNode.id) || []
        if (adjacent.length > 0) {
          const perEdgeForce = appliedForce / adjacent.length
          adjacent.forEach(({ edgeId }) => {
            edgeLoads.set(edgeId, (edgeLoads.get(edgeId) || 0) + perEdgeForce)
          })
        }
      }
    })
  }

  edges.forEach((edge) => {
    const calculated = edgeLoads.get(edge.id) ?? edge.data?.currentLoad ?? 0
    const maxLoad = edge.data?.maxLoad ?? 1
    const ratio = maxLoad > 0 ? calculated / maxLoad : 0
    const riskLevel = getRiskLevel(ratio)
    const safetyMargin = maxLoad - calculated

    results.set(edge.id, {
      edgeId: edge.id,
      calculatedLoad: calculated,
      loadRatio: ratio,
      riskLevel,
      safetyMargin,
      isOverloaded: ratio >= 1.0,
      isCriticalPath: false,
    })
  })

  return results
}

function findPathsToFixed(
  startId: string,
  fixedIds: Set<string>,
  adjacency: Map<string, Array<{ edgeId: string; nodeId: string }>>,
  maxDepth: number = 10,
): string[][] {
  const paths: string[][] = []
  const visited = new Set<string>()

  function dfs(currentId: string, currentPath: string[], depth: number) {
    if (depth > maxDepth) return
    if (fixedIds.has(currentId) && currentPath.length > 0) {
      paths.push([...currentPath])
      return
    }
    const neighbors = adjacency.get(currentId) || []
    for (const { edgeId, nodeId } of neighbors) {
      const stateKey = `${nodeId}-${edgeId}`
      if (visited.has(stateKey)) continue
      if (currentPath.includes(edgeId)) continue
      visited.add(stateKey)
      currentPath.push(edgeId)
      dfs(nodeId, currentPath, depth + 1)
      currentPath.pop()
      visited.delete(stateKey)
    }
  }

  dfs(startId, [], 0)
  return paths
}

export function assessSafety(
  results: Map<string, ForceAnalysisResult>,
  edges: StoreKnotEdge[],
  nodes: StoreKnotNode[],
): SafetyAssessment {
  if (edges.length === 0) {
    return {
      overallScore: 100,
      overallLevel: 'safe',
      maxLoadRatio: 0,
      overloadedCount: 0,
      warningCount: 0,
      criticalEdges: [],
      recommendation: '请添加绳段和节点以构建结构',
    }
  }

  let maxRatio = 0
  let overloaded = 0
  let warning = 0
  let danger = 0
  const criticalEdges: string[] = []
  let totalScore = 0

  results.forEach((r) => {
    maxRatio = Math.max(maxRatio, r.loadRatio)
    if (r.isOverloaded) {
      overloaded++
      criticalEdges.push(r.edgeId)
    }
    if (r.riskLevel === 'warning') warning++
    if (r.riskLevel === 'danger' || r.riskLevel === 'critical') danger++
    const edgeScore = Math.max(0, 100 - r.loadRatio * 100)
    totalScore += edgeScore
  })

  const avgScore = results.size > 0 ? totalScore / results.size : 100
  const hasFixed = nodes.some((n) => n.data?.nodeType === 'fixed')
  const hasLoad = nodes.some((n) => n.data?.nodeType === 'load')
  const structurePenalty = (!hasFixed || !hasLoad) ? 15 : 0

  let overallScore = Math.max(0, Math.round(avgScore - structurePenalty - overloaded * 20 - danger * 10))
  let overallLevel: RiskLevel = 'safe'
  if (overloaded > 0 || maxRatio >= 1.0) overallLevel = 'critical'
  else if (danger > 0 || maxRatio >= 0.85) overallLevel = 'danger'
  else if (warning > 0 || maxRatio >= 0.65) overallLevel = 'warning'

  let recommendation = '结构安全，可正常使用'
  if (!hasFixed) recommendation = '缺少固定点，建议添加至少一个固定锚点'
  else if (!hasLoad) recommendation = '缺少受力点，建议添加受力载荷进行分析'
  else if (overloaded > 0) recommendation = `存在 ${overloaded} 处超载，请更换更坚固的材料或优化结构`
  else if (danger > 0) recommendation = '高风险绳段较多，建议降低载荷或升级材料'
  else if (warning > 0) recommendation = '部分绳段接近承重上限，建议关注'

  return {
    overallScore,
    overallLevel,
    maxLoadRatio: maxRatio,
    overloadedCount: overloaded,
    warningCount: warning,
    criticalEdges,
    recommendation,
  }
}

export function identifyCriticalPaths(
  nodes: StoreKnotNode[],
  edges: StoreKnotEdge[],
  forceResults: Map<string, ForceAnalysisResult>,
): CriticalPath[] {
  const nodeMap = new Map<string, StoreKnotNode>()
  nodes.forEach((n) => nodeMap.set(n.id, n))

  const edgeMap = new Map<string, StoreKnotEdge>()
  edges.forEach((e) => edgeMap.set(e.id, e))

  const adjacency = new Map<string, Array<{ edgeId: string; nodeId: string }>>()
  nodes.forEach((n) => adjacency.set(n.id, []))
  edges.forEach((e) => {
    if (adjacency.has(e.source)) {
      adjacency.get(e.source)!.push({ edgeId: e.id, nodeId: e.target })
    }
    if (adjacency.has(e.target)) {
      adjacency.get(e.target)!.push({ edgeId: e.id, nodeId: e.source })
    }
  })

  const loadNodes = nodes.filter((n) => n.data?.nodeType === 'load')
  const fixedIds = new Set(nodes.filter((n) => n.data?.nodeType === 'fixed').map((n) => n.id))

  const paths: CriticalPath[] = []

  loadNodes.forEach((loadNode) => {
    const foundPaths = findPathsToFixed(loadNode.id, fixedIds, adjacency, 15)
    foundPaths.forEach((edgeIds) => {
      const pathEdges: CriticalPathEdge[] = edgeIds
        .map((eid) => {
          const edge = edgeMap.get(eid)
          const result = forceResults.get(eid)
          if (!edge || !result) return null
          const sourceNode = nodeMap.get(edge.source)
          const targetNode = nodeMap.get(edge.target)
          return {
            edgeId: eid,
            sourceLabel: sourceNode?.data?.label || edge.source,
            targetLabel: targetNode?.data?.label || edge.target,
            load: result.calculatedLoad,
            ratio: result.loadRatio,
            riskLevel: result.riskLevel,
          }
        })
        .filter((e): e is CriticalPathEdge => e !== null)

      if (pathEdges.length > 0) {
        const totalLoad = pathEdges.reduce((s, e) => s + e.load, 0)
        const avgRatio = pathEdges.reduce((s, e) => s + e.ratio, 0) / pathEdges.length
        const maxRatio = Math.max(...pathEdges.map((e) => e.ratio))
        const overallRisk = getRiskLevel(maxRatio)

        paths.push({
          edges: pathEdges,
          totalLoad,
          avgRatio,
          maxRatio,
          overallRisk,
        })
      }
    })
  })

  paths.sort((a, b) => b.maxRatio - a.maxRatio)
  return paths.slice(0, 10)
}

export function getMaterialCostSummary(edges: StoreKnotEdge[]): MaterialCostSummary {
  const usage = new Map<MaterialType, number>()
  edges.forEach((e) => {
    if (!e.data) return
    const mat = e.data.material
    usage.set(mat, (usage.get(mat) || 0) + e.data.length)
  })

  const breakdown: CostBreakdown[] = []
  let totalLength = 0
  let totalWeight = 0
  let totalCost = 0

  usage.forEach((length, mat) => {
    const info = MATERIALS.find((m) => m.key === mat)
    if (info) {
      const weight = length * info.density
      const cost = length * info.costPerMeter
      breakdown.push({
        material: mat,
        label: info.label,
        length,
        unitCost: info.costPerMeter,
        totalCost: cost,
        weight,
        color: info.color,
      })
      totalLength += length
      totalWeight += weight
      totalCost += cost
    }
  })

  const estimatedLaborCost = edges.length > 0 ? Math.round(edges.length * 15 + totalLength * 0.5) : 0
  const grandTotal = totalCost + estimatedLaborCost

  return {
    breakdown,
    totalLength,
    totalWeight,
    totalCost,
    estimatedLaborCost,
    grandTotal,
  }
}

export function getRiskLabel(level: RiskLevel): string {
  return RISK_LABELS[level]
}
