# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FEEF Workflow is a Nuxt 4 application for managing the labeling certification workflow in the food industry. The application serves three main user roles:
- **FEEF** (Super Admin): Manages the entire labeling process, companies, evaluation organizations (OE)
- **OE** (Organisme Évaluateur): Evaluation organizations conducting audits and issuing opinions
- **Company** (Entreprise): Companies applying for FEEF label certification

## Development Commands

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
npx drizzle-kit generate     # Generate migrations from schema changes
npx drizzle-kit migrate      # Apply pending migrations
npx drizzle-kit studio       # Open Drizzle Studio (database GUI)
```

### Docker deployment
```bash
docker compose up -d                    # Start all services
docker compose down                     # Stop all services
docker compose logs -f app              # View application logs
docker compose restart app              # Restart application
docker compose up -d --build app        # Rebuild and restart application
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

## Key implementation patterns

- **Auto-imported components**: Components in `app/components/` are auto-imported by Nuxt (configured in `nuxt.config.ts` with `pathPrefix: false`)
- **Database persistence**: Using Drizzle ORM with PostgreSQL for all data storage
- **API integration**: Frontend consumes RESTful API endpoints in `server/api/`
- **Authentication**: Session-based auth via nuxt-auth-utils with role-based access control
- **Type-safe queries**: Drizzle provides full TypeScript type safety from database to API
- **Role-based access**: Each role sees only their authorized pages via layout-based routing
- **Document workflow**: Documents are associated with specific workflow states and shown/hidden accordingly
- **Alert system**: Alerts are contextual to company workflow state and provide actionable information
- **Pagination pattern**: All list endpoints use `server/utils/pagination.ts` for consistent behavior
- **File uploads**: Use MinIO service for document storage with versioning support
- **Audit trail**: All tables track `createdBy`, `createdAt`, `updatedBy`, `updatedAt` for full audit history

## Important notes

- Application is in French
- Database integrated with Drizzle ORM; `app/utils/data.ts` contains legacy mock data structure for workflow states
- Authentication system implemented with password hashing (bcrypt) and email verification (Resend)
- Soft delete pattern used throughout (records marked with `deletedAt` instead of hard deletion)
- Environment variables are configured via `.env` file (see `.env.example`)
- Module versions: Nuxt 4.1.1, Nuxt UI v4 (alpha), nuxt-auth-utils, Drizzle ORM
