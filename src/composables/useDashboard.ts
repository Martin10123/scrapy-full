import { computed, nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { createFallbackDashboard, dashboardApiBase, transformLiveData, type DashboardData } from '../helpers/dashboard'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export function useDashboard() {
  const fallbackData = createFallbackDashboard()
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
      const [overviewResponse, forecastResponse, confidenceResponse, jobsResponse] = await Promise.all([
        axios.get(`${dashboardApiBase}/jobs/analytics/overview?top_n=8`),
        axios.get(`${dashboardApiBase}/jobs/analytics/forecast?top_n=5&months_ahead=3`),
        axios.get(`${dashboardApiBase}/jobs/analytics/forecast-confidence?top_n=5&test_horizon_months=3`),
        axios.get(`${dashboardApiBase}/jobs/search?limit=50&offset=0`)
      ])

      dashboard.value = transformLiveData(overviewResponse.data, forecastResponse.data, confidenceResponse.data, jobsResponse.data, fallbackData)
      lastUpdated.value = `Actualizado ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
    }
    catch {
      dashboard.value = fallbackData
      lastUpdated.value = 'Usando datos de demostración'
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
