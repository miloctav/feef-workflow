import { UButton } from '#components'

export function useSortableColumn(currentSort: Ref<string>, setSort: (v: string) => void) {
    const createSortableHeader = (label: string, sortField: string) => {
        return () => {
            // Si currentSort n'est pas défini, on suppose un tri par défaut (ex: updatedAt:desc) ou vide
            const sortValue = unref(currentSort) || ''
            const [field, order] = sortValue.split(':')

            const isActive = field === sortField
            // Si actif, on utilise l'ordre actuel, sinon par défaut on triera par asc au premier clic (donc l'icône montre qu'on peut trier)
            // Logique demandée : 
            // Premier clic: tri ascendant (icône flèche haut) => donc next sort est asc
            // Deuxième clic: tri descendant (icône flèche bas)

            const icon = isActive
                ? (order === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
                : 'i-lucide-arrow-up-down'

            return h(UButton, {
                color: 'neutral',
                variant: 'ghost',
                label,
                icon,
                class: '-mx-2.5',
                // Logic de clic : si actif et asc -> desc, sinon -> asc
                onClick: () => {
                    const newSort = `${sortField}:${isActive && order === 'asc' ? 'desc' : 'asc'}`
                    console.log('[useSortableColumn] Clicked. New sort:', newSort)
                    setSort(newSort)
                }
            })
        }
    }
    return { createSortableHeader }
}
