# Guide de Déploiement - FEEF Workflow

Ce guide explique comment déployer l'application FEEF Workflow sur un VPS OVH avec Docker.

## Architecture

L'application utilise Docker Compose avec les services suivants :
- **app** : Application Nuxt 4
- **postgres** : Base de données PostgreSQL 16
- **minio** : Stockage d'objets S3-compatible
- **nginx** : Reverse proxy et serveur web
- **certbot** : Gestion automatique des certificats SSL Let's Encrypt

## Prérequis

- VPS OVH avec Docker et Docker Compose installés
- Nom de domaine pointant vers l'IP du VPS (enregistrements DNS A et/ou AAAA configurés)
- Ports 80 et 443 ouverts sur le pare-feu

## Étape 1 : Préparation du serveur

### 1.1 Accéder au projet sur le VPS

```bash
cd /apps/feef-workflow
```

### 1.2 Configurer les variables d'environnement

```bash
cp .env.example .env
nano .env
```

Modifier les valeurs suivantes :
```env
# PostgreSQL - IMPORTANT : Changez ces valeurs !
POSTGRES_DB=feef_db
POSTGRES_USER=feef_user
POSTGRES_PASSWORD=VotreMotDePasseSécurisé123!

# MinIO - IMPORTANT : Changez ces valeurs !
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=VotreMotDePasseMinio456!
MINIO_BUCKET=feef-storage

# Configuration domaine
DOMAIN=votre-domaine.com
EMAIL=votre-email@example.com
```

## Étape 2 : Premier déploiement (sans SSL)

### 2.1 Démarrer les services

```bash
docker compose up -d
```

### 2.2 Vérifier que tous les services sont actifs

```bash
docker compose ps
```

Tous les services doivent avoir le status "Up".

### 2.3 Tester l'application

Ouvrez votre navigateur et accédez à `http://votre-domaine.com` ou `http://IP-du-VPS`.

L'application devrait être accessible en HTTP.

## Étape 3 : Configuration du certificat SSL

### 3.1 Obtenir le certificat SSL initial

Exécutez la commande suivante en remplaçant par votre domaine et email :

```bash
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d votre-domaine.com \
  -d www.votre-domaine.com \
  --email votre-email@example.com \
  --agree-tos \
  --no-eff-email
```

**Note** : Retirez `-d www.votre-domaine.com` si vous n'avez pas configuré le sous-domaine www.

Si la commande réussit, vous verrez un message de confirmation avec l'emplacement des certificats.

### 3.2 Configurer Nginx pour HTTPS

Éditez le fichier de configuration Nginx :

```bash
nano nginx/conf.d/default.conf
```

**Étapes à suivre :**

1. **Remplacer** `your-domain.com` par votre véritable nom de domaine dans tous les blocs commentés
2. **Décommenter** le bloc server HTTPS (lignes commençant par `# server {` jusqu'à `# }`)
3. **Décommenter** le bloc server HTTP avec redirection HTTPS en haut du fichier
4. **Commenter ou supprimer** le bloc "Initial HTTP server" (celui avec `server_name _;`)

Exemple de configuration finale :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name votre-domaine.com www.votre-domaine.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Serveur HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.3 Recharger Nginx

```bash
docker-compose restart nginx
```

### 3.4 Vérifier HTTPS

Accédez à `https://votre-domaine.com` - vous devriez voir le cadenas vert indiquant une connexion sécurisée.

## Étape 4 : Renouvellement automatique SSL

Le service Certbot est configuré pour renouveler automatiquement les certificats tous les 12 heures. Nginx recharge sa configuration toutes les 6 heures pour prendre en compte les nouveaux certificats.

### Tester le renouvellement manuellement

```bash
docker-compose run --rm certbot renew --dry-run
```

## Gestion de l'application

### Voir les logs

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f postgres
```

### Redémarrer l'application

```bash
# Tous les services
docker-compose restart

# Service spécifique
docker-compose restart app
```

### Mettre à jour l'application

```bash
# Récupérer les dernières modifications
git pull

# Reconstruire et redémarrer l'application
docker-compose up -d --build app
```

### Arrêter les services

```bash
docker-compose down
```

### Arrêter et supprimer les volumes (ATTENTION : supprime les données)

```bash
docker-compose down -v
```

## Accès aux services

- **Application** : https://votre-domaine.com
- **MinIO Console** : http://IP-du-VPS:9001 (accessible uniquement en local ou via tunnel SSH pour sécurité)

### Connexion MinIO

Pour accéder à l'interface MinIO pour gérer les fichiers :

```bash
# Créer un tunnel SSH depuis votre machine locale
ssh -L 9001:localhost:9001 user@IP-du-VPS
```

Puis accédez à `http://localhost:9001` avec les identifiants configurés dans `.env`.

## Sauvegardes

### Sauvegarder PostgreSQL

```bash
docker-compose exec postgres pg_dump -U feef_user feef_db > backup-$(date +%Y%m%d).sql
```

### Restaurer PostgreSQL

```bash
cat backup-YYYYMMDD.sql | docker-compose exec -T postgres psql -U feef_user feef_db
```

### Sauvegarder MinIO

Les fichiers MinIO sont stockés dans le volume Docker `minio_data`. Pour sauvegarder :

```bash
docker run --rm -v feef-workflow_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

## Sécurité

### Recommandations importantes

1. **Changez tous les mots de passe** dans le fichier `.env`
2. **Limitez l'accès SSH** : utilisez des clés SSH au lieu de mots de passe
3. **Configurez un pare-feu** : n'ouvrez que les ports 22, 80 et 443
4. **Mettez à jour régulièrement** le système et les images Docker
5. **Surveillez les logs** pour détecter toute activité suspecte

### Configurer le pare-feu (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier que PostgreSQL est prêt
docker-compose logs postgres
```

### Problème de certificat SSL

```bash
# Vérifier les logs Certbot
docker-compose logs certbot

# Vérifier la configuration Nginx
docker-compose exec nginx nginx -t

# Régénérer le certificat
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d votre-domaine.com \
  --email votre-email@example.com \
  --agree-tos \
  --force-renewal
```

### MinIO ne démarre pas

```bash
# Vérifier les logs
docker-compose logs minio

# Vérifier les permissions du volume
docker-compose exec minio ls -la /data
```

### Erreur de connexion à la base de données

Vérifiez que :
1. Le service PostgreSQL est démarré : `docker-compose ps postgres`
2. Les variables d'environnement dans `.env` sont correctes
3. L'application attend que PostgreSQL soit prêt (healthcheck configuré)

## Support

Pour toute question ou problème, consultez les logs avec `docker-compose logs -f` et vérifiez que :
- Le DNS pointe correctement vers votre VPS
- Les ports 80 et 443 sont ouverts
- Les services Docker sont tous en état "Up"
