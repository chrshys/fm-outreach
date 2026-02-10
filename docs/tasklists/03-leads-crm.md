# Phase 3: Leads CRM

The primary workhorse views. After this phase: you can browse all leads in a sortable/filterable table, search by name/city, click into a full lead detail page with inline editing, see the activity timeline, log activities, change status, and set follow-up reminders.

> **Prerequisites:** Phase 1 + Phase 2 completed (schema deployed, leads seeded)

## Boundaries

- DO NOT build map view or clustering — that's Phase 4
- DO NOT build email composition or enrichment UI — later phases
- DO NOT add API integrations — this is pure CRM UI + Convex queries/mutations

## Tasks

### Leads Table

- [x] Create Convex query `convex/leads.ts:list` — paginated leads query with optional filters: `status`, `type`, `clusterId`, `hasEmail` (boolean), `hasSocial` (boolean), `source`, `needsFollowUp` (where `nextFollowUpAt` <= now). Support sorting by `name`, `city`, `status`, `updatedAt`. Default sort: `name` ascending. Return first 50 results with cursor for pagination.
- [x] Create Convex query `convex/leads.ts:search` — text search by name or city (case-insensitive prefix match). Return matching leads up to 50.
- [x] Create the leads table page at `src/app/leads/page.tsx` — replace placeholder. Render a data table with columns: checkbox (for multi-select), Name, Type, City, Status (as colored Badge), Contact Email, Social (FB/IG indicator badges), Last Activity date, Follow-up Due (date or "Overdue" in red). Clicking a row navigates to `/leads/[id]`.
- [x] Create filter bar component at `src/components/leads/lead-filters.tsx` — filter controls above the table: Status dropdown (all pipeline stages), Type dropdown (farm, farmers_market, etc.), Has Email toggle, Has Social toggle, Source dropdown, Needs Follow-up toggle. Active filters shown as dismissible pills. Use shadcn Select and Badge components.
- [x] Create search input at `src/components/leads/lead-search.tsx` — text input above filters with search icon. Debounce 300ms. Searches name and city fields.
- [x] Create bulk action bar at `src/components/leads/bulk-actions.tsx` — appears when 1+ rows are selected via checkbox. Shows selected count and action buttons: "Change Status" (dropdown), "Assign to Cluster" (dropdown). Selecting an action creates a Convex mutation to update all selected leads.
- [x] Create Convex mutations `convex/leads.ts:bulkUpdateStatus` and `convex/leads.ts:bulkAssignCluster` — take array of lead IDs and new value, update all, log activity on each.

### Lead Detail

- [x] Create Convex query `convex/leads.ts:get` — get a single lead by ID with all fields.
- [x] Create lead detail page at `src/app/leads/[id]/page.tsx` — replace placeholder. Full profile layout: header with name, city, type, status badge. Two-column layout below: left column has contact info, business details, CASL consent source; right column has activity timeline.
- [x] Create inline editing for lead detail fields — clicking a field value turns it into an input/textarea. Save on blur or Enter. Create Convex mutation `convex/leads.ts:update` that patches any subset of lead fields and sets `updatedAt`.
- [x] Create status selector component at `src/components/leads/status-selector.tsx` — dropdown showing all pipeline stages with color indicators. Changing status calls `convex/leads.ts:updateStatus` mutation which updates the status AND logs a `status_changed` activity with `{ oldStatus, newStatus }` in metadata.

### Activity Timeline

- [x] Create Convex query `convex/activities.ts:listByLead` — get all activities for a lead, sorted by `createdAt` descending. Paginate at 20.
- [x] Create activity timeline component at `src/components/leads/activity-timeline.tsx` — vertical timeline with dot indicators. Each item shows: activity type icon, description, relative timestamp (e.g., "2 hours ago"), channel badge if applicable. Different icon/color per activity type.
- [x] Create manual activity logging buttons at `src/components/leads/log-activity.tsx` — three buttons below the timeline: "Add Note", "Log Call", "Log Social DM". Each opens a Dialog with a textarea for description and (for Social DM) a channel selector (Facebook/Instagram). Submitting creates an activity record via `convex/activities.ts:create` mutation.
- [x] Create Convex mutation `convex/activities.ts:create` — insert activity record with `leadId`, `type`, `channel`, `description`, `metadata`, `createdAt`. Also update the lead's `updatedAt`.

### Follow-up Reminders

- [x] Create follow-up reminder component at `src/components/leads/follow-up-reminder.tsx` — on lead detail, show current next follow-up date (or "None set"). "Set Reminder" button opens a date picker. Selecting a date calls `convex/leads.ts:setFollowUp` mutation which sets `nextFollowUpAt` and logs activity.
- [x] Add overdue/due-today indicator to lead detail header — if `nextFollowUpAt` is past, show red "Overdue" badge. If today, show amber "Due Today" badge.

## Validation

- [x] Leads table loads and displays all ~446 seeded leads
- [x] Sorting by Name, City, Status works correctly
- [x] Filtering by status, type, has-email narrows results
- [x] Searching "Niagara" returns leads with Niagara in name or city
- [x] Clicking a lead row navigates to `/leads/[id]` with full detail
- [x] Editing a lead field inline saves to Convex and reflects immediately
- [x] Changing status logs an activity that appears in the timeline
- [x] "Add Note" creates a note activity visible in the timeline
- [x] Setting a follow-up date shows the due indicator
- [x] Bulk selecting 3 leads and changing status updates all 3
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
