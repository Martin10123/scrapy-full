export type RemoteType = 'remoto' | 'híbrido' | 'presencial'
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient-data'

export interface JobItem {
  id: number
  source: string
  title: string
  company: string
  city: string
  location_text: string
  remote_type: RemoteType
  work_mode: string
  salary_min: number | null
  salary_max: number | null
  currency: string
  description: string
  category: string
  seniority: string
  skills: string[]
  url: string
  published_at: string
  scraped_at: string
}

export interface RawJobItem {
  id?: number
  source?: string
  title?: string
  company?: string
  city?: string
  location_text?: string
  remote_type?: string
  work_mode?: string
  salary_min?: number | null
  salary_max?: number | null
  currency?: string
  description?: string
  category?: string
  seniority?: string
  skills?: string[]
  url?: string
  published_at?: string
  scraped_at?: string
}

export interface OverviewData {
  total_jobs: number
  top_sources: Array<{ label?: string; source?: string; count: number }>
  top_cities: Array<{ label?: string; city?: string; count: number }>
  remote_type_distribution: Array<{ label?: string; remote_type?: string; count: number }>
  seniority_distribution: Array<{ label?: string; seniority?: string; count: number }>
  monthly_trend: Array<{ month: string; count: number }>
  soft_skills?: Array<{ skill: string; count: number }>
  english_requirement?: Array<{ label: string; count: number }>
}

export interface ForecastSkill {
  skill: string
  history: Array<{ month: string; count: number }>
  forecast: Array<{ month: string; count: number }>
  total_observed?: number
  growth_pct: number
  projected_total: number
}

export interface ConfidenceRow {
  skill: string
  train_points?: number
  test_points?: number
  mae: number
  mape_pct: number
  confidence_level: ConfidenceLevel
}

export interface DashboardData {
  overview: OverviewData
  topSkills: Array<{ skill: string; count: number }>
  softSkills: Array<{ skill: string; count: number }>
  englishRequirement: Array<{ label: string; count: number }>
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

export const dashboardApiBase = import.meta.env.VITE_API_BASE || 'http://localhost:9000'
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

  if (
    normalized === 'hybrid' ||
    normalized === 'híbrido' ||
    normalized === 'hibrido' ||
    normalized === 'mixed' ||
    normalized === 'híbrida' ||
    normalized === 'hibrida'
  ) {
    return 'híbrido'
  }

  return 'presencial'
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function inferSeniorityFromText(...values: unknown[]) {
  const text = values.map((value) => normalizeText(value)).join(' ')

  if (!text.trim()) {
    return ''
  }

  if (
    /\b(junior|jr|trainee|intern|aprendiz|becario|practicante|entry level|entry-level|first job|primer empleo)\b/.test(text) ||
    /\b(0\s*[-–]?\s*1\s*ano|menos de\s*1\s*ano|menos de\s*un\s*ano)\b/.test(text)
  ) {
    return 'Junior'
  }

  if (
    /\b(mid|semi senior|semisenior|semi-senior|intermedio|middle)\b/.test(text) ||
    /\b(2\s*[-–]?\s*4\s*anos?|2\s*[-–]?\s*4\s*años?|2\s*[-–]?\s*4\s*year)\b/.test(text)
  ) {
    return 'Mid'
  }

  if (
    /\b(senior|sr\.?|lead|principal|staff|arquitecto|architect)\b/.test(text) ||
    /\b(5\+\s*a?ños?|mas de\s*5\s*a?ños?|more than\s*5\s*years)\b/.test(text)
  ) {
    return 'Senior'
  }

  return ''
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

export function formatSalaryRange(salaryMin: number | null, salaryMax: number | null, currency = 'COP') {
  const formatValue = (value: number) => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(value)

  if (salaryMin != null && salaryMin > 0 && salaryMax != null && salaryMax > 0) {
    return `${formatValue(salaryMin)} - ${formatValue(salaryMax)}`
  }

  if (salaryMin != null && salaryMin > 0) {
    return formatValue(salaryMin)
  }

  if (salaryMax != null && salaryMax > 0) {
    return formatValue(salaryMax)
  }

  return 'Salario no publicado'
}

export function formatSalary(job: JobItem) {
  return formatSalaryRange(job.salary_min, job.salary_max, job.currency)
}

export function normalizeJob(item: RawJobItem): JobItem {
  const inferredSeniority = inferSeniorityFromText(item.seniority, item.title, item.category, item.description, item.skills?.join(' '))

  return {
    id: item.id ?? 0,
    source: item.source ?? 'Sin fuente',
    title: item.title ?? 'Sin título',
    company: item.company ?? 'Empresa no disponible',
    city: item.city ?? 'Sin ciudad',
    location_text: item.location_text ?? '',
    remote_type: normalizeRemoteType(item.remote_type ?? item.work_mode),
    work_mode: String(item.work_mode ?? item.remote_type ?? 'presencial'),
    salary_min: item.salary_min ?? null,
    salary_max: item.salary_max ?? null,
    currency: item.currency ?? 'COP',
    description: item.description ?? '',
    category: item.category ?? '',
    seniority: inferredSeniority || String(item.seniority ?? '').trim(),
    skills: Array.isArray(item.skills) ? item.skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0) : [],
    url: item.url ?? '#',
    published_at: item.published_at ?? new Date().toISOString(),
    scraped_at: item.scraped_at ?? item.published_at ?? new Date().toISOString()
  }
}

export function normalizeJobs(items: RawJobItem[]): JobItem[] {
  return items.map(normalizeJob)
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>()

  for (const item of items) {
    const key = selector(item).trim()
    if (!key) {
      continue
    }

    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

function topEntries(counts: Map<string, number>, limit: number) {
  const entries = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'es'))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))

  return entries.length > 0 ? entries : []
}

function monthKeyFromDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return 'Sin datos'
  }

  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function buildOverviewFromJobs(jobs: JobItem[]): OverviewData {
  const sourceCounts = countBy(jobs, (job) => job.source)
  const cityCounts = countBy(jobs, (job) => job.city)
  const remoteCounts = countBy(jobs, (job) => job.remote_type)
  const seniorityCounts = countBy(jobs, (job) => mapSeniorityLabel(job.seniority))
  const monthCounts = countBy(jobs, (job) => monthKeyFromDate(job.published_at))

  return {
    total_jobs: jobs.length,
    top_sources: topEntries(sourceCounts, 5),
    top_cities: topEntries(cityCounts, 5),
    remote_type_distribution: topEntries(remoteCounts, 3),
    seniority_distribution: topEntries(seniorityCounts, 4),
    monthly_trend: Array.from(monthCounts.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .slice(-8)
      .map(([monthKey, count]) => ({ month: formatMonthLabel(monthKey), count }))
  }
}

function normalizeForecastSkills(skills: any[], fallbackData: ForecastSkill[]) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return fallbackData
  }

  return skills.map((skill) => {
    const history = Array.isArray(skill.history) ? skill.history.map((point: { month?: string; count?: number }) => ({ month: point.month ?? '', count: Number(point.count ?? 0) })) : []
    const forecast = Array.isArray(skill.forecast) ? skill.forecast.map((point: { month?: string; count?: number }) => ({ month: point.month ?? '', count: Number(point.count ?? 0) })) : []
    const totalObserved = Number(skill.total_observed ?? history.reduce((sum: number, point: { count: number }) => sum + point.count, 0))
    const projectedTotal = Number(skill.projected_total ?? totalObserved + forecast.reduce((sum: number, point: { count: number }) => sum + point.count, 0))

    return {
      skill: skill.skill ?? 'Skill',
      history,
      forecast,
      total_observed: Number.isFinite(totalObserved) ? totalObserved : 0,
      projected_total: Number.isFinite(projectedTotal) ? projectedTotal : 0,
      growth_pct: Number(skill.growth_pct ?? 0)
    }
  })
}

function normalizeConfidenceLevel(value: unknown): ConfidenceLevel {
  const normalized = String(value ?? '').toLowerCase()

  if (normalized === 'high' || normalized === 'alta') {
    return 'high'
  }

  if (normalized === 'medium' || normalized === 'media') {
    return 'medium'
  }

  if (normalized === 'low' || normalized === 'baja') {
    return 'low'
  }

  return 'insufficient-data'
}

function normalizeConfidenceRows(skills: any[], fallbackData: ConfidenceRow[]) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return fallbackData
  }

  return skills.map((skill) => ({
    skill: skill.skill ?? 'Skill',
    train_points: Number(skill.train_points ?? 0),
    test_points: Number(skill.test_points ?? 0),
    mae: Number(skill.mae ?? 0),
    mape_pct: Number(skill.mape_pct ?? 0),
    confidence_level: normalizeConfidenceLevel(skill.confidence_level)
  }))
}

function mapSeniorityLabel(value: string) {
  const normalized = normalizeText(value)

  if (normalized === 'junior') {
    return 'Junior'
  }

  if (normalized === 'mid') {
    return 'Mid'
  }

  if (normalized === 'senior') {
    return 'Senior'
  }

  return value.trim()
}

