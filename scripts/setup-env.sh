#!/bin/bash

# Script d'initialisation de l'environnement FEEF Workflow
# Usage: ./scripts/setup-env.sh [development|production]

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
ENV_DEV_TEMPLATE="$PROJECT_DIR/.env.development"
ENV_PROD_TEMPLATE="$PROJECT_DIR/.env.production.example"

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  FEEF Workflow - Configuration Environnement${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

# Fonction pour générer un secret sécurisé
generate_secret() {
    # Utiliser openssl pour générer un secret de 32 caractères
    openssl rand -base64 32 | tr -d '\n'
}

# Fonction pour valider un email
validate_email() {
    local email=$1
    if [[ $email =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Fonction pour valider un domaine
validate_domain() {
    local domain=$1
    if [[ $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Détecter l'environnement
if [ -n "$1" ]; then
    ENVIRONMENT=$1
else
    echo -e "${BLUE}Sélectionnez l'environnement :${NC}"
    echo "  1) Development (dev local)"
    echo "  2) Production (serveur/VPS)"
    read -p "Choix [1-2]: " env_choice

    case $env_choice in
        1)
            ENVIRONMENT="development"
            ;;
        2)
            ENVIRONMENT="production"
            ;;
        *)
            echo -e "${RED}Choix invalide${NC}"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${GREEN}Environnement sélectionné: ${ENVIRONMENT}${NC}"
echo ""

# Vérifier si .env existe déjà
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠ Un fichier .env existe déjà${NC}"
    read -p "Voulez-vous le remplacer ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Configuration annulée${NC}"
        exit 0
    fi
    # Backup de l'ancien .env
    BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✓ Ancien .env sauvegardé dans: $BACKUP_FILE${NC}"
    echo ""
fi

# Sélectionner le template approprié
if [ "$ENVIRONMENT" = "development" ]; then
    TEMPLATE_FILE=$ENV_DEV_TEMPLATE
else
    TEMPLATE_FILE=$ENV_PROD_TEMPLATE
fi

# Vérifier que le template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Erreur: Template $TEMPLATE_FILE introuvable${NC}"
    exit 1
fi

# Copier le template
cp "$TEMPLATE_FILE" "$ENV_FILE"

echo -e "${BLUE}Configuration des variables d'environnement...${NC}"
echo ""

# === PostgreSQL Configuration ===
echo -e "${YELLOW}[1/8] PostgreSQL Configuration${NC}"

read -p "Nom de la base de données [feef_db]: " POSTGRES_DB
POSTGRES_DB=${POSTGRES_DB:-feef_db}

read -p "Utilisateur PostgreSQL [feef_user]: " POSTGRES_USER
POSTGRES_USER=${POSTGRES_USER:-feef_user}

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${RED}⚠ IMPORTANT: Utilisez un mot de passe fort en production${NC}"
    read -sp "Mot de passe PostgreSQL: " POSTGRES_PASSWORD
    echo
    if [ -z "$POSTGRES_PASSWORD" ]; then
        echo -e "${RED}Le mot de passe ne peut pas être vide${NC}"
        exit 1
    fi
else
    read -sp "Mot de passe PostgreSQL [dev_password_123]: " POSTGRES_PASSWORD
    echo
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dev_password_123}
fi

# Construire DATABASE_URL
if [ "$ENVIRONMENT" = "development" ]; then
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:54320/${POSTGRES_DB}"
else
    DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"
fi

echo ""

# === MinIO Configuration ===
echo -e "${YELLOW}[2/8] MinIO Configuration${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    read -p "Nom d'utilisateur MinIO: " MINIO_ROOT_USER
    if [ -z "$MINIO_ROOT_USER" ]; then
        echo -e "${RED}Le nom d'utilisateur ne peut pas être vide${NC}"
        exit 1
    fi

    echo -e "${RED}⚠ IMPORTANT: Utilisez un mot de passe fort${NC}"
    read -sp "Mot de passe MinIO: " MINIO_ROOT_PASSWORD
    echo
    if [ -z "$MINIO_ROOT_PASSWORD" ]; then
        echo -e "${RED}Le mot de passe ne peut pas être vide${NC}"
        exit 1
    fi

    MINIO_ENDPOINT="minio"
else
    read -p "Nom d'utilisateur MinIO [minioadmin]: " MINIO_ROOT_USER
    MINIO_ROOT_USER=${MINIO_ROOT_USER:-minioadmin}

    read -sp "Mot de passe MinIO [minioadmin123]: " MINIO_ROOT_PASSWORD
    echo
    MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-minioadmin123}

    MINIO_ENDPOINT="localhost"
fi

read -p "Nom du bucket MinIO [feef-storage]: " MINIO_BUCKET
MINIO_BUCKET=${MINIO_BUCKET:-feef-storage}

echo ""

# === Domain Configuration (Production only) ===
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}[3/8] Configuration du domaine${NC}"

    while true; do
        read -p "Nom de domaine (sans https://): " DOMAIN
        if validate_domain "$DOMAIN"; then
            break
        else
            echo -e "${RED}Format de domaine invalide. Exemple: feef-workflow.com${NC}"
        fi
    done

    while true; do
        read -p "Email pour les notifications SSL: " EMAIL
        if validate_email "$EMAIL"; then
            break
        else
            echo -e "${RED}Format d'email invalide${NC}"
        fi
    done

    echo ""
fi

# === Security & Authentication ===
echo -e "${YELLOW}[$([[ "$ENVIRONMENT" = "production" ]] && echo "4" || echo "3")/8] Génération des secrets de sécurité${NC}"

echo "Génération de NUXT_SESSION_PASSWORD..."
NUXT_SESSION_PASSWORD=$(generate_secret)
echo -e "${GREEN}✓ NUXT_SESSION_PASSWORD généré (32+ caractères)${NC}"

echo "Génération de JWT_SECRET..."
JWT_SECRET=$(generate_secret)
echo -e "${GREEN}✓ JWT_SECRET généré (32+ caractères)${NC}"

echo ""

# === Resend Configuration ===
echo -e "${YELLOW}[$([[ "$ENVIRONMENT" = "production" ]] && echo "5" || echo "4")/8] Configuration Email (Resend)${NC}"
echo "Cette étape est optionnelle. Appuyez sur Entrée pour ignorer."

read -p "Clé API Resend (optionnel): " RESEND_API_KEY

if [ -n "$RESEND_API_KEY" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        read -p "Email d'envoi (ex: FEEF Workflow <noreply@$DOMAIN>): " RESEND_FROM_EMAIL
        RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-"FEEF Workflow <noreply@$DOMAIN>"}
    else
        read -p "Email d'envoi [onboarding@resend.dev]: " RESEND_FROM_EMAIL
        RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-"onboarding@resend.dev"}
    fi
