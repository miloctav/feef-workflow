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

// Use dashboard overview composable
const { labeledEntitiesChartData, loading } = useDashboardOverview()

const chartRef = ref<HTMLCanvasElement | null>(null)
const chartInstance = ref<Chart<'bar', number[], string> | null>(null)

// Fonction pour mettre à jour le graphique (appelée au montage et lors du changement de plage)
function renderChart() {
  if (!chartRef.value || !labeledEntitiesChartData.value) return

  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  const { years, initial, renewal, monitoring } = labeledEntitiesChartData.value

  chartInstance.value = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels: years,
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
  })
}

onMounted(() => {
  renderChart()
})

// Mettre à jour le graphique quand les données changent
watch(labeledEntitiesChartData, () => {
  renderChart()
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

<style scoped>
/* Ajoutez ici vos styles personnalisés si nécessaire */
</style>
