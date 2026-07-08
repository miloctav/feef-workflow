<script setup lang="ts">
import { ref } from 'vue'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { compareScheduledAuditsChart } = useDashboardCompare()

const chartRef = ref<HTMLCanvasElement | null>(null)

useChart(chartRef, () => {
  const chart = compareScheduledAuditsChart.value
  if (!chart || !chart.labels.length) return null

  return {
    type: 'bar',
    data: { labels: chart.labels, datasets: chart.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 16, bottom: 16, left: 16, right: 16 } },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Mois', font: { size: 12 } },
          ticks: { font: { size: 12 } },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Audits prévus', font: { size: 12 } },
          ticks: { font: { size: 12 } },
        },
      },
    },
  }
})
</script>

<template>
  <div
    class="w-full flex flex-col items-center py-4"
    style="height: 350px"
  >
    <div
      style="height: 300px; width: 100%"
      class="flex justify-center items-center"
    >
      <canvas
        ref="chartRef"
        style="width: 100%; height: 100%"
      />
    </div>
  </div>
</template>
