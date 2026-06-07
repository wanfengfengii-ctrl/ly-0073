<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import { useKnotStore } from '@/stores/knot'
import { MATERIALS } from '@/types/knot'

const store = useKnotStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const chartData = computed(() => {
  return store.edges.map((e) => {
    const mat = MATERIALS.find((m) => m.key === e.data?.material)
    const sourceNode = store.nodes.find((n) => n.id === e.source)
    const targetNode = store.nodes.find((n) => n.id === e.target)
    const label = `${sourceNode?.data?.label || '?'} → ${targetNode?.data?.label || '?'}`
    return {
      id: e.id,
      label,
      material: mat?.label || e.data?.material || '',
      color: mat?.color || '#94a3b8',
      current: e.data?.currentLoad || 0,
      max: e.data?.maxLoad || 0,
      overloaded: (e.data?.currentLoad || 0) > (e.data?.maxLoad || 0),
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
      text: '各绳段受力分布 (N)',
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
            <div>当前受力: ${d.current} N</div>
            <div>承重上限: ${d.max} N</div>
            <div style="color:${d.overloaded ? '#dc2626' : '#059669'}">
              ${d.overloaded ? '⚠ 已超载' : '✓ 正常'}
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
            return d.overloaded ? '#dc2626' : d.color
          },
        },
        label: {
          show: true,
          position: 'right',
          fontSize: 11,
          color: (p: any) => {
            const d = data[p.dataIndex]
            return d.overloaded ? '#dc2626' : '#374151'
          },
          formatter: (p: any) => {
            const d = data[p.dataIndex]
            return d.overloaded ? `${p.value} ⚠` : `${p.value}`
          },
        },
        data: data.map((d) => d.current),
        z: 2,
      },
    ],
  }

  chart.setOption(option, true)
}

function handleResize() {
  chart?.resize()
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value)
    renderChart()
    window.addEventListener('resize', handleResize)
  }
})

watch(
  () => [store.edges.length, store.nodes.length, chartData.value.map((d) => `${d.current}-${d.max}`).join(',')],
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
  <div class="bg-white border-t border-gray-200 h-64 flex-shrink-0">
    <div ref="chartRef" class="w-full h-full" />
  </div>
</template>