else
    RESEND_API_KEY=""
    RESEND_FROM_EMAIL=""
    echo -e "${YELLOW}⚠ Configuration email ignorée. Les fonctionnalités d'email ne seront pas disponibles.${NC}"
fi

echo ""

# === Development Mode ===
if [ "$ENVIRONMENT" = "development" ]; then
    echo -e "${YELLOW}[5/8] Mode développement${NC}"
    read -p "Activer le mode développement (pas d'emails, comptes auto-activés) ? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        DEV_MODE="false"
    else
        DEV_MODE="true"
    fi
else
    DEV_MODE="false"
fi

echo ""

# === Écriture du fichier .env ===
echo -e "${YELLOW}[$([[ "$ENVIRONMENT" = "production" ]] && echo "6" || echo "6")/8] Écriture du fichier .env...${NC}"

# Créer le fichier .env directement avec cat (évite les problèmes d'échappement sed)
if [ "$ENVIRONMENT" = "production" ]; then
    cat > "$ENV_FILE" <<EOF
# ============================================
# FEEF Workflow - Production Environment
# ============================================
# Generated by setup-env.sh on $(date)

# PostgreSQL Configuration
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Database URL for application
DATABASE_URL=$DATABASE_URL

# MinIO Configuration
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_ENDPOINT=$MINIO_ENDPOINT
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=$MINIO_BUCKET

