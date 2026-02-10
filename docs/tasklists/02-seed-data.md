# Phase 2: Seed Data from CSVs

Import both CSV files (~446 leads) into Convex and geocode them. After this phase: all lead data from the spreadsheets is in the database, most leads have lat/lng coordinates, and you can verify the data in the Convex dashboard.

> **Prerequisites:** Complete "Before Phase 2" in [MANUAL-SETUP.md](../MANUAL-SETUP.md) (Google Geocoding API key)

## Boundaries

- DO NOT modify `data/farms.csv` or `data/farmers-markets.csv`
- DO NOT build any UI for this — it's a one-time backend seed operation
- DO NOT create a generic CSV import UI — this is a hardcoded mapping for these two specific files

## Tasks

- [x] Create a CSV parsing utility in `convex/lib/csvParser.ts` — parse CSV text into rows of key-value pairs. Handle quoted fields (some addresses contain commas). No external dependency needed — use a simple RFC 4180 parser.
- [x] Create the seed mutation in `convex/seeds/importLeads.ts` — Convex action that takes `{ csvContent: string, filename: string }`. Hardcoded column mapping: `Name` → `name`, `Email address` → `contactEmail`, `URL` → `website`, `Instagram` → `socialLinks.instagram`, `Phone` → `contactPhone`, `Address` → `address`, `Town / City` → `city`, `Hours` → `notes`, `Categories` → used to derive `type`. Derive type: if Categories contains "Farmer's Market" → `farmers_market`, else → `farm`. Set `source: "spreadsheet_import"`, `status: "new_lead"`, `province: "ON"`, `consentSource: "spreadsheet_import - [filename] - [date]"`, `createdAt` and `updatedAt` to `Date.now()`, `followUpCount: 0`.
- [x] Add deduplication to the seed mutation — before inserting, query for existing lead with matching name+city (case-insensitive, trimmed). If found, skip the row. Track counts: inserted, skipped (duplicate), errored.
- [x] Create a seed runner action in `convex/seeds/runSeed.ts` — Convex action that reads both CSV files (store CSV content as string arguments or use Convex file storage), calls the import mutation for each, and returns combined results `{ farms: { inserted, skipped, errors }, markets: { inserted, skipped, errors } }`.
- [x] Create a batch geocoding action in `convex/seeds/geocodeLeads.ts` — Convex action that queries all leads where `latitude` is undefined, calls Google Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json?address={encoded_address}&key={KEY}`) for each, and patches the lead with `latitude` and `longitude`. Process in batches of 10 with 200ms delay between batches to respect rate limits. Log results: geocoded count, failed count, already-had-coords count.
- [x] Create a Node.js seed script at `scripts/seed.ts` — reads `data/farms.csv` and `data/farmers-markets.csv` from disk, calls the Convex seed action via the Convex client. Include instructions in a comment at the top for how to run it: `npx tsx scripts/seed.ts`. After seeding, trigger the geocoding action.

## Validation

- [x] Running the seed script imports ~446 leads (278 farms + 167 markets, minus any cross-file duplicates)
- [x] Running the seed script a second time inserts 0 new records (all skipped as duplicates)
- [x] Leads visible in Convex dashboard with correct field mapping
- [x] Leads with type `farmers_market` have Categories containing "Farmer's Market"
- [x] After geocoding, most leads have latitude/longitude populated (some addresses may fail)
- [x] `pnpm typecheck` passes
