import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

async function main() {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL");

  const convex = new ConvexHttpClient(convexUrl);
  console.log("Starting geocoding...");
  const result = await convex.action(api.seeds.geocodeLeads.geocodeLeads, {});
  console.log("Geocoding complete:", result);
}

main().catch((err: unknown) => {
  console.error("Geocoding failed:", err);
  process.exitCode = 1;
});
