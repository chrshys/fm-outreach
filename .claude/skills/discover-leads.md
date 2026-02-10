# /discover-leads

Discover new farm leads in a region via Google Places search and add them to the database.

## Usage

The user provides a region name (e.g., "Niagara", "Prince Edward County"). Optionally, a province can be specified (defaults to "Ontario").

## Steps

1. Parse the region name from the user's message. If not provided, ask for it.
2. Run the discover-leads script via the CLI:

```bash
npx tsx scripts/discover-leads.ts "<region>" [province]
```

This script calls the `discoverLeads` Convex action which:
- Searches Google Places for farms in the specified region
- Paginates through up to 60 results (3 pages of 20)
- Deduplicates against existing leads by name+city and placeId
- Inserts new leads with source "google_places"

3. Report the results to the user:
   - New leads found
   - Duplicates skipped
   - Total leads in database

## Examples

User: "discover leads in Niagara"
```bash
npx tsx scripts/discover-leads.ts Niagara
```

User: "find farms in Prince Edward County"
```bash
npx tsx scripts/discover-leads.ts "Prince Edward County"
```

User: "discover leads in Simcoe, Ontario"
```bash
npx tsx scripts/discover-leads.ts Simcoe Ontario
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set
- `GOOGLE_PLACES_API_KEY` must be configured in Convex environment variables

## Convex Action

The backend action is at `convex/discovery/discoverLeads.ts`:
- **`discoverLeads`** (public action): Takes `region` (string) and optional `province` (string). Returns `{ newLeads, duplicatesSkipped, totalInDatabase }`.
- **`insertDiscoveredLeads`** (internal mutation): Handles deduplication and insertion.
