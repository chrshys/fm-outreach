# /campaign-status

Query all campaigns and print a formatted terminal report showing each campaign's name, status, lead count, sent/opened/replied/bounced stats, and last sync time.

## Usage

No arguments required. Just run the script to get a snapshot of all campaign statuses.

## Steps

1. Run the campaign-status script via the CLI:

```bash
npx tsx scripts/campaign-status.ts
```

This script queries the `campaigns.listStatus` endpoint and prints a formatted terminal report covering:
- **Campaign Name** — the name of each campaign
- **Status** — draft, pushed, active, paused, or completed
- **Lead Count** — number of leads in the campaign
- **Sent** — total emails sent
- **Opened** — emails opened with percentage
- **Replied** — emails replied with percentage
- **Bounced** — emails bounced with percentage
- **Last Sync** — when campaign stats were last updated

2. Report the output to the user as-is (the script formats everything for the terminal).

## Examples

User: "show me campaign status"
```bash
npx tsx scripts/campaign-status.ts
```

User: "how are campaigns doing?"
```bash
npx tsx scripts/campaign-status.ts
```

User: "campaign status"
```bash
npx tsx scripts/campaign-status.ts
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set

## Convex Query

The script calls this query from `convex/campaigns.ts`:
- **`listStatus`** — returns all campaigns with name, status, leadCount, stats (sent/opened/clicked/replied/bounced), and updatedAt
