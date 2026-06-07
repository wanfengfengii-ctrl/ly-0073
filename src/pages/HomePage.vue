<script setup lang="ts">
import Toolbar from '@/components/Toolbar.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import KnotCanvas from '@/components/KnotCanvas.vue'
import LoadChart from '@/components/LoadChart.vue'
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-gray-50">
    <Toolbar />
    <div class="flex-1 flex overflow-hidden">
      <InfoPanel />
      <div class="flex-1 flex flex-col overflow-hidden">
        <KnotCanvas />
        <LoadChart />
      </div>
      <PropertiesPanel />
    </div>
  </div>
</template>
