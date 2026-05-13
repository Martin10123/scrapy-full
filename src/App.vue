<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { useDashboard } from './composables/useDashboard'
import { useDashboardCharts } from './composables/useDashboardCharts'
import {
  confidenceSeverityMap,
  formatDate,
  formatSalaryRange,
  formatSalary,
  remoteTypeSeverityMap,
  remoteTypeOptions,
  type ConfidenceLevel
} from './helpers/dashboard'

const {
  loading,
  refreshing,
  lastUpdated,
  searchQuery,
  selectedCity,
  selectedMode,
  currentPage,
  dashboard,
  cityOptions,
  filteredJobs,
  totalPages,
  pagedJobs,
  refreshDashboard
} = useDashboard()

const dashboardCharts = useDashboardCharts(dashboard, loading)
const chartCanvasRefs = [
  dashboardCharts.trendCanvas,
  dashboardCharts.skillsCanvas,
  dashboardCharts.softSkillsCanvas,
  dashboardCharts.forecastCanvas,
  dashboardCharts.forecastTop10Canvas,
  dashboardCharts.citiesCanvas,
  dashboardCharts.modalityCanvas,
  dashboardCharts.seniorityCanvas,
  dashboardCharts.englishCanvas
]

void chartCanvasRefs.length

const kpis = computed(() => {
  const overview = dashboard.value.overview
  const primaryCity = overview.top_cities[0]
  const avgSalary = Math.round(
    dashboard.value.jobs.reduce((sum, job) => {
      const salary = job.salary_min ?? job.salary_max ?? 0
      return sum + salary
    }, 0) / Math.max(dashboard.value.jobs.length, 1)
  )
  const remoteJobs = dashboard.value.jobs.filter((job) => job.remote_type === 'remoto').length

  return [
    {
      label: 'Total ofertas',
      value: new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(overview.total_jobs),
      detail: 'vacantes analizadas en la fuente conectada',
      icon: 'pi pi-briefcase',
      tone: '#2563eb'
    },
    {
      label: 'Ciudad principal',
      value: primaryCity?.label ?? primaryCity?.city ?? 'Bogotá',
      detail: 'mayor volumen de publicaciones',
      icon: 'pi pi-map-marker',
      tone: '#06b6d4'
    },
    {
      label: 'Salario promedio',
      value: formatSalaryRange(avgSalary, null, 'COP'),
      detail: 'estimado sobre las vacantes visibles',
      icon: 'pi pi-wallet',
      tone: '#f59e0b'
    },
    {
      label: 'Trabajo remoto',
      value: `${Math.round((remoteJobs / Math.max(dashboard.value.jobs.length, 1)) * 100)}%`,
      detail: 'participación de vacantes remotas',
      icon: 'pi pi-wifi',
      tone: '#ec4899'
    }
  ]
})

const citySelectOptions = computed(() => cityOptions.value.map((city) => ({
  label: city === 'all' ? 'Todas las ciudades' : city,
  value: city
})))

