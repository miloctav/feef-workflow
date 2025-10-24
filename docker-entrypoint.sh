#!/bin/sh

# Script d'entrypoint pour le conteneur Docker
# Exécute les initialisations nécessaires avant de démarrer l'application

set -e  # Arrête le script en cas d'erreur

# Se placer dans le répertoire de l'application
cd /app

echo "=========================================="
echo "🚀 Démarrage de l'application FEEF Workflow"
echo "=========================================="

# Étape 1 : Appliquer les migrations de la base de données
echo ""
echo "📦 Étape 1/2 : Application des migrations de la base de données"
echo "------------------------------------------"
NODE_PATH=/app/node_modules npx tsx server/database/migrate.ts
if [ $? -eq 0 ]; then
  echo "✅ Migrations appliquées avec succès"
else
  echo "❌ Échec des migrations - arrêt du démarrage"
  exit 1
fi

# Étape 2 : Initialiser le stockage MinIO
echo ""
echo "💾 Étape 2/2 : Initialisation du stockage MinIO"
echo "------------------------------------------"
NODE_PATH=/app/node_modules npx tsx server/database/init-storage.ts
if [ $? -eq 0 ]; then
  echo "✅ Stockage initialisé avec succès"
else
  echo "❌ Échec de l'initialisation du stockage - arrêt du démarrage"
  exit 1
fi

# Étape 3 : Démarrer l'application
echo ""
echo "🌟 Démarrage de l'application Nuxt"
echo "=========================================="
exec node server/index.mjs
