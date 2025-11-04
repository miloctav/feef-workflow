# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FEEF Workflow is a Nuxt 4 application for managing the labeling certification workflow in the food industry. The application serves three main user roles:
- **FEEF** (Super Admin): Manages the entire labeling process, companies, evaluation organizations (OE)
- **OE** (Organisme Évaluateur): Evaluation organizations conducting audits and issuing opinions
- **Company** (Entreprise): Companies applying for FEEF label certification

## Development Commands

### Environment setup (first time)
```bash
# Copy development environment template
cp .env.development .env

# Or use the interactive setup script
./scripts/setup-env.sh development

# Install dependencies
npm install
```

### Basic commands
```bash
npm install              # Install dependencies
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run db:seed          # Seed database with initial data
```

### Database commands
```bash
# Development workflow (recommended)
npm run db:generate          # Generate migrations from schema changes
npm run db:migrate           # Apply pending migrations to database
npm run db:studio            # Open Drizzle Studio (database GUI)
npm run db:push              # Quick push schema directly (dev only, no migrations)

# Production workflow
# Migrations are automatically applied on Docker container startup
# via the docker-entrypoint.sh script
```

**Migration workflow:**
1. Modify the database schema in `server/database/schema.ts`
2. Run `npm run db:generate` to create migration SQL files
3. Review the generated migration in `server/database/migrations/`
4. Commit the migration files to git
5. Deploy: migrations will be applied automatically on startup

### Docker deployment
```bash
# Initial setup (production)
./scripts/setup-env.sh production      # Configure environment variables

# Deployment commands
docker compose up -d                    # Start all services
docker compose down                     # Stop all services
docker compose logs -f app              # View application logs
docker compose restart app              # Restart application
docker compose up -d --build app        # Rebuild and restart application

# Update script (production only)
./scripts/update.sh                     # Automated update with backups
```

See `DEPLOYMENT.md` for comprehensive deployment instructions including SSL configuration.

## Architecture

### Multi-role dashboard architecture

The application uses **role-specific layouts** and routing:

1. **Three distinct dashboard layouts** in `app/layouts/`:
   - `dashboard-feef.vue` - FEEF admin interface
   - `dashboard-oe.vue` - Evaluation organization interface
   - `dashboard-company.vue` - Company interface

2. **Route organization** in `app/pages/`:
   - `/feef/*` - FEEF admin routes (companies, OE, labeling cases, settings)
   - `/oe/*` - OE routes (assigned companies, labeling cases, accounts)
   - `/company/*` - Company routes (labeling case detail, notifications)
   - `/` - Login page with role selection

### Labeling workflow state machine

The labeling certification process follows a **strict workflow** defined in `app/utils/data.ts`:

```typescript
labelingCaseState = {
  candidacy: "CANDIDATURE",      // Initial application phase
  engagement: "ENGAGEMENT",       // Contract signing and OE assignment
  audit: "AUDIT",                // Audit execution and report
  decision: "DECISION",          // OE opinion and FEEF validation
  labeled: "LABELISE"            // Certificate issued (final state)
}
```

Each state has specific documents, actions, and cards displayed via **tab components** in `app/components/tabs/`:
- `CandidatureTab.vue` - Eligibility, contract signing
- `EngagementTab.vue` - OE contract, audit planning
- `AuditTab.vue` - Audit execution, documentary review
- `DecisionTab.vue` - OE opinion, FEEF decision, attestation

### Data model structure

`app/utils/data.ts` contains the complete data model with mock data:
- **Company interface**: All company information including contact details, activities, workflow state
- **workflow object**: Tracks current state, alerts, contracts, audit details, reports, opinions, attestation
- **Alert system**: Contextual alerts displayed per company/state
- **Documents tracking**: All documents with metadata (upload date, user, file info)

The data model is designed to track the entire lifecycle from application to certification.

### Component organization

Components follow a **domain-driven structure**:
- **Top-level components** (`app/components/*.vue`): Reusable cards for each workflow phase
  - `ActionPlanCard.vue`, `AuditReportsCard.vue`, `AttestationCard.vue`, etc.
  - Each card displays phase-specific information and actions
