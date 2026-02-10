# /outreach-stats

Print a formatted terminal report of outreach pipeline stats by querying the dashboard aggregate queries.

## Usage

No arguments required. Just run the script to get a snapshot of the current outreach pipeline.

## Steps

1. Run the outreach-stats script via the CLI:

```bash
npx tsx scripts/outreach-stats.ts
```

This script queries all 6 dashboard aggregate endpoints and prints a formatted terminal report covering:
- **Pipeline Funnel** — lead counts by status (new → enriched → outreach → replied → booked → onboarded)
- **Email Stats** — sent/opened/clicked/replied for last 7 and 30 days
- **Social Stats** — DMs sent/replies/follows for last 7 and 30 days
- **Active Campaigns** — name, status, lead count, sent, open rate, reply rate
- **Follow-Ups Due** — overdue and due-today leads

2. Report the output to the user as-is (the script formats everything for the terminal).

## Examples

User: "show me outreach stats"
```bash
npx tsx scripts/outreach-stats.ts
```

User: "how's the pipeline looking?"
```bash
npx tsx scripts/outreach-stats.ts
```

User: "outreach stats"
```bash
npx tsx scripts/outreach-stats.ts
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set

## Convex Queries

The script calls these dashboard queries from `convex/dashboard.ts`:
- **`pipelineStats`** — lead counts by status
- **`emailStats`** — email activity (7d/30d)
- **`socialStats`** — social activity (7d/30d)
- **`activeCampaigns`** — active/paused campaigns with engagement stats
- **`followUpsDue`** — leads needing follow-up today or overdue
- **`clusterBreakdown`** — leads grouped by cluster
