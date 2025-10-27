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
- `document_versions` - Version history for documents with MinIO file references
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
  - Requires `SEED_TOKEN` in header (`x-seed-token`) or query param (`token`)
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
2. **minio** - S3-compatible object storage (ports 9000, 9001)
3. **app** - Nuxt application (port 3000, not exposed)
4. **nginx** - Reverse proxy and SSL termination (ports 80, 443)
5. **certbot** - Automatic SSL certificate renewal

All services communicate on the `feef-network` bridge network. The app waits for postgres and minio health checks before starting.

**Automatic initialization on startup** (`docker-entrypoint.sh`):
1. Applies database migrations from `server/database/migrations/`
2. Initializes MinIO bucket if it doesn't exist
3. Starts the Nuxt application

This ensures that the database schema is always up-to-date with zero manual intervention.

### Document Storage (MinIO)

The application uses **MinIO** (S3-compatible object storage) for document file management:

- **Service**: `server/services/minio.ts` provides singleton client and storage operations
- **Bucket**: `feef-storage` (auto-created on initialization)
- **File organization**: `documents/{entityId}/{documentaryReviewId}/{versionId}-{filename}`
- **Operations**:
  - `uploadFile()` - Upload document with automatic key generation
  - `getSignedUrl()` - Generate presigned URL (1 hour expiry) for secure downloads
  - `deleteFile()` - Remove file from storage
  - `initializeBucket()` - Ensure bucket exists (called on app startup)
- **Integration**: Document versions store `minioKey` reference; downloads use signed URLs

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
- Secrets (`NUXT_SESSION_PASSWORD`, `JWT_SECRET`) are **auto-generated** by setup script
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
- **File uploads**: Use MinIO service for document storage with versioning support
- **Audit trail**: All tables track `createdBy`, `createdAt`, `updatedBy`, `updatedAt` for full audit history
- **Environment variables**: Multi-environment system with automated deployment and migration (see above)

## Important notes

- Application is in French
- Database integrated with Drizzle ORM; `app/utils/data.ts` contains legacy mock data structure for workflow states
- Authentication system implemented with password hashing (bcrypt) and email verification (Resend)
- Soft delete pattern used throughout (records marked with `deletedAt` instead of hard deletion)
- Environment variables are configured via `.env` file (see `.env.example`)
- Module versions: Nuxt 4.1.1, Nuxt UI v4 (alpha), nuxt-auth-utils, Drizzle ORM