- **dashboard/** - Dashboard-specific components (charts, cards)
- **tabs/** - Tab components organizing cards by workflow phase
- No deep nesting - components are mostly flat for discoverability

### Composables

- `useDashboard.ts` - Shared state for notification slideover and keyboard shortcuts
  - Manages `isNotificationsSlideoverOpen` state
  - Defines 'n' shortcut to toggle notifications

### Styling

- Tailwind CSS configured in `tailwind.config.ts`
- Global styles in `app/assets/css/main.css`
- Nuxt UI v4 (alpha) for component library
- Custom color scheme configured in `app/app.config.ts` (primary: blue, secondary: zinc)

### Database & ORM

The application uses **Drizzle ORM** with PostgreSQL for data persistence:

- **Schema definition**: `server/database/schema.ts` defines all tables, enums, relations, and types
- **Database connection**: `server/database/index.ts` initializes Drizzle with pg Pool
- **Database config**: `drizzle.config.ts` configures Drizzle Kit for migrations

**Key tables**:
- `accounts` - User accounts with role-based access (FEEF, OE, AUDITOR, ENTITY)
- `oes` - Evaluation organizations (Organismes Évaluateurs)
- `entities` - Companies and groups applying for certification
- `audits` - Audit records linking entities, OEs, and auditors
- `documents_type` - Document type definitions with categories (LEGAL, FINANCIAL, TECHNICAL, OTHER)
- `documentary_reviews` - Document instances associated with entities
- `document_versions` - Version history for documents with Garage (S3) file references
- `accounts_to_entities` - Many-to-many junction table for account-entity relationships
- `auditors_to_oe` - Many-to-many junction table for auditor-OE relationships

**Type safety**: Schema exports inferred TypeScript types (`Account`, `Entity`, `OE`, `Audit`, `DocumentType`, `DocumentaryReview`, `DocumentVersion`) and enum constants (`Role`, `EntityType`, `AuditType`, `OERole`, `EntityRole`, `DocumentCategory`) for type-safe database operations.

### API Architecture

The application provides a **RESTful API** using Nuxt server routes in `server/api/`:

**Authentication endpoints** (`server/api/auth/`):
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset completion

**Database seeding** (`server/api/`):
- `POST /api/seed` - Secure endpoint to seed database with admin account
  - Requires `NUXT_SEED_TOKEN` in header (`x-seed-token`) or query param (`token`)
  - Creates admin FEEF account (email: maxime@miloctav.fr, password: admin)
  - Returns 409 Conflict if account already exists
  - Usage: `curl -X POST http://your-domain/api/seed -H "x-seed-token: your_token"`

**Account management** (`server/api/accounts/`):
- `GET /api/accounts` - List all accounts (FEEF role only)
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/[id]` - Update account
- `DELETE /api/accounts/[id]` - Soft delete account
- `POST /api/accounts/[id]/resend-email` - Resend activation email

**OE management** (`server/api/oes/`):
- `GET /api/oes` - List evaluation organizations
- `POST /api/oes` - Create new OE
- `GET /api/oes/[id]` - Get OE details
- `PUT /api/oes/[id]` - Update OE
- `DELETE /api/oes/[id]` - Soft delete OE

**Entity management** (`server/api/entities/`):
- `GET /api/entities` - List entities (companies/groups) with pagination
- `POST /api/entities` - Create new entity
- `GET /api/entities/[id]` - Get entity details with relations
- `PUT /api/entities/[id]` - Update entity
- `DELETE /api/entities/[id]` - Soft delete entity

**Audit management** (`server/api/audits/`):
- `GET /api/audits` - List audits with pagination and filters
- `POST /api/audits` - Create new audit
- `GET /api/audits/[id]` - Get audit details
- `PUT /api/audits/[id]` - Update audit
- `DELETE /api/audits/[id]` - Soft delete audit

**Document management** (`server/api/documents-type/`, `server/api/documentary-reviews/`, `server/api/documents-versions/`):
- `GET /api/documents-type` - List document types
- `POST /api/documents-type` - Create document type
- `GET /api/documentary-reviews` - List documentary reviews with pagination
- `POST /api/documentary-reviews` - Create documentary review
- `POST /api/documents-versions` - Upload new document version (multipart/form-data)
- `GET /api/documents-versions/[id]/download` - Download document with signed URL

**API patterns**:
- Uses `requireUserSession()` from nuxt-auth-utils for authentication
- Role-based authorization (e.g., FEEF role required for account management)
- **Always use Drizzle query API** (`db.query.*`) for data fetching - maximize use of relational queries
- **Always wrap responses** in a `{ data: ... }` object, never return data directly
- **Pagination utility** (`server/utils/pagination.ts`) provides consistent pagination across all list endpoints:
  - Supports `page`, `limit`, `search`, `sort`, and custom filters via query params
  - Use `parsePaginationParams()`, `buildWhereConditions()`, `buildOrderBy()`, and `formatPaginatedResponse()`
  - Returns `{ data: [...], meta: { page, limit, total, totalPages } }`
- Excludes sensitive fields (passwords) from API responses
- Soft deletes using `deletedAt` timestamp

### Docker deployment stack

The application deploys with 5 services defined in `docker-compose.yml`:
1. **postgres** - PostgreSQL 16 database (port 5432)
2. **garage** - Garage S3-compatible object storage (ports 3900, 3901, 3903)
3. **app** - Nuxt application (port 3000, not exposed)
4. **nginx** - Reverse proxy and SSL termination (ports 80, 443)
5. **certbot** - Automatic SSL certificate renewal

All services communicate on the `feef-network` bridge network. The app waits for postgres and garage health checks before starting.

**Important**: Garage must be initialized manually before first use (see Manual Garage Initialization section below).

**Startup sequence**:
1. **postgres** and **garage** services start and become healthy
2. **app container**: Applies database migrations from `server/database/migrations/` then starts the Nuxt application
3. **app plugin**: Checks bucket exists (creates if missing, fallback for dev)

### Document Storage (Garage)

The application uses **Garage** (S3-compatible distributed object storage) for document file management:

- **Service**: `server/services/garage.ts` provides S3 client and storage operations using AWS SDK
- **Bucket**: `feef-storage` (must be created manually via Garage CLI)
- **File organization**: 
  - Documentary Reviews: `documents/{entityId}/documentary-reviews/{documentaryReviewId}/{versionId}-{filename}`
  - Contracts: `documents/{entityId}/contracts/{contractId}/{versionId}-{filename}`
- **Operations**:
  - `uploadFile()` - Upload document with automatic key generation (uses S3 PutObjectCommand)
  - `getSignedUrl()` - Generate presigned URL (1 hour expiry) for secure downloads (uses @aws-sdk/s3-request-presigner)
  - `deleteFile()` - Remove file from storage (uses S3 DeleteObjectCommand)
  - `initializeBucket()` - Ensure bucket exists (fallback for local dev if bucket not created manually)
- **Integration**: Document versions store `minioKey` reference (field name preserved for DB compatibility); downloads use signed URLs
- **Configuration**: Single-node mode (replication_factor=1), SQLite backend, exposes S3 API on port 3900

### Manual Garage Initialization

Garage must be initialized manually before the application can store documents. This is a one-time setup process.

**Prerequisites**: Garage container must be running (`docker compose up -d garage`)

#### 1. Access Garage CLI

Create an alias/function for easier command execution:

**Linux/macOS (Bash/Zsh):**
```bash
alias garage="docker exec -ti feef-garage /garage"
```

**Windows PowerShell:**
```powershell
function garage { docker exec -ti feef-garage /garage $args }
```

**Windows CMD:**
```cmd
doskey garage=docker exec -ti feef-garage /garage $*
```

**Alternative (all platforms):** You can also prefix all commands with `docker exec -ti feef-garage /garage` without creating an alias/function.

#### 2. Get Node ID

Check the Garage container logs to find the Node ID:

**Linux/macOS:**
```bash
docker compose logs garage | grep "Node ID"
# Output: Node ID of this node: 7638d95cb5b27467 (example)
```

**Windows PowerShell:**
```powershell
docker compose logs garage | Select-String "Node ID"
# Output: Node ID of this node: 7638d95cb5b27467 (example)
```

Or check the cluster status:

```bash
garage status
```

The Node ID is displayed in the first column (16-character hexadecimal string).

#### 3. Create Cluster Layout

Assign storage capacity and zone to your node:

```bash
# Replace <node-id> with your actual Node ID
garage layout assign -z dc1 -c 100G <node-id>

# For example:
# garage layout assign -z dc1 -c 100G 7638d95cb5b27467
```

**Parameters**:
- `-z dc1`: Zone name (datacenter identifier)
- `-c 100G`: Capacity allocated to this node (adjust based on your disk space)
- `<node-id>`: Your 16-character Node ID (you can use just a prefix like `7638`)

#### 4. Apply Layout

Apply the layout configuration to the cluster:

```bash
garage layout show    # Preview changes
garage layout apply --version 1
```

Wait a few seconds for the layout to be fully applied.

#### 5. Create API Key

Create an API key for the application:

```bash
garage key create feef-app-key
```

This will output credentials like:

```
Key name: feef-app-key
Key ID: GK3515373e4c851ebaad366558
Secret key: 7d37d093435a41f2aab8f13c19ba067d9776c90215f56614adad6ece597dbb34
```

**Important**: Save these credentials - you'll need them in the next step.

#### 6. Create Bucket

Create the storage bucket:

```bash
garage bucket create feef-storage
```

Verify the bucket was created:

```bash
garage bucket list
garage bucket info feef-storage
```

#### 7. Grant Permissions

Give the API key full permissions on the bucket:

```bash
garage bucket allow \
  --read \
  --write \
  --owner \
  feef-storage \
  --key feef-app-key
```

Verify permissions:

```bash
garage bucket info feef-storage
```

#### 8. Update Environment Variables

Add the generated credentials to your `.env` file:

```bash
# Update these values with your actual credentials from step 5
NUXT_GARAGE_ACCESS_KEY=GK3515373e4c851ebaad366558
NUXT_GARAGE_SECRET_KEY=7d37d093435a41f2aab8f13c19ba067d9776c90215f56614adad6ece597dbb34
```

**For development** (`.env` file):
- Copy the credentials directly to your local `.env`

**For production** (Docker deployment):
- Update the `.env` file on the server
- Restart the app container: `docker compose restart app`

#### 9. Verify Setup

Test that the application can access Garage:

```bash
# Restart the app to load new credentials
docker compose restart app

# Check app logs for successful Garage connection
docker compose logs -f app
# Look for: "✅ Bucket Garage existe déjà: feef-storage"
```

#### Troubleshooting

**"Node not found" or RPC errors:**
- Ensure the Node ID is correct (check `garage status`)
- Verify `garage.toml` has matching `rpc_secret` across all services

**"Bucket not found" errors in app:**
- Check bucket was created: `garage bucket list`
- Verify credentials in `.env` match the key info: `garage key info feef-app-key`
- Ensure app was restarted after updating `.env`

**Permission denied errors:**
- Verify permissions: `garage bucket info feef-storage`
- Re-apply permissions with the `garage bucket allow` command

**"Connection refused" to Garage:**
- Ensure Garage container is running: `docker compose ps garage`
- Check Garage logs: `docker compose logs garage`
- Verify port 3900 is accessible from the app container

### Authentication & Session Cookies (HTTP vs HTTPS)

The application uses **nuxt-auth-utils** for session management with secure encrypted cookies:

**Cookie Security Behavior:**
- By default, `nuxt-auth-utils` sets the `Secure` flag on session cookies in production
- Cookies with `Secure` flag are **only sent over HTTPS**, never over HTTP
- This causes authentication to fail on HTTP-only deployments (users get redirected to login after successful login)

**Solution for HTTP deployments:**

The application includes `server/plugins/session-cookie.ts` which removes the `Secure` flag from session cookies, allowing authentication to work on HTTP.

**IMPORTANT - HTTPS Migration:**
When migrating to HTTPS (recommended for production):
1. Configure SSL certificates (see `DEPLOYMENT.md`)
2. **Delete** or disable `server/plugins/session-cookie.ts` to restore the `Secure` flag
3. Restart the application

**Why this matters:**
- **HTTP**: Session cookies without `Secure` flag = works, but less secure (traffic not encrypted)
- **HTTPS**: Session cookies with `Secure` flag = works, fully secure (traffic encrypted)
- **Mixed**: Trying to use `Secure` cookies on HTTP = authentication broken (cookies never sent)

**Production recommendation:** Use HTTPS with Let's Encrypt (free SSL certificates). See `DEPLOYMENT.md` for setup instructions.

### Environment Variables Management

The application uses a **multi-environment variable system** with automated deployment support:

**File structure**:
- `.env.development` - Development defaults (versioned) with safe values for local dev
- `.env.production.example` - Production template (versioned) with placeholders
- `.env.example` - Complete documentation of all variables
- `.env` - Active environment file (NOT versioned, created from templates)

**Scripts**:
- `scripts/setup-env.sh` - Interactive environment setup with auto-generated secrets
- `scripts/update.sh` - Production update with automatic detection of new variables

**Adding a new environment variable - Complete workflow**:

1. **Development**: Add to `.env.development` with dev-friendly value
   ```bash
   # In .env.development
   NEW_API_KEY=dev_test_key_12345
   ```

2. **Production template**: Add to `.env.production.example` with placeholder
   ```bash
   # In .env.production.example
   NEW_API_KEY=CHANGE_ME_YOUR_API_KEY_HERE
   ```

3. **Documentation**: Add to `.env.example` with full description
   ```bash
   # In .env.example
   # [REQUIRED] API key for XYZ service
   # Get your key from https://xyz.com/api-keys
   NEW_API_KEY=re_your_api_key_here
   ```

4. **Docker Compose** (if needed): Variables are auto-loaded via `env_file: .env`
   - Only add to `environment:` section if value needs to be overridden for Docker context

5. **Production deployment**: When `./scripts/update.sh` runs:
   - Automatically detects the new variable
   - Prompts for the value interactively
   - Adds to production `.env` with backup

**Key patterns**:
- Secrets (`NUXT_SESSION_PASSWORD`, `NUXT_JWT_SECRET`) are **auto-generated** by setup script
- Development uses simple/safe values, production uses strong secrets
- Template files are versioned for documentation, actual `.env` is gitignored
- Update script ensures zero-downtime deployment with automatic variable migration

## Key implementation patterns

- **Auto-imported components**: Components in `app/components/` are auto-imported by Nuxt (configured in `nuxt.config.ts` with `pathPrefix: false`)
- **Database persistence**: Using Drizzle ORM with PostgreSQL for all data storage
- **Database migrations**: Production uses versioned migrations (generated with `npm run db:generate`) applied automatically on startup; development can use `npm run db:push` for rapid prototyping
- **API integration**: Frontend consumes RESTful API endpoints in `server/api/`
- **Authentication**: Session-based auth via nuxt-auth-utils with role-based access control
- **Type-safe queries**: Drizzle provides full TypeScript type safety from database to API
- **Role-based access**: Each role sees only their authorized pages via layout-based routing
- **Document workflow**: Documents are associated with specific workflow states and shown/hidden accordingly
- **Alert system**: Alerts are contextual to company workflow state and provide actionable information
- **Pagination pattern**: All list endpoints use `server/utils/pagination.ts` for consistent behavior
- **File uploads**: Use Garage service for S3-compatible document storage with versioning support
- **Audit trail**: All tables track `createdBy`, `createdAt`, `updatedBy`, `updatedAt` for full audit history
- **Environment variables**: Multi-environment system with automated deployment and migration (see above)

## Important notes

- Application is in French
- Database integrated with Drizzle ORM; `app/utils/data.ts` contains legacy mock data structure for workflow states
- Authentication system implemented with password hashing (bcrypt) and email verification (Resend)
- Soft delete pattern used throughout (records marked with `deletedAt` instead of hard deletion)
- Environment variables are configured via `.env` file (see `.env.example`)
- Module versions: Nuxt 4.1.1, Nuxt UI v4 (alpha), nuxt-auth-utils, Drizzle ORM
