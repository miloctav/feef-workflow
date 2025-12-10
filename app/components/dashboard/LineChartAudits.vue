<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
// @ts-ignore
import ChartDataLabels from 'chartjs-plugin-datalabels'

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartDataLabels
)

// Use dashboard overview composable
const { scheduledAuditsChartData, loading } = useDashboardOverview()

const chartRef = ref<HTMLCanvasElement | null>(null)
const chartInstance = ref<Chart<'bar', number[], string> | null>(null)

function renderChart() {
  if (!chartRef.value || !scheduledAuditsChartData.value) return
  if (chartInstance.value) chartInstance.value.destroy()

  const { labels, initial, renewal, monitoring } = scheduledAuditsChartData.value

  chartInstance.value = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Initial',
          data: initial,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          borderRadius: 6,
          stack: 'Stack 0',
        },
        {
          label: 'Renouvellement',
          data: renewal,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 2,
          borderRadius: 6,
          stack: 'Stack 0',
        },
        {
          label: 'Surveillance',
          data: monitoring,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 2,
          borderRadius: 6,
          stack: 'Stack 0',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 16, bottom: 16, left: 16, right: 16 } },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
        datalabels: {
          anchor: 'center',
          align: 'center',
          color: '#fff',
          font: { weight: 'bold', size: 14 },
          formatter: function (value: number) {
            return value || ''
          },
        } as any,
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Mois', font: { size: 12 } },
          ticks: { font: { size: 12 } },
          stacked: true,
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Audits prévus', font: { size: 12 } },
          ticks: { font: { size: 12 } },
          stacked: true,
        },
      },
    },
  })
}

onMounted(() => {
  renderChart()
})

// Re-render when data changes
watch(scheduledAuditsChartData, () => {
  renderChart()
})
</script>

<template>
  <div
    class="w-full flex flex-col items-center py-4"
    style="height: 350px"
  >
    <!-- Graphique -->
    <div
      style="height: 300px; width: 100%"
      class="flex justify-center items-center"
    >
      <canvas
        ref="chartRef"
        style="width: 100%; height: 100%"
      ></canvas>
    </div>
  </div>
</template>
