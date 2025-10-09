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

### Docker deployment stack

The application deploys with 5 services defined in `docker-compose.yml`:
1. **postgres** - PostgreSQL 16 database (port 5432)
2. **minio** - S3-compatible object storage (ports 9000, 9001)
3. **app** - Nuxt application (port 3000, not exposed)
4. **nginx** - Reverse proxy and SSL termination (ports 80, 443)
5. **certbot** - Automatic SSL certificate renewal

All services communicate on the `feef-network` bridge network. The app waits for postgres and minio health checks before starting.

## Key implementation patterns

- **Auto-imported components**: Components in `app/components/` are auto-imported by Nuxt (configured in `nuxt.config.ts` with `pathPrefix: false`)
- **Static data**: Currently using mock data from `app/utils/data.ts` - no backend API yet
- **Role-based access**: Each role sees only their authorized pages via layout-based routing
- **Document workflow**: Documents are associated with specific workflow states and shown/hidden accordingly
- **Alert system**: Alerts are contextual to company workflow state and provide actionable information

## Important notes

- Application is in French
- Currently prototype with mock data (no database integration yet despite docker-compose postgres service)
- Environment variables are configured via `.env` file (see `.env.example`)
- Module versions: Nuxt 4.1.1, Nuxt UI v4 (alpha), NuxtHub core
