<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ overview?: any }>()

const totalJobs = computed(() => props.overview?.total_jobs ?? props.overview?.total ?? 0)
const topSources = computed(() => {
  const src = props.overview?.top_sources
  if (!src) return []
  if (Array.isArray(src)) return src.slice(0,5)
  // assume object map -> convert to array of "name (count)"
  return Object.entries(src)
    .sort((a:any,b:any)=> (b[1] as number) - (a[1] as number))
    .slice(0,5)
    .map(([k,v])=> `${k} (${v})`)
})

const topCities = computed(() => {
  const cities = props.overview?.top_cities
  if (!cities) return []
  if (Array.isArray(cities)) return cities.slice(0,5)
  return Object.entries(cities)
    .sort((a:any,b:any)=> (b[1] as number) - (a[1] as number))
    .slice(0,5)
    .map(([k,v])=> `${k} (${v})`)
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card class="p-4">
      <h3 class="text-sm text-gray-500">Total de ofertas</h3>
      <div class="text-3xl font-bold text-['var(--color-primary)']">{{ totalJobs }}</div>
    </Card>

    <Card class="p-4">
      <h3 class="text-sm text-gray-500">Top fuentes</h3>
      <ul class="mt-2 text-sm text-gray-700 space-y-1">
        <li v-for="(s, idx) in topSources" :key="idx">{{ s }}</li>
      </ul>
    </Card>

    <Card class="p-4">
      <h3 class="text-sm text-gray-500">Top ciudades</h3>
      <ul class="mt-2 text-sm text-gray-700 space-y-1">
        <li v-for="(c, idx) in topCities" :key="idx">{{ c }}</li>
      </ul>
    </Card>
  </div>
</template>
