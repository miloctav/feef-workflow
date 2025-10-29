#!/bin/bash

# Script de mise à jour sécurisée de FEEF Workflow
# Usage: ./update.sh [--skip-backup]

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/apps/backups"
DATE=$(date +%Y%m%d_%H%M%S)
SKIP_BACKUP=false

# Vérifier les arguments
if [ "$1" == "--skip-backup" ]; then
    SKIP_BACKUP=true
fi

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  FEEF Workflow - Mise à jour${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Erreur: Le répertoire $APP_DIR n'existe pas${NC}"
    exit 1
fi

cd "$APP_DIR"

# Vérifier que Docker est disponible
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erreur: Docker n'est pas installé ou accessible${NC}"
    exit 1
fi

# Vérifier que docker compose est disponible
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Erreur: Docker Compose n'est pas installé ou accessible${NC}"
    exit 1
fi

# === NOUVELLE VÉRIFICATION: Fichier .env ===
echo -e "${YELLOW}[0/9] Vérification de la configuration...${NC}"

if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${RED}✗ Fichier .env introuvable${NC}"
    echo ""
    echo -e "${YELLOW}Le fichier .env est requis pour l'application.${NC}"
    echo ""
    read -p "Voulez-vous le créer maintenant avec le script d'initialisation ? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        if [ -f "$SCRIPT_DIR/setup-env.sh" ]; then
            bash "$SCRIPT_DIR/setup-env.sh" production
            echo ""
            echo -e "${GREEN}Configuration terminée. Relancez ./update.sh pour continuer la mise à jour.${NC}"
            exit 0
        else
            echo -e "${RED}Erreur: setup-env.sh introuvable${NC}"
            echo "Veuillez créer manuellement le fichier .env à partir de .env.production.example"
            exit 1
        fi
    else
        echo ""
        echo -e "${YELLOW}Veuillez créer le fichier .env avant de continuer :${NC}"
        echo "  1. Copiez .env.production.example vers .env"
        echo "  2. Modifiez les valeurs selon votre configuration"
        echo "  ou lancez: ${GREEN}./scripts/setup-env.sh production${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Fichier .env trouvé${NC}"

# Créer le répertoire de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Étape 1: Vérifier les mises à jour disponibles
echo -e "${YELLOW}[1/9] Vérification des mises à jour Git...${NC}"
git fetch

LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✓ Aucune mise à jour disponible${NC}"
    read -p "Voulez-vous quand même reconstruire l'application ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Mise à jour annulée${NC}"
        exit 0
    fi
    SKIP_ENV_CHECK=true
else
    echo -e "${GREEN}✓ Mises à jour disponibles${NC}"
    SKIP_ENV_CHECK=false
fi

# Étape 2: Backup de la base de données
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${YELLOW}[2/9] Sauvegarde de la base de données...${NC}"

    # Vérifier que PostgreSQL est en cours d'exécution
    if docker compose ps postgres | grep -q "Up"; then
        BACKUP_FILE="$BACKUP_DIR/postgres_backup_$DATE.sql"
        docker compose exec -T postgres pg_dump -U ${POSTGRES_USER:-feef_user} ${POSTGRES_DB:-feef_db} > "$BACKUP_FILE"

        if [ -f "$BACKUP_FILE" ]; then
            # Compresser le backup
            gzip "$BACKUP_FILE"
            echo -e "${GREEN}✓ Backup sauvegardé: $BACKUP_FILE.gz${NC}"

            # Garder seulement les 10 derniers backups
            ls -t "$BACKUP_DIR"/postgres_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
            echo -e "${GREEN}✓ Anciens backups nettoyés (max 10 conservés)${NC}"
        else
            echo -e "${RED}✗ Erreur lors de la création du backup${NC}"
            read -p "Continuer quand même ? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠ PostgreSQL n'est pas en cours d'exécution, backup ignoré${NC}"
    fi
else
    echo -e "${YELLOW}[2/9] Sauvegarde ignorée (--skip-backup)${NC}"
fi

# Étape 3: Backup des volumes Garage (optionnel)
echo -e "${YELLOW}[3/9] Sauvegarde des fichiers Garage...${NC}"
if docker compose ps garage | grep -q "Up"; then
    GARAGE_BACKUP="$BACKUP_DIR/garage_backup_$DATE.tar.gz"
    docker run --rm \
        -v feef-workflow_garage_meta:/garage_meta \
        -v feef-workflow_garage_data:/garage_data \
        -v "$BACKUP_DIR":/backup \
        alpine tar czf /backup/garage_backup_$DATE.tar.gz /garage_meta /garage_data 2>/dev/null || true

    if [ -f "$GARAGE_BACKUP" ]; then
        echo -e "${GREEN}✓ Backup Garage sauvegardé: $GARAGE_BACKUP${NC}"
        # Garder seulement les 5 derniers backups Garage
        ls -t "$BACKUP_DIR"/garage_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    else
        echo -e "${YELLOW}⚠ Backup Garage ignoré${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Garage n'est pas en cours d'exécution, backup ignoré${NC}"
fi

# Étape 4: Backup du .env actuel
echo -e "${YELLOW}[4/9] Sauvegarde de la configuration actuelle...${NC}"
ENV_BACKUP="$BACKUP_DIR/env_backup_$DATE"
cp "$APP_DIR/.env" "$ENV_BACKUP"
echo -e "${GREEN}✓ Configuration sauvegardée: $ENV_BACKUP${NC}"

# Étape 5: Pull des dernières modifications
echo -e "${YELLOW}[5/9] Récupération des dernières modifications...${NC}"
git pull
echo -e "${GREEN}✓ Code mis à jour${NC}"

# === NOUVELLE ÉTAPE: Vérification des variables d'environnement ===
echo -e "${YELLOW}[6/9] Vérification des variables d'environnement...${NC}"

if [ "$SKIP_ENV_CHECK" = false ] && [ -f "$APP_DIR/.env.production.example" ]; then
    # Extraire les noms de variables du template (ignorer les commentaires et lignes vides)
    TEMPLATE_VARS=$(grep -E '^[A-Z_]+=' "$APP_DIR/.env.production.example" | cut -d'=' -f1 | sort)
    # Extraire les noms de variables du .env actuel
    CURRENT_VARS=$(grep -E '^[A-Z_]+=' "$APP_DIR/.env" | cut -d'=' -f1 | sort)

    # Trouver les variables manquantes
    MISSING_VARS=$(comm -23 <(echo "$TEMPLATE_VARS") <(echo "$CURRENT_VARS"))

    if [ -n "$MISSING_VARS" ]; then
        echo -e "${YELLOW}⚠ Nouvelles variables d'environnement détectées :${NC}"
        echo "$MISSING_VARS"
        echo ""
        echo -e "${BLUE}Ces variables sont présentes dans .env.production.example mais absentes de votre .env${NC}"
        echo ""

        read -p "Voulez-vous les ajouter maintenant ? (Y/n) " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            # Fonction pour générer un secret
            generate_secret() {
                openssl rand -base64 32 | tr -d '\n'
            }

            # Pour chaque variable manquante, demander la valeur
            for var in $MISSING_VARS; do
                # Récupérer la ligne du template pour avoir le commentaire/contexte
                template_line=$(grep "^$var=" "$APP_DIR/.env.production.example")
                default_value=$(echo "$template_line" | cut -d'=' -f2-)

                echo ""
                echo -e "${BLUE}Variable: ${YELLOW}$var${NC}"
                echo -e "Valeur template: ${default_value}"

                # Auto-générer les secrets
                if [[ "$var" == "NUXT_SESSION_PASSWORD" ]] || [[ "$var" == "JWT_SECRET" ]]; then
                    new_value=$(generate_secret)
                    echo -e "${GREEN}✓ Secret auto-généré${NC}"
                else
                    read -p "Nouvelle valeur (Entrée pour valeur template): " new_value
                    if [ -z "$new_value" ]; then
                        new_value="$default_value"
                    fi
                fi

                # Ajouter au .env
                echo "$var=$new_value" >> "$APP_DIR/.env"
                echo -e "${GREEN}✓ $var ajouté${NC}"
            done

            echo ""
            echo -e "${GREEN}✓ Toutes les variables ont été ajoutées${NC}"
            echo -e "${BLUE}Les nouvelles valeurs ont été ajoutées à la fin du fichier .env${NC}"
        else
            echo -e "${YELLOW}⚠ Variables non ajoutées. L'application pourrait ne pas fonctionner correctement.${NC}"
            echo -e "${YELLOW}Vérifiez manuellement .env.production.example et ajoutez les variables manquantes.${NC}"
        fi
    else
        echo -e "${GREEN}✓ Toutes les variables sont à jour${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Vérification des variables ignorée${NC}"
fi

# Étape 6: Vérifier les changements dans docker-compose.yml
echo -e "${YELLOW}[7/9] Vérification de la configuration Docker...${NC}"
if git diff HEAD@{1} HEAD -- docker-compose.yml | grep -q "^+\|^-"; then
    echo -e "${YELLOW}⚠ docker-compose.yml a été modifié${NC}"
    COMPOSE_CHANGED=true
else
    COMPOSE_CHANGED=false
fi

# Étape 7: Build de la nouvelle image
echo -e "${YELLOW}[8/9] Construction de la nouvelle image Docker...${NC}"
docker compose build app
echo -e "${GREEN}✓ Image construite${NC}"

# Étape 8: Redémarrage des services
echo -e "${YELLOW}[9/9] Redémarrage des services...${NC}"

if [ "$COMPOSE_CHANGED" = true ]; then
    echo -e "${YELLOW}⚠ Redémarrage complet (docker-compose modifié)${NC}"
    docker compose up -d
else
    echo -e "${YELLOW}Redémarrage de l'application uniquement${NC}"
    docker compose up -d --no-deps app
fi

echo -e "${GREEN}✓ Services redémarrés${NC}"

# Étape 9: Vérification de l'état des services
echo -e "${YELLOW}Vérification de l'état des services...${NC}"
sleep 5

# Vérifier que tous les services sont up
SERVICES_DOWN=$(docker compose ps | grep -v "Up" | grep -v "Name" | grep -v "\-\-\-" | wc -l)

if [ "$SERVICES_DOWN" -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les services sont opérationnels${NC}"
else
    echo -e "${RED}✗ Certains services ne sont pas démarrés${NC}"
    docker compose ps
    echo -e "${YELLOW}Vérifiez les logs avec: docker compose logs -f${NC}"
fi

# Nettoyage des images Docker inutilisées
echo -e "${YELLOW}Nettoyage des anciennes images Docker...${NC}"
docker image prune -f
echo -e "${GREEN}✓ Images inutilisées supprimées${NC}"

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  Mise à jour terminée !${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "Informations:"
echo -e "  - Backup DB: ${BACKUP_FILE:-N/A}.gz"
echo -e "  - Backup Garage: ${GARAGE_BACKUP:-N/A}"
echo -e "  - Backup .env: ${ENV_BACKUP}"
echo -e "  - Commit actuel: $(git rev-parse --short HEAD)"
echo ""
echo -e "Commandes utiles:"
echo -e "  - Voir les logs: ${YELLOW}docker compose logs -f${NC}"
echo -e "  - Status: ${YELLOW}docker compose ps${NC}"
echo -e "  - Restaurer DB: ${YELLOW}zcat $BACKUP_DIR/postgres_backup_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T postgres psql -U feef_user feef_db${NC}"
echo -e "  - Restaurer .env: ${YELLOW}cp $ENV_BACKUP .env${NC}"
echo ""
