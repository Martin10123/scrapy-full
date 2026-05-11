<script setup lang="ts">
import axios from 'axios'
import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

Chart.register(...registerables)

type RemoteType = 'remoto' | 'híbrido' | 'presencial'
type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient-data'

interface JobItem {
  title: string
  company: string
  city: string
  remote_type: RemoteType
  salary_min: number | null
  salary_max: number | null
  currency: string
  published_at: string
  url: string
}

interface OverviewData {
  total_jobs: number
  top_sources: Array<{ label?: string; source?: string; count: number }>
  top_cities: Array<{ label?: string; city?: string; count: number }>
  remote_type_distribution: Array<{ label?: string; remote_type?: string; count: number }>
  seniority_distribution: Array<{ label?: string; seniority?: string; count: number }>
  monthly_trend: Array<{ month: string; count: number }>
}

interface ForecastSkill {
  skill: string
  history: Array<{ month: string; count: number }>
  forecast: Array<{ month: string; count: number }>
  growth_pct: number
  projected_total: number
}

interface ConfidenceRow {
  skill: string
  mae: number
  mape_pct: number
  confidence_level: ConfidenceLevel
}

interface DashboardData {
  overview: OverviewData
  topSkills: Array<{ skill: string; count: number }>
  forecastSkills: ForecastSkill[]
  confidenceRows: ConfidenceRow[]
  jobs: JobItem[]
}

const apiBase = 'http://127.0.0.1:8000'
const jobsPerPage = 6
const forecastStartIndex = 5
const palette = {
  primary: '#6366f1',
  teal: '#22d3ee',
  yellow: '#fbbf24',
  magenta: '#ec4899',
  orange: '#f97316',
  border: 'rgba(255, 255, 255, 0.08)',
  textMuted: '#9ca3af',
  textStrong: '#f9fafb'
} as const

const chartInstances: Chart[] = []
const fallbackData = createFallbackDashboard()

const loading = ref(true)
const refreshing = ref(false)
const lastUpdated = ref('Cargando datos...')
const searchQuery = ref('')
const selectedCity = ref('all')
const selectedMode = ref('all')
const currentPage = ref(1)

const trendCanvas = ref<HTMLCanvasElement | null>(null)
const skillsCanvas = ref<HTMLCanvasElement | null>(null)
const forecastCanvas = ref<HTMLCanvasElement | null>(null)
const citiesCanvas = ref<HTMLCanvasElement | null>(null)
const modalityCanvas = ref<HTMLCanvasElement | null>(null)
const seniorityCanvas = ref<HTMLCanvasElement | null>(null)

const dashboard = ref<DashboardData>(fallbackData)

const modalBadgeClass: Record<RemoteType, string> = {
  remoto: 'badge badge--blue',
  'híbrido': 'badge badge--green',
  presencial: 'badge badge--gray'
}

const confidenceBadgeClass: Record<ConfidenceLevel, string> = {
  high: 'badge badge--success',
  medium: 'badge badge--warning',
  low: 'badge badge--danger',
  'insufficient-data': 'badge badge--gray'
}

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
      value: formatCompactNumber(overview.total_jobs),
      detail: 'ofertas analizadas',
      icon: 'pi pi-briefcase',
      tone: 'var(--kpi-primary)'
    },
    {
      label: 'Ciudad principal',
      value: primaryCity?.label ?? primaryCity?.city ?? 'Bogotá',
      detail: 'mayor volumen de publicaciones',
      icon: 'pi pi-map-marker',
      tone: 'var(--kpi-teal)'
    },
    {
      label: 'Salario promedio',
      value: formatCurrency(avgSalary),
      detail: 'estimado sobre vacantes visibles',
      icon: 'pi pi-dollar',
      tone: 'var(--kpi-yellow)'
    },
    {
      label: '% Trabajo remoto',
      value: `${Math.round((remoteJobs / Math.max(dashboard.value.jobs.length, 1)) * 100)}%`,
      detail: 'vacantes remotas detectadas',
      icon: 'pi pi-wifi',
      tone: 'var(--kpi-magenta)'
    }
  ]
})

const cityOptions = computed(() => {
  const cities = new Set(dashboard.value.jobs.map((job) => job.city).filter(Boolean))
  return ['all', ...Array.from(cities)]
})

