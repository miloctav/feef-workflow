<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import type { SelectItem } from '@nuxt/ui';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const chartRef = ref<HTMLCanvasElement | null>(null);

// Plages d'années disponibles
const yearRanges: SelectItem[] = [
  { label: '2021-2023', value: '2021-2023' },
  { label: '2022-2024', value: '2022-2024' },
  { label: '2023-2025', value: '2023-2025' },
];
const selectedRange = ref(yearRanges[0].value);

const rangesList = [
  { label: '2021-2023', years: [2021, 2022, 2023] },
  { label: '2022-2024', years: [2022, 2023, 2024] },
  { label: '2023-2025', years: [2023, 2024, 2025] },
];
const selectedRangeIdx = ref(0);

// Labels et données
const allLabels = [2021, 2022, 2023, 2024, 2025];
const allData = [5, 18, 27, 31, 8];

const filteredLabels = computed(() => rangesList[selectedRangeIdx.value].years);
const filteredData = computed(() => filteredLabels.value.map(y => allData[allLabels.indexOf(y)]));

function prevRange() {
  if (selectedRangeIdx.value > 0) selectedRangeIdx.value--;
}
function nextRange() {
  if (selectedRangeIdx.value < rangesList.length - 1) selectedRangeIdx.value++;
}

const chartInstance = ref<Chart<'bar', number[], string> | null>(null);

onMounted(() => {
  if (!chartRef.value) return;

  chartInstance.value = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels: filteredLabels.value,
      datasets: [
        {
          label: 'Labellisés',
          data: filteredData.value,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          borderRadius: 6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 16 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Année', font: { size: 12 } },
          ticks: { font: { size: 12 } }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Labellisés', font: { size: 12 } },
          ticks: { font: { size: 12 } }
        }
      }
    }
  });
});


</script>

<template>
  <div class="w-full flex flex-col items-center py-4" style="height: 340px;">
    <div style="height: 300px; width: 100%;" class="flex justify-center items-center">
      <canvas ref="chartRef" style="width: 100%; height: 100%;"></canvas>
    </div>
    <!-- Sélecteur de plage d'années sous le graphique -->
    <div class="mt-4 flex justify-center w-full">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" @click="prevRange" :disabled="selectedRangeIdx === 0" variant="outline" color="neutral" />
        <span class="font-semibold text-lg w-32 text-center">{{ rangesList[selectedRangeIdx].label }}</span>
        <UButton icon="i-lucide-chevron-right" @click="nextRange" :disabled="selectedRangeIdx === rangesList.length-1" variant="outline" color="neutral" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ajoutez ici vos styles personnalisés si nécessaire */
</style>
