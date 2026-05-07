<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import OverviewCards from '../components/OverviewCards.vue'
import SkillsChart from '../components/SkillsChart.vue'
import ForecastChart from '../components/ForecastChart.vue'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const overview = ref<any>(null)
const forecast = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function loadData(){
  loading.value = true
  try{
    const [ovRes, fcRes] = await Promise.all([
      axios.get(`${API_BASE}/jobs/analytics/overview`),
      axios.get(`${API_BASE}/jobs/analytics/forecast`)
    ])
    overview.value = ovRes.data
    forecast.value = fcRes.data
  }catch(e:any){
    error.value = e.message || String(e)
  }finally{
    loading.value = false
  }
}

onMounted(()=>{ loadData() })
</script>

<template>
  <div>
    <header class="appbar p-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="text-xl font-semibold text-gray-900">JobTrend</div>
          <div class="text-sm text-gray-600">Tendencias 2026</div>
        </div>
        <div class="flex items-center gap-3">
          <input placeholder="Busca por skill, compañía o ciudad" class="p-2 rounded-md border border-gray-200 w-80" />
          <Button label="Actualizar" class="p-button-outlined p-button-sm" @click="loadData" />
        </div>
      </div>
    </header>

    <main class="p-6">
      <div class="max-w-6xl mx-auto">
        <div class="mb-4 text-gray-700">Análisis de tecnologías más demandadas y pronósticos</div>

        <div v-if="loading" class="text-center text-gray-600">Cargando datos…</div>
        <div v-else>
          <div v-if="error" class="text-red-600">{{ error }}</div>
          <OverviewCards :overview="overview" />

          <div class="grid md:grid-cols-2 gap-6 mt-6">
            <div class="card-surface p-4">
              <SkillsChart :overview="overview" :forecast="forecast" />
            </div>
            <div class="card-surface p-4">
              <ForecastChart :forecast="forecast" />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.p-button { /* fallback simple styling */ }
</style>
