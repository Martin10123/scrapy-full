import { computed, nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { createInitialDashboard, dashboardApiBase, transformLiveData, type DashboardData } from '../helpers/dashboard'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export function useDashboard() {
  const fallbackData = createInitialDashboard()
  const loading = ref(true)
  const refreshing = ref(false)
  const lastUpdated = ref('Cargando datos...')
  const searchQuery = ref('')
  const selectedCity = ref('all')
  const selectedMode = ref('all')
  const currentPage = ref(1)
  const dashboard = ref<DashboardData>(fallbackData)

  const cityOptions = computed(() => {
    const cities = new Set(dashboard.value.jobs.map((job) => job.city).filter(Boolean))
    return ['all', ...Array.from(cities)]
  })

  const filteredJobs = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()

    return dashboard.value.jobs.filter((job) => {
      const matchesQuery = !query || [job.title, job.company, job.city, job.remote_type, job.salary_min ?? '', job.salary_max ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
      const matchesCity = selectedCity.value === 'all' || job.city === selectedCity.value
      const matchesMode = selectedMode.value === 'all' || job.remote_type === selectedMode.value
      return matchesQuery && matchesCity && matchesMode
    })
  })

  const jobsPerPage = 6
  const totalPages = computed(() => Math.max(Math.ceil(filteredJobs.value.length / jobsPerPage), 1))
  const pagedJobs = computed(() => {
    const start = (currentPage.value - 1) * jobsPerPage
    return filteredJobs.value.slice(start, start + jobsPerPage)
  })

  watch([searchQuery, selectedCity, selectedMode], () => {
    currentPage.value = 1
  })

  watch(filteredJobs, () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value
    }
  })

  async function loadDashboard(showSpinner: boolean) {
    if (showSpinner) {
      refreshing.value = true
    }
    else {
      loading.value = true
    }

    try {
      const [overviewResponse, forecastResponse, confidenceResponse, jobsResponse] = await Promise.allSettled([
        axios.get(`${dashboardApiBase}/jobs/analytics/overview?top_n=8`),
        axios.get(`${dashboardApiBase}/jobs/analytics/forecast?top_n=5&months_ahead=3`),
        axios.get(`${dashboardApiBase}/jobs/analytics/forecast-confidence?top_n=5&test_horizon_months=3`),
        axios.get(`${dashboardApiBase}/jobs/`)
      ])

      const overviewData = overviewResponse.status === 'fulfilled' ? overviewResponse.value.data : null
      const forecastData = forecastResponse.status === 'fulfilled' ? forecastResponse.value.data : null
      const confidenceData = confidenceResponse.status === 'fulfilled' ? confidenceResponse.value.data : null
      const jobsData = jobsResponse.status === 'fulfilled' ? jobsResponse.value.data : null

      dashboard.value = transformLiveData(overviewData, forecastData, confidenceData, jobsData, fallbackData)
      lastUpdated.value = dashboard.value.jobs.length > 0
        ? `Actualizado ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
        : 'Sin datos disponibles'
    }
    catch {
      dashboard.value = fallbackData
      lastUpdated.value = 'Sin datos disponibles'
    }
    finally {
      loading.value = false
      refreshing.value = false
      await nextTick()
    }
  }

  function refreshDashboard() {
    void loadDashboard(true)
  }

  onMounted(async () => {
    await loadDashboard(false)
  })

  return {
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
    loadDashboard,
    refreshDashboard,
    fallbackData
  }
}
