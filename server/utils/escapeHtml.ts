/**
 * Échappe les caractères spéciaux HTML pour empêcher toute injection de balises
 * lorsqu'une donnée utilisateur est interpolée dans un email HTML.
 *
 * À utiliser sur toute variable d'origine utilisateur (nom, prénom, nom d'entité,
 * titre d'action, etc.) insérée dans le corps d'un template email.
 * Ne pas l'appliquer aux URLs générées côté serveur (casserait les & des query).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
