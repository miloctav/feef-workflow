# Document de sécurité — MonPMEPlus

**Version :** 1.1
**Date :** Février 2026
**Destinataires :** Direction, équipes métier

---

## Introduction

Ce document décrit les mesures de sécurité mises en place sur la plateforme MonPMEPlus. Son objectif est de donner une vision claire et honnête de la manière dont les données et les accès sont protégés, sans entrer dans des détails techniques inutiles.

Il couvre les principaux aspects : hébergement, gestion des connexions, protection contre les attaques, contrôle des accès, sécurité des données et des documents.

---

## 1. Hébergement et infrastructure

### Serveur dédié et conteneurisation

L'application est hébergée sur un **serveur dédié** (infrastructure physique réservée exclusivement à MonPMEPlus, non partagée avec d'autres clients). Elle fonctionne à l'aide de **Docker**, une technologie qui isole chaque composant de l'application dans son propre environnement cloisonné :

- La base de données, le stockage de fichiers, le serveur web et l'application ne communiquent entre eux que via un **réseau interne privé** — aucun de ces composants n'est directement accessible depuis internet (à l'exception du serveur web Nginx, qui fait office de filtre).
- L'application elle-même n'est **jamais exposée directement** sur internet : toutes les requêtes passent d'abord par un **proxy inverse Nginx**, qui filtre et achemine le trafic.

### Chiffrement des communications (HTTPS)

Toutes les communications entre les navigateurs des utilisateurs et le serveur sont **chiffrées via HTTPS** :

- Le certificat SSL est fourni par **Let's Encrypt**, une autorité de certification reconnue mondialement, et se **renouvelle automatiquement** toutes les 90 jours.
- Seules les versions modernes et sécurisées du protocole de chiffrement sont acceptées : **TLS 1.2 et TLS 1.3** (les anciennes versions vulnérables sont bloquées).
- Toute tentative d'accès en HTTP non chiffré est **automatiquement redirigée** vers HTTPS.

---

## 2. Authentification et gestion des sessions

### Connexion en deux étapes (2FA obligatoire)

La connexion à la plateforme se fait en **deux étapes** :

1. **Identifiant et mot de passe** : l'utilisateur saisit son email et son mot de passe.
2. **Code de vérification par email** : un code à 6 chiffres est envoyé par email et doit être saisi dans les **5 minutes**. Ce code ne peut être utilisé qu'**une seule fois** et est **invalidé après 3 tentatives échouées**. Si l'utilisateur n'a pas reçu le code, il peut en demander un nouveau, mais avec un délai de 60 secondes entre chaque demande.

Cette double vérification garantit que même si un mot de passe est compromis, un attaquant ne peut pas se connecter sans avoir accès à la boîte email de l'utilisateur.

### Appareils de confiance

Après une connexion réussie, l'utilisateur peut **marquer son appareil comme "de confiance"** pour éviter de resaisir le code 2FA à chaque connexion depuis cet appareil. Ce statut de confiance :

- Dure **30 jours** puis expire automatiquement.
- Est stocké sous forme d'un **jeton cryptographique** (une clé aléatoire unique par appareil).
- Est **révoqué automatiquement** en cas de changement de mot de passe.

### Mots de passe

Les mots de passe ne sont **jamais stockés en clair** dans la base de données. Ils sont transformés via un algorithme de hachage sécurisé (**bcrypt**) : même en cas d'accès non autorisé à la base de données, les mots de passe restent illisibles.

Les mots de passe doivent respecter les critères de complexité suivants, vérifiés à la fois dans l'interface et côté serveur :

- **12 caractères minimum**
- **Au moins 1 lettre majuscule**
- **Au moins 1 lettre minuscule**
- **Au moins 1 chiffre**
- **Au moins 1 caractère spécial** (ex. : `!`, `@`, `#`, `$`, `%`...)

L'interface guide l'utilisateur en temps réel avec un indicateur visuel pour chaque critère.

### Sessions utilisateur

Une fois connecté, la session de l'utilisateur est :

- **Chiffrée** : le contenu de la session est crypté et ne peut pas être lu ou falsifié.
- À **durée glissante de 30 minutes** : si l'utilisateur est inactif pendant 30 minutes, il est automatiquement déconnecté.
- Limitée à **8 heures maximum** : même si l'utilisateur est actif en continu, sa session expire après 8 heures et une nouvelle connexion est requise.

---

## 3. Protection contre les attaques

### Limitation des tentatives de connexion (Rate Limiting)

Le serveur Nginx impose des **limites strictes sur le nombre de tentatives** pour toutes les actions sensibles :

| Action | Limite |
|--------|--------|
| Connexion (identifiant/mot de passe) | 5 tentatives par minute par adresse IP |
| Vérification du code 2FA | 5 tentatives par minute par adresse IP |
| Renvoi du code 2FA | 2 demandes par minute par adresse IP |
| Réinitialisation de mot de passe | 3 demandes par minute par adresse IP |

Au-delà de ces limites, le serveur renvoie une erreur **HTTP 429 (Trop de requêtes)** et bloque temporairement l'adresse IP concernée.

### Protection contre le brute-force sur les codes 2FA

Au-delà du rate limiting réseau, chaque code 2FA est verrouillé après **3 tentatives incorrectes** au niveau applicatif, obligeant l'utilisateur à recommencer le processus de connexion.

### Protection contre l'énumération des comptes

Lorsqu'un utilisateur demande une réinitialisation de mot de passe, le serveur répond toujours par le **même message de confirmation**, que l'adresse email existe dans le système ou non. Cela empêche un attaquant de déterminer si un email est enregistré sur la plateforme.

---

## 4. Contrôle d'accès et autorisations

### Système de rôles

La plateforme distingue **4 rôles d'utilisateur**, chacun avec des droits strictement limités à son périmètre :

| Rôle | Description |
|------|-------------|
| **FEEF** | Administrateur général, accès complet |
| **OE** | Organisme évaluateur, accès à ses dossiers et audits |
| **Auditeur** | Accès uniquement aux audits qui lui sont assignés |
| **Entreprise** | Accès uniquement à ses propres données |

### Double vérification des droits

Les droits d'accès sont vérifiés **à deux niveaux** :

1. **Côté navigateur** : les menus et pages non autorisés ne sont simplement pas affichés.
2. **Côté serveur** : chaque requête API vérifie indépendamment les droits de l'utilisateur avant de retourner des données. Même si quelqu'un contournait l'interface, il ne pourrait pas accéder aux données d'un autre utilisateur.

Un utilisateur de type "Entreprise" ne peut, par exemple, jamais accéder aux données d'une autre entreprise, même en manipulant manuellement l'URL.

### Traçabilité des accès

Chaque action effectuée sur la plateforme est enregistrée : on sait **qui a fait quoi et quand**, aussi bien pour les modifications de données que pour les actions métier (validation de documents, changement de statut, etc.).

---

## 5. Sécurité des données

### Protection contre les injections SQL

L'application utilise **Drizzle ORM**, une couche d'abstraction entre l'application et la base de données. Toutes les requêtes sont générées de façon sécurisée avec des **paramètres typés** : il est impossible d'injecter du code SQL malveillant via les formulaires ou les URLs.

### Suppression logique des données

Les données ne sont **jamais effacées définitivement** de la base. Lorsqu'une suppression est demandée, un marqueur "supprimé le..." est simplement ajouté à l'enregistrement. Cela permet de :

- Éviter toute perte accidentelle de données.
- Conserver un historique complet pour audit.

### Journalisation des modifications

Chaque enregistrement en base de données conserve :

- La date et l'auteur de sa **création**.
- La date et l'auteur de sa **dernière modification**.

Un journal d'événements dédié (`events`) enregistre en plus les actions métier importantes (changements de statut, validations, etc.) avec l'identifiant de l'utilisateur responsable et la date exacte.

---

## 6. Stockage et accès aux documents

### Stockage séparé de l'application

Les documents déposés sur la plateforme (rapports, contrats, attestations...) sont stockés sur un **serveur de fichiers dédié** (Garage, compatible S3), physiquement et logiquement séparé de l'application.

### Accès sécurisé par URLs temporaires

Pour télécharger un document, le serveur génère une **URL signée temporaire**, valable **1 heure seulement**. Ce lien est unique, non devinable, et expire automatiquement. Un utilisateur ne peut pas partager un lien de téléchargement valide indéfiniment.

### Contrôle d'accès aux documents

Avant de générer un lien de téléchargement, le serveur vérifie que **l'utilisateur a bien le droit d'accéder à ce document** selon son rôle et les entités qui lui sont assignées. Il n'est pas possible d'accéder au document d'une autre entreprise en devinant son identifiant.

---

## 7. Gestion des mots de passe et des comptes

### Création de compte

Les nouveaux comptes sont créés en état **inactif** (sans mot de passe). Un email d'invitation est envoyé à l'utilisateur, qui doit cliquer sur un lien sécurisé pour définir son propre mot de passe et activer son compte.

### Réinitialisation de mot de passe

La réinitialisation se fait via un **lien sécurisé envoyé par email**, avec les garanties suivantes :

- Le lien expire automatiquement après **48 heures**.
- Il ne peut être utilisé **qu'une seule fois**.
- Après un changement de mot de passe, **tous les anciens liens de réinitialisation sont invalidés**.
- Tous les appareils de confiance sont **révoqués**, forçant une nouvelle vérification 2FA.

### Changement d'adresse email

Le changement d'adresse email nécessite une **confirmation par email** envoyée à la nouvelle adresse. Sans cette confirmation, l'adresse n'est pas modifiée.

---

## 8. Sauvegardes

À chaque mise à jour de la plateforme, des sauvegardes automatiques sont réalisées :

- **Base de données** : export complet (dump SQL compressé), avec conservation des **10 dernières sauvegardes**.
- **Stockage de fichiers** : archivage complet des volumes de données.
- **Configuration** : sauvegarde du fichier d'environnement.

Ces sauvegardes permettent de restaurer la plateforme dans un état antérieur en cas d'incident.

---

---

## Annexe : Axes d'amélioration envisagés

> **Note :** Cette section liste des pistes d'amélioration techniques identifiées. Elle est destinée à un usage interne et peut être retirée du document client.

### Sécurité HTTP renforcée

- **HSTS (HTTP Strict Transport Security)** : la directive est présente dans la configuration Nginx mais commentée. Son activation forcerait les navigateurs à toujours utiliser HTTPS, même en cas de tentative de connexion HTTP directe. Recommandé pour une mise en production complète.
- **Headers de sécurité manquants** : les headers `Content-Security-Policy`, `X-Content-Type-Options` et `Referrer-Policy` ne sont pas encore configurés. Leur ajout renforcerait la protection contre certaines attaques côté navigateur (XSS, MIME sniffing).

### Sauvegardes automatisées

Les sauvegardes actuelles sont déclenchées lors des mises à jour. La mise en place d'une **tâche planifiée quotidienne** (cron) garantirait des sauvegardes régulières indépendamment du rythme de déploiement.

### Accès réseau en production

Certains ports internes (base de données, API d'administration du stockage) sont accessibles depuis l'hôte dans la configuration actuelle. En production, ces ports devraient être restreints au réseau interne uniquement.
