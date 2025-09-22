<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
// @ts-ignore
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { SelectItem } from '@nuxt/ui';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels);

const chartRef = ref<HTMLCanvasElement | null>(null);
const chartInstance = ref<Chart<'bar', number[], string> | null>(null);

// Années disponibles et sélection
const yearsList = [2023, 2024, 2025];
const selectedYear = ref<number>(yearsList[yearsList.length - 1]);

function prevYear() {
  const idx = yearsList.indexOf(selectedYear.value ?? yearsList[0]);
  if (idx > 0) selectedYear.value = yearsList[idx - 1];
}
function nextYear() {
  const idx = yearsList.indexOf(selectedYear.value ?? yearsList[0]);
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
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Audits prévus',
            data: auditsDataByYear[selectedYear.value ?? yearsList[0]] ?? [],
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 2,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16, bottom: 16, left: 16, right: 16 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
          datalabels: {
            anchor: 'center',
            align: 'center',
            color: '#fff',
            font: { weight: 'bold', size: 14 },
            formatter: function(value: number) { return value; }
          } as any
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
    <div class="flex justify-center w-full">
      <div class="flex items-center gap-2">
        <UButton icon="i-lucide-chevron-left" @click="prevYear" :disabled="selectedYear === yearsList[0]" variant="outline" color="neutral" />
        <span class="font-semibold text-lg w-16 text-center">{{ selectedYear }}</span>
        <UButton icon="i-heroicons-chevron-right" @click="nextYear" :disabled="selectedYear === yearsList[yearsList.length-1]" variant="outline" color="neutral" />
      </div>
    </div>
  </div>
</template>
