/**
 * Run with: npx tsx scripts/seed.ts
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

async function readCsv(filename: string): Promise<string> {
  const filePath = path.resolve(process.cwd(), "data", filename);
  return readFile(filePath, "utf8");
}

async function main(): Promise<void> {
  const [farmsCsvContent, marketsCsvContent] = await Promise.all([
    readCsv("farms.csv"),
    readCsv("farmers-markets.csv"),
  ]);

  const convex = new ConvexHttpClient(getConvexUrl());

  const seedResult = await convex.action(api.seeds.runSeed.runSeed, {
    farmsCsvContent,
    marketsCsvContent,
    farmsFilename: "farms.csv",
    marketsFilename: "farmers-markets.csv",
  });
  console.log("Seed complete!", seedResult);

  console.log("Starting geocoding...");
  const geocodeResult = await convex.action(api.seeds.geocodeLeads.geocodeLeads, {});
  console.log("Geocoding complete:", geocodeResult);
}

main().catch((error: unknown) => {
  console.error("Seed script failed:", error);
  process.exitCode = 1;
});
