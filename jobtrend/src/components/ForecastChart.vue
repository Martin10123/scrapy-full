<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ forecast?: any }>()

const chartData = computed(()=>{
  const skills = props.forecast?.skills || []
  const labels = (skills[0]?.forecast || []).map((p:any)=>p.month) || []
  const palettes = ['#1a73e8','#06b6d4','#f59e0b','#ef4444','#10b981']
  const datasets = skills.slice(0,5).map((s:any, idx:number)=>({
    label: s.skill,
    data: (s.forecast || []).map((p:any)=>p.count),
    borderColor: palettes[idx%palettes.length],
    backgroundColor: 'transparent',
    tension: 0.35,
    pointRadius: 4
  }))
  return { labels, datasets }
})
</script>

<template>
  <div>
    <h3 class="text-lg font-medium text-gray-700 mb-2">Pronóstico (próximos meses)</h3>
    <Chart type="line" :data="chartData" :options="{ responsive: true, maintainAspectRatio: false }" style="height:360px" />
  </div>
</template>
