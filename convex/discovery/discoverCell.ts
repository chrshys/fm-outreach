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
    // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
    const { previousStatus } = await ctx.runMutation(
      internal.discovery.gridCells.claimCellForSearch,
      {
        cellId: args.cellId,
        expectedStatuses: ["unsearched", "searched"],
      },
    );

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

    // Steps 3-11 wrapped in try/catch — reset on failure
    try {
      // Step 4: Compute cell center and circumscribed circle radius
      const centerLat = (swLat + neLat) / 2;
      const centerLng = (swLng + neLng) / 2;

      // Circumscribed radius = distance from center to a corner (covers entire cell)
      const radiusKm = haversineKm(centerLat, centerLng, neLat, neLng);

      // Step 5: Search for each query
      const allApiResults: PlaceTextResult[] = [];
      const querySaturation: { query: string; count: number }[] = [];

      for (const query of queries) {
        const { results, totalCount } = await searchPlacesWithLocation(
          query,
          apiKey,
          centerLat,
          centerLng,
          radiusKm,
        );
        querySaturation.push({ query, count: totalCount });
        allApiResults.push(...results);
      }

      const totalApiResults = allApiResults.length;

      // Step 6: Deduplicate by place_id across queries
      const seenPlaceIds = new Set<string>();
      const deduplicated: PlaceTextResult[] = [];
      for (const result of allApiResults) {
        if (!seenPlaceIds.has(result.place_id)) {
          seenPlaceIds.add(result.place_id);
          deduplicated.push(result);
        }
      }

      // Step 7: Post-filter to cell bounds
      const inBounds: PlaceTextResult[] = deduplicated.filter((place: PlaceTextResult) => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (lat == null || lng == null) return false;
        return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
      });

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

      // Step 10: Determine saturation — only if ALL queries hit 60
      const saturated = querySaturation.length > 0 &&
        querySaturation.every((qs) => qs.count >= GOOGLE_MAX_RESULTS);

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
      // Step 3: On any failure, reset cell status to previousStatus
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