function confidenceLabel(level: ConfidenceLevel) {
  if (level === 'high') {
    return 'Alta'
  }

  if (level === 'medium') {
    return 'Media'
  }

  if (level === 'low') {
    return 'Baja'
  }

  return 'Sin datos'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="pointer-events-none fixed inset-x-0 top-0 -z-10 h-112 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_28%)]" />

    <header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-400 flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div class="flex items-start gap-4">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200">
            <i class="pi pi-chart-line text-xl" aria-hidden="true" />
          </div>

          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">JobTrend AI</p>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Mercado laboral
            </h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Conecta tus fuentes de datos y obtén insights, visualizaciones y proyecciones para tomar decisiones informadas sobre la demanda laboral en tecnología.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Tag :value="lastUpdated" severity="info" class="rounded-full!" />
          <Button label="Actualizar" icon="pi pi-refresh" :loading="refreshing" @click="refreshDashboard" />
        </div>
      </div>
    </header>

    <main class="mx-auto flex max-w-400 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card v-for="kpi in kpis" :key="kpi.label" class="overflow-hidden border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{{ kpi.label }}</p>
                <div class="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{{ kpi.value }}</div>
                <p class="mt-2 text-sm leading-6 text-slate-600">{{ kpi.detail }}</p>
              </div>

              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" :style="{ backgroundColor: `${kpi.tone}15`, color: kpi.tone }">
                <i :class="kpi.icon" class="text-xl" aria-hidden="true" />
              </div>
            </div>
          </template>
        </Card>
      </section>

      <section class="">
        <Card class="border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tendencia</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Oferta mensual</h2>
              </div>
              <Tag value="Area chart" severity="secondary" class="rounded-full!" />
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="1.5rem" width="40%" />
              <Skeleton height="18rem" />
            </div>
            <div v-else class="h-64 sm:h-72 lg:h-80">
              <canvas :ref="dashboardCharts.trendCanvas" />
            </div>
          </template>
        </Card>
      </section>

      <section class="grid gap-6 lg:grid-cols-12">
        <Card class="xl:col-span-6 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex flex-col gap-3 lg:items-start lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Forecast</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Demanda proyectada (Top 5)</h2>
              </div>

              <div class="flex flex-wrap gap-2">
                  <Tag
                    v-for="skill in dashboard.forecastSkills.slice(0, 5)"
                    :key="skill.skill"
                    :value="`${skill.skill} ${skill.growth_pct >= 0 ? '+' : ''}${skill.growth_pct}%`"
                    :severity="skill.growth_pct >= 0 ? 'info' : 'danger'"
                    class="rounded-full!"
                  />
              </div>
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="1.5rem" width="44%" />
              <Skeleton height="20rem" />
            </div>
            <div v-else class="h-64 sm:h-80 lg:h-96">
              <canvas :ref="dashboardCharts.forecastCanvas" />
            </div>
          </template>
        </Card>

        <Card class="xl:col-span-6 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex flex-col gap-3 lg:items-start lg:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Forecast</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Proyección final (Top 10)</h2>
              </div>

              <Tag value="Bar chart" severity="secondary" class="rounded-full!" />
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="1.5rem" width="44%" />
              <Skeleton height="20rem" />
            </div>
            <div v-else class="h-64 sm:h-80 lg:h-96">
              <canvas :ref="dashboardCharts.forecastTop10Canvas" />
            </div>
          </template>
        </Card>
      </section>

      <section class="grid gap-6 lg:grid-cols-12">
        <Card class="xl:col-span-5 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Soft skills</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Habilidades blandas más solicitadas</h2>
              </div>
              <Tag value="Bar chart" severity="secondary" class="rounded-full!" />
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="1.5rem" width="32%" />
              <Skeleton height="18rem" />
            </div>
            <div v-else class="h-64 sm:h-72 lg:h-80">
              <canvas :ref="dashboardCharts.softSkillsCanvas" />
            </div>
          </template>
        </Card>

        <Card class="xl:col-span-7 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Idioma</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Requisito de inglés</h2>
              </div>
              <Tag value="Pie chart" severity="secondary" class="rounded-full!" />
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="1.5rem" width="32%" />
              <Skeleton height="18rem" />
            </div>
            <div v-else class="h-64 sm:h-72 lg:h-80">
              <canvas :ref="dashboardCharts.englishCanvas" />
            </div>
          </template>
        </Card>
      </section>

      <section class="grid gap-6 lg:grid-cols-12">
        <Card class="lg:col-span-4 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mix del mercado</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Ciudades</h2>
              </div>
              <Tag value="Pie chart" severity="secondary" class="rounded-full!" />
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div v-if="loading">
                <Skeleton height="11rem" />
              </div>
              <div v-else class="h-44 sm:h-48">
                <canvas :ref="dashboardCharts.citiesCanvas" />
              </div>
            </div>
          </template>
        </Card>

        <Card class="lg:col-span-4 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mix del mercado</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Modalidad</h2>
              </div>
              <Tag value="Pie chart" severity="secondary" class="rounded-full!" />
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div v-if="loading">
                <Skeleton height="11rem" />
              </div>
              <div v-else class="h-44 sm:h-48">
                <canvas :ref="dashboardCharts.modalityCanvas" />
              </div>
            </div>
          </template>
        </Card>

        <Card class="lg:col-span-4 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mix del mercado</p>
                <h2 class="mt-1 text-lg font-semibold text-slate-950">Seniority</h2>
              </div>
              <Tag value="Pie chart" severity="secondary" class="rounded-full!" />
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div v-if="loading">
                <Skeleton height="11rem" />
              </div>
              <div v-else class="h-44 sm:h-48">
                <canvas :ref="dashboardCharts.seniorityCanvas" />
              </div>
            </div>
          </template>
        </Card>
      </section>

      <section class="grid gap-6 xl:grid-cols-12">
        <Card class="xl:col-span-4 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Señales</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-950">Fuentes y ciudades destacadas</h2>
            </div>

            <div class="space-y-5">
              <div>
                <p class="mb-3 text-sm font-medium text-slate-600">Top fuentes</p>
                <div class="flex flex-wrap gap-2">
                  <Tag
                    v-for="source in dashboard.overview.top_sources"
                    :key="source.label ?? source.source ?? String(source.count)"
                    :value="`${source.label ?? source.source ?? 'Fuente'} · ${source.count}`"
                    severity="secondary"
                    class="rounded-full!"
                  />
                </div>
              </div>

              <div>
                <p class="mb-3 text-sm font-medium text-slate-600">Top ciudades</p>
                <div class="space-y-2">
                  <div v-for="city in dashboard.overview.top_cities" :key="city.label ?? city.city ?? String(city.count)" class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                    <span class="text-sm font-medium text-slate-700">{{ city.label ?? city.city ?? 'Ciudad' }}</span>
                    <span class="text-sm font-semibold text-slate-950">{{ city.count }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <Card class="xl:col-span-8 border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
          <template #content>
            <div class="mb-5 flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Forecast confidence</p>
                <h2 class="mt-1 text-xl font-semibold text-slate-950">Calidad de la proyección</h2>
              </div>
            </div>

            <div v-if="loading" class="space-y-3">
              <Skeleton height="2rem" />
              <Skeleton height="2rem" />
              <Skeleton height="2rem" />
              <Skeleton height="2rem" />
            </div>
            <div v-else class="overflow-hidden rounded-2xl border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead class="bg-slate-50 text-slate-600">
                  <tr>
                    <th class="px-4 py-3 font-semibold">Skill</th>
                    <th class="px-4 py-3 font-semibold">MAE</th>
                    <th class="px-4 py-3 font-semibold">MAPE</th>
                    <th class="px-4 py-3 font-semibold">Confianza</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-for="row in dashboard.confidenceRows" :key="row.skill">
                    <td class="px-4 py-3 font-medium text-slate-800">{{ row.skill }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ row.mae.toFixed(1) }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ row.mape_pct.toFixed(1) }}%</td>
                    <td class="px-4 py-3">
                      <Tag
                        :value="confidenceLabel(row.confidence_level)"
                        :severity="confidenceSeverityMap[row.confidence_level]"
                        class="rounded-full!"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </Card>
      </section>

      <Card class="border border-slate-200 bg-white! text-slate-900! shadow-sm shadow-slate-200/60">
        <template #content>
          <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Vacantes</p>
              <h2 class="mt-1 text-xl font-semibold text-slate-950">Ofertas con filtros</h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:flex-1">
              <span class="relative block">
                <i class="pi pi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <InputText v-model="searchQuery" placeholder="Buscar por título, empresa o salario" class="w-full pl-10" />
              </span>

              <Select
                v-model="selectedCity"
                :options="citySelectOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Ciudad"
                class="w-full"
              />

              <Select
                v-model="selectedMode"
                :options="remoteTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Modalidad"
                class="w-full"
              />
            </div>
          </div>

          <div v-if="loading" class="space-y-3">
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
          </div>
          <div v-else class="overflow-x-auto rounded-2xl border border-slate-200">
            <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="px-4 py-3 font-semibold">Título</th>
                  <th class="px-4 py-3 font-semibold">Empresa</th>
                  <th class="px-4 py-3 font-semibold">Ciudad</th>
                  <th class="px-4 py-3 font-semibold">Modalidad</th>
                  <th class="px-4 py-3 font-semibold">Salario</th>
                  <th class="px-4 py-3 font-semibold">Fecha</th>
                  <th class="px-4 py-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="job in pagedJobs" :key="`${job.title}-${job.company}-${job.published_at}`" class="align-top">
                  <td class="px-4 py-3 font-medium text-slate-800">{{ job.title }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ job.company }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ job.city }}</td>
                  <td class="px-4 py-3">
                    <Tag
                      :value="job.remote_type"
                      :severity="remoteTypeSeverityMap[job.remote_type]"
                      class="rounded-full! capitalize"
                    />
                  </td>
                  <td class="px-4 py-3 text-slate-600">{{ formatSalary(job) }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ formatDate(job.published_at) }}</td>
                  <td class="px-4 py-3">
                    <a
                      :href="job.url"
                      target="_blank"
                      rel="noreferrer"
                      class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      Abrir
                      <i class="pi pi-arrow-up-right text-xs" aria-hidden="true" />
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span class="text-sm text-slate-600">{{ filteredJobs.length }} resultados</span>
            <div class="flex flex-wrap items-center gap-2">
              <Button label="Anterior" severity="secondary" :disabled="currentPage === 1" @click="currentPage -= 1" />
              <span class="rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                Página {{ currentPage }} de {{ totalPages }}
              </span>
              <Button label="Siguiente" severity="secondary" :disabled="currentPage === totalPages" @click="currentPage += 1" />
            </div>
          </footer>
        </template>
      </Card>
    </main>
  </div>
</template>
