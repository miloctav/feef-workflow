# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FEEF Workflow Template is a Nuxt 4 application for managing the FEEF (Fédération des Entreprises et Entrepreneurs de France) labeling process. It enables three types of users to manage company labeling workflows: FEEF administrators, evaluation organizations (OE), and companies.

The application tracks companies through a labeling workflow with states: CANDIDATURE → ENGAGEMENT → AUDIT → DECISION → LABELISE.

## Tech Stack

- **Framework**: Nuxt 4.1.1
- **UI Library**: @nuxt/ui v4.0.0-alpha.1 (built on Nuxt UI components)
- **Hosting**: NuxtHub (@nuxthub/core)
- **Charts**: Chart.js with chartjs-plugin-datalabels
- **Styling**: Tailwind CSS (configured via tailwind.config.ts)
- **Icons**: Lucide icons (@iconify-json/lucide)

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Post-install (prepare Nuxt)
npm run postinstall
```

## Application Architecture

### User Roles & Routing

The application has three distinct user dashboards with separate layouts:

1. **FEEF Administrator** (`/feef/*`) - uses `dashboard-feef.vue` layout
   - Full system oversight
   - Manages companies, labeling cases, and evaluation organizations
   - Validates eligibility and final decisions

2. **Evaluation Organization** (`/oe/*`) - uses `dashboard-oe.vue` layout
   - Manages assigned labeling cases
   - Conducts audits and submits reports

3. **Company** (`/company/:id/*`) - uses `dashboard-company.vue` layout
   - Views their own labeling case progress
   - Uploads documents and responds to audit requests

### Data Model (app/utils/data.ts)

All application data is currently stored as in-memory TypeScript objects (no database yet). Key entities:

- **Company**: Comprehensive company information including contacts, activities, workflow state
- **OE (Organisme Evaluateur)**: Evaluation organizations with associated accounts
- **Documents**: Document metadata tied to labeling workflow states
- **Alert**: Contextual notifications for users

Workflow states are defined in `labelingCaseState` constant:
```typescript
candidacy → engagement → audit → decision → labeled
```

### Component Organization

- **`app/components/`**: Reusable components
  - `tabs/*`: Tab components for different workflow phases (CandidatureTab, EngagementTab, AuditTab, DecisionTab, DocumentsTab)
  - `dashboard/*`: Dashboard-specific components (DashboardCard, LineChartAudits, BarChartLabellises)
  - Tables: `CompaniesTable.vue`, `LabelingCasesTable.vue`, `OeAccountTable.vue`
  - Cards: Various card components for displaying specific workflow information

- **`app/pages/`**: File-based routing
  - Structure mirrors user roles (`feef/`, `oe/`, `company/`)
  - Dynamic routes use `[id].vue` convention (e.g., `/companies/[id].vue`)

- **`app/layouts/`**: Role-specific dashboard layouts
  - Each includes sidebar navigation, header, and notifications
  - Layouts use Nuxt UI `UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel` components

### Composables

- **`useDashboard.ts`**: Shared state for notification slideover
  - Manages `isNotificationsSlideoverOpen` state
  - Defines keyboard shortcut 'n' to toggle notifications
  - Uses `createSharedComposable` for cross-component state sharing

### Styling & Theming

- Primary color: blue
- Secondary color: zinc
- Custom Nuxt UI prose configuration in `app.config.ts` for typography
- Main CSS in `app/assets/css/main.css`

### Key Features

1. **Multi-phase workflow tracking**: Companies progress through distinct labeling phases
2. **Role-based views**: Each user type sees only relevant information
3. **Document management**: Track required documents by workflow phase
4. **Dashboard analytics**: Chart.js visualizations for labeling metrics
5. **Alert system**: Contextual notifications tied to workflow state
6. **Dynamic navigation**: Route-based sidebar highlighting per role

## Important Notes

- Components are auto-imported with `pathPrefix: false` (nuxt.config.ts)
- Data is currently mock/static - defined in `app/utils/data.ts`
- The application uses Nuxt UI v4 alpha - check Nuxt UI documentation for component APIs
- Three separate layout systems exist - ensure you're editing the correct role's layout
- Keyboard shortcut 'n' toggles notification slideover globally

## Data Access Patterns

Use helper functions from `data.ts`:
- `getCompanyById(id)`: Retrieve company by ID
- `getOEById(id)`: Retrieve evaluation organization by ID
- Direct access to arrays: `COMPANIES`, `DOCUMENTS`, `ORGANISMES_EVALUATEURS`
