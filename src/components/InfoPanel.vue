<script setup lang="ts">
import { computed } from 'vue'
import { useKnotStore } from '@/stores/knot'
import { RISK_COLORS, RISK_LABELS } from '@/types/knot'

const store = useKnotStore()

const nodeStats = computed(() => {
  const junctions = store.nodes.filter((n) => n.data?.nodeType === 'junction').length
  const fixeds = store.nodes.filter((n) => n.data?.nodeType === 'fixed').length
  const loads = store.nodes.filter((n) => n.data?.nodeType === 'load').length
  return { junctions, fixeds, loads, total: store.nodes.length }
})

function errorLevelClass(type: string, msg: string, severity: string): string {
  if (severity === 'warning') {
    return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200/80'
  }
  if (type === 'edge' && msg.includes('超过承重上限')) {
    return 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border border-red-200/80'
  }
  if (type === 'edge' && msg.includes('悬空')) {
    return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200/80'
  }
  return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200/80'
}

const safety = computed(() => store.safetyAssessment)
const costs = computed(() => store.costSummary)
const criticalPaths = computed(() => store.criticalPaths)

const safetyScoreColor = computed(() => {
  const s = safety.value.overallScore
  if (s >= 85) return 'from-emerald-500 to-teal-500'
  if (s >= 65) return 'from-amber-500 to-orange-500'
  return 'from-red-500 to-rose-500'
})

const safetyScoreBg = computed(() => {
  const s = safety.value.overallScore
  if (s >= 85) return 'bg-emerald-50 border-emerald-200'
  if (s >= 65) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
})
</script>

