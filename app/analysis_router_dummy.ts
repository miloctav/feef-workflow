import type { RouterConfig } from '@nuxt/schema'

// https://router.vuejs.org/api/interfaces/routeroptions.html
export default <RouterConfig>{
    routes: (_routes) => {
        return _routes
    },
    // Personnaliser le comportement du routeur si nécessaire
    // Note: Nuxt ne fournit pas d'option native simple 'exclude' dans router.options pour le build.
    // Cependant, le problème "Page not found" vient du fait que Vue Router essaie de matcher l'URL.
    // La solution la plus propre est d'utiliser target="_blank" ou rel="external" sur les liens,
    // ce qui est déjà le cas dans DocumentViewer (<UButton ... target="_blank" />).
    //
    // Si l'erreur persiste alors que target="_blank" est utilisé, c'est peut-être que l'URL
    // est ouverte via window.open ou une navigation programmatique sans 'external: true'.
    //
    // Le code de DocumentViewer utilise :
    // <UButton :href="currentSignedUrl" target="_blank" ... />
    //
    // Si currentSignedUrl commence par '/', NuxtLink (utilisé par UButton) va essayer de l'intercepter.
    // Comme nous avons changé le domaine pour être relatif (ou même domaine), Nuxt le voit comme interne.
    //
    // Nous allons forcer le comportement "non-SPA" pour ces liens via un plugin ou juste dire à l'utilisateur
    // de s'assurer que le lien est absolu (commence par http/https) ce qui est le cas (https://monpmeplus.fr/...).
    //
    // ATTENTION: Le log montre une 404 sur une URL relative :
    // Page not found: /feef-storage/documents/...
    //
    // Cela signifie que le navigateur a navigué vers cette URL et que l'app JS s'est chargée (car /feef-storage/ n'est pas exclu par Nginx pour le asset serving ? Non, Nginx sert l'app sur /).
    //
    // Si Nginx est configuré pour:
    // location /feef-storage/ { proxy_pass ... }
    // location / { proxy_pass http://app:3000 }
    //
    // Alors une requête vers /feef-storage/ DEVRAIT être interceptée par Nginx et JAMAIS atteindre l'app Nuxt.
    //
    // SI l'utilisateur a cette erreur, c'est que :
    // 1. Soit la config Nginx n'a pas été rechargée/appliquée correctement (et donc ça tombe dans location / -> app).
    // 2. Soit l'URL utilisée par le client ne matche pas exactement la location Nginx.
    //
    // L'erreur "Page not found" vient de Vue Router, donc l'app EST chargée. Donc Nginx a servi l'app.
    // Donc la requête n'a PAS été interceptée par le block /feef-storage/.
    //
    // Hypothèse : L'ordre des locations dans Nginx ? OU le reload n'a pas marché.
    // Le fichier default.conf montre /feef-storage/ AVANT /. C'est correct.
    //
    // Hypothèse forte : Le conteneur Nginx n'a pas pris la config.
}
