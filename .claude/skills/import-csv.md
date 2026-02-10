# /import-csv

Import leads from a CSV file into the database, with deduplication by name+city. Prints counts of inserted, duplicated, and errored rows.

## Usage

The user provides a path to a CSV file. The CSV must have a header row with columns matching the expected format (Name, Email address, URL, Instagram, Phone, Address, Town / City, Categories, Hours).

## Steps

1. Parse the CSV file path from the user's message. If not provided, ask for it.
2. Run the import-csv script via the CLI:

```bash
npx tsx scripts/import-csv.ts "<csv-file-path>"
```

This script:
- Reads the CSV file from the local filesystem
- Sends the content to the `importLeads` Convex action
- The action parses CSV rows, maps them to lead fields via `buildImportedLead`
- Deduplicates against existing leads by normalized name+city
- Inserts new leads with source "spreadsheet_import"

3. Report the results to the user:
   - Inserted: new leads added
   - Duplicated: leads skipped because name+city already exists
   - Errored: leads that failed to insert

## Examples

User: "import leads from data/farms.csv"
```bash
npx tsx scripts/import-csv.ts data/farms.csv
```

User: "import csv /Users/chris/Downloads/new-leads.csv"
```bash
npx tsx scripts/import-csv.ts /Users/chris/Downloads/new-leads.csv
```

User: "import the farmers markets csv"
```bash
npx tsx scripts/import-csv.ts data/farmers-markets.csv
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set
- CSV file must exist at the specified path
- CSV must have a header row with expected column names

## Expected CSV Columns

| Column | Maps to | Required |
|--------|---------|----------|
| Name | `name` | Yes |
| Email address | `contactEmail` | No |
| URL | `website` | No |
| Instagram | `socialLinks.instagram` | No |
| Phone | `contactPhone` | No |
| Address | `address` | Yes |
| Town / City | `city` | Yes |
| Categories | `type` (farm vs farmers_market) | No |
| Hours | `notes` | No |

## Convex Action

The backend action is at `convex/seeds/importLeads.ts`:
- **`importLeads`** (public action): Takes `csvContent` (string) and `filename` (string). Parses CSV, builds lead objects, and calls the internal mutation. Returns `{ inserted, skipped, errored }`.
- **`insertImportedLeads`** (internal mutation): Deduplicates by normalized name+city and inserts new leads. Returns `{ inserted, skipped, errored }`.
