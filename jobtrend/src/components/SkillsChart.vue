<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ overview?: any, forecast?: any }>()

const data = computed(()=>{
  // Try overview.top_skills as object map or array, or fallback to forecast.skills
  let items = props.overview?.top_skills
  if (!items && props.forecast?.skills) {
    items = props.forecast.skills.map((s:any)=>({ skill: s.skill, count: s.total_observed || (s.history && s.history.reduce((a:any,b:any)=>a+b.count,0)) }))
  }
  if (!items) items = []
  // If items is an object map like { skill: count }
  if (!Array.isArray(items) && typeof items === 'object') {
    items = Object.entries(items).map(([skill, count])=> ({ skill, count }))
  }
  const labels = items.map((i:any)=>i.skill)
  const counts = items.map((i:any)=>i.count)
  return {
    labels,
    datasets: [
      {
        label: 'Demandas observadas',
        backgroundColor: 'rgba(26,115,232,0.85)',
        borderColor: 'rgba(26,115,232,1)',
        data: counts
      }
    ]
  }
})
</script>

<template>
  <div>
    <h3 class="text-lg font-medium text-gray-700 mb-2">Top skills</h3>
    <Chart type="bar" :data="data" :options="{ responsive: true, maintainAspectRatio: false }" style="height:320px" />
  </div>
</template>
