import { nextTick, onBeforeUnmount, ref, type Ref, watch } from 'vue'
import { Chart, registerables, type ChartConfiguration, type Plugin } from 'chart.js'
import { chartPalette, forecastStartIndex, palette, type DashboardData, type ForecastSkill } from '../helpers/dashboard'

Chart.register(...registerables)

export function useDashboardCharts(dashboard: Ref<DashboardData>, loading: Ref<boolean>) {
  const trendCanvas = ref<HTMLCanvasElement | null>(null)
  const skillsCanvas = ref<HTMLCanvasElement | null>(null)
  const softSkillsCanvas = ref<HTMLCanvasElement | null>(null)
  const forecastCanvas = ref<HTMLCanvasElement | null>(null)
  const citiesCanvas = ref<HTMLCanvasElement | null>(null)
  const modalityCanvas = ref<HTMLCanvasElement | null>(null)
  const seniorityCanvas = ref<HTMLCanvasElement | null>(null)
  const englishCanvas = ref<HTMLCanvasElement | null>(null)
  const chartInstances: Chart[] = []

  watch([dashboard, loading], async ([, isLoading]) => {
    if (isLoading) {
      return
    }

    destroyCharts()
    await nextTick()
    renderCharts()
  }, { deep: true })

  onBeforeUnmount(() => {
    destroyCharts()
  })

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
              hoverBackgroundColor: '#3b82f6',
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
            const color = chartPalette[index % chartPalette.length]
            const series = [...skill.history.map((point) => point.count), ...skill.forecast.map((point) => point.count)]

            return {
              label: skill.skill,
              data: series,
              borderColor: color,
              backgroundColor: `${color}1a`,
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

    if (softSkillsCanvas.value) {
      const topSoftSkills = dashboard.value.softSkills.slice(0, 8)

      chartInstances.push(createChart(softSkillsCanvas.value, {
        type: 'bar',
        data: {
          labels: topSoftSkills.map((item) => item.skill),
          datasets: [
            {
              label: 'Menciones',
              data: topSoftSkills.map((item) => item.count),
              borderRadius: 10,
              backgroundColor: palette.teal,
              hoverBackgroundColor: '#0891b2',
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

    if (englishCanvas.value) {
      chartInstances.push(createChart(englishCanvas.value, createDoughnutChart(dashboard.value.englishRequirement, 'Requisito de Inglés')))
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
          backgroundColor: '#ffffff',
          titleColor: palette.textStrong,
          bodyColor: '#334155',
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
        color: 'rgba(148, 163, 184, 0.18)'
      },
      ticks: {
        color: palette.textMuted,
        font: {
          size: 12
        },
        padding: 8
      },
      border: {
        color: 'rgba(148, 163, 184, 0.22)'
      },
      suggestedMin: allowGrow ? 0 : undefined
    }
  }

  function createDoughnutChart(entries: Array<{ label?: string; city?: string; remote_type?: string; seniority?: string; count: number }>, title: string) {
    return {
      type: 'doughnut' as const,
      data: {
        labels: entries.map((entry) => entry.label ?? entry.city ?? entry.remote_type ?? entry.seniority ?? 'Otro'),
        datasets: [
          {
            label: title,
            data: entries.map((entry) => entry.count),
            backgroundColor: entries.map((_, index) => chartPalette[index % chartPalette.length]),
            borderColor: '#ffffff',
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
      if (!area) {
        return
      }
      const start = xScale.getPixelForValue(forecastStartIndex)
      const context = chart.ctx

      context.save()
      context.fillStyle = 'rgba(37, 99, 235, 0.08)'
      context.fillRect(start, area.top, area.right - start, area.bottom - area.top)
      context.strokeStyle = 'rgba(37, 99, 235, 0.35)'
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
    if (!chartArea) {
      return color
    }

    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, `${color}40`)
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

  return {
    trendCanvas,
    skillsCanvas,
    softSkillsCanvas,
    forecastCanvas,
    citiesCanvas,
    modalityCanvas,
    seniorityCanvas,
    englishCanvas,
    renderCharts,
    destroyCharts
  }
}
