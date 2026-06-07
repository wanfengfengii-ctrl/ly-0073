<script setup lang="ts">
import { computed } from 'vue'
import { useKnotStore } from '@/stores/knot'

const store = useKnotStore()

const nodeStats = computed(() => {
  const junctions = store.nodes.filter((n) => n.data?.nodeType === 'junction').length
  const fixeds = store.nodes.filter((n) => n.data?.nodeType === 'fixed').length
  const loads = store.nodes.filter((n) => n.data?.nodeType === 'load').length
  return { junctions, fixeds, loads, total: store.nodes.length }
})

const totalLength = computed(() => {
  return store.edges.reduce((sum, e) => sum + (e.data?.length || 0), 0)
})

const totalWeight = computed(() => {
  return store.materialUsage.reduce((sum, m) => sum + m.weight, 0)
})
</script>

<template>
  <div class="bg-white border-r border-gray-200 w-72 h-full overflow-y-auto flex flex-col">
    <div class="p-4 border-b border-gray-200">
      <h2 class="text-base font-semibold text-gray-800">结构信息</h2>
    </div>

    <div class="p-4 space-y-5 text-sm flex-shrink-0">
      <div>
        <h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">节点统计</h3>
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-gray-50 rounded-md p-2.5">
            <div class="text-xs text-gray-500">连接点</div>
            <div class="text-lg font-semibold text-gray-800">{{ nodeStats.junctions }}</div>
          </div>
          <div class="bg-blue-50 rounded-md p-2.5">
            <div class="text-xs text-blue-600">固定点</div>
            <div class="text-lg font-semibold text-blue-700">{{ nodeStats.fixeds }}</div>
          </div>
          <div class="bg-red-50 rounded-md p-2.5">
            <div class="text-xs text-red-600">受力点</div>
            <div class="text-lg font-semibold text-red-700">{{ nodeStats.loads }}</div>
          </div>
          <div class="bg-gray-100 rounded-md p-2.5">
            <div class="text-xs text-gray-500">绳段数</div>
            <div class="text-lg font-semibold text-gray-800">{{ store.edges.length }}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">材料使用</h3>
        <div v-if="store.materialUsage.length === 0" class="text-gray-400 text-xs py-2">
          暂无绳段数据
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="u in store.materialUsage"
            :key="u.material"
            class="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
          >
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-full"
                :style="{ background: u.color }"
              />
              <span class="text-gray-700">{{ u.label }}</span>
            </div>
            <div class="text-right">
              <div class="text-gray-800 font-medium">{{ u.length.toFixed(2) }} m</div>
              <div class="text-xs text-gray-500">{{ u.weight.toFixed(2) }} kg</div>
            </div>
          </div>
          <div class="pt-2 border-t border-gray-200 flex justify-between text-xs">
            <span class="text-gray-500">总长度</span>
            <span class="font-semibold text-gray-800">{{ totalLength.toFixed(2) }} m</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-500">总重量(估算)</span>
            <span class="font-semibold text-gray-800">{{ totalWeight.toFixed(2) }} kg</span>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 flex-1 overflow-y-auto">
      <div class="p-4">
        <h3 class="text-xs font-semibold text-gray-500 uppercase mb-2">校验结果</h3>
        <div v-if="store.validationErrors.length === 0" class="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-green-700 text-xs">
          ✓ 结构有效，未发现问题
        </div>
        <div v-else class="space-y-1.5">
          <div
            v-for="(err, idx) in store.validationErrors"
            :key="idx"
            class="text-xs px-2.5 py-1.5 rounded-md"
            :class="
              err.type === 'edge' && err.message.includes('超过承重上限')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : err.type === 'edge' && err.message.includes('悬空')
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            "
          >
            {{ err.message }}
          </div>
        </div>
      </div>

      <div v-if="store.overloadedEdges.length > 0" class="px-4 pb-4">
        <h3 class="text-xs font-semibold text-red-600 uppercase mb-2">超载绳段</h3>
        <div class="space-y-1.5">
          <div
            v-for="e in store.overloadedEdges"
            :key="e.id"
            class="text-xs bg-red-50 text-red-700 border border-red-200 rounded-md px-2.5 py-1.5"
          >
            <span class="font-medium">{{ e.id }}</span>
            受力 {{ e.data?.currentLoad }}N / 上限 {{ e.data?.maxLoad }}N
          </div>
        </div>
      </div>

      <div v-if="store.danglingEdges.length > 0" class="px-4 pb-4">
        <h3 class="text-xs font-semibold text-amber-600 uppercase mb-2">悬空绳段</h3>
        <div class="space-y-1.5">
          <div
            v-for="e in store.danglingEdges"
            :key="e.id"
            class="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2.5 py-1.5"
          >
            <span class="font-medium">{{ e.id }}</span>
            两端未完全连接
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
