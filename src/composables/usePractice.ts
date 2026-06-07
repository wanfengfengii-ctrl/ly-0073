import { ref, computed } from 'vue'
import type {
  TutorialPracticeTask,
  PracticeState,
  PracticeFeedback,
} from '@/types/tutorial'
import type { StoreKnotNode, StoreKnotEdge } from '@/stores/knot'

export function usePracticeEvaluator() {
  const state = ref<PracticeState>({
    isActive: false,
    currentTaskId: null,
    attempts: 0,
    feedback: null,
    completed: false,
  })

  const currentTask = ref<TutorialPracticeTask | null>(null)

  const isSuccess = computed(() => state.value.feedback?.type === 'success')
  const isError = computed(() => state.value.feedback?.type === 'error')

  function startTask(task: TutorialPracticeTask) {
    currentTask.value = task
    state.value = {
      isActive: true,
      currentTaskId: task.id,
      attempts: 0,
      feedback: null,
      completed: false,
    }
  }

  function clearTask() {
    currentTask.value = null
    state.value = {
      isActive: false,
      currentTaskId: null,
      attempts: 0,
      feedback: null,
      completed: false,
    }
  }

  function showHint() {
    if (!currentTask.value) return
    state.value.feedback = {
      type: 'hint',
      message: currentTask.value.hint || '请仔细观察图示中的高亮区域',
    }
  }

  function evaluate(
    nodes: StoreKnotNode[],
    edges: StoreKnotEdge[],
    selectedNodeId: string | null,
    selectedEdgeId: string | null,
  ): PracticeFeedback {
    if (!currentTask.value) {
      return { type: 'info', message: '暂无练习任务' }
    }
    state.value.attempts++
    const task = currentTask.value

    switch (task.type) {
      case 'addNode':
        return evaluateAddNode(task, nodes)
      case 'addEdge':
        return evaluateAddEdge(task, nodes, edges)
      case 'selectNode':
        return evaluateSelectNode(task, nodes, selectedNodeId)
      case 'selectEdge':
        return evaluateSelectEdge(task, edges, selectedEdgeId)
      case 'arrangeNodes':
        return evaluateArrangeNodes(task, nodes)
      default:
        return { type: 'info', message: '未知练习类型' }
    }
  }

  function evaluateAddNode(
    task: TutorialPracticeTask,
    nodes: StoreKnotNode[],
  ): PracticeFeedback {
    const expectations = task.targetState.expectedNodes || []
    for (const exp of expectations) {
      const matches = nodes.filter((n) => {
        if (exp.nodeType && n.data?.nodeType !== exp.nodeType) return false
        if (exp.labels && exp.labels.length > 0) {
          const lbl = n.data?.label || ''
          if (!exp.labels.includes(lbl)) return false
        }
        return true
      })
      if (matches.length < (exp.minCount ?? 1)) {
        const msg =
          task.errorMessages.NODE_NOT_FOUND ||
          `缺少${exp.nodeType ? nodeTypeLabel(exp.nodeType) : '指定'}节点`
        const feedback: PracticeFeedback = {
          type: 'error',
          message: msg,
          errorCode: 'NODE_NOT_FOUND',
          suggestions: [
            `请添加至少 ${exp.minCount ?? 1} 个${exp.nodeType ? nodeTypeLabel(exp.nodeType) : '符合条件的'}节点`,
            exp.labels ? `期望编号：${exp.labels.join('、')}` : '',
          ].filter(Boolean),
        }
        state.value.feedback = feedback
        return feedback
      }
    }
    const feedback: PracticeFeedback = {
      type: 'success',
      message: task.successMessage,
    }
    state.value.feedback = feedback
    state.value.completed = true
    return feedback
  }

  function evaluateAddEdge(
    task: TutorialPracticeTask,
    nodes: StoreKnotNode[],
    edges: StoreKnotEdge[],
  ): PracticeFeedback {
    const expectations = task.targetState.expectedEdges || []
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    for (const exp of expectations) {
      const matches = edges.filter((e) => {
        const src = nodeMap.get(e.source)
        const tgt = nodeMap.get(e.target)
        if (exp.sourceLabel && src?.data?.label !== exp.sourceLabel) return false
        if (exp.targetLabel && tgt?.data?.label !== exp.targetLabel) return false
        if (exp.sourceNodeType && src?.data?.nodeType !== exp.sourceNodeType) return false
        if (exp.targetNodeType && tgt?.data?.nodeType !== exp.targetNodeType) return false
        return true
      })
      if (matches.length < (exp.minCount ?? 1)) {
        const feedback: PracticeFeedback = {
          type: 'error',
          message: task.errorMessages.EDGE_NOT_FOUND || '缺少指定的绳段连接',
          errorCode: 'EDGE_NOT_FOUND',
          suggestions: [
            exp.sourceLabel && exp.targetLabel
              ? `请连接 ${exp.sourceLabel} 与 ${exp.targetLabel}`
              : '请按图示添加绳段',
          ],
        }
        state.value.feedback = feedback
        return feedback
      }
    }
    const feedback: PracticeFeedback = {
      type: 'success',
      message: task.successMessage,
    }
    state.value.feedback = feedback
    state.value.completed = true
    return feedback
  }

  function evaluateSelectNode(
    task: TutorialPracticeTask,
    nodes: StoreKnotNode[],
    selectedId: string | null,
  ): PracticeFeedback {
    if (!selectedId) {
      const feedback: PracticeFeedback = {
        type: 'error',
        message: '请先选择一个节点',
        errorCode: 'NO_SELECTION',
      }
      state.value.feedback = feedback
      return feedback
    }
    const expected = task.targetState.selectedId
    if (expected && selectedId !== expected) {
      const feedback: PracticeFeedback = {
        type: 'error',
        message: task.errorMessages.WRONG_SELECTION || '选择的节点不正确',
        errorCode: 'WRONG_SELECTION',
      }
      state.value.feedback = feedback
      return feedback
    }
    const feedback: PracticeFeedback = {
      type: 'success',
      message: task.successMessage,
    }
    state.value.feedback = feedback
    state.value.completed = true
    return feedback
  }

  function evaluateSelectEdge(
    task: TutorialPracticeTask,
    edges: StoreKnotEdge[],
    selectedId: string | null,
  ): PracticeFeedback {
    if (!selectedId) {
      const feedback: PracticeFeedback = {
        type: 'error',
        message: '请先选择一条绳段',
        errorCode: 'NO_SELECTION',
      }
      state.value.feedback = feedback
      return feedback
    }
    const expected = task.targetState.selectedId
    if (expected && selectedId !== expected) {
      const feedback: PracticeFeedback = {
        type: 'error',
        message: task.errorMessages.WRONG_SELECTION || '选择的绳段不正确',
        errorCode: 'WRONG_SELECTION',
      }
      state.value.feedback = feedback
      return feedback
    }
    const feedback: PracticeFeedback = {
      type: 'success',
      message: task.successMessage,
    }
    state.value.feedback = feedback
    state.value.completed = true
    return feedback
  }

  function evaluateArrangeNodes(
    task: TutorialPracticeTask,
    nodes: StoreKnotNode[],
  ): PracticeFeedback {
    const expectations = task.targetState.expectedNodes || []
    for (const exp of expectations) {
      const matches = nodes.filter((n) => n.data?.nodeType === exp.nodeType)
      if (matches.length < (exp.minCount ?? 1)) {
        const feedback: PracticeFeedback = {
          type: 'error',
          message: `节点数量不足，期望至少 ${exp.minCount ?? 1} 个${nodeTypeLabel(exp.nodeType)}`,
          errorCode: 'INSUFFICIENT_NODES',
        }
        state.value.feedback = feedback
        return feedback
      }
    }
    const feedback: PracticeFeedback = {
      type: 'success',
      message: task.successMessage,
    }
    state.value.feedback = feedback
    state.value.completed = true
    return feedback
  }

  return {
    state,
    currentTask,
    isSuccess,
    isError,
    startTask,
    clearTask,
    showHint,
    evaluate,
  }
}

function nodeTypeLabel(t: string): string {
  switch (t) {
    case 'fixed': return '固定点'
    case 'load': return '受力点'
    case 'junction': return '连接点'
    default: return '节点'
  }
}