const filteredJobs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return dashboard.value.jobs.filter((job) => {
    const matchesQuery = !query || [job.title, job.company, job.city, job.remote_type, formatSalary(job)]
      .join(' ')
      .toLowerCase()
      .includes(query)
    const matchesCity = selectedCity.value === 'all' || job.city === selectedCity.value
    const matchesMode = selectedMode.value === 'all' || job.remote_type === selectedMode.value
    return matchesQuery && matchesCity && matchesMode
  })
})

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

onMounted(async () => {
  await loadDashboard(false)
})

onBeforeUnmount(() => {
  destroyCharts()
})

async function loadDashboard(showSpinner: boolean) {
  if (showSpinner) {
    refreshing.value = true
  }
  else {
    loading.value = true
  }

  destroyCharts()

  try {
    const [overviewResponse, forecastResponse, confidenceResponse, jobsResponse] = await Promise.all([
      axios.get(`${apiBase}/jobs/analytics/overview?top_n=8`),
      axios.get(`${apiBase}/jobs/analytics/forecast?top_n=5&months_ahead=3`),
      axios.get(`${apiBase}/jobs/analytics/forecast-confidence?top_n=5&test_horizon_months=3`),
      axios.get(`${apiBase}/jobs/search?limit=50&offset=0`)
    ])

    dashboard.value = transformLiveData(overviewResponse.data, forecastResponse.data, confidenceResponse.data, jobsResponse.data)
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
    renderCharts()
  }
}

function refreshDashboard() {
  void loadDashboard(true)
}

function renderCharts() {
  destroyCharts()

  if (trendCanvas.value) {
    const labels = dashboard.value.overview.monthly_trend.map((item) => item.month)
    const counts = dashboard.value.overview.monthly_trend.map((item) => item.count)

    chartInstances.push(createChart(trendCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ofertas',
            data: counts,
            borderColor: palette.primary,
            backgroundColor: (context) => createAreaGradient(context.chart, palette.primary),
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: palette.primary,
            borderWidth: 2.5,
            tension: 0.35
          }
        ]
      },
      options: commonLineOptions()
    } as ChartConfiguration<'line', number[], string>))
  }

  if (skillsCanvas.value) {
    const topSkills = dashboard.value.topSkills.slice(0, 8)

    chartInstances.push(createChart(skillsCanvas.value, {
      type: 'bar',
      data: {
        labels: topSkills.map((item) => item.skill),
        datasets: [
          {
            label: 'Menciones',
            data: topSkills.map((item) => item.count),
            borderRadius: 10,
            backgroundColor: palette.primary,
            hoverBackgroundColor: '#818cf8',
            barThickness: 16
          }
        ]
      },
      options: {
        ...commonChartOptions(),
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: scaleOptions(true),
          y: scaleOptions(false)
        }
      }
    } as ChartConfiguration<'bar', number[], string>))
  }

  if (forecastCanvas.value) {
    const forecastData = dashboard.value.forecastSkills

    chartInstances.push(createChart(forecastCanvas.value, {
      type: 'line',
      data: {
        labels: buildForecastLabels(forecastData),
        datasets: forecastData.map((skill, index) => {
          const color = [palette.primary, palette.teal, palette.orange, palette.magenta, palette.yellow][index % 5]
          const series = [...skill.history.map((point) => point.count), ...skill.forecast.map((point) => point.count)]

          return {
            label: skill.skill,
            data: series,
            borderColor: color,
            backgroundColor: `${color}22`,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.5,
            tension: 0.35,
            segment: {
              borderDash: (segmentContext: { p0DataIndex: number; p1DataIndex: number }) => segmentContext.p0DataIndex >= forecastStartIndex - 1 ? [6, 6] : undefined
            }
          }
        })
      },
      options: {
        ...commonChartOptions(),
        plugins: {
          legend: {
            labels: {
              color: palette.textStrong,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          }
        },
        scales: {
          x: scaleOptions(false),
          y: scaleOptions(true)
        }
      },
      plugins: [projectionWindowPlugin]
    } as ChartConfiguration<'line', number[], string>))
  }

  if (citiesCanvas.value) {
    chartInstances.push(createChart(citiesCanvas.value, createDoughnutChart(dashboard.value.overview.top_cities, 'Ciudades')))
  }

  if (modalityCanvas.value) {
    chartInstances.push(createChart(modalityCanvas.value, createDoughnutChart(dashboard.value.overview.remote_type_distribution, 'Modalidad')))
  }

  if (seniorityCanvas.value) {
    chartInstances.push(createChart(seniorityCanvas.value, createDoughnutChart(dashboard.value.overview.seniority_distribution, 'Seniority')))
  }
}

