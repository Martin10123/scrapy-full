export type RemoteType = 'remoto' | 'híbrido' | 'presencial'
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient-data'

export interface JobItem {
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

export interface OverviewData {
  total_jobs: number
  top_sources: Array<{ label?: string; source?: string; count: number }>
  top_cities: Array<{ label?: string; city?: string; count: number }>
  remote_type_distribution: Array<{ label?: string; remote_type?: string; count: number }>
  seniority_distribution: Array<{ label?: string; seniority?: string; count: number }>
  monthly_trend: Array<{ month: string; count: number }>
}

export interface ForecastSkill {
  skill: string
  history: Array<{ month: string; count: number }>
  forecast: Array<{ month: string; count: number }>
  growth_pct: number
  projected_total: number
}

export interface ConfidenceRow {
  skill: string
  mae: number
  mape_pct: number
  confidence_level: ConfidenceLevel
}

export interface DashboardData {
  overview: OverviewData
  topSkills: Array<{ skill: string; count: number }>
  forecastSkills: ForecastSkill[]
  confidenceRows: ConfidenceRow[]
  jobs: JobItem[]
}

export interface DashboardKpi {
  label: string
  value: string
  detail: string
  icon: string
  tone: string
}

export interface SelectOption {
  label: string
  value: string
}

export const dashboardApiBase = 'http://localhost:8080'
export const jobsPerPage = 6
export const forecastStartIndex = 5

export const remoteTypeOptions: SelectOption[] = [
  { label: 'Todas las modalidades', value: 'all' },
  { label: 'Remoto', value: 'remoto' },
  { label: 'Híbrido', value: 'híbrido' },
  { label: 'Presencial', value: 'presencial' }
]

export const confidenceSeverityMap: Record<ConfidenceLevel, 'info' | 'warning' | 'danger' | 'secondary'> = {
  high: 'info',
  medium: 'warning',
  low: 'danger',
  'insufficient-data': 'secondary'
}

export const remoteTypeSeverityMap: Record<RemoteType, 'info' | 'warning'> = {
  remoto: 'info',
  'híbrido': 'info',
  presencial: 'warning'
}

export const palette = {
  primary: '#2563eb',
  teal: '#06b6d4',
  amber: '#f59e0b',
  rose: '#ec4899',
  orange: '#f97316',
  border: 'rgba(148, 163, 184, 0.18)',
  textMuted: '#64748b',
  textStrong: '#0f172a'
} as const

export const chartPalette = [palette.primary, palette.teal, palette.amber, palette.rose, palette.orange]

export function normalizeRemoteType(value: unknown): RemoteType {
  const normalized = String(value ?? '').toLowerCase()

  if (normalized === 'remote' || normalized === 'remoto') {
    return 'remoto'
  }

  if (normalized === 'hybrid' || normalized === 'híbrido' || normalized === 'hibrido') {
    return 'híbrido'
  }

  return 'presencial'
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatCurrency(value: number) {
  if (!value) {
    return 'N/D'
  }

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short'
  }).format(new Date(value))
}

export function formatSalary(job: JobItem) {
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

export function normalizeJobs(items: any[]): JobItem[] {
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

export function transformLiveData(overview: any, forecast: any, confidence: any, jobsPayload: any, fallbackData: DashboardData): DashboardData {
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

export function createFallbackDashboard(): DashboardData {
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
