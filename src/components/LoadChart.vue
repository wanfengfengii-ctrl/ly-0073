<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { useKnotStore } from '@/stores/knot'
import { MATERIALS, RISK_COLORS, RISK_LABELS } from '@/types/knot'

const store = useKnotStore()
const chartRef = ref<HTMLDivElement | null>(null)
const showSimulated = ref(true)
let chart: echarts.ECharts | null = null

const chartData = computed(() => {
  return store.edges.map((e) => {
    const mat = MATERIALS.find((m) => m.key === e.data?.material)
    const sourceNode = store.nodes.find((n) => n.id === e.source)
    const targetNode = store.nodes.find((n) => n.id === e.target)
    const label = `${sourceNode?.data?.label || '?'} → ${targetNode?.data?.label || '?'}`
    const fr = store.forceResults.get(e.id)
    const simulated = fr?.calculatedLoad ?? 0
    const displayLoad = showSimulated.value && simulated > 0 ? simulated : (e.data?.currentLoad || 0)
    const max = e.data?.maxLoad || 0
    const ratio = max > 0 ? displayLoad / max : 0
    const overloaded = ratio >= 1.0
    let riskLevel: 'safe' | 'warning' | 'danger' | 'critical' = 'safe'
    if (ratio >= 1.0) riskLevel = 'critical'
    else if (ratio >= 0.85) riskLevel = 'danger'
    else if (ratio >= 0.65) riskLevel = 'warning'
    return {
      id: e.id,
      label,
      material: mat?.label || e.data?.material || '',
      color: mat?.color || '#94a3b8',
      current: displayLoad,
      simulated,
      manual: e.data?.currentLoad || 0,
      max,
      overloaded,
      riskLevel,
    }
  })
})

function renderChart() {
  if (!chartRef.value || !chart) return

  const data = chartData.value

  if (data.length === 0) {
    chart.setOption({
      title: {
        text: '暂无数据',
        left: 'center',
        top: 'center',
        textStyle: { color: '#9ca3af', fontSize: 13, fontWeight: 'normal' },
      },
    })
    return
  }

  const option = {
    title: {
      text: showSimulated.value ? '各绳段受力分布 - 仿真值 (N)' : '各绳段受力分布 - 实际值 (N)',
      left: 0,
      top: 4,
      textStyle: { fontSize: 12, color: '#374151', fontWeight: 600 },
    },
    grid: { left: 80, right: 20, top: 36, bottom: 24, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params]
        if (items.length === 0) return ''
        const idx = items[0].dataIndex
        const d = data[idx]
        return `
          <div style="font-size:12px">
            <div style="font-weight:600;margin-bottom:4px">${d.label}</div>
            <div>材质: ${d.material}</div>
            <div>仿真受力: ${d.simulated.toFixed(2)} N</div>
            <div>实际受力: ${d.manual.toFixed(2)} N</div>
            <div>承重上限: ${d.max} N</div>
            <div>受力比: ${((d.current / d.max) * 100).toFixed(1)}%</div>
            <div style="color:${RISK_COLORS[d.riskLevel]};font-weight:600">
              ${RISK_LABELS[d.riskLevel]}${d.overloaded ? ' ⚠ 已超载' : ''}
            </div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
      axisLabel: { fontSize: 11, color: '#6b7280' },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#374151' },
      inverse: true,
    },
    series: [
      {
        name: '承重上限',
        type: 'bar',
        barGap: '-100%',
        barWidth: 14,
        itemStyle: { color: '#e5e7eb', borderRadius: 3 },
        emphasis: { disabled: true },
        data: data.map((d) => d.max),
        z: 1,
      },
      {
        name: '当前受力',
        type: 'bar',
        barWidth: 14,
        itemStyle: {
          borderRadius: 3,
          color: (p: any) => {
            const d = data[p.dataIndex]
            return RISK_COLORS[d.riskLevel]
          },
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: (p: any) => {
            const d = data[p.dataIndex]
            return RISK_COLORS[d.riskLevel]
          },
          formatter: (p: any) => {
            const d = data[p.dataIndex]
            const pct = ((p.value / d.max) * 100).toFixed(0)
            return d.overloaded ? `${p.value} ⚠ ${pct}%` : `${p.value} (${pct}%)`
          },
        },
        data: data.map((d) => Math.round(d.current * 100) / 100),
        z: 2,
      },
    ],
  }

  chart.setOption(option, true)
}

function handleResize() {
  chart?.resize()
}

function toggleDisplay() {
  showSimulated.value = !showSimulated.value
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    renderChart()
    window.addEventListener('resize', handleResize)
  }
})

watch(
  () => [store.edges.length, store.nodes.length, showSimulated.value, chartData.value.map((d) => `${d.current}-${d.max}-${d.simulated}`).join(',')],
  () => {
    renderChart()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<template>
  <div class="bg-white border-t border-gray-200 h-64 flex-shrink-0 flex flex-col">
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 bg-slate-50/50">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-1.5">
          <span
            v-for="(label, key) in RISK_LABELS"
            :key="key"
            class="flex items-center gap-1 text-[10px] text-slate-600"
          >
            <span
              class="w-2.5 h-2.5 rounded-sm"
              :style="{ background: RISK_COLORS[key as keyof typeof RISK_COLORS] }"
            />
            {{ label }}
          </span>
        </div>
      </div>
      <button
        class="px-2 py-0.5 text-[10px] rounded border text-slate-600 border-slate-300 hover:bg-slate-100 font-medium transition"
        @click="toggleDisplay"
      >
        {{ showSimulated ? '显示实际值' : '显示仿真值' }}
      </button>
    </div>
    <div ref="chartRef" class="w-full flex-1" />
  </div>
</template>
