# /enrich-leads

Enrich leads matching a cluster name or status filter via the batch enrichment pipeline (Google Places, website scraper, Hunter.io, Claude analysis, social discovery).

## Usage

The user provides a cluster name (e.g., "Niagara") or a filter (e.g., "status:new_lead"). Optionally, `--force` bypasses the 30-day cooldown.

## Steps

1. Parse the filter from the user's message. If not provided, ask for it.
   - Cluster name: any string (e.g., "Niagara", "Prince Edward County")
   - Status filter: `status:<value>` where value is one of: `new_lead`, `enriched`, `outreach_started`, `replied`, `meeting_booked`, `onboarded`, `declined`, `not_interested`, `bounced`, `no_response`, `no_email`
2. Run the enrich-leads script via the CLI:

```bash
npx tsx scripts/enrich-leads.ts "<filter>" [--force]
```

This script:
- Resolves the filter to matching leads (cluster name → cluster ID → leads, or status → leads)
- Calls the `batchEnrich` Convex action in batches of 25
- Each lead runs through the full enrichment pipeline (Google Places, website scraper, Hunter.io, Claude analysis, social discovery)
- Respects the 30-day cooldown unless `--force` is passed

3. Report the results to the user:
   - Leads enriched
   - Emails found
   - No-email leads
   - Skipped (cooldown)
   - Errors

## Examples

User: "enrich leads in Niagara"
```bash
npx tsx scripts/enrich-leads.ts Niagara
```

User: "enrich all new leads"
```bash
npx tsx scripts/enrich-leads.ts "status:new_lead"
```

User: "re-enrich leads with no email"
```bash
npx tsx scripts/enrich-leads.ts "status:no_email" --force
```

User: "enrich Prince Edward County leads, force refresh"
```bash
npx tsx scripts/enrich-leads.ts "Prince Edward County" --force
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set
- Enrichment API keys must be configured in Convex environment variables (Google Places, Hunter.io, Anthropic)

## Convex Actions

The backend actions are at:
- **`convex/enrichment/batchEnrichPublic.ts`** — `batchEnrich` (public action): Takes `leadIds` array and optional `force`/`overwrite` booleans. Returns `{ total, succeeded, failed, skipped, results[] }`.
- **`convex/enrichment/batchEnrich.ts`** — `batchEnrichLeads` (internal action): Processes up to 25 leads with 1s delay between each.
- **`convex/enrichment/orchestrator.ts`** — `enrichLead` (internal action): Full enrichment pipeline per lead (Google Places → website scraper → Hunter.io → Claude analysis → social discovery).
