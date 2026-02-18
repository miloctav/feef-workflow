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

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const { compareLabeledEntitiesChart, loading } = useDashboardCompare()

const chartRef = ref<HTMLCanvasElement | null>(null)
const chartInstance = ref<Chart<'bar', number[], string> | null>(null)

function renderChart() {
  if (!chartRef.value || !compareLabeledEntitiesChart.value) return
  if (chartInstance.value) chartInstance.value.destroy()

  const { labels, datasets } = compareLabeledEntitiesChart.value

  chartInstance.value = new Chart(chartRef.value, {
    type: 'bar',
    data: { labels, datasets },
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
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Labellisés', font: { size: 12 } },
          ticks: { font: { size: 12 } },
        },
      },
    },
  })
}

onMounted(() => renderChart())
watch(compareLabeledEntitiesChart, () => renderChart())
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
      />
    </div>
  </div>
</template>
