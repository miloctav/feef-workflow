<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import type { SelectItem } from '@nuxt/ui';

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const chartRef = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<Chart<"line", number[], string> | null>(null);

// Années disponibles et sélection
const yearsList = [2023, 2024, 2025];
const selectedYear = ref(yearsList[yearsList.length - 1]);

function prevYear() {
  const idx = yearsList.indexOf(selectedYear.value);
  if (idx > 0) selectedYear.value = yearsList[idx - 1];
}
function nextYear() {
  const idx = yearsList.indexOf(selectedYear.value);
  if (idx < yearsList.length - 1) selectedYear.value = yearsList[idx + 1];
}

// Données fictives par année
const auditsDataByYear: Record<number, number[]> = {
  2023: [1, 2, 2, 3, 2, 4, 5, 3, 2, 4, 2, 1],
  2024: [2, 3, 4, 5, 3, 6, 7, 5, 4, 6, 3, 2],
  2025: [3, 4, 5, 6, 4, 7, 8, 6, 5, 7, 4, 3],
};

const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = new Chart(chartRef.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Audits prévus',
            data: auditsDataByYear[selectedYear.value]!,
            fill: false,
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 3,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16, bottom: 16, left: 16, right: 16 } },
        plugins: {
          legend: { display: false }, // on gère notre propre légende
          tooltip: { enabled: true }
        },
        scales: {
          x: {
            grid: { display: false },
            title: { display: true, text: 'Mois', font: { size: 12 } },
            ticks: { font: { size: 12 } }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Audits prévus', font: { size: 12 } },
            ticks: { font: { size: 12 } }
          }
        }
      }
    });
  }
});


</script>

<template>
  <div class="w-full flex flex-col items-center py-4" style="height: 350px;">
    <!-- Graphique -->
    <div style="height: 300px; width: 100%;" class="flex justify-center items-center">
      <canvas ref="chartRef" style="width: 100%; height: 100%;"></canvas>
    </div>
    <!-- Sélecteur d'année sous le graphique -->
    <div class="mt-4 flex justify-center w-full">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" @click="prevYear" :disabled="selectedYear === yearsList[0]" variant="outline" color="neutral" />
        <span class="font-semibold text-lg w-16 text-center">{{ selectedYear }}</span>
        <UButton icon="i-heroicons-chevron-right" @click="nextYear" :disabled="selectedYear === yearsList[yearsList.length-1]" variant="outline" color="neutral" />
      </div>
    </div>
  </div>
</template>