<template>
  <div class="bg-gradient-to-b from-white to-slate-50 border-r border-slate-200 w-80 h-full overflow-y-auto flex flex-col shadow-sm">
    <div class="p-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-white">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold">◎</div>
        <h2 class="text-sm font-bold text-slate-700 tracking-wide">结构信息</h2>
      </div>
    </div>

    <div class="p-4 space-y-5 text-sm flex-shrink-0">
      <div>
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider">节点统计</h3>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200/70 shadow-sm">
            <div class="text-[10px] text-slate-500 font-medium mb-0.5">连接点</div>
            <div class="text-xl font-bold text-slate-700">{{ nodeStats.junctions }}</div>
          </div>
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200/70 shadow-sm">
            <div class="text-[10px] text-blue-600 font-medium mb-0.5">固定点</div>
            <div class="text-xl font-bold text-blue-700">{{ nodeStats.fixeds }}</div>
          </div>
          <div class="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-3 border border-red-200/70 shadow-sm">
            <div class="text-[10px] text-red-600 font-medium mb-0.5">受力点</div>
            <div class="text-xl font-bold text-red-700">{{ nodeStats.loads }}</div>
          </div>
          <div class="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200/70 shadow-sm">
            <div class="text-[10px] text-violet-600 font-medium mb-0.5">绳段数</div>
            <div class="text-xl font-bold text-violet-700">{{ store.edges.length }}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          安全评估
        </h3>
        <div :class="['rounded-xl p-4 border shadow-sm', safetyScoreBg]">
          <div class="flex items-center justify-between mb-3">
            <div>
              <div class="text-[10px] text-slate-500 font-medium">综合评分</div>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold" :class="safety.overallLevel === 'safe' ? 'text-emerald-700' : safety.overallLevel === 'warning' ? 'text-amber-700' : 'text-red-700'">
                  {{ safety.overallScore }}
                </span>
                <span class="text-xs text-slate-500">/ 100</span>
              </div>
            </div>
            <div
              class="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-md"
              :style="{ background: RISK_COLORS[safety.overallLevel] }"
            >
              {{ RISK_LABELS[safety.overallLevel] }}
            </div>
          </div>
          <div class="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
            <div
              class="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
              :class="safetyScoreColor"
              :style="{ width: safety.overallScore + '%' }"
            />
          </div>
          <div class="grid grid-cols-3 gap-2 mt-3 text-center">
            <div>
              <div class="text-[9px] text-slate-500 uppercase tracking-wide">最大受力比</div>
              <div class="text-sm font-bold" :class="safety.maxLoadRatio >= 1 ? 'text-red-700' : safety.maxLoadRatio >= 0.85 ? 'text-red-600' : safety.maxLoadRatio >= 0.65 ? 'text-amber-600' : 'text-slate-700'">
                {{ (safety.maxLoadRatio * 100).toFixed(0) }}%
              </div>
            </div>
            <div>
              <div class="text-[9px] text-slate-500 uppercase tracking-wide">超载</div>
              <div class="text-sm font-bold" :class="safety.overloadedCount > 0 ? 'text-red-600' : 'text-emerald-600'">
                {{ safety.overloadedCount }}
              </div>
            </div>
            <div>
              <div class="text-[9px] text-slate-500 uppercase tracking-wide">警告</div>
              <div class="text-sm font-bold" :class="safety.warningCount > 0 ? 'text-amber-600' : 'text-emerald-600'">
                {{ safety.warningCount }}
              </div>
            </div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-200/60">
            <div class="text-[11px] leading-relaxed" :class="safety.overallLevel === 'safe' ? 'text-emerald-700' : safety.overallLevel === 'warning' ? 'text-amber-700' : 'text-red-700'">
              💡 {{ safety.recommendation }}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider">材料 & 成本</h3>
        <div v-if="costs.breakdown.length === 0" class="bg-slate-50/50 rounded-xl border border-dashed border-slate-300 py-6 text-center">
          <div class="text-slate-300 text-2xl mb-1.5">📊</div>
          <div class="text-slate-400 text-xs">暂无绳段数据</div>
        </div>
        <div v-else class="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm divide-y divide-slate-100">
          <div
            v-for="u in costs.breakdown"
            :key="u.material"
            class="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="w-3.5 h-3.5 rounded-full shadow-inner border border-white ring-1 ring-slate-200"
                :style="{ background: u.color }"
              />
              <div>
                <span class="text-sm font-medium text-slate-700">{{ u.label }}</span>
                <div class="text-[10px] text-slate-400">¥{{ u.unitCost }}/m</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-semibold text-slate-800">{{ u.length.toFixed(2) }} m</div>
              <div class="text-[10px] text-slate-500">{{ u.weight.toFixed(2) }}kg · ¥{{ u.totalCost.toFixed(0) }}</div>
            </div>
          </div>
          <div class="bg-gradient-to-r from-slate-50 to-white px-3 py-3 space-y-1.5">
            <div class="flex justify-between items-center">
              <span class="text-[11px] text-slate-500 font-medium">总长度</span>
              <span class="text-sm font-bold text-slate-800">{{ costs.totalLength.toFixed(2) }} m</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[11px] text-slate-500 font-medium">材料费用</span>
              <span class="text-sm font-bold text-slate-800">¥{{ costs.totalCost.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[11px] text-slate-500 font-medium">估算人工</span>
              <span class="text-sm font-semibold text-slate-600">¥{{ costs.estimatedLaborCost.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center pt-2 mt-1 border-t border-slate-200/70">
              <span class="text-[11px] text-slate-600 font-bold uppercase">总成本</span>
              <span class="text-base font-bold text-emerald-700">¥{{ costs.grandTotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[11px] text-slate-500 font-medium">估算总重量</span>
              <span class="text-sm font-bold text-slate-800">{{ costs.totalWeight.toFixed(2) }} kg</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="criticalPaths.length > 0">
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-orange-500" />
          关键受力路径
        </h3>
        <div class="space-y-2.5">
          <div
            v-for="(path, pIdx) in criticalPaths.slice(0, 5)"
            :key="pIdx"
            class="bg-white rounded-xl border shadow-sm overflow-hidden"
            :class="
              path.overallRisk === 'critical' ? 'border-red-200' :
              path.overallRisk === 'danger' ? 'border-red-200/70' :
              path.overallRisk === 'warning' ? 'border-amber-200' :
              'border-slate-200'
            "
          >
            <div
              class="px-3 py-2 flex items-center justify-between text-[11px] font-medium"
              :class="
                path.overallRisk === 'critical' ? 'bg-red-50 text-red-700' :
                path.overallRisk === 'danger' ? 'bg-red-50/70 text-red-600' :
                path.overallRisk === 'warning' ? 'bg-amber-50 text-amber-700' :
                'bg-emerald-50 text-emerald-700'
              "
            >
              <span>路径 #{{ pIdx + 1 }} ({{ path.edges.length }}段)</span>
              <span>最大受力比 {{ (path.maxRatio * 100).toFixed(0) }}%</span>
            </div>
            <div class="px-3 py-2">
              <div class="flex flex-wrap items-center gap-1">
                <template v-for="(e, eIdx) in path.edges" :key="e.edgeId">
                  <span
                    class="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium"
                    :style="{
                      background: RISK_COLORS[e.riskLevel] + '20',
                      color: RISK_COLORS[e.riskLevel],
                      border: `1px solid ${RISK_COLORS[e.riskLevel]}40`,
                    }"
                  >
                    {{ e.sourceLabel }}→{{ e.targetLabel }}
                    <span class="ml-1 opacity-75">{{ (e.ratio * 100).toFixed(0) }}%</span>
                  </span>
                  <span v-if="eIdx < path.edges.length - 1" class="text-slate-300 text-[10px]">›</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-slate-200 flex-1 overflow-y-auto">
      <div class="p-4">
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider">校验结果</h3>
        <div v-if="store.validationErrors.length === 0" class="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-3.5 py-3 text-emerald-700 text-xs flex items-center gap-2 shadow-sm">
          <span class="text-emerald-500 text-base">✓</span>
          <span class="font-medium">结构有效，未发现问题</span>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(err, idx) in store.validationErrors"
            :key="idx"
            class="text-[11px] px-3 py-2 rounded-lg shadow-sm leading-snug"
            :class="errorLevelClass(err.type, err.message, err.severity)"
          >
            <span class="font-medium">
              {{ err.severity === 'warning' ? '⚠' : err.message.includes('悬空') ? '⚠' : err.message.includes('超过') ? '🚨' : '✕' }}
            </span>
            &nbsp;{{ err.message }}
          </div>
        </div>
      </div>

      <div v-if="store.overloadedEdges.length > 0" class="px-4 pb-4">
        <h3 class="text-[11px] font-bold text-red-600 uppercase mb-2.5 tracking-wider flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          超载绳段
        </h3>
        <div class="space-y-2">
          <div
            v-for="e in store.overloadedEdges"
            :key="e.id"
            class="text-[11px] bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <span class="font-mono font-semibold">{{ e.id }}</span>
            <span class="ml-2">
              受力 <span class="font-bold">{{ e.data?.currentLoad }}N</span>
              / 上限 {{ e.data?.maxLoad }}N
            </span>
          </div>
        </div>
      </div>

      <div v-if="store.danglingEdges.length > 0" class="px-4 pb-4">
        <h3 class="text-[11px] font-bold text-amber-600 uppercase mb-2.5 tracking-wider flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          悬空绳段
        </h3>
        <div class="space-y-2">
          <div
            v-for="e in store.danglingEdges"
            :key="e.id"
            class="text-[11px] bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <span class="font-mono font-semibold">{{ e.id }}</span>
            <span class="ml-2">两端未完全连接节点</span>
          </div>
        </div>
      </div>

      <div v-if="store.isolatedNodes.length > 0" class="px-4 pb-4">
        <h3 class="text-[11px] font-bold text-slate-500 uppercase mb-2.5 tracking-wider flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400" />
          孤立节点
        </h3>
        <div class="space-y-2">
          <div
            v-for="n in store.isolatedNodes"
            :key="n.id"
            class="text-[11px] bg-slate-50 text-slate-600 border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
          >
            <span class="font-mono font-semibold">{{ n.data?.label || n.id }}</span>
            <span class="ml-2 text-slate-500">未连接到任何绳段</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
