# Phase 1: Foundation

Scaffold the app. After this phase: the app runs, has a sidebar with nav, all routes exist as placeholders, and the full Convex schema is deployed.

> **Prerequisites:** Complete "Before Phase 1" in [MANUAL-SETUP.md](../MANUAL-SETUP.md)

## Boundaries

- DO NOT modify `data/`, `docs/`, or `mockup/` directories
- DO NOT add authentication — this is a solo-operator app
- DO NOT install dependencies beyond what shadcn/ui and the manual setup already added

## Tasks

- [x] Define Convex schema in `convex/schema.ts` — all 6 tables (`leads`, `clusters`, `emails`, `activities`, `emailTemplates`, `campaigns`) with all fields from SPEC.md data model. Use Convex `v` validators. Add indexes: `leads` by status, by clusterId, by city, by name; `activities` by leadId; `emails` by leadId, by smartleadCampaignId; `campaigns` by status.
- [x] Create the app layout component at `src/components/layout/app-layout.tsx` — sidebar with nav links (Dashboard `/`, Leads `/leads`, Map `/map`, Clusters `/clusters`, Campaigns `/campaigns`, Settings `/settings`), top bar with page title, and main content area. Match the mockup sidebar structure (FM logo, brand title "FM Outreach", subtitle "Seller CRM", footer with "Internal tool" pill). Use shadcn Button for nav items. Sidebar should highlight the active route.
- [x] Create the root layout at `src/app/layout.tsx` — wrap with ConvexProvider, import globals.css, set metadata title "FM Outreach". Create `src/app/providers.tsx` with ConvexClientProvider.
- [x] Create placeholder page at `src/app/page.tsx` (Dashboard) — render AppLayout with a heading "Dashboard" and a paragraph "Coming in Phase 10"
- [x] Create placeholder page at `src/app/leads/page.tsx` — render AppLayout with heading "Leads" and paragraph "Coming in Phase 3"
- [x] Create placeholder page at `src/app/leads/[id]/page.tsx` — render AppLayout with heading "Lead Detail" and paragraph "Coming in Phase 3"
- [x] Create placeholder page at `src/app/map/page.tsx` — render AppLayout with heading "Map" and paragraph "Coming in Phase 4"
- [x] Create placeholder page at `src/app/clusters/page.tsx` — render AppLayout with heading "Clusters" and paragraph "Coming in Phase 4"
- [x] Create placeholder page at `src/app/campaigns/page.tsx` — render AppLayout with heading "Campaigns" and paragraph "Coming in Phase 8"
- [x] Create placeholder page at `src/app/settings/page.tsx` — render AppLayout with heading "Settings" and paragraph "Coming in Phase 5"
- [x] Create seed data helper functions in `convex/seedHelpers.ts` — `createTestLead(ctx, overrides)` and `createTestActivity(ctx, overrides)` that insert records with sensible defaults. These are for development testing only.

## Validation

- [x] `pnpm dev` runs without errors
- [x] `npx convex dev` syncs schema without errors
- [x] Navigating between all 7 routes works (Dashboard, Leads, Lead Detail, Map, Clusters, Campaigns, Settings)
- [x] Sidebar highlights the active page
- [x] `pnpm typecheck` passes (add `"typecheck": "tsc --noEmit"` to package.json scripts if missing)
- [x] `pnpm lint` passes