export function transformLiveData(overview: any, forecast: any, confidence: any, jobsPayload: any, fallbackData: DashboardData): DashboardData {
  const rawJobs = Array.isArray(jobsPayload?.items) ? jobsPayload.items : Array.isArray(jobsPayload) ? jobsPayload : []
  const jobs = normalizeJobs(rawJobs)
  const derivedOverview = buildOverviewFromJobs(jobs)

  // Process soft skills - handle both object and array formats
  const softSkillsArray = overview?.soft_skills && typeof overview.soft_skills === 'object'
    ? Array.isArray(overview.soft_skills)
      ? overview.soft_skills.map((item: { skill?: string; label?: string; count: number }) => ({
          skill: item.skill ?? item.label ?? 'Skill',
          count: Number(item.count)
        }))
      : Object.entries(overview.soft_skills).map(([skill, count]) => ({
          skill,
          count: Number(count)
        }))
    : []
  
  // Process English requirement - handle both object and array formats
  const englishReqArray = overview?.english_requirement_distribution && typeof overview.english_requirement_distribution === 'object'
    ? Array.isArray(overview.english_requirement_distribution)
      ? overview.english_requirement_distribution.map((item: { label?: string; count: number }) => ({
          label: item.label ?? 'Unknown',
          count: Number(item.count)
        }))
      : Object.entries(overview.english_requirement_distribution).map(([label, count]) => ({
          label: label === 'required' ? 'Requerido' : label === 'unknown' ? 'No especificado' : label,
          count: Number(count)
        }))
    : []

  return {
    overview: {
      total_jobs: Number(overview?.total_jobs ?? derivedOverview.total_jobs),
      top_sources: Array.isArray(overview?.top_sources) && overview.top_sources.length > 0 ? overview.top_sources : derivedOverview.top_sources,
      top_cities: Array.isArray(overview?.top_cities) && overview.top_cities.length > 0 ? overview.top_cities : derivedOverview.top_cities,
      remote_type_distribution: Array.isArray(overview?.remote_type_distribution) && overview.remote_type_distribution.length > 0 ? overview.remote_type_distribution : derivedOverview.remote_type_distribution,
      seniority_distribution: Array.isArray(overview?.seniority_distribution) && overview.seniority_distribution.length > 0 ? overview.seniority_distribution : derivedOverview.seniority_distribution,
      monthly_trend: Array.isArray(overview?.monthly_trend) && overview.monthly_trend.length > 0 ? overview.monthly_trend : derivedOverview.monthly_trend,
      soft_skills: softSkillsArray,
      english_requirement: englishReqArray
    },
    topSkills: overview?.top_skills && typeof overview.top_skills === 'object'
      ? Array.isArray(overview.top_skills)
        ? overview.top_skills.map((item: { skill?: string; label?: string; count: number }) => ({
            skill: item.skill ?? item.label ?? 'Skill',
            count: Number(item.count)
          }))
        : Object.entries(overview.top_skills).map(([skill, count]) => ({
            skill,
            count: Number(count)
          }))
      : jobs.reduce<Array<{ skill: string; count: number }>>((accumulator, job) => {
          for (const skill of job.skills) {
            const existingSkill = accumulator.find((entry) => entry.skill === skill)
            if (existingSkill) {
              existingSkill.count += 1
            }
            else {
              accumulator.push({ skill, count: 1 })
            }
          }
          return accumulator
        }, []).sort((left: { skill: string; count: number }, right: { skill: string; count: number }) => right.count - left.count).slice(0, 8),
    softSkills: softSkillsArray.sort((left: { skill: string; count: number }, right: { skill: string; count: number }) => right.count - left.count).slice(0, 8),
    englishRequirement: englishReqArray,
    forecastSkills: normalizeForecastSkills(forecast?.skills, fallbackData.forecastSkills),
    confidenceRows: normalizeConfidenceRows(confidence?.skills, fallbackData.confidenceRows),
    jobs: jobs.length > 0 ? jobs : fallbackData.jobs
  }
}

export function createInitialDashboard(): DashboardData {
  return {
    overview: {
      total_jobs: 0,
      top_sources: [],
      top_cities: [],
      remote_type_distribution: [],
      seniority_distribution: [],
      monthly_trend: [],
      soft_skills: [],
      english_requirement: []
    },
    topSkills: [],
    softSkills: [],
    englishRequirement: [],
    forecastSkills: [],
    confidenceRows: [],
    jobs: []
  }
}

export function createFallbackDashboard(): DashboardData {
  return createInitialDashboard()
}
