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

// Use dashboard overview composable
const { labeledEntitiesChartData } = useDashboardOverview()

const chartRef = ref<HTMLCanvasElement | null>(null)

useChart(chartRef, () => {
  const { years, initial, renewal, monitoring } = labeledEntitiesChartData.value
  if (!years.length) return null

  return {
    type: 'bar',
    data: {
      labels: years.map(String),
      datasets: [
        {
          label: 'Initial',
          data: initial,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 6,
          stack: 'Stack 0',
        },
        {
          label: 'Renouvellement',
          data: renewal,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6,
          stack: 'Stack 0',
        },
        {
          label: 'Surveillance',
          data: monitoring,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          borderRadius: 6,
          stack: 'Stack 0',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 16 },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Année', font: { size: 12 } },
          ticks: { font: { size: 12 } },
          stacked: true,
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Labellisés', font: { size: 12 } },
          ticks: { font: { size: 12 } },
          stacked: true,
        },
      },
    },
  }
})
</script>

<template>
  <div
    class="w-full flex flex-col items-center py-4"
    style="height: 340px"
  >
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