function createChart(canvas: HTMLCanvasElement, config: ChartConfiguration<any, any, any>) {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo obtener el contexto del canvas.')
  }

  return new Chart(context, config)
}

function destroyCharts() {
  while (chartInstances.length > 0) {
    chartInstances.pop()?.destroy()
  }
}

function commonChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: palette.textStrong,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: palette.textStrong,
        bodyColor: '#e5e7eb',
        borderColor: palette.border,
        borderWidth: 1,
        displayColors: false
      }
    }
  }
}

function commonLineOptions() {
  return {
    ...commonChartOptions(),
    plugins: {
      ...commonChartOptions().plugins,
      legend: { display: false }
    },
    scales: {
      x: scaleOptions(false),
      y: scaleOptions(true)
    }
  }
}

function scaleOptions(allowGrow: boolean) {
  return {
    beginAtZero: true,
    grid: {
      color: 'rgba(255, 255, 255, 0.08)'
    },
    ticks: {
      color: palette.textMuted,
      font: {
        size: 12
      },
      padding: 8
    },
    border: {
      color: 'rgba(255, 255, 255, 0.1)'
    },
    suggestedMin: allowGrow ? 0 : undefined
  }
}

function createDoughnutChart(entries: Array<{ label?: string; city?: string; remote_type?: string; seniority?: string; count: number }>, title: string) {
  const colorSet = [palette.primary, palette.teal, palette.yellow, palette.magenta, palette.orange]

  return {
    type: 'doughnut' as const,
    data: {
      labels: entries.map((entry) => entry.label ?? entry.city ?? entry.remote_type ?? entry.seniority ?? 'Otro'),
      datasets: [
        {
          label: title,
          data: entries.map((entry) => entry.count),
          backgroundColor: entries.map((_, index) => colorSet[index % colorSet.length]),
          borderColor: '#1a1a1a',
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    },
    options: {
      ...commonChartOptions(),
      cutout: '64%',
      plugins: {
        ...commonChartOptions().plugins,
        legend: {
          position: 'bottom' as const,
          labels: {
            color: palette.textStrong,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        }
      }
    }
  } satisfies ChartConfiguration<'doughnut', number[], string>
}

const projectionWindowPlugin: Plugin<'line'> = {
  id: 'projectionWindow',
  beforeDatasetsDraw(chart) {
    const xScale = chart.scales.x
    const area = chart.chartArea
    const start = xScale.getPixelForValue(forecastStartIndex)
    const context = chart.ctx

    context.save()
    context.fillStyle = 'rgba(99, 102, 241, 0.08)'
    context.fillRect(start, area.top, area.right - start, area.bottom - area.top)
    context.strokeStyle = 'rgba(99, 102, 241, 0.35)'
    context.setLineDash([5, 6])
    context.beginPath()
    context.moveTo(start, area.top)
    context.lineTo(start, area.bottom)
    context.stroke()
    context.restore()
  }
}

function createAreaGradient(chart: Chart, color: string) {
  const { ctx, chartArea } = chart
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, `${color}70`)
  gradient.addColorStop(1, `${color}00`)
  return gradient
}

function buildForecastLabels(forecastData: ForecastSkill[]) {
  const firstSkill = forecastData[0]
  if (!firstSkill) {
    return []
  }

  return [...firstSkill.history.map((point) => point.month), ...firstSkill.forecast.map((point) => point.month)]
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function formatCurrency(value: number) {
  if (!value) {
    return 'N/D'
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value)
}

function formatSalary(job: JobItem) {
  if (job.salary_min && job.salary_max) {
    return `${formatCurrency(job.salary_min)} - ${formatCurrency(job.salary_max)}`
  }

  if (job.salary_min) {
    return formatCurrency(job.salary_min)
  }

  if (job.salary_max) {
    return formatCurrency(job.salary_max)
  }

  return 'Salario no publicado'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value))
}

function transformLiveData(overview: any, forecast: any, confidence: any, jobsPayload: any): DashboardData {
  const jobs = Array.isArray(jobsPayload?.items) ? jobsPayload.items : Array.isArray(jobsPayload) ? jobsPayload : []

  return {
    overview: {
      total_jobs: overview?.total_jobs ?? jobs.length,
      top_sources: Array.isArray(overview?.top_sources) ? overview.top_sources : fallbackData.overview.top_sources,
      top_cities: Array.isArray(overview?.top_cities) && overview.top_cities.length > 0 ? overview.top_cities : fallbackData.overview.top_cities,
      remote_type_distribution: Array.isArray(overview?.remote_type_distribution) && overview.remote_type_distribution.length > 0 ? overview.remote_type_distribution : fallbackData.overview.remote_type_distribution,
      seniority_distribution: Array.isArray(overview?.seniority_distribution) && overview.seniority_distribution.length > 0 ? overview.seniority_distribution : fallbackData.overview.seniority_distribution,
      monthly_trend: Array.isArray(overview?.monthly_trend) && overview.monthly_trend.length > 0 ? overview.monthly_trend : fallbackData.overview.monthly_trend
    },
    topSkills: Array.isArray(overview?.top_skills) && overview.top_skills.length > 0
      ? overview.top_skills.map((item: { skill?: string; label?: string; count: number }) => ({
          skill: item.skill ?? item.label ?? 'Skill',
          count: item.count
        }))
      : fallbackData.topSkills,
    forecastSkills: Array.isArray(forecast?.skills) && forecast.skills.length > 0 ? forecast.skills : fallbackData.forecastSkills,
    confidenceRows: Array.isArray(confidence?.skills) && confidence.skills.length > 0 ? confidence.skills : fallbackData.confidenceRows,
    jobs: Array.isArray(jobs) && jobs.length > 0 ? normalizeJobs(jobs) : fallbackData.jobs
  }
}

function normalizeJobs(items: any[]): JobItem[] {
  return items.slice(0, 50).map((item) => ({
    title: item.title ?? 'Sin título',
    company: item.company ?? 'Empresa no disponible',
    city: item.city ?? 'Bogotá',
    remote_type: normalizeRemoteType(item.remote_type),
    salary_min: item.salary_min ?? null,
    salary_max: item.salary_max ?? null,
    currency: item.currency ?? 'COP',
    published_at: item.published_at ?? new Date().toISOString(),
    url: item.url ?? '#'
  }))
}

function normalizeRemoteType(value: unknown): RemoteType {
  const normalized = String(value ?? '').toLowerCase()

  if (normalized === 'remote' || normalized === 'remoto') {
    return 'remoto'
  }

  if (normalized === 'hybrid' || normalized === 'híbrido' || normalized === 'hibrido') {
    return 'híbrido'
  }

  return 'presencial'
}

function createFallbackDashboard(): DashboardData {
  const jobs: JobItem[] = [
    { title: 'Senior Python Engineer', company: 'Nuva', city: 'Bogotá', remote_type: 'remoto', salary_min: 9000000, salary_max: 12000000, currency: 'COP', published_at: '2026-05-08T10:00:00Z', url: '#' },
    { title: 'Data Analyst', company: 'Rappi', city: 'Medellín', remote_type: 'híbrido', salary_min: 5500000, salary_max: 7800000, currency: 'COP', published_at: '2026-05-07T10:00:00Z', url: '#' },
    { title: 'Frontend Developer React', company: 'Alegra', city: 'Bogotá', remote_type: 'remoto', salary_min: 7000000, salary_max: 9500000, currency: 'COP', published_at: '2026-05-06T10:00:00Z', url: '#' },
    { title: 'DevOps Engineer', company: 'Addi', city: 'Cali', remote_type: 'híbrido', salary_min: 8500000, salary_max: 11000000, currency: 'COP', published_at: '2026-05-05T10:00:00Z', url: '#' },
    { title: 'ML Engineer', company: 'Habi', city: 'Bogotá', remote_type: 'remoto', salary_min: 10000000, salary_max: 14000000, currency: 'COP', published_at: '2026-05-04T10:00:00Z', url: '#' },
    { title: 'Backend Node.js Developer', company: 'Bold', city: 'Barranquilla', remote_type: 'presencial', salary_min: 6800000, salary_max: 9200000, currency: 'COP', published_at: '2026-05-03T10:00:00Z', url: '#' },
    { title: 'BI Specialist', company: 'Siesa', city: 'Bogotá', remote_type: 'híbrido', salary_min: 6200000, salary_max: 8300000, currency: 'COP', published_at: '2026-05-02T10:00:00Z', url: '#' },
    { title: 'Product Data Scientist', company: 'Mercado Libre', city: 'Medellín', remote_type: 'remoto', salary_min: 11000000, salary_max: 15000000, currency: 'COP', published_at: '2026-05-01T10:00:00Z', url: '#' }
  ]

  return {
    overview: {
      total_jobs: 1248,
      top_sources: [
        { label: 'Computrabajo', count: 628 },
        { label: 'Magneto', count: 420 },
        { label: 'LinkedIn', count: 200 }
      ],
      top_cities: [
        { label: 'Bogotá', count: 560 },
        { label: 'Medellín', count: 260 },
        { label: 'Cali', count: 140 },
        { label: 'Barranquilla', count: 110 }
      ],
      remote_type_distribution: [
        { label: 'Remoto', count: 41 },
        { label: 'Híbrido', count: 34 },
        { label: 'Presencial', count: 25 }
      ],
      seniority_distribution: [
        { label: 'Junior', count: 18 },
        { label: 'Mid', count: 47 },
        { label: 'Senior', count: 35 }
      ],
      monthly_trend: [
        { month: 'Ene', count: 120 },
        { month: 'Feb', count: 165 },
        { month: 'Mar', count: 182 },
        { month: 'Abr', count: 205 },
        { month: 'May', count: 232 },
        { month: 'Jun', count: 268 },
        { month: 'Jul', count: 291 },
        { month: 'Ago', count: 318 }
      ]
    },
    topSkills: [
      { skill: 'Python', count: 184 },
      { skill: 'SQL', count: 168 },
      { skill: 'Docker', count: 143 },
      { skill: 'React', count: 129 },
      { skill: 'AWS', count: 118 },
      { skill: 'TypeScript', count: 102 },
      { skill: 'Kafka', count: 88 },
      { skill: 'Node.js', count: 81 }
    ],
    forecastSkills: [
      {
        skill: 'Python',
        history: [
          { month: 'Ene', count: 42 },
          { month: 'Feb', count: 48 },
          { month: 'Mar', count: 51 },
          { month: 'Abr', count: 56 },
          { month: 'May', count: 60 }
        ],
        forecast: [
          { month: 'Jun', count: 64 },
          { month: 'Jul', count: 70 },
          { month: 'Ago', count: 76 }
        ],
        growth_pct: 27,
        projected_total: 270
      },
      {
        skill: 'SQL',
        history: [
          { month: 'Ene', count: 39 },
          { month: 'Feb', count: 42 },
          { month: 'Mar', count: 45 },
          { month: 'Abr', count: 49 },
          { month: 'May', count: 53 }
        ],
        forecast: [
          { month: 'Jun', count: 56 },
          { month: 'Jul', count: 59 },
          { month: 'Ago', count: 63 }
        ],
        growth_pct: 19,
        projected_total: 226
      },
      {
        skill: 'Docker',
        history: [
          { month: 'Ene', count: 30 },
          { month: 'Feb', count: 34 },
          { month: 'Mar', count: 38 },
          { month: 'Abr', count: 41 },
          { month: 'May', count: 46 }
        ],
        forecast: [
          { month: 'Jun', count: 48 },
          { month: 'Jul', count: 50 },
          { month: 'Ago', count: 54 }
        ],
        growth_pct: 17,
        projected_total: 191
      }
    ],
    confidenceRows: [
      { skill: 'Python', mae: 4.1, mape_pct: 11.2, confidence_level: 'high' },
      { skill: 'SQL', mae: 5.3, mape_pct: 13.4, confidence_level: 'medium' },
      { skill: 'Docker', mae: 6.8, mape_pct: 18.2, confidence_level: 'low' }
    ],
    jobs
  }
}
</script>

<template>
  <div class="dashboard-shell">
    <header class="topbar">
      <div class="dashboard-container dashboard-container--topbar">
        <div class="brand-block">
          <div class="brand-icon">
            <i class="pi pi-chart-bar" aria-hidden="true" />
          </div>

          <div>
            <p class="brand-kicker">Data analytics platform</p>
            <h1>JobTrend AI</h1>
            <p class="brand-subtitle">
              Tendencias del mercado laboral tech en Colombia, con métricas, forecasts y vacantes activas.
            </p>
          </div>
        </div>

        <div class="topbar-actions">
          <span class="status-pill">
            <span class="status-dot" />
            {{ lastUpdated }}
          </span>

          <button class="action-button" type="button" :disabled="refreshing" @click="refreshDashboard">
            <span v-if="refreshing" class="button-spinner" aria-hidden="true" />
            <i v-else class="pi pi-refresh" aria-hidden="true" />
            <span>Actualizar datos</span>
          </button>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="dashboard-container dashboard-container--content">
        <section class="kpi-grid">
        <article v-for="kpi in kpis" :key="kpi.label" class="panel kpi-card">
          <div class="kpi-icon" :style="{ '--kpi-color': kpi.tone }">
            <i :class="kpi.icon" aria-hidden="true" />
          </div>

          <div class="kpi-copy">
            <p>{{ kpi.label }}</p>
            <h2>{{ kpi.value }}</h2>
            <span>{{ kpi.detail }}</span>
          </div>
        </article>
      </section>

      <section class="chart-grid chart-grid--primary">
        <article class="panel chart-panel chart-panel--wide">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Tendencia</p>
              <h3>Oferta mensual</h3>
            </div>
            <span class="panel-chip">AreaChart</span>
          </div>

          <div v-if="loading" class="loading-chart loading-chart--large">
            <div class="loading-line loading-line--title" />
            <div class="loading-line loading-line--chart" />
          </div>
          <div v-else class="chart-frame">
            <canvas ref="trendCanvas" />
          </div>
        </article>

        <article class="panel chart-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Skills</p>
              <h3>Top skills</h3>
            </div>
            <span class="panel-chip">BarChart</span>
          </div>

          <div v-if="loading" class="loading-chart">
            <div class="loading-line loading-line--title" />
            <div class="loading-line loading-line--chart" />
          </div>
          <div v-else class="chart-frame chart-frame--short">
            <canvas ref="skillsCanvas" />
          </div>
        </article>
      </section>

      <section class="chart-grid chart-grid--secondary">
        <article class="panel chart-panel chart-panel--wide">
          <div class="panel-heading panel-heading--stacked">
            <div>
              <p class="section-kicker">Forecast</p>
              <h3>Demanda proyectada por skill</h3>
            </div>

            <div class="forecast-badges">
              <span
                v-for="skill in dashboard.forecastSkills"
                :key="skill.skill"
                class="forecast-badge"
              >
                <strong>{{ skill.skill }}</strong>
                <span :class="skill.growth_pct >= 0 ? 'badge badge--success' : 'badge badge--danger'">
                  {{ skill.growth_pct >= 0 ? '+' : '' }}{{ skill.growth_pct }}%
                </span>
              </span>
            </div>
          </div>

          <div v-if="loading" class="loading-chart loading-chart--large">
            <div class="loading-line loading-line--title" />
            <div class="loading-line loading-line--chart" />
          </div>
          <div v-else class="chart-frame chart-frame--forecast">
            <canvas ref="forecastCanvas" />
          </div>
        </article>

        <article class="panel chart-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Distribución</p>
              <h3>Mix del mercado</h3>
            </div>
            <span class="panel-chip">PieCharts</span>
          </div>

          <div class="pie-grid">
            <div class="pie-card">
              <h4>Ciudades</h4>
              <div v-if="loading" class="loading-chart loading-chart--compact" />
              <div v-else class="chart-frame chart-frame--pie">
                <canvas ref="citiesCanvas" />
              </div>
            </div>

            <div class="pie-card">
              <h4>Modalidad</h4>
              <div v-if="loading" class="loading-chart loading-chart--compact" />
              <div v-else class="chart-frame chart-frame--pie">
                <canvas ref="modalityCanvas" />
              </div>
            </div>

            <div class="pie-card">
              <h4>Seniority</h4>
              <div v-if="loading" class="loading-chart loading-chart--compact" />
              <div v-else class="chart-frame chart-frame--pie">
                <canvas ref="seniorityCanvas" />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="chart-grid chart-grid--tables">
        <article class="panel table-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Forecast confidence</p>
              <h3>Calidad de la proyección</h3>
            </div>
          </div>

          <div v-if="loading" class="loading-table">
            <div v-for="row in 4" :key="row" class="loading-row" />
          </div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>MAE</th>
                  <th>MAPE</th>
                  <th>Confianza</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in dashboard.confidenceRows" :key="row.skill">
                  <td>{{ row.skill }}</td>
                  <td>{{ row.mae.toFixed(1) }}</td>
                  <td>{{ row.mape_pct.toFixed(1) }}%</td>
                  <td>
                    <span :class="confidenceBadgeClass[row.confidence_level]">
                      {{ row.confidence_level === 'high' ? 'Alta' : row.confidence_level === 'medium' ? 'Media' : row.confidence_level === 'low' ? 'Baja' : 'Sin datos' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="panel table-panel table-panel--jobs">
          <div class="panel-heading panel-heading--stacked">
            <div>
              <p class="section-kicker">Vacantes</p>
              <h3>Ofertas con filtros</h3>
            </div>

            <div class="filter-row">
              <label class="search-field">
                <i class="pi pi-search" aria-hidden="true" />
                <input v-model="searchQuery" type="search" placeholder="Buscar por título, empresa o skill" />
              </label>

              <select v-model="selectedCity" class="filter-select" aria-label="Filtrar por ciudad">
                <option value="all">Todas las ciudades</option>
                <option v-for="city in cityOptions.slice(1)" :key="city" :value="city">
                  {{ city }}
                </option>
              </select>

              <select v-model="selectedMode" class="filter-select" aria-label="Filtrar por modalidad">
                <option value="all">Todas las modalidades</option>
                <option value="remoto">Remoto</option>
                <option value="híbrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </select>
            </div>
          </div>

          <div v-if="loading" class="loading-table loading-table--jobs">
            <div v-for="row in 5" :key="row" class="loading-row loading-row--job" />
          </div>
          <div v-else class="table-wrap table-wrap--jobs">
            <table class="data-table data-table--jobs">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Empresa</th>
                  <th>Ciudad</th>
                  <th>Modalidad</th>
                  <th>Salario</th>
                  <th>Fecha</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="job in pagedJobs" :key="`${job.title}-${job.company}-${job.published_at}`">
                  <td>{{ job.title }}</td>
                  <td>{{ job.company }}</td>
                  <td>{{ job.city }}</td>
                  <td>
                    <span :class="modalBadgeClass[job.remote_type]">
                      {{ job.remote_type }}
                    </span>
                  </td>
                  <td>{{ formatSalary(job) }}</td>
                  <td>{{ formatDate(job.published_at) }}</td>
                  <td>
                    <a class="job-link" :href="job.url" target="_blank" rel="noreferrer">Abrir</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer v-if="!loading" class="table-footer">
            <span>{{ filteredJobs.length }} resultados</span>
            <div class="pagination">
              <button class="pagination-button" type="button" :disabled="currentPage === 1" @click="currentPage -= 1">
                Anterior
              </button>
              <span>Página {{ currentPage }} de {{ totalPages }}</span>
              <button class="pagination-button" type="button" :disabled="currentPage === totalPages" @click="currentPage += 1">
                Siguiente
              </button>
            </div>
          </footer>
        </article>
      </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  background: #1a1a1a;
}

.dashboard-shell {
  min-height: 100vh;
  background: transparent;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 28px;
  backdrop-filter: blur(18px);
  background: rgba(26, 26, 26, 0.84);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 16px;
}

.brand-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(34, 211, 238, 0.16));
  color: #eef2ff;
  font-size: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-kicker,
.section-kicker {
  margin: 0 0 6px;
  color: #9ca3af;
  font-size: 0.76rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.brand-block h1,
.panel-heading h3 {
  margin: 0;
  color: #f9fafb;
}

.brand-subtitle {
  max-width: 680px;
  margin: 6px 0 0;
  color: #cbd5e1;
  line-height: 1.5;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  color: #cbd5e1;
  background: rgba(38, 38, 38, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.7);
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.25);
}

.action-button:disabled {
  cursor: wait;
  opacity: 0.75;
}

.button-spinner {
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  animation: spin 0.9s linear infinite;
}

.dashboard-main {
  padding: 28px 0 36px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.dashboard-container {
  width: min(100%, 1480px);
  margin: 0 auto;
  padding: 0 28px;
}

.dashboard-container--topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.dashboard-container--content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.kpi-grid,
.chart-grid {
  display: grid;
  gap: 24px;
}

.kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.chart-grid--primary,
.chart-grid--secondary,
.chart-grid--tables {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel {
  padding: 22px;
  border-radius: 8px;
  background: #262626;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.16);
}

.kpi-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.kpi-icon {
  --kpi-color: #6366f1;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  color: var(--kpi-color);
  background: color-mix(in srgb, var(--kpi-color) 16%, transparent);
  font-size: 1.2rem;
}

.kpi-copy p,
.kpi-copy span,
.panel-chip,
.table-footer,
.search-field input,
.filter-select,
.data-table,
.pie-card h4,
.badge,
.forecast-badge {
  color: #cbd5e1;
}

.kpi-copy p {
  margin: 0;
  font-size: 0.86rem;
}

.kpi-copy h2 {
  margin: 6px 0 4px;
  font-size: 2rem;
  line-height: 1;
  color: #ffffff;
}

.kpi-copy span {
  font-size: 0.88rem;
}

.chart-panel {
  min-height: 420px;
}

.chart-panel--wide {
  min-height: 470px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-heading--stacked {
  align-items: flex-start;
  flex-direction: column;
}

.panel-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.24);
  font-size: 0.78rem;
  font-weight: 600;
}

.chart-frame {
  position: relative;
  height: 320px;
}

.chart-frame--short {
  height: 320px;
}

.chart-frame--forecast {
  height: 360px;
}

.chart-frame--pie {
  height: 240px;
}

.pie-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pie-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(15, 15, 15, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pie-card h4 {
  margin: 0 0 12px;
  font-size: 0.95rem;
}

.forecast-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.forecast-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(15, 15, 15, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.84rem;
}

.forecast-badge strong {
  color: #f9fafb;
}

.table-panel {
  display: flex;
  flex-direction: column;
  min-height: 410px;
}

.table-panel--jobs {
  min-height: 460px;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px 180px;
  gap: 12px;
  width: 100%;
}

.search-field,
.filter-select {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.search-field input,
.filter-select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
}

.search-field input::placeholder {
  color: #6b7280;
}

.table-wrap {
  overflow: auto;
}

.table-wrap--jobs {
  flex: 1;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.94rem;
}

.data-table thead th {
  text-align: left;
  padding: 14px 10px;
  color: #f3f4f6;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table tbody td {
  padding: 14px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.data-table--jobs td:first-child {
  min-width: 220px;
}

.job-link {
  color: #93c5fd;
  font-weight: 600;
  text-decoration: none;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
}

.pagination {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.pagination-button {
  min-width: 104px;
  min-height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #1f1f1f;
  color: #f3f4f6;
  cursor: pointer;
}

.pagination-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.badge--blue {
  color: #bfdbfe;
  background: rgba(99, 102, 241, 0.16);
}

.badge--green,
.badge--success {
  color: #bbf7d0;
  background: rgba(16, 185, 129, 0.15);
}

.badge--gray {
  color: #d1d5db;
  background: rgba(148, 163, 184, 0.18);
}

.badge--warning {
  color: #fde68a;
  background: rgba(251, 191, 36, 0.15);
}

.badge--danger {
  color: #fecaca;
  background: rgba(239, 68, 68, 0.15);
}

.loading-chart,
.loading-table {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
}

.loading-chart--large {
  min-height: 360px;
}

.loading-chart--compact {
  min-height: 240px;
}

.loading-table--jobs {
  min-height: 320px;
}

.loading-line,
.loading-row {
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-line--title {
  width: 40%;
  height: 18px;
}

.loading-line--chart {
  flex: 1;
  min-height: 260px;
}

.loading-row {
  height: 52px;
}

.loading-row--job {
  height: 58px;
}

@keyframes pulse {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid--primary,
  .chart-grid--secondary,
  .chart-grid--tables {
    grid-template-columns: 1fr;
  }

  .pie-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .topbar {
    position: static;
    padding: 18px 0;
  }

  .dashboard-container {
    padding: 0 16px;
  }

  .dashboard-container--topbar,
  .topbar-actions,
  .brand-block {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .dashboard-main {
    padding: 16px 0 24px;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 18px;
  }

  .table-footer,
  .pagination {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