# Domain Configuration
DOMAIN=$DOMAIN
EMAIL=$EMAIL

# Session Configuration (nuxt-auth-utils)
NUXT_SESSION_PASSWORD=$NUXT_SESSION_PASSWORD

# JWT Configuration (for password reset tokens)
JWT_SECRET=$JWT_SECRET

# Resend Configuration (Email service)
EOF

    if [ -n "$RESEND_API_KEY" ]; then
        cat >> "$ENV_FILE" <<EOF
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
EOF
    else
        cat >> "$ENV_FILE" <<EOF
# RESEND_API_KEY=
# RESEND_FROM_EMAIL=
EOF
    fi

    cat >> "$ENV_FILE" <<EOF

# Development Mode
# DEV_MODE=false
EOF

else
    # Development environment
    cat > "$ENV_FILE" <<EOF
# ============================================
# FEEF Workflow - Development Environment
# ============================================
# Generated by setup-env.sh on $(date)

# PostgreSQL Configuration
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# Database URL for application
DATABASE_URL=$DATABASE_URL

# MinIO Configuration
MINIO_ROOT_USER=$MINIO_ROOT_USER
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_ENDPOINT=$MINIO_ENDPOINT
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=$MINIO_BUCKET

# Session Configuration (nuxt-auth-utils)
NUXT_SESSION_PASSWORD=$NUXT_SESSION_PASSWORD

# JWT Configuration (for password reset tokens)
JWT_SECRET=$JWT_SECRET

# Resend Configuration (Email service)
EOF

    if [ -n "$RESEND_API_KEY" ]; then
        cat >> "$ENV_FILE" <<EOF
RESEND_API_KEY=$RESEND_API_KEY
RESEND_FROM_EMAIL=$RESEND_FROM_EMAIL
EOF
    else
        cat >> "$ENV_FILE" <<EOF
# RESEND_API_KEY=
# RESEND_FROM_EMAIL=
EOF
    fi

    cat >> "$ENV_FILE" <<EOF

# Development Mode
DEV_MODE=$DEV_MODE
EOF
fi

echo -e "${GREEN}✓ Fichier .env créé avec succès${NC}"
echo ""

# === Résumé ===
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Configuration terminée !${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "${BLUE}Résumé de la configuration :${NC}"
echo ""
echo "Environnement: $ENVIRONMENT"
echo "Base de données: $POSTGRES_DB"
echo "Utilisateur DB: $POSTGRES_USER"
echo "Bucket MinIO: $MINIO_BUCKET"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Domaine: $DOMAIN"
    echo "Email: $EMAIL"
fi
echo "Secrets générés: ✓"
if [ -n "$RESEND_API_KEY" ]; then
    echo "Email configuré: ✓"
else
    echo "Email configuré: ✗ (ignoré)"
fi
if [ "$ENVIRONMENT" = "development" ]; then
    echo "Mode dev: $DEV_MODE"
fi
echo ""
echo -e "${YELLOW}⚠ IMPORTANT :${NC}"
echo "- Ne commitez JAMAIS le fichier .env dans Git"
echo "- Conservez une copie sécurisée de vos secrets"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "- Configurez votre pare-feu et SSL avant de déployer"
fi
echo ""
echo -e "${BLUE}Prochaines étapes :${NC}"
if [ "$ENVIRONMENT" = "development" ]; then
    echo "  1. Vérifiez le fichier .env si nécessaire"
    echo "  2. Lancez l'application: ${GREEN}npm run dev${NC}"
else
    echo "  1. Vérifiez le fichier .env si nécessaire"
    echo "  2. Déployez avec: ${GREEN}docker compose up -d${NC}"
    echo "  3. Configurez SSL: voir DEPLOYMENT.md"
fi
echo ""
