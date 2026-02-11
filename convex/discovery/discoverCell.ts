import { v } from "convex/values";

import { internalAction, mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { haversineKm } from "../lib/pointInPolygon";
import {
  type PlaceTextResult,
  type DiscoveredLead,
  extractCity,
  inferLeadType,
  searchPlacesWithLocation,
} from "./placeHelpers";

const GOOGLE_MAX_RESULTS = 60;

type DiscoverCellResult = {
  totalApiResults: number;
  inBoundsResults: number;
  newLeads: number;
  duplicatesSkipped: number;
  saturated: boolean;
  querySaturation: { query: string; count: number }[];
};

export const discoverCell = internalAction({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args): Promise<DiscoverCellResult> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_PLACES_API_KEY environment variable");
    }

    // Step 1: Claim cell atomically
    const claimResult = await ctx.runMutation(
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      internal.discovery.gridCells.claimCellForSearch,
      {
        cellId: args.cellId,
        expectedStatuses: ["unsearched", "searched"],
      },
    );

    // Another action already claimed this cell — skip silently
    if (!claimResult.claimed) {
      return {
        totalApiResults: 0,
        inBoundsResults: 0,
        newLeads: 0,
        duplicatesSkipped: 0,
        saturated: false,
        querySaturation: [],
      };
    }

    const { previousStatus } = claimResult;

    // Steps 2-11 wrapped in try/catch — reset on failure
    try {
      // Step 2: Fetch cell + grid record
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      const cellData = await ctx.runQuery(
        internal.discovery.gridCells.getCell,
        { cellId: args.cellId },
      );

      const { swLat, swLng, neLat, neLng, depth } = cellData as {
        swLat: number; swLng: number; neLat: number; neLng: number; depth: number;
        grid: { name: string; queries: string[]; region: string; province: string };
      };
      const { name: gridName, queries, region, province } = (cellData as {
        grid: { name: string; queries: string[]; region: string; province: string };
      }).grid;

      // Step 4: Compute cell center and circumscribed circle radius
      const centerLat = (swLat + neLat) / 2;
      const centerLng = (swLng + neLng) / 2;

      // Circumscribed radius = distance from center to a corner (covers entire cell)
      const radiusKm = haversineKm(centerLat, centerLng, neLat, neLng);

      // Step 5: Search all queries in parallel and deduplicate by placeId
      const queryResults = await Promise.all(
        queries.map(async (query) => {
          const { results, totalCount } = await searchPlacesWithLocation(
            query,
            apiKey,
            centerLat,
            centerLng,
            radiusKm,
          );
          return { query, results, totalCount };
        }),
      );

      const isInBounds = (place: PlaceTextResult) => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (lat == null || lng == null) return false;
        return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
      };

      // Step 6: Deduplicate by place_id across queries, filter to cell bounds,
      // and track per-query in-bounds counts for accurate saturation detection.
      // Raw API counts are unreliable for saturation because Google's `radius`
      // is a bias not a hard filter — subdivided cells can see 60 API results
      // where only a handful are actually in-bounds.
      const seenPlaceIds = new Set<string>();
      const inBounds: PlaceTextResult[] = [];
      const querySaturation: { query: string; count: number }[] = [];
      let totalApiResults = 0;

      for (const { query, results, totalCount } of queryResults) {
        totalApiResults += results.length;

        // Count in-bounds results per query (before cross-query dedup)
        // to determine if this specific query is saturated for this cell
        const inBoundsForQuery = results.filter(isInBounds);
        querySaturation.push({ query, count: inBoundsForQuery.length });

        // Cross-query dedup + bounds filter for the final lead set
        for (const result of results) {
          if (!seenPlaceIds.has(result.place_id) && isInBounds(result)) {
            seenPlaceIds.add(result.place_id);
            inBounds.push(result);
          }
        }
      }

      // Step 8: Convert to lead objects
      const now = Date.now();
      const leads: DiscoveredLead[] = inBounds.map((place: PlaceTextResult) => ({
        name: place.name,
        type: inferLeadType(place.name, place.types ?? []),
        address: place.formatted_address ?? "",
        city: extractCity(place.formatted_address ?? ""),
        region,
        province,
        placeId: place.place_id,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        source: "google_places" as const,
        sourceDetail: `Discovery grid "${gridName}" cell ${args.cellId} [depth=${depth}]`,
        status: "new_lead" as const,
        followUpCount: 0 as const,
        createdAt: now,
        updatedAt: now,
      }));

      // Step 9: Insert leads
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      const insertResult = await ctx.runMutation(
        internal.discovery.discoverLeads.insertDiscoveredLeads,
        { leads },
      );

      const newLeads: number = insertResult.inserted;
      const duplicatesSkipped: number = insertResult.skipped;

      // Step 10: Determine saturation — only if ALL queries returned 60 API
      // results AND had a high in-bounds ratio (>= 20 in-bounds per query).
      // A query hitting 60 API results but only 1 in-bounds means the results
      // are spread across a wider area, not that this cell is dense.
      const saturated = querySaturation.length > 0 &&
        queryResults.every(({ totalCount }) => totalCount >= GOOGLE_MAX_RESULTS) &&
        querySaturation.every((qs) => qs.count >= 20);

      // Step 11: Update cell with search result
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      await ctx.runMutation(
        internal.discovery.gridCells.updateCellSearchResult,
        {
          cellId: args.cellId,
          status: saturated ? "saturated" : "searched",
          resultCount: inBounds.length,
          querySaturation,
          lastSearchedAt: now,
          newLeadsCount: newLeads,
        },
      );

      // Step 12: Return summary
      return {
        totalApiResults,
        inBoundsResults: inBounds.length,
        newLeads,
        duplicatesSkipped,
        saturated,
        querySaturation,
      };
    } catch (error) {
      // On any failure, reset cell status to previousStatus
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      await ctx.runMutation(
        internal.discovery.gridCells.updateCellStatus,
        {
          cellId: args.cellId,
          status: previousStatus,
        },
      );
      throw error;
    }
  },
});

export const requestDiscoverCell = mutation({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new Error("Cell not found");
    }

    // Already being searched — silently skip to avoid scheduling a doomed action
    if (cell.status === "searching") {
      return;
    }

    if (cell.status !== "unsearched" && cell.status !== "searched") {
      throw new Error(
        `Cell status is "${cell.status}", expected "unsearched" or "searched"`,
      );
    }

    await ctx.scheduler.runAfter(
      0,
      internal.discovery.discoverCell.discoverCell,
      { cellId: args.cellId },
    );
  },
});
