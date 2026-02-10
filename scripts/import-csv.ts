/**
 * Import leads from a CSV file into the database.
 *
 * Run with: npx tsx scripts/import-csv.ts <csv-file-path>
 *
 * Examples:
 *   npx tsx scripts/import-csv.ts data/farms.csv
 *   npx tsx scripts/import-csv.ts /absolute/path/to/leads.csv
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";

function getConvexUrl(): string {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable");
  }
  return convexUrl;
}

async function main(): Promise<void> {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npx tsx scripts/import-csv.ts <csv-file-path>");
    console.error("Example: npx tsx scripts/import-csv.ts data/farms.csv");
    process.exitCode = 1;
    return;
  }

  const resolvedPath = path.resolve(process.cwd(), csvPath);
  const filename = path.basename(resolvedPath);

  console.log(`Reading CSV: ${resolvedPath}`);
  const csvContent = await readFile(resolvedPath, "utf8");

  const convex = new ConvexHttpClient(getConvexUrl());

  console.log(`Importing leads from ${filename}...`);
  const result = await convex.action(api.seeds.importLeads.importLeads, {
    csvContent,
    filename,
  });

  console.log(`\nResults:`);
  console.log(`  Inserted:    ${result.inserted}`);
  console.log(`  Duplicated:  ${result.skipped}`);
  console.log(`  Errored:     ${result.errored}`);
}

main().catch((error: unknown) => {
  console.error("CSV import failed:", error);
  process.exitCode = 1;
});
