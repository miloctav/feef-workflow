import type { Ref } from 'vue'
import { markRaw, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { ChartConfiguration } from 'chart.js'
import { Chart } from 'chart.js'

/**
 * Gère le cycle de vie d'un graphique Chart.js dans un composant.
 *
 * `configFactory` renvoie la configuration du graphique, ou `null` tant qu'il
 * n'y a rien à dessiner (données pas encore chargées, série vide). Le graphique
 * est redessiné dès que la configuration change, et détruit au démontage.
 *
 * Deux précautions indispensables :
 * - l'instance est stockée dans un `shallowRef` + `markRaw`. Un `ref()` classique
 *   l'envelopperait dans un proxy réactif : `destroy()` s'exécuterait alors sur le
 *   proxy alors que Chart.js a enregistré l'objet brut auprès de son animator, qui
 *   continuerait donc d'animer une instance détruite (`ctx` à `null`) jusqu'à lever
 *   « Cannot read properties of null (reading 'save') ». Cette erreur interrompt la
 *   boucle de rendu partagée, et tous les graphiques de la page restent vides ;
 * - on ne crée jamais de graphique sans données, sinon son animation est encore en
 *   cours lorsque l'arrivée des données déclenche un `destroy()`, ce qui reproduit
 *   exactement le même scénario.
 */
export function useChart(
  canvas: Ref<HTMLCanvasElement | null>,
  configFactory: () => ChartConfiguration | null,
) {
  const instance = shallowRef<Chart | null>(null)

  const destroy = () => {
    instance.value?.destroy()
    instance.value = null
  }

  const render = () => {
    destroy()

    const config = configFactory()
    if (!canvas.value || !config) return

    instance.value = markRaw(new Chart(canvas.value, config))
  }

  onMounted(render)
  watch(configFactory, render)
  onBeforeUnmount(destroy)

  return { instance, render, destroy }
}
